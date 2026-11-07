# Phase C — triển khai sửa target size, cấu trúc combo và continuation

Implementation base: `1c2ef10e0a3a83eb80074585b92802ebdd3d142d`. [Plan revision 2 đã duyệt](c3-phase-c-target-composition-continuation-repair-plan-20261105.md). Đây là implementation và verification deterministic; không phải model campaign hay kết quả qualification mới.

## Source và thay đổi

- S1 `2d01ab74`: shared readiness phân biệt SIZE_FIT theo đúng target PRODUCT hoặc COMPONENT (parent/component/role). Legacy thiếu target vẫn cùng identity với explicit PRODUCT; cùng target trái nhau vẫn conflict. Dùng chung validator cho readiness và DB, không thêm bypass ở ingress.
- S2 `6ab7ec0f`: logical composition tổng hợp quantity theo product SKU/role, so sánh không phụ thuộc thứ tự. Giữ duplicate SKU và số món; explicit quantity phải positive safe integer, mỗi logical component tối đa20, raw components tối đa3/rows64; không bung array. Explicit malformed container/quantity không rơi về default1. Legacy scalar component_1_sku/component_2_sku mỗi slot là một đơn vị theo representation hiện hữu; không đổi raw stock/cart parser. Role chưa biết vẫn OTHER. Public owner projection/expand giữ quantity, tương thích record cũ thiếu quantity.
- S3/S4 `c7b485b0`: COLOR_REQUIRED/SIZE_REQUIRED có validated selection evidence ghi `effectCommitted:false`, không mint receipt hay tự chọn màu. CompactV2 dùng reference tới exact same-body product/evidence hash để bỏ bản lặp của evidence/options; mở rộng khôi phục đủ nguyên kết quả. Native model parts/signatures/call IDs giữ nguyên. Telemetry schema hash và bounded argument shape/hash giúp điều tra malformed, không ghi raw unknown keys/values, không thêm parser hay retry.
- Trong `c7b485b0`, reserved references bị reject trước provider. Follow-up `639aff10` reject dictionary cùng hash nhưng không duy nhất hoặc khác canonical value. Đây là code/eval source cuối để review. Không thay model/effort/config, owner/verifier prompt, giới hạn text/image, production entrypoint, source shop hoặc policy.

Khoảng thay đổi từ implementation base:15 source/test files,278 insertions/27 deletions. Hai online semantic roles giữ nguyên. Không router/parser/reverify/repair loop/case-specific regex. Line count không phải thước đo chứng minh an toàn.

## RED → GREEN và review fixes

S1 quan sát1fail trước fix; S2 quan sát7fail trước fix; wire helper chưa có export bị RED trước khi thêm; marker chưa commit bị RED trước khi thêm. Reviewer phát hiện và yêu cầu sửa hai vấn đề: malformed BOM container tự thành legacy unit1, và reserved/dangling references chưa bị chặn trên actual adapter. Cả hai có RED→GREEN; self-review thêm conflicting dictionary RED→GREEN. Giữ nguyên log thất bại.

First worker build fail ở type unknown[]; đã sửa typing, không nới source schema. First full worker có1 assertion cũ thiếu quantity1 trong expected projection; đã cập nhật đúng contract mới và giữ các assertion role/source/bounds. First full Node có1 expected diagnostic thiếu argumentShape; cập nhật expected envelope, vẫn kiểm không lộ tên field/value riêng tư.

PG01 thiếu explicit media call trong synthetic fixture nên chưa có ảnh; PG02 dùng nhầm length của fieldEvidence map. Cả hai FAIL và đã drop DB; không gọi đó là runtime defect được chữa bằng nới gate. PG03 sửa fixture/test và PASS. Các run worktree vẫn ghi sourceDirty:true; clean runs dưới đây có identity riêng.

## Verification thực sự đã chạy

- Contracts readiness/profile focused:75PASS; business protected claims/reply assembler/size engine42PASS; database realtime-runtime56PASS.
- Focused worker8files:594PASS trước final malformed-container controls; cuối read-tools/preparation127PASS. Full worker: **2.659PASS /154files** trên runtime/shared source thuộc c7b485b0; source TS không đổi ở strict dictionary follow-up.
- Full Node trên clean final `639aff103898ad9e6cad5119d27c08f4809f9896`: **856 PASS, 2 SKIP, 0 FAIL / 858 tests**. Run trung gian 855 PASS / 2 SKIP được giữ trong log, không gán thành exact-source seal. Focused adapter theo đúng lệnh năm file của plan: **103 PASS**; strict-dictionary/adapters/diagnostic focused: **83 PASS**. Các lần chạy chồng coverage không cộng thành tổng test độc lập.
- Canonical worker build/typecheck/lint, contracts/business-tools/database typecheck: exit0; C2 benchmark validators exit0. Shared builds đi qua worker prebuild. Không claim root pnpm check hoặc remote CI PASS.
- Clean c7b485b0 real PostgreSQL **3/3PASS**: actual ingress profile-once→hai fit→verifier stub→readiness→transaction→accepted text+image group sau delivery restart; forged contradictory same-target pair có hash binding/readiness hợp lệ bị actual DB guard PROTECTED_OUTBOUND_CLAIM_CONFLICT,0Outbox; thiếu màu không effect rồi khách bổ sung WHITE thì ghi đúng M/L.
- Clean c7b485b0 B-preserving PG **2/2PASS**: fit qua adapter/restart/source invalidation; persisted offer không tạo giỏ và full native checkout tới PURCHASE_CONFIRMED. DBs dropped/provider0/livefalse. Trên clean final `639aff10`, target PG **3/3 PASS**, provider generation **0**, DB đã drop. Kết quả và source identity được ghi riêng trong verification.
- Offline captured-clock SD023 replay: logical QD001×2(OTHER)+SD023-AO×1(TOP), COMPOSITE989000VND, source không sửa. Đây không phải current freshness authorization hay model result.
- Sáu pinned B historical controls trên clean c7b485b0: cùng input/world hashes, deterministic gate vẫn allow;5source readsOK, height/weightRECOMMENDED. Chỉ component replay, không model/native/search parity.
- j1 reconstruction từ captured first request, exact subsequent tool responses và signed native content: **60.636bytes**,13callable declarations đúng first captured request (non-first-contact không có quote tool). Mở rộng cả hai tool results bằng nguyên bản; signed model parts giữ nguyên. Failed full body lịch sử chưa capture, nên không claim byte-identical historical request hoặc owner đã dùng được trong model run. Text-only65.536,2images×512KiB/fullmultimodal1.507.328 giữ nguyên.

Exact commands, source/artifact/log hashes và exit codes nằm trong verification. Implementation tests dùng synthetic/scripted provider transports; provider generation0. Nguồn/policy đọc qua route hiện có, disposable DB và in-memory capture, không live send.

## S4 và những gì chưa chứng minh

Ảnh DETAIL chỉ xác nhận asset/type theo metadata; product material không chứng minh ảnh cho thấy ren. Regression test giữ confirmedParts rỗng/componentKnown=false khi chưa có bằng chứng. Existing view_product_media bytes/hash/MIME/source/injection guards giữ nguyên. Chưa bổ sung metadata giả, chưa nới verifier và chưa chứng minh owner s03 hết vượt căn cứ.

Đã kiểm tài liệu function calling chính thức của Google [FunctionDeclaration](https://googleapis.github.io/js-genai/release_docs/interfaces/types.FunctionDeclaration.html) và [function calling](https://ai.google.dev/gemini-api/docs/function-calling?hl=en). Không đổi API/schema/generation semantics từ phỏng đoán. s13/j4 malformed completion và s15 unknown field vẫn là hạn chế chưa xác định root cause đủ để sửa provider behavior. Diagnostics mới chỉ làm rõ lần sau; giữ1HTTP/attempt/retry0/errors trong denominator.

Chưa chạy model lại, chưa đo cải thiện giọng hoặc độ ổn định, chưa chấm whole-reply quality. Functional FAIL của run69bd1221 và21ca/31lượtNOT_RUN giữ nguyên. S4 diagnostic/regression đã triển khai; provider behavior còn chưa xác định được căn nguyên không được ghi là đã sửa. Chưa dựng/dispatch scopes R1–R4 của campaign kế tiếp; cần freeze/admission/input review trước khi user yêu cầu chạy. Không tự mở phần còn lại hoặc GO/C3 comparison/deploy.

## Review và bàn giao

**Independent APPROVE IMPLEMENTATION** tại exact clean source `639aff103898ad9e6cad5119d27c08f4809f9896`; không còn material finding. Reviewer tự chạy thêm readiness 63, read-tools 101 và final wire 4 test, đồng thời kiểm 15 source hashes / Git blob parity, final full Node, PostgreSQL và cleanup. [Approval và giới hạn](evidence/c3-target-repair-implementation-20261105/independent-implementation-review.json), [source manifest](evidence/c3-target-repair-implementation-20261105/source-manifest.json), [exact commands, logs và kết quả](evidence/c3-target-repair-implementation-20261105/verification.json). Report accuracy được review riêng; approval engineering không phải model acceptance hoặc qualification. Dừng trước provider/model campaign theo phạm vi lượt này.
