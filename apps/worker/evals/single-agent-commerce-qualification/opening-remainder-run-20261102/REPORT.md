# Phase C — remaining12 development run, 02/11/2026

Owner yêu cầu chạy12ca/20lượt còn thiếu. Đây là development population đã biết; không phải qualification holdout hoặc C3 comparison. Không chạy lại case nào của batch21 trước.

[Toàn bộ hội thoại](CONVERSATIONS.md) · [Accounting](ACCOUNTING.json) · [Operational](OPERATIONAL.json) · [Source readiness](FROZEN_POPULATION.json) · [Coverage hai batch](COVERAGE.json).

Run source sạch `1f6a358bc7f26865ca28caa1021614f3b61184a0`. Scope chỉ thuộc evaluator: FULL22 trừ exact completed registrationda7813,12cases/20turns/max80generation/N1/retry0; owner/verifier prompts, runtime/packages và budget mỗi lượt không đổi. Gemini3.5FlashLiteHIGH + GPT6.1SolHIGH/Codex0.159.2.

Frozen cohorts: {"SOURCE_UNAVAILABLE": 10, "SALES_READY": 2}. Fresh107-product read-only capture11:10UTC; exact existing approved isolated handoff matrix, no shop write/TTL refresh. Actual initial02 cùngsource/world PASS/database dropped/provider0; initial01 dùng world cũ không dùng cho run mới, được giữ riêng.

Actual 20/20turns; case statuses {"EXECUTED": 12}. Actual terminal counts {"HANDOFF": 12, "NO_SEND": 7, "SEND_ELIGIBLE": 1}. Accepted 1texts/2images. Handoff/no-send rate trên lượt đã chạy 0.95; không phải qualityfailure rate.

Generation 21records/20HTTP, roles {"OWNER": 19, "VERIFIER": 2}, statuses {"OK": 19, "MALFORMED": 1, "PROVIDER_ERROR": 1}. Mọi lỗi giữ denominator; tối đa1HTTP/generation; không automatic retry hoặc best-of-N. Duration 433.303s.

Verifier verdicts {"PASS": 1, "FAIL": 1}; measured latency(ms) {"n": 2, "p50": 9934.345899999957, "p95": 21056.957600000023}; native verification+readback(ms) {"n": 2, "p50": 12336.078099999984, "p95": 26436.60269999999}. Token evidence {"inputObserved": 213896, "outputObserved": 27273, "usageRows": 20, "cost": "UNAVAILABLE_UNLESS_PROVIDER_EXPOSED"}. Cost không được expose; harness latency không phải production SLO.

Source sạch suốt run, disposable PostgreSQL đã drop, send disabled. Chưa có locked independent quality grades. QualificationBLOCKED/C3NOT_RUN/B_NOT_GO giữ nguyên.

## Verification thực chạy

- Scope TDD: RED2 D_UNKNOWN_SCOPE → GREEN36/36 (remainder/diagnostic/full-native/purchase/provider/readiness); independent remainder2/2 và code/scope APPROVE.
- Same reviewer APPROVE INPUTS boundpending8c2cc5, exact scripts/order/nooverlap/seed/world/initial/readiness. Final preflight PASS before dispatch.
- Primary accounting checks raw canonical hashes, wire request hashes/firewall, uniqueness/max1request/cap80, actual text/capture-vs-Outbox. Author primary audit PASS:55 frozen artifact hashes,20 native canonical raw turns,21 generation identities/20 request bodies and dispatch records, actual1text+2image Outbox/group/order/durable bindings, silent payloads and HUMAN no-effect follow-ups. [Primary audit](PRIMARY_AUDIT.json). Independent post-run reviewer failed with usage limit before writing audit records: NOT_COMPLETED_USAGE_LIMIT, not approved. [Review failure](REVIEW_FAILURE.json). Scope/code and preregistered-input independent approvals remain valid; no substitution or invented post-run approval.

```text
node --test apps/worker/evals/single-agent-commerce-qualification/remainder-diagnostic.test.mjs
node --test apps/worker/evals/single-agent-commerce-qualification/remainder-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-qualification/diagnostic.test.mjs apps/worker/evals/single-agent-commerce-qualification/full-native-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-qualification/purchase-options-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-qualification/candidate-provider.test.mjs apps/worker/evals/single-agent-commerce-qualification/source-readiness.test.mjs
node ../c3-opening-remainder-prepare-20261102-01.mjs
node ../c3-opening-remainder-finalize-20261102-01.mjs
python ../c3-opening-remainder-launch-20261102-01.py
node ../c3-opening-remainder-accounting-20261102-01.mjs
```

Actual source capture, resolver and isolated initial commands/logs retained in artifact inventory. COMMAND.json records exact dispatch invocation/exit/times. Primary audit command: `node ../c3-opening-remainder-primary-audit-20261102.mjs`; its first diagnostic check incorrectly looked for owner DISPATCHED on verifier rows. Failed log retained; final check uses the existing VERIFIER_DISPATCHED event and passes. No raw outcomes or execution source changed.

## Findings

Primary review đọc đủ20 actual native turns, accepted output và draft bị chặn. Không có chấm mù độc lập/qualityPASS từ review này.

| Ca | Actual outcome và finding |
| --- | --- |
| s01 báo giá Khánh Trang | Handoff trước verifier. Explicit select_product_media=NO_VERIFIED_MATCHING_MEDIA, MEDIA_SELECT trả rỗng. Không giả ảnh để gửi giá. |
| s02 giá áo với2initialrefs | Owner có draft nhưng opening preparation unavailable; MEDIA_SELECT rỗng, handoff trước verifier. Ảnh của một mã không được tự dùng cho mã còn lại. |
| s03 ảnh gần ren Ngọc Trâm | Explicit media selection không có verified matching media; handoff im lặng theo sourcegap đã đăng ký. |
| s04 hỏi màu áo | Owner search dù đã bound2products; search bị PRODUCT_BOUND, read_product vẫn OK, sau đó owner tự request_handoff(RESPONSE_UNAVAILABLE). Không verifier attempt. |
| s07 size áo | COMPONENT/TOP sizing source unsupported: recommend_size trả SIZE_SOURCE_UNAVAILABLE và final SIZE_RULE_UNAVAILABLE. Không đưa size toànset thay chart áo. |
| s11 beL/hai bộ | Read_product kết quả còn ambiguity/sourcegap; owner continuation HTTP200/STOP nhưng tool args read_product.color=null ở selectionSINGLE sai schema (OWNER_TOOL_OUTPUT). MALFORMED,1HTTP, không retry. Không phải provider transport/quota hay verifier từ chối. Stock prerequisite cũng chưa chứng minh quantity2 fulfillment. |
| s13 tổng cả ship Cần Thơ | Owner đọc policyOK; continuation66639/65536byte bị chặn OWNER_REQUEST_BOUND trước auth/HTTP. Giữ generation record với0requests; không phải timeout hoặc hết quota. Đây là wire bound còn tồn tại trên input khác dù constructed continuation trước đó từng vừa cap. |
| s16 feedback áo | Owner request_handoff(RESPONSE_UNAVAILABLE) ngay từ generation đầu, không gọi verifier/ảnh. Preregistration FEEDBACK/TOP sourcegap giữ nguyên; không coi ảnhMODEL là feedback hoặc suy một lookup không xảy ra. |
| j1 áoL→mộtM mộtL→tổng | Lượt đầu add_to_cart nhận SELECTION_UNAVAILABLE, không mở cart; handoff. Hai lượt sau thực thi HUMAN-owned NO_SEND, không model/effect mới. Luồng quantity2 correction chưa được đi tới. |
| j3 tư vấn áo/quần nâu→lợi ích chân váy | Lượt1 SEND_ELIGIBLE: áo499k+2ảnh; reply dài về chất liệu/size, chưa giải thích rõ cách phối quần nâu khách có. Lượt2 owner chọn ảnh và draft upsellset799k; verifierFAIL câu “tiết kiệm hơn hẳn… chỉ thêm300k”. Basis của verifier: benchmark đang là áo499k, mua set tăngchi300k; chưa thiết lập mua rời cả áo+váy làm mốc tiết kiệm. Actual handoff, draft/ảnh lượt2 không gửi; lượt3 HUMAN NO_SEND. Đây là lý do verdict quan sát được, chưa phải owner phán quyết cuối về ranh giới ngôn ngữ upsell. |
| j4 áoM→thương lượng→tổngship | CART_OPENED đã commit và receipt được giữ; opening MEDIA_SELECT ERROR/UNKNOWN_INTERNAL, recoveryPREPARATION_UNAVAILABLE→handoff. Hai lượt sau HUMANNO_SEND. Chưa chạy được thương lượng hoặc tổngship trong hành trình này. Không gọi đây là sole colour cause hoặc checkout thành công. |
| j5 đơncũ→traođổitrựctiếp→gửithôngtin | ORDER_STATUS handoff theo matrix, hai lượt sau HUMANNO_SEND. Giữ không có orderidentity/access thay vì bịa trạng thái đơn. |

Actual12handoff gồm7DEPENDENCY_FAILURE,3RESPONSE_UNAVAILABLE,1SIZE_RULE_UNAVAILABLE,1ORDER_STATUS;7NO_SEND đều HUMAN_OWNS_CONVERSATION;1SEND_ELIGIBLE. Hai verifier attempts gồm1PASS/1FAIL, không timeout/transporterror. Không quy mọi handoff cho semantic verifier.

SOURCE_UNAVAILABLE cohort10ca đã frozen trước provider; vẫn chạy đủ, không drop/relabel. Hai SALES_READY j3/j5 không có nghĩa wholeconversation qualityPASS: j3 dừng ởverifierFAIL lượt2, j5 handoff đúngpolicy.19/20handoff/no-send làterminalrate trên observedturns, không phải tỷ lệ hội thoại tư vấn fail hoặc bằng chứng model thụt lùi theo paired benchmark.

Đã hoàn tất cả phần còn thiếu:12cases/20turns,0NOT_RUN, không overlap21cases/28turns trước. Hai batch cộng coverage33unique cases/48actualturns, nhưng khác source/world registration; không gộp qualitygrades, safetydenominator hay tuyên bố một fullqualification campaign duy nhất.


Recommendation: STOP after authorized remaining batch; no automatic rerun/fix/qualification/C3/promote/deploy.
