# Phase B — corrigendum và audit tư vấn trước implementation quote

Ngày27/10/2026; implementation base008fa28210e8587e6e248486b6b85537800bfc43. Audit offline trên R1/R2 có sẵn, provider requests mới0, không credential/live read/source write. [Plan APPROVE](c3-phase-b-quote-completion-advice-plan-20261027.md) SHA256526ac86377593db4f652c72cb2159c514081a8d4e8b24df6189da14bca77b468.

## P0 — corrigendum phân loại

[Report R1](../../apps/worker/evals/single-agent-commerce-read-only/media-size-context-run-20261027/CHECKPOINT_B.md) và [R2](../../apps/worker/evals/single-agent-commerce-read-only/media-size-context-repeat-run-20261027/CHECKPOINT_B.md), các WHOLE_TURN_REVIEW/TASK_ACCOUNTING cũ dùng nhãn7data-gap handoffs. **Nhãn này gộp hai nguồn nguyên nhân khác nhau; không được hiểu cả7 là thiếu dữ liệu shop thật.** Giữ nguyên raw/JSON/historical labels, dùng corrigendum này để đọc đúng nguồn gây lỗi.

| Cohort/case IDs | Mỗi vòng | Phân loại đúng |
| --- | --- | --- |
| media-overview-next:ask, media-detail-next:ask, media-and-price:ask |3| Chưa có verified feedback đủ điều kiện trong capture đã đọc |
| sales-product-gallery:overview |1| Chưa có binding màu be đủ điều kiện cho asset trong nguồn đã đọc |
| b1-partial-source, b1-partial-source-v2, b1-partial-source-v3 |3| **CONTROLLED_SOURCE_FAILURE**, không LIVE missing-data proof |
| sales-discovery-advice:need |1| Owner bảo đảm fit thiếu căn cứ; verifier chặn |
| stateful-confirm, stateful-human-request |2| Business handoff |

`stateful-provider.mjs:scopedProviderFacts` chủ động trả null từ readCatalogSnapshot và throw CONTROLLED_POS_UNAVAILABLE cho selection. Registration ghi THREE_EXISTING_POS_FAILURES_COMPOSED/fault POS_UNAVAILABLE. Ba handoff thử fail-closed, không đặt việc bổ sung POS thật trong backlog từ evidence này.

R1 có2OWNER_TOOL_OUTPUT sauHTTP200 ở hai controlled cases đầu. Giữ riêng chúng trong denominator/errors/usage. Handoff đúng không xóa lỗi adapter; không có completion đủ để quy cho một field/enum cụ thể. R2 không có generation errors. Hai follow-up HUMAN im lặng, hai checkout code-owned NO_SEND và hai business handoff không phải lỗi dữ liệu.

## P0 — ledger ảnh và giới hạn nguồn

[22media observations](c3-phase-b-quote-completion-evidence-20261027/MEDIA_EVIDENCE_LEDGER.json) =11asset observations/capture ×2runs; đây không phải22ảnh khác nhau. Ledger giữ imageSha256/imageType/partsVisible/feedback/colorBinding theo hai MEDIA_SOURCE_DIAGNOSIS, không tải ảnh hoặc suy nhãn.

| Bước | Đã có bằng chứng | Chưa có bằng chứng |
| --- | --- | --- |
| Registry→publisher/hash | Implementation media-size trước đã hỗ trợ verified color +binding hash, bảo toàn ABSENT/VALID/INVALID | Không audit lại live registry/IMAGE_ID trong task này |
| Published product capture |11images mỗi snapshot; feedback false, colorBinding ABSENT; parts được giữ trong ledger | Không từ capture kết luận registry thật không có row/nhãn hoặc mọi nguồn đều thiếu |
| Adapter/validator→selector | Cùng contract eligibility đã có; offline replay GENERIC2, DETAIL/TOP1, DETAIL/SKIRT0; color/feedback không đủ authority | Không exact replay mọi native readback, không live data-readiness qualification |
| Owner/capture | Generic hint không authorize ảnh; R2haiopening owner bỏ media call dù hint/tool có | Không biến omission này thành metadata/source failure |

Kết luận: DATA_NOT_READY cho4media needs trong population đã quan sát; upstream registry chưa live-audit, không tự populate/publish hoặc gắn nhãn giả. Không thêm POS-data fix. Các ánh xạ producer/consumer hỗ trợ code đã thực hiện trong media-size implementation trước, không lặp lại pipeline refactor.

## P2 — 20 exact final owner requests, quyết định NO_PATCH

[Wire ledger](c3-phase-b-quote-completion-evidence-20261027/ADVICE_WIRE_LEDGER.json) gồm10caseIDs×2runs, file/line/generationId/artifactSHA/requestJSONhash, history/latest, vị trí các CompactV2sections, mô tả/attributes/offer facts/current quote/fit cần thiết. Request hash là UTF8 compact parsed JSON, không được gọi là hash raw JSONL line. Scope public selected cases; không private checkout hoặc raw provider request được commit.

| Ca/nhóm | Quan sát từ wire và reply | Attribution / quyết định |
| --- | --- | --- |
| Discovery | Hai sản phẩm được tìm/đọc, có đặc tính và giá/tồn; không SIZE_FIT cá nhân. Owner vẫn hứa không bó/cấn bụng, actual handoff | OWNER_DECISION_ADHERENCE_LIMITATION; không cần SIZE_FIT để giới thiệu mẫu, không thêm fit block |
| media-decision | Mô tả riêng áo/váy và cách mua đã có; cảhai trả được, không lookup DETAIL/SKIRT gây handoff | Chưa có lost-data defect; đoạn dài là hạn chế tư vấn đã chấp nhận, không formatter/voice patch |
| buying-concern ×3 | Nguồn mô tả, offer, nhu cầu/đồ có sẵn trong history hiện diện; reply khác nhau về trấn an/chọn áo hoặc bộ/đưa lại lựa chọn | Không kết luận cần context mới từ outcome; giữ minor usefulness và whole-exchange review, không case-specific answers |
| changed-occasion ×3 | Tin mới và history giữ nguyên role/thứ tự; mô tả sản phẩm có mặt. Ca sáng gặp khách R2 nhắc lại tiệc tối dù lịch đã đổi | Lỗi sử dụng context/decision, không chứng minh history bị mất. Các nhận xét advisory chất liệu được đọc theo owner boundary, không đòi phép thử riêng |
| negotiation-price-objection | Current quote/concession trong wire; R1 bỏ ship concession, R2 dùng được30k | Facts đã tới; owner dùng không ổn định, không thêm nguồn hoặc pricing layer |
| height-weight RELAXED/M-only | SIZE_FIT hiện tại recommendedM/alternatives rỗng và fitPreference RELAXED có trong wire | Hai lần không tự thêmL; giữ co-location trước đây, không thêm representation |

Không thấy truncation, thiếu relation cần thiết hoặc sai subject cụ thể ở20final requests đã audit. **Không có quyền suy ra mọi context đều đủ cho mọi lời hứa sử dụng**; description đúng không chứng minh claim mới đúng. Các case thay món vẫn phải dùng cùng advisory boundary, không nới verifier.

**Decision: không thay renderer, không thêm fit/data block, không đổi advisory/style prompt trong implementation này.** Chỉ sửa đoạn hướng dẫn báo giá để gọi operation đã được plan duyệt. Muốn thử capability tư vấn khác cần experiment riêng và owner authorization, không tự chạy từ audit này.

Commands thực chạy cho audit: Python offline đọc ACTUAL_TERMINALS và final generation IDs, ghép OWNER_REQUEST đúng file/line trong JSONL, parse CompactV2 sections và xuất20rows/22media observations. Không chạy count API/provider/DB/live reads. Independent implementation reviewer kiểm ledger và interpretation trong cùng review implementation; chưa được coi như APPROVE cho tới khi có phản hồi ghi ở implementation record.
