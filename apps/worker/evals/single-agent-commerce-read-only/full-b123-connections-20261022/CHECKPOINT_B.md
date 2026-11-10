# Full B1/B2/B3 và selected connections — 22/10/2026

**COMPLETE_39 — CHƯA B GO.** Đã chạy hết bộ đăng ký, mỗi ca một lần, không dừng theo kết quả chất lượng. Không sửa prompt/code/corpus trong run, không retry, không live send hoặc POS mutation. A vẫn OWNER_BYPASS.

Run source: `a39e45affbd1a8171d8e13ffe2d741cc6624278d` — sau ba review fixes. [Registration](REGISTRATION.json) khóa model/config/prompt/schema/corpus/runner hashes, 39 case IDs và cap152 generation requests trước provider. Runtime HEAD/worktree sạch khi seal; các job kiểm lại HEAD/inputs trước chạy. Các report sau đó là evidence của source này.

## Population và kết quả

| Cohort | Đã chạy | Terminal | Nội dung thực tế |
|---|---:|---|---|
| B1 | 24/24 | 23 SEND_ELIGIBLE, 1 HANDOFF/STALE | 23 exact eligible replies; ca STALE không có text gửi, chưa có persisted human handoff vì B1 là read-only. |
| B2/B3 stateful | 8/8 | 4 SEND_ELIGIBLE, 2 NO_SEND, 2 HANDOFF | Hai NO_SEND vẫn có code checkout question/preview trong capture; confirm có holding reply + HUMAN; yêu cầu nhân viên là silent control. |
| Openings mới nối | 4/4 | 3 FALLBACK, 1 HANDOFF | Ba static fallback; ETA handoff silent, không ảnh được gửi. |
| Negotiation companion | 3/3 | 3 SEND_ELIGIBLE | Hai owner finals; một receipt-backed code summary sau verifier FAIL. |
| **Tổng** | **39/39** | **30 eligible / 3 fallback / 4 handoff / 2 no-send** | Nhãn terminal không đồng nghĩa số reply khách nhận: 2 checkout NO_SEND có text, 3 lượt thực sự không có text. |

Bộ baseline vẫn là24 B1 +8 stateful. Thêm đúng4 openings +3 negotiation đã có harness cho phần mới nối, không nhân repetitions.28 slot candidate còn NOT_REGISTERED vì prerequisites/fixtures, không giả là đã chạy full12 journeys. Không chạy thêm advice diagnostic/holdout/A2/A3 hoặc lựa chọn lại mẫu.

[Toàn bộ39 hội thoại](CONVERSATIONS.md), [review từng lượt](PRIMARY_REVIEW.json), [outcomes](OUTCOMES.json), [metrics](METRICS.json), [request accounting](REQUEST_ACCOUNTING.json).

## Findings chính

1. **State tool contract chưa truyền đủ miền giá trị.** Discovery truyền `fitPreference="thoải mái, không bó bụng"`; height/weight truyền `"rộng một chút"`. Wire schema cho string tự do nhưng domain chỉ nhận FITTED/REGULAR/RELAXED. Patch bị reject cả batch. Discovery kết thúc STATE_UPDATE_INCOMPLETE; size tốn round sửa patch rồi gọi recommend_size khi tools NONE, OWNER_TOOL_MODE. Đây là mismatch model–code có trace cụ thể, không đơn thuần là model không hiểu tiếng Việt. Chưa gọi được size engine ở ca này nên không quy failure lần này cho thiếu chart.
2. **Ảnh theo màu và màu bán bị nhập làm một.** Gallery select theo be UNAVAILABLE; select ảnh chung sau đó OK. Draft lại nói shop không có riêng màu be. Thiếu binding ảnh không chứng minh không bán màu đó. Verifier trả FAIL/unsupported product assertion; draft và ảnh không gửi. Vị trí clause gây reject là suy luận từ draft/context, schema verdict không cung cấp explanation câu chữ.
3. **ETA vùng vẫn thiếu/hết hạn.** CầnThơ trả ETA_DATA_MISSING_OR_EXPIRED; request_handoff ETA_UNAVAILABLE có HUMAN theo configured silent rule. Khách không nhận text. Không phải verifier quá tay; chưa có dữ liệu ETA đủ dùng cho đúng selection.
4. **Tư vấn và giọng chưa ổn định.** Changed-occasion/v2 chưa đưa lời khuyên; buying-concern/v2 và/v3 lại trả nhiều lựa chọn cho khách sau khi được nhờ chọn. Stateful correction còn câu em đã cập nhật. Một số reply dài, tính từ nhiều/giọng hệ thống. Không chấm fail chỉ vì upsell, dấu ngoặc hay một dẫn chứng hợp lý.
5. **Negotiation engine đúng nhưng owner final vẫn có thể bị loại.** Objection thực ghi1 evidence, giảm30k, tổng529k→499k; hỏi tổng sau đó giữ tier HESITANT/version2/evidence1/tổng499k. Draft objection có thêu tay/giá tốt nhất; verifier FAIL với product ref. Thêu tay không có trong description đang cấp là một vùng nghi vấn, không phải explanation được verifier cung cấp. Khách nhận code summary đúng499k nhưng không nói rõ hỗ trợ30k, còn giọng báo giỏ. Không có unsafe owner draft được gửi ở ca này; không suy rộng thành safety qualification.
6. **Freshness gate có tác dụng nhưng tạo một lượt im lặng.** B1 buying-concern PASS ở verifier, snapshot mismatch ở final gate nên STALE. Có hashes/revisions trong raw, chưa đủ evidence biết chính xác trường nào đổi. Không tự quy lỗi cho owner/verifier hoặc khẳng định source producer nào sai.

Review thủ công toàn lượt: **27 USABLE, 6 NEEDS_EDIT, 3 FALLBACK, 1 NO_CUSTOMER_REPLY do STALE, 1 SILENT_HANDOFF do ETA, 1 OWNERSHIP_CONTROL**. USABLE nghĩa dùng được trong tình huống đó, không phải giọng đã đạt tốt hay bằng chứng ổn định. Review non-blind, mỗi ca1 lần, không chấm keyword, không statistical/causal improvement claim so với run cũ.

## Accounting, source và tác vụ

- Models thực trong telemetry: owner Vertex `gemini-3.5-flash-lite` High; verifier `gpt-6.1-sol` High, existing Codex login relay0.159.2. Exact generation config trong registration, không substitute model.
- **111 generation HTTP requests =79 owner +32 verifier**, max1/request ID,0 retry. Có111 captured wire bodies,0 evaluator-label hits theo kiểm tra keys/text keys đã đăng ký; cùng protocol tests có ở source fix. Verifier30 PASS/2 FAIL; một PASS bị final snapshot gate chặn.
- 0 HTTP errors,0 timeouts. Có1 generation được runtime ghi PROVIDER_ERROR do OWNER_TOOL_MODE dù HTTP200; đây là lỗi output/tool choreography, không lỗi hạ tầng provider.
-3 embedding calls riêng: source-check1,B1search1,openingsearch1; không cộng thành owner/verifier generations. Authentication/token requests không phải generation.
- Verifier generation latency nearest-rank,n32: **p50 5.899ms / p95 11.857ms**. Added verification stage gồm readback: **p50 6.777ms / p95 18.504ms**. Không coi là SLA.
- Token usage owner input366.042/output53.432; verifier input150.472/output2.261. Output gồm reasoning theo provider telemetry. Cost không expose (`null`), không tự ước lượng.
- Real PostgreSQL + capture: stateful8/openings4/negotiation3 ghi state/outcome trên3 DBs riêng; BANK_TRANSFER deterministic **32/32 PASS** trên DB thứ4. Cả4 DBs đã drop. Không gọi những15provider outcomes là15deterministic test groups, không claim COD deterministic full rerun riêng.
-64 raw files khớp [SHA256](RAW_HASHES.json); secret-pattern scan0 hits. Đây không phải bằng chứng tuyệt đối mọi nguồn không thể có PII; inputs nhận hàng là fixture synthetic và capture đã redact.
- B3 thực tế giữ sizeL/quantity2, tổng978.100đ đúng quote sau5% +ship30k; correction ghi profile mới; code checkout/preview; confirmation/HUMAN/event/tag intent và dispatcher capture. Không staff acknowledgement hoặc live tag/send.

## Giới hạn và hướng tiếp

Ba review fixes có deterministic RED→GREEN ở source trước run này. Cohort hiện tại kiểm state/quote/media availability nhưng không tạo lại concurrency supersession, receipt image-first/text-last hay cartA/photoB bằng provider; không nhận campaign này là proof cho ba edge cases đó. BANK32 chỉ là controlled integration/capture. Chưa vision quality run, staff image-byte readback, N6b privacy hoặc N3b terminal focus.

Ưu tiên tiếp theo: làm schema/tool feedback khớp field-specific values trước, rồi kiểm choreography trong2tool rounds; phân biệt thiếu ảnh đã bind với thiếu màu bán; kiểm ETA producer/selection; giữ phần tư vấn đang dùng được và chỉ xử lý quyết định/giọng ở những lượt có evidence. Không tăng tool rounds, thêm parser/regex theo ca hoặc nhồi ví dụ prompt để qua bộ kiểm tra.

Complexity delta của run:0 runtime changes,0 semantic roles/layers/state tables/migrations; chỉ thêm evidence. **CHƯA B GO** vì openings chưa phục vụ được nhu cầu và còn6 lượt cần sửa; không promotion/deploy/live send. Dừng sau đúng một campaign.
