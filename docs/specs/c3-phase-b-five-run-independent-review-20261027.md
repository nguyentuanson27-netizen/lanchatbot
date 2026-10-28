# Independent review — kết luận năm vòng Phase B gần nhất

Ngày: 2026-10-27. Reviewer độc lập: agent `five_run_conclusions_independent_review`, GPT-6 Astra kế thừa phiên cha. HEAD đã kiểm: `b7e197d8877c4643fba2f86121ac1f8ec87af21d`.

Đối tượng: `c3-phase-b-five-run-rootcause-review-20261027.md` và `c3-phase-b-five-run-rootcause-evidence-20261027.json` do parent tạo, cùng kết luận gửi owner. Chỉ review offline; không sửa bản gốc, runtime hoặc prompt; không chạy provider, không truy xuất nguồn shop live. File này ghi nhận phản biện, không phải approval cho implementation mới.

**Verdict: REVISE.** Số liệu, phần lỗi recovery/accounting và phần dữ liệu ảnh có căn cứ. Cần sửa hai kết luận trước khi dùng chúng để chọn cách sửa tiếp: nguyên nhân discovery chưa tính đủ giới hạn tool rounds; bằng chứng hiện tại chưa xác định verifier xử lý không nhất quán.

## Findings cần sửa

### [P2] Discovery: phải xác định bước bỏ lỡ trước khi kết luận handoff quá sớm

Vị trí trong report gốc: dòng 37–41, 55–57 và 113.

Actual requests của cả `quote-completion-run-20261027` và `quote-completion-repeat-run-20261027`, case `sales-discovery-advice:need`:

| Thời điểm | Điều owner thực sự có thể làm |
|---|---|
| Generation 1 | 2 tool rounds, 6 calls; owner ghi fitPreference và search |
| Generation 2 | 1 tool round, 4 calls; search đã trả V406, SQ748, SQ675 cùng availableOffers; owner chỉ đọc SQ675 |
| Generation 3 | 0 tool rounds, còn 3 call units nhưng callableTools chỉ có request_handoff; giá SQ675 1.279.000đ đã có, không còn quyền đọc SQ748 |

Trace nằm tại hai raw campaign `journey-openings/provider-requests.jsonl`, dòng 3 và 5. Source `apps/worker/src/single-agent-commerce-read-only.ts:183` cấp `toolsAllowed` theo `toolRounds < 2`; nhánh thực thi không cho dùng các call units còn lại như một tool round mới.

Report đúng khi nói PRICE_UNAVAILABLE không chứng minh mẫu vừa đọc thiếu giá. Nhưng “owner dừng” cần đi cùng thực tế: đến generation 3, việc đọc thêm đã bị contract chặn. Lỗi cơ hội xảy ra ở generation 2 khi chọn đọc một ứng viên chưa biết giá và không chuẩn bị ứng viên khác trong batch cuối. Giới hạn hai round làm sai lầm đó không thể phục hồi trong lượt hiện tại.

**Sửa kết luận:** “Owner đọc quá hẹp ở round cuối; sau đó không còn tool round để tìm phương án trong ngân sách. Reason handoff không mô tả đúng trạng thái này.” Không khẳng định biết giá SQ748 hiện hành nếu lượt đó chưa đọc. Việc vòng trước đọc được nhiều ứng viên cho thấy batch là đường khả thi, không chứng minh snapshot hiện tại có sẵn phương án đạt mọi nhu cầu.

**Tác động tới hướng xử lý:** chặn riêng PRICE_UNAVAILABLE ở generation 3 không tạo thêm dữ liệu hay quyền đọc; có thể chỉ chuyển handoff thành NO_SEND hoặc một lỗi terminal khác. Trước khi thay contract handoff, phải chỉ rõ đường hoàn thành trong ngân sách hiện có, hoặc terminal hợp lệ khi discovery chưa giải quyết được. Không mặc định thêm retry, tăng budget hay dựng router.

Phải tách ca này khỏi `sales-southern-delivery:deadline` vòng 5: actual OWNER_REQUEST dòng 16 còn tool đọc, generation đầu chưa read ETA đã handoff. Finding “chưa đọc đã kết luận thiếu ETA” vẫn giữ nguyên, độ tin cậy cao.

### [P2] Chưa đủ căn cứ đặt tên finding là “verifier chưa nhất quán”

Vị trí trong report gốc: dòng 67–73 và 116; kết luận gửi owner mục 5.

Đã đọc actual verifier requests của discovery tại raw `journey-openings/provider-requests.jsonl:7` trong ba campaign đầu, và verdict trong `provider-attempt-1.json`:

- Vòng 1 nói về **một mẫu SQ748**. Nguồn của chính mẫu có “quần short lưng chun”, “form suông”, “thoải mái khi vận động”; reply còn xin chiều cao/cân nặng để chọn size ở cuối. PASS.
- Vòng 2 nói “2 set ... không lo bó bụng”, mở phạm vi sang **cả SQ2447 và SQ748**. Nguồn SQ2447 mô tả tơ mềm, phom nhẹ, quần dễ mặc; không có căn cứ lưng chun tương ứng. FAIL.
- Vòng 3 cũng nói cho cả hai mẫu; violation chỉ rõ `protectedRef: product:SQ2447`, nêu lời bảo đảm cho Thạch Thảo thiếu fit. FAIL.

Cả ba không có SIZE_FIT và prompt verifier cùng hash là đúng. Tuy nhiên, ranh giới hiện hành cho phép nhận xét định tính từ cấu tạo/chất liệu và yêu cầu đọc toàn đoạn; khác chủ thể và phạm vi lời khẳng định là khác biệt nghiệp vụ quan trọng, không chỉ khác vài chữ. Có lời giải thích hợp lý rằng verdict khác do phạm vi claim khác. Chưa thể dùng ba lượt này để xác định tính thiếu ổn định của verifier.

**Sửa kết luận:** “Discovery có verdict khác giữa những draft/context khác nhau; chưa xác định đó là variance hoặc sai ranh giới. Cần đối chiếu đúng subject/phạm vi trước khi kết luận.” Giữ nguyên câu “PASS không chứng minh chất lượng bán hàng”, nhưng bỏ việc đưa verifier inconsistency vào nhóm root cause đã có bằng chứng.

Không kết luận ngược rằng PASS vòng 1 chắc chắn đúng hoặc mọi FAIL đều đúng: câu “không lo bị bó bụng” vẫn có thể gây tranh luận về fit cá nhân khi đọc trong ngữ cảnh. Điểm chắc chắn ở đây là **phép so sánh hiện tại không loại trừ khác biệt căn cứ hợp lý**. Vì vậy chưa đề xuất sửa prompt verifier từ finding này; không siết lại tư vấn cảm giác/định tính mà owner đã chấp nhận.

## Những kết luận giữ được

| Kết luận | Đánh giá độc lập |
|---|---|
| 255 native outcomes, 85 controls, 705 generation requests; bảng terminal | Giữ. Đã kiểm lại 20 file hashes trong ledger, đọc các ACTUAL_TERMINALS và đối chiếu counts. Không dùng số eligible như điểm bán hàng. |
| NO_SEND checkout không đồng nghĩa khách nhận im lặng | Giữ. Có code-owned question/preview; follow-up HUMAN không gửi là đúng. |
| Owner bỏ ưu đãi ship 30k ở 3/5 phản đối giá | Giữ. Đã kiểm record_negotiation tool results và replies cả năm; free shipping adjustment/current quote đã có. Đây là vị trí thất bại trong dùng dữ liệu, chưa xác định cơ chế nội bộ khiến model bỏ qua. |
| Handoff thiếu field chưa đòi evidence read tương ứng | Giữ ở mức cơ chế. `single-agent-commerce-handoff.ts:32` dùng reason và INBOUND_MESSAGE evidence; `:146` kiểm authority/policy nhưng không buộc read failure cho field. Không suy từ đó mọi handoff đều sai. |
| Bốn nhu cầu ảnh chưa có verified evidence; upstream chưa audit | Giữ đúng giới hạn. Không kết luận shop không có ảnh thật. Producer/consumer đã được nối trước; audit nguồn không có nghĩa mặc định refactor pipeline lần nữa. |
| Ba ca partial-source là controlled POS fault | Giữ. Không đưa chúng vào backlog “bổ sung dữ liệu POS thật”. |
| Counter sau recovery bị lệch và harness mất envelope | Giữ, độ tin cậy cao. Source cộng terminalHandoffCalls/toolCalls sau finish nhưng không cộng executedToolInvocations; validator V2 kiểm tổng này. Đã chạy lại synthetic check độc lập và quan sát TOOL_WORK_COUNTER. |
| Test coverage thiếu giao điểm V2 × ingress recovery | Giữ trong phạm vi test đã đọc. Các recovery tests `single-agent-commerce-ingress.test.ts:102` gọi fixture không truyền quoteTask; quote tests chủ yếu chạy tool/runCommerceTurn trước ingress recovery. Không claim đã chạy full test suite trong review này. |
| OWNER_TOOL_OUTPUT đã biết chính xác field lỗi | Không có claim này trong report; giữ UNKNOWN. Raw completion không đủ để chốt field/enum, không gọi HTTP200 là generation thành công. |

Các source liên quan lỗi recovery: `single-agent-commerce-read-only.ts:103`, `single-agent-commerce-ingress.ts:312`, `evals/single-agent-commerce-read-only/protocol.mjs:37`, `isolated-integration.mjs:430` và `:754`. Synthetic check chỉ chứng minh invariant bị phá với cập nhật đó; không khôi phục counters của original failed attempt và không phải replay end-to-end.

## Hai điều cần diễn đạt thận trọng hơn

**Tiến bộ quan sát được chưa tách riêng nguyên nhân.** Kết quả size đúng M ở bốn lượt sau và ảnh opening đủ ở hai lượt cuối là có thật. Tuy nhiên, thay đổi size gồm cả co-location **và** lời hướng dẫn owner/tool về inputFitPreference/alternativeSizes. Không nói chỉ co-location đã tạo cải thiện. Với quote_product, code có cơ chế cụ thể bảo đảm đọc/chọn ảnh khi tác vụ được gọi; sáu opening observations phù hợp với cơ chế này, nhưng vẫn không chứng minh owner luôn chọn đúng tool trong mọi tình huống.

**Năm vòng này không phải năm lần sửa giọng thất bại.** Diff owner prompt từ source vòng 1 đến vòng 5 (bỏ khác biệt line ending) chỉ thay phần size, media và quote operation. Các chỉ dẫn tư vấn bán hàng/giọng cốt lõi giữ nguyên; corrigendum trước quote còn ghi NO_PATCH cho advisory/style. Vì vậy có thể kết luận hạn chế tư vấn vẫn tồn tại trên cấu hình đang dùng, không thể lấy riêng năm vòng này chứng minh mọi cách sửa giọng trước đó đều vô hiệu hoặc quy nguyên nhân chắc chắn cho prompt dài/catalog marketing. Report đã ghi phần catalog là giả thuyết; nên giữ sự dè dặt đó trong tóm tắt gửi owner.

Đánh giá còn dài, khen nhiều, thiếu quyết định có ích là hợp lý khi đọc toàn reply. Theo owner, các lỗi hơi kém về giọng đang được tạm chấp nhận; không đưa chúng trở lại hard gate hoặc mở thêm vòng thay toàn prompt. Không mặc định chọn áo lẻ tốt hơn cả bộ, không coi upsell là sai chỉ vì khách phải trả thêm.

## Kết luận sau phản biện

Giữ ưu tiên lỗi counter/envelope và dữ liệu ảnh thật sự thiếu evidence. Giữ nhận định owner dùng kết quả nghiệp vụ chưa ổn, nhưng mô tả cụ thể bước thất bại thay vì coi “model không tuân thủ” là lời giải thích cuối cùng.

Với discovery, trọng tâm cần xác định là cách hoàn thành search/read/selection trong hai tool rounds; việc xác thực reason handoff phải đi cùng terminal hợp lệ, không trở thành một lớp chặn mới khiến hội thoại tệ hơn. Với ETA, owner chưa dùng tool dù còn khả năng đọc là vấn đề riêng. Với verifier, hiện giữ trạng thái chưa xác định, chưa đủ căn cứ ưu tiên sửa.

Review này hoàn tất bằng đọc file/source/raw artifacts, đối chiếu hashes/counts và một synthetic invariant check offline. Không có provider generations mới, worker test/build/lint mới, live reads, runtime edits hoặc deployment. Không claim toàn bộ nguyên nhân hành vi model đã được chứng minh.
