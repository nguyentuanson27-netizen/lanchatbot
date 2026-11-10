# C3 Phase B candidate

Active corpus update — 2026-10-19: `cases.b1.json` replaces the stage-light dialogue in `b1-changed-occasion` with a customer travelling by car before a wedding and concerned about wrinkles. The purpose remains re-evaluating advice after new usage context, supporting a buying decision and distinguishing ordinary material advice from invented product/test claims. There are still24 cases/eight purposes/three variants each; the outdoor-heat and work-meeting variants are unchanged. Case IDs identify the purpose; the changed dialogue has a new corpus hash and is not the same evaluation world as the old stage case. Future registrations must freeze current inputs from this active corpus, including any newly selected priority subset. Previously registered `cases.prioritized.json`, captured contexts and run scripts/evidence remain historical inputs, not the default for the next run. No prompt or provider run is changed by this corpus edit.

Current source integration: [audit/report and remaining B work](integration-audit-20261015/CHECKPOINT_B.md), [coverage matrix](../../../../docs/specs/c3-phase-b-integration-audit-20261015.md). The candidate now composes read/state/effect/handoff capabilities explicitly, consumes optional HANDOFF_MATRIX/default code rules through the current ownership/inbox transaction, propagates committed checkout handoff, reads regional ETA and exposes public payment methods. B1 CLI still supplies only read ports. Latest real PostgreSQL COD/bank evidence at clean2d1a6a8e is12groups eachPASS, both databases dropped; later reject-only scope/no-send fixes have focused regression evidence. No new owner/verifier generation or quality result is claimed. Remaining persisted-variant/multi-mutation/stateful-provider/live-delivery limits are listed in the report.

Latest evidence: [two bounded correction rounds / STOP](two-round-20261015/CHECKPOINT_B.md), same eight worlds with the three prior fallbacks first. Each round executed3/8, with1eligible/2fallback and5NOT_RUN; both prefixes failed the condition for the remaining five. Total6case outcomes/18generation requests, retry0. Search shares static source evidence with owner/verifier; policy lookup is rules-only; raw diagnostics stay in tool accounting and the owner sees availability. Missing-POS partial answers passed both times; stage/eligibility owner overclaims persist. Search was not invoked in either provider prefix; five controls lack new provider regression evidence. No third round, readiness/qualification or independent human acceptance.

Scope/authorization: [B1–B3 execution](../../../../docs/specs/c3-phase-b-execution-20261014.md). Latest evidence: [prompt/tool follow-up](followup-20261014/CHECKPOINT_B.md), [full prompt review](followup-20261014/PROMPT_REVIEW.md), [eight conversations](followup-20261014/B1_CONVERSATIONS.md), [concrete findings](followup-20261014/FINDINGS.md). Earlier [real-source/real-PostgreSQL completion report](completion-20261014/CHECKPOINT_B.md) and [RESULTS](RESULTS.md) retain their original meaning. The candidate is isolated from production entrypoints and always returns `sendEnabled=false`.

## Boundaries implemented

- **B1:** `single-agent-commerce-read-only-sources.ts` binds the existing policy resolver, ProductSearchService/Qdrant and Redis facts reader. The resolver receives only `loadActivePointers`; no pin, audit, cache, outbound or history writer. Current pointer failure/LAST_KNOWN_GOOD cannot authorize an old draft. Product price/stock, attributes, chart and variant authority remain separate.
- **B1 owner:** at most three owner generations, two native tool rounds, six domain calls and one verifier. Native parts/signatures/call IDs remain intact. Every final hard-precheck survivor takes the verifier, then current readback and the existing final gate. No generation retry, repair/reverify, reply rewrite or send.
- **B2:** `single-agent-commerce-state.ts` uses the existing profile schema/merge/CAS, accepts only bounded measurement/fit/preference SET/REPLACE/CLEAR, and resolves accepted updates before dependent size/quote. Missing input produces no partial size claim. Size claims bind the exact product/profile revision/fingerprint/chart; quotes use existing policy arithmetic and current sources.
- **B3:** `single-agent-commerce-effects.ts` delegates cart operations and purchase confirmation to the existing atomic sales-cycle executor/repository. Code supplies refs, permission, revision and operation identity. Receipts require committed readback of the expected revision. Duplicate operations do not write again or manufacture a new receipt; an old receipt is reused only while still current. Ambiguous commit is reconciled once, without effect retry.
- **B3 recovery:** a failed owner/verifier after commit can produce only the current receipt-backed code acknowledgement, handoff or no-send. A later failed action cannot be hidden by an earlier success. Changed revision/binding/recipient/privacy/permission invalidates recovery. No extra model or verifier loop.

B2/B3 require scoped code ports; they are not wired to a live writer in this CLI. The existing sales-cycle preconditions remain: opening a cart requires its accepted sales stage; confirmation requires private checkout, a valid preview, current revalidation and any bank-policy resolver. The candidate never invents these states or captures checkout PII through the model. A purchase confirmation records the existing canonical intent/effects; it does **not** create an external POS order. The completion harness below checks persistence and atomic effect intents in a disposable database; actual effect delivery remains outside this scope.

Native capabilities are explicit: B1 declares `search_products`, `read_product`, `read_policy`; B2 adds `apply_customer_state`, `recommend_size`, `quote_cart`; B3 adds `add_to_cart`, `change_cart_item`, `confirm_purchase`. Callers pass the static declaration set that matches their code ports. No model-created tenant/customer/cart/operation IDs or a generic provider/tool framework.

`createCommerceTools` is the explicit candidate composition. Optional handoff ports add `request_handoff` with only a reason; current matrix/default code owns message/tag and a current committed readback owns acceptance. The native adapter derives its declaration set from those configured capabilities. A terminal handoff stops the turn; NO_SEND retains priority. `read_product.deliveryRegion` is a bounded province/region for source ETA lookup; it is not a private checkout address. Tag intents and synthetic test database receipts are not live delivery or human acknowledgement.

## Read-only development run

Models remain Vertex `gemini-3.5-flash-lite` / high and `gpt-6.1-sol` / high through the existing bounded Codex login relay. Provider versions/config, prompt/schema hashes and terminal map are in [manifest](manifest.json); its status describes the frozen preparation, not a mutable run tracker. Latest owner-authorized follow-up at clean8bbea938uses the same eight cases/expectations with failures first, revised owner/tool projection and byte-identical verifier:8/8recorded,26requests/retry0,5eligible/3fallback, subjective5/8adequate. Earlier clean97f24609recorded28requests/5eligible/3fallback/subjective4/8adequate. Both full runs are retained, no outcome adoption, causal/stability claim, inherited A PASS or qualification. Sales quality stays open.

The current corpus has **24 N1 turns: three independently written dialogue variants for each of the same eight purposes**. The source-backed run at clean `fec9c51c` recorded24/24 once:16eligible/8fallback,80generation requests/retry0/error0; subjective whole-terminal review found11USABLE/5NEEDS_EDIT/8fallback and one action-capability defect. [Report](b1-24-run-20261015/CHECKPOINT_B.md), [all conversations](b1-24-run-20261015/B1_CONVERSATIONS.md), [findings](b1-24-run-20261015/FINDINGS.md). RecommendationSTOP; no automatic rerun, model qualification or production promotion. Historical eight-case results remain immutable and are not combined with this denominator.

Reuse the existing deployment routes, not a new database/index setup. [Compose](../../../../deploy/docker-compose.vps.yml) already configures PostgreSQL, Redis, Qdrant, file-backed secrets and the stable catalog index. [Lana ops](../../../../plugins/lana-chatbot-ops/README.md) supplies the existing SSH/credential route. A missing local `.env` does not mean these sources are unavailable.

The [read-only operational readback](source-readback-20261014.json) verified all three connections on 2026-10-14: PUBLISHED policy pointers for the PREPROD page; Redis PONG without customer-key reads; Qdrant `lana_multimodal_data_v2` green, with `product_text`, `image_raw` and `image_cutout` vectors of1408dimensions. Current embedding is `multimodalembedding@001` / `us-central1`. The runtime Vertex project and policy channel differ from the compose defaults; [source-config.example.json](source-config.example.json) now uses the observed non-secret values. This is operational source evidence, not a source-backed candidate/model run.

Prepare the actual config outside Git from that example, supplying synthetic demo scope instead of live customer identity. The local CLI currently expects `RUNTIME_POLICY_DATABASE_URL` (or `DATABASE_URL`), `REDIS_URL`, `QDRANT_BASE_URL`, `QDRANT_API_KEY`, and `C3_VERTEX_CREDENTIAL_FILE` in its process. Remote file secrets and Docker-internal hostnames are not automatically available to that local process; use the established access route without committing or printing credentials. Qdrant is used only for stable text/code lookup, Redis for ingested POS snapshots, and PostgreSQL for active policy pointers. The candidate permits reading an explicitly configured PUBLISHED channel through its read-only resolver; no send, policy pin/audit writer or production flag is enabled.

Supply exactly 24 approved cases in a separate JSON file: three variants for each of eight approved purposes. Each case has evaluator metadata beside the allowlisted runtime projection:

```json
{
  "caseId": "evaluator-only-id",
  "evaluator": {
    "purposeId": "one of the eight evaluator-only purposes",
    "variant": 1,
    "purpose": "whole reply review; never projected"
  },
  "runtime": {
    "latest": "Áo này bao nhiêu em?",
    "history": [],
    "initialProductCodes": ["approved canonical code from the configured source"]
  }
}
```

`history` messages are `{role:"customer"|"shop", text:string}`. Initial codes are operator-approved pre-turn refs; model tools can only use refs issued by code. Do not put synthetic A fixtures into this file and label them real shop data. The eight purposes/scoring protocol remain those in [B1 plan §7](../../../../docs/specs/c3-phase-b-read-only-integration-plan-20261014.md#7-đợt-kiểm-tra-b-phát-triển-giới-hạn-chi-phí); each purpose now has variants 1–3. Whole-turn review is required; keyword presence is not a quality pass.

```powershell
node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config <external-config.json> --cases <approved-cases.json>
node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --config <external-config.json> --cases <approved-cases.json> --out <new-evidence-directory>
```

Preflight without locally loaded routes reports their **names**, makes zero generations and returns BLOCKED for that invocation; it does not inspect the established remote route. Config readiness does not prove a connection/readback. A run requires clean executable/config paths, builds from them, captures runtime `bRunSourceSha`, hashes the exact bytes of config/cases and uses prompts frozen in memory. It never writes the run SHA back into source. A changed HEAD/executable worktree invalidates completion identity.

The CLI exposes only B1's three read tools. It registers 24 N1 turns, at most 96 generation requests; it never runs A2/A3 or expands repetitions. Raw request/result checkpoints and all terminal outcomes are retained, including provider/source failures. There is no automatic quality judge or automatic GO. An observed unsafe eligible reply requires stopping and review before another run.

Owner/verifier request bodies are explicit projections; case IDs, expected labels, purpose and rubric remain evaluator-only. Bounds: history8/4096bytes, latest2048, final4096, provider input32768, tool results8192/round, refs8, claims32, runtime products4/8192bytes each. Oversized inputs fail closed rather than truncating policy/chart truth. Provider auth/error/timeout/malformed output terminates the generation; no hidden generation retry. Source counters are domain/embedding **calls**, not a claim that each corresponds to exactly one network request. Usage/error/version/latency evidence comes from provider accounting; unavailable cost remains null.

The read-only demo uses synthetic scoped recipient/permission supplied by its operator, never live customer send eligibility. Live permission/history/private-checkout integration and actual writer/effect delivery need separate source verification.

## Completing B with existing infrastructure

[Completion scope](B_COMPLETION.md) distinguishes source-backed B1 conversations from real PostgreSQL tests using synthetic customer/product inputs. `source-session.py` reuses the existing ops SSH credential route and forwards PostgreSQL/Redis in a temporary process. It supplies live PostgreSQL connections with `default_transaction_read_only=on`; credentials remain in memory and are not printed. The caller supplies the approved Vertex credential file through `C3_VERTEX_CREDENTIAL_FILE`.

```powershell
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json --out <new-external-directory>
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs <new-external-directory> COD
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs <new-external-directory> BANK_TRANSFER
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json --out <new-external-directory>
```

Commit and require clean executable/config paths before the provider run. Keep outputs outside the repository until it finishes. `--source-check` reads policy, product/offer facts and source freshness, compares snapshot identities before/after current readback, and exercises the configured free-text embedding/search probe; it makes no owner/verifier generations. Case8 alone injects unavailable POS; that injection is evaluator-only and is not a model instruction.

The isolated integration script is the only child allowed the PostgreSQL admin route. It creates a unique `c3_b_test_<random>` database, verifies that exact target, applies existing DDL there, and drops only its own database after closing its clients. It excludes the global-role migration, copies no live customer data, and starts no delivery worker. Current public policy is captured through the read-only source route; synthetic checkout values remain private to code. COD/bank confirmation checks state, handoff/tag intents and the complete payment message group in the existing transaction. No new table or receipt store is introduced.

`single-agent-commerce-persistence.ts` bridges native intent to existing sales-cycle permission/readiness and current-inbox transaction guards; `readCommittedSalesCycleEvent` reads the existing ledger to recover a current receipt after recreating a tool instance. Receipt lifetime starts at commit time. Existing compatibility guards may still reject native wording they cannot authorize. Current native cart tools support adding a line, quantity, removal and `SET_COMPONENT_VARIANT` size/color changes. The registered stateful journey exercises size/quantity on one product; this does not establish coverage of all mixed-component or multi-product requests. Candidate source/DB tests are distinct from model-run and live-delivery evidence.

## Candidate normal-sales journeys — 2026-10-22

[Candidate corpus and prerequisites](SALES_JOURNEYS_CANDIDATE.md):12journeys/32inbound slots after the dialogue-flow review, actual accepted history, separate evaluator setup/scoring and private/media fixtures. Dense correction/cart-action sequences remain technical regression coverage rather than being forced into normal sales chats. These are authored inputs, **not registered provider runs**. Keep the fixed24B1/fixed8stateful baseline; the current runners do not directly execute the new format. Extend the existing harness only after the relevant capability/source/privacy prerequisites work, and freeze selected turns/request budget before dispatch. Offline checks: `node --test apps/worker/evals/single-agent-commerce-read-only/sales-journeys.test.mjs` from repository root; this makes no provider requests.

## Verification

`pnpm --filter @lana/worker test` now runs Vitest under `src`, then all Node eval tests with `node:test`. Neither family is discarded. The R39 test initializes its own fixed input root before importing validators; historical evidence/runtime guards are unchanged.

On Windows with Git `core.symlinks=false`, tracked `evals/track-c-c3-v5/v4` is a plain link-text file. The legacy suites need the existing target `../track-c-c2/v2`. This implementation's full test run temporarily materializes that **same** directory as a junction and restores the exact link-text bytes afterward. No fixture, rubric or historical result is rewritten. Normal symlink-capable checkouts already have this alias.

Focused commands/results, observed RED failures, final checks and remaining source/qualification limits are recorded in RESULTS. Passing isolated tests does not establish live persistence, sales quality, provider stability, A GO or replacement readiness.
