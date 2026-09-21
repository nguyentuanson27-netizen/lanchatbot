import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import {
  TSC_BUILD_SCRIPT,
  hasSrcToDistLayout,
  pruneStaleBuildOutputs,
  workspacePackageDirs,
} from "./prune-stale-build-outputs.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "lana-prune-"));
  mkdirSync(join(dir, "src", "nested"), { recursive: true });
  mkdirSync(join(dir, "dist", "nested"), { recursive: true });
  return dir;
}

function write(path, contents = "") {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

test("keeps every output whose source still exists", () => {
  const dir = fixture();
  try {
    write(join(dir, "src", "kept.ts"));
    write(join(dir, "src", "nested", "kept.ts"));
    for (const suffix of [".js", ".js.map", ".d.ts", ".d.ts.map"]) {
      write(join(dir, "dist", `kept${suffix}`));
      write(join(dir, "dist", "nested", `kept${suffix}`));
    }

    const { removed } = pruneStaleBuildOutputs(dir);

    assert.deepEqual(removed, []);
    assert.ok(existsSync(join(dir, "dist", "kept.js")));
    assert.ok(existsSync(join(dir, "dist", "nested", "kept.d.ts.map")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("removes every output of a deleted source, including compiled tests", () => {
  const dir = fixture();
  try {
    write(join(dir, "src", "kept.ts"));
    write(join(dir, "dist", "kept.js"));
    // The hazard this script exists for: @lana/admin-api runs `node --test
    // dist/*.test.js`, so a leftover compiled test is executable.
    for (const suffix of [".js", ".js.map", ".d.ts", ".d.ts.map"]) {
      write(join(dir, "dist", `orphan.test${suffix}`));
      write(join(dir, "dist", "nested", `orphan${suffix}`));
    }

    const { removed } = pruneStaleBuildOutputs(dir);

    assert.equal(removed.length, 8);
    assert.ok(!existsSync(join(dir, "dist", "orphan.test.js")));
    assert.ok(!existsSync(join(dir, "dist", "nested", "orphan.d.ts")));
    assert.ok(existsSync(join(dir, "dist", "kept.js")));
    // An emptied directory goes with it.
    assert.ok(!existsSync(join(dir, "dist", "nested")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("maps each output suffix back to the right source extension", () => {
  const dir = fixture();
  try {
    write(join(dir, "src", "component.tsx"));
    write(join(dir, "src", "data.json"));
    write(join(dir, "dist", "component.js"));
    write(join(dir, "dist", "component.d.ts"));
    write(join(dir, "dist", "data.json"));
    // `.d.ts.map` must not be read as a `.ts.map` of a source named `x.d`.
    write(join(dir, "src", "typed.ts"));
    write(join(dir, "dist", "typed.d.ts.map"));

    const { removed } = pruneStaleBuildOutputs(dir);

    assert.deepEqual(removed, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("leaves files it does not recognise as tsc output", () => {
  const dir = fixture();
  try {
    write(join(dir, "dist", "vendor.wasm"));
    write(join(dir, "dist", "styles.css"));

    const { removed, unrecognized } = pruneStaleBuildOutputs(dir);

    assert.deepEqual(removed, []);
    assert.equal(unrecognized.length, 2);
    assert.ok(existsSync(join(dir, "dist", "vendor.wasm")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("does nothing when the package has no dist or no src", () => {
  const dir = mkdtempSync(join(tmpdir(), "lana-prune-"));
  try {
    assert.deepEqual(pruneStaleBuildOutputs(dir), { removed: [], unrecognized: [] });
    mkdirSync(join(dir, "dist"));
    write(join(dir, "dist", "leftover.js"));
    assert.deepEqual(pruneStaleBuildOutputs(dir).removed, []);
    assert.ok(existsSync(join(dir, "dist", "leftover.js")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("covers exactly the workspace packages that build with tsc", () => {
  const dirs = workspacePackageDirs(repoRoot).map((dir) => dir.slice(repoRoot.length + 1));

  assert.ok(dirs.length > 0, "no tsc-built packages discovered");
  assert.ok(dirs.includes("apps/admin-api"), "the dist/*.test.js glob package must be covered");
  // vite and `node --check` packages have no tsc dist/ to prune.
  assert.ok(!dirs.includes("apps/admin-web"));
  assert.ok(!dirs.includes("apps/lana-mcp"));

  for (const dir of dirs) {
    const manifest = JSON.parse(
      execFileSync(process.execPath, ["-p", `JSON.stringify(require("${join(repoRoot, dir, "package.json")}"))`], {
        encoding: "utf-8",
      }),
    );
    assert.equal(manifest.scripts.build, TSC_BUILD_SCRIPT);
  }
});

test("every tsc-built package uses the src/ -> dist/ layout this script assumes", () => {
  // The script skips a package laid out differently rather than mis-pruning it,
  // which is safe but silently costs that package its cache safety. This fails
  // instead, so the layout change is a decision someone makes on purpose.
  const covered = new Set(workspacePackageDirs(repoRoot));
  const divergent = [];

  for (const root of ["apps", "packages"]) {
    for (const entry of readdirSync(join(repoRoot, root))) {
      const packageDir = join(repoRoot, root, entry);
      const manifestPath = join(packageDir, "package.json");
      if (!existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      if (manifest.scripts?.build !== TSC_BUILD_SCRIPT) continue;
      if (!covered.has(packageDir)) {
        divergent.push(
          `${root}/${entry}: builds with tsc, but its tsconfig.json is not readable as ` +
            `rootDir src / outDir dist, so its dist/ is never pruned`,
        );
      }
    }
  }

  assert.deepEqual(divergent, []);
  assert.ok(hasSrcToDistLayout(join(repoRoot, "apps/admin-api")));
});

test("treats an unreadable or differently laid out tsconfig as unknown", () => {
  const dir = mkdtempSync(join(tmpdir(), "lana-prune-"));
  try {
    // No tsconfig at all.
    assert.equal(hasSrcToDistLayout(dir), false);

    // A different layout.
    write(join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { rootDir: ".", outDir: "dist" } }));
    assert.equal(hasSrcToDistLayout(dir), false);

    // JSONC, which tsconfig.json allows. This must not throw: the script runs
    // before the build, so an exception here would fail the whole CI job.
    write(join(dir, "tsconfig.json"), '{\n  // a comment\n  "compilerOptions": { "rootDir": "src", "outDir": "dist" }\n}');
    assert.equal(hasSrcToDistLayout(dir), false);

    // The layout the dist/ -> src/ mapping actually relies on.
    write(join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { rootDir: "src", outDir: "dist" } }));
    assert.equal(hasSrcToDistLayout(dir), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
