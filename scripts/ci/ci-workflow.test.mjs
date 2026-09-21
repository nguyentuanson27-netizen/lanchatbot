import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = readFileSync(resolve(repoRoot, ".github/workflows/ci.yml"), "utf-8");
const workerPackage = JSON.parse(
  readFileSync(resolve(repoRoot, "apps/worker/package.json"), "utf-8"),
);

const PRE_POST_OPT_OUT = "--config.enable-pre-post-scripts=false";

function workspacePackages() {
  const packages = [];
  for (const root of ["apps", "packages"]) {
    for (const entry of readdirSync(resolve(repoRoot, root))) {
      const manifestPath = resolve(repoRoot, root, entry, "package.json");
      packages.push({
        dir: `${root}/${entry}`,
        manifest: JSON.parse(readFileSync(manifestPath, "utf-8")),
      });
    }
  }
  return packages;
}

function jobBlock(name) {
  const marker = `\n  ${name}:\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `CI workflow is missing job: ${name}`);

  const bodyStart = start + marker.length;
  const rest = workflow.slice(bodyStart);
  const nextJobOffset = rest.search(/\n  [A-Za-z0-9_-]+:\n/);
  return nextJobOffset === -1 ? rest : rest.slice(0, nextJobOffset);
}

function stepBlock(job, stepName) {
  const marker = `\n      - name: ${stepName}\n`;
  const start = job.indexOf(marker);
  assert.notEqual(start, -1, `CI job is missing step: ${stepName}`);

  const bodyStart = start + marker.length;
  const rest = job.slice(bodyStart);
  const nextStepOffset = rest.search(/\n      - name:/);
  return nextStepOffset === -1 ? rest : rest.slice(0, nextStepOffset);
}

test("CI keeps one check job until lana-ci runner parallelism is explicitly available", () => {
  const jobsMarker = "\njobs:\n";
  const jobsStart = workflow.indexOf(jobsMarker);
  assert.notEqual(jobsStart, -1, "CI workflow is missing jobs section");

  const jobsSection = workflow.slice(jobsStart + jobsMarker.length);
  const jobNames = [...jobsSection.matchAll(/^  ([A-Za-z0-9_-]+):\s*$/gm)].map((match) => match[1]);
  assert.deepEqual(jobNames, ["check"]);

  const check = jobBlock("check");
  assert.match(check, /name:\s*pnpm check/);
  assert.match(check, /runs-on:\s*\[self-hosted, Linux, X64, lana-ci\]/);
});

test("CI preserves mandatory gates and selector-driven code lanes", () => {
  const check = jobBlock("check");
  for (const stepName of [
    "Verify policy transactions on PostgreSQL",
    "Verify Track B 0037 migration operator",
    "Verify Track B 0038 migration operator",
    "Verify Track B 0039 migration operator",
    "Verify Track B 0040 operator boundary",
    "Verify Gate E release-evidence reader access",
    "Verify release integrity",
    "Verify CI selector logic",
    "Determine CI scope",
    "Run Track C focused checks",
    "Run affected packages checks",
    "Run repository checks (full regression)",
  ]) {
    stepBlock(check, stepName);
  }

  assert.match(stepBlock(check, "Run Track C focused checks"), /if:\s*steps\.ci-scope\.outputs\.mode == 'track-c'/);
  assert.match(stepBlock(check, "Run affected packages checks"), /if:\s*steps\.ci-scope\.outputs\.mode == 'affected'/);
  assert.match(stepBlock(check, "Run repository checks (full regression)"), /if:\s*steps\.ci-scope\.outputs\.mode == 'full'/);
});

test("the shared workspace build runs once, before every consumer of dist/", () => {
  const check = jobBlock("check");
  const build = check.indexOf("- name: Build workspace");
  assert.notEqual(build, -1, "CI must build the workspace once up front");
  assert.equal(
    (check.match(/pnpm \$PNPM_NO_PRE_POST -r build/g) ?? []).length,
    1,
    "the workspace must be built exactly once per job",
  );

  // Everything downstream reads dist/ rather than re-deriving its own slice.
  for (const stepName of [
    "Typecheck packages not covered by the build",
    "Verify policy transactions on PostgreSQL",
    "Run Track C focused checks",
    "Run affected packages checks",
    "Run repository checks (full regression)",
  ]) {
    const consumer = check.indexOf(`- name: ${stepName}`);
    assert.notEqual(consumer, -1, `CI job is missing step: ${stepName}`);
    assert.ok(build < consumer, `${stepName} must run after the shared build`);
  }

  // The scope has to be known before the build so lanes can opt out of it.
  assert.ok(check.indexOf("- name: Determine CI scope") < build);
});

test("only packages whose build does not type-check get a separate typecheck pass", () => {
  // `tsc -p tsconfig.json` performs the same checks as `tsc --noEmit`, and
  // declaration emit adds more, so a tsc build subsumes the typecheck script.
  // Anything built another way still needs its own pass, and the workflow has
  // to name it explicitly.
  const typecheckStep = stepBlock(jobBlock("check"), "Typecheck packages not covered by the build");
  const explicitlyTypechecked = new Set(
    [...typecheckStep.matchAll(/--filter (@[\w/-]+) typecheck/g)].map((match) => match[1]),
  );

  const uncovered = workspacePackages()
    .filter(({ manifest }) => {
      const scripts = manifest.scripts ?? {};
      if (!scripts.typecheck) return false;
      if (scripts.build === "tsc -p tsconfig.json") return false;
      if (scripts.build === scripts.typecheck) return false;
      return !explicitlyTypechecked.has(manifest.name);
    })
    .map(({ dir, manifest }) => `${dir}: build=${manifest.scripts.build}`);

  assert.deepEqual(uncovered, [], "these packages are never type-checked by CI");

  // And nothing is listed that the build already covers.
  const redundant = workspacePackages()
    .filter(({ manifest }) => explicitlyTypechecked.has(manifest.name))
    .filter(({ manifest }) => manifest.scripts?.build === "tsc -p tsconfig.json")
    .map(({ dir }) => dir);

  assert.deepEqual(redundant, [], "these packages are type-checked twice");
});

test("Track C focused checks gate the C2 100-case benchmark and C3 adapter regressions", () => {
  const trackC = stepBlock(jobBlock("check"), "Run Track C focused checks");
  assert.match(trackC, /pnpm \$PNPM_NO_PRE_POST --filter @lana\/worker benchmark:c2:validate/);
  for (const testFile of [
    "src/track-c-c3-two-pass-quality-adapter.test.ts",
    "src/track-c-quality-v2-scoring.test.ts",
    "src/track-c-quality-v2-evaluator.test.ts",
    "src/track-c-quality-v2-gate.test.ts",
  ]) {
    assert.ok(trackC.includes(testFile), `Track C focused checks missing ${testFile}`);
  }
  assert.doesNotMatch(trackC, /track-c-quality-suite-gate\.test\.ts/);
});

test("the affected lane tests changed packages and their dependents", () => {
  const affected = stepBlock(jobBlock("check"), "Run affected packages checks");

  assert.match(
    affected,
    /pnpm \$PNPM_NO_PRE_POST --filter "\.\.\.\[\$BASE_REF\]" run --if-present test/,
  );
});

test("worker preparation hooks build its complete dependency graph before compilation", () => {
  const dependencyBuild = 'pnpm -r --filter "@lana/worker^..." build';
  for (const hook of ["prebuild", "pretypecheck", "pretest"]) {
    assert.equal(workerPackage.scripts[hook], dependencyBuild);
  }
});

test("full regression deduplicates release integrity and the second top-level workspace build", () => {
  const check = jobBlock("check");
  const full = stepBlock(check, "Run repository checks (full regression)");

  assert.doesNotMatch(full, /pnpm check(?:\s|$)/);
  assert.doesNotMatch(full, /check:release-integrity/);
  assert.equal((full.match(/pnpm \$PNPM_NO_PRE_POST -r test/g) ?? []).length, 1);

  assert.equal((workflow.match(/pnpm check:release-integrity/g) ?? []).length, 1);
});

test("PostgreSQL service stays attached to the mandatory check job", () => {
  const check = jobBlock("check");
  assert.match(check, /services:\n\s+postgres:/);
  assert.match(check, /POLICY_STORE_TEST_DATABASE_URL:/);
  assert.match(check, /GATE_E_STORE_TEST_DATABASE_URL:/);
});

test("CI opts every workspace script lane out of duplicated pre*/post* rebuilds", () => {
  const check = jobBlock("check");
  assert.ok(
    check.includes(`PNPM_NO_PRE_POST: ${PRE_POST_OPT_OUT}`),
    "check job must export the pre*/post* opt-out flag",
  );

  for (const stepName of [
    "Run Track C focused checks",
    "Run affected packages checks",
    "Run repository checks (full regression)",
  ]) {
    const step = stepBlock(check, stepName);
    const invocations = step.match(/^\s*time pnpm (?!\$PNPM_NO_PRE_POST\b).*$/gm) ?? [];
    assert.deepEqual(
      invocations,
      [],
      `${stepName} runs pnpm without the pre*/post* opt-out: ${invocations.join(" | ")}`,
    );
  }
});

test("lint stays byte-identical to typecheck, so CI runs the tsc pass once", () => {
  // The scope lanes deliberately drop the separate `lint` pass because every
  // package defines it as the exact command `typecheck` already runs. If a
  // package ever gains a real linter, this fails and the lane must run it again.
  const divergent = workspacePackages()
    .filter(({ manifest }) => manifest.scripts?.lint !== manifest.scripts?.typecheck)
    .map(({ dir, manifest }) => `${dir}: lint=${manifest.scripts?.lint} typecheck=${manifest.scripts?.typecheck}`);

  assert.deepEqual(divergent, []);

  const check = jobBlock("check");
  for (const stepName of [
    "Run Track C focused checks",
    "Run affected packages checks",
    "Run repository checks (full regression)",
  ]) {
    assert.doesNotMatch(
      stepBlock(check, stepName),
      /(?:run --if-present|-r|--filter \S+|exec) lint\b/,
      `${stepName} re-runs lint, which duplicates typecheck`,
    );
  }
});

test("the docs lane runs every check that reads repository documentation", async () => {
  const { DOC_COUPLED_SUITES } = await import("./ci-scope.mjs");

  const dirByName = new Map(
    workspacePackages().map(({ dir, manifest }) => [manifest.name, dir]),
  );
  const covered = new Set(
    DOC_COUPLED_SUITES.map(({ packageName, testFile }) => {
      const dir = dirByName.get(packageName);
      assert.ok(dir, `DOC_COUPLED_SUITES names an unknown package: ${packageName}`);
      return `${dir}/${testFile}`;
    }),
  );

  // Quoted literals only: a doc path inside a backtick comment is a pointer for
  // readers, not something the code reads. deploy/ is excluded because
  // check:release-integrity runs unconditionally and deploy/ changes already
  // force a full regression.
  const DOC_PATH_LITERAL =
    /(['"])[^'"\n]*(?:\bREADME\.md\b|\bAGENTS\.md\b|docs\/[^'"\n]*\.md)[^'"\n]*\1/;

  const readers = [];
  const walk = (dir) => {
    for (const entry of readdirSync(resolve(repoRoot, dir), { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(path);
      } else if (/\.(?:ts|tsx|mjs|js)$/.test(entry.name)) {
        if (DOC_PATH_LITERAL.test(readFileSync(resolve(repoRoot, path), "utf-8"))) {
          readers.push(path);
        }
      }
    }
  };
  walk("apps");
  walk("packages");

  const uncovered = readers.filter((path) => !covered.has(path));
  assert.deepEqual(
    uncovered,
    [],
    "these files read repository documentation but the docs lane does not run them",
  );

  // And the workflow actually runs what DOC_COUPLED_SUITES promises.
  const docsLane = stepBlock(jobBlock("check"), "Run documentation-coupled checks");
  assert.match(docsLane, /if:\s*steps\.ci-scope\.outputs\.mode == 'docs'/);
  for (const { packageName, testFile } of DOC_COUPLED_SUITES) {
    assert.ok(
      docsLane.includes(packageName),
      `docs lane does not run ${packageName}`,
    );
    assert.ok(
      docsLane.includes(testFile) || docsLane.includes(`--filter ${packageName} test`),
      `docs lane does not run ${packageName} ${testFile}`,
    );
  }
});

test("restored build outputs are pruned before anything compiles or runs", () => {
  const check = jobBlock("check");
  const restore = check.indexOf("- name: Restore build outputs");
  const prune = check.indexOf("- name: Prune stale build outputs");
  const build = check.indexOf("- name: Build workspace");

  assert.notEqual(restore, -1, "CI must restore build outputs");
  assert.notEqual(prune, -1, "a restored dist/ must be pruned");
  // Order is the whole safety property: a leftover dist/*.test.js from an older
  // commit is executable, so it has to go before tsc decides what to re-emit.
  assert.ok(restore < prune, "prune must run after the cache is restored");
  assert.ok(prune < build, "prune must run before the build");

  const restoreStep = stepBlock(check, "Restore build outputs");
  // vite output cannot be mapped back to sources, so it is never restored.
  assert.match(restoreStep, /!apps\/admin-web\/dist/);
  assert.match(restoreStep, /restore-keys:/);
  assert.match(restoreStep, /\*\.tsbuildinfo/);

  assert.match(
    stepBlock(check, "Prune stale build outputs"),
    /node scripts\/ci\/prune-stale-build-outputs\.mjs/,
  );

  // The pruning logic is itself gated.
  assert.match(
    stepBlock(check, "Verify CI selector logic"),
    /scripts\/ci\/prune-stale-build-outputs\.test\.mjs/,
  );
});

test("incremental compilation is on, and its state file is not committed", () => {
  const tsconfig = JSON.parse(readFileSync(resolve(repoRoot, "tsconfig.base.json"), "utf-8"));
  assert.equal(tsconfig.compilerOptions.incremental, true);

  const gitignore = readFileSync(resolve(repoRoot, ".gitignore"), "utf-8");
  assert.ok(
    gitignore.split(/\r?\n/).includes("*.tsbuildinfo"),
    "tsc writes tsconfig.tsbuildinfo beside tsconfig.json, outside dist/",
  );
});
