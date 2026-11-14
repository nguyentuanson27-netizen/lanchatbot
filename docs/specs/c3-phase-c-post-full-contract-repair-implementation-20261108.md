# Phase C — implementation sau review full 34 ca / 55 lượt

Lượt sửa bắt đầu 08/11/2026; chốt báo cáo 09/11/2026 (Asia/Saigon). Tên evidence giữ ngày bắt đầu.

Implementation base: `7c75dbb1fd68a05601b47a0c1a5ceb85b932278e`.
Implementation commit: `4e0d1e542dc79f23b32d51cc348eae4e51e45c2e`.
[Scope/acceptance](c3-phase-c-post-full-contract-repair-20261108.md), [bảy ca gốc](../../apps/worker/evals/single-agent-commerce-qualification/post-j2-full-run-20261108/FAILURES.md), [commands, source blobs, logs và hashes](evidence/c3-post-full-contract-repair-20261108/VERIFICATION.json).

**IMPLEMENTED / SELF-REVIEWED; MODEL_NOT_RUN.** Không independent review trong lượt này; không claim Phase C GO hoặc chất lượng hội thoại đã tăng. Không sửa report/nhãn của provider run cũ.

## Thay đổi và giới hạn theo từng ca

| Ca | Thay đổi thực tế | Điều chưa được chứng minh |
|---|---|---|
| P08 | Khi REPLACE_LINE đổi parent/offer và owner truyền marker `__NO_COLOR__`, code query lựa chọn của scope mới với color=null và requireColorChoice nội bộ. Không tự chọn dù chỉ có một màu thật. Giữ cart/revision khi thiếu lựa chọn; selector bỏ qua prerequisite và trả READY bị chặn. | Native owner có hỏi đúng màu và tiếp tục mutation ổn định hay không. Chưa cho marker một nghĩa màu mới. Same-scope unlabelled tuple hợp lệ vẫn dùng được. |
| S15 | Lookup/view ảnh lỗi được trả về vòng owner bình thường với evidence scoped, không tự handoff ngay. Owner xác định mức liên quan; explicit dependency handoff sau lỗi ảnh dùng silent recovery hiện hữu, kể cả policy legacy có holding reply. | Không có deterministic completeness classifier: nếu owner bỏ qua ảnh khách thực sự yêu cầu, một câu chỉ báo giá vẫn có thể an toàn về fact nhưng thất bại về nhiệm vụ. Không gọi đây là bảo đảm mọi ảnh thiếu sẽ tự handoff. Native regression phải chấm cả việc này. |
| S05 | select_product_media mặc định REPLACE toàn nhóm gửi; APPEND là lựa chọn tường minh để gửi nhiều mẫu. View chỉ xem; opening/quote preparation nội bộ dùng APPEND. Thay thành công bỏ media claims/literals cũ; thất bại giữ selection đã xác minh. | Code không đọc final prose để chọn ảnh thay owner. Owner vẫn có thể chọn sai nhóm hoặc APPEND sai; phải kiểm text cùng actual attachments ở native run. Đây không phải text/media coherence proof. |
| J4 | record_negotiation trả NEGOTIATION_CONTEXT_REQUIRED / NOT_EVALUATED / supportAvailability=UNKNOWN và missing prerequisites khi có quote hiện tại hợp lệ nhưng chưa có cart/negotiation state. Không CAS, receipt hoặc ưu đãi mới. | Chưa chứng minh owner không nói lại “không có hỗ trợ thêm”. Không nới verifier; giá bán không thành giá hãng. Báo tổng trước giỏ vẫn đi quote_product. |
| S16 | Tool result và trusted media literal cùng ghi customerWearingEvidence=NOT_RECORDED; feedback là phân loại nguồn, không tự xác nhận người trong ảnh là khách/đang mặc. Không sửa giả định test thành provenance thật. | Case hỏi ảnh khách mặc vẫn cần source/test assumption xác nhận nội dung đó. Chưa đủ căn cứ cho qua draft cũ; không đánh dấu ca này FIXED. |
| S08 | Giữ boundary phân biệt “hai lớp” và cấu tạo “lớp lót”; không parse mô tả, giả thuộc tính, thêm regex/từ cấm hoặc sửa prompt bằng ví dụ riêng. | Owner suy diễn cấu tạo là lỗi semantic còn tồn tại; lượt này không có fix model được chứng minh. Giữ nguồn gốc để native kiểm lại, không chạy đến khi gặp PASS. |
| J1 | Giữ fail-closed, accounting và generation retry0; test adapter timeout sau đúng một request vẫn đạt. | Không sửa được upstream transport bằng code này; không claim credential/quota/provider health từ stub test. |

## Những điểm đã kiểm và sửa trong self-review

- Lấy trạng thái từng tuple trong catalog không được kế thừa prerequisite chọn màu của cả operation. Đã loại flag khi kiểm riêng tuple; nếu không, tất cả options thành UNKNOWN và lỗi P08 vẫn bị che.
- Không bỏ ảnh mở đầu bắt buộc: gate giữ constraints từ lookup đã thất bại, không tự retry hoặc đổi thành generic. Preparation số liệu độc lập vẫn được phép; test đếm đúng media reads, không cấm nhầm POS read.
- Khi owner chọn handoff sau lỗi ảnh, policy legacy có câu chờ không được làm phát sinh tin khách. Kiểm native invoke/invokeBatch, invalid args, denied/unknown commit, persisted handoff và delivery restart.
- Hai test ingress cũ giả định mọi lỗi lookup tự handoff trước owner đã đổi sang contract owner nhận kết quả rồi request_handoff. Không dùng thay đổi fixture để khẳng định code hiểu ảnh khách cần. Hai kiểm tra giữ enqueued=0/text=null, không có partial price reply hoặc ảnh sau handoff.
- Fixture typing cleanup sau full worker run được kiểm lại bằng 30 test liên quan và build/lint. Không thêm layer/model, tool name, bảng DB, parser, retry, repair/reverify loop hoặc production wiring.

## Verification thực chạy

RED được quan sát qua tool output **trước khi sửa executable**: 3 test files, 8 FAIL / 181 PASS. Các lỗi gồm carry marker sang offer mới, chưa có trạng thái negotiation rõ, chưa có replace media group, feedback thiếu meaning, và auto-handoff trước owner. Stdout RED đầu tiên nằm trong session tool output; không có raw-log file/hash riêng và không giả tạo lại log.

Các lần GREEN trung gian 244/244 và các lần typecheck/consumer FAIL được giữ trong session/log ngoài repo; không tính lại như mẫu model. Lần worker mở rộng đầu tiên 1062 PASS / 2 FAIL phát hiện hai consumer còn dựa vào auto-handoff. Self-review sau đó sửa contract consumer và silent recovery như trên.

| Lệnh thực chạy | Kết quả cuối |
|---|---|
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce src/realtime-sales-catalog.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts --reporter=dot --maxWorkers=2 --no-file-parallelism` | 1067 PASS / 36 files |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-missing-information.test.ts --reporter=dot --maxWorkers=1 --no-file-parallelism` | 30 PASS; kiểm lại fixture typing, nằm trong nhóm 1067 |
| `node --test --test-concurrency=1 apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-product-tables.test.mjs apps/worker/evals/single-agent-commerce-qualification/test-support-sources.test.mjs` | 87 PASS; gồm wire/schema và evaluator firewall |
| `node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference-diagnostics.test.mjs` | 24 PASS / 1 existing SKIP; installed-login test không bật |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts --reporter=dot --maxWorkers=1 --no-file-parallelism` | 22 PASS; không đổi shared source |
| `pnpm --filter @lana/worker build` | PASS trước thay đổi silent recovery cuối; đã build dependencies |
| `pnpm --filter @lana/worker exec tsc -p tsconfig.json` | PASS trên final implementation; emit worker sau sửa cuối |
| `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit` | PASS ở bước trước; final noEmit được kiểm lại bằng lint |
| `pnpm --filter @lana/worker lint` | PASS trên final implementation; script là `tsc -p tsconfig.json --noEmit` |
| `pnpm check:dataset-boundary` | PASS |
| `node --check apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs`; `git diff --check` | PASS |

Lần typecheck đầu FAIL do exactOptionalPropertyTypes của internal flag; lần emit sau FAIL do fixture policy bị suy luận quá hẹp. Đã sửa type contract/fixture, không tắt compiler guard. Một lệnh test dùng nhầm đường dẫn codex-inference dưới thư mục read-only không tìm thấy file, không chạy test; đã chạy đúng hai file semantic-verifier ở bảng trên. Không claim `pnpm check` hoặc canonical remote CI PASS.

### PostgreSQL thật, generation0

Command prefix thực dùng:

```text
python ../c3-media-context-model-source-wrapper-20261103-02.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs <new-evidence-dir> COD --check-prefix <prefix>
```

Manifest ghi đủ ba exact commands/directories. Có **4 control khác nhau / 6 executions / 3 DB đã drop**:

- `C B-preserving`: 2 PASS, worktree verification trước silent-recovery correction cuối: profile-once/multiple fit/source invalidation và selection không giỏ/full checkout.
- `C post-full contract`: 2 PASS ở worktree cuối; ACK sau incidental feedback lookup failure qua verifier, accepted Outbox và delivery restart một lần; requested missing feedback qua explicit owner handoff, legacy holding policy, không Outbox, persisted HUMAN và một handoff event.
- Lặp lại đúng hai control post-full trên clean commit `4e0d1e54`: 2 PASS / sourceDirty=false / databaseDropped=true. Đây là kiểm exact commit, không phải hai mẫu model hoặc bằng chứng ổn định ngẫu nhiên.

**Provider generations=0, live sends=0.** Cả owner và verifier trong deterministic integration là scripted/stub; source fixtures chỉ trong DB dùng rồi bỏ. Không sửa nguồn shop.

## Prompt và bước tiếp theo

Owner prompt và verifier prompt byte-identical với implementation base; SHA256 trong manifest. Chỉ mô tả/schema tool ảnh thay đổi để giải thích REPLACE/APPEND, không thêm ca/ví dụ bán hàng. Corpus/model/effort/caps không đổi.

Trước provider run mới phải seal lại source/config/schema/input và chạy preflight. Ưu tiên ca bị tác động cùng đối chứng đã đạt; đánh giá toàn nhiệm vụ và nhóm text+attachments. S16 thiếu xác nhận ảnh khách mặc phải được ghi như source gap, không chạy lại để mong verifier lật. S08 và J1 không được gắn nhãn đã sửa nhờ các test deterministic này.

**STOP ở implementation đã kiểm; Phase C chưa GO.** Không tự chạy model, merge hoặc deploy.
