#!/usr/bin/env node
// Checks the documentation against two sources of truth:
//   1. Every `--option` named in the pages exists in the released CLI help
//      snapshots (scripts/cli-reference/help.json).
//   2. Every internal link and anchor in the built site (dist/) resolves.
// Run after `astro build`: node scripts/check-docs.mjs
// Use --options-only to skip the link check when dist/ is not built.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const optionsOnly = process.argv.includes("--options-only");
const problems = [];

// Options of other tools that the pages show in commands (dotnet, git, npm).
const foreignOptions = new Set(["--global", "--tool-path", "--name-only"]);

// Release notes describe earlier versions and can name removed options.
const historyPages = new Set(["release-notes.md"]);

function walk(dir, accept, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, accept, out);
    else if (accept(path)) out.push(path);
  }
  return out;
}

// ---- 1. Options -------------------------------------------------------------

const help = JSON.parse(readFileSync(join(root, "scripts/cli-reference/help.json"), "utf8"));
const optionPattern = /(?<![\w-])--[a-z][a-z0-9-]*/g;
const knownOptions = new Set(foreignOptions);
for (const text of Object.values(help.help)) {
  for (const option of text.match(optionPattern) ?? []) knownOptions.add(option);
}

const sources = [
  ...walk(join(root, "src/content/docs"), (p) => p.endsWith(".md") && !historyPages.has(p.split(/[\\/]/).pop())),
  ...walk(join(root, "src/pages"), (p) => p.endsWith(".astro"))
];

for (const file of sources) {
  const lines = readFileSync(file, "utf8").split("\n");
  let inStyle = false;
  lines.forEach((line, index) => {
    if (/<style[\s>]/.test(line)) inStyle = true;
    if (/<\/style>/.test(line)) { inStyle = false; return; }
    if (inStyle) return;
    // Link targets and HTML comments are not command text.
    const text = line.replace(/\]\([^)]*\)/g, "]").replace(/href="[^"]*"/g, "").replace(/<!--.*?-->/g, "");
    for (const option of text.match(optionPattern) ?? []) {
      if (!knownOptions.has(option)) {
        problems.push(`${relative(root, file)}:${index + 1}: option ${option} is not in the v${help.version} CLI help`);
      }
    }
  });
}

// ---- 2. Links and anchors ---------------------------------------------------

if (!optionsOnly) {
  const dist = join(root, "dist");
  if (!existsSync(dist)) {
    problems.push("dist/ does not exist. Run `astro build` first, or pass --options-only.");
  } else {
    const pages = walk(dist, (p) => p.endsWith(".html") && !p.includes(`${join(dist, "pagefind")}`));
    const ids = new Map();
    const html = new Map();
    for (const page of pages) {
      const content = readFileSync(page, "utf8");
      html.set(page, content);
      ids.set(page, new Set([...content.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
    }
    for (const page of pages) {
      // The generated CLI reference builds its own anchors from the help snapshots.
      if (page.endsWith("alwasp-cli-reference.html")) continue;
      const seen = new Set();
      for (const match of html.get(page).matchAll(/href="(\/[^"#?]*)?(?:\?[^"#]*)?(#[^"]*)?"/g)) {
        const [raw, path, hash] = match;
        if (seen.has(raw) || (!path && !hash)) continue;
        seen.add(raw);
        let target = page;
        if (path) {
          if (path.startsWith("/pagefind/")) continue;
          target = join(dist, path);
          if (!extname(target)) target = join(target, "index.html");
          if (!existsSync(target)) {
            problems.push(`${relative(dist, page)}: link ${path} has no page`);
            continue;
          }
        }
        if (hash && hash.length > 1 && ids.has(target) && !ids.get(target).has(decodeURIComponent(hash.slice(1)))) {
          problems.push(`${relative(dist, page)}: anchor ${path ?? ""}${hash} does not exist`);
        }
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`Documentation check failed (${problems.length}):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`Documentation check passed: options match the v${help.version} CLI help${optionsOnly ? "" : "; links and anchors resolve"}.`);
