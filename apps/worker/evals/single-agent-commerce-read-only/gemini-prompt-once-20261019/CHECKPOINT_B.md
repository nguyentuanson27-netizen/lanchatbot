# Full Gemini owner prompt — one repetition — 2026-10-19

**Hoàn tất16/16lượt; chưa thấy cải thiện rõ về văn phong. Recommendation: STOP readiness.** Hai fallback do trusted context vượt bound trước verifier. A vẫn OWNER_BYPASS; đây không phải full A2/A3, full24B1 hoặc quyền live send.

## Identity và phạm vi

- Preparation base `faf7c023` được ghi đầy đủ trong [registration](REGISTRATION.json); run source **3cff648b0cfce3b68ed5b9d72a2f34fc37f18977**, worktree clean trước dispatch. Primary review lock **ac6870c1**, trước rejected drafts/verdict diagnosis. SHA runtime nằm trong [runtime record](raw/RUN_SOURCE.json), không ghi ngược vào frozen source.
- Owner dùng nguyên byte của file Gemini `gemini-code-1792381971310.txt`, snapshot [Gemini owner](gemini-owner.vi.txt), SHA256 `239673335e530a16dc76ed4f125b91eb0aa0788120a80bb4742652e23bbf8442`. [Bản trước](previous-owner.vi.txt) giữ để đối chiếu; không ghép hai bản trong run này. Git attributes giữ exact prompt/provider evidence bytes.
- Gemini3.5 Flash Lite HIGH/Vertex global tư vấn; GPT-6.1 Sol HIGH/Codex login relay verifier. Verifier giữ bản hiện tại đã chấp nhận tư vấn định tính, hash `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`; không dùng file Gemini verifier. Exact versions/config/credential routes, schema/input/corpus hashes trong registration. ModelVersions trả về đúng hai model đăng ký.
- Giữ phạm vi vòng gần nhất nhưng N1 thay N3:8stateful,4integrated B1,4advice replay của cùng context. Tổng16slots, trần52generations, retry0; không mở full24B1 hoặc thêm mẫu. Ca đổi hoàn cảnh đã thay sân khấu bằng đi ô tô trước đám cưới/lo nhăn. Freeze lại24-case file active, chỉ dispatch bốn ID đã đăng ký.
- Tool/runtime/source config/policy/fallback/bounds không đổi. Mỗi generation trong tool continuation vẫn là một request, không retry attempt. Stateful8 gồm một private code turn và một human-request control riêng. Replay không có tool, dùng clock/context đã chụp của chính lượt integrated, không phải live eligibility.

## Đánh giá actual outcomes

[Toàn bộ16lượt](CONVERSATIONS_AND_REVIEW.md), [primary JSON](PRIMARY_REVIEW.json). Chấm cả nhu cầu, history, lời thực nhận và public state; không chấm keyword, không lấy đúng dữ kiện thay cho mục tiêu bán hàng/tự nhiên. Review là nhận xét người đọc, không phải gate hoặc model role mới.

| Nhóm | USABLE | NEEDS_EDIT | UNUSABLE | Ownership control |
| --- | ---: | ---: | ---: | ---: |
| Stateful8 |6 |1 |0 |1 |
| B1 integrated4 |1 |2 |1 |0 |
| Advice replay4 |0 |3 |1 |0 |
| Tổng16 |7 |6 |2 |1 |

USABLE vẫn có thể có minor polish. Một mẫu mỗi ca chỉ là quan sát, không chứng minh ổn định. Các outcome replay phụ thuộc nguồn integrated; không cộng thành các tình huống mua độc lập hoặc so tỷ lệ trực tiếp với run48 cũ có N3/case khác.

- Giỏ/state/tổng978.100đ, actual checkout invitation/private preview/confirm đều đúng ở hành trình duy nhất. Câu correction không còn thêm đánh giá fit, nhưng vẫn đọc số đo và kể cập nhật hồ sơ. Hai ACK còn nối lời mời xem thêm/chốt giống nhau và lặp đặt trước. Formatter preview/confirmation giữ giọng code cũ.
- Concern vẫn quảng cáo bằng chuỗi tính từ và nhắc ngân sách, chưa gỡ tốt nỗi lo nhiều ren. Hai partial-source không bịa giá/tồn nhưng nói về hệ thống/xin thông cảm. Không chấm lỗi vì nguồn được chủ động làm unavailable.
- Lookup integrated trả đúng áo lẻ929k/cả bộ1.065k, nguồn có tồn cho cả hai. Advice replay gọi lựa chọn “bản composite”, không rõ khách nhận món gì. Một lần lookup thành công chưa chứng minh contract lỗi cũ được sửa, vì runtime giữ nguyên.

## Terminal và nguyên nhân fallback

| Nhóm | Eligible | Fallback | Handoff | No-send |
| --- | ---: | ---: | ---: | ---: |
| Stateful8 |4 |0 |2 |2 |
| B1 integrated4 |3 |1 |0 |0 |
| Advice replay4 |3 |1 |0 |0 |
| Tổng16 |10 |2 |2 |2 |

Fallback2/16=12,5%, cùng tình huống đi xe trước đám cưới ở hai surfaces. Search tích lũy7runtimeProducts nhưng hardPrecheck chỉ cho4; terminal MALFORMED trước semantic verifier. Cả hai verifier requests=0. Offline diagnostic chỉ giảm mảng ấy trên bản sao thì lỗi cấu trúc hết, không cấp semantic PASS, không chạy bù hoặc dùng bản sao để gửi. [Đủ hai draft và nguyên nhân](FALLBACKS.md), [diagnostic](BOUNDARY_DIAGNOSIS.json).

Handoff2/16 gồm purchase confirmation và human-request control. No-send2/16 vẫn có actual code invitation/private preview được capture, không phải hai lỗi tư vấn. Không có external POS order, nhân viên thực trả lời hoặc live transport trong bằng chứng này. Fallback giữ ID/text/hash của registration/manifest: C3_A_NONPROTECTED_V2, “Phần này em chưa trả lời được, chị nhé.”.

## Provider, latency, token và audit

-34upstream generation requests:24owner +10verifier,34generations mỗi cái1request, retry0; HTTP/provider timeout/error0/34. Hai MALFORMED là structural precheck, không phải provider completion error. Mọi generation/outcome giữ trong denominator.
-10draft qua hard precheck đều bắt buộc verifier,10PASS/0FAIL;10eligible là exact final text đã PASS, không rewrite.10bindings recompute khớp;24captured owner requests dùng exact Gemini prompt;4replay capture hashes và ba population source identities khớp seal.
- Metrics kiểm51wire captures có cả DISPATCHED/RESULT trùng request; diagnostic kiểm41bodies gồm canonical request cùng dispatch, không phải51 hoặc41generations. Không thấy evaluator labels trong các request được kiểm; private fixture phone marker không có trong các public artifacts/model request captures. Focused protocol tests có capture firewall/negative controls.
- Owner91.941input/19.409output tokens; verifier47.392input/663output. Usage đủ, cost không được expose. [Metrics](METRICS.json), [request accounting](REQUEST_ACCOUNTING.json), [verdicts](VERIFIER_DIAGNOSIS.json).
- Verifier latency trên10lượt thực gọi: p50 **5,46s**, p95 **6,33s**. Percentile nội suy, mẫu nhỏ.

| Nhóm | Verifier p50/p95 | Added verification p50/p95 |
| --- | --- | --- |
| Stateful,4verifier samples |5,60/5,64s |8,36/8,55s |
| B1,3verifier samples |5,10/6,72s |5,82/7,42s |
| Replay,3verifier samples |5,17/5,36s |4,98/5,35s |

Added replay latency dùng cả4attempts, gồm precheck-stop khoảng0,72ms không gọi verifier; không nhầm mẫu này với một verifier response. Integrated added latency gồm readback. Stateful DB đã drop; private checkout0model requests.

34raw artifacts đã index:26exact byte copies,8public provider-attempt copies chỉ bỏ synthetic private ingress batch; originals giữ ở temp. Cả5runner/preflight logs được lưu, dù file log bị ignore mặc định. [Artifact index và hashes](ARTIFACT_INDEX.json). Historical48-run raw/primary/counts giữ nguyên.

## Commands thực sự chạy

```text
pnpm --filter @lana/worker build
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json --preflight
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
python apps/worker/evals/single-agent-commerce-read-only/gemini-prompt-once-20261019/run.py C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py C:/Users/nguye/AppData/Local/Temp/c3-gemini-prompt-once-20261019
python C:/Users/nguye/AppData/Local/Temp/c3-gemini-prompt-once-primary.py C:/Users/nguye/AppData/Local/Temp/c3-gemini-prompt-once-20261019
python C:/Users/nguye/AppData/Local/Temp/c3-gemini-prompt-once-publish.py C:/Users/nguye/AppData/Local/Temp/c3-gemini-prompt-once-20261019 apps/worker/evals/single-agent-commerce-read-only/gemini-prompt-once-20261019
python C:/Users/nguye/AppData/Local/Temp/c3-gemini-prompt-once-metrics.py C:/Users/nguye/AppData/Local/Temp/c3-gemini-prompt-once-20261019 apps/worker/evals/single-agent-commerce-read-only/gemini-prompt-once-20261019
node C:/Users/nguye/AppData/Local/Temp/c3-gemini-prompt-once-audit.mjs C:/Users/nguye/AppData/Local/Temp/c3-gemini-prompt-once-20261019 apps/worker/evals/single-agent-commerce-read-only/gemini-prompt-once-20261019
git diff --cached --check
```

67focused tests PASS ở preparation base trước khi thay prompt; sau copy exact Gemini,10protocol tests PASS, freeze/hash/syntax checks PASS. Build exit0; config/stateful preflight PASS; source adapters readback PASS;3population jobs và2preflight/source jobs exit0. [Exact child commands](raw/commands.json). Audit/readback/secret/phone-marker checks PASS. Không claim worker full tests/lint/typecheck riêng hoặc remote CI mới trong lượt chạy model này.

Complexity delta: không sửa runtime/tool/state/gates, không thêm semantic role/layer. Chỉ thay owner prompt/hash, bảo toàn bytes và thêm registration/launcher reuse/evidence cho một vòng. [Findings](FINDINGS.md). Dừng sau báo cáo; không tự patch context, prompt, rollback hoặc chạy vòng tiếp.
