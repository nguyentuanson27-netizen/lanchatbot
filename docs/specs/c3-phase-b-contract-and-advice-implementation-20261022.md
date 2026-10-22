# Phase B — implementation hợp đồng công cụ và kiểm riêng tư vấn

Base `47b0cd995952eb7ac7e0c51174a853220698d17e`. Branch `feat/c3-phase-b-commerce-20261014`. Scope [kế hoạch đã duyệt](c3-phase-b-contract-and-advice-fix-plan-20261022.md). User yêu cầu implementation → independent review → fix → cùng reviewer review lại → fix → full case. A OWNER_BYPASS, B chưa GO. Chỉ candidate/harness cô lập, capture delivery.

## T0 — chuẩn whole-turn giữ nhất quán

Giá chính rõ cộng thêm một lựa chọn thật dùng được không tự là lỗi; chỉ NEEDS_EDIT nếu làm loãng câu trả lời hoặc mở lại lựa chọn vô ích. ACK đúng state nhưng giọng “đã cập nhật” là polish, không đổi thành false receipt. Chọn áo hoặc cả bộ đều có thể đúng nếu hợp nhu cầu, ngân sách và lý do; không chấm theo đáp án ép sẵn. Lặp một dữ kiện có ích để giải thích lựa chọn được chấp nhận; chép lại cả hồ sơ/đọc metadata là vấn đề giọng khi không giúp khách quyết định. Đọc actual terminal trước rejected draft, giữ nguyên primary lịch sử. Đánh giá không blind/human panel; không nhận một mẫu là ổn định.

## Sửa T1–T4

- T1: JSON Schema anyOf ràng buộc field/value theo measurement, enum fitPreference từ domain và preferences array; CLEAR không có value. Quote số đo/fit phải ở tin hiện tại; code không dịch nghĩa fit bằng regex. Domain/quote validation trả field error; store read outage khác invalid input. CAS/readback chưa xác nhận không trả applied:false, giữ pending trong turn, bỏ receipt/fit/quote cache; patch mới không xóa latch.
- T2: kết quả ảnh nói rõ phạm vi ảnh; thiếu binding màu khác nguồn lỗi/không có asset approved. Ảnh chung không chứng minh đã đáp ứng đúng màu; không cấp dữ kiện màu bán từ metadata ảnh. Group gate/byte hash/readback giữ nguyên.
- T3: read ETA reuse resolver checkout (configured region → miền Nam chung → nationwide, conflict giữ unavailable). Audit source thật có MIEN-NAM, không có key tỉnh ghi đè; không đổi policy hoặc timestamps. Preorder prep vẫn cộng theo nguồn.
- T4a: NEGOTIATION_UPDATED recovery nói ưu đãi hiện hành và tổng trong điều kiện quote/receipt/freshness cũ; không gọi là “giảm thêm” hoặc freeship.
- T4b: eval diagnosis diff captured verifier trusted/currentPublicContext, allowlist public, tối đa20paths/4096bytes; giữ tất cả claim cùng scope, không dump profile/history/receipts/media bytes hoặc URLs. Không thay final gate.

**Một sửa operation contract trong owner prompt:** review phát hiện câu cũ “Tool từ chối thì cả batch chưa được ghi” mâu thuẫn unknown commit. Chỉ thay clause đó và freeze hash mới; các phần giọng/quyết định mua giữ nguyên. Đây là clarification cần cho T1, được áp giống nhau hai arm T5. Verifier/model/bounds không đổi.

## RED → GREEN và checks đã chạy

- Worker state/media/read-only/effects: observed RED7fail/150pass → GREEN157/157.
- Adapter: observed RED cho missing field-bound schema →58/58PASS.
- Unknown commit test CAS thực ghi rồi readback throw/khác hoặc CAS response mất, có receipt/fit trước lỗi; tác vụ phụ thuộc và patch tiếp vẫn bị chặn.
- Review quote grounding: RED2fitquote failures →GREEN; numeric/preferences/store outage tests bổ sung. State31PASS; resolver14PASS sau sửa một test assumption: conflict cần destination miền Nam ở cuối theo helper hiện hữu, không sửa geography vì fixture sai.
- Diagnosis RED missing helper, rồi RED overwritten same-scope claim →GREEN3PASS.
- Node protocol/adapter/journeys/diagnosis/image helper trước integration-test bổ sung:76PASS. Worker focused9files279PASS trước bổ sung5state/5regiontests.
- Typecheck lần đầu FAIL nullable discount; đã sửa null guard. `pnpm --filter @lana/worker exec tsc -p tsconfig.json` PASS sau đó. Final full verification sẽ ghi riêng, không dùng các count cũ thay count cuối.

Official provider docs đã kiểm trước schema adapter: [Vertex function calling](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling) xác nhận anyOf/enum/type và khuyên typed parameters. Không dùng oneOf/discriminator hoặc chuyển provider/client. Lần open reference URL FunctionDeclaration trả404 được giữ là lookup thất bại; không dùng làm căn cứ API.

## Review implementation lượt1

Cùng reviewer `/root/review_contract_advice_plan`: REVISE trên T1–T4. Ba finding: operation clause cũ, domain field feedback thiếu, diagnosis overwrite claim. Đã sửa trong boundaries hiện có. Bổ sung fit current-message quote presence và ETA priority tests theo lưu ý. Không thêm semantic parser/gate/state/framework. Lượt2 sẽ review toàn bộ final source và T5.

## T5 — thử ảnh riêng

Executable dùng nhánh nhỏ trong run.mjs/protocol.mjs, baseline24 giữ nguyên. Corpus riêng6case (3case kiểu dáng cũ +3sản phẩm SQ149/SV463/SQ784),12slots/control-preload xen kẽ, mỗi slot1lần/cap48generation. Cả hai arm có cùng media tools; preload qua view_product_media sau đúng một preparation; existing bounds/readback/vision literal giữ nguyên. Prerequisite đã read-only kiểm6case có2ảnh hợp lệ/case,0generation; bytes/hash giữ ở external evidence trước run. Không coi12outcomes là stability/B GO. Không nhận ảnh chữa giọng ACK/nóng/nhăn.

## Source diagnosis lịch sử

Campaign39 trước, B1attempt7: captured verifier trusted và final currentPublicContext có POS sourceVersion/observedAt/expiresAt khác (07:04:24 →07:34:24UTC) dù giá không đổi. Final gate chặn đúng exact snapshot; đây là refresh source, không phải verifier sai. Public diagnosis giới hạn/truncated báo rõ; không nới gate để old PASS cấp quyền cho snapshot mới.

## Pending

Review lượt2/fix; final focused checks + worker build/typecheck/lint; disposable COD/BANK; commit clean executable/config; provider preflight;39integrationN1 rồi conditional12comparison với SHA riêng. Giữ mọi outcome, không retry hoặc sửa giữa run. Chưa có provider kết quả mới tại thời điểm ghi phần này.
