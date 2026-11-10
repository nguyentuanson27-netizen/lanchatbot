# Vòng model với nguồn test đã bổ sung — 2026-11-04

Đã chạy đủ **33 ca / 48 lượt**, mỗi ca một lần, không retry generation. Đây là vòng chẩn đoán trên bộ development đã dùng trước; chưa chấm mù chất lượng, chưa phải Phase C GO hay bằng chứng thay C3.

| Kết quả thực tế trong harness | Purchase | Remainder | Tổng |
|---|---:|---:|---:|
| Ca / lượt đã thực thi | 21 / 28 | 12 / 20 | 33 / 48 |
| SEND_ELIGIBLE qua verifier + final gate | 17 | 8 | 25 |
| CODE_OWNED_SEND, hỏi thông tin checkout | 2 | 0 | 2 |
| HANDOFF im lặng | 8 | 6 | 14 |
| NO_SEND vì đã chuyển quyền xử lý | 1 | 6 | 7 |
| Text / ảnh được accepted Outbox | 19 / 14 | 8 / 7 | 27 / 21 |
| Generation records / generation HTTP | 68 / 68 | 32 / 31 | 100 / 99 |
| Verifier PASS / FAIL | 17 / 2 | 8 / 1 | 25 / 3 |

Không có NOT_RUN hoặc hard stop. Cả hai database test được harness báo đã drop sau khi awaited DROP hoàn tất; chưa có phép kiểm độc lập qua database catalog trong audit. Live send và ghi nguồn shop bằng 0. Text/ảnh trên là capture test khớp accepted Outbox, không phải đã gửi cho khách thật. 21/48 lượt không có phản hồi khách, tương đương 43,75%; không coi mọi handoff là lỗi chất lượng.

[Toàn bộ 21 hội thoại purchase](purchase/CONVERSATIONS.md) · [Toàn bộ 12 hội thoại remainder](remainder/CONVERSATIONS.md). Draft không gửi được lưu riêng trong hai file DRAFTS.md; các file này cũng chứa draft cuối của lượt được gửi, nên không phải danh sách lỗi.

## So với vòng trước

Cùng 33 ca / 48 lượt: vòng checkout-relaxation trước có 20 lượt trả lời (18 model + 2 code), 20 handoff và 8 NO_SEND; vòng này là **27 trả lời, 14 handoff, 7 NO_SEND**. Số ảnh tăng 8 → 21. Đây là cải thiện về số lượt có output, chưa phải tăng 7 ca đạt chất lượng. Mỗi ca chỉ chạy một lần, world mới và nguồn/cơ chế test đã đổi; không thể quy toàn bộ chênh lệch cho một bản sửa hay kết luận ổn định.

## 14 handoff và 7 lượt tiếp theo không gửi

| Ca / lượt (đánh số từ 1) | Quan sát trực tiếp | Phân biệt nguyên nhân |
|---|---|---|
| p04 / 2 | Verifier FAIL câu báo set váy size M 799k | Verifier không thấy SIZE_FIT hiện tại cho set; lời chọn size ở lượt trước không tự thành căn cứ hiện tại. Cần đối chiếu tính liên tục của fit theo áo/set; chưa kết luận verifier chặn sai. |
| p10 / 1 | Verifier FAIL danh sách “mẫu có họa tiết hoa” gồm Uyển Hoa | Nguồn mô tả họa tiết thổ cẩm; tên Uyển Hoa không xác nhận họa tiết hoa. |
| s11 / 1 | Verifier FAIL báo đủ 2 set váy L khi khách hỏi màu be | Tồn L không gắn màu; draft ngầm đáp ứng màu be chưa có căn cứ. |
| p06 / 1 | PREPARATION_UNAVAILABLE, OPENING_MEDIA_SOURCE cho SD023 | Nguồn ảnh mở đầu của combo ba món chưa đáp ứng; không phải verifier từ chối. |
| p07 / 1 | Hai recommend_size bị MULTIPLE_STATE_UPDATES; sau đó chỉ cập nhật chiều cao/cân nặng rồi handoff SIZE_RULE_UNAVAILABLE | Chưa có fit thành công; lỗi lập chuỗi/gộp thao tác trước khi kết luận thiếu quy tắc size. |
| j2 / 2 | recommend_size trả OUT_OF_RANGE, COMPONENT TOP, missingInputs rỗng | Code size không chọn được trong chart sau sửa cân nặng/số đo; không phải thiếu số đo hay verifier. Lượt 3 giữ quyền HUMAN. |
| s15 / 1 | MEDIA_SELECT lỗi MEDIA_COLOR_BINDING_UNVERIFIED | Ảnh màu be chưa có binding phù hợp; giả định trắng không bổ sung căn cứ cho be. |
| s03 / 1 | Owner handoff RESPONSE_UNAVAILABLE sau chuẩn bị ảnh mở đầu; không có toolResponses | Chưa có bằng chứng owner thử truy vấn ảnh cận ren theo yêu cầu. Không gán nguyên nhân này thành provider error hoặc thiếu ảnh đã được chứng minh. |
| s13 / 1 | OWNER_REQUEST_BOUND trước generation thứ 2, 0 HTTP cho generation đó | Request/context vượt giới hạn; record được giữ, không phải quota hay upstream outage. |
| j1 / 1; j4 / 1 | Mỗi ca một owner MALFORMED sau HTTP 200, finishReason MALFORMED_FUNCTION_CALL | Lỗi output/tool-call của owner, không phải lỗi kết nối; không retry. Hai lượt sau của mỗi journey NO_SEND vì HUMAN_OWNS_CONVERSATION. |
| s10 / 1; s12 / 1; j5 / 1 | ORDER_STATUS / DEFECT / ORDER_STATUS, handoff commit thành công | Handoff nghiệp vụ theo quy định. Hai lượt sau của j5 NO_SEND vì HUMAN_OWNS_CONVERSATION. |

Ba draft bị verifier chặn đều không gửi text hoặc ảnh. Verifier không chấm giọng, mức hữu ích hay hoàn tất bán hàng; 25 PASS không phải 25 lượt đạt chất lượng toàn câu.

## Nhận xét toàn hội thoại

Đã đọc toàn bộ 48 terminal captures, draft và chẩn đoán liên quan. Đây là nhận xét của primary, **không phải kết quả judge mù theo rubric**.

- Giá mua riêng áo/quần/chân váy đã trả lời được ở p01–p03; h02/s01 báo giá set và lựa chọn mua lẻ; s04 phân biệt trắng có sẵn với be đặt trước. Luồng mua riêng có thể tiến xa hơn trước.
- **p09 lượt 2 mất mạch:** khách đã nói “Bộ quần nhé”, shop lại liệt kê hai set và hỏi chọn quần hay váy. Verifier PASS vẫn để lọt lỗi hoàn thành tác vụ này vì không thuộc phạm vi protected semantics.
- **Checkout chưa hoàn tất:** j6 thêm giỏ thành công, sau đó code hỏi tên; khách chọn COD thì tiếp tục hỏi tên. Hai CODE_OWNED_SEND là clarification có receipt, không phải preview/đặt đơn thành công. p08 đổi set sang áo dừng ở hỏi màu, chưa chứng minh thay giỏ hoàn tất.
- **Giọng dài vẫn còn:** s06 kéo dài câu phối áo với quần nâu bằng nhiều tính từ; s08 chọn Diệp An rồi đưa Odette và hỏi lại; j3 lượt 2 giải thích phối đồ và phép tính tiết kiệm dài. j3 lượt 1 có câu hỏi “Chị thường mặc áo khoảng bao nhiêu kg”, lượt 3 có “Dạ vạ”. Các vấn đề này tồn tại dù đã bổ sung nguồn, không nên coi thêm dữ liệu là giải pháp duy nhất.
- p04/s07/j2 lượt đầu vẫn nhắc lại chiều cao/cân nặng trước chọn size. Cần đánh giá giá trị trong cả câu; không chấm lỗi bằng việc có keyword số đo.
- **s16 đã đi được đường chọn ảnh feedback trong test**, nhưng text gọi ảnh là “feedback khách mặc” trong khi asset thực tế là ảnh catalog detail được giả định lại. Chỉ chứng minh routing với giả định test, **không chứng minh ảnh khách thật, quyền sử dụng ảnh hoặc trải nghiệm thuyết phục bằng feedback thật**. Không đem câu này làm bằng chứng dữ kiện thật của shop.

## Identity, nguồn và giới hạn

- Clean executable source: `e14d26594bb8831909788007f92fba81b3cd54e4`. Không sửa runtime/prompt trong lúc chạy.
- Owner: Vertex AI `gemini-3.5-flash-lite`, version cùng tên, HIGH; verifier: OpenAI `gpt-6.1-sol`, HIGH, Codex CLI 0.159.2 bounded inference relay qua login hiện có. Generation config đầy đủ, hash prompt/schema/serialization/binding/corpus nằm trong [purchase identities](purchase/FROZEN_IDENTITIES.json) và [remainder identities](remainder/FROZEN_IDENTITIES.json).
- Owner prompt hash `fdb071bf6079af059819c1a984be80ca386ab2d92fb5988418271d08e450db2b`; verifier prompt hash `6ffaebf52151edca3baae03581e44731d727a29dc3b132e87c8dcc8f1ae5f944`. Giữ nguyên so với vòng trước.
- World hash `524aeac4caaa99c1042b4347f4f945a317ae3351cd1b304cdd11e5838b78f1d3`, 107 sản phẩm; capture 15:13:54 ngày 04/11/2026 giờ Việt Nam, POS snapshot 14:59:00. Không gia hạn clock nguồn để cứu lượt chạy.
- Initial-state hash `a2f67c01ce2a2466eae0f9b8d966fe5dd4daff89b33742cd43c9ed6fdd40489d`.
- Purchase registration `075142db8d413cd89e618a6769a05e208b2854d3d452cae80d0af0e38e5a38d4`; remainder `d765dec4abf80c2377ff43e5e3fd836948ce0d6cc4043d488c4439baa2a9333a`.
- N1, generation retry0; mỗi lượt tối đa 3 owner + 1 verifier; tối đa 1 generation HTTP mỗi registered generation; giữ cap tool và wire 65.536 bytes hiện hành. Hai online roles, không thêm role/layer/parser/regex/repair loop.
- Media không còn TTL tuổi ảnh, vẫn kiểm nguồn/approval/hash/revocation/binding. Shared chart SQ2447 cho component là quyết định test của owner. Dòng tồn SV2447-AO chưa có màu được giả định TRẮNG trong bản test; không sửa tồn/giá gốc hoặc coi hai parent là hai kho áo độc lập.
- Ảnh AO catalog detail được giả định feedback trong world test; active HANDOFF_MATRIX là bản test freeze từ candidate hiện có. Không phải cập nhật hay publish nguồn live.
- Source readiness trước run: **27 SALES_READY / 6 SOURCE_UNAVAILABLE**. Nhãn readiness không có nghĩa hội thoại chắc chắn thành công. Trước dispatch đã sửa 18 evaluator task.purpose kế thừa SHOP_GAP thành SALE khi nguồn đủ; giữ bản gốc và audit amendment. Không đổi lời khách/rubric sau khi xem kết quả. Model requests chỉ có runtime projection, không có caseId/cohort/expected/rubric theo firewall đã audit.

## Vận hành

| Chỉ số | Purchase | Remainder |
|---|---:|---:|
| Verifier latency p50 / p95, nearest-rank | 7,93s / 21,16s | 9,74s / 23,22s |
| Native verification + readback p50 / p95 | 10,61s / 27,49s | 12,15s / 29,84s |
| Input / output tokens quan sát | 686.088 / 53.823 | 315.802 / 26.734 |
| Generation status OK / MALFORMED / pre-dispatch failure | 68 / 0 / 0 | 29 / 2 / 1 |

Tổng token quan sát: 1.001.890 input, 80.557 output, 99 generation có usage. Không có generation transport timeout/upstream error trong 99 generation HTTP; 2/99 kết quả MALFORMED và 1/100 generation records bị chặn trước dispatch. Verifier 28/28 có verdict, timeout/error 0/28. Không gộp lỗi wire bound vào upstream error và không bỏ khỏi denominator. Cost không được expose. Native verification+readback là số đo thời gian đoạn kiểm tra, không phải đối chứng nhân quả end-to-end có/không verifier.

99 generation HTTP **không bao gồm** 2 owner-auth HTTP và auxiliary 1 OAuth + 2 embedding HTTP, được liệt kê riêng trong OPERATIONAL.json. Không có hidden generation retry; embedding policy và accounting riêng không phải generation. Không tuyên bố 99 là mọi network request của chiến dịch.

## Lệnh đã thực thi

Các lệnh dưới đây đều exit 0; full argv, thời điểm, SHA và exit của hai model jobs nằm trong [purchase command](evidence/purchase-COMMAND.json) / [remainder command](evidence/remainder-COMMAND.json). Helper paths dưới đây ở thư mục cha ngoài repo, có hash trong ARTIFACTS.json; không phải script mới trong production.

```text
python ../c3-test-sources-model-make-helpers-20261104-01.py
python ../c3-media-context-model-source-wrapper-20261103-02.py node apps/worker/evals/single-agent-commerce-qualification/capture-world.mjs ../c3-test-sources-model-world-20261104-01 ../c3-media-context-model-codes-20261103-02.json
python ../c3-media-context-model-source-wrapper-20261103-02.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-test-sources-model-initial-20261104-01 COD --phase-c-initial-world ../c3-test-sources-model-world-20261104-01/WORLD.json
node ../c3-test-sources-model-prepare-20261104-01.mjs
node ../c3-test-sources-model-purpose-amendment-20261104-01.mjs
node ../c3-test-sources-model-finalize-inputs-20261104-01.mjs
python ../c3-test-sources-model-launch-20261104-01.py
node ../c3-test-sources-model-purchase-accounting-20261104-01.mjs
node ../c3-test-sources-model-remainder-accounting-20261104-01.mjs
python ../c3-test-sources-model-report-20261104-01.py
```

Launch thực hiện actual-time preflight rồi chạy hai nhóm tuần tự. Không rerun generation lỗi. Việc này chỉ thêm evidence/docs/tasks, không thay executable nên không chạy lại build/lint/typecheck trong phần báo cáo; verification của source fixes có tài liệu riêng, không nhận làm test mới của lượt này.

## Trạng thái cuối

Input review APPROVED trước dispatch. Cả hai nhóm post-run accounting/capture đã APPROVED; final report accuracy được ghi trong evidence và SUMMARY.json. Audit giới hạn ở tính đúng của accounting/capture/provenance/báo cáo, không phải judge chất lượng hội thoại.

**Quality NOT_GRADED / Phase C qualification BLOCKED / C3 NOT_RUN.** Chưa có đối chứng model C3, S6/full 55 lượt, completed checkout end-to-end hay bằng chứng ổn định nhiều lần. Dừng sau vòng đã được yêu cầu; không tự sửa/rerun/merge/deploy.
