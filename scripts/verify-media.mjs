/**
 * Media verification harness.
 *
 * Loads the running dev server in headless Chrome over the DevTools Protocol and
 * asserts that every video and image in the page actually loads and paints:
 * correct intrinsic size, buffered readyState, and no failed requests. Section
 * screenshots are written to the OS temp directory.
 *
 * Requires the dev server to be running, plus any local Chrome/Edge/Chromium.
 * Override the browser with CHROME_PATH if auto-detection fails.
 *
 *   npm run dev
 *   npm run verify:media              # defaults to http://localhost:5173/
 *   npm run verify:media -- <url>     # or point it somewhere else
 */
import { spawn } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";

const URL_ = process.argv[2] || "http://localhost:5173/";
const OUT = join(tmpdir(), "valorant-verify");
const PORT = 9336;
const PROFILE = join(tmpdir(), "dsh-cdp-verify");

/** Locate a Chromium binary: CHROME_PATH, then a puppeteer cache, then the usual installs. */
function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const cacheRoot = join(homedir(), ".cache", "puppeteer", "chrome");
  if (existsSync(cacheRoot)) {
    for (const dir of readdirSync(cacheRoot)) {
      for (const rel of [
        "chrome-win64/chrome.exe",
        "chrome-linux64/chrome",
        "chrome-mac-x64/chrome",
      ]) {
        const p = join(cacheRoot, dir, rel);
        if (existsSync(p)) return p;
      }
    }
  }

  const candidates = [
    process.env["PROGRAMFILES"] &&
      join(process.env["PROGRAMFILES"], "Google/Chrome/Application/chrome.exe"),
    process.env["PROGRAMFILES(X86)"] &&
      join(
        process.env["PROGRAMFILES(X86)"],
        "Google/Chrome/Application/chrome.exe"
      ),
    process.env["PROGRAMFILES(X86)"] &&
      join(
        process.env["PROGRAMFILES(X86)"],
        "Microsoft/Edge/Application/msedge.exe"
      ),
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);

  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      "No Chromium found. Set CHROME_PATH to a Chrome/Edge binary."
    );
  }
  return found;
}

const CHROME = findChrome();

mkdirSync(OUT, { recursive: true });

/**
 * Chrome keeps a lock on its profile for a moment after the process is killed,
 * so removing it is best-effort: retry briefly, then give up (it lives in the
 * OS temp directory and a stale profile is harmless).
 */
function removeProfile(dir) {
  for (let i = 0; i < 10; i++) {
    try {
      rmSync(dir, { recursive: true, force: true });
      return;
    } catch {
      // Windows: EPERM/EBUSY while Chrome still holds the directory.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
    }
  }
}

removeProfile(PROFILE);

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--window-size=1512,900",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--autoplay-policy=no-user-gesture-required",
    "about:blank",
  ],
  { stdio: "ignore" }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const j = await (
        await fetch(`http://127.0.0.1:${PORT}/json/version`)
      ).json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch {
      /* retry */
    }
    await sleep(250);
  }
  throw new Error("DevTools endpoint unavailable");
}

const socket = new WebSocket(await wsUrl());
await new Promise((res, rej) => {
  socket.addEventListener("open", res);
  socket.addEventListener("error", rej);
});

let id = 0;
const pending = new Map();
let sessionId = null;
const failures = [];

socket.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error
      ? p.reject(new Error(JSON.stringify(m.error)))
      : p.resolve(m.result);
    return;
  }
  if (m.method === "Network.loadingFailed") failures.push(m.params);
});

const send = (method, params = {}) => {
  const i = ++id;
  const payload = { id: i, method, params };
  if (sessionId) payload.sessionId = sessionId;
  socket.send(JSON.stringify(payload));
  return new Promise((resolve, reject) => pending.set(i, { resolve, reject }));
};

const { targetInfos } = await send("Target.getTargets");
const page = targetInfos.find((t) => t.type === "page");
({ sessionId } = await send("Target.attachToTarget", {
  targetId: page.targetId,
  flatten: true,
}));

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1512,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

const evalx = async (expression) => {
  const r = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails)
    throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
};

console.log("navigating ->", URL_);
await send("Page.navigate", { url: URL_ });

for (let i = 0; i < 80; i++) {
  if (await evalx("!!document.querySelector('#hero')").catch(() => false))
    break;
  await sleep(250);
}

// wait for every <video> to buffer
const videos = await evalx(`
  (async () => {
    const vids = [...document.querySelectorAll('video')];
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      if (vids.length && vids.every(v => v.readyState >= 2)) break;
      await new Promise(r => setTimeout(r, 400));
    }
    return vids.map(v => ({
      src: (v.currentSrc || v.src).split('/').pop(),
      readyState: v.readyState,
      size: v.videoWidth + 'x' + v.videoHeight,
      playing: !v.paused,
    }));
  })()
`);

const assets = await evalx(`
  (async () => {
    const imgs = [...document.images].map(i => ({
      src: (i.currentSrc || i.src).split('/').pop(),
      ok: i.complete && i.naturalWidth > 0,
      size: i.naturalWidth + 'x' + i.naturalHeight,
    }));
    const vids = [...document.querySelectorAll('video')].map(v => (v.currentSrc || v.src));
    const probe = async (url) => {
      try { const r = await fetch(url, { method: 'HEAD' }); return r.ok; }
      catch { return false; }
    };
    const files = {};
    for (const f of ['/videos/hero-1.mp4','/videos/hero-2.mp4','/videos/hero-3.mp4','/videos/hero-4.mp4',
                     '/videos/feature-1.mp4','/videos/feature-2.mp4','/videos/feature-3.mp4',
                     '/videos/feature-4.mp4','/videos/feature-5.mp4','/audio/loop.mp3',
                     '/favicon.ico','/apple-icon.png','/icon1.png']) {
      files[f] = await probe(f);
    }
    return { imgs, videoCount: vids.length, uniqueVideos: [...new Set(vids.map(v => v.split('/').pop()))], files };
  })()
`);

const preloader = await evalx("!!document.querySelector('.three-body')");
const meta = await evalx(`({
  title: document.title,
  scrollHeight: document.documentElement.scrollHeight,
  sections: [...document.querySelectorAll('section[id],div[id]')].map(e => e.id).filter(Boolean),
})`);

const problems = [];

console.log("\n=== VIDEOS ===");
for (const v of videos) {
  const buffered = v.readyState >= 2;
  const square = /^(\d+)x(\d+)$/.exec(v.size);
  const ratio = square ? Number(square[1]) / Number(square[2]) : 0;
  const is169 = Math.abs(ratio - 16 / 9) < 0.02;
  if (!buffered)
    problems.push(`video not buffered: ${v.src} (readyState ${v.readyState})`);
  if (!is169) problems.push(`video not 16:9: ${v.src} (${v.size})`);
  console.log(
    " ",
    buffered ? "OK  " : "FAIL",
    is169 ? "16:9" : "BAD ",
    v.size.padEnd(10),
    `readyState=${v.readyState}`,
    v.playing ? "playing" : "paused",
    v.src
  );
}

console.log("\n=== IMAGES ===");
for (const i of assets.imgs) {
  if (!i.ok) problems.push(`image failed to decode: ${i.src}`);
  console.log(" ", i.ok ? "OK  " : "FAIL", i.size.padEnd(11), i.src);
}

console.log("\n=== ASSET HEAD REQUESTS ===");
for (const [f, ok] of Object.entries(assets.files)) {
  if (!ok) problems.push(`asset missing: ${f}`);
  console.log(" ", ok ? "OK  " : "FAIL", f);
}

console.log("\n=== PAGE ===");
console.log("  title:               ", meta.title);
console.log("  sections:            ", meta.sections.join(", "));
console.log(
  "  preloader mounted:   ",
  preloader,
  preloader ? "(should be false)" : ""
);
if (preloader) problems.push("preloader never cleared");

// Aborted media/fetch requests are expected: swapping a <video> src and Vite's
// module replacement both cancel in-flight requests.
const realFailures = failures.filter(
  (f) => f.errorText !== "net::ERR_ABORTED" && !f.blockedReason
);
if (realFailures.length) {
  console.log("\n=== UNEXPECTED NETWORK FAILURES ===");
  for (const f of realFailures.slice(0, 15)) {
    console.log(" ", f.errorText, f.type, f.requestId);
    problems.push(`network failure: ${f.errorText}`);
  }
}

// section screenshots
const steps = [
  ["01-hero", 0, 1400],
  ["02-about", "about", 2200],
  ["03-features", "nexus", 2600],
  ["04-story", "story", 2600],
  ["05-contact", "contact", 1800],
];
for (const [name, target, wait] of steps) {
  if (typeof target === "number")
    await evalx(`window.scrollTo({top:${target},behavior:'instant'})`);
  else
    await evalx(
      `document.getElementById('${target}')?.scrollIntoView({block:'start',behavior:'instant'})`
    );
  await sleep(wait);
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(r.data, "base64"));
}
console.log("\nscreenshots ->", OUT);

socket.close();
chrome.kill();
// let the process release its profile lock before we exit
await new Promise((resolve) => {
  if (chrome.exitCode !== null) return resolve();
  chrome.once("exit", resolve);
  setTimeout(resolve, 3000);
});
removeProfile(PROFILE);

if (problems.length) {
  console.error(`\nFAILED - ${problems.length} problem(s):`);
  for (const p of problems) console.error("  -", p);
  process.exit(1);
}
console.log("\nPASSED - all media loaded correctly.");
process.exit(0);
