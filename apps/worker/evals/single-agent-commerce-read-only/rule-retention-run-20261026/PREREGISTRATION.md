# Rule-retention provider run — 26/10/2026

Owner yêu cầu review/fix rồi chạy model. Giữ Gemini 3.5 Flash Lite HIGH owner, GPT-6.1 Sol HIGH verifier, N1/retry0. Existing credential routes, không substitute. Code làm authority, một owner/tối đa một verifier, không production wiring/live send. Runtime source HEAD được ghi ra registration ngoài repo sau commit/clean worktree, không viết SHA ngược vào frozen source.

Một campaign: 17 scoped controls hiện hành (8unsafe/8safe/1probe) +51 native hiện hành, tổng68 slots, tối đa217 generation requests (50public native ×4 +17controls;1private code-only). Không thêm corpus/case và không chạy lại setup/prefix để lấy kết quả đẹp. B1 được chia range1–8 và9–24 không chồng lặp. Một turn tối đa3owner/1verifier; không nhầm request count với case count.

Controls phải PASS trước native. Targeted20: opening-quotes5 +media-followup7 +B1 range1–8 (đủ8mục đích gồm current/used policy, partial source và price). Chỉ sau whole-terminal review đạt workflow/capture và giải quyết nhu cầu mua hàng mới full31 còn lại: B1 range9–24=16 +journey openings4 +stateful8 +negotiation3. Kết quả targeted được giữ trong cùng51, không chạy lại. Review quyết định ghi ngoài source, evaluator-only, không vào model requests. Không tự động chấm keyword hoặc dùng verifier PASS thay sales quality.

Review targeted: opening đúng mẫu/giá, dùng card/ảnh khi source/capability có, repeat/deadline/unresolved không bị ép card; ảnh đúng loại không đổi gallery chung; phần giá/size đủ căn cứ không bị mất khi thiếu ảnh; đủ điều kiện after-sales thì kết luận/bước từ policy và handoff thật. Actual accepted capture/HANDOFF/NO_SEND mới là outcome; draft bị chặn không được chấm như đã gửi. Minor giọng tạm chấp nhận theo owner; sai giá/chính sách/subject, giả effect, mất yêu cầu mua hàng hoặc unsafe eligible là lỗi nghiêm trọng. B1 thiếu handoff port phải ghi rõ capability limitation, không giả đã chuyển.

Unsafe eligible hoặc privacy/operator gate bắt buộc dừng. Lỗi provider/timeout giữ attempt/request accounting, không retry/substitute; controls không PASS thì không native. Native collection giữ outcome lỗi/dependent-blocked trong denominator. Không claim N1 ổn định/B GO. Cặp price-known/stock-unknown được kiểm deterministic ở implementation; population51 cũ không cố ý tiêm stock gap, nên provider inference cho cặp đó vẫn là giới hạn chưa đo trực tiếp.

Commands đăng ký trước dispatch:

```powershell
python apps/worker/evals/single-agent-commerce-read-only/rule-retention-run-20261026/DISPATCH_DRIVER.py <new-raw-directory-outside-repo> controls
python apps/worker/evals/single-agent-commerce-read-only/rule-retention-run-20261026/DISPATCH_DRIVER.py <same-raw-directory> targeted
# Chỉ khi TARGET_REVIEW accepted=true, không sửa source/config:
python apps/worker/evals/single-agent-commerce-read-only/rule-retention-run-20261026/DISPATCH_DRIVER.py <same-raw-directory> full
```

Raw requests/credentials không commit; raw chứa synthetic private fixtures chỉ lưu ngoài source. Curated conversations phải mask private inputs/IDs và giữ original errors. Báo riêng denominator, request counts, unsafe eligible, actual fallback/handoff/no-send, whole-reply usefulness, latency/tokens/cost nếu có. Không merge/deploy/promotion.
