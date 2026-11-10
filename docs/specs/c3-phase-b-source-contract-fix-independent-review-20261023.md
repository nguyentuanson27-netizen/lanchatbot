# Phase B — independent review phương án sửa source contract

Ngày: 2026-10-23. Reviewer độc lập: `/root/review_fix_source_contract`. Reviewed clean HEAD: `ff18421c3720bb5858388bca451abfb1ec9225b9`.

**Verdict: APPROVE ở mức phương án.** Không tìm thấy P1/P2 mới chưa được hướng sửa xử lý. Đây không phải implementation approval hoặc model/quality evidence. Review chỉ đọc code và evidence; không sửa runtime, gọi provider, chạy model hoặc dùng credential.

## Phạm vi phương án được review

Proposal trong hội thoại mới hơn file plan của vòng trước:

1. Tách canonical executable source artifact khỏi SOURCE_AUDIT projection; validate full domain contract và product/trusted/clock/source bindings, không thêm defaults để che thiếu dữ liệu.
2. Prepare/validate đủ 17 controls trước request đầu tiên, freeze prepared bundle cùng source/schema/prompt/wire/outcome/binding hashes, dispatch đúng bundle; test fixture cuối invalid ⇒ 0 requests và bundle/source thay đổi ⇒ reject.
3. Native-first yêu cầu readiness đúng source/config; native-rest đối chiếu đủ 21 actual unique outcomes và whole-turn review, exit 0 không đồng nghĩa PASS. Giữ 46 = 21 + 25, không duplicate.
4. Chart dùng canonical brand và verified product/component/offer target có authority; không title-parser patch, forced SET/OTHER, bỏ brand gate hoặc alias SQ → SV. Không có chart đúng scope thì giữ handoff.

Giữ owner baseline, output namespace guard và media projection đã kiểm. Sau deterministic fixes: reuse 17 controls với archived candidate; controls PASS mới visual 4; candidate đáng giữ mới native 46. Không tăng population hoặc request budget.

Nguồn đối chiếu: [plan vòng trước](c3-phase-b-next-step-plan-20261023.md), [post-run review](../../apps/worker/evals/single-agent-commerce-read-only/output-feedback-run-20261023/POST_RUN_REVIEW.md), code và artifacts được dẫn trong các finding dưới đây.

## Những điểm phương án giải quyết đúng

- Sửa contract dữ liệu kiểm trước khi diễn giải kết quả verifier. SOURCE_AUDIT là projection báo cáo, không phải domain document.
- Chuẩn bị toàn bộ inputs trước dispatch, tránh gửi các ca đầu rồi mới phát hiện fixture cuối sai.
- Giữ 17 controls và 46 native, không loại attempt lỗi hoặc chạy thêm lượt để cứu kết quả.
- Tách chart authority khỏi ngôn ngữ tư vấn, không dùng parser hoặc alias đoán để làm size PASS.
- Giữ owner baseline và sửa output/projection đã có tests; không tăng role, retry hoặc recovery loop.

## Ba lưu ý triển khai

### 1. Chưa chứng minh có full historical snapshot để tái dựng controls cũ

`feedback-controls-20261023.mjs:17–23` đang ghép verifier capture lịch sử với SOURCE_AUDIT; `sales-media-run-20261023/source-audit.mjs:12–14` đã loại các trường cần thiết. Wire được runner chọn không chứa intents hoặc full catalog document. Không thể khôi phục nguyên dữ liệu bằng suy đoán.

Chọn rõ một đường:

- Tìm full canonical capture lịch sử có integrity/version phù hợp với trusted context và clock đã ghi.
- Nếu không có, tạo capture mới qua code/adapter không gọi model, lấy đầy đủ canonical document cùng trusted context, clock và bindings; đăng ký đây là world mới.

Không lấy catalog hiện tại ghép trusted/clock cũ, cập nhật timestamps cho facts cũ hoặc thêm intents rỗng để fixture hết throw. Giữ 17 mục đích/drafts; nếu nguồn mới không còn tạo được intended operation thì BLOCKED trước generation.

### 2. Chart phải có nhánh kết thúc khi không tìm được authority

`packages/business-tools/src/types.ts:101–122` không có brand hoặc offer/BOM identity trong StableProductDocument; `qdrant.ts:120–154` cũng không cung cấp chúng. `size-chart-target.ts:39–43` tự đặt brand và suy category/component từ tên.

Repo có đường producer giữ brand từ snapshot tại `realtime-product-facts-v2.ts:223–230`, nhưng đó chưa phải bằng chứng mapping LANA ↔ La.na Design hoặc chart SET/OTHER đúng offer/component cụ thể. `size-chart-extractor.ts:224` còn có default brand.

Chỉ nối target khi tìm được nguồn có authority và binding đúng. Không có thì giữ no-chart/handoff và ghi gap. Không để chart gap chặn controls feedback độc lập. Không lấy brand từ chính chart để target luôn khớp chart.

### 3. Readiness phải gắn với candidate thực chạy, không chỉ HEAD

`output-feedback-run-20261023/native.py:10–17` chưa biểu diễn đầy đủ readiness/config identity. Khi triển khai cần kiểm:

- Owner/verifier prompt, model/config, schema, corpus và executable source tương ứng.
- Candidate verifier đạt controls chính là candidate dùng ở visual/native.
- Restore baseline sau campaign cũ không cho baseline hưởng kết quả candidate cũ.
- Gate 21 actuals tham chiếu exact attempt/terminal artifacts và whole-turn review, không chỉ allowRest hoặc exit 0.
- Expected handoff/no-send đánh giá theo case, không ép mọi outcome thành SEND_ELIGIBLE.

Không cần framework hoặc hệ thống attestation mới; hash bundle và review tham chiếu đúng artifacts là đủ.

## Acceptance checks tối thiểu

1. Dùng lại full domain contract hiện hữu; projection thiếu intents bị reject trước request.
2. Fixture cuối sai ⇒ provider calls 0; prepared bundle/source/config đổi ⇒ reject trước dispatch.
3. Wire thực gửi khớp frozen wire, đủ bindings và không evaluator labels.
4. Cả 17 controls tạo đúng operation/reason/scope/type đăng ký; 8 SAFE eligible, 8 UNSAFE không eligible; probe giữ denominator. Không đạt ⇒ STOP, visual/native NOT_RUN.
5. Readiness sai config, thiếu/duplicate actual prefix outcome hoặc review sai source ⇒ native-rest không chạy.
6. Chart khác brand, parent, component hoặc offer vẫn bị từ chối; không có nguồn hợp lệ vẫn handoff.
7. Giữ tests output namespace, exact text/hash, permission/privacy, media scope và response-group authority.

Ngân sách không đổi: controls 17 + visual tối đa 8 requests; native tối đa 180 requests cho 46 lượt. Không thêm baseline campaign hoặc lượt xác nhận ngoài đăng ký.

**Cần cập nhật plan/todo theo proposal mới trước implementation**, vì file plan còn trạng thái và phần chart audit-only của vòng trước. Sau đó có thể triển khai deterministic fixes; chưa có bằng chứng kết luận chất lượng tư vấn hoặc Phase B đạt.
