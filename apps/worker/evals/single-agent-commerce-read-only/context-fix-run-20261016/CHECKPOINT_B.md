# Phase B — context fix và một lượt ưu tiên, 2026-10-16

**IMPLEMENTED / CODE_VERIFICATION_PASS; priority replay STOP, không đủ điều kiện chạy phần còn lại.** Đã đo sáu ca ưu tiên: **2 USABLE / 1 NEEDS_EDIT / 3 fallback**, trong đó 3 SEND_ELIGIBLE/3 FALLBACK. Giữ nguyên 18B1+7stateful ở NOT_RUN theo [scope đăng ký trước](SCOPE.md). Đây là coverage6/31, không phải kết quả full24B1+7stateful. A vẫn OWNER_BYPASS; không cấp A PASS, Phase C hoặc live acceptance.

Owner yêu cầu “Thực hiện fix và chạy lại” trên [phương án đã review độc lập](../reviewed-fix-run-20261016/NEXT_FIX_PLAN.md). Đã sửa owner context, bounded completion diagnostics và thay các đoạn tư vấn/giọng đang có; không thay verifier hoặc code authority. [Chi tiết implementation, RED→GREEN và exact commands](../context-fix-20261016/IMPLEMENTATION.md). [Toàn bộ sáu hội thoại thực nhận](CONVERSATIONS.md), [primary cả lượt](PRIMARY_REVIEW.md), [nháp bị chặn và nguyên nhân](DIAGNOSTICS.md).

## Source và identity

| Thành phần | Identity |
| --- | --- |
| implementationBaseSha / main đã refresh | `296cdcfbf5759f5bf9cbb24acf3dc63005589361` |
| Intake | `59bd75cae5e7eea60ef69ee24375c0153e393e1c` |
| Adapter / prompt-source savepoints | `1d71ac8832080082738f5b0d5ceef193620fcd5e` / `8a4a1ad615451ecee64edb78a54b676c2f48df42` |
| bRunSourceSha | `a53b0613f67905b218bc2f9eef33cfd6ae500fac`, clean executable/config at dispatch |
| Raw trước primary | `8529fe9937060967a95e1a6b9bbadcd7ae0184e3` |
| Primary trước rejected-draft diagnosis | `acdd8491f29a142961547bda4d649511d1c76d7b` |
| Conversation | Vertex AI/global `gemini-3.5-flash-lite`, version same string, effort High |
| Verifier | Codex ChatGPT-login `gpt-6.1-sol`, version same string, High; CLI0.159.2 |
| Owner prompt SHA256 | `74c8102ef88e970fca18e84f5d186406a4d21ac5d27bafc383c6476b85394b43` |
| Verifier prompt SHA256, unchanged | `e8ba5ab607518cda125600c59d3130c9b17d5fbf3e62da485945cd2ae1ec449d` |
| Schema SHA256, unchanged | `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97` |
| Priority corpus SHA256 | `8f858e80f27984008e5d29d87d421645ee1b3c53631e09b31c4c2ea7eb722267` |
| Source config SHA256, disk bytes | `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e` |

[FROZEN_INPUTS.json](FROZEN_INPUTS.json) records exact spec/plan/todo blobs, full model generation settings, CLI binary identity in preflight, canonical/stateful/tool hashes, bounds and fallback identity. Owner candidateCount1/text/plain/max8192/thinkingHIGH, temperature/topP provider defaults omitted; timeout90s. Verifier existing Responses relay tools[]/tool_choice none, timeout90s. One upstream request per generation ID, retry0; model tool turns within the original budget are separate registered generations. No effort/model substitution. Exact CLI binary SHA256: `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`.

Fallback remains `C3_A_NONPROTECTED_V2`: “Phần này em chưa trả lời được, chị nhé.” SHA256 `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`. No handoff or no-send occurred among the six; fallback does not imply a human was notified. No post-effect recovery implementation added.

## Actual outcomes and coverage

| Original case | Case ID | Terminal / whole outcome |
| --- | --- | --- |
| 1 | b1-changed-occasion | FAIL fallback / FALLBACK_OR_NO_SEND |
| 6 | b1-search-read | PASS eligible / USABLE |
| 7 | b1-buying-concern | PASS eligible / NEEDS_EDIT |
| 9 | b1-changed-occasion-v2 | FAIL fallback / FALLBACK_OR_NO_SEND |
| 11 | b1-partial-source-v2 | PASS eligible / USABLE, voice caveat |
| 15 | b1-buying-concern-v2 | FAIL fallback / FALLBACK_OR_NO_SEND |

All six were attempted once and retained. First-six maximum24generations; actual19. Full population remains24B1+7ordered stateful, N1/max120generations; 25 outcomes are **HELD_BY_PRIORITY_REVIEW**, not provider failures or attempts to replace. [COVERAGE.json](COVERAGE.json) enumerates all31. POS_UNAVAILABLE in case11 remains the preregistered source fault control. B2/B3 have no new outcomes/state/checkout evidence and no owned test database was created this time.

Two grounded refusals remain: unsupported stage-opacity reassurance and guaranteed lack of heat outdoors. Case15 has a generic protected-assertion refusal: styling opinions are allowed, while the added “hoa nổi” motif is not explicit in its source. The exact trigger cannot be recovered from verdict kind/ref alone; not proven false rejection. The accepted concern reply still sounds like advertising and does not resolve the purchase choice. See [diagnosis](DIAGNOSTICS.md) for all actual drafts and distinctions.

Source diagnosis: ProductRegistry has structured attributes absent from returned Qdrant payloads; existing publication path must synchronize them, not a new parser. Fulfillment numeric prep/transit values exist, but the consumed source lacks an authoritative address→shop-region mapping for the tested checkout. No registry/index/policy publication or resolver change was made. Current-source purchase completion stays BLOCKED; these findings are not simulated passing stateful results.

## Requests, safety audit and operating measures

[AUDIT.json](AUDIT.json), [REQUEST_ACCOUNTING.json](REQUEST_ACCOUNTING.json), [METRICS.json](METRICS.json), [RAW_HASHES.json](RAW_HASHES.json).

- 13 owner +6 verifier = **19 unique generation invocations /19 upstream HTTP requests**, all200. One request per generation ID; automatic retries0, HTTP/parse errors0, timeouts0. One owner auth request recorded; Codex auth-network count not exposed and not included as generation requests. No client continuation was forwarded; all6verifier relay clientRequests1/rejectedClientRequests0.
- All6final drafts reached the verifier; 6exact draft/trusted bindings verified, all3eligible texts equal their verified drafts.13owner dispatch body hashes/bytes agree with captured requests; one final-only request and0unexpected tool responses in this measured subset. No provider-side echo or proof of long-run native conformance.
- 11raw/source/preflight files checked byte-for-byte on disk and Git. Model requests scanned structurally, including nested serialized JSON, against evaluator-only keys, case IDs and evaluator prose: **0observed leaks**. Source fault controls remain evaluator-side. This proves the measured projection, not arbitrary future input safety.
- Input/output usage **59,202 /7,482tokens**, complete19/19: owner36,764/6,351; verifier22,438/1,131. Cost not exposed; no estimate. Source-check made one embedding call separately from owner/verifier generation. Run counters: catalog17/POS12/policy0/embedding0.
- Fallback3/6=50%; handoff0/no-send0 among recorded B1. This is not a full-population fallback estimate.

Nearest-rank latency, in seconds:

| Measured boundary | N | p50 | p95 |
| --- | --- | --- | --- |
| Owner generation | 13 | 1.978 | 4.351 |
| Verifier generation | 6 | 6.196 | 12.837 |
| Added verification path | 6 | 7.052 | 13.588 |
| Whole B1 turn | 6 | 11.768 | 18.423 |

These use runner generation latencyMs, result.verificationLatencyMs and attempt.elapsedMs; preparation/build/source-check startup is outside whole-turn measurements. The added path includes caller overhead and is not a paired no-verifier experiment. N1/subjective non-independent primary review does not establish variance, causal improvement, model superiority or human acceptance. Human acceptance remains null.

## Commands actually run

Preparation and RED→GREEN commands/results are in [IMPLEMENTATION.md](../context-fix-20261016/IMPLEMENTATION.md): adapter/protocol34PASS, worker focused119PASS, protected claims/reply assembly21PASS, full worker130files/1779PASS, eval488PASS+2optionalSKIP, worker typecheck/build/lint exit0. Full worker src used the documented Windows junction wrapper and restored original tracked placeholder bytes. Shared source unchanged; earlier COD/bank12/12each at777616dd are reused, explicitly not rerun. No full-repository `pnpm check` or remote CI PASS claim.

The following exact source/preflight/run commands executed through the existing approved credential route; credentials themselves are not logged. `--provider-preflight` is zero owner/verifier generations.

```text
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-context-fix-stateful-preflight-unused-a53b0613-20261016 COD --provider-preflight
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-context-fix-source-a53b0613-20261016
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --range 1:6 --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-context-fix-first-a53b0613-20261016
node C:/Users/nguye/AppData/Local/Temp/c3-context-fix-primary-view-20261016.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-context-fix-preserve-20261016.mjs --held
node C:/Users/nguye/AppData/Local/Temp/c3-context-fix-primary-review-20261016.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-context-fix-audit-20261016.mjs
```

Results respectively: CONFIG_READY_CONNECTIONS_UNVERIFIED/exit0; PREFLIGHT_PASS/exit0; SOURCE_ADAPTERS_READ_BACK/exit0 and canonical build; DISPATCH_RANGE_COMPLETE_REVIEW_PENDING/exit0 and canonical build,6/6; terminal/public-fact view/exit0; exact11raw preserved/exit0; primary2/1/3/exit0; accounting/bindings/projection verified/exit0. Source/registry diagnosis probes were read-only0generation; one initial address-shape probe error was corrected only in the probe. A raw CRLF whitespace check initially failed at staging; scoped raw attributes preserve exact bytes, and transcript whitespace is retained deliberately. Neither is a provider error; final diff/hash checks own their actual later results.

Closeout offline checks actually passed: `git diff --check 59bd75ca`, all7frozen disk hashes, all24records equal by caseId before/after permutation, four primary blobs unchanged sinceacdd8491,9rootJSON files parse,20local Markdown links resolve and zero post-run executable/config changes or held-provider output directories. Transcript-only whitespace remains quoted exactly. These checks do not replace provider or human quality evidence.

## Complexity, limits and disposition

Against intake59bd75ca: one existing adapter +25/-8lines (net17), its tests+53/-5; owner prompt replaces4lines and grows238bytes (2.36%); active manifest changes one hash. No worker/shared `.ts`, state/effect/receipt/CAS/final-gate code or canonical corpus changed. Added semantic roles/layers/stores/gates/schema fields/migrations:0. Still one conversational owner/at most one verifier; no new parser, router, case regex/template, fallback, repair/reverify loop, generic framework or generation budget.

Source access used the existing [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md) and approved read-only source/registry route. `sendEnabled=false`; no serving/source mutation, real customer send, order/payment/hold/notification, merge or deploy. Rollback is source revert on the candidate branch, with no serving data/schema rollback needed.

**Recommendation: STOP sales/live acceptance.** Implementation/tests finished, but useful concern handling and owner/verifier semantic separation still need work; registry publication and destination mapping are concrete source dependencies.18B1+7stateful remain NOT_RUN, source checkout BLOCKED, human acceptance unknown. Stop after this requested replay; no automatic next round or post-A/C promotion.
