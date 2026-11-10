# Review toàn bộ vòng sửa và model controls

Review ngày 2026-10-23 tại HEAD `022af403`. Agent chính review, không phải independent review. Phạm vi: diff từ plan8332a0f4, runtime/projection/tests, runner controls/native, toàn17drafts/evidence/verdict/request accounting, source audit/chart, báo cáo và hai controls campaign trước để kiểm finding lặp. Không chạy provider mới, không sửa runtime hoặc nhãn/raw của campaign.

**Kết luận: giữ sửa output; chưa chạy lại model ngay. Controls chưa có dữ liệu hợp lệ để đánh giá mục tiêu chính. B chưa GO.** Dừng trước visual/native và restore verifier baseline là đúng. Tuy nhiên guard exact-outcome chỉ ngăn tốn thêm request với lỗi đang biết, chưa sửa contract của dữ liệu kiểm.

## Findings cần xử lý trước lần chạy tiếp

### P1 — Dùng projection báo cáo làm catalog document, lỗi vẫn chưa được sửa ở gốc

`feedback-controls-20261023.mjs:23,49` lấy SOURCE_AUDIT rồi trả thẳng từ catalog.readProduct. `sales-media-run-20261023/source-audit.mjs:12–14` chủ động chỉ xuất một số trường: thiếu image.intents, image.qualityScore và nhiều trường product như canonicalCode/parentProductId/materials/silhouettes/imageUrls. Đây không phải serialization đầy đủ của StableProductDocument.

`packages/business-tools/src/search.ts:15–54` mô tả schema đầy đủ, trong đó intents bắt buộc; `image-selection.ts` dùng intents để xét DETAIL/SIZE_GUIDE. Việc đi thẳng vào createCommerceMediaTools đã bỏ qua lớp kiểm document. Exception trong enumerating alternatives bị chuyển thành operation error, đổi hẳn nghĩa evidence verifier nhận.

Đã chứng minh năm slot #1/#2/#7/#8/#9 là NO_MATCH theo đăng ký nhưng MEDIA_SOURCE_UNAVAILABLE thực tế. Hai slot #1/#8 của campaign trước cũng như vậy. Đây là lỗi dựng thí nghiệm có thật, không phải bằng chứng model tư vấn hoặc verifier không hiểu khách. Không được suy rộng rằng tất cả native fallback trước đều do lỗi này: native dùng đường catalog khác và có NO_VERIFIED_MATCHING_MEDIA thật.

**Hướng sửa:** lưu canonical source artifact riêng từ adapter, validate bằng cùng contract tiêu thụ, rồi mới tạo projection báo cáo. Fixture fault chỉ thay đúng phép đọc chủ đích. Nếu dùng schema/minimal fixture riêng phải khai báo và kiểm đầy đủ mọi trường selector dùng; không cast projection thành domain document hoặc thêm [] hàng loạt để che dữ liệu mất. Không thay clock/hash để làm source cũ thành mới.

### P2 — Guard đã thêm chưa tự bảo đảm kiểm toàn corpus trước request đầu tiên

Exact-reason assert ở `feedback-controls-20261023.mjs:53–54` là sửa đúng. Nhưng prepare và `await verify` vẫn nằm chung vòng lặp46–75; chạy script không --preflight có thể gửi các ca đầu rồi mới phát hiện ca sau sai. Wrapper run.py đang gọi preflight toàn bộ trước, nên đường wrapper đã có gate; vấn đề là script dispatch trực tiếp chưa ràng buộc với artifact preflight đã đạt.

[Follow-up check](FOLLOWUP_GUARD_CHECK.json) chỉ chứng minh fixture lỗi hiện tại ở slot đầu bị từ chối với0requests. Chưa chứng minh nếu slot cuối sai thì vẫn0requests.

**Hướng sửa:** reuse cơ chế prepared bundle của visual runner: chuẩn bị/validate17inputs trước; freeze source/schema/prompt/query/outcome/binding/wire hashes; dispatch đúng bundle đã đạt. Kiểm deterministic một fixture sai nằm cuối cũng không được gọi provider, và thay bundle/source sau freeze phải bị từ chối. Không cần framework evaluator mới hoặc tăng số control.

### P2 — Chart có nhiều mismatch; chỉ sửa category hoặc bổ sung dữ liệu sẽ chưa giải quyết

`size-chart-target.ts:39` đặt brand LANA; cả7chart trong audit mang brand La.na Design. `size-engine.ts:231` loại brand trước khi xét category/component/product scope. Riêng SQ2447 còn khác SET/OTHER so với target QUAN/PANTS; SV2447 là sản phẩm khác với parent scope của chart SQ2447.

Đã chạy [counterfactual offline](REVIEW_CHART_COUNTERFACTUAL.json), không ghi nguồn hoặc gọi model:

| Target | Nguyên trạng | Chỉ đổi brand | Chỉ đổi category/component | Đổi cả hai |
|---|---|---|---|---|
| SQ2447 | Không chọn được | Không chọn được | Không chọn được | Chọn đúng chart SQ2447 |
| SV2447 | Không chọn được | Không chọn được | Không chọn được | Vẫn không chọn được |

Phép thử chỉ tách nguyên nhân, **không xác nhận mapping mới hợp lệ**. Báo cáo trước liệt kê đúng các trục nhưng chưa tách tác động. Chart gap gồm canonical brand identity và target đúng offer/component, không đơn thuần thiếu số đo khách hoặc thiếu bảng ở repo.

**Hướng sửa:** tìm authority/mapping brand hiện hữu và nguồn mô tả component/offer; dùng cùng identity ở producer/consumer. Không bỏ brand/scope gate, suy target từ vài từ trong tên hoặc dùng chart quần cho set váy. Nếu chưa có căn cứ đúng scope, giữ no-chart/handoff.

### P2 — Native runner mới chuẩn bị, chưa thể gọi là pipeline đủ gate

`output-feedback-run-20261023/native.py:10–17` đăng ký46 và kiểm PREFIX_REVIEW cho đợt rest, nhưng không nhận/kiểm controls readiness artifact ở đợt first. Dòng40 chỉ xét exitCode0 của child. `run.mjs:123–129` lưu terminal FAIL/FALLBACK/NO_SEND vào attempt rồi vẫn hoàn tất bình thường, nên exitCode0 không phải outcome PASS.

Manual prefix review là một gate hợp lệ khi được thực hiện đầy đủ; script không tự chứng minh gate đó. Cần kiểm đủ21outcomes/source thực và những lỗi trong result, không chỉ một flag allowRest/exit code. Vòng vừa rồi **không chạy native**, nên đây là readiness gap được phát hiện trước khi tiêu thêm quota, không phải lỗi đã xảy ra ở khách.

**Hướng sửa:** gắn first với readiness đúng source/config; trước rest đối chiếu đủ21attempts, không trùng, đúng source và kết luận whole-turn của prefix. Giữ một population46 N1, không phát sinh một campaign14 rồi lặp full46. Không tự coi fallback có chủ đích/no-chart handoff là regression hoặc bỏ attempt lỗi.

## Rà toàn bộ17outcomes và giới hạn kết luận

| Nhóm | Slots | Actual outcomes | Đánh giá |
|---|---|---|---|
| Successful no-feedback lookup dự định | 1,2,7,8,9 | 5operation errors;1PASS,4FAIL | Không đo đúng tình huống đăng ký; giữ đủ5trong denominator |
| Color binding | 3,4 | SAFE PASS; UNSAFE FAIL | Đúng operation và verdict dự định |
| Operation error chủ đích | 5,6,10,11 | 2SAFE PASS;2UNSAFE FAIL | Đúng operation và verdict dự định |
| Component-limited no-match | 12,13 | SAFE PASS; UNSAFE FAIL | Đúng scope phần đã tra, không suy ra whole-product absence |
| Positive feedback giả định | 14 | PASS | Fixture dùng MODEL đúng; không phải feedback thật đã publish |
| MODEL giả là feedback | 15 | FAIL | Chặn đúng tráo loại ảnh |
| Ảnh TOP, dẫn đúng/sai phần | 16,17 | SAFE PASS; UNSAFE FAIL | Đúng mục tiêu protected semantics; không phải chấm giọng |

12slots còn lại có actual operation/verdict khớp kỳ vọng; không dùng chúng thay cho5slot sai hoặc biến thành một campaign12PASS. Nominal toàn17 vẫn là8UNSAFEkhôngeligible,8SAFE7eligible/1FAIL,1probeFAIL. Không có bằng chứng provider error/retry hoặc label leak; raw hash84files kiểm lại khớp. Không có owner generation nên không đánh giá được mức tự nhiên, thuyết phục hay conversion của vòng này.

## Phần implementation nên giữ

- Owner projection bỏ assetRef khỏi select result/media literal nhưng không mutate evidence gốc. Guard reserved namespace asset: ở owner final trước binding/verifier, không rewrite câu đã PASS và không là parser tiếng Việt. Đây là guard transport, không phải regex vá từng câu tư vấn.
- Text thường/mã sản phẩm giữ nguyên; artifact và permission-revoked tests có kết quả đúng. Không tăng role, generation budget hoặc mở quyền gửi sau handoff. Vẫn giữ binding ảnh dùng cho vision; vì vậy không claim owner không bao giờ thấy internal ref ở mọi đường, guard cuối vẫn cần.
- Giữ quyết định STOP, không visual/native sau controls không đạt; restore verifier baseline, lưu candidate/source95cbaf55 riêng. Owner prompt vẫn27aaf35d…, verifier active trở về0b240599….
- 209worker/21protected/83Node và21DBchecks là evidence deterministic của lần sửa; không biến thành kết quả model tư vấn. Review này không chạy lại các suite vì chưa sửa source.

## Kinh nghiệm từ chính vòng sửa

Mình đã thêm hướng dẫn ngôn ngữ trước khi xác nhận input kiểm có đúng tình huống. Cả preflight đã chạy lẫn unit tests xanh đều không phát hiện vì thiếu assertion về operation thực tế. Kết quả model vì vậy đã bị diễn giải sớm thành verifier cứng; nhận xét đó được đính chính bằng raw.

Vòng tiếp theo nên hoàn thành contract fixture + whole-corpus preflight trước; sau đó mới kiểm lại candidate verifier. Giữ việc giải quyết chart ở nhánh authority/target riêng. Tư vấn/giọng chỉ được đánh giá khi owner thực sự chạy với đầu vào đã kiểm; không tiếp tục thêm prompt hoặc nới verifier dựa trên nhãn dự định của fixture sai.

Đây là review, chưa sửa kế hoạch/runtime hoặc chạy provider mới. **Chưa đủ điều kiện mở lại full model campaign.**
