#!/usr/bin/env node
/**
 * Regenerate the auto-maintained sections of README.md.
 *
 * The README embeds two generated blocks, delimited by HTML comment markers:
 *
 *     <!--- DEPENDENCIES_START --->      ... <!--- DEPENDENCIES_END --->
 *     <!--- FOLDER_STRUCTURE_START --->  ... <!--- FOLDER_STRUCTURE_END --->
 *
 * This script rewrites both from package.json and the working tree.
 *
 * It deliberately depends on nothing but the Node standard library. An earlier
 * revision shelled out to Prettier when available, which meant a missing or
 * skipped formatter silently produced unformatted output that no longer matched
 * the committed README, so the CI check disagreed with local runs. Formatting is
 * now an explicit, separate step (`npm run format:fix`), and this script emits
 * Prettier-stable output on its own.
 *
 * Usage:
 *     npm run readme:update     # rewrite README.md in place
 *     npm run readme:check      # exit 1 if README.md is stale (used by CI)
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const README = "README.md";
const PKG = "package.json";

/** Directories never worth printing in the README tree. */
const IGNORE_DIRS = new Set([
  ".git",
  ".next",
  ".github",
  ".vscode",
  "node_modules",
  "dist",
  "coverage",
  "scripts",
]);

/** Files that add noise rather than insight. */
const IGNORE_FILES = new Set(["LICENSE", ".DS_Store"]);

/** Large asset folders we list by name only instead of expanding. */
const NO_EXPAND = new Set(["public", "migrations", "assets", "screenshots"]);

function compareEntries(a, b) {
  if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function buildTree(dir, depth = 0) {
  const entries = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => {
      if (entry.isDirectory()) return !IGNORE_DIRS.has(entry.name);
      if (IGNORE_FILES.has(entry.name)) return false;
      // generated markdown files are not interesting in a file tree
      return !entry.name.endsWith(".md");
    })
    .sort(compareEntries);

  let out = "";
  for (const entry of entries) {
    const prefix = "  ".repeat(depth + 1) + "|" + "-".repeat(depth + 1) + " ";
    out += `${prefix}${entry.name}${entry.isDirectory() ? "/" : ""}\n`;

    const isSrcSubfolder = depth === 1 && basename(dir) === "src";
    if (
      entry.isDirectory() &&
      (depth === 0 || isSrcSubfolder) &&
      !NO_EXPAND.has(entry.name)
    ) {
      out += buildTree(join(dir, entry.name), depth + 1);
    }
  }
  return out;
}

function buildDependencies(pkg) {
  const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  return (
    Object.keys(all)
      .sort()
      .map(
        (name) =>
          `- [${name}](https://www.npmjs.com/package/${name}): ${all[name]}`
      )
      .join("\n") + "\n"
  );
}

/**
 * Replace a marker-delimited block, emitting exactly one blank line inside each
 * marker. That is the shape Prettier produces for both a fenced code block and a
 * list, so its output is a fixed point of `prettier --write`.
 */
function replaceBlock(readme, name, body) {
  const re = new RegExp(
    `(<!--- ${name}_START --->)[\\s\\S]*?(<!--- ${name}_END --->)`
  );
  if (!re.test(readme)) {
    throw new Error(
      `README.md is missing the ${name} markers. Expected ` +
        `<!--- ${name}_START ---> ... <!--- ${name}_END --->.`
    );
  }
  return readme.replace(re, `$1\n\n${body.trimEnd()}\n\n$2`);
}

function render() {
  const pkg = JSON.parse(readFileSync(PKG, "utf8"));
  const projectName = pkg.name || "project-root";

  let readme = readFileSync(README, "utf8");
  readme = replaceBlock(readme, "DEPENDENCIES", buildDependencies(pkg));
  readme = replaceBlock(
    readme,
    "FOLDER_STRUCTURE",
    "```bash\n" + projectName + "/\n" + buildTree(".") + "```\n"
  );

  const deps = Object.keys(pkg.dependencies ?? {}).length;
  const devDeps = Object.keys(pkg.devDependencies ?? {}).length;
  return { readme, deps, devDeps };
}

const check = process.argv.includes("--check");
const { readme, deps, devDeps } = render();
const current = readFileSync(README, "utf8");
const summary = `${deps} deps, ${devDeps} devDeps`;

if (check) {
  if (current === readme) {
    console.log(`${README} is up to date (${summary}).`);
    process.exit(0);
  }
  console.error(
    `${README} is out of date. Run \`npm run readme:update\` and commit the result.`
  );
  process.exit(1);
}

if (current === readme) {
  console.log(`${README} already up to date (${summary}).`);
} else {
  writeFileSync(README, readme, "utf8");
  console.log(`${README} regenerated (${summary}).`);
  console.log("Run `npm run format:fix` if you changed anything else.");
}
