#!/usr/bin/env node
/**
 * Regenerate the auto-maintained sections of README.md.
 *
 * The README embeds two generated blocks, delimited by HTML comment markers:
 *
 *     <!--- DEPENDENCIES_START --->      ... <!--- DEPENDENCIES_END --->
 *     <!--- FOLDER_STRUCTURE_START --->  ... <!--- FOLDER_STRUCTURE_END --->
 *
 * This script rewrites both from package.json and the working tree, then formats
 * the result with Prettier so the output is stable and matches the repo style.
 *
 * Run it after adding a dependency or moving files:
 *
 *     npm run readme:update
 *
 * The `README check` workflow runs this and fails if the result differs, so the
 * sections cannot silently drift. It never commits on your behalf.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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
  return readme.replace(re, `$1\n${body}$2`);
}

const pkg = JSON.parse(readFileSync(PKG, "utf8"));
const projectName = pkg.name || "project-root";

let readme = readFileSync(README, "utf8");
readme = replaceBlock(readme, "DEPENDENCIES", buildDependencies(pkg));
readme = replaceBlock(
  readme,
  "FOLDER_STRUCTURE",
  "```bash\n" + projectName + "/\n" + buildTree(".") + "```\n"
);

writeFileSync(README, readme, "utf8");

// Format so the generated blocks satisfy `npm run format`.
const prettierBin = join("node_modules", "prettier", "bin", "prettier.cjs");
if (existsSync(prettierBin)) {
  execFileSync(process.execPath, [prettierBin, "--write", README], {
    stdio: "inherit",
  });
} else {
  console.warn("prettier not installed - skipping formatting");
}

console.log(
  `${README} regenerated (${Object.keys(pkg.dependencies ?? {}).length} deps, ` +
    `${Object.keys(pkg.devDependencies ?? {}).length} devDeps)`
);
