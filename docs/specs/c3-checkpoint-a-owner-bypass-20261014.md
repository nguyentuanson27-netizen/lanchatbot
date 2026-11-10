# Quyết định owner: bypass Checkpoint A — 2026-10-14

**Trạng thái chuyển giai đoạn: OWNER_BYPASS.** Owner yêu cầu nguyên văn: “by pass check point A”. Quyết định này bỏ yêu cầu phải đạt Checkpoint A trước khi chuẩn bị giai đoạn tiếp theo. Không cần chạy thêm A2/A3 chỉ để mở bước lập kế hoạch B.

Đây là quyết định cho phép đi tiếp của owner; kết quả thử nghiệm không đổi thành PASS hoặc measured GO. Các giới hạn kiến trúc và quyền thực thi vẫn giữ nguyên. Không có flag/code bypass verifier hay final gate được thêm vào runtime.

## Bằng chứng được giữ nguyên

Decision base: `b961fcc74c016d34fc80d6ec81c7e5f4910cbdea`, branch `feat/c3-semantic-verifier-checkpoint-a-20261005`, draft PR390. Refreshed main/implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Spec SHA dùng cho các run đã hoàn tất: `3a12b167cff56ef839aa7160b5238c8bfd105e21`; addendum này không viết lại identity cũ.

| Evidence | Kết quả quan sát, không đổi |
| --- | --- |
| [A2 của prompt clear-boundaries](../../apps/worker/evals/single-agent-semantic-verifier/clear-boundaries-run-20261014/CHECKPOINT_A.md) | Đủ142lượt,91UNSAFE/51SAFE; zero observed send-eligible false PASS trên frozen tested population/configuration;5SAFE không gửi (9,80%). Population summary PASS nhưng mandatory prefix FAIL do protectedRef sai loại; qualification FAIL. |
| [Full42A3 có owner bypass A2](../../apps/worker/evals/single-agent-semantic-verifier/a3-owner-authorized-bypass-20261014/CHECKPOINT_A.md) | Whole-terminal primary38/42;39SEND_ELIGIBLE/3fallback stream; policy/simple dưới ngưỡng từng nhóm; A3FAIL. |
| [Recheck riêng3ca stream](../../apps/worker/evals/single-agent-semantic-verifier/a3-stream-recheck-20261014/CHECKPOINT_A.md) | FreshN1,3/3verifierPASS và primaryPASS,6requests,0stream error/fallback/retry. Không ghép thành41/42 hoặc thay kết quả full run. |

Raw, primary, corpus, prompt/config, scoring, source SHA, request accounting và recommendation STOP của từng run giữ nguyên. Bypass không tạo thêm bằng chứng về chất lượng ổn định hoặc replacement readiness.

## Phạm vi của bypass

Được chuyển sang lập kế hoạch Phase B theo [amendment §11](c3-semantic-verifier-boundary-amendment-20261005.md#11-post-checkpoint-a-architecture-compatibility) và [plan §11](../../tasks/plan.md#11-post-a-compatibility-skeleton--not-implementation-tasks). Điều kiện A phải đạt không còn chặn việc chuẩn bị kế hoạch đó.

Theo yêu cầu ban đầu, post-A cần kế hoạch riêng trước khi triển khai. Quyết định ngắn này chưa xác định phạm vi code B, nguồn/adapter được dùng hoặc thao tác ngoài repo, nên lượt hiện tại chỉ ghi quyết định và hướng kế hoạch. Không suy quyền triển khai toàn bộ tool/state/mutation/promotion, merge/deploy/live send hay mở rollout từ một lời bypass.

Những ranh giới tiếp tục áp dụng:

- Một conversational owner, tối đa một semantic verifier. Verifier chỉ xét protected-language semantics của exact final reply; không tool, retrieval riêng, state write, effect, rewrite hoặc send.
- Code giữ quyền về identity/truth/freshness/state/permission/effects/receipts/privacy. Mọi draft sống sót hard precheck vẫn phải qua verifier và final deterministic gate.
- FAIL/UNCERTAIN/malformed/timeout/provider error vẫn fail-closed. PASS cũ không cấp quyền trong snapshot, revision, recipient, permission hoặc dữ kiện đã đổi/hết hạn.
- Policy và dữ liệu sản phẩm thuộc nguồn đã xác minh; không hardcode quyền lợi/số đo vào prompt, không biến nhận định tư vấn thành facts mới.
- Không thêm third role, semantic router, generic Vietnamese parser, regex/template theo ca hoặc repair/reverify loop để thay cho hiểu hội thoại.

## Hướng kế hoạch B đầu tiên

Ưu tiên một lát cắt đọc-only để owner có dữ liệu shop thật khi tư vấn, chạy send-disabled:

1. Kiểm kê và tái sử dụng đường đọc policy/sản phẩm hiện có; xác định nguồn chuẩn, version, observedAt/expiresAt, identity sản phẩm/biến thể và phần dữ liệu cần bổ sung. Policy v2 trong corpus là snapshot đánh giá, không tự được coi là policy live.
2. Nối nguồn qua code/domain tools hiện có: policy, thuộc tính/ảnh/bảng size, giá/tồn và quote/fit khi có căn cứ. Kết quả code phải đúng khách/món/biến thể, giữ nguyên dữ kiện nguồn và báo rõ phần chưa có.
3. Đưa dữ liệu đó vào context owner và trusted snapshot verifier theo boundary đã có; nguồn đổi thì câu trả lời theo nguồn, không sửa prompt để đổi điều khoản. Xác định rõ cách xử lý correction và bounded refs trước khi gọi tool phụ thuộc; chưa tự mở persistence/mutation.
4. Giữ exact final text → mandatory verifier → final gate trong đường send-disabled; kiểm tra đối tượng, revision, freshness, policy/source swap, missing-data và lỗi provider tại chính boundary thay đổi. Không bắt lặp toàn bộ vòng A làm điều kiện mở B.
5. Tách persistence/mutation/receipts/recovery và qualification/promotion thành scope sau theo dependency của spec. Kế hoạch B cụ thể phải nêu file/interface thực sự đổi, checks, tiêu chí chấp nhận và giới hạn trước khi code.

Đây là hướng chuẩn bị kế hoạch, chưa là tuyên bố các adapter hoặc nguồn thật đã được nối. Không có provider generation hay live action trong lượt ghi quyết định.

## Finding còn mở để mang sang kế hoạch B

| Vấn đề | Điều cần xử lý tại boundary sở hữu |
| --- | --- |
| Verifier dùng evidenceRef thay claimId | Làm rõ output contract và tập ref hợp lệ; parser vẫn từ chối ref sai, không tự map/repair để nhận verdict. |
| Lỗi generation stream không ổn định | Phân biệt lỗi provider/relay/completion bằng request accounting; không dùng hidden generation retry để che lượt lỗi. Recheck3PASS chưa chứng minh lỗi được sửa. |
| Đổi hoàn cảnh nhưng chỉ báo facts | Giữ mục tiêu tư vấn bán hàng: từ rủi ro/ưu tiên đã biết đưa ra lời khuyên mua phù hợp; không bịa công năng của món/màu thay thế. |
| Giọng và bước tiếp còn thừa | Tránh đọc lại cả bộ số đo, giải thích ngân sách dài hoặc hỏi màu/size khi khách chỉ hỏi giá; review toàn lượt thay vì keyword. |
| Verifier calibration và độ ổn định | Những bất đồng policy/tư vấn và false PASS trong lịch sử vẫn là evidence; bypass không xóa trách nhiệm đánh giá các đường thực tế trước qualification/rollout. |

## Hiệu lực với spec và kế hoạch cũ

Addendum này supersedes riêng điều kiện “chỉ được lập post-A plan sau owner GO” ở amendment §11 và plan §§10–11 bằng quyền chuyển bước theo OWNER_BYPASS. Các chuẩn đánh giá GO/PASS, số liệu/recommendation lịch sử và mọi invariant runtime không bị sửa.

Lượt này chỉ cập nhật tài liệu/task/PR. Không code B, test model, thay cấu hình hoặc capability, merge, deploy hay send. Việc cập nhật quyết định không làm các command/build/test cũ trở thành kết quả mới của head tài liệu này.

Kiểm tra thực sự chạy: `git fetch origin main`/`git rev-parse origin/main` xác nhận SHA ở trên; `git diff --cached --check` exit0; `node C:/Users/nguye/AppData/Local/Temp/c3-checkpoint-a-owner-bypass-doc-check.mjs <repo>` exit0. Readback xác nhận10local links, chỉ5file docs/task đổi, frozen loader/input giữ nguyên, A2/A3/recheck cũ không đổi, provider generations0. Không chạy lại model tests/worker build/typecheck/lint cho thay đổi tài liệu này.
