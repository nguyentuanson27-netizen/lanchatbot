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

test("Track C checks build the worker dependency closure before compiling", () => {
  const trackC = stepBlock(jobBlock("check"), "Run Track C focused checks");
  const build = trackC.indexOf('--filter "@lana/worker..." run --if-present build');
  const typecheck = trackC.indexOf("--filter @lana/worker typecheck");

  // With pre*/post* hooks disabled, nothing else prepares @lana/worker's
  // dependencies, so the explicit closure build has to come first.
  assert.notEqual(build, -1, "Track C lane must build the worker dependency closure");
  assert.notEqual(typecheck, -1);
  assert.ok(build < typecheck);
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

test("affected-package build prepares the dependency closure of changed packages and dependents", () => {
  const affected = stepBlock(jobBlock("check"), "Run affected packages checks");

  assert.match(
    affected,
    /pnpm \$PNPM_NO_PRE_POST --filter "\.\.\.\[\$BASE_REF\]\.\.\." run --if-present build/,
  );
  assert.match(
    affected,
    /pnpm \$PNPM_NO_PRE_POST --filter "\.\.\.\[\$BASE_REF\]" run --if-present typecheck/,
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
  assert.equal((full.match(/pnpm \$PNPM_NO_PRE_POST -r build/g) ?? []).length, 1);
  assert.equal((full.match(/pnpm \$PNPM_NO_PRE_POST -r typecheck/g) ?? []).length, 1);
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
