import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { selectCiScope } from "./ci-scope.mjs";

test("selectCiScope: Track C offline-only files select track-c mode", () => {
  const cases = [
    ["apps/worker/src/track-c-replay.ts"],
    ["apps/worker/src/track-c-replay.test.ts"],
    ["apps/worker/src/track-c-must-pass.ts"],
    ["apps/worker/src/track-c-must-pass.test.ts"],
    ["apps/worker/src/track-c-quality-judge.ts"],
    ["apps/worker/src/track-c-quality-judge.test.ts"],
    ["apps/worker/src/track-c-offline-candidate.ts"],
    ["apps/worker/src/track-c-offline-candidate.test.ts"],
    ["apps/worker/src/track-c-offline-candidate-validation.ts"],
    ["apps/worker/src/track-c-c3-sales-quality-candidate.ts"],
    ["apps/worker/src/track-c-c3-sales-quality-candidate.test.ts"],
    ["apps/worker/src/track-c-quality-suite-gate.ts"],
    ["apps/worker/src/track-c-quality-suite-gate.test.ts"],
    [
      "apps/worker/src/track-c-replay.ts",
      "apps/worker/src/track-c-replay.test.ts",
      "apps/worker/src/track-c-must-pass.test.ts",
      "apps/worker/src/track-c-quality-judge.test.ts",
      "apps/worker/src/track-c-offline-candidate.test.ts",
      "apps/worker/src/track-c-c3-sales-quality-candidate.ts",
      "apps/worker/src/track-c-c3-sales-quality-candidate.test.ts",
      "apps/worker/src/track-c-quality-suite-gate.ts",
      "apps/worker/src/track-c-quality-suite-gate.test.ts",
    ],
  ];

  for (const changedFiles of cases) {
    const result = selectCiScope(changedFiles);
    assert.equal(
      result.mode,
      "track-c",
      `Expected track-c for ${JSON.stringify(changedFiles)}, got ${result.mode} (${result.reason})`
    );
  }
});

test("selectCiScope: worker non-Track-C files escalate to affected mode", () => {
  const result = selectCiScope(["apps/worker/src/index.ts"]);
  assert.equal(result.mode, "affected");
  assert.match(result.reason, /package|worker/i);
});

test("selectCiScope: package change selects affected mode", () => {
  const cases = [
    ["packages/contracts/src/index.ts"],
    ["packages/database/src/schema.ts"],
    ["apps/admin-api/src/server.ts"],
    ["packages/commerce-kernel/src/kernel.ts"],
  ];

  for (const changedFiles of cases) {
    const result = selectCiScope(changedFiles);
    assert.equal(
      result.mode,
      "affected",
      `Expected affected for ${JSON.stringify(changedFiles)}, got ${result.mode}`
    );
  }
});

test("selectCiScope: root package.json triggers full mode", () => {
  const result = selectCiScope(["package.json"]);
  assert.equal(result.mode, "full");
});

test("selectCiScope: lockfile triggers full mode", () => {
  const result = selectCiScope(["pnpm-lock.yaml"]);
  assert.equal(result.mode, "full");
});

test("selectCiScope: workflow file changes trigger full mode", () => {
  const cases = [
    [".github/workflows/ci.yml"],
    [".github/workflows/deploy.yml"],
    [".github/actions/setup/action.yml"],
  ];

  for (const changedFiles of cases) {
    const result = selectCiScope(changedFiles);
    assert.equal(result.mode, "full");
  }
});

test("selectCiScope: selector script self modification triggers full mode", () => {
  const cases = [
    ["scripts/ci/ci-scope.mjs"],
    ["scripts/ci/ci-scope.test.mjs"],
  ];

  for (const changedFiles of cases) {
    const result = selectCiScope(changedFiles);
    assert.equal(result.mode, "full");
  }
});

test("selectCiScope: unknown / global config files trigger full mode", () => {
  const cases = [
    ["pnpm-workspace.yaml"],
    ["tsconfig.json"],
    ["deploy/track-b-0037-preprod-operator.sh"],
    ["deploy/runtime-state/example.json"],
    ["some-unknown-file.txt"],
  ];

  for (const changedFiles of cases) {
    const result = selectCiScope(changedFiles);
    assert.equal(result.mode, "full");
  }
});

test("selectCiScope: mixed Track C and non-Track-C worker files must NOT select track-c", () => {
  const result = selectCiScope([
    "apps/worker/src/track-c-replay.ts",
    "apps/worker/src/index.ts",
  ]);
  assert.notEqual(result.mode, "track-c");
  assert.equal(result.mode, "affected");
});

test("selectCiScope: mixed Track C and root config must trigger full mode", () => {
  const result = selectCiScope([
    "apps/worker/src/track-c-replay.ts",
    "package.json",
  ]);
  assert.equal(result.mode, "full");
});

test("selectCiScope: Track C non-offline runner escalates to affected mode", () => {
  const result = selectCiScope(["apps/worker/src/track-c-offline-runner.ts"]);
  assert.equal(result.mode, "affected");
});

test("selectCiScope: empty or invalid file lists fallback to full mode", () => {
  assert.equal(selectCiScope([]).mode, "full");
  assert.equal(selectCiScope(null).mode, "full");
  assert.equal(selectCiScope(undefined).mode, "full");
});

test("selectCiScope: handles Windows backslashes and leading relative paths", () => {
  const trackCWindows = selectCiScope(["apps\\worker\\src\\track-c-replay.ts"]);
  assert.equal(trackCWindows.mode, "track-c");

  const affectedRelative = selectCiScope(["./packages/contracts/src/index.ts"]);
  assert.equal(affectedRelative.mode, "affected");
});

test("CLI execution: non-PR events emit full regression mode", () => {
  const nonPrEvents = ["merge_group", "schedule", "push", "workflow_dispatch"];
  for (const eventName of nonPrEvents) {
    const stdout = execFileSync(
      process.execPath,
      ["scripts/ci/ci-scope.mjs"],
      {
        env: { ...process.env, EVENT_NAME: eventName },
        encoding: "utf-8",
      }
    );
    assert.match(stdout, /mode: full/);
    assert.match(stdout, new RegExp(`event ${eventName} requires full regression`));
  }
});

test("CLI execution: explicit files via --files flag selects track-c mode", () => {
  const stdout = execFileSync(
    process.execPath,
    [
      "scripts/ci/ci-scope.mjs",
      "--files",
      "apps/worker/src/track-c-quality-suite-gate.ts",
    ],
    {
      encoding: "utf-8",
    }
  );
  assert.match(stdout, /mode: track-c/);
});
