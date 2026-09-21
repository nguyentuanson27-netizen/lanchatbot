import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const TRACK_C_OFFLINE_SAFE_FILES = new Set([
  "apps/worker/src/track-c-replay.ts",
  "apps/worker/src/track-c-replay.test.ts",
  "apps/worker/src/track-c-must-pass.ts",
  "apps/worker/src/track-c-must-pass.test.ts",
  "apps/worker/src/track-c-quality-judge.ts",
  "apps/worker/src/track-c-quality-judge.test.ts",
  "apps/worker/src/track-c-offline-candidate.ts",
  "apps/worker/src/track-c-offline-candidate.test.ts",
  "apps/worker/src/track-c-offline-candidate-validation.ts",
  "apps/worker/src/track-c-c3-sales-quality-candidate.ts",
  "apps/worker/src/track-c-c3-sales-quality-candidate.test.ts",
  "apps/worker/src/track-c-quality-suite-gate.ts",
  "apps/worker/src/track-c-quality-suite-gate.test.ts",
]);

// Files that only carry prose. They cannot change compiled behaviour, but they
// are not inert either: a few checks assert against repository documentation, so
// the docs lane still runs those. DOC_COUPLED_SUITES below names them, and
// scripts/ci/ci-workflow.test.mjs fails if a source file starts reading
// repository documentation without the lane being extended to cover it.
// Deliberately extension-scoped: anything else under docs/ or tasks/ (a script,
// a JSON fixture, an image) falls through to the conservative rules below.
export const DOC_ONLY_PATH_PATTERNS = [
  /^docs\/.*\.(?:md|txt)$/,
  /^tasks\/.*\.(?:md|txt)$/,
  /^[^/]+\.md$/,
];

// Every check that reads repository documentation, and therefore has to run even
// when a change touches nothing but prose.
export const DOC_COUPLED_SUITES = Object.freeze([
  // asserts against docs/current/architecture-program/contracts/MODEL_EVALUATION_BOUNDARY.md
  { packageName: "@lana/worker", testFile: "src/context-v2-evaluation.test.ts" },
  // repositoryListFiles/repositoryReadFile fixtures mirror README.md and docs/current layout
  { packageName: "@lana/mcp", testFile: "server.test.mjs" },
]);

export function isDocOnlyPath(filePath) {
  return DOC_ONLY_PATH_PATTERNS.some((pattern) => pattern.test(filePath));
}

export function normalizePath(filePath) {
  if (typeof filePath !== "string") return "";
  let normalized = filePath.trim().replace(/\\/g, "/");
  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }
  return normalized;
}

export function selectCiScope(changedFiles) {
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) {
    return {
      mode: "full",
      reason: "no changed files detected or scope indeterminate (conservative fallback)",
    };
  }

  const normalizedFiles = changedFiles
    .map(normalizePath)
    .filter((f) => f.length > 0);

  if (normalizedFiles.length === 0) {
    return {
      mode: "full",
      reason: "no valid changed files found after normalization",
    };
  }

  // 1. Documentation-only changes.
  // Checked before the global-impact fallback below, which would otherwise send
  // every docs/ and *.md change through a full regression. The lane still runs
  // the mandatory gates plus DOC_COUPLED_SUITES, so the checks that actually
  // read these files keep running.
  if (normalizedFiles.every(isDocOnlyPath)) {
    return {
      mode: "docs",
      reason: "all changed files are repository documentation; running mandatory gates and doc-coupled suites",
    };
  }

  // 2. Conservative fallback check for global/root/infra/config paths
  for (const file of normalizedFiles) {
    if (file.startsWith(".github/")) {
      return {
        mode: "full",
        reason: `workflow/action modification detected: ${file}`,
      };
    }
    if (file.startsWith("scripts/ci/")) {
      return {
        mode: "full",
        reason: `CI selector/automation modification detected: ${file}`,
      };
    }
    if (
      file === "package.json" ||
      file === "pnpm-lock.yaml" ||
      file === "pnpm-workspace.yaml" ||
      file === "tsconfig.json"
    ) {
      return {
        mode: "full",
        reason: `root dependency/workspace configuration changed: ${file}`,
      };
    }
    if (file.startsWith("deploy/")) {
      return {
        mode: "full",
        reason: `deployment/migration/operator file changed: ${file}`,
      };
    }
    // Any file not residing within apps/ or packages/ is considered global-impact
    if (!file.startsWith("apps/") && !file.startsWith("packages/")) {
      return {
        mode: "full",
        reason: `global-impact or non-package file changed: ${file}`,
      };
    }
  }

  // 3. Track C offline safe allowlist check
  // Selected ONLY when 100% of changed files are within the verified offline allowlist
  const isTrackCOfflineOnly = normalizedFiles.every((file) =>
    TRACK_C_OFFLINE_SAFE_FILES.has(file)
  );

  if (isTrackCOfflineOnly) {
    return {
      mode: "track-c",
      reason: "all changed files match the verified Track C offline safe allowlist",
    };
  }

  // 4. Affected package mode
  // Changes are isolated to apps/ or packages/ without global-impact files
  return {
    mode: "affected",
    reason: "changes isolated to workspace packages; running affected packages and dependents",
  };
}

export function getChangedFilesFromGit(baseRef, headRef = "HEAD") {
  let diffTarget = baseRef;
  try {
    const mergeBase = execFileSync("git", ["merge-base", baseRef, headRef], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    if (mergeBase) {
      diffTarget = mergeBase;
    }
  } catch {
    // If merge-base fails, fallback to direct diff against baseRef
    diffTarget = baseRef;
  }

  const rawOutput = execFileSync("git", ["diff", "--name-only", diffTarget, headRef], {
    encoding: "utf-8",
  });

  return rawOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function runCli() {
  const eventName =
    process.env.EVENT_NAME || process.env.GITHUB_EVENT_NAME || "";

  const args = process.argv.slice(2);
  let explicitFiles = null;
  let baseRef =
    process.env.BASE_SHA ||
    process.env.GITHUB_BASE_REF ||
    "origin/main";
  let headRef = "HEAD";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--base" && i + 1 < args.length) {
      baseRef = args[++i];
    } else if (args[i] === "--head" && i + 1 < args.length) {
      headRef = args[++i];
    } else if (args[i] === "--files" && i + 1 < args.length) {
      explicitFiles = args[++i]
        .split(/[,\s]+/)
        .map((f) => f.trim())
        .filter(Boolean);
    }
  }

  // Non-PR events (e.g. push to main, workflow_dispatch, merge_group, schedule) always run full regression
  if (eventName && eventName !== "pull_request" && !explicitFiles) {
    console.log(`Event "${eventName}" detected -> full regression mode`);
    emitOutput({
      mode: "full",
      reason: `event ${eventName} requires full regression`,
      baseRef: baseRef || "origin/main",
      changedFiles: [],
    });
    return;
  }

  let changedFiles = explicitFiles;
  let resolvedBase = baseRef;

  if (!changedFiles) {
    try {
      // Find merge-base if possible for accurate diff against base branch
      try {
        const mergeBase = execFileSync("git", ["merge-base", baseRef, headRef], {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "ignore"],
        }).trim();
        if (mergeBase) {
          resolvedBase = mergeBase;
        }
      } catch {
        resolvedBase = baseRef;
      }

      changedFiles = getChangedFilesFromGit(resolvedBase, headRef);
    } catch (err) {
      console.warn(`Warning: failed to compute git diff (${err.message}). Falling back to full.`);
      emitOutput({
        mode: "full",
        reason: `git diff failed: ${err.message}`,
        baseRef: resolvedBase,
        changedFiles: [],
      });
      return;
    }
  }

  const result = selectCiScope(changedFiles);
  emitOutput({
    mode: result.mode,
    reason: result.reason,
    baseRef: resolvedBase,
    changedFiles,
  });
}

function emitOutput({ mode, reason, baseRef, changedFiles }) {
  console.log(`CI Scope Result:`);
  console.log(`  mode: ${mode}`);
  console.log(`  reason: ${reason}`);
  console.log(`  baseRef: ${baseRef}`);
  console.log(`  changedFiles count: ${changedFiles ? changedFiles.length : 0}`);

  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    const lines = [
      `mode=${mode}`,
      `reason=${reason}`,
      `base_ref=${baseRef}`,
      `pnpm_filter=...[${baseRef}]`,
      `changed_count=${changedFiles ? changedFiles.length : 0}`,
    ].join("\n");
    appendFileSync(githubOutput, `${lines}\n`);
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] ? fileURLToPath(`file://${process.argv[1].replace(/\\/g, "/")}`) : "";

if (
  process.argv[1] &&
  (currentFilePath === invokedFilePath ||
    process.argv[1].endsWith("ci-scope.mjs"))
) {
  runCli();
}
