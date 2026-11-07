# Review độc lập kế hoạch j2/j1 — 08/11/2026

**REQUEST_CHANGES** — hướng sửa j2 và phép thử j1 có phạm vi hợp lý, nhưng cần chốt ba điểm dưới đây trước triển khai/seal. Đây là một lần review plan, không phải review implementation hoặc acceptance. Không cần thêm reviewer, provider run hoặc framework để giải quyết các điểm này.

Repo được xem: `lanchatbot-c3-semantic-verifier-checkpoint-a-20261005`, HEAD `f0cf4a502b60fd9b9a987b336d525ad5472fc0e2`; worktree sạch khi kiểm tra. Dòng dẫn chiếu dưới đây thuộc HEAD này. Plan: `docs/specs/c3-phase-c-j2-recovery-j1-controlled-plan-20261108.md`.

## Bắt buộc sửa

### R1 — P1: phân biệt quote cũ với correction hiện tại có value/domain sai

**Vị trí:** plan §2.2, dòng 33–44, 52–53; §2.3 dòng 64–68. Source: `apps/worker/src/single-agent-commerce-state.ts:57–90,193–198,218`.

Plan giữ pending cho correction có grounding nhưng không nói rõ field nào còn unresolved khi **quote thuộc tin hiện tại nhưng value model chép sai**. Ví dụ tin hiện tại “51kg, ngực 88”; proposal WEIGHT=51/quote “51kg” hợp lệ và BUST=86/quote “88” bị VALUE_DOES_NOT_MATCH_QUOTE; lần sau owner chỉ gửi WEIGHT=51. Nếu staging chỉ giữ các field qua toàn bộ validator, BUST bị coi là “đề xuất không được chấp nhận” giống HEIGHT từ history, rồi patch weight-only có thể unlock fit dùng bust cũ. Điều khoản all-invalid không che được mixed-valid case này.

**Amendment cụ thể:** thêm bảng phân loại vào §2.2:
- Field có source chứng minh nằm ngoài current ingress batch, như HEIGHT lịch sử trong j2: chỉ là rejected proposal; không tạo measurement correction pending.
- Field/value/evidence qua validator hiện tại: pending chứa field, giá trị chuẩn hóa và evidence; chỉ readback đúng correction đó mới giải quyết.
- Field có quote hiện tại nhưng sai value/unit/domain, hoặc source/parse/shape còn không xác định: giữ unresolved blocker cho field hoặc proposal scope; không suy giá trị thay khách, không ghi hoặc cấp proof. Patch hợp lệ cho field khác không giải quyết blocker này. Khi cùng field được gửi lại và qua validator/current evidence rồi readback đúng, mới giải quyết.
- Nếu không chứng minh được invalid proposal chỉ thuộc history/non-current, chọn nhánh unresolved; không mở rộng parser hay tự tìm mọi ý định trong customer text.

Thêm hai negative controls deterministic: mixed valid WEIGHT + current-quote/wrong-value BUST → weight-only vẫn khóa; cùng chuỗi → sửa BUST đúng mới cho fit mới. Thêm biến thể invalid-domain/current quote hoặc malformed/unknown field để kiểm nhánh conservative. Guard reject quote/value/domain vẫn giữ; không cần thêm model run.

### R2 — P2: “cùng operation” và pending toàn profile cần một quy tắc thực thi thống nhất

**Vị trí:** plan §2.2 dòng 42–44, §2.3 dòng 65. Source: `single-agent-commerce-state.ts:284–315,369–407`.

Source hiện có standalone `apply_customer_state`, inline `recommend_size.customerStateOps`, và batch nhiều recommend dùng chung patch. Inline chuyển thành apply và làm mất origin/target nếu chỉ bọc writer hiện tại; batch cũng gọi writer một lần. Plan yêu cầu supersede đúng operation/target/request nhưng chưa xác định identity hoặc điều kiện resolve giữa ba đường này. Dòng 43 yêu cầu patch bao phủ toàn bộ pending, trong khi test partial ở dòng 65 chỉ xác định phần còn thiếu vẫn pending; chưa chốt patch partial được commit hay reject trước CAS. Hai cách triển khai đều có thể nhận là theo plan và tạo receipt/readiness khác nhau.

**Amendment cụ thể, phương án nhỏ:** ghi rõ trước khi sửa:
- Pending correction gắn với current request/source event và customer profile, nên chặn mọi fit phụ thuộc profile đó; đổi PRODUCT/COMPONENT/parent hoặc gọi target khác không làm pending biến mất.
- Writer dùng chung nhận origin/scope từ code; model không được tự cấp recovery id. Chốt cách standalone apply và batch identical-patch giải quyết cùng field/value/evidence; rejected-proposal bookkeeping chỉ được supersede trong scope đã chỉ định, không xóa blocker khác.
- Chọn một rule cho partial replacement: đề nghị **reject trước CAS nếu còn thiếu bất kỳ grounded pending correction của recovery group**, giữ nguyên pending, không phát receipt hoàn tất. Đây là lựa chọn nhỏ, phù hợp dòng 43. Nếu chọn cho partial commit thì phải ghi rõ receipt chỉ chứng minh phần đã commit, snapshot tiếp tục pending và không có fit/claim/update-complete cho toàn group.
- Với pending value/evidence xung đột trong cùng request, fail-closed thay vì tự chọn bản semantic “mới nhất”. Commit/readback uncertainty luôn là blocker riêng, không được xóa do recovery group thành công.

Bổ sung bảng test ít nhất: inline → standalone correction; inline target A → recommend target B; standalone → inline; batch identical patch. Kiểm profile/receipt và pending, không chỉ status tool. Không yêu cầu framework hay đổi public tool API.

### R3 — P2: gate j1 cần predicate controls và baseline behavioral miss đã đăng ký

**Vị trí:** plan §3.4 dòng 118–124; §4 dòng 147.

Gate hiện có thể mở khi A chọn đúng 2/3 và sample thứ ba 401/timeout, còn B đúng 3/3. Điều này không cung cấp một quan sát owner chọn sai path của A. Giữ lỗi trong denominator là đúng, nhưng không biến lỗi transport/auth thành evidence prerequisite view cải thiện planner. Ngoài ra “cả2 controls vẫn dùng được” chưa là predicate đăng ký: one-step không thực thi tool nên chưa chứng minh usability terminal. Nếu để chốt sau output, evaluator có thể linh hoạt chấp nhận final, read-first hoặc quote path theo arm.

**Amendment cụ thể:** trước seal ghi rõ:
- Gate 3/3 B + A<3/3 chỉ đủ mở paired-native khi A có ít nhất một **valid model response** không đạt direct-quote predicate; technical/auth/transport/timeout không được là lý do duy nhất làm A<3/3. Nếu chỉ có technical misses thì kết luận INCONCLUSIVE, conditional slots NOT_RUN, không retry/bổ sung sample. Tất cả lỗi vẫn nằm trong registered denominator.
- ACK control: predicate planning phải loại price/media/cart task mới không cần thiết; xác định trước final ACK nào hợp lệ và read-first có được chấp nhận hay không.
- Cart control: xác định trước final dùng đúng current cartQuote hoặc các source-read-first cụ thể được chấp nhận; loại pre-cart quote thay giỏ đúng, mutation thừa, tính tổng tay hoặc bỏ ưu đãi đã được code cấp. Đánh giá target/args/dependencies và bằng chứng đã có, không keyword.
- Áp cùng predicate cho A/B. “Controls passed” ở primary chỉ là one-step planning controls; terminal usefulness chỉ được kết luận từ paired native outcomes. Ghi attempted/completed/error/NOT_RUN riêng theo phase; NOT_RUN không phải provider attempt hoặc task FAIL.

Không tăng 10 primary slots, 8 conditional generations hay quota tổng 30.

## Gợi ý không chặn plan

1. **Ghi vị trí view B và frozen field list trước seal.** Native builder không tự chuyển field tùy ý từ OwnerRequest sang wire: `apps/worker/evals/single-agent-commerce-read-only/gemini-inference.mjs:269–289,329–345` dựng explicit ownerView, rồi render presentation. Returning quantity đã có thể lấy từ schema thực sau conversation-entry projection tại dòng 143–149. Có thể dùng adapter eval thuần quanh builder và kiểm final wire; không cần thêm field runtime. Hash/diff phải so phần dialogue/native signed contents và toàn tools/config riêng, còn đúng một field metadata được allowlist. Kiểm 1KiB bằng UTF-8 bytes của view thực gửi và chạy lại cả text/presented/image request bounds sau chèn. Không dùng “emit required” từ declaration gốc trước projection.

2. **Freshness headroom và thứ tự dispatch.** Plan đã hard-stop đúng khi nguồn hết hạn; nên freeze thứ tự cặp liền nhau và deadline/headroom thực tế trước dispatch, nhất là nếu 10 primary + conditional native dài hơn lifetime proof. Không renew timestamp hay thay bundle giữa arm để cứu run. Nếu thiếu lifetime, ghi BLOCKED/NOT_RUN theo registration. Không cần guarantee chạy hết hoặc thêm refresh I/O cho B.

## Những điểm tôi đồng ý giữ

- Root cause j2 được đóng khung đúng: attempted HEIGHT lịch sử còn pending dù corrected4ops đã commit. Giữ RED trên source hiện tại, acceptance COMPONENT/TOP + retainAdvice và real PostgreSQL/persisted ingress trước model là phù hợp; không ép size M.
- Không blanket clear; không mở reset/ready tool; quote grounding, CAS/readback, uncertainty, revision/fingerprint/target, receipts và final freshness vẫn do code quyết định.
- j1 vẫn là giả thuyết. A không đổi prompt/tools/facts; B chỉ thêm metadata suy từ dữ liệu A, không calculator trước, không expectedTool/rubric, không giấu tool và không cấp authority. Quote/cart prerequisite không bị đơn giản hóa thành requiresCart=true cho mọi quote.
- Primary one-step không effect/verifier/send; paired native chỉ dùng isolated stores trong registered test. Historical bc 18 slots/sáu ca không được sửa/chạy lại làm population mới. Source cho thấy `bc-control.mjs:30–39` và `bc-owner-replay.mjs:40–56` hardcode population/budget, nên reuse chỉ nên lấy transport/firewall phù hợp.
- N=3/arm và A1/B1 native không chứng minh causal/stability; plan không gọi Phase C GO, không sửa điểm campaign cũ, không triển khai production. Guard 1 owner/≤1 verifier, caps/retry0, ảnh first-contact và silent fallback giữ nguyên.
- Một packet và một review tổng hợp sau các registered runs là đủ; không cần vòng prompt patch/reviewer theo sample.

## Phạm vi thực sự đã kiểm và giới hạn

Đã đọc AGENTS.md; README và phần governance liên quan của OPERATING_MODE/index kiến trúc, baseline lịch sử; toàn plan mới và root-cause review pinned; JSON minimal probe ở chế độ đọc. Đối chiếu phần liên quan của state writer/snapshot/inline/batch/readback, callable reachability, quote task/calculator/first-contact media guards, read-only tool admission/evidence, owner request orchestration/native schema-view-wire builder và hardcoded bc controls. Đọc các đoạn invariant liên quan trong hai spec nền qua tìm kiếm tập trung. Chỉ có AGENTS.md root áp dụng; AGENTS trong frozen historical eval không thuộc phạm vi này.

Không đọc lại full hội thoại/WORLD/embedding/raw provider request dumps. Không chạy archive probe, tests/evals/provider, không gọi source/live service, không sửa repo, không spawn agent hoặc gọi reviewer khác. Chỉ tạo report MD/JSON ngoài repo theo yêu cầu. Việc phân loại lỗi grounding, scope và predicate nêu trên là phân tích thiết kế; chưa có implementation chứng minh hành vi sau fix. Chưa kiểm fresh bundle/config credentials, tính khả thi deadline, PG launcher case mới, native outcomes hay sales acceptance thực tế. Các điều đó vẫn cần evidence ở lượt implementation/execute đã đăng ký.

