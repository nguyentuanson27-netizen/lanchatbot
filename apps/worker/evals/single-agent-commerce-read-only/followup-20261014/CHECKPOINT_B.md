# B1 prompt/tool follow-up — 2026-10-14/15 Asia/Saigon

Đã review toàn bộ hai prompt, chín mô tả tool và wire context; sửa owner/tool, self-review/checks và chạy lại một batch tám ca. **Chưa đạt chất lượng để chốt B:** subjective whole-terminal5/8đủ hữu ích so với4/8trước, nhưng vẫn5eligible/3fallback(37.5%). Ca hỏi giá được cải thiện; ba vấn đề còn lại được giữ nguyên kết quả, không patch hoặc rerun sau run.

## Source và protocol

| Identity | Giá trị |
| --- | --- |
| bImplementationBaseSha/refreshed main | `296cdcfbf5759f5bf9cbb24acf3dc63005589361` |
| Candidate foundation | `dd5c9d46f41f1514982210034f551a95cd356f68` |
| Preparation base / previous delivery | `0f4c4eba9be29d6033058ae1be3bebc9daafffbd` |
| Runtime implementation savepoint | `df33d582` |
| Clean bRunSourceSha | `8bbea938bd947f02910b29976c75b47e8ce00c9c` |
| Raw commit before primary | `965e3138431b83671ac4c26acd6e7945b7630f26` |
| Whole-terminal primary before rejected diagnostics | `fa61bce3b9961540411f2c086194e9f051ca53eb` |

[Scope](SCOPE.md), [full prompt/fix review](PROMPT_REVIEW.md), [readiness](READINESS.json), [registration](raw-b1/registration.json), [eight conversations](B1_CONVERSATIONS.md), [findings](FINDINGS.md), [audit](AUDIT.json), [metrics](METRICS.json), [commands](COMMANDS.md). Directory name records the preparation date; delivery crosses midnight. Frozen run files are not renamed or rewritten to create a different identity.

Same models/config: Vertex `gemini-3.5-flash-lite`/exact returned version/high/global,1candidate,8192maxOutputTokens, provider-default temperature/topP; verifier `gpt-6.1-sol`/exact returned version/high/existing Codex login relay/CLI0.159.2, no tools.90s deadlines/retry0. Exactly same eight case objects/messages/history/source modes/expectations, only reordered prior four inadequate cases first. N1, max3owner+1verifier per case/max32requests; no A2/A3, third role, semantic repair/reverify, extra round or new provider choice.

Owner prompt SHA256 `36be248c69caa541071a8f65542ec6c1db2eb0a2d39224b4f80f7a5468b8a223`; verifier remains `fe7e21965c6cc608c854b97f2513130c9d2f39cf5bec443f4a637f7d8e6f7957`. Owner11,317→10,184bytes, same8headings, old3few-shot examples removed. This reduction is not a quality pass. Schema stays `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`; tools `3a814aa7ca58344c7997f8d68b5890e98b664a89f8dff0a451e8100f78465b0a`; reordered corpus `48517f0d48680089f3aeb46f14ab8f5cf9ec309ffe2e005cbbebe317e3a16a7f`; source config stays `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e`. Manifest/CLI hashes retained in registration. Runtime source SHA was captured after commit/clean and never written back into frozen source. Evidence copied into Git after completion.

## Implemented and checked

Owner instructions now use actual trusted.policy path, distinguish unknown physical evidence from a negative claim, rules from complete policy eligibility and current tool reads from a registered future follow-up. Ordinary confident fashion advice/current code-fit and all truth/state/effect/privacy boundaries remain. No product/price/policy answer was put into prompt.

read_product now exposes resolver-selected canonical offerType, requestedOfferType separately and independent source status/reason. Existing resolver still chooses priority and price; no new parser or offer-selection algorithm. Exact offer ref participates in current claim/snapshot binding. Owner sees existing remaining tool budget and allowed tool names, plus the already allowed profile/revision/fingerprint comparison fields that its old serializer omitted. No new authority source or effect implementation.

Observed RED3worker+1native → minimumGREEN27worker+11native; focused145worker+18native/protocol PASS. Full current worker126Vitest files/1709PASS, Node458PASS/0FAIL/2opt-in installed-login stub SKIP. Worker typecheck/build/lint exit0; final source-check/provider runners also build current source. Shared packages, verifier/boundary and B3transaction code unchanged; existing real-PostgreSQL COD/bank9groups each were not rerun or relabelled as a new stateful/provider test. Windows alias restored byte-for-byte; prior raw hashes remain intact.

Real read-only source-check: active PUBLISHED policy, product description and SET_VAY/AO/CV price/stock current; all four reads OK, canonical default SET_VAY, stable snapshot before/after. Free-text embedding/search retains AMBIGUOUS rather than forcing a match. Comparison shows public policy and price/stock/description values match the earlier source-check, while source timestamps/provenance may advance. Live PostgreSQL remained read-only; no customer/cart/source mutation or delivery occurred. Case8alone injects absent POS, with mode kept evaluator-only.

## All registered outcomes

| Case | Actual terminal | Primary whole-turn assessment |
| --- | --- | --- |
| Price |eligible |PASS; direct799k, no unnecessary intake |
| Changed occasion |fallback/BUDGET |FAIL; read→search→attempted further reads exceeds2rounds |
| Current policy |fallback/FAIL |FAIL; owner still confirms complete eligibility |
| Partial source |fallback/FAIL |FAIL; owner substitutes unsupported synchronization explanation |
| Component price/stock |eligible |PASS; correct áo rời/M/499k |
| Search then read |eligible |PASS; correct SD375/1.065.000đ |
| Buying concern |eligible |PASS with weak voice; long promotional wording persists |
| Used-item policy |eligible |PASS with completeness/concision limits; no rawunused |

Primary is subjective,80human ratings null, no independent acceptance or new qualification threshold. Actual fallback, not rejected draft, is scored. Rejected diagnostics come after the primary and distinguish observed wording from unverifiable reasoning inside the verifier. In both refusal cases the JSON gives kind/ref, not a clause-level explanation; findings do not invent one.

## Accounting and measured operations

8registered/8recorded;19owner+7verifier=26upstream generation requests/max32, one per generation, retries0.0provider errors/timeouts; all HTTP200/exact approved model versions. All7produced final drafts invoked the mandatory verifier/current gate; changed-occasion ended at budget with no final draft, not a classifier skip.5eligible/3fallback/0handoff/0no-send; sendEnabledfalse throughout. Fixed fallback/terminal map unchanged: `C3_A_NONPROTECTED_V2`, “Phần này em chưa trả lời được, chị nhé.”, hash `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`. Handoff/no-send still follow current deterministic authority; no live handoff is implied.

Audit:26captured request bodies including continuations,0evaluator leaks,7exact draft/request/trusted binding matches,12raw hashes intact, all generation slots accounted. Largest request24,113bytes<32,768; no source truncation. Case IDs/source modes/expected behavior/rubrics remain outside both roles. B1 final current readback snapshots are not separately persisted; gate outcomes and focused mechanism tests are retained, source-check has both before/after snapshots. No live-send qualification is inferred.

| Measurement | Observed |
| --- | --- |
| Verifier latency p50/p95, n=7 |6.292s/11.843s |
| Added verification stage p50/p95, n=7 |7.010s/12.532s, includes readback/gate |
| Tool latency p50/p95, n=8 |0.562s/2.914s |
| End-to-end p50/p95, n=8 |11.671s/19.004s, excludes build/session setup |
| Owner tokens input/output |55,921/6,485, including5,750thinking output |
| Verifier tokens input/output |23,652/727, output includes reasoning |
| Timeout/error rate |0/26observed, not a future stability estimate |
| Cost |null, not exposed; no substitute estimate |

Nearest-rank quantiles. Domain counts are calls, not exact network requests:18catalog/13POS/4policy/1embedding during B1 plus1separate source-probe embedding. Owner OAuth1, verifier auth/refresh count unavailable. Full denominator retains the three failures and the generation that returned tool calls while API modeNONE/availableTools=[] were supplied. Two fewer generation requests than the earlier28are observed; N1/context/tool/source timing differences prevent a causal latency claim.

## Limits and recommendation

No independent reviewer accepted the five eligible replies as fully safe/sales-ready. Primary found no protected wrong-price/stock/completion among them, with explicit concerns about verbosity and unresolved fee payer detail. This development population is not verifier adversarial qualification or full stateful B2/B3 evidence. Persisted component-variant changes/live ingress/private checkout provider journeys/actual effect delivery remain open as before.

Implementation delta this turn:3executable files/+17−7lines plus tests; no module/table/store/gate/semantic role added. Owner document replaced rather than appended; verifier/config/schema/fallback unchanged. No production wiring, regex/template growth, generic language parser, semantic router or hidden retry.

**Recommendation:** retain the fixes and evidence, keep B sales usability open. Next work must address the real tool-budget versus alternative-search path and bounded policy/source-status conclusions; appending more per-case prompt rules is not demonstrated to solve them. No automatic next run, A2/A3, Phase C, merge, deploy or live send follows.
