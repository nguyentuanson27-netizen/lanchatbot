// Deletes build outputs whose source file no longer exists.
//
// CI restores dist/ and the tsc .tsbuildinfo files from a previous run so the
// workspace build is incremental. tsc never removes the output of a source file
// that was deleted or renamed, so without this a restored dist/ keeps executable
// leftovers from an older commit -- and @lana/admin-api runs its tests with
// `node --test dist/*.test.js`, a glob that would happily run them.
//
// Only packages that build with `tsc -p tsconfig.json` (rootDir src, outDir dist)
// are handled; scripts/ci/ci-workflow.test.mjs pins which packages those are.
// @lana/admin-web builds with vite and is excluded from the CI cache instead.

import { existsSync, readdirSync, readFileSync, rmdirSync, unlinkSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TSC_BUILD_SCRIPT = "tsc -p tsconfig.json";

// Suffix -> the source extensions that can produce it. Longest suffix first, so
// `.d.ts.map` is matched before `.ts.map` would be.
const OUTPUT_SUFFIXES = [
  [".d.ts.map", [".ts", ".tsx", ".mts", ".cts"]],
  [".d.ts", [".ts", ".tsx", ".mts", ".cts"]],
  [".js.map", [".ts", ".tsx", ".mts", ".cts"]],
  [".js", [".ts", ".tsx", ".mts", ".cts"]],
  [".json", [".json"]],
];

function listFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listFiles(path));
    else found.push(path);
  }
  return found;
}

function removeEmptyDirectories(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirectories(join(dir, entry.name));
  }
  if (readdirSync(dir).length === 0) rmdirSync(dir);
}

/**
 * Removes every file in `<packageDir>/dist` that no file in `<packageDir>/src`
 * could have produced. Returns the removed paths and the ones left in place
 * because their suffix is not something tsc emits.
 */
export function pruneStaleBuildOutputs(packageDir) {
  const distDir = join(packageDir, "dist");
  const srcDir = join(packageDir, "src");
  const removed = [];
  const unrecognized = [];

  if (!existsSync(distDir) || !existsSync(srcDir)) {
    return { removed, unrecognized };
  }

  for (const outputPath of listFiles(distDir)) {
    const relativeOutput = relative(distDir, outputPath);
    const suffix = OUTPUT_SUFFIXES.find(([candidate]) => relativeOutput.endsWith(candidate));

    if (!suffix) {
      // Not something `tsc` emits. Leaving it is the conservative choice: it
      // cannot be a stale compiled module, and deleting it could break a build
      // step that put it there on purpose.
      unrecognized.push(outputPath);
      continue;
    }

    const [outputSuffix, sourceExtensions] = suffix;
    const stem = relativeOutput.slice(0, -outputSuffix.length);
    const hasSource = sourceExtensions.some((extension) =>
      existsSync(join(srcDir, `${stem}${extension}`)),
    );

    if (!hasSource) {
      unlinkSync(outputPath);
      removed.push(outputPath);
    }
  }

  if (removed.length > 0) removeEmptyDirectories(distDir);

  return { removed, unrecognized };
}

export function workspacePackageDirs(repoRoot) {
  const dirs = [];
  for (const root of ["apps", "packages"]) {
    const rootPath = join(repoRoot, root);
    if (!existsSync(rootPath)) continue;
    for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const packageDir = join(rootPath, entry.name);
      const manifestPath = join(packageDir, "package.json");
      if (!existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      if (manifest.scripts?.build !== TSC_BUILD_SCRIPT) continue;
      dirs.push(packageDir);
    }
  }
  return dirs;
}

export function runCli(repoRoot) {
  let total = 0;
  for (const packageDir of workspacePackageDirs(repoRoot)) {
    const { removed, unrecognized } = pruneStaleBuildOutputs(packageDir);
    total += removed.length;
    for (const path of removed) console.log(`removed stale output: ${relative(repoRoot, path)}`);
    for (const path of unrecognized) {
      console.log(`left in place (not a tsc output): ${relative(repoRoot, path)}`);
    }
  }
  console.log(`stale build outputs removed: ${total}`);
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFilePath) {
  runCli(resolve(dirname(currentFilePath), "../.."));
}
