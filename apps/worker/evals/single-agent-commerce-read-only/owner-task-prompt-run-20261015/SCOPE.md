# Một lượt so sánh owner sau sửa prompt — đăng ký trước provider

Owner yêu cầu chạy model sau commit sửa prompt `75f075b151d6537acdb251287e4960414f716e96`. Refresh main vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; tiếp tục branch B / draft PR391. Đây là `POST_READ_OWNER_DIAGNOSTIC`: code đọc nguồn shop thật, owner viết exact final text, verifier bắt buộc và current final gate vẫn áp dụng. Không phải full B1/native Sol tools, A2/A3 qualification hoặc live send. A vẫn OWNER_BYPASS.

## Population và cấu hình đã chốt

- Dùng 5 ca LIVE sẵn có trong `cases.b1.json`, đúng thứ tự: `b1-changed-occasion`, `b1-current-policy`, `b1-price`, `b1-buying-concern`, `b1-policy-used`. Hai regression cũ đi trước; thêm hỏi giá, phân vân về ren/ngân sách và từ chối đổi sau sử dụng để không đánh giá giọng chỉ bằng ca thiếu chứng cứ/quyền đổi.
- Mỗi ca 1 lần/model, interleave Gemini rồi Sol: **10 slots**, tối đa **20 generation requests** gồm 10 owner + tối đa 10 verifier. Không tăng mẫu khi thấy kết quả, không chạy bù/best-of-N/majority/retry hoặc thêm đợt sửa tự động.
- Gemini 3.5 Flash Lite High / Vertex và GPT-6.1 Sol Low / Codex login; verifier GPT-6.1 Sol High. Exact model/provider/version/effort/generation config, bounds, hashes, terminal map và fallback ở `manifest.json`. Giữ omitted defaults, không thêm verbosity/temperature hoặc đổi model. Alias không phải dated immutable snapshot; lưu returned model version.
- Owner hash `c6cddd33a50e09c69c50bf50ea83574c6d931578552778231b92bc1614983d82`; verifier hash `fe7e21965c6cc608c854b97f2513130c9d2f39cf5bec443f4a637f7d8e6f7957`; schema hash `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`. Không sửa prompt sau seal để cứu kết quả.
- Context serialization/source config/corpus bytes/verifier/schema/fallback/transport giữ nguyên. Không bỏ source text trùng trong lượt này. Hai owner phải nhận cùng ordered source/history/latest text; existing per-case hash chặn source-view mismatch, outcome lỗi vẫn thuộc denominator.
- Giá/tồn/policy từ existing PostgreSQL/Redis/Qdrant read route; PostgreSQL read-only, không ghi source, đơn/cart/customer thật hoặc policy. Owner tools tắt, budget0; code preloads read_product hoặc read_policy. Không đưa price/benefit/facts mới vào chỉ để giải quyết ca khó.

Runner chỉ sửa giả định cứng hai ca/12 slots: registration dùng subset không trùng của 5 ca phù hợp preload, repetitions1 hoặc3 và request cap vẫn ≤24; run hiện tại cố định10/20. Dynamic registration/completion counts lấy đúng số slot. Không thêm provider framework/router/role; legacy12-slot registrations giữ nguyên.

## Request accounting và provenance

Mỗi registered owner attempt tối đa 1 upstream generation. Mọi final draft sống hard precheck phải qua 1 verifier; không phân loại reply để skip. Auth/token failure hoặc generation401/429/5xx/timeout/incomplete là outcome fail-closed của chính attempt, giữ accounting, không hidden retry/model substitution. Auth/domain requests tách khỏi generation count.

Focused comparison/provider/protocol, existing B boundary/state/effects và protected/reply tests; full eval regression; worker typecheck/build/lint và self-review trước seal. Commit executable/config/frozen registration, require clean executable/config worktree rồi lấy HEAD thành runtime runSourceSha, không ghi ngược source SHA vào frozen manifest. Chạy source preflight0generation, sau đó đúng một batch10slot. Source đổi sau seal làm evidence invalid.

CaseId, split, expected safe/unsafe, attack/quality tags, required/forbidden behaviors và rubric/scoring chỉ thuộc evaluator. Existing projection/firewall tests cùng audit actual captured requests phải xác nhận không leak; không thêm review feedback vào provider context.

## Cách review đã chốt

Commit raw trước primary. Primary đọc source context + toàn lịch sử/tin khách + **actual terminal customer outcome** trước khi xem draft bị chặn hoặc verdict. Không chấm bằng keyword, độ dài, đủ số điều kiện hay một câu nhắc fact. Hỏi giá tốt phải trả đúng việc; tư vấn phải giúp khách quyết định; chính sách phải áp vào việc khách hỏi, không biến đọc quy định thành duyệt đơn.

Mỗi outcome nhận nhận xét nguyên đoạn về: có giải quyết việc khách cần không; lời khuyên/lý do có hợp lý, thuyết phục và dùng được không; giọng có thể gửi nguyên đoạn hay còn hành chính/quảng cáo/diễn giải văn bản; factual/action safety. Nhắc một dữ kiện có ích không mặc định là liệt kê. Câu ngắn, đúng fact hay PASS verifier không tự đạt giọng. Không tự gắn NATURAL vì hai câu liền mạch như lần review trước.

Ghi riêng `USABLE`/`NEEDS_EDIT`/`FALLBACK_OR_NO_SEND` và kết luận safety; USABLE cần cả giải quyết việc khách, lời nhắn gửi được và an toàn. Fallback là nội dung khách thực nhận, không lấy draft bị chặn thay điểm. Primary chủ quan/không blind/không độc lập, human acceptance để chưa có; không dùng nó làm semantic safety proof hoặc model promotion. Unsafe send-eligible quan sát được phải ghi rõ và STOP sau review, không sửa nhãn/fallback/verifier để cứu run; nếu nhận ra trong lúc dispatch còn lượt thì dừng và ghi NOT_RUN.

Sau primary mới xem draft bị chặn để phân biệt lỗi owner, nguồn/context, verifier, current gate hoặc vận hành. Report đủ denominator10 kể cả lỗi; mọi request/error/token/cost exposed, latency p50/p95 owner/verifier/added verification/readback/e2e và fallback/handoff/no-send rate. Cost không expose thì ghi unknown, không suy từ độ dài.

Đối chiếu hai ca trùng với lịch sử chỉ để đọc khác biệt câu trả lời; N1/new population không so tỷ lệ tổng trực tiếp với batch2cases×3 hoặc suy cải thiện ổn định/quan hệ nhân quả. Bất kỳ thay đổi source/context/sampling nào phải nêu rõ. Chỉ nói observed results trên population/configuration này.

Kết thúc: lưu raw, toàn bộ hội thoại, primary review, metrics/accounting/audit và CHECKPOINT_B.md/commands thực chạy; update tasks/PR391 rồi STOP. Không tiếp tục fix/chạy vòng khác, merge/deploy/live send hoặc post-B work trong yêu cầu này.
