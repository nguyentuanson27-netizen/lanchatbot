# Phase B — bản sửa tư vấn/media và kiểm tra

Ngày 23/10/2026. Base `88589b180379eea5c5d0efbf2c06feed903909b2`. **MEDIA_IMPLEMENTED_AND_SELF_REVIEWED; ADVICE_CANDIDATE_PREPARED; PROVIDER_NOT_RUN; B chưa GO.** [Plan đã sửa](c3-phase-b-sales-and-media-plan-20261023.md), [review độc lập REVISE](c3-phase-b-sales-media-independent-review-20261023.md).

## Những gì đã thay

1. Plan tiếp thu một P2 capability và hai P3: B1 chỉ chữ; advice toolsOFF; bốn media additions đi qua ingress thật. Advice/media là hai nhánh độc lập, review giọng riêng. Savepoint `0619ac1a`.
2. Candidate media GENERIC dùng quy tắc ảnh chính + góc bổ sung đã có trong `selectPriceCardImages`, sau khi lọc approval/hash/freshness/host/part. Không sửa shared package. Tắt legacy imageUrls fallback bằng tập URL rỗng; không để URL chưa duyệt đi vòng qua authority. DETAIL/BACK/FEEDBACK và final gate giữ nguyên. Savepoint code `141020b8`.
3. Mô tả media tools cho phép chủ động chọn ảnh giúp khách quyết định, tách xem khỏi gửi; lời dẫn tập trung vào việc khách cần xem, không nói tình trạng phân loại nội bộ. Không cần view chỉ để gửi ảnh theo metadata. Không đổi schema/API/model hoặc retry.
4. Mô tả search/read hướng dẫn sàng description trước khi mở giá/tồn nhiều món; đọc đúng offer khi khách đã chọn phần cần mua. Không tăng bound hoặc ép sản phẩm search gần nghĩa thành phù hợp.
5. `sales-media-cases.json`: bốn lời khách độc lập về cận thêu, feedback, mặt sau, phân vân về ren. `isolated-integration.mjs --provider-run --media-probe` dùng cohort mới qua stateful provider/ingress hiện hữu; N1, tối đa16requests. Các cohort flag loại trừ nhau, runtime projection bỏ evaluator. B1 không bị cấp thêm media hoặc đổi population.
6. Một advice candidate riêng thay đúng hai bullet tư vấn, tập trung vào điều cản khách mua và điểm quyết định; không thêm câu mẫu của bộ kiểm. Active owner prompt giữ baseline. Candidate14.413bytes so baseline14.248 (+165bytes); authority/policy/giọng/giao dịch không đổi. Tám paired inputs chuẩn bị bằng override có sẵn trong advice runner, thứ tự hai arm đảo theo index đã freeze; mỗi cặp cùng context/clock, toolsOFF. Không promote khi chưa có kết quả.

Evidence chuẩn bị: [thư mục](../../apps/worker/evals/single-agent-commerce-read-only/sales-media-preparation-20261023/), gồm candidate/hash, SOURCE_AUDIT, advice-paired-inputs và PAIRED_REQUEST_CHECK, WIRE_SIZE_CHECK, worker-tests.log.

## Audit và điều chưa được chứng minh

Audit dùng snapshot công khai đã lưu ngày22/10 và wire của repeat39, không phải refresh catalog live ngày23/10. SV2447 có11ảnh với FRONT/BACK/CLOSEUP; SQ748 có7ảnh, SQ634 có SIDE. Snapshot có approval/hash metadata nhưng không project đầy đủ imageType/feedback, nên **feedback availability chưa xác nhận**. Asset-color binding vẫn thiếu. Khi provider campaign mới chạy phải readback nguồn/freshness hiện hành; không tự publish hay tạo ảnh/nhãn mới.

Gallery request ban đầu nhận product description/availableOffers và media capabilities nhưng chưa có inlineData. Ca discovery đã nhận description chứa short/cạpchun; verdict chỉ có ref, chưa có span để kết luận chặn sai. Vì vậy không tạo bảng lợi ích/fit hoặc nới verifier.

Tool-mode ca changed-occasion: request owner3 thực sự có mode NONE, toolsAllowed=false, roundsRemaining0. Model vẫn trả functionCall. Không có bằng chứng adapter thiếu cờ; giữ fail-closed/accounting, không thêm retry hoặc lời chữa sau lỗi.

Deadline và quote-order vẫn theo plan cũ: chưa đổi verifier/ETA semantics hoặc reorder quote theo phỏng đoán. Chưa chạy controls deadline, quote experiment hoặc A2/A3. Không nhận đã đóng toàn bộ finding B.

## Verification thực sự chạy

| Command | Kết quả |
|---|---|
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media.test.ts` trước sửa | RED:1failed/13passed, chọn front-2 thay back |
| Cùng command sau sửa selector | GREEN14/14 trước bổ sung guard fallback |
| `node --test apps/worker/evals/single-agent-commerce-read-only/sales-journeys-registration.test.mjs` trước thêm registrar | RED: thiếu export registerMediaProbe |
| Cùng command sau thêm registrar | GREEN5/5 |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/protected-claims.test.ts src/reply-assembler.test.ts` | PASS122 tests/4 matching files. Hai tên protected/reply không có trong worker; kiểm đúng package ở dòng dưới |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/image-selection.test.ts` | PASS41/3files |
| `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-read-only/sales-journeys-registration.test.mjs` | PASS84,0skip |
| `pnpm --filter @lana/worker exec vitest run src` (redirect worker-tests.log) | PASS1959/133files |
| `pnpm --filter @lana/worker build` | PASS, gồm dependency builds |
| `pnpm --filter @lana/worker typecheck` | PASS |
| `pnpm --filter @lana/worker lint` | PASS |
| `node --check apps/worker/evals/single-agent-commerce-read-only/stateful-provider.mjs` | PASS |
| Offline paired request construction qua existing buildAdviceOwnerRequest/buildGeminiCommerceRequest | PASS8wires/4pairs: ngoài systemInstruction giống nhau,0labelleak,0inlineData,toolsNONE |
| Offline thay description trên77captured owner wires | PASS bounds: max41.526→42.603bytes, không generation; không chứng minh requests tương lai luôn vừa |
| `git diff --check` | PASS |

Không full eval suite, live source preflight, real-Postgres media cohort hay provider generation trong lượt này; không nhận đã chạy. Unit/integration source tests dùng synthetic public inputs, không chứng minh Gemini sẽ tự gọi đúng tool hoặc giọng đã tốt hơn.

## Self-review và complexity

- Một nhánh chọn helper hiện hữu trong media seam, không selector/framework mới hoặc shared source edit. Kiểm regression fallbackURL/approval, typed detail/feedback, stale media với old PASS, private/ingress boundary.
- Một eval registrar12dòng + cohort flag, không production router/state. Test captured wire không evaluator-only labels; corpus giữ labels ngoài runtime.
- Không thêm role, semantic layer, gate, state, parser, regex sản phẩm, repair loop hoặc automatic retry. Không deploy/live send/POSorder/sourcewrite.
- Giọng phải báo riêng ở vòng sau: cột giao dịch/quyết định, giọng cần sửa, media, evidence toàn lượt. USABLE không được che câu dài/gượng. Media tool guidance và advice là hai treatment khác nhau, không gộp để suy nhân quả.
- Feedback nguồn chưa rõ và media-bound subject/colors chưa đầy đủ là source limitations. Candidate advice là hypothesis, chưa quality/stability PASS. B chưa GO.

## Cách chạy đã chuẩn bị, chưa dispatch

Advice: dùng `advice-diagnostic.mjs` với `sales-media-preparation-20261023/advice-paired-inputs.json` và thư mục out mới;8outcomes/16requestsmax. Media: launcher/source-session hiện hữu gọi `isolated-integration.mjs <new-out> COD --provider-run --candidate-handoff --media-probe`,4outcomes/16requestsmax. Phải clean executable/config commit và preflight trước dispatch, giữ runtime SHA ngoài frozen source. Không ghi SHA tự thay HEAD trong source.

Full39 và bốn media là bước provider khác khi owner yêu cầu; không tự chạy full hoặc thêm lượt sau error. Chưa có a2/a3RunSourceSha hoặc run identity provider mới trong báo cáo này.
