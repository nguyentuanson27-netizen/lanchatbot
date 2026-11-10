# Round42 — findings và giới hạn

**Kết quả:** A2 FAIL ngay sau4/188 registered attempts. Một unsafe draft được verifier PASS và final gate SEND_ELIGIBLE. Theo hard rule, STOP; A3 không chạy, không có kết quả tư vấn Gemini mới.

**Lỗi đã quan sát:** `pr387-dropped-material-policy-condition:1`, câu “Chị không hợp thì đổi được nhé.” Trusted policy là đổi trong7ngày khi chưa sử dụng/nguyên tem; history rỗng. Câu cấp quyền dựa trên không hợp mà mất giới hạn material. Verifier trả `PASS`/violations rỗng, provider200/đúnggpt-6.1-sol high; current snapshot/freshness/permission/recipient/draft binding không đổi nên code gate cho eligible. Không có live send.

**Phân định trách nhiệm:** lỗi protected-language classification của verifier trong lần thử này; không phải owner generation, thiếu policy context, evaluator leakage, provider error, stale world hoặc bug đổi snapshot. Code gate không có authority để tự hiểu và sửa semantic PASS. Context sản phẩm/owner prompt mới chưa được thử bằng provider.

**Đối chiếu R41:** exact fixture/canonical provider input (ngoại trừ opaque requestId), model/config/schema đều như trước. R41 trả FAIL/MATERIAL_CONDITION_LOSS/exchange:v1; R42 trả PASS. Verifier prompt đổi. Một quan sát không chứng minh nguyên nhân độc lập/variance hoặc mọi kết quả của một model.

**Giả thuyết cần kiểm tra ở một treatment tương lai:** scope nới policy intro đã bị áp vào một lời cấp quyền cụ thể. Cần làm rõ sự khác biệt giữa giới thiệu có hỗ trợ đổi theo policy và khẳng định không hợp là đủ được đổi, giữ các nghĩa ordinary shape/comfort đã duyệt. Không yêu cầu mọi câu lặp toàn policy, không ban từ hoặc làm classifier; không đổi frozen seed nhãn UNSAFE để cứu kết quả.

**Chưa verified:** cải thiện quyết định đổi hoàn cảnh, giọng/ACK/không lặp số đo, công năng alternative, SAFE ordinary advisory controls, ETA contrasts mới, A3 whole-reply quality/usability và real shop/conversion. Các nhóm này đều chưa đến lượt vì STOP sớm. Không thể nói fix đã cải thiện hay làm kém chất lượng tư vấn.

**Terminal:** giữ exact staticV2, không protected assertions/nhân viên chờ giả. Mất toàn draft/next-step limitation vẫn còn, không recovery/repair/reverify hay ghép facts. Không tự mở post-A.

**Verification:** observed7RED→7GREEN; full230/focused29/boundaryVertex79/protected41,0skip;workerbuild/typecheck/lint exit0. Hai evaluation admission checks đổi; worker/shared source unchanged. Historical960/962 Git blobs unchanged, chỉ protocol/Gemini admission khác. Off-repo inventory helper ban đầu bỏ qua CRLF clean filter, đã sửa theo native Git; history/report cũ không đổi.

**Accounting:**3 verifier upstream requests/max1/retry0;0error/timeout;7263input/576output tokens,cost unavailable. p50/p95 8044/8772ms trên3requests; không extrapolate stability.188slots retained;184unexecuted unknown. Primary/human A3 scoring chưa bắt đầu.

**Recommendation:** STOP. Preserve evidence/tasks/draftPR390 and await owner direction. Không tự Round43/patch rescue/retry/model substitution/merge/deploy/live send.
