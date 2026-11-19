# Execution / verification record

Run source36e45015c381ebe91a2591a288b112e3dd8caa0e, not the later documentation commit. All commands from repository root. No model command was repeated while preparing this report. No result below establishes rollout or matched C3 acceptance.

## Code checks actually executed

| Command | Result |
|---|---|
| `node --test apps/worker/evals/single-agent-commerce-qualification/*.test.mjs` | 62 PASS |
| `pnpm --filter @lana/worker test:evals` | 738 PASS,0FAIL,2existingSKIP /740total |
| `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit` | exit0; `c3-phase-c-worker-typecheck-36e45015.log` outside repo |
| `pnpm --filter @lana/worker build` | exit0; `c3-phase-c-worker-build-36e45015.log` outside repo |
| `pnpm --filter @lana/worker lint` | exit0 |
| `git diff --check` | exit0 before run; repeated for documentation delivery |

Raw-verdict JSON string and terminal-output capture regression tests: observed RED7pass/3fail → GREEN10. Broad earlier source had one transient local Round62 stub failure; retained in collector review. Latest source repeat has0fail. No shared production package edits in final collector fix.

## Actual campaign entrypoints and inputs

These are the executed program invocations and their input/output identities; process credential launcher / process-scoped APPDATA wrapper details are omitted, with no credential content retained. Native source-session runner report separately preserves its exact subprocess command. This list does not claim a complete byte-for-byte transcript of every PowerShell orchestration wrapper.

```powershell
node apps/worker/evals/single-agent-commerce-qualification/collect-safety.mjs ../c3-phase-c-sealed-20261029-03/REGISTRATION.json ../c3-phase-c-world-resolved-20261029-07.json ../c3-phase-c-safety-20261029-03
```

Result24/24,24requests, PASS. Aggregate native boundary prerequisite also PASS, preserved as `../c3-phase-c-safety-20261029-03/FORMAL_BOUNDARY_GATE.json`. Existing Codex0.159.2 selected with temporary process APPDATA; global client unchanged. No generation retry.

Native runner: existing `isolated-integration.mjs` with `--phase-c-registration` registration03, `--phase-c-world` world07, `--phase-c-seed` the private seed file and `--phase-c-safety` safety03. Output `../c3-phase-c-native-20261029-03`, exit0;22scenarios/34turns; status `COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW`,69actualrequests. This describes the recorded invocation rather than inventing an exact shell wrapper. `integration.json` attests clean source, sendEnabledfalse and DB cleanup.

Real adapter driver subprocess recorded in `../c3-phase-c-real-adapter-20261029-03/COMMAND.json`:

```powershell
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-phase-c-real-adapter-20261029-03/postgres COD
```

Recorded paths are absolute equivalents of these relative paths. Exit0;66checks/7invariantsPASS,0generationrequests. Source writes/live sends0; disposable DB dropped.

Actual source-exact offline steps: merge SAFETY+native with22missingC3→NOT_RUN; attach actual REAL_ADAPTER; assess pre-grade→BLOCKED `CODE_OWNED_CAPTURE_EVIDENCE_REQUIRED`; create public absolute packet; fresh independent judge; import22grades (8UNRESOLVED); assess final→BLOCKED `UNRESOLVED_INDEPENDENT_JUDGEMENT`. Each offline step creates0providerrequests. Outputs are indexed in LOCAL_RAW_INDEX.json. Grade import preserves primary grades and rejects implicit adjudication.

```powershell
node apps/worker/evals/single-agent-commerce-qualification/cli.mjs assess --registration ../c3-phase-c-sealed-20261029-03/REGISTRATION.json --evidence ../c3-phase-c-evidence-graded-20261029-03.json --out ../c3-phase-c-assessment-final-20261029-03
```

Assessment already ran on exact36e45015. Do not rerun source-exact assessment from a later report commit and claim it executes the old source. No C3 comparative or live run was attempted. Evidence retention/indexing and report checks after run are documentation analysis, not additional model generations.
