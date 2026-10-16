# Reviewed Phase B root-cause correction — 2026-10-16

Owner requests implementation of the reviewed [plan](../../../../../tasks/plan.md#current-root-cause-fix-after-independent-review--2026-10-16). Start `7fe9643b747462a1c29a61308e365541be21bd19` on existing PR391. Refreshed main / implementationBaseSha remains `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.

Status: IMPLEMENTED / CODE_VERIFICATION_PASS. Final executable source: `777616ddf32b3b824d50fb753828c370c275adc2`. Current real-source checkout prerequisite remains BLOCKED; sales/live acceptance remains STOP. New provider generations: 0. Historical raw/primary/verdicts remain unchanged. No production wiring, live source/customer writes, merge, deploy or send. Existing one-owner/one-verifier, exact draft/current snapshot, permission/privacy, CAS/fencing, receipts and no retry remain required.

| Slice | Status |
| --- | --- |
| F1 bounded failure/recovery/checkout diagnostics | IMPLEMENTED; focused GREEN |
| F2 outbound payload/readiness producer and consumers | IMPLEMENTED; focused/full GREEN; composed recovery regression corrected below |
| F3 exact serialized provider request bound | IMPLEMENTED; focused GREEN |
| F4 typed tools and native final-only contract | IMPLEMENTED; offline focused GREEN; live behavior NOT_RUN |
| F5 named alias lookup | IMPLEMENTED; full-name alias focused GREEN; partial-name coverage remains limited |
| F6 private-checkout prerequisite correction | Failure reason corrected; current real-source checkout BLOCKED by missing ETA |
| F7 sales task/context and code-owned receipt ACK | IMPLEMENTED; focused GREEN; sales quality remains unmeasured |
| Focused/full verification and self-review | PASS; exact results and skipped coverage below |

## Commands actually run

- `git fetch origin main`: exit0; `git rev-parse origin/main`: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- F1 RED: `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs`:17PASS/1FAIL (missing bounded failure stage). `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-session.test.ts`:18PASS/2FAIL (lost recovery reason and private-checkout authority reason).
- F1 GREEN: same Node command18PASS. `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-effects.test.ts`:54PASS. Later private planner/commit edge coverage: `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-session.test.ts`:9PASS.

F1 retains allowlisted provider stage/failure/finish codes without copying arbitrary exception text; one failed generation still makes at most one provider request. Recovery reports its original disposition/reason separately from actual terminal. Private checkout distinguishes authority, absent plan/readiness reasons and transaction reasonCodes/status; ingress carries that diagnostic outside model context. Historical causes remain unknown until measured on a new attempt; these tests do not reconstruct a missing old response.

F2 RED: contracts focused59tests/2FAIL; business readiness33tests/1FAIL; ingress9tests/5FAIL; full database-runtime40tests/1FAIL. Commands were `pnpm --filter @lana/contracts exec vitest run src/v2/canonical-evidence-readiness.test.ts`, `pnpm --filter @lana/business-tools exec vitest run src/effect-readiness.test.ts`, `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts`, `pnpm --filter @lana/database exec vitest run src/realtime-runtime.test.ts`. An initial database `-t 'outbound'` selected0tests/40SKIP and is not verification.

F2 GREEN: contracts focused59PASS. Rebuild `pnpm --filter @lana/contracts build`, `pnpm --filter @lana/business-tools build`, `pnpm --filter @lana/database build` exit0 before consumers (first consumer rerun encountered stale dependency dist, not claimed PASS). Then business readiness/protected/reply54PASS; ingress/effects/session48PASS; database runtime40PASS with the same commands, adding `src/protected-claims.test.ts src/reply-assembler.test.ts` to business and `src/single-agent-commerce-effects.test.ts src/single-agent-commerce-session.test.ts` to worker.

F2 uses actual claim subjects rather than all search candidates. PROTECTED_OUTBOUND coverage follows the individual typed claims and still requires each declared type and each bound product to have actual coverage; cart effects retain their full per-line requirements. No schema fields, proof modes or gates were added. Productless payloads require empty actual claims/types, no cart and an exact payload hash; transaction source/hash/type/freshness checks remain. Static fallback/receipt ACK do not rebuild CART_READY; an existing-cart terminal instead reuses the unchanged sales readback lock/CAS so it cannot acknowledge a changed cart. Generated cart replies retain current source/parent readiness. Existing database missing-product, conflict, stale/payload/revision and cart-mutation rejection tests remain green.

F3: initial reproduction fixture omitted the product read and did not reach the intended size; corrected fixture materializes its source content first. Observed RED: `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts`:13PASS/1FAIL, third generation blocked before the transport. Minimum fix removes only the internal-representation guard; transport owns the actual serialized bound. Same command GREEN14PASS, including internal body>32768 with all projected requests<=32768 and mandatory verifier. Existing hard-precheck trusted-context/input/history/tool-result bounds remain.

`node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs`:19PASS, including exact32767/32768 wire bytes and32769 rejection before auth/generation (0dispatch), duplicate-source preservation and native signatures/call identity. This is offline evidence, not a claim the historical oversized request would fit or that real provider behavior improved.

F4 checked current official [Vertex function-calling modes](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling), [FunctionDeclaration JSON schema](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/Shared.Types/FunctionDeclaration), and [native signatures/call IDs](https://ai.google.dev/gemini-api/docs/generate-content/thought-signatures) before the adapter change. NONE prohibits new calls and is documented as equivalent to no function declarations; current signatures and function responses must remain intact. No preview mode, model/effort/generation-budget change or retry was introduced.

F4 RED: Node adapter22tests/3FAIL for callable product identity, confusing output-only field and actual final-only wire. Minimum GREEN: per-request declaration enums use bound PRODUCT refs (cart changes use CART_LINE); noncallable subjects expose evidenceRef; projection omits redundant requestedOfferType while retaining the actual offerType/facts/native calls. Field description requires the existing full measurement path. add_to_cart documents its existing code-owned resolution so a redundant read is not a permission prerequisite. Final-only sends NONE/tools[] and records exact serialized request hash/bytes/mode/count plus an unexpected-tool-call flag; it still returns the observed call to the runtime budget gate without executing/retrying it.

`node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs`:43PASS. `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts`:82PASS, including invalid state/ref rejection, accepted dependencies, effects and no extra rounds. Fake HTTP proves emitted bytes/accounting, not that the real provider will obey NONE. Historical API/client attribution remains UNKNOWN; a fresh registered run can compare actual dispatched request hashes without logging private data.

F5 `pnpm --filter @lana/business-tools exec vitest run src/business-tools.test.ts src/qdrant.test.ts`: observed RED30PASS/3FAIL, then intermediate32PASS/1FAIL exposed a pre-existing broad keyword alias (`đầm đi tiệc`). Minimum correction reuses findByAlias for non-code queries but accepts that identity only when the full normalized source title matches; keyword aliases still take semantic search and collisions stay ambiguous. Final33PASS. Exact-code priority is unchanged; no new lookup/index/parser or source write. Non-code misses now incur the existing bounded alias read before embedding; actual latency is unmeasured.

Captured public source-readback has SV1561 aliases `SET VÁY KHÁNH TRANG`/`SV1561`; bare `Khánh Trang` is not an exact alias. Full-name query can now reuse the alias path, but partial names remain semantic queries and the Qdrant compatibility scan remains bounded256points. This does not prove current full-catalog alias coverage or fix the historical partial-name result. Retain the supplied full name in owner search instructions rather than adding substring/regex matching or hardcoded names.

F6 used the existing source-session/Ops credential route with read-only source PostgreSQL and no generation client. Command: `python apps/worker/evals/single-agent-commerce-read-only/source-session.py node C:/Users/nguye/AppData/Local/Temp/c3-b-checkout-2664b772200142038dbe7e16d7b0b4c9.mjs apps/worker/evals/single-agent-commerce-read-only/reviewed-fix-20261016/checkout-source-readback.json`: exit0, [public readback](checkout-source-readback.json). At2026-10-16T02:23:17.163Z, SV2447/AO/BE/L×2 is READY/499000/PRE_ORDER without a delivery region; the same selection for synthetic TP.HCM checkout returns ETA_UNAVAILABLE/CART_ETA_UNAVAILABLE. Policy shop identity matches canonical LANA_DESIGN. This later mutable-source read diagnoses a current prerequisite; it does not reconstruct the old missing planner reason. HEADa3943433 production code was built; the only uncommitted source difference then was the typed test import fix.

F6 RED: `pnpm --filter @lana/worker exec vitest run src/realtime-sales-cycle.test.ts -t 'preserves the missing source prerequisite'`:2FAIL/62not-selected; missing ETA was misreported as ORDER_PREVIEW_CART_SNAPSHOT_CHANGED or CLAIM_MISSING. Minimum fix propagates an unavailable typed selection reason before preview/confirmation compare or readiness; no condition is waived, no ETA invented, no PII/events committed. GREEN: `pnpm --filter @lana/worker exec vitest run src/realtime-sales-cycle.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-session.test.ts`:87PASS including old r31.3/effect/checkout controls. Composed missing-region test now also requires the original private planner reason; actual PostgreSQL runs follow final build.

Compilation: first `pnpm --filter @lana/worker build` exited1 on the new test's undeclared static .mjs import; typed URL import fixes it. Later direct `pnpm --filter @lana/worker exec tsc -p tsconfig.json` initially found redundant union comparisons in F6; removed those comparisons, same command exit0. Final canonical worker build result is recorded below; neither earlier failure is claimed PASS.

Current-source checkout completion remains BLOCKED until the authoritative fulfillment/ETA source covers this selection/region. Publishing that data is outside this code fix. Controlled COD/bank tests cannot substitute for it; handoff is not a completed checkout.

F7 observed ACK RED29PASS/2FAIL → GREEN31PASS with `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts`. The existing bounded recovery text now distinguishes CART_OPENED from CART_MUTATED; purchase acknowledgement is unchanged. It still requires current receipt/revision/recipient/permission/privacy and never rewrites or retries a rejected model draft. No product/size/price claim or case template was added to code text.

Owner prompt replaces the buying/source-tool paragraphs: act on a known customer-selected configuration through existing add-to-cart resolution, use the already bound correct product instead of searching its name again, retain a supplied full name for lookup, and distinguish callable product/line refs from evidence refs. Other sales/voice/policy/size boundaries remain; verifier was not changed to resolve a disputed N1 policy verdict. Owner9982→10078bytes (+96/+0.96%); active ownerSHA25622c97bd28703d2b3079cc06f8dbb6a4e7f1d38cc66e795175d94fedc4cc239be. Base manifest changes only this hash; verifierSHA256e8ba5ab607518cda125600c59d3130c9b17d5fbf3e62da485945cd2ae1ec449d and models/config/corpora/schema/fallback stay unchanged. Historical registrations/results are untouched and cannot qualify this source.

After active hash update, focused Node protocol/adapter/comparison command43PASS. No prompt-string/rubric-fit tests or model generations; naturalness and actual sales action completion require a later run.

Self-review caught an existing measurement mismatch: adapter PROVIDER_TIMEOUT was recorded by the runner as PROVIDER_ERROR. Added owner/verifier regressions: observed RED14PASS/2FAIL → minimum GREEN16PASS using `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts`. Runner now recognizes both its own TIMEOUT and the adapter's PROVIDER_TIMEOUT; fail-closed/no-retry behavior is unchanged. Final full verification follows this correction.

## Final verification and composed recovery correction

At source `7fb0732a41d902ca34c058eaf0e0130442324f6e`, canonical `pnpm --filter @lana/worker test` exited0:130src files/1776PASS; Node evals485PASS/2optionalSKIP/0FAIL. The two skipped installed-Codex local-stub diagnostics are not provider coverage. Windows tracks `evals/track-c-c3-v5/v4` as a symlink placeholder; the command used a temporary junction to its verified in-repo target, removed only that junction, and restored the original file byte-exact in finally. An earlier run's final tool output was not retained; only this captured exit/count is qualified. Worker `typecheck`, `build`, `lint` all exit0. Shared canonical `test`, `typecheck`, `build` all exit0: contracts222PASS; business-tools356PASS; database246PASS/30optional PostgreSQL tests SKIP. Additional direct contracts `exec tsc -p tsconfig.json --noEmit` exit0. These counts precede the correction below, not final-source verification.

Real PostgreSQL command at that clean source: `python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-reviewed-fix-cod-7fb0732a-20261016 COD --composed-only`: exit1. [Exact failed control](postgres-cod-before-recovery-fix.json) retains10PASS/1FAIL/one later group not reached, providerGenerations0 and testDatabaseDropped=true. Changed source SKU after verification correctly invalidated the generated reply, but receipt recovery still exposed its old receipt and egress accepted the bounded ACK. Removing CART_READY from static recovery had uncovered this existing receipt/context assumption; unit tests alone had not proved this negative control. BANK_TRANSFER was not run on that failing source.

Added current-SKU contradiction and unknown→known-contradiction regressions, plus unavailable-source positive control. `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts`: observed32PASS/1FAIL, then32PASS/2FAIL after the late-egress regression. Minimum fix reuses the already computed matching selection set when exposing a current receipt; recovery consumes that same context receipt, and the existing snapshot gate detects later invalidation. Missing source does not create a contradiction or require fresh CART_READY. No extra source call, schema, durable field, gate or retry. Focused GREEN: `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-persistence.test.ts`:63PASS; `pnpm --filter @lana/worker exec tsc -p tsconfig.json`:exit0. Final full worker/compiler checks and COD/bank controls must follow this correction.

A source fix or fake-HTTP assertion is not a fresh provider result. Checkpoint A remains OWNER_BYPASS and sales/live acceptance remains STOP.

## Final-source results

At clean executable source `777616ddf32b3b824d50fb753828c370c275adc2`:

| Actual command | Result |
| --- | --- |
| `pnpm --filter @lana/worker exec vitest run src` | exit0;130files/1779PASS; same temporary Windows junction/restoration described above |
| `pnpm --filter @lana/worker test:evals` | exit0;485PASS/2optional local-stub diagnostics SKIP/0FAIL |
| `pnpm --filter @lana/worker typecheck` | exit0, including dependency prebuild |
| `pnpm --filter @lana/worker build` | exit0, including dependency prebuild |
| `pnpm --filter @lana/worker lint` | exit0 |
| Exact eight-file focused worker command in tasks/plan.md | exit0;123PASS |
| Exact Node adapter/protocol command in tasks/plan.md | exit0;31PASS; captured requests exclude evaluator labels |
| Exact protected-claims/reply-assembler command in tasks/plan.md | exit0;21PASS |

The eight-file command was `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-handoff.test.ts`. Node: `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs`. Protected/reply: `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts`.

Canonical shared-package commands below all exited0 at7fb0732a; shared-package source is unchanged at777616dd. Contract222PASS, business356PASS, database246PASS/30optional PostgreSQL SKIP. The30skipped tests were not replaced by, or counted as, the separate composed controls.

```text
pnpm --filter @lana/contracts test
pnpm --filter @lana/contracts typecheck
pnpm --filter @lana/contracts build
pnpm --filter @lana/business-tools test
pnpm --filter @lana/business-tools typecheck
pnpm --filter @lana/business-tools build
pnpm --filter @lana/database test
pnpm --filter @lana/database typecheck
pnpm --filter @lana/database build
```

Real PostgreSQL composed commands, both exit0/12of12PASS, sourceDirty=false, providerGenerations=0, testDatabaseDropped=true:

```text
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-reviewed-fix-cod-777616dd-20261016 COD --composed-only
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-reviewed-fix-bank-777616dd-20261016 BANK_TRANSFER --composed-only
```

Exact-byte reports: [COD](postgres-cod.json), [BANK_TRANSFER](postgres-bank-transfer.json). They use synthetic product/private-checkout inputs, current captured PUBLISHED policy, real isolated PostgreSQL transactions and capture delivery. No provider generation or external customer send. They prove the candidate composition under those inputs, not completion of the missing-ETA real-source checkout. The earlier failing control is preserved, with cleanup, rather than overwritten. Access used the existing [Lana Chatbot Ops](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md) credential route; source PostgreSQL read-only, test database admin scoped by the existing disposable harness, secrets in memory only.

Self-review verified that the recovery correction also changes the snapshot if a missing source later becomes a known contradictory selection before egress. Existing freshness/authority/recipient/privacy/source/CAS/receipt and HUMAN controls remain green. No unit or composed expectation was relaxed. Full src/evals were rerun after the worker-only correction; no further code change followed these results. `git diff --check` passes. Full repository `pnpm check`, the30optional PostgreSQL tests and remote CI are not claimed PASS.

Structural delta since7fe9643b:9runtime/adapter source files,+120/-46lines(net+74), plus tests/evidence/docs. Owner prompt+96bytes(+0.96%); verifier unchanged. Existing receipt ACK variants2→3 to distinguish cart open/change/confirmed purchase; no new fallback IDs, case templates or regex. Added semantic roles0, verification layers/gates0, schemas/contract fields0, durable stores0, migrations0, production entrypoints0. Rollback is a candidate source revert; these controls made no serving schema/data change.

Spec Git blobs at final executable source: architecture `7e0265e3b6b3d556d8fb0f3c7267abccef5de86a`; semantic-boundary amendment `4a09b55d2f3a972a65697738876cc5eab21e7a2b`. Active schemaSHA256 `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`. Approved manifest models/generation settings remain Vertex/global `gemini-3.5-flash-lite` High owner and Codex-login `gpt-6.1-sol` High verifier; unchanged generation config/corpora, no substitution. No new provider registration/result is inferred from these compiler, fake-HTTP or composed tests.

Remaining: actual provider adherence to NONE/tools[], tool choice/round usage, new sales quality/naturalness/usability and operational latency are NOT_RUN; partial-name alias coverage remains limited; current-source SV2447/AO/BE/L×2 checkout for TP.HCM remains CART_ETA_UNAVAILABLE. Historical unrecorded seventh terminal remains UNKNOWN. The next approved run population stays24B1/N1 +7stateful/N1, max120generation requests, without extra retries/cases. This task performs the fix and verification; no new model batch, A/C qualification, source publication, live activation, merge or deploy. Recommendation: **STOP sales/live acceptance; code fix ready for the next requested evaluation**.
