/**
 * Capture marketing screenshots of each section for the README.
 *
 * Needs the dev server running. Writes PNGs into .github/screenshots/.
 *
 *   npm run dev
 *   node scripts/capture-screenshots.mjs [url]
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
import { homedir } from "node:os";

const URL_ = process.argv[2] || "http://localhost:5173/";
const OUT = join(process.cwd(), ".github", "screenshots");
const PORT = 9337;
const PROFILE = join(process.env.TEMP || "/tmp", "dsh-shots-profile");

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH))
    return process.env.CHROME_PATH;
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
  return (
    [
      process.env["PROGRAMFILES"] &&
        join(
          process.env["PROGRAMFILES"],
          "Google/Chrome/Application/chrome.exe"
        ),
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
    ]
      .filter(Boolean)
      .find((p) => existsSync(p)) ||
    (() => {
      throw new Error("No Chromium found. Set CHROME_PATH.");
    })()
  );
}

mkdirSync(OUT, { recursive: true });
try {
  rmSync(PROFILE, { recursive: true, force: true });
} catch {
  /* stale profile is fine */
}

const chrome = spawn(
  findChrome(),
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--window-size=1600,900",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
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
      /* wait */
    }
    await sleep(250);
  }
  throw new Error("DevTools endpoint unavailable");
}

const socket = new WebSocket(await wsUrl());
await new Promise((res) => socket.addEventListener("open", res));
let id = 0;
const pending = new Map();
let sessionId = null;
socket.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error
      ? p.reject(new Error(JSON.stringify(m.error)))
      : p.resolve(m.result);
  }
});
const send = (method, params = {}) => {
  const i = ++id;
  const payload = { id: i, method, params };
  if (sessionId) payload.sessionId = sessionId;
  socket.send(JSON.stringify(payload));
  return new Promise((resolve, reject) => pending.set(i, { resolve, reject }));
};
const evalx = async (expression) => {
  const r = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return r.result?.value;
};

const { targetInfos } = await send("Target.getTargets");
const page = targetInfos.find((t) => t.type === "page");
({ sessionId } = await send("Target.attachToTarget", {
  targetId: page.targetId,
  flatten: true,
}));
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1600,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

await send("Page.navigate", { url: URL_ });
for (let i = 0; i < 80; i++) {
  if (await evalx("!!document.querySelector('#hero')")) break;
  await sleep(250);
}

// wait for all media to buffer, then let the preloader fade
await evalx(`
  (async () => {
    const vids = [...document.querySelectorAll('video')];
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline && !vids.every(v => v.readyState >= 2)) {
      await new Promise(r => setTimeout(r, 400));
    }
    return true;
  })()
`);
await sleep(2500);

/**
 * Pin every visible video to a deliberate timestamp so the screenshot shows
 * representative action rather than whatever frame happened to be playing.
 * Clamped to the clip length so short reels still resolve to a valid time.
 */
async function seekVideos(seconds) {
  await evalx(`
    (async () => {
      const vids = [...document.querySelectorAll('video')].filter(v => v.readyState >= 2);
      vids.forEach(v => {
        const t = Math.min(${seconds}, Math.max(0, (v.duration || 1) - 0.2));
        try { v.currentTime = t; v.pause(); } catch {}
      });
      // wait for the seeks to actually land so we don't capture the old frame
      await Promise.all(vids.map(v => new Promise(res => {
        if (Math.abs(v.currentTime - Math.min(${seconds}, Math.max(0, (v.duration||1) - 0.2))) < 0.15) return res();
        const done = () => res();
        v.addEventListener('seeked', done, { once: true });
        setTimeout(done, 2500);
      })));
      return true;
    })()
  `);
  await sleep(600);
}

/**
 * Timestamps hand-picked from each clip's timeline so the README shows
 * representative frames (weapon podium, agents in action, the cliff dive)
 * instead of motion blur.
 */
const steps = [
  ["hero", 0, 6.5],
  ["about", "about", 0],
  ["features", "nexus", 20],
  ["story", "story", 0],
  ["contact", "contact", 4],
];

for (const [name, target, seekTo] of steps) {
  if (typeof target === "number")
    await evalx(`window.scrollTo({top:${target},behavior:'instant'})`);
  else
    await evalx(
      `document.getElementById('${target}')?.scrollIntoView({block:'start',behavior:'instant'})`
    );
  await sleep(2600);
  if (seekTo) await seekVideos(seekTo);
  const r = await send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 84,
    captureBeyondViewport: false,
  });
  const file = join(OUT, `${name}.jpg`);
  writeFileSync(file, Buffer.from(r.data, "base64"));
  console.log(
    "wrote",
    file,
    `${(Buffer.from(r.data, "base64").length / 1024).toFixed(0)} KB`
  );
}

socket.close();
chrome.kill();
await new Promise((resolve) => {
  if (chrome.exitCode !== null) return resolve();
  chrome.once("exit", resolve);
  setTimeout(resolve, 3000);
});
try {
  rmSync(PROFILE, { recursive: true, force: true });
} catch {
  /* ignore */
}
console.log("DONE");
process.exit(0);
