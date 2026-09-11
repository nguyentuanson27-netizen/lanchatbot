import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = readFileSync(resolve(repoRoot, ".github/workflows/ci.yml"), "utf-8");
const workerPackage = JSON.parse(
  readFileSync(resolve(repoRoot, "apps/worker/package.json"), "utf-8"),
);

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

test("Track C checks prepare workspace dependencies before linting", () => {
  const trackC = stepBlock(jobBlock("check"), "Run Track C focused checks");
  const typecheck = trackC.indexOf("pnpm --filter @lana/worker typecheck");
  const lint = trackC.indexOf("pnpm --filter @lana/worker lint");

  assert.notEqual(typecheck, -1);
  assert.notEqual(lint, -1);
  assert.ok(typecheck < lint);
});

test("Track C focused checks gate the C2 100-case benchmark and C3 adapter regressions", () => {
  const trackC = stepBlock(jobBlock("check"), "Run Track C focused checks");
  assert.match(trackC, /pnpm --filter @lana\/worker benchmark:c2:validate/);
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
    /pnpm --filter "\.\.\.\[\$BASE_REF\]\.\.\." run --if-present build/,
  );
  assert.match(
    affected,
    /pnpm --filter "\.\.\.\[\$BASE_REF\]" run --if-present typecheck/,
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
  assert.equal((full.match(/pnpm -r build/g) ?? []).length, 1);
  assert.equal((full.match(/pnpm -r typecheck/g) ?? []).length, 1);
  assert.equal((full.match(/pnpm -r test/g) ?? []).length, 1);

  assert.equal((workflow.match(/pnpm check:release-integrity/g) ?? []).length, 1);
});

test("PostgreSQL service stays attached to the mandatory check job", () => {
  const check = jobBlock("check");
  assert.match(check, /services:\n\s+postgres:/);
  assert.match(check, /POLICY_STORE_TEST_DATABASE_URL:/);
  assert.match(check, /GATE_E_STORE_TEST_DATABASE_URL:/);
});
