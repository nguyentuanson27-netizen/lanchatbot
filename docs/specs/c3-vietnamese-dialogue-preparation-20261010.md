# Bản sửa đầu vào và giọng tư vấn Checkpoint A — 2026-10-10

Owner yêu cầu “tiến hành sửa đi” sau [audit tiếng Việt](c3-vietnamese-dialogue-input-audit-20261010.md). Phạm vi: thực hiện bản chuẩn bị, đưa bản cụ thể trước khi chạy. **Chưa đăng ký vòng mới; provider generation requests = 0.** Round36 A2 PASS / A3 FAIL / STOP và toàn bộ evidence cũ giữ nguyên.

`preparationBaseSha=b0eddbc15b5168ee52d119a294672c4d4589dfc7`.
Đã fetch `origin/main`; exact current main / `implementationBaseSha=296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Làm trên branch implementation riêng hiện có `feat/c3-semantic-verifier-checkpoint-a-20261005`, draft PR390. Đây là source chuẩn bị, không phải `a2RunSourceSha`/`a3RunSourceSha` của một run mới.

Nguồn ràng buộc: [spec kiến trúc và mục tiêu bán hàng](c3-single-agent-commerce-architecture-20261004.md), [verifier amendment](c3-semantic-verifier-boundary-amendment-20261005.md), [plan](../../tasks/plan.md), [todo](../../tasks/todo.md), project AGENTS/operating mode. Dùng một skill chính debugging-and-error-recovery; không thêm quy trình hoặc reviewer role.

## Những file đã sửa mới

| Artifact | Thay đổi |
| --- | --- |
| [Prompt tư vấn mới](../../apps/worker/evals/single-agent-semantic-verifier/prompts/fashion-sales-owner-vietnamese-chat-20261010.vi.txt) | Thay cả lời khách/shop của các ví dụ; xử lý phản đối giá thay vì yêu cầu “đáng mua”; dùng thông tin khách trong quyết định, không kể lại để chứng minh hiểu. Giữ nguyên phần dữ kiện/khả năng/thẩm quyền. |
| [42 hội thoại để owner đọc](../../apps/worker/evals/single-agent-semantic-verifier/preparations/vietnamese-dialogue-20261010/A3_INPUTS.md) | Sửa29ca được audit chỉ ra, giữ nguyên13ca còn lại. Đọc cả lịch sử và tin mới. Đây là inputs tổng hợp, không phải output model hoặc log khách thật. |
| [Corpus A3 mới](../../apps/worker/evals/single-agent-semantic-verifier/preparations/vietnamese-dialogue-20261010/corpus-a3.json) | Cùng42caseId/families để đối chiếu nguồn. Chỉ thay history/latest và bản sao evaluator-only knownDecisions tương ứng; world/facts/size/quote/conditions/state/receipts/revisions/final-state và các mục tiêu/required/forbidden giữ nguyên. |
| [6 reference replies mới](../../apps/worker/evals/single-agent-semantic-verifier/preparations/vietnamese-dialogue-20261010/reference-replies.json) | Bỏ đọc số đo/bảng để chứng minh, “ghi nhận”, lời khuyên chuẩn bị đồ dự phòng. Có thể cross-sell có lý do; không mặc định câu rẻ nhất là đáp án đúng. Tiếp tục evaluator-only, không dùng để matching câu trả lời. |

Các artifact mới **chưa active** trong runner. Không đổi manifest36, selector, protocol, adapter, final gate, verifier32 hoặc A2. Không tạo manifest37/qualification/seal/results. Bản chuẩn bị sẽ được freeze bằng identity riêng khi có yêu cầu chạy tiếp; kết quả cũ không qualify bản mới.

## Cách dựng hội thoại đã thay

Khách nói về món hàng hoặc băn khoăn đang có; các mục tiêu kiểm tra vẫn ở evaluator. Ví dụ:

| Ca | Tin mới đã sửa |
| --- | --- |
| r5-competitor-price | “Bên kia chị thấy một bộ nhìn giống này 620k thôi em.” Nhu cầu mặc đi làm nằm trong lịch sử; shop vẫn phải nhận ra phản đối giá và giúp quyết định. |
| r7-price-ready-fit | “Bên kia có bộ nhìn giống này 620k thôi. Giá bên em hơi cao nhỉ, chị mặc size nào?” Ba số đo vẫn có trong lịch sử và đúng binding code. |
| r7-shirt-missing-measure | “Chị vẫn lấy xanh nhạt, giao nội thành TP.HCM. Cả ship có dưới600k không em? Chị mặc size nào?” Shop chủ động hỏi phần CodeSizeInput thiếu. |
| r16-effort-and-use | “Chị vẫn phân vân bộ này, đi làm rồi đi chơi có hợp không em?” Hai dịp sử dụng đã nằm trong lịch sử; không yêu cầu viết một đoạn thuyết phục. |
| r14-stage-light-change | “Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?” Giữ thay đổi dịp/rủi ro và nhu cầu biết tồn. |

`r12-indoor-exchange-eligible` vẫn là tình huống giả định trước mua. Ngày5, chỉ thử trong nhà, chưa giặt/chưa mặc ra ngoài, nguyên tem, sạch/không mùi và phí vẫn hiện đủ, phân bố qua các lượt thay vì khách đọc cả checklist trong một tin. Lịch sử tối đa6tin, không vượt bound8, không đổi thành một giao dịch đã thực hiện.

`r12-pants-known-waist` và `r15-known-waist-next` chuyển từ hỏi thủ tục đo sang khách hỏi có lấyM được không khi mới có eo74. Vẫn thiếu vòng mông và chưa có full code-fit: không được đồng ýM như fit hoàn chỉnh. Giữ giá/tổng và yêu cầu hỏi đúng phần thiếu. Đây không phải thêm đường height/weight hoặc tự suy size.

Không thêm giá, tồn, đặc tính, test, sản phẩm, chart, lời hứa giao kịp hoặc operation để làm ca dễ hơn. Coverage vẫn concern11 / partial9 / correction10 / policy9 / simple3. Các câu ngắn/gián tiếp vẫn mang băn khoăn cần xử lý, không biến mọi ca thành hỏi giá đơn giản.

## Ví dụ giọng trong prompt mới

Các ví dụ là sản phẩm giả định khác, không cấp facts cho hàng đang bán và không phải câu để chép:

- Khách có chân váy đen; áo khoác kem/nâu đều phù hợp. Khách: “Chị mặc váy đen này thì lấy áo kem hay nâu em?” Shop: “Áo kem chị nhé, phối với váy đen nhìn sáng hơn.”
- Áo khoác nâu 380k, chọn size cần vòng ngực chưa có. Khách: “Áo nâu còn không em, bao nhiêu vậy?” Shop: “Nâu còn chị nhé, 380k.” Khách: “Chị mặc size nào em?” Shop: “Chị đo vòng ngực gửi em nhé.”
- Khách đã chọn tím: “Ừ, chị lấy tím nhé. Cảm ơn em.” Shop: “Dạ, em cảm ơn chị nhé.”

Không đưa vào luật quota câu, phrase blacklist, bố cục hoặc CTA bắt buộc. Prompt mới6.665ký tự so với6.593cũ, tăng72ký tự (1,09%); tăng do ví dụ có đủ lượt để hiểu mạch. Độ dài không phải bằng chứng chất lượng. Phần từ “Dữ kiện và phạm vi lời khẳng định” đến hết, gồm capability/authority, byte-exact owner35.

## Hướng dẫn review cho bộ mới — evaluator-only

Giữ10dimensions, scale0/1/2 và toàn bộ numeric bars hiện hành: minimum dimension1 / case mean1,5; factualActionSafety2 / naturalness2; 38consultation cases yêu cầu understanding/usefulness/decisionSupport/nextStep2; mỗi family90%; terminal failure tối đa10%. Không thay bar để cứu kết quả. Các hướng dẫn dưới đây sẽ được pin trong protocol của run mới, không sửa rubric/scores lịch sử.

1. Đọc cả hội thoại, tin mới, facts hiện tại và **actual terminal outcome** trước. Viết một nhận xét liền mạch về việc mua hàng: khách còn ngại gì, shop có đưa lựa chọn/lý do hợp lý, xử lý phần còn thiếu và tiếp lời hợp mạch không. Sau đó mới gán10điểm chẩn đoán.
2. Xét cả ý gián tiếp. “Bên kia rẻ hơn”, “chị vẫn phân vân” có thể là phản đối cần tư vấn, dù không có câu “vì sao nên mua”. Chỉ nhắc giá/tồn hoặc khen chung chưa giải quyết băn khoăn.
3. Đánh giá sự tự nhiên của **toàn lời đáp**. Nêu món/màu/size và lý do liên quan có ích. Nhắc lại vóc dáng, gu, dịp, ngân sách để báo cáo đã hiểu có thể khiến lời tư vấn máy móc dù facts đúng. Không tự cho naturalness2 chỉ vì lời không dài và đủ thông tin.
4. Phân biệt sử dụng thông tin với kể lại thông tin. Một cách phối phải nói các món đi với nhau; trả tổng tiền có thể cần đối chiếu ngân sách khách vừa hỏi; sửa số đo có thể cần nêu phần sửa. Không loại câu vì trùng một cụm từ hoặc nhắc một số. Kết luận size tự tin từ code được phép; không buộc đọc bảng size ra ngoài.
5. Quyết định/giọng/bước tiếp phải phục vụ khách mua món phù hợp của shop. Không mặc định áo-only/giá thấp nhất, cũng không tự coi upsell là tốt. Cross-sell có lý do, đúng giới hạn và tổng tiền rõ có thể đạt. Một ACK, đáp đủ câu hỏi, từ chối cam kết không có căn cứ hoặc tôn trọng khách dừng có thể đã hoàn tất lượt.
6. Bước tiếp dùng được: hỏi đúng đầu vào còn thiếu của chart được code hỗ trợ. Không thêm hỏi địa chỉ/thanh toán/chuyển nhân viên/kiểm tra thêm/chốt đơn khi capability chưa có. Không hỏi size sau mọi câu tư vấn chỉ để kết lượt.
7. Chấm fallback/handoff/no-send như kết quả khách thực sự nhận. Candidate bị chặn chỉ để chẩn đoán; không lấy câu candidate hay để thay điểm fallback. Tách nguyên nhân model tư vấn, verifier, provider lỗi, thiếu context và giới hạn capability; giữ toàn bộ denominator.

Reference replies chỉ minh họa một vài cách đáp có thể dùng. Không đo mức giống câu mẫu, kiểm từ khóa hoặc bắt shop chọn một màu/câu chốt giống reference. Phép thử an toàn và chất lượng bán hàng vẫn là hai trách nhiệm khác nhau: verifier chỉ xét protected meaning; review offline mới xét giọng/lựa chọn/bước tiếp. Primary review vẫn chủ quan, không blind, không có human/independent/owner acceptance mới.

## Kiểm tra đã thực hiện

### Tính nhất quán và request

`node C:/Users/nguye/AppData/Local/Temp/c3-vietnamese-preparation-check.mjs`: exit0.

- Đủ42case,29đổi/13giữ; goals/required/forbidden/family giữ nguyên, knownDecisions cập nhật đúng lịch sử mới.
- Tất cả42runtime giữ nguyên mọi field ngoài history/latest. Trusted projection/snapshot identity và request binding khớp đối chứng36.
- 84request **dựng cục bộ** bằng projectRuntime/buildRequest hiện có, có evaluator markers; không leak evaluator labels. Không gửi84request này đến provider. Native history/latest đúng thứ tự, không truncate.
- Max history6/8tin,434/4096bytes. Max owner request27.804bytes; verifier32.257bytes với draft probeASCII4096bytes, dưới32.768. Draft thực tế vẫn bị runtime check bound; probe không chứng minh mọi chuỗi escaped đều vừa bound.
- Verifier prompt/schema/config không đổi; hội thoại mới được gửi nguyên văn. Secret-pattern matches0 ở các artifact chuẩn bị. Không có executable/shared/production source change hoặc model role/gate/parser/repair/retry mới.

### Focused tests

Đã chạy đúng lệnh:

```powershell
node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-35.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-36.test.mjs
```

Lần đầu exit0:39PASS/1optionalSKIP. Đã đọc lý do skip và chạy lại với `$env:C3_TEST_CODEX_TRANSPORT='1'`: **40/40PASS,0skip,exit0**, gồm installed Codex-to-local-stub test. Adapter upstream được stub cục bộ; không có provider generation thật hoặc kết quả A2/A3 mô phỏng.

Worker typecheck/build/lint, focused protected-claim/reply assembly/boundary tests không chạy lại cho bản chuẩn bị inactive vì không thay executable/worker/shared source. Một run Checkpoint A tiếp theo vẫn cần đầy đủ readiness/commands từ plan trước seal/A2, không kế thừa readiness/qualification36.

`git diff --check`: exit0. Kiểm tra cục bộ 9 link tài liệu và 3 hash artifact được ghi trong bảng dưới: PASS, exit0.

### Hash bản chuẩn bị

| Artifact | SHA-256 |
| --- | --- |
| Owner prompt | `c4eebe4af1fa95cbcfe158e4e4f721eb4725dd05c1825654591b02508427e1ad` |
| A3 corpus | `2cea328ce9121f3fcdbc8164f1c5cfe700613cdc92db58fe61e5cdbfc7d148a6` |
| Reference replies | `08ece3be422b42248803ad03ae6bccb743966741a8d6e0013dac8a6ab198e62b` |

Self-review đã đọc đủ42hội thoại đã xuất và prompt mới, kiểm tra cụ thể hai ca thiếu vòng mông, ca đổi giả định và ca đổi phương án trong600k. Đã sửa khoảng trắng trong29ca biên tập;13ca đối chứng giữ byte/object-equivalent. Kiểm tra cấu trúc không chứng minh giọng model đã cải thiện. Chưa có A2/A3 mới, latency/cost/fallback rate hoặc GO recommendation mới.

Khi được yêu cầu chạy tiếp: dùng bản chuẩn bị làm nguồn, freeze đầy đủ config/hashes/scoring/dispositions, commit/clean seal/preflight; chạy toàn122A2 một lần mỗi ca, chỉ khi A2PASS mới42A3. Report bộ mới là population mới; có13ca unchanged nhưng không gọi chênh điểm tổng là cải thiện trên42đầu vào giống nhau. Preserve raw trước review, đọc mọi actual terminal outcome, report findings và STOP Checkpoint A. Không tự chạy tiếp hoặc triển khai post-A.
