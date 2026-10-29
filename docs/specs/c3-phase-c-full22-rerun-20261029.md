# Phase C — chạy lại toàn bộ 22 hội thoại

Owner yêu cầu: “chạy toàn bộ 22 ca”. Base trước chuẩn bị: `262e6fe254e856a7faf06247f19c14c1324ea594`.

Giữ nguyên 16 SINGLE và 6 JOURNEY / 34 lượt khách của registration `../c3-phase-c-sealed-20261029-03/REGISTRATION.json`. Không thêm case, không sửa lời khách, lịch sử kịch bản, nhánh hay rubric sau kết quả. Mỗi ca N1; owner Gemini 3.5 Flash Lite HIGH và verifier GPT-6.1 Sol HIGH, prompt/runtime nghiệp vụ giữ nguyên. C3 và 24 SAFETY ngoài yêu cầu lần này. Corpus đã được quan sát: đây là development rerun, không holdout mới hay qualification PASS.

Runner diagnostic cũ chỉ chấp nhận 6 mục đích. Thêm đúng một scope cố định `FULL_NATIVE_22_20261029`, khóa thứ tự/case/turn/customer-script hash; giữ nguyên scope cũ. Trần 136 generation = 34 lượt × (tối đa 3 owner + 1 verifier), không phải số lần bắt buộc gọi model. Retry0; request lỗi vẫn giữ mẫu số. Handoff, verifier FAIL hay chất lượng kém không dừng toàn batch; source/freshness/privacy/unknown commit/accounting stop latch vẫn giữ. Không vá runtime hay prompt giữa run.

Trước inference: focused tests, self/independent review, commit sạch; lấy HEAD runtime làm runSourceSha, init config từ source đó; capture nguồn public read-only mới, giữ provenance của matrix handoff cô lập đã được duyệt; capture initial state qua real PostgreSQL không generation, đóng DB; kiểm lại exact scripts và toàn bộ22source bindings; review pending inputs; seal/preflight với Codex0.159.2 pinned. Tất cả raw/config/world nằm ngoài checkout, tạo một lần. Không live send/POS mutation/deploy.

Sau inference: bảo toàn mọi terminal của34lượt, draft bị chặn tách riêng, ghi accounting/request hashes/firewall/latency/token/errors/DB cleanup; review toàn bộ22hội thoại theo nhu cầu bán hàng thực. Không chuyển điểm cũ sang run mới, không tự chạy thêm. Qualification/C3 parity còn BLOCKED cho đến các gate riêng hoàn tất.

Chuẩn bị đã quan sát RED2 (`22 !== 6`) trước minimum GREEN8, gồm compatibility scope cũ, budget136, denominator/order/turn/mode rejection và stop latch. Lệnh và kết quả full focused/source seal/provider sẽ được ghi sau khi thực chạy.

Focused `node --test "apps/worker/evals/single-agent-commerce-qualification/*.test.mjs"`: 80/80 PASS. Hai `node --check` cho diagnostic/isolated integration và `git diff --check`: PASS. Independent GPT-6.1 Sol High `/root/full22_run_review`: APPROVE patch, tự chạy 16tests PASS (diagnostic/full population/candidate provider), syntax/diff PASS; xác nhận script hash khớp registration cũ, không production semantics mới. Review này chỉ bao phủ chuẩn bị, chưa input seal hay provider outcome.
