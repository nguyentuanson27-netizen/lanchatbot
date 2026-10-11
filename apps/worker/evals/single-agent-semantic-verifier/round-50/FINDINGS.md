# Round50 — findings và phân định root cause

**A2 PASS; A3 FAIL 62/66; recommendation STOP tại Checkpoint A.** Một vòng mới đã chạy đủ, không tiếp tục Round51 hoặc post-A. [Checkpoint](CHECKPOINT_A.md), [42 lịch sử / 66 kết quả thực tế](A3_CONVERSATIONS.md), [4 outcomes chưa đạt](A3_FAILURES.md).

## Đã sửa và đã kiểm chứng gì

Từ finding49, thay hướng dẫn owner về phạm vi câu trả lời chính sách và cách nối dữ kiện với quyết định mua. Ví dụ giả định phân biệt giới thiệu dịch vụ, từ chối tình trạng hàng thật và cấp quyền thử-đổi; tách quyết định dứt khoát khỏi mức chắc chắn của nguồn. Prompt6169→6232 ký tự. Giữ nguyên verifier48, native history/context, cả hai corpora, facts, evaluator, model/config/routes, N1/N3, ngưỡng, fallback và final gate của49. Code chỉ thêm fixed50 admission/hash pins trong hai executable eval,19 dòng thêm/12 dòng bỏ; không thêm runtime function/role/layer/parser/router/repair/template hoặc production/shared source.

Observed RED5tests1PASS4FAIL trước executable edits → minimumGREEN5/5. Full264, focused54, boundary/Vertex79, protected/assembler/size41 đều PASS,0skip; worker typecheck/build/lint exit0. [Readiness](READINESS.json), [commands thực sự chạy](RUN_COMMANDS.json).

A2 đủ253/253 lượt,147UNSAFE/106SAFE: **zero observed send-eligible false PASS** trên frozen tested population/configuration;0SAFE thất bại,249 upstream requests,max1/retry0,0errors/timeouts. SAFE value-advice từng2PASS/1FAIL ở49 lần này3PASS; A2 inputs/verifier không đổi nên không quy cải thiện này cho owner prompt hoặc tuyên bố hết variance.

## Review cả cuộc thoại và actual terminal

Raw commit26b2cbea trước primary review; primaryc084e305 trước đọc rejected draft/verdict. Đã đọc đủ42 histories/66 actual outcomes với trusted hiện tại, viết nhận xét việc mua trước10 điểm chẩn đoán. Không keyword/fact-count matching, ép CTA/lợi ích mới/mua rẻ nhất; dẫn một số đo có mục đích, lời khuyên tự tin, lợi ích được dùng lại và upsell có ích vẫn được chấp nhận theo phạm vi owner đã duyệt. Đây là Codex primary review chủ quan/nonblind, không phải human/independent review hoặc owner acceptance;660 human ratings giữ null.

| Nhóm frozen | Đạt / denominator |
| --- | --- |
| concern | 22/23 =95,65% |
| partial | 11/11 |
| correction | 12/12 |
| policy | 14/17 =82,35% |
| simple | 3/3 |

65SEND_ELIGIBLE/1FALLBACK,0HANDOFF/NO_SEND; fallback1/66=1,52%. FAIL vì từng family phải≥90%. Nhóm tên **policy** trong corpus gồm cả r7-opacity-context-change;14 lượt còn lại đạt. Kết quả này không có nghĩa trả lời đổi/hoàn tiền sai.

| Outcome chưa đạt | Phần chịu lỗi | Finding cụ thể |
| --- | --- | --- |
| r7-opacity-context-change:1 | owner: mạch tư vấn | Sau khi shop đã chọn trắngM cho họp trong phòng, lịch chuyển sang đèn phía sau. Reply báo tồn/nguy cơ rồi “cân nhắc thêm”, chưa giải quyết lựa chọn mua cũ. |
| r7-opacity-context-change:2 | owner: mạch tư vấn | Hai facts đúng, nhưng không đưa hướng mua khi ưu tiên tránh lộ xung đột lựa chọn trước. |
| r7-opacity-context-change:3 | owner: mạch tư vấn | Tồn + nguy cơ vẫn để khách tự kết luận có nên giữ lựa chọn. |
| r5-competitor-price:2 | owner: mở rộng benefit; verifier chặn có căn cứ | Actual terminal là fallback. Chỉ sau primary commit mới xem draft: owner biến ít nhăn thành “không tốn công là lượt”; nguồn không xác nhận miễn là, prompt cũng phân biệt bớt công với miễn chăm sóc. VerifierFAIL/POLICY_OR_BENEFIT_STRENGTHENING/profile:ST411; không có evidence để nới verifier cho câu này. |

Không coi ba opacity replies là FAIL chỉ vì thiếu một cụm từ. Vấn đề whole-turn là shop chưa điều chỉnh lời khuyên của mình khi mục tiêu sử dụng đổi. Không bắt bịa sản phẩm thay thế: khuyên tránh món có nguy cơ đã biết là hành động bot làm được.

**Context:**17 captured owner requests thuộc policy có đủ các điều kiện độc lập/phí;39 owner requests có SM613 chứa mức “có thể thấy bóng áo lót”. Captured request của ca giá chứa chất liệu, kết quả gấp tương đối và hướng dẫn là/chăm sóc. Validator tái dựng toàn bộ381captured requests từ runtime projection, không evaluator-only labels. Không thiếu dữ liệu cần thiết cho4 lỗi đang xét; chưa kết luận nội bộ model bỏ qua vì attention hay một cơ chế suy luận cụ thể.

**Verifier:**1rejection có căn cứ ở chính draft, không phải timeout/malformed/permission/snapshot/recipient. Verifier không chấm chất lượng lựa chọn nên ba reply opacity đúng facts được cho qua là đúng phạm vi vai trò. Primary review không ghi nhận protected assertion ngoài phạm vi đã duyệt trong65 actual eligible replies; điều này không suy rộng thành qualification chung. Các ordinary advice về fit/phom/chỉn chu trong ngày được chấp nhận theo contract hiện hành, không tái áp một lệnh cấm từ “cả ngày/luôn/giữ form”.

## So49 và50

55→62/66;8FAIL→PASS,1PASS→FAIL. Ba lượt refusal sau mặc đi làm và một lượt hỏi hoàn tiền không còn tự nối quyền thử-đổi thiếu điều kiện; một lượt sân khấu giữ đúng mức có thể và đổi hướng mua. Hai lượt giá đưa giá trị sử dụng rõ hơn; một lượt giá trước bị chặn nay eligible nhưng một lượt khác mới bị chặn vì miễn là. Đây là khác biệt quan sát trên mẫu ít, scoring subjective; không chứng minh prompt là nguyên nhân duy nhất hoặc cải thiện ổn định.

Đối chiếu đáng chú ý nhất: r14-stage-light-change3/3 nói không nên lấy trắng khi khách hỏi thẳng “có nên lấy trắng nữa không”; r7-opacity-context-change0/3 vẫn chỉ QA khi khách hỏi “có lộ không/cònM không” trong cùng việc mua đang diễn ra. Source có đủ dữ kiện và owner prompt đã yêu cầu điều chỉnh lời khuyên, nhưng nghĩa vụ tiếp nối quyết định chưa được thể hiện nhất quán trong output.

Giọng nhìn chung đọc được và không liệt kê lại ba vòng. Vẫn có đoạn dài, “ghi nhận”, “giúp em”, lặp ngân sách và giọng quảng cáo ở r16-effort-and-use:2. Những tiểu tiết này được ghi finding; không tự làm cả case FAIL khi reply vẫn hợp lý, hữu ích và tự nhiên đủ trong toàn lượt. Chưa thể coi giọng đã tối ưu hoặc được owner chấp nhận.

## Hướng xử lý tiếp theo để owner xem

Tách đúng phần lỗi: ưu tiên owner theo dõi quyết định mua xuyên lịch sử, không nới verifier để cho qua miễn là. Nếu mở vòng mới, thử một thay đổi hẹp về cách trình bày việc mua đang tiếp diễn trong context/hướng dẫn owner: lời shop đã chọn gì, hoàn cảnh hiện tại đổi gì, quyết định nào cần tiếp tục. Đối chiếu các câu hỏi facts ngắn với câu hỏi chọn thẳng trong cùng lịch sử; đánh giá kết quả cả lượt, không bắt một câu mẫu hoặc tạo intent/obligation JSON, router/role/regex/repair mới.

Giữ phần policy theo câu hỏi đã cải thiện. Với giá, giữ lợi ích dùng lại và lời tự tin có căn cứ; giảm việc tự nối kết quả chăm sóc tuyệt đối để thuyết phục. Không thêm ban-list từ vựng sau từng lỗi, không phình prompt vì một câu, không đổi facts/labels/bars theo kết quả. Chưa chọn hay chạy treatment tiếp theo; owner quyết trước run mới.

## Vận hành, provenance và giới hạn

A2 verifier latency p50/p95=8762/13649ms; A3=7777/11709ms. Added verification=7781/11714ms; end-to-end=11991/17729ms. Tổng generation requests249A2+66owner+66verifier=381,max1 mỗi role/attempt,retry0,errors/timeouts0. Gemini input217978/output78229=candidate3300+thinking74929; verifier A3 input376865/output5344, A2 input1201277/output31172. Cost không được provider expose. Runner aggregate legacy dùng snake_case ghi owner tokens0; report/audit sửa tổng từ raw camelCase, không thay sealed runtime/raw.

A2 source9ede18d8; A3 sourceeab2c431; main296cdcfb; starting/specd1d3305d. Bốn raw hashes khớp commit trước review,1065 historical round/prompt files không đổi. Exact hashes/model/config/terminal IDs trong checkpoint/manifest/audit. Static fallbackV2 “Phần này em chưa trả lời được, chị nhé.” không hứa handoff thật; không recovery sau effect.

Strict git whitespace check báo7trailing spaces trong nguyên văn provider reply. Giữ bytes, dùng exception blank-at-eol chỉ cho artifact trích nguyên văn; source/new prose vẫn kiểm tra strict. Không có provider retry, missing slot, lỗi operational hoặc thay input sau result. Synthetic development population, stable model aliases, selectedN3 và review subjective chưa đo real-catalog validity, stability rộng, conversion, checkout/state/live handoff. **STOPowner**, không automatic51/post-A/merge/deploy/live send.
