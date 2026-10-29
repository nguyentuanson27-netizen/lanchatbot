# Phase C — diagnostic sau remediation,29/10/2026

**Đã chạy hết một batch development:6/6ca,9lượt khách +1probe. STOP batch tại đây; qualification vẫn BLOCKED, C3 NOT_RUN.** Không phải full qualification và không dùng những case đã thấy làm fresh holdout. [Toàn bộ hội thoại](CONVERSATIONS.md), [accounting và artifact hashes](ACCOUNTING.json).

## Identity và accounting

- Exact clean run source `6c5023ab6e4609041fcc79e5a7f3f34b0ad7d251`; source/report trước đó9affdd1b. Model/prompt/schema/runtime source giữ nguyên suốt batch; report-only commits sau run không đổi run identity.
- Owner Gemini3.5FlashLite HIGH, verifier GPT6.1Sol HIGH; config hash `b02564f877bd64b343826272d8f00ae590b8c92a3d71712b754bb9a5b7f93796`. Codex0.159.2, binary SHA256 `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`, existing process-scoped APPDATA; không đổi global client/model.
- Registration `4137f3fb3bb5b76202eee4b107c7c1726d976fec41ec91fb372671f98a39226b`; corpus `86400c4e1d1a213b2e74454761598a9e9620095081ef6820f023760a98204592`; world `23991b5af33a160d070d8048a6a922204d4eb9305fa93fa6d5d3307489e4c746`; actual initial artifact `8f8385a42e4482a714ad61507b182aee80da1ec69ef1ff1202ad8d3574220270`.
- N1, trần37generation. Thực tế20records/20generationHTTP:15OWNER +5VERIFIER (4native +1probe). Không retry, lỗi generation, pending completion, duplicate ID hoặc generation vượt1HTTP. Một OAuthHTTP riêng,0embedding; không gọi21là21generation requests.
- Đủ9native turns:3SEND_ELIGIBLE,2CODE_OWNED_SEND,2HANDOFF,2NO_SEND. Handoff2/9, NO_SEND2/9, fallback0. Có5text được capture,0ảnh;0live send. Không dùng các tỷ lệ terminal này thay whole-turn quality score.
- Owner latency p50/p95:3,266/8,447ms; verifier gồm probe:8,801/11,506ms. Native4verifier calls có thêm latency riêng8,301–11,506ms; không phải SLA production. Reported usage: owner126,956input/13,591output tokens; verifier28,516input/461output. Cost không được provider expose. Raw giữ latency/usage và thời gian verification+postprocessing riêng.
- Disposable PostgreSQL đã drop; nguồn sạch, không source publication hoặc shop/state/live effects. Chỉ mutation trong DB synthetic được phép và Meta in-memory capture. Stop latch không kích hoạt; không tự chạy batch thứ hai.

## Kết quả từng ca

| Ca | Outcome thực | Nhận xét dựa trên source/trace |
|---|---|---|
| s09 — giặt tay/máy | SEND_ELIGIBLE | FAQ đã đến owner request thứ3; trả đúng ưu tiên giặt tay, máy cần túi giặt/chế độ nhẹ. Verifier PASS. Lỗi luồng policy trước đây có cải thiện quan sát được. |
| j1 — áoL, sửa thànhM+L, hỏi tổng | HANDOFF lượt1, NO_SEND hai lượt sau | Draft tự nói Be còn hàng bị verifier chặn đúng. Trước đó tool trả CART_VARIANT_AMBIGUOUS và availableColors:[BE], dù BE_L tồn0 còn NO_COLOR_L tồn9. Hint code góp phần dẫn sai; không quy hết cho model hoặc nới verifier. Journey chưa đạt. |
| j6 — setM, lên đơn, trả khi nhận | SEND_ELIGIBLE rồi2CODE_OWNED_SEND | Cart có receipt; hai câu xin tên có proof/accepted Outbox hợp lệ. Tuy nhiên paymentMethod vẫnnull sau lời khách trả khi nhận: chỉ sửa được capture/question history, chưa chứng minh COD được ghi nhận. |
| s06 — phối áo với quần nâu sẫm | SEND_ELIGIBLE | Trả lời được nhưng dài, nhiều tính từ quảng cáo. Không thấy error bound trong lần này; cũng chưa chứng minh lần này đã tái hiện nhánh inline-image vượt bound cũ. Không gọi đây là qualityPASS. |
| s11 — beL, hai bộ | HANDOFF STOCK_UNAVAILABLE | Các tool args đúng schema lần này; lookup SET_VAY/SET_QUAN màuBE trả VARIANT_NOT_FOUND, không có căn cứ xác nhận đủ hàng. Không suy HANDOFF nghĩa là đã chứng minh cả sản phẩm hết hàng hoặc model ổn định. |
| Probe scoped feedback | Verifier PASS, không gửi khách | Actual select_product_media(FEEDBACK,SV1561) trả NO_VERIFIED_MATCHING_MEDIA; draft chỉ nói thiếu feedback đã xác minh trong nguồn đã tra. Không phải shop-wide absence, không E2E, không SAFETY qualification. |

## Findings và bước tiếp theo

1. **Contract biến thể cần thống nhất giữa read/selection/error và trusted evidence.** read_product đang cho stock chưa phân màu; selection error lại trả BE như availableColors dù dòngBE tồn0. Model còn nâng hint này thành claim có sẵn. Cần phân biệt candidate values với biến thể bán được/stock đã xác minh tại consumer contract, không thêm regex cho màuBe và không nới verifier.
2. **Public history không thể tự tạo dữ liệu chưa parse/persist.** Lời “Chị muốn trả khi nhận hàng” đi code-owned checkout, nhưng checkoutDetails hiện chỉ nhận một số cách viết như COD/tiền mặt/nhận hàng trả; owner extraction không tham gia private path đó. Cần xử lý contract intake/payment và privacy boundary trước khi hứa đã hiểu mọi cách nói COD; không tiếp tục vá câu trả lời để che state null.
3. **Giọng s06 vẫn dài.** Phần này chưa đạt hiệu quả bán hàng mong muốn; scope remediation vừa rồi không sửa prompt giọng. Không thay tiêu chí hoặc gắn qualityPASS vì verifier cho qua.

Independent audit xác nhận20bodies không thấy evaluator labels/caseId kể cả JSON lồng;9raw/hash và20request hashes khớp, registration không đổi. Hai code questions qua validCodeOwned cùng receipt/Outbox. [Review](REVIEW.md). Đây là bounded development evidence, không phải chấm mù qualification hoặc stability proof. Giữ nguyên primary grades campaign03/B_NOT_GO/AOWNER_BYPASS; inventory/mapping/near-duplicate và fresh qualification vẫn chưa hoàn thành.

Đã append17artifacts diagnostic vào toàn bộ manifest A/B/C cũ và rebuild offline,0provider: `../c3-c-diagnostic-development-sources-20261029-03.json` → `../c3-c-diagnostic-development-inventory-20261029-03.json`.6426artifacts/missing0; hash `e1b855b6dddcfbfb709961711580b1a15b5b96f1e90a95739d635b2cf0482b83`;2378artifacts cần mapping theo extractor hiện hành. StatusPENDING, không phải approval/freshness proof; số1125 của scan02 trước đây là snapshot lịch sử, không phải số hiện tại.

## Commands và phần chuẩn bị đã chạy

Exact program arguments dưới đây; PowerShell redirection/process APPDATA và credential wrappers không được tuyên bố là transcript byte-for-byte của mọi shell command. Không có credential content trong report.

```powershell
node --test "apps/worker/evals/single-agent-commerce-qualification/*.test.mjs"
node --check apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs
node apps/worker/evals/single-agent-commerce-qualification/cli.mjs init --out ../c3-c-diagnostic-config-6c5023ab.json
python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-c-diagnostic-run-20261029-02 COD --phase-c-diagnostic-registration ../c3-c-diagnostic-sealed-20261029-02/REGISTRATION.json --phase-c-world ../c3-c-diagnostic-world-resolved-20261029-03.json --phase-c-seed ../c3-c-diagnostic-sealed-20261029-02/PRIVATE_BLIND_SEED.json
git diff --check
```

Focused78testsPASS; reviewer independently6diagnostic testsPASS. No TS/prompt/API change; build/typecheck/lint của prior remediation giữ source identity430ee4fa, không claim đã rerun build cho diagnostic source. New diagnostic module từng RED trước export; reviewer bắt stop codes/combined recovery và initial-source binding, đã fix rồi APPROVE6c5023ab. Frozen inputs và actual preflight được duyệt riêng trước dispatch.

Read-only capture107products; isolated approved handoff clone khai báo provenance, không publish. Initial capture01FAIL do hash trước JSON normalization, DBdrop/provider0; source authoring còn phát hiện missing schemaVersion của clone, đã normalize đúng DB envelope không đổi policy content. Initial02PASS tại0b94 được giữ; initial03PASS tại exact6c5023ab mới được đăng ký. Default Codex client version mismatch bị chặn ở inspect0requests; khôi phục existing pinned binary qua processAPPDATA, không đổi model. Các failure chuẩn bị được giữ nguyên ngoài source, không được xóa khỏi lịch sử hoặc gọi là generation retries.
