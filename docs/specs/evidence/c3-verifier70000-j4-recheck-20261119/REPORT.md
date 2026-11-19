# Verifier 70.000 byte — năm lượt J4 cuối đã qua

Ngày 19/11/2026. Hoàn tất yêu cầu owner tăng verifier wire lên 70.000 đồng bộ rồi chạy lại năm lượt J4 từng bị chặn. Source cuối **`82c86a3c67d1f12f0f87f6956e0c44c68b265957`**.

**5/5 SEND_ELIGIBLE, verifier 5 PASS, 0 HANDOFF/NO_SEND.** Cả năm báo đúng **499.000đ cả ship gửi Cần Thơ**, dùng quote hỗ trợ trước giỏ; không tạo giỏ, không ghi thêm pending hoặc cấp ưu đãi mới trong lượt đo. Preparation không còn chặn trước owner.

[Năm câu trả lời và tool](CONVERSATIONS.md) · [Kết quả chi tiết](PUBLIC_RESULTS.json) · [Mẫu số](SUMMARY.json) · [Accounting](GENERATION_ACCOUNTING.json) · [Verification](VERIFICATION.json).

## Đã sửa và kiểm gì

`VERIFIER_REQUEST_MAX_BYTES=70000` là cùng giá trị dùng cho validateProtocol và buildVerifierRequest; manifest.requestBounds.verifierWireBytes=70000. Test 69.999/70.000 được nhận, 70.001 bị chặn trước provider; manifest 65.536 không còn được chấp nhận. Owner vẫn 70.000, provider signature vẫn có trần riêng 65.536. Không sửa prompt/model/effort/schema, draft reserve, gate an toàn hay tăng tool/generation budget.

RED hai test trước sửa → GREEN. Bộ cuối **143 Node test PASS**, worker emit compile và lint/noEmit PASS ở implementation trước (TS source không đổi sau sửa harness). [Lệnh kiểm và phạm vi](../../c3-verifier-70000-j4-recheck-20261119.md).

Probe trên năm bộ context frozen trước đó: cả năm qua admission sau tăng giới hạn, verifier dự phòng tối đa **65.830/70.000 byte**. Đây là component reconstruction, không model result. Trong run thật, verifier request tối đa **44.873 byte**, owner text tối đa **64.097 byte**, signature tối đa **12.404 byte**. Verifier draft reserve chỉ dùng ở admission, nên kích thước thật nhỏ hơn kiểm dự phòng.

## Cách chạy đúng năm lượt

Đây là **năm lượt continuation cuối**, không phải năm hành trình sinh lại từ đầu. Dùng disposable PostgreSQL/native Inbox/history/profile/sales/Outbox fixture hiện có. Hai lượt đầu mỗi ca được dựng từ [public history đã được nhận của run trước](PREFIX.json), tool thật và scripted owner/verifier chỉ trong setup. Source nghiệp vụ hiện hành được kiểm lại; prefix timestamp mới là dữ liệu fixture, không làm mới timestamp nguồn shop. Chỉ câu hỏi cuối gọi owner/verifier thật.

Tổng **10 scripted setup turns +5 measured turns**. Mỗi lượt đo dùng một owner generation gọi quote_product, một owner generation trả final, một verifier request. Không offline judge. Preflight khóa source/config/model/prompt/input/world/prefix hashes trước generation. [Provenance](PROVENANCE.json), [seal](SEAL.json).

### Kết quả năm lượt đo

| Lần | Terminal | Tổng | Verifier | Ghi thêm commerce state |
| --- | --- | ---: | --- | --- |
| 1 | SEND_ELIGIBLE | 499.000đ | PASS | Không |
| 2 | SEND_ELIGIBLE | 499.000đ | PASS | Không |
| 3 | SEND_ELIGIBLE | 499.000đ | PASS | Không |
| 4 | SEND_ELIGIBLE | 499.000đ | PASS | Không |
| 5 | SEND_ELIGIBLE | 499.000đ | PASS | Không |

Lần 2 vẫn có RECORD thừa bị guard từ chối `NEGOTIATION_SOURCE_OR_CART`; quote sau đó thành công. Đây là hạn chế tool use còn lại, không có thêm write hoặc grant. Cả năm hỏi màu còn thiếu cho bước mua; ba câu vẫn giải thích trong ngoặc và một số câu kể lại giá/ship dài. Không claim cải thiện giọng hoặc đã giải quyết RECORD thừa.

Audit so sánh accepted TEXT với exact verified final draft/hash, đối chiếu tool và state trước/sau; không có commerce event mới. Account/wire/source hashes còn khớp sau run, model DB đã dọn, live send và source write đều 0. Đây không thay thế full safety audit, whole-journey quality hoặc qualification Phase C.

## Lần abort và accounting được giữ nguyên

Trước run cuối có một lần abort trên `2d81c264`. Owner request đầu đã hoàn tất; continuation thứ hai bị sender J1 cũ cộng signature vào text bound: text **63.152**, signature **12.692**, raw **75.844 byte**. Assertion J1_TEXT_BOUND xảy ra trước fetch. Raw ledger ghi UNKNOWN vì error ở ngoài telemetry; không xóa hoặc sửa ledger đó.

Probe cùng captured body qua đúng sender cũ với fetch trap tái hiện assertion đồng bộ, **0 fetch/auth/generation**. [Reconciliation](PRE_SEND_RECONCILIATION.json), [raw ledger giữ nguyên](ABORT_RAW_ACCOUNTING.json). Vì DB của run abort đã dọn, không claim resume continuation; đăng ký run mới và giữ lần abort trong tổng mẫu số.

Sửa riêng validator của mode J4 theo native signature contract: kiểm clone rỗng giá trị signature và trần signature riêng, gửi original provider body nguyên vẹn. Prevalidate trước dấu dispatch để lỗi local sau này không thành UNKNOWN. Các mode J1 cũ không đổi; unit test chứng minh body không bị sửa và cả text/signature quá trần vẫn bị chặn. Đây là sửa harness, không tăng owner bound hoặc thay input model.

- Run hoàn tất: **15 request =10 owner +5 verifier**, error/timeout/retry 0, judge 0.
- Run abort trước: **1 request owner đã dùng**, một local rejection 0 request theo reconciliation.
- Tổng công việc: **16 generation request**, **5 continuation hoàn tất +1 continuation attempt abort**. Không bỏ abort khỏi mẫu số, không dùng kết quả mới thay lịch sử lỗi cũ.
- Hai DB test (abort và run cuối) đều đã dọn. Setup không tiêu provider generation.

| Role, run hoàn tất | Request | p50 | p95 | Input token | Output token |
| --- | ---: | ---: | ---: | ---: | ---: |
| Owner | 10 | 2,99 giây | 7,72 giây | 142.642 | 10.673 |
| Verifier | 5 | 6,10 giây | 7,25 giây | 58.362 | 386 |

Cost không expose. [Metrics](METRICS.json). Token bảng thuộc run hoàn tất, không cộng giả usage của request abort; request đã dùng trước abort giữ trong raw accounting.

## Nguồn và lệnh chạy

World `02f5aaec99f1b22de1ca944ec950a1febbf85db37a2dfd0e2107b7dd412579ac`, capture source `2d81c264`, giữ nguyên bytes và timestamp khi chuyển sang harness fix `82c86a3c`. Preflight kiểm business runtime/read-only protocol/packages không có diff giữa hai source và nguồn còn đủ freshness theo đồng hồ thật. Không sửa world.sourceSha thành head mới. Một capture trước gặp heartbeat đổi synced_at, bị C_CAPTURE_POS_CHANGED trước generation; artifact lỗi được giữ riêng, chụp lại nguồn trước run. Không skip nguồn thay đổi.

Owner Gemini 3.5 Flash Lite High, verifier GPT-6.1 Sol High. Prompt hashes giữ nguyên; credential route cũ, CLI 0.159.2 hiện có, không model substitution. Dùng skill [lana-chatbot-ops](../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md) cho read-only nguồn/credential route và isolated test DB; không deploy hoặc live send.

Local run cuối `C:/Users/nguye/Documents/Sản phẩm AI/c3-verifier70000-j4-five-82c86a3c-20261119-094045`; run abort `C:/Users/nguye/Documents/Sản phẩm AI/c3-verifier70000-j4-five-2d81c264-20261119-092836`.

```powershell
$modelRunPath = Get-Content ../c3-verifier70000-j4-active-20261119.txt
python ../c3-current-cart-choice-launch-20261119.py node apps/worker/evals/single-agent-commerce-qualification/capture-world.mjs "$modelRunPath/world" "$modelRunPath/CODES.json" --test-media-proof-world ../c3-convergence-model-world-20261111-10/WORLD.json
$env:APPDATA = (Resolve-Path ../c3-verifier-replay-cli-01592).Path
node "$modelRunPath/seal.mjs" "$modelRunPath"
python ../c3-current-cart-choice-launch-20261119.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs "$modelRunPath/native" COD --j2-j1-campaign "$modelRunPath/INPUT.json"
node "$modelRunPath/audit.mjs" "$modelRunPath"
git diff --check
```

Capture command thực chạy ở run đầu, một lần FAIL vì heartbeat rồi lần mới PASS. Run cuối dùng lại capture đó đúng điều kiện còn hạn, không gọi capture thêm. Seal/preflight và native run cuối/audit PASS; run abort FAIL được giữ như trên. Helper trong [helpers](helpers). Không claim remote CI, review code độc lập mới hoặc full-repo check. **Lỗi preparation ở năm continuation đã qua; Phase C vẫn STOP theo phạm vi rộng chưa kiểm lại.**
