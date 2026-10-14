# C3 Phase B candidate

Scope/authorization: [B1–B3 execution](../../../../docs/specs/c3-phase-b-execution-20261014.md). Current evidence: [RESULTS](RESULTS.md). The candidate is isolated from production entrypoints and always returns `sendEnabled=false`.

## Boundaries implemented

- **B1:** `single-agent-commerce-read-only-sources.ts` binds the existing policy resolver, ProductSearchService/Qdrant and Redis facts reader. The resolver receives only `loadActivePointers`; no pin, audit, cache, outbound or history writer. Current pointer failure/LAST_KNOWN_GOOD cannot authorize an old draft. Product price/stock, attributes, chart and variant authority remain separate.
- **B1 owner:** at most three owner generations, two native tool rounds, six domain calls and one verifier. Native parts/signatures/call IDs remain intact. Every final hard-precheck survivor takes the verifier, then current readback and the existing final gate. No generation retry, repair/reverify, reply rewrite or send.
- **B2:** `single-agent-commerce-state.ts` uses the existing profile schema/merge/CAS, accepts only bounded measurement/fit/preference SET/REPLACE/CLEAR, and resolves accepted updates before dependent size/quote. Missing input produces no partial size claim. Size claims bind the exact product/profile revision/fingerprint/chart; quotes use existing policy arithmetic and current sources.
- **B3:** `single-agent-commerce-effects.ts` delegates cart operations and purchase confirmation to the existing atomic sales-cycle executor/repository. Code supplies refs, permission, revision and operation identity. Receipts require committed readback of the expected revision. Duplicate operations do not write again or manufacture a new receipt; an old receipt is reused only while still current. Ambiguous commit is reconciled once, without effect retry.
- **B3 recovery:** a failed owner/verifier after commit can produce only the current receipt-backed code acknowledgement, handoff or no-send. A later failed action cannot be hidden by an earlier success. Changed revision/binding/recipient/privacy/permission invalidates recovery. No extra model or verifier loop.

B2/B3 require scoped code ports; they are not wired to a live writer in this CLI. The existing sales-cycle preconditions remain: opening a cart requires its accepted sales stage; confirmation requires private checkout, a valid preview, current revalidation and any bank-policy resolver. The candidate never invents these states or captures checkout PII through the model. A purchase confirmation records the existing canonical intent/effects; it does **not** create an external POS order. Real repository persistence/effect delivery remain unverified here.

Native capabilities are explicit: B1 declares `search_products`, `read_product`, `read_policy`; B2 adds `apply_customer_state`, `recommend_size`, `quote_cart`; B3 adds `add_to_cart`, `change_cart_item`, `confirm_purchase`. Callers pass the static declaration set that matches their code ports. No model-created tenant/customer/cart/operation IDs or a generic provider/tool framework.

## Read-only development run

Models remain Vertex `gemini-3.5-flash-lite` / high and `gpt-6.1-sol` / high through the existing bounded Codex login relay. Provider versions/config, prompt/schema hashes and terminal map are in [manifest](manifest.json). That file is an implementation protocol; **no source-backed population or provider result is currently registered**.

Reuse the existing deployment routes, not a new database/index setup. [Compose](../../../../deploy/docker-compose.vps.yml) already configures PostgreSQL, Redis, Qdrant, file-backed secrets and the stable catalog index. [Lana ops](../../../../plugins/lana-chatbot-ops/README.md) supplies the existing SSH/credential route. A missing local `.env` does not mean these sources are unavailable.

The [read-only operational readback](source-readback-20261014.json) verified all three connections on 2026-10-14: PUBLISHED policy pointers for the PREPROD page; Redis PONG without customer-key reads; Qdrant `lana_multimodal_data_v2` green, with `product_text`, `image_raw` and `image_cutout` vectors of1408dimensions. Current embedding is `multimodalembedding@001` / `us-central1`. The runtime Vertex project and policy channel differ from the compose defaults; [source-config.example.json](source-config.example.json) now uses the observed non-secret values. This is operational source evidence, not a source-backed candidate/model run.

Prepare the actual config outside Git from that example, supplying synthetic demo scope instead of live customer identity. The local CLI currently expects `RUNTIME_POLICY_DATABASE_URL` (or `DATABASE_URL`), `REDIS_URL`, `QDRANT_BASE_URL`, `QDRANT_API_KEY`, and `C3_VERTEX_CREDENTIAL_FILE` in its process. Remote file secrets and Docker-internal hostnames are not automatically available to that local process; use the established access route without committing or printing credentials. Qdrant is used only for stable text/code lookup, Redis for ingested POS snapshots, and PostgreSQL for active policy pointers. The candidate permits reading an explicitly configured PUBLISHED channel through its read-only resolver; no send, policy pin/audit writer or production flag is enabled.

Supply exactly eight approved cases in a separate JSON file. Each case has evaluator metadata beside the allowlisted runtime projection:

```json
{
  "caseId": "evaluator-only-id",
  "evaluator": { "purpose": "whole reply review; never projected" },
  "runtime": {
    "latest": "Áo này bao nhiêu em?",
    "history": [],
    "initialProductCodes": ["approved canonical code from the configured source"]
  }
}
```

`history` messages are `{role:"customer"|"shop", text:string}`. Initial codes are operator-approved pre-turn refs; model tools can only use refs issued by code. Do not put synthetic A fixtures into this file and label them real shop data. The eight purposes/scoring protocol remain those in [B1 plan §7](../../../../docs/specs/c3-phase-b-read-only-integration-plan-20261014.md#7-đợt-kiểm-tra-b-đầu-tiên-giới-hạn-chi-phí). Whole-turn review is required; keyword presence is not a quality pass.

```powershell
node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config <external-config.json> --cases <approved-cases.json>
node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --config <external-config.json> --cases <approved-cases.json> --out <new-evidence-directory>
```

Preflight without locally loaded routes reports their **names**, makes zero generations and returns BLOCKED for that invocation; it does not inspect the established remote route. Config readiness does not prove a connection/readback. A run requires clean executable/config paths, builds from them, captures runtime `bRunSourceSha`, hashes the exact bytes of config/cases and uses prompts frozen in memory. It never writes the run SHA back into source. A changed HEAD/executable worktree invalidates completion identity.

The CLI exposes only B1's three read tools. It registers eight N1 turns, at most32generation requests; it never runs A2/A3 or expands repetitions. Raw request/result checkpoints and all terminal outcomes are retained, including provider/source failures. There is no automatic quality judge or automatic GO. An observed unsafe eligible reply requires stopping and review before another run.

Owner/verifier request bodies are explicit projections; case IDs, expected labels, purpose and rubric remain evaluator-only. Bounds: history8/4096bytes, latest2048, final4096, provider input32768, tool results8192/round, refs8, claims32, runtime products4/8192bytes each. Oversized inputs fail closed rather than truncating policy/chart truth. Provider auth/error/timeout/malformed output terminates the generation; no hidden generation retry. Source counters are domain/embedding **calls**, not a claim that each corresponds to exactly one network request. Usage/error/version/latency evidence comes from provider accounting; unavailable cost remains null.

The read-only demo uses synthetic scoped recipient/permission supplied by its operator, never live customer send eligibility. Live permission/history/private-checkout integration and actual writer/effect delivery need separate source verification.

## Verification

`pnpm --filter @lana/worker test` now runs Vitest under `src`, then all Node eval tests with `node:test`. Neither family is discarded. The R39 test initializes its own fixed input root before importing validators; historical evidence/runtime guards are unchanged.

On Windows with Git `core.symlinks=false`, tracked `evals/track-c-c3-v5/v4` is a plain link-text file. The legacy suites need the existing target `../track-c-c2/v2`. This implementation's full test run temporarily materializes that **same** directory as a junction and restores the exact link-text bytes afterward. No fixture, rubric or historical result is rewritten. Normal symlink-capable checkouts already have this alias.

Focused commands/results, observed RED failures, final checks and remaining source/qualification limits are recorded in RESULTS. Passing isolated tests does not establish live persistence, sales quality, provider stability, A GO or replacement readiness.
