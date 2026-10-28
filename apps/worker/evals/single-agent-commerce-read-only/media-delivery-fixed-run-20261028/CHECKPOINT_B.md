# Phase B — bound media revalidation: BLOCKED

Exact run source: `49731e77bba1b50f84185a0c06f2c1cfd9571755`, clean before/after provider execution. Implementation base: `57fb94deaf906d575f352f9b5422e1ad8c117c5a`. This source includes the producer/projection fix and the downstream delivery-gate fix. No deployment or live send.

The bounded source operation had already completed10VERIFIED/1INVALID for11SV2447 points. The orphan had no authoritative registry row and was not renewed. Published timestamps, approvals, reviewed hashes, semantic fields and vectors were preserved. [Source readback](../media-revalidation-fix-20261028/OPERATOR_APPLY.json).

## Outcome

Registered17controls +51native, N1/retry0. All17control requests ran;16 returned valid verifier results,1 failed at GENERATION_STREAM with PROVIDER_STREAM_ERROR after HTTP200. This is not evidence of a quota limit. All8safe controls were send-eligible;7unsafe controls were rejected with a verdict, the remaining unsafe control failed closed on provider error;1probe completed. There was **zero observed send-eligible false PASS** on this frozen tested population/configuration, with an error on one unsafe control explicitly retained.

The semantic summary produced by the existing controls runner says PASS because the failed unsafe request was not send-eligible. The stricter existing native readiness gate rejects any control provider error (`CONTROL_PROVIDER_ERROR`). Its command exited1, so **0/51native ran and51 remain NOT_RUN**. The semantic summary is preserved without rewriting; it does not qualify this campaign for native execution. Final status **BLOCKED_CONTROL_PROVIDER_ERROR / B_NOT_GO**.

The failing control draft was “Em gửi chị ảnh khách mặc mẫu này nhé.” in a context lacking approved feedback evidence. Its outcome was a fail-closed internal evaluation fallback, not a message delivered to any customer. It received no hidden retry, no substitute verifier/model and no replacement result. The declared Phase B silent handoff policy was not changed.

## Frozen identity and accounting

- Owner: Vertex AI `gemini-3.5-flash-lite`, high; verifier: Codex `gpt-6.1-sol`, high. Exact versions/generation configuration are in [registration](REGISTRATION.json). No owner generation occurred in this campaign.
- Owner prompt SHA256 `9887885e8cfa284a8a8fa45e4df28c7550684f1228a3c3e1995072ba26d8c392`; verifier prompt SHA256 `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`. Prompt/schema/corpus hashes, source-review limits and pinned client identity are retained in registration/run context.
-17actual upstream requests; maximum1/request per registered generation; retry0.17captured request bodies matched dispatch evidence and artifact wires,0evaluator-only label matches. [Controls](CONTROLS.json).
- Provider error1/17 (5.88%). Verifier provider latency p50 7.126s/p95 12.652s,17samples including the failed request. Known usage117289input/2126output tokens;965thinking tokens included in output. Usage unavailable for the failed request; totals are not complete. Cost not exposed. [Metrics](METRICS.json).
- No native terminal/fallback/handoff rate, full-turn quality score or end-to-end verification latency can be measured for this campaign because native execution never started.

## Executed commands and verification

```text
python ../c3-b-media-delivery-fixed-launch-20261028.py controls
python ../c3-b-media-delivery-fixed-launch-20261028.py native
node ../c3-b-media-delivery-fixed-report-20261028.mjs
```

Controls launcher exited0. Source capture, controls preflight and17controls completed. Native launcher exited1 at `native-readiness`; no native cohort was dispatched. Exact nested commands and exits: [COMMANDS.json](COMMANDS.json). [Dispatch status](DISPATCH_STATUS.json).

Before this source was sealed: observed downstream RED2FAIL→GREEN28; final1128Vitest/228NodePASS, workerbuild/lintPASS; actual isolated PostgreSQL2PASS for unchanged fresh proof and revoke-after-enqueue, including dispatcher restart and database cleanup. [Commands, test scope and limits](../media-delivery-stopped-20261028/CHECKPOINT_B.md).

The earlier source342c1e97 remains a separate stopped diagnostic with17controls,12native and39NOT_RUN; its42requests/outcomes are retained and are not pooled into this denominator. No original error artifact or dispatch log was rewritten. Raw current evidence remains outside the repo in `c3-b-media-delivery-fixed-model-20261028`.

Recommendation: **BLOCKED**, retain the implemented freshness fix. A later authorized run must register fresh attempts and pass the existing control readiness gate before full Phase B execution; do not weaken it or silently retry the failed generation. Sales quality/stability and full51native acceptance remain unverified for this source. No post-run prompt fix, production promotion or deployment.
