import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = readFileSync(resolve(repoRoot, ".github/workflows/ci.yml"), "utf-8");

function jobBlock(name) {
  const marker = `\n  ${name}:\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `CI workflow is missing job: ${name}`);

  const bodyStart = start + marker.length;
  const rest = workflow.slice(bodyStart);
  const nextJobOffset = rest.search(/\n  [A-Za-z0-9_-]+:\n/);
  return nextJobOffset === -1 ? rest : rest.slice(0, nextJobOffset);
}

test("CI workflow keeps a lightweight scope gate before split mandatory lanes", () => {
  const scope = jobBlock("scope");
  assert.doesNotMatch(scope, /services:/);
  assert.doesNotMatch(scope, /pnpm install/);
  assert.match(scope, /Verify CI selector logic/);
  assert.match(scope, /Determine CI scope/);

  for (const name of ["db-safety", "static-safety", "code-track-c", "code-affected", "code-full"]) {
    assert.match(jobBlock(name), /needs:\s*scope/);
  }
});

test("CI workflow keeps a fail-closed pnpm check aggregate gate", () => {
  const aggregate = jobBlock("check");
  assert.match(aggregate, /name:\s*pnpm check/);
  assert.ok(aggregate.includes("if: ${{ !cancelled() }}"));
  assert.doesNotMatch(aggregate, /if:\s*always\(\)/);
  assert.match(aggregate, /Require mandatory gates/);

  const mandatoryNeeds = [
    "scope",
    "db-safety",
    "static-safety",
    "code-track-c",
    "code-affected",
    "code-full",
  ];
  for (const name of mandatoryNeeds) {
    assert.ok(aggregate.includes(`      - ${name}\n`), `aggregate gate must need ${name}`);
  }

  const resultBindings = [
    "SCOPE_RESULT: ${{ needs.scope.result }}",
    "DB_RESULT: ${{ needs.db-safety.result }}",
    "STATIC_RESULT: ${{ needs.static-safety.result }}",
    "TRACK_C_RESULT: ${{ needs.code-track-c.result }}",
    "AFFECTED_RESULT: ${{ needs.code-affected.result }}",
    "FULL_RESULT: ${{ needs.code-full.result }}",
  ];
  for (const binding of resultBindings) {
    assert.ok(aggregate.includes(binding), `aggregate gate must bind ${binding}`);
  }

  assert.ok(aggregate.includes('test "$SCOPE_RESULT" = "success"'));
  assert.ok(aggregate.includes('test "$DB_RESULT" = "success"'));
  assert.ok(aggregate.includes('test "$STATIC_RESULT" = "success"'));
  assert.ok(aggregate.includes('track-c)\n              test "$TRACK_C_RESULT" = "success"'));
  assert.ok(aggregate.includes('affected)\n              test "$AFFECTED_RESULT" = "success"'));
  assert.ok(aggregate.includes('full)\n              test "$FULL_RESULT" = "success"'));
  assert.ok(aggregate.includes('Unexpected CI mode'));
});

test("full regression lane deduplicates release integrity and top-level workspace build", () => {
  const full = jobBlock("code-full");
  assert.doesNotMatch(full, /run:\s*pnpm check\s*$/m);
  assert.doesNotMatch(full, /check:release-integrity/);
  assert.equal((full.match(/pnpm -r build/g) ?? []).length, 1);
  assert.equal((full.match(/pnpm -r typecheck/g) ?? []).length, 1);
  assert.equal((full.match(/pnpm -r test/g) ?? []).length, 1);

  assert.equal((workflow.match(/pnpm check:release-integrity/g) ?? []).length, 1);
  assert.match(jobBlock("static-safety"), /pnpm check:release-integrity/);
});

test("PostgreSQL service is isolated to the DB safety lane", () => {
  assert.match(jobBlock("db-safety"), /services:\n\s+postgres:/);
  for (const name of ["scope", "static-safety", "code-track-c", "code-affected", "code-full", "check"]) {
    assert.doesNotMatch(jobBlock(name), /services:\n\s+postgres:/);
  }
});
