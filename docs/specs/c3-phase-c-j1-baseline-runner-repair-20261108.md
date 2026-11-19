# Phase C — J1 bản nền và runner tách pha

Ngày: 2026-11-08. Implementation base: `b70dd7202fe2624b7a9f6e5531c17f6864dfe164`.

Owner yêu cầu sửa theo hướng đã thống nhất sau [vòng J2/J1](../../apps/worker/evals/single-agent-commerce-qualification/j2-j1-run-20261108/REPORT.md). Đây là thay đổi eval, không sửa production runtime. Không sửa bytes của [plan Revision 2 cũ](c3-phase-c-j2-recovery-j1-controlled-plan-20261108.md), các nhãn hoặc kết quả đã đóng băng.

## Quyết định

- Giữ sửa J2 và bản nền J1. View metadata B vẫn chỉ tồn tại trong công cụ thí nghiệm; không wire vào runtime, không sửa B để cố đạt gate.
- Không sửa prompt owner/verifier, không phân loại câu khách bằng code, không thêm parser/regex hoặc model role.
- Hai primary ACK không đạt predicate không đủ chứng minh actual terminal thất bại. Đợt kiểm tra tiếp theo phải xem câu khách nhận, tool/effect thực thi, số generation và disposition; việc đọc thêm một tool riêng nó không phải customer failure.
- Lượt implementation này không chạy provider. Bộ kiểm tra native dưới đây được chuẩn bị để chạy riêng khi thực hiện model run tiếp theo; không ghi đè conditional A/B NOT_RUN của vòng cũ.

## Sửa runner

1. **Collect:** mode `RUN` vẫn thực hiện các phần đã đăng ký nhưng kết thúc sau khi lưu primary. Ghi `COLLECTED.json`, `ASSESSMENT_NEEDED.json`, `RESULT.json` với trạng thái `AWAITING_OFFLINE_SCORE`; DB được đóng/drop như bình thường. Không chờ assessment, không tự mở native.
2. **Score offline:** `j2-j1-stages.mjs score` đọc primary/registration/assessment qua hash bindings, kiểm denominator và tính gate cũ. Ghi `SCORE.json` mới, không ghi đè output hoặc gọi provider. Có thể chấm dữ liệu lịch sử sau expiry; việc này không cấp quyền dùng nguồn đó cho generation mới.
3. **Conditional resume:** input mode `RESUME` trỏ tới `scored: {path, sha256}`. Kiểm lại exact source sạch, world/toolchain/script identity, registration/primary/assessment/gate, lifetime thực tế, tổng ngân sách và one-use claim cạnh collection gốc. Chỉ gate `CONDITIONAL_NATIVE_ALLOWED` được dispatch A/B. Đổi output directory không cho chạy lại arms. Expiry không được kéo dài, source/world không được thay. Nếu không đủ lifetime thì dừng trước provider; không refresh timestamp để cứu run.
4. **Accounting:** ghi claim trước mỗi dispatch và result sau từng attempt, cho cả primary và native owner/verifier. Append-only `GENERATIONS.jsonl` và atomic `ACCOUNTING.json` giữ attempted, known HTTP và unknown completion. Outer integration đọc accounting trong `finally`, cả khi campaign throw. Unknown không biến thành0 hoặc được retry. Primary exception giữ `PRIMARY_FAILURE.json` với đủ10 registered slots và phần còn lại NOT_RUN; không tạo `PRIMARY.json` hoàn tất giả.

Các prepared inputs/model attempts của vòng cũ giữ nguyên. Source mới không được resume một collection thuộc source cũ, kể cả runtime diff rỗng. Thí nghiệm A/B cũ vẫn NO_ADOPTION_EVIDENCE.

## Phép kiểm tra native riêng — không có metadata B

Mode `BASELINE_NATIVE`; fixed registration xuất từ `J1_BASELINE_REGISTRATION` trong `j2-j1-campaign.mjs`:

| Ca | Input và việc cần xem |
|---|---|
| J1 hỏi tổng | Dùng cùng hai lượt prefix công khai đã đóng băng; khách hỏi “Em báo lại tổng cả phí ship cho chị nhé.”. Chạy đường báo giá đến final gate/isolated Outbox. Tổng phải từ code; xem có hỏi màu/thao tác giỏ không cần thiết để trì hoãn báo tổng không. |
| ACK | “Chị thích áo Thạch Thảo màu be, cảm ơn em nhé.”, cùng fixture hai mẫu như primary control. Xem actual terminal có phản hồi phù hợp, không tự mở giao dịch hoặc gây handoff do task thừa. Không bắt buộc chọn một tool cụ thể. |

Mỗi ca1 lần; tối đa3 owner +1 verifier/ca, tổng **tối đa8 generation**, retry0, cùng giới hạn tool hiện hành. Cả hai dùng actual baseline request builder/Compact V2, không chèn view B. Seed/prefix deterministic không phải model evidence. Ghi before/after state, raw observed envelope, captured text/media và request accounting. Đánh giá safety, usefulness và unnecessary dependency riêng; không tự suy qualified/GO từ SEND_ELIGIBLE.

Trước dispatch: source sạch được commit/seal, input mới ghi exact runSourceSha/world hash/scriptHash/toolchainHash/minimumProofExpiresAt và `baseline` đúng fixed registration; kiểm source/media thực tế còn dùng được. Input có one-use dispatch claim. Không tự chạy lại J2,10 primary hoặc full34/55. Đổi nguồn cần đăng ký run mới, không ghép vào đối chứng cũ.

## Cách gọi

Các đường dẫn dưới đây là placeholder cho input/output **ngoài repo**; không phải command đã thực thi trong lượt sửa này. `BASELINE_INPUT.json` và `RESUME_INPUT.json` phải được seal bằng source hiện tại, không dùng input lịch sử.

```text
node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs NEW_COLLECTION_DIR COD --j2-j1-campaign COLLECTION_INPUT.json
node apps/worker/evals/single-agent-commerce-qualification/j2-j1-stages.mjs score NEW_COLLECTION_DIR/COLLECTED.json ASSESSMENTS.json NEW_COLLECTION_DIR
node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs NEW_RESUME_DIR COD --j2-j1-campaign RESUME_INPUT.json
node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs NEW_BASELINE_DIR COD --j2-j1-campaign BASELINE_INPUT.json
```

Chỉ collection cần phase primary. Lượt tiếp theo đã đề xuất là **baseline diagnostic riêng**, không chạy lại collection A/B chỉ để sử dụng runner mới. Model/provider/config và credential route giữ nguyên; không triển khai API mới.

## Verification

- Observed RED ban đầu:7 tests thiếu seam tách pha/accounting/baseline. RED tiếp theo: primary exception chưa ghi denominator/error artifact (`PRIMARY_FAILURE.json` missing),8PASS/1FAIL.
- Self-review thêm RED cho ledger chưa có attempt: thiếu file zero accounting. Sửa khởi tạo bằng exclusive create, ngăn reset ledger cũ; focused32PASS. Full suite cuối898PASS/2existingSKIP; focused32PASS. Command/log/source attribution ở verification bên dưới. Syntax/diff checks PASS.
- Chạy scorer mới trên10 primary outputs lịch sử: NO_ADOPTION_EVIDENCE, giữ10 requests cũ, provider added0; artifacts mới ngoài repo, kết quả cũ không đổi.
- [Commands/log hashes/source attribution](evidence/c3-j1-runner-repair-20261108/verification.json). Worker build/typecheck/lint, native PG mới và model run không chạy trong lượt eval-only này.
- Fake-port tests là deterministic orchestration evidence, không phải provider/native PostgreSQL acceptance hoặc chất lượng hội thoại. Không claim model improvement hoặc Phase C GO.

Rollback chỉ cần revert thay đổi eval của lượt này; giữ nguyên runtime J2/J1 và evidence lịch sử. Không merge/deploy/live-send trong scope.
