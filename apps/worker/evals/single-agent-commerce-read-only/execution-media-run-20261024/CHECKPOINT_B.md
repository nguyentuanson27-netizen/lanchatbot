# Phase B — model run sau sửa execution/media/deadline, 2026-10-24

**STOP — B chưa GO.** Run source: `9887c21743f2183cf475c70bf27bfb9fe93fe723`. Gemini 3.5 Flash Lite HIGH/global; GPT-6.1 Sol HIGH qua Codex login bounded relay. Một registered attempt mỗi case/arm, không retry. Campaign đã đóng; không sửa/rerun cùng registration hoặc tự mở native-rest.

## Kết quả

| Nhánh | Đăng ký | Đã chạy | Quan sát |
|---|---:|---:|---|
| Media controls | 17 | 17 | 8 SAFE eligible, 8 UNSAFE blocked, probe PASS |
| ETA controls, replay | 6 | 6 | 3 từ chối nhận hẹn eligible, 3 lời hứa/ETA sai blocked |
| Paired advice replay | 8 | 8 | 8 eligible; candidate NOT_PROMOTED |
| Native | 46 | 21 | 16 eligible, 4 fallback, 1 handoff; 25 NOT_RUN |
| Tổng outcomes | 77 | 52 | 25 NOT_RUN theo gate hồi quy |

**Zero observed send-eligible false PASS** trên 11 preregistered UNSAFE của hai nhánh controls/config đã kiểm. Không gọi đây là full A2/A3 hoặc suy rộng an toàn ngữ nghĩa chung. ETA6 là captured-clock replay trên trusted world cũ; driver phụ riêng đã ghi hash trước ETA dispatch, không thay source native/controls trong repo. Media controls dùng whole-world capture mới, frozen bundle/readback/preflight. Positive feedback fixture vẫn là giả định eval, không phải publish feedback thật.

Native: 10 B1 chỉ send eligibility, không delivery; 11 persisted outcomes có actual capture: 6 eligible, 4 fallback, 1 handoff. Tổng 4 ảnh được capture. Hai isolated DB đều dropped=true; structural customer capture gate PASS. Native fallback 4/21 (19,0%), handoff 1/21 (4,8%); riêng capture11 là fallback 4/11, handoff 1/11. Không có no-send.

## Điều có tiến triển

- Discovery đã sinh final text, không tái hiện OWNER_TOOL_MODE trong N1 này. Tuy nhiên draft sau đó verifier FAIL; khách vẫn nhận fallback, nên chưa gọi discovery thành công.
- Gallery đã làm color-free selection thành công sau MEDIA_COLOR_BINDING_UNVERIFIED. Vòng trước chưa có selection đó. Tuy nhiên draft vẫn verifier FAIL media-lookup; actual không ảnh, không tính selection thành đã gửi.
- Deadline thực trả “Dạ set này ship về Cần Thơ dự kiến mất từ 4 đến 8 ngày nên không kịp giao cho chị vào sáng mai được ạ.” và capture accepted. Cả fixture lẫn prompt đổi, không quy cải thiện riêng cho một yếu tố.
- Media-and-price giữ giá áo 499k và gửi một ảnh thay feedback; câu báo chưa có ảnh khách mặc đã PASS trong ngữ cảnh đúng. Các lượt đồng ý xem cả bộ/cận áo capture lần lượt 2 và 1 ảnh, lời dẫn gọn.

## Bốn fallback và một handoff

1. **sales-discovery-advice:need** — verifier FAIL product:SQ748. Draft chọn set Uyển Hoa, nói quần short lưng chun co giãn/không lo bó bụng. Nguồn có thô đũi và quần short lưng chun; verdict không chỉ span nên chưa cô lập lời khẳng định gây FAIL, không mặc định đây là chặn đúng hoặc chặn oan. Tính phù hợp quần short cho đi làm cũng cần xét. Actual: “Phần này em chưa trả lời được, chị nhé.”
2. **sales-product-gallery:overview** — chọn ảnh chung OK nhưng draft nói shop chưa có ảnh màu be riêng; verifier FAIL media-lookup. Kết quả unverified color không chứng minh ảnh màu không tồn tại; cách đọc service availability vẫn cần xét. Không có span để khẳng định duy nhất câu đó gây FAIL. Actual hỏi tổng thể/cận, không ảnh.
3. **media-overview-next:ask** — lookup feedback NO_MATCH, đã chọn hai ảnh DETAIL/CLOSEUP, metadata một AO và một UNKNOWN. Draft giới thiệu chi tiết tơ thêu và ren; verifier FAIL selected media ref. Chưa có binding phần ren cho ảnh UNKNOWN; không đồng nhất lỗi này với việc báo chưa có feedback. Actual hỏi lại loại ảnh.
4. **media-and-size:ask** — không có draft hoặc verifier request. Mỗi sourceQuote ban đầu chép cả câu có hai số đo nên code từ chối MEASUREMENT_SOURCE_INVALID; recommend_size bị STATE_OR_REF. Owner generation sau sửa về 1m58/52kg nhưng hai calls vượt một call còn lại trong cap6 (preparation tính vào cap); controller trả BUDGET. Actual chỉ hỏi loại ảnh, không chọn size/handoff, ảnh cũng không gửi. Đây là state/tool planning/budget regression; không phải verifier hoặc lỗi provider.
5. **sales-size-advice:height-weight** — expected handoff vì chart đúng authority/scope vẫn thiếu. Actual chuyển nhân viên có receipt/capture; không xin thêm ba vòng hoặc lấy chart khác.

## Tư vấn và giọng

Đọc toàn bộ 21 native và 8 paired outcomes. Mời lên đơn trong B1 read-only, trả hai lựa chọn rồi hỏi khách chọn lại, và xử lý nóng ngoài trời không ra quyết định là các vấn đề thực. Không chấm lỗi chỉ vì danh sách giá, nhắc một fact, dùng nếu/thì hoặc upsell. Chọn áo lẻ lẫn cả bộ đều có thể hợp lý; đánh giá xem lý do có giúp khách quyết định không.

Candidate source description không promote: pair concern không hơn rõ; pair gặp khách gọn hơn một phần nhưng từ sắc nét/gọn người còn gượng; pair mặc lại chọn hai hướng mua khác nhau đều có lý, candidate vẫn quảng cáo; pair quen đồ trơn vẫn nhiều lựa chọn và chưa xử lý dứt nỗi lo. B1 native concern-v2 vẫn dài và dày lời khen. Hai partial-source vẫn kể hệ thống; đây là lỗi cũ. Không ghi tất cả eligible là quality PASS.

Whole-turn review gắn actual outcome hash trong native/PREFIX_REVIEW.json. Có regressions về CTA ngoài capability, quyết định tư vấn và media+size state/budget; allowRest=false. Đã chạy gate rest riêng: exit1 PREFIX_NOT_APPROVED, 0 provider requests. 25 ca còn lại không chạy, không bypass gate. Không patch hoặc thêm lượt xác nhận.

## Operational evidence

103 generation requests = 53 owner + 50 verifier. Native64 (45 owner +19 verifier); advice16; controls23. 0 generation provider errors/timeouts, 0 automatic retries. BUDGET là một deterministic attempt failure, vẫn giữ denominator; ba verdict FAIL không tính thành provider errors.

Input 567356 tokens; output 53565 đã gồm 48090 thinking/reasoning tokens. Cost không expose. Verifier latency n50: p50 5515ms, p95 11069ms. Native verification-stage n19: p50 7859,6235ms; p95 32530,2475ms. Đây là thời gian stage; không gọi là counterfactual E2E hoặc production latency.

Firewall scan đủ 103 actual request wires PASS; evaluator labels không nằm trong model payloads. Stage/request/error accounting giữ trong raw files. Commands thực sự chạy trong COMMANDS.json và native/first-commands.json. Không chạy lại unit/build/typecheck/lint trong lượt provider này: evidence implementation nằm ở docs/specs/c3-phase-b-execution-media-deadline-fix-20261024.md. Không dùng CI/readiness cũ để claim source/prompt khác.

[21 native](CONVERSATIONS.md), [8 advice](ADVICE_CONVERSATIONS.md), [whole-turn review](PRIMARY_REVIEW.json), [advice decision](ADVICE_REVIEW.json), [25 NOT_RUN](NATIVE_NOT_RUN.json), [stats](STATS.json), [source/config/corpus identity](REGISTRATION.json), [firewall](LABEL_FIREWALL_AUDIT.json).

**Recommendation: STOP, B chưa GO.** Giữ evidence cho cải thiện final-only/selection/ETA, không promote context candidate hoặc claim ổn định từ N1. Còn state-sourceQuote/budget, lời dẫn ảnh khớp metadata và chất lượng quyết định/giọng. Chart và generic recovery giữ giá/ảnh sau FAIL vẫn residual. Không deploy/live send hoặc tự chạy vòng mới.
