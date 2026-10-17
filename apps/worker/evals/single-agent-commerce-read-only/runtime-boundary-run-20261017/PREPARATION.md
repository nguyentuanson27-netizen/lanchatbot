# Implementation, observed failures and pre-provider checks

Intake `042cad7cd2a2622cbf802c6b221587ab3535ec4f`; refreshed main / implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. [Plan](PLAN.md), [registered scope](SCOPE.md). Implementation savepoint `fdf99f95ea0a70637797c0cdad3c49ecbcdae90b`; compatibility correction `964c5270137cf12ac3faf38bf9a5c557f5e2c7cd`.

## Changes and RED → GREEN

- The independent reviewer authored four stale-diagnostic reproduction cases before implementation: **48 PASS / 4 FAIL**, then **52 PASS**. Terminal diagnostics distinguish hard precheck evidence rejection, changed current snapshot/revision and response-binding replay. Only code-owned branch names, sanitized reason-code prefixes, snapshot hashes, revision and time are retained; no draft, recipient, claim ID or source text/version. Existing decisions and valid PASS text stay unchanged.
- A later recovery-propagation reproduction observed **19 PASS / 1 FAIL**, then **20 PASS**. The existing recovery metadata keeps originalDiagnostic when a code-owned recovery replaces the terminal; recovery authority/receipt checks and text remain unchanged.
- ETA resolver reproduction observed **7 PASS / 1 FAIL**, then **8 PASS**. The same ETA_UNAVAILABLE outcome now identifies CART_ETA_REGION_UNRESOLVED when no source region key matches. Existing explicit region keys and source DEFAULT still work. No authoritative province/address mapping was found in the inspected code/source path; no map/default/ETA or source publication was invented. This is diagnosis, not a completed mapping fix.
- Adapter reproduction observed **27 PASS / 1 FAIL**, then **28 PASS**. Only complete public fact arrays whose type/scope/value all equal current trusted facts are reused. Different values/scopes and status/version fields remain; no cart fields or native parts are discarded. Existing request-bound test was strengthened and observed **27 PASS / 1 FAIL** for missing rejected-request byte evidence, then GREEN. Oversized requests retain measured requestBytes with zero auth/generation/retry; the bound remains 32,768 bytes.

## Full-check regression and compatibility correction

The first full Node eval observed **487 PASS / 4 FAIL / 2 existing optional SKIP** (493 tests). Four historical A evidence checks rejected the added diagnostic because their exact terminal JSON no longer matched frozen outcomes (FINAL_GATE_EVIDENCE). Historical corpus, output and evaluator checks were not edited or weakened.

A focused legacy-shape reproduction observed **52 PASS / 1 FAIL**. Diagnostic is now opt-in at the existing finalGate API; only the Phase B caller enables it. Default terminal shape remains byte-compatible with the old contract. Focused boundary/runner **73 PASS**; the three owning historical eval files **21 PASS**; full Node eval **491 PASS / 0 FAIL / 2 existing optional SKIP**. The correction changes metadata availability, not authorization or safety disposition.

## Final checks actually run

| Check | Actual result |
| --- | --- |
| Full worker source suite | 130 files / 1,806 PASS |
| Focused provider / B protocol / owner-comparison | 49 PASS |
| Existing protected-claims / reply assembler | 21 PASS |
| Historical evidence-focused Node checks | 21 PASS |
| Full Node eval after compatibility correction | 491 PASS / 0 FAIL / 2 existing optional SKIP |
| Worker build / typecheck / lint | Each exit 0 after the source correction |
| Controlled PostgreSQL COD | 24/24 PASS, 0 provider generations, source964c5270/sourceDirty=false, testDatabaseDropped=true |

```text
git fetch origin main
pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts
pnpm --filter @lana/worker exec vitest run src/realtime-sales-catalog.test.ts
pnpm --filter @lana/worker exec vitest run src/realtime-sales-catalog.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-effects.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-read-only.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
pnpm --filter @lana/worker exec vitest run src
node --test apps/worker/evals/single-agent-semantic-verifier/a3-full-followup-20261014.test.mjs apps/worker/evals/single-agent-semantic-verifier/complete-a2-round63.test.mjs apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker build
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker lint
node C:/Users/nguye/AppData/Local/Temp/c3-runtime-boundary-offline-20261017.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-runtime-boundary-cod-20261017 COD
git diff --check
```

Full worker used `C:/Users/nguye/AppData/Local/Temp/c3-runtime-boundary-worker-wrapper-20261017.ps1`, the existing bounded Windows-junction workaround. It verifies workspace paths and tracked placeholder bytes, then restores the original placeholder after the test. Logs use the runtime-boundary prefix in TEMP; earlier failed and final runs are separate. Bank integration, full-repo pnpm check and remote CI were not run or claimed PASS.

## Payload evidence and limits

[Offline evidence](OFFLINE_COMPATIBILITY.json): 60 captured owner bodies reconstituted under both intake and current serializers. All current trusted views, original native model parts/signatures and other serialized fields remain equal after restoring only proven repeated fact arrays. **66 fact arrays / 20,072 bytes total** reused across the bodies; max current body **31,352/32,768 bytes**. This removes redundant values, not product prose or facts from the trusted view.

The controlled signature variation is still **35,905/32,768 bytes** under current instructions/declarations. Its signature length was observed in a later generation, but it is not the exact uncaptured failed wire. There is no repeated fact array to remove from that cart-only continuation. Do not call the payload limit resolved or enlarge the bound, trim signatures, shorten tool guidance, change model/effort or retry to obtain PASS. The authorized N1 replay retains this known fail-closed risk and its complete invocation/request accounting.

The initial offline helper incorrectly compared a round-tripped tool projection directly with captured JSON, where old null/empty fields had already been omitted. Comparing both serializers on the same reconstituted input resolved that tooling assumption. The helper also needed wire normalization before canonical comparison because internal undefined properties are omitted by JSON serialization. Neither correction changed runtime code, captured evidence or model requests; all offline checks used zero provider generations.

The first freeze helper used the key `composed` while the retained hash record names the same declarations `stateful`, so the equality assertion rejected it before writing FROZEN_INPUTS. The preparation docs were saved separately; the helper key was corrected and freeze rerun successfully before preflight/provider collection. No native declaration changed or provider request occurred during this tooling correction.

Official Google [function-calling](https://ai.google.dev/gemini-api/docs/function-calling) and [thought-signature](https://ai.google.dev/gemini-api/docs/thought-signatures) documentation checked 2026-10-17 before the serializer correction. No new provider API feature or model configuration was adopted.

## Self-review

Keep owner/verifier prompt hashes, native declarations, models/config, corpus, fallback, budgets, cart mutation/recovery semantics and all historical evidence. No new semantic role/layer, parser/router/regex/template, repair/reverify/generation retry, durable store, gate, framework or production wiring. Source checkout mapping and long-signature headroom remain explicitly unresolved; style/context treatment is deferred. Optional diagnostic output preserves the historical A contract. Provider results remain NOT_RUN at this preparation savepoint.

Source/credential access uses the already approved [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md) and existing source-session/credential launcher. Secrets are not printed or committed; source PG connections are read-only, and only the harness-owned disposable DB may be written/dropped. No live deployment, source/index/policy publication, POS mutation or customer delivery is authorized.
