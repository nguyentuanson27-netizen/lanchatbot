# B1–B3 completion evidence — 2026-10-14

Đã bổ sung phần thiếu của candidate B: đọc nguồn thật, adapter persistence/receipt vào transaction hiện có và các ca kiểm chứng thật trong môi trường tắt gửi. **Chưa thể chốt chất lượng tư vấn:** batch B1 chỉ4/8kết quả đủ hữu ích theo review chủ quan,5SEND_ELIGIBLE/3fallback. Đây không phải A GO, Phase C qualification hay quyết định đưa vào sử dụng.

## Identity và phạm vi

| Identity | Giá trị |
| --- | --- |
| bImplementationBaseSha / refreshed main | `296cdcfbf5759f5bf9cbb24acf3dc63005589361` |
| Candidate foundation / stacked PR390 | `dd5c9d46f41f1514982210034f551a95cd356f68` |
| bRunSourceSha / clean source-check / both isolated DB runs | `97f24609c0ab362893238fe1cabd3e1e6e8f690d` |
| Raw model evidence before primary review | `4ac64501` |
| Whole actual-terminal primary before rejected-draft diagnosis | `7827c193` |
| Execution spec blob at run source | `d18ab3b1238e6fc3b5af95538cb67d591e64d5b6` |
| B plan blob at run source | `d79f015cec765af1211ed613ac9d56143bfe9a6d` |
| Architecture / amendment blobs | `7e0265e3b6b3d556d8fb0f3c7267abccef5de86a` / `4a09b55d2f3a972a65697738876cc5eab21e7a2b` |

[Execution contract](../../../../../docs/specs/c3-phase-b-execution-20261014.md), [completion scope](../B_COMPLETION.md), [frozen registration](raw-b1/registration.json), [commands](COMMANDS.md), [audit](AUDIT.json), [metrics](METRICS.json), [findings](FINDINGS.md), [all eight conversations](B1_CONVERSATIONS.md). Evidence was copied into Git only after run completion; it did not dirty or change source during generation. Historical A evidence/OWNER_BYPASS remain unchanged.

One owner: Vertex `gemini-3.5-flash-lite`, exact returned version, HIGH thinking, global, candidateCount1, maxOutputTokens8192, thoughts not returned, provider-default temperature/topP, timeout90s. One verifier: `gpt-6.1-sol`, exact returned version, high, existing bounded Codex login relay/CLI0.159.2, tools[], tool_choice=none, no rewrite/reverify. Full config remains [manifest](../manifest.json). Model choice unchanged; no substitution.

Frozen SHA256: owner prompt `a42da3e0777bad1b37479e2f958aac5459b13eddceb7c49ecf0c41cc1d442216`; verifier prompt `fe7e21965c6cc608c854b97f2513130c9d2f39cf5bec443f4a637f7d8e6f7957`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`; tools `86fdde7730b4d1ddfdc11fcced05fa76ea8e160892dc598810227388dfdd2e26`; corpus `eeee6cfdde42ab3440a330e566d40d550f6d66ef88671d71addc9130b773154a`; config bytes `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e`. Registration also retains manifest/CLI binary hashes. No prompt was changed in this completion increment.

## Evidence obtained

**B1 sources:** actual PUBLISHED policy through the configured PREPROD page/shop; Redis POS snapshots for price/stock; Qdrant stable catalog/content with its existing1408dimension index. Product SV2447 and its SET_VAY/AO/CV offers each have current price/stock plus independent XML content. Snapshot before/after current readback matches. One free-text embedding probe returned AMBIGUOUS with real candidates; no forced match. TTL7200uses the observed existing runtime bound. Secrets stayed in memory through the established ops route; live PostgreSQL connection was read-only.

**B2/B3 PostgreSQL:** [COD](integration-cod.json) and [bank](integration-bank.json), each9/9groups PASS, clean source, correct isolated database dropped. Existing schema0001–0033only in those disposable databases; no cluster-role migration. B2 proves persistence across instances/turns, correction before size, stale CAS, CLEAR/REPLACE and expiry. B3 proves current-inbox transaction, duplicate/new-instance receipt recovery, quantity change, lost-response reconciliation without replay, superseded writer denial, private checkout/preview and atomic confirmation/handoff/tag/payment intents. Bank:1logical payment intent/3outbox messages; COD:0payment messages. No worker delivered them. Customer/product/size fixtures are synthetic; public B3 policy is captured from the current source. These are real-database tests, not provider stateful journeys or live customer effects.

**B1 provider batch:**8registered/8recorded, N1,21owner+7verifier=28generation requests against max32, one upstream per generation, retries0, all HTTP200/expected model versions,0provider errors/timeouts. Every produced final text, seven of seven, took its mandatory verifier. One case ended at tool budget before a final draft. [Audit](AUDIT.json) verified28request projections with0evaluator-label leaks,7exact request/draft/trusted binding matches and all raw hashes. No case ID/sourceMode/expectation/rubric reached either role, including continuation/tool results.

## Customer outcomes and measurements

| Observation | Result |
| --- | --- |
| SEND_ELIGIBLE / fallback / handoff / no-send |5/3/0/0; send disabled throughout |
| Fallback rate |37.5% of all8registered cases |
| Subjective whole-terminal review |4adequate/4not adequate;80human ratings null; no independent acceptance |
| Fallback reasons |1budget,1unsupported opacity assertion,1policy condition/eligibility assertion |
| Provider errors/timeouts |0/28; not a claim of stable future error rate |
| Verifier wall latency p50/p95 |8.864s/13.958s, n=7 |
| Added verification stage p50/p95 |9.483s/14.604s, n=7, includes readback/gate |
| Tool latency p50/p95 |0.536s/3.053s, n=8 |
| End-to-end turn latency p50/p95 |14.109s/23.997s, n=8; excludes build/session setup |
| Owner input/output tokens |69,651/8,175; output includes7,413thinking tokens |
| Verifier input/output tokens |23,526/674; output includes reasoning |
| Cost |null; not exposed; no price estimate substituted |

Quantiles use nearest rank. Domain counters are calls, not exact physical network requests:20catalog,15POS,4policy; embedding1during B1 plus1separate source probe. Source-check's policy/POS counter fields were not fully wrapped and must not be interpreted as zero actual reads. Owner OAuth count is1; Codex auth/refresh traffic is not separately exposed. Full denominator and raw usage are retained.

Terminal map/fallback unchanged: valid PASS+current gate → exact SEND_ELIGIBLE, semantic/provider/budget failures → frozen bounded fallback, invalid snapshot/freshness → handoff disposition, invalid privacy/permission/recipient → no-send. Fallback `C3_A_NONPROTECTED_V2`, “Phần này em chưa trả lời được, chị nhé.”, SHA256 `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`. Handoff disposition does not mean a live handoff capability exists. B3 recovery additionally requires current committed receipt/authority, with no effect replay.

No observed protected false completion or wrong price/stock was found among the five eligible B1 replies in this primary review. One eligible reply still promises an unavailable future callback; this is explicitly a quality/capability failure under the frozen verifier scope. This small N1 development set is not adversarial verifier qualification and does not establish semantic safety.

## Verification, complexity and limits

[Commands](COMMANDS.md) distinguishes observed RED/failures from later GREEN. Full worker baseline:126Vitest files/1705tests PASS; Node457PASS/0FAIL/2opt-in installed-login stub tests skipped. After the final receipt-time fix: focused176worker,28existing protected/product,17native/protocol,38database and164business-tools tests PASS. Worker typecheck/build/lint and relevant shared typechecks/builds passed. Full baseline predates the final one-line receipt expiry fix; affected tests were rerun, no invented1706full-suite result. Final source builds were performed by source-check and provider runner. CI on PR is separate and is not claimed green.

Relative to prior delivery `7deef83e`, runtime changes:8files/+197−41lines; one new92line persistence bridge, one existing-ledger read method, zero new tables/stores/frameworks/semantic roles. Two evaluation-only source/integration helpers total311lines. Existing owner loop, verifier, final gate, transaction/CAS/permission/receipt boundaries are reused. No production entrypoint imports the candidate. No third model, generic Vietnamese parser, case regex/template, semantic router or repair/reverify loop was added.

**Open:** persisted component-variant changes are unavailable/unadvertised; existing stage/permission compatibility guards still constrain native wording; no full provider B2/B3 stateful conversation test, real ingress permission wiring or actual effect delivery was performed. These are not silently counted as verified. B1 final readback values are not separately persisted beyond gate output; source-check before/after is captured. Sales quality remains open: wasteful reads, unsupported physical inference, overbroad eligibility, internal vocabulary and promised follow-up without a workflow.

**Recommendation:** retain this as B engineering/integration delivery with explicit open behavior/capability limits. Do not call B sales quality complete or start Phase C/rollout from these numbers. No automatic extra provider round, A2/A3, live mutation/send, deploy, migration or C3 removal was performed.
