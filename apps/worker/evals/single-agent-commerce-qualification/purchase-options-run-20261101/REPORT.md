# Purchase-options model run — 01/11/2026

**BLOCKED / batch dừng theo gate; chưa hoàn tất toàn bộ population.** Đăng ký21ca/28lượt khách, N1/retry0; đã thực thi15ca/18lượt.6ca/10lượt còn NOT_RUN sau ca s09 thay đổi snapshot giữa verifier và final gate. Không retry, bỏ gate hoặc chạy lại để thay kết quả.

[Toàn hội thoại và6ca chưa chạy](CONVERSATIONS.md), [accounting V2](ACCOUNTING.json), [primary audit](PRIMARY_AUDIT.json), [stop attribution](STOP_ATTRIBUTION.json), [offline replay](OFFLINE_REPLAY.json), [population/readiness](FROZEN_POPULATION.json), [review status](REVIEW_STATUS.json), [artifact hashes](ARTIFACTS.json).

## Identity và phạm vi

| Nội dung | Identity/kết quả |
|---|---|
| Implementation đã duyệt | Delivery857fa88f, runtime TS5666f172 không đổi |
| Run source đã commit/sạch | `c31a308952534dd558a98fc48eedf1b694bb5c06` |
| Registration | `bf64bf00490d0595be7adc3a607c5ecd6588001cd28ce98c5bd0f1c6d4c97154` |
| Corpus | `9ea91b56e18e0a47942ded2f9404887c08d6eedf8ed0f4c1f3487147bc757ba6` |
| Config | `d0eb3b1e82b1982794f62be4bb391ddb7c6b159979f55d38fbf7f0c4773f4132` |
| Frozen world | `e3175ef4842819959a5dfa6fa5cb2f020c6bb1b48b32e87c26bad9404f8036ec` |
| Actual native initial state | `c321a176c6c4595c77d5c899ef28bcf6c8f37a311681721ff11dc1800e0837f9` |
| Owner | Vertex AI `gemini-3.5-flash-lite`, version cùng tên, HIGH/global; candidateCount1/max8192/timeout90s/retry0; temperature/topP omitted |
| Verifier | `gpt-6.1-sol`, version cùng tên, HIGH; Codex0.159.2, binary SHA256 `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`;1upstream/attempt,90s/retry0 |
| Execution | 00:09:51–00:20:34 ngày01/11 giờ Việt Nam,642.443s; launcher exit0 nhưng batch status QUALIFICATION_FAILED |
| Dispatch limits | 21ca/28turns/max112generations;2toolrounds/6callunits/3owner+1verifier mỗi lượt; send disabled |

Owner/verifier prompt files, schema/model/config và business runtime không sửa để cứu kết quả. Trước seal có hai thay đổi **evaluation-only** đã commit: fixed21-case scope/2turn journeys + SINGLE audit coverage (`84833543`), và source-readiness thiếu publishedEnabled so runtime policy read (`c31a3089`, RED1→GREEN). Các controls cũ không được coi là fresh qualification holdout.

Source capture mới107products dùng route read-only HTTPS/SNI/CA qua SSH đã có; observed source không được gia hạn hoặc giả feedback/màu. Capture source857 và run sourcec31a khác evaluation helper; runtime TS/packages giữ nguyên. Handoff matrix thiếu upstream tiếp tục dùng **existing approved isolated-only matrix**, không publish shop policy. Actual initial PostgreSQL sạch/DBdropped/provider0 được lấy tại runsourcec31a. Input/final dispatch đã được cùng independent reviewer APPROVE trước provider;97focused PhaseC tests PASS.

Population có11purposes mới và10ca cũ giữ nguyên câu khách, tổng21ca/28turns. P05 chưa đăng ký vì không có một mã có đồng thời SET_QUAN và SET_VAY trong capture; ghi BLOCKED, không gộp hai thiết kế để giả nguồn. P08 dùng chuyển set→áo mà nguồn hỗ trợ; không tạo transition combo không có. Combo P06 dùng SD023/COMPOSITE có3components thực, nhưng thiếu media bắt buộc nên là source-unavailable control. [Sáu B controls](PRESERVED_B_CONTROLS.json) giữ exact body hashes; không có provider replay B mới hoặc paired B–C quality comparison trong batch này.

Preregistration phân15SALES_READY/6SOURCE_UNAVAILABLE. “Ready” chỉ nói prerequisites đã đăng ký, không bảo đảm owner dùng đúng task hoặc mọi request sẽ vừa wire bound.9ready+6unavailable đã chạy;6ready còn NOT_RUN. Không chuyển nhóm sau khi quan sát outcome.

## Actual denominator và vận hành

- **37generation records =27owner+10verifier;36generation HTTP.**35OK;1owner malformed HTTP200;1owner OWNER_REQUEST_BOUND trước dispatch/0HTTP. Không auth/HTTP401/429/5xx hoặc timeout được quan sát; không gọi request-bound là hết quota.
-18actual terminals: **9SEND_ELIGIBLE,8silent HANDOFF,1HUMAN-owned NO_SEND**.9texts/9accepted Outbox;0images,0fallback customer text,0live sends. Handoff/no-send rate9/18=50% trên lượt đã thực thi, không dùng làm rate toàn28turns.
-10verifier verdicts đều PASS;9được final gate cho gửi,1bị snapshot gate chặn. Không gọi10PASS là10reply gửi được hoặc semantic safety proof.
-Verifier latency p50 **7.920s**, p95 **29.517s** (nearest-rank,n10). Input/output observed **350739/26779tokens**, usage36/37generation records; một request-bound0HTTP không có usage. Cost không được expose. Latency gồm harness/relay; không suy thành production SLO.
-Auxiliary embedding2predict+1OAuth, đều200, được ghi riêng với generation HTTP; generation OAuth riêng có trong journal. Không cộng embedding vào37generation records.
-Actual disposable DB đã drop; source sạch tại run, không mutation nguồn shop hoặc deploy.6NOT_RUN giữ đủ slot/reason, không xóa khỏi denominator.

Primary audit đối chiếu18raw canonical hashes,37unique generation IDs,36actual request-body hashes/firewall/model identities,9eligible final draft/snapshot bindings và9accepted text hashes/Outbox. Đây là **kiểm tra của tác giả**, không phải final independent audit. [Accounting bản đầu](ACCOUNTING_INITIAL.json) có capture field[] do dùng một field không có trong raw; V2 đã sửa theo terminal thực+accepted Outbox hashes,9texts/9rows. Giữ cả artifact/helper cũ; không sửa raw/model outcomes.

## Root cause của hard stop: lazy chart hydration, không phải TTL

s09 hỏi giặt áo, owner đọc đúng read_policy rồi tạo draft. Verifier PASS, nhưng final readback bổ sung `runtimeProducts[SQ2447].sizeCharts` trước đó chưa có. Chỉ field này và `state.factSnapshotVersion` thay đổi giữa exact verifier trusted snapshot và current snapshot; revision/recipient/draft không đổi. Gate trả STALE/CURRENT_SNAPSHOT, recovery silent handoff, diagnostic latch giữ6ca sau NOT_RUN.

Gate lúc17:20:27UTC; POS source hết hạn17:58:45UTC, còn hơn38phút. Vì vậy **không quy đây là hết freshness nguồn**. [Offline replay](OFFLINE_REPLAY.json) trên cùng frozen source/clock không network/provider/effect đã tái hiện prepare→read_policy→snapshot chưa chart→readback thêm chart. `read_policy` thay policy cache, nhưng prepared numeric product chỉ hydrate chart khi replay readback; phase publication không ổn định trước verifier. Chặn changed world là đúng; code phải hoàn tất/ổn định trusted context trước khi cấp draft cho verifier, không bỏ snapshot equality hay reverify loop.

## Những gì đã làm được và chưa được

| Ca | Quan sát và giới hạn |
|---|---|
| P01 áo lẻ | quote_product thật đọc AO499k và ảnh eligible; owner generation tiếp HTTP200 nhưng output malformed → silent handoff. Không thiếu giá hoặc ảnh trong ca này; exact parser cause chưa được telemetry phân loại rõ hơn |
| P02 quần lẻ | Không có ảnh eligible bắt buộc → silent handoff, không giả ảnh để gửi giá |
| P03 chân váy M | SEND_ELIGIBLE từ prepared evidence, không thêm tool round. Cần kiểm scope size của assertion trong review tiếp; không dùng aggregate stock để tự bảo chứng mọi size |
| P04 chọn size→giá set | Engine thật trảM từ height/weight và approved applicability; hai reply gửi được, trả799k ở lượt sau và dùng context. Không có ảnh gửi; việc cần form quote/ảnh tại follow-up này chưa được chấm độc lập |
| P06 combo3 | Metadata/ref/BOM có sẵn; nguồn thiếu ảnh, handoff. Chưa chứng minh bán combo/checkout thành công |
| P07 size từng phần | **Source-unavailable control không đạt hành vi dự kiến:** owner gọi engine cấp sản phẩm, engine trảM/componentRoleOTHER; không có component-fit áoM/quầnL. Reply lại ghi nhận áoM/quầnL từ thói quen khách, chuyển sang tính mua lẻ928k và hỏi chốt; verifier PASS, gửi được. Không có receipt thêm giỏ. Không gọi đây là component-size success hoặc tất cả source controls PASS |
| P08 đổi set→áo | T0 thêm setM có receipt và báo829k cảship. T1 đổi sang áo gặp colour ambiguity rồi silent handoff. Giữ cart/effect thực trong evidence; không nhận toànjourney đã đổi thành công |
| P09 tên chung | Metadata hai mã đã được chuẩn bị nhưng owner request vượt wire bound trước HTTP → silent handoff, lượt khách phân biệt sau HUMAN no-send. Đây là request admission/projection residual, không phải provider outage/stock nguồn thiếu |
| P10 tên chưa rõ | Hỏi lại mẫu qua hai gợi ý tìm kiếm; reply gửi được. Không tạo lịch sử shop giả cho “hôm trước” |
| H01/H02 | Màu nguồn chưa xác định và ảnh stale: handoff im lặng, không bịa màu tiêu chuẩn hoặc renewal |
| s05/s06/s08 | Đã chọn món/phối đồ/so sánh,9reply gửi bao gồm các ca này; giọng vẫn catalog/nhiều tính từ/“giúp em”, chưa chứng minh tiến bộ giọng hay sức bán |
| s09 | Draft giặt đồ không gửi vì lazy chart hydration làm changed snapshot; là blocker code, không do verifier quá chặt |

6ca chưa chạy: s10 đổi màu đơn cũ, s12 lỗi khóa, s14 defer, s15 ACK màu, j2 correction size và j6 checkout/COD. Không dùng test deterministic hoặc run cũ làm kết quả provider mới cho6ca này.

Source controls theo **đúng turn chịu ảnh hưởng**: P02/P06/H01/H02 silent handoff; P08T1 silent handoff nhưngT0đã gửi; P07gửi reply thay vì handoff cho component-sizing gap. Vì vậy không có kết luận6/6controlsPASS.

## Review độc lập và kết luận

Reviewer đã APPROVE inputs và dispatch trước run. Sau run, reviewer đọc raw xác nhận denominator/stop, chỉ ra lỗi accounting capture và exception P07; tác giả đã sửa accounting V2. **Chưa có final post-run independent audit approval:** agent dừng với “Your workspace is out of credits”.

Fresh offline judge GPT-6.1 Sol High nhận public packet21items, hash `b485b2265c563ef2c8c9d0a9f10b1f5de8509425e82ab92c07e76de146708930`, không private mappings/seed. Agent cũng hết credits trước khi tạo INDEPENDENT_GRADES/GRADE_LOCK. **0locked grades, không có quality pass rate hoặc điểm tự chấm thay thế.** NOT_RUN không được biến thành gradeFAIL giả hoặc coi missing vô hình.

Recommendation **BLOCKED**: fix stable pre-verifier context publication/lazy chart hydration trước run mới; kiểm native request bound cho hai targets và sizing scope/gap hành vi ởP07; giữ source media/colour prerequisites riêng. Không nới verifier, tăng caps, retry/gỡ hard latch hoặc patch câu theo case. Bộ mới khác và bị dừng sớm, không thể so tỷ lệ toàn bộ với22ca vòng trước để tuyên bố tiến bộ/thụt lùi định lượng. PhaseC qualification BLOCKED/C3NOT_RUN/B_NOT_GO; không merge/deploy/live send.

## Commands thực chạy và evidence

Commands từ repo root; raw/helpers/logs bên ngoài checkout. Không nhận511worker/776Node/76PG implementation checks của task trước là rerun mới.

```powershell
# Fresh public sources, existing read-only capture route; provider0/sourcewrites0
python apps/worker/evals/single-agent-commerce-read-only/source-session.py python ../c3-c-variant-qdrant-tunnel-20261030.py node --import ../c3-c-variant-qdrant-tls-forward-20261030.mjs apps/worker/evals/single-agent-commerce-qualification/capture-world.mjs ../c3-purchase-world-20261031-01 ../c3-purchase-run-codes-20261031.json
# Actual native initial state, DB dropped/provider0
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-purchase-initial-20261031-02 COD --phase-c-initial-world ../c3-purchase-world-resolved-20261031-01.json
node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-qualification/*.test.mjs"
# 97PASS; new scope/published-readiness focused RED→GREEN before seal
node ../c3-purchase-prepare-20261031-04.mjs
node ../c3-purchase-finalize-20261031.mjs
# Same reviewer APPROVE INPUTS → preflight PASS → APPROVE DISPATCH
python ../c3-purchase-launch-20261031.py
# exit0 with QUALIFICATION_FAILED hard-stop result; DBdropped
node ../c3-purchase-accounting-20261101-02.mjs
node ../c3-purchase-packet-20261101.mjs
git diff --check
```

Initial pending01 policy readiness evaluator bug, pending02 unrelatedj6 selector, pending03 misleading inherited provenance were corrected **before first provider request**, with original artifacts retained ([corrections](PREPARATION_CORRECTIONS.json)). Initial j6 source mismatch was found by independent input reviewer; final04 uses actualSV2447/SET_VAY. Do not call prereg corrections post-result tuning.

Offline stop probe and primary audit were executed as inline local Node; output JSON is committed with raw-binding references. No runtime fix or new provider request after hard stop. All reported file hashes and transcript/outcome mappings must remain intact before a future independent review can finish.
