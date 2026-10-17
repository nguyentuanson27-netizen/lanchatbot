# Phase B selling-option correction — implementation evidence

Status: IMPLEMENTED / CODE_VERIFICATION_PASS; provider replay NOT_RUN. Intake `d09f2231d5032b8bed84494f34c50d64dbe844a3`; revised-plan savepoint `c8758b4f`; tested executable source `4ceaefa71acdf44a7fe3bda94cf10d503faa0ed6`. Refreshed main / implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Existing draft PR391. [Revised plan and independent-review corrections](PLAN.md).

## Problem and resulting behavior

A search followed by an unspecified-offer product read previously exposed prices only for the resolver's default offer. The owner could need another read to get the component price after exhausting its two tool rounds. The tool now makes that information available in the same read, without a higher budget or deciding the customer's selection in code.

- An omitted offerType exposes `sellingOptions` from one fetched snapshot. Each option retains its own price/stock/optional ETA, code-bound offer ref, availability and source version/timestamps. Top-level offerType/facts still describe the existing default; an explicit offerType remains targeted. Global resolver priority and cart/SKU selection are unchanged.
- Multiple options use existing offer refs, including when two offers share a source SKU; their prices cannot collapse into one scope. Size/color/region filters are retained with each option's claim IDs in the existing read literal. Final readback reconstructs the same grouped read against current source; changing a non-default price invalidates the old PASS.
- Existing 8-subject/32-claim bounds are checked before committing expanded read context; rejected expansion returns no partial list or partial context update. The existing runtime still owns 8KB for the whole tool batch, and the native serializer still owns 32KB for the dispatched body. No new budget, runtime layer or gate is created.
- Missing/stale POS gives null options; a confirmed empty mapping gives an empty list. A failed default option does not erase another usable option or independent product content. Native projection applies the existing public-reason allowlist to nested availability too. Tests capture the body at the mocked HTTP boundary, preserve option facts/native associations and exclude evaluator canaries; they do not dispatch a real provider request.

Both owner/verifier prompts are byte-exact at the rolled-back baseline. Owner SHA256 `74c8102ef88e970fca18e84f5d186406a4d21ac5d27bafc383c6476b85394b43`; verifier `e8ba5ab607518cda125600c59d3130c9b17d5fbf3e62da485945cd2ae1ec449d`. Model/config/schema/fallback/corpora and historical registrations/results remain unchanged. Only the native read_product declaration changes to explain the new output semantics; no provider API/client/generation configuration changes. Current read-only tool-schema SHA256 `23867cc18d8d7c1fb37d789960f4807b8129b20cd607551b09021292ed0b40f8`; composed schema `486f4134f7015c3281e335e425d62c62bd5a63dfd376fd277a866c917a3c859b`. Future runs must register these current declarations under a new clean source identity.

## Observed RED -> GREEN and actual commands

Node `v24.19.0`; pnpm `10.12.4`; Vitest `3.2.7`.

| Command actually run | Observed result |
| --- | --- |
| `git fetch origin main` then `git rev-parse origin/main` | refreshed main `296cdcfbf5759f5bf9cbb24acf3dc63005589361` |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts` before implementation | exit1; 25 existing PASS / 6 new FAIL: absent all-option summary, targeted summary, partial component preservation, option filter/ETA scopes, overflow rejection and known-empty versus unknown summary |
| `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs` before implementation | exit1; 25 PASS / 1 FAIL: nested arbitrary availability reason reached captured HTTP body |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts` after correction | 32 PASS, including the added cross-read 32-claim overflow/readback regression |
| `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs` | 47 PASS |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-handoff.test.ts` | 177 PASS |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` | 21 PASS |
| `pnpm --filter @lana/worker typecheck` | exit0, including dependency builds |
| `pnpm --filter @lana/worker build` | exit0, including dependency builds |
| `pnpm --filter @lana/worker lint` | exit0 |
| `pnpm --filter @lana/worker exec vitest run src` through the Windows compatibility wrapper below | 130 files / 1,789 PASS / 0 FAIL |
| `pnpm --filter @lana/worker test:evals` | 489 PASS / 2 existing optional SKIP / 0 FAIL |
| `git diff --check`; inline Node check of prompt hashes, changed executable diff against secret patterns and unchanged historical cases/registrations | exit0; baseline exact; zero matched secret patterns |
| Inline `node --input-type=module` captured-registry producer/consumer diagnosis described below | exit0 after the local input-shape correction; zero live reads/writes/generations |

RED output is retained locally in ignored `RED_WORKER.log` and `RED_ADAPTER.log` beside this report; the observed commands/counts/failure purposes above are the versioned evidence. During GREEN, two new nested matchers incorrectly demanded exact nested availability objects despite additional valid fields; changed them to partial-object matching. A subsequent integration negative initially expected FALLBACK, while the unchanged terminal map correctly returned HANDOFF/STALE after a changed price; corrected the test expectation, not the gate. These intermediate failures are not claimed PASS.

Full source verification used `pwsh -NoProfile -File C:/Users/nguye/AppData/Local/Temp/c3-offer-read-fix-worker-src-20261016.ps1`, a copy of the existing verified compatibility wrapper with only its output log path changed. It checks both absolute paths remain in the workspace, replaces the tracked `evals/track-c-c3-v5/v4` text placeholder with a temporary junction to `../track-c-c2/v2`, runs the exact command above, removes only that junction and restores the original bytes in finally. Git readback confirms the tracked fixture is unchanged. The source code was not changed after these checks. No full repository `pnpm check`, remote CI, shared full-suite, or new PostgreSQL COD/bank run is claimed; shared/state/checkout/handoff implementations are unchanged.

## Registry publication trace and concrete remaining source work

[SOURCE_TRACE.json](SOURCE_TRACE.json) binds the two historical captured inputs by SHA256: registry `ce0e148d6c59cbb66101c43a81eb2e00a2d957e9ff6c02ccff54922963e2d551`, index diagnosis `891bb745e800a1c7e31cbcdd5cac45e211c1f4b6c1f6058db87e03fd355eeeef`. Registry source_updated_at is `2026-09-28T04:31:05.725Z`; all 11 captured SV2447 point payloads lack attributes. These are captured observations, not a fresh assertion about the live index.

The existing route is already present:

1. `p23c-profiles.ts` builds registry-authority typed attributes and preserves source metadata through normalization.
2. `p23c-jobs.ts` includes those attributes in the payload for approved images.
3. `p23c-hash-v3.ts` plans publication; `p23c-publisher.ts` supports PAYLOAD_ONLY with setPayload when the existing plan permits it.
4. `business-tools/qdrant.ts` validates product_attributes into StableProductDocument; candidate sources/tools preserve them into runtime evidence.

The offline probe passes the captured registry row through buildRegistryMap -> buildXmlProfiles -> normalizeStructuredExtraction, using the existing groupXmlItems with an ID-only group solely to isolate registry attributes. It then checks the resulting content hash through stableProductDocumentFromQdrantPayload. No XML description/image source is reconstructed or published. The first local diagnostic supplied an incomplete group object and threw `group.images is not iterable` before writing output; using the existing group constructor corrected this diagnostic harness error.

The proposed attribute-only delta is explicit in SOURCE_TRACE: absent product_attributes -> registry-derived REN/TƠ materials/components, feminine/elegant styles, raised embroidery and breathability PRESENT, with content hash `7bbc843a11ce027d44eac87eb00e0658bfd786703e3a8fcba27a45dc677be13a`. Opacity, lining, stretch and wrinkle resistance remain null/UNKNOWN. This is not a complete publication payload or fresh source read, and it was not injected into model/evaluation context.

The next existing-publisher preparation needs current registry/XML/approved image rows plus exact target point IDs and existing payload/hash readback for SV2447. The captured summary does not contain those IDs/hashes or the full approved description override. Use the existing dry-run planner to obtain actual target diffs/actions. Do not assume PAYLOAD_ONLY: an embedding-text/image/pipeline change may require FULL_EMBED under the existing planner. The cause of the historical publication gap, current payload identity and actual selected action remain UNKNOWN. This task performs no source/index publication and adds no synchronization code.

## Self-review, complexity and limitations

Changed executable surface: two existing files, net +25 TypeScript lines and +2 adapter lines, plus focused regression tests. One local option-resolution helper and one reused availability projection helper; zero new semantic roles, modules, persistent stores, parsers, repair loops, retries or runtime gates. Earlier checks of the existing subject/claim bounds protect exactly the expansion introduced here. Explicit-offer behavior, policy, state, effects/receipts and production entrypoints are retained. Tests cover same-SKU distinct-offer scopes, unchanged and changed source readback, absent/stale/empty sources, partial results, filter/ETA mapping, cumulative bounds, batch overflow, exact final verification and evaluator-label exclusion.

The scripted-owner integration demonstrates search -> one read -> final within 3 owner generations / 2 tool rounds / 2 calls / 1 verifier. It does not establish that Gemini will follow that path, obey final-only NONE, make a useful fashion choice or write naturally. Sales quality, historical semantic failures and provider conformance remain unmeasured for this source. Do not attribute improvement or reuse old successful replies as new results.

Recommendation: stop at this implementation handoff, ready for a separately registered requested priority replay. Keep the revised plan's six-case N1 condition before the remaining 18 B1 + 7 stateful; separate all subsequent candidates and denominators. New provider generations/live source reads/source writes: 0. Sales/live acceptance STOP; real-source checkout BLOCKED by missing authoritative destination mapping; A OWNER_BYPASS. No merge, deploy, live send or Phase C.
