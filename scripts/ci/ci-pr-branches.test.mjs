import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");

function branches(event) {
  const block = workflow.match(new RegExp(`^  ${event}:\\n([\\s\\S]*?)(?=^  \\S|^\\S)`, "m"));
  assert.ok(block, `missing ${event} trigger`);
  return [...block[1].matchAll(/^      - (.+)$/gm)].map((match) => match[1]);
}

test("integration PRs receive canonical CI without widening push triggers", () => {
  assert.deepEqual(branches("pull_request"), ["main", "codex/c3-runtime-canonical-integration"]);
  assert.deepEqual(branches("push"), ["main"]);
});
