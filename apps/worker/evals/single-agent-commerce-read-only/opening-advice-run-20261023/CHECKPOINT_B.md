# Phase B — full39 sau bản sửa opening/advice

**FULL39_COMPLETE — CHƯA B GO.** Ngày23/10/2026 theo giờ shop. Source chạy model `540b8129e2e52062ad5bc96ffa44dd84d0591bd5`, implementation base `ef98d821`. [Bản sửa/self-review](../../../../../docs/specs/c3-phase-b-opening-and-advice-implementation-20261022.md), [kế hoạch](../../../../../docs/specs/c3-phase-b-opening-and-advice-fix-plan-20261022.md). Không đổi source/prompt/config giữa run.

## Phạm vi và provenance

Đã chạy đúng **39/39 native, mỗi ca1lần**:24B1+8stateful+4openings+3negotiation. Chạy18ca ưu tiên trước rồi21B1 còn lại, không trùng slot. Stateful giữ cart/history/checkout thực trong PostgreSQL cô lập; một lượt private code-only không gọi model. Capture transport, không gửi khách thật hoặc tạo đơn POS.

Diagnostic4 chạy riêng bằng captured public context/clock, toolsOFF, cùng prompt, không per-case override. Cả4 verifierPASS nhưng review2dùngđược/2cầnsửa; **không gọi diagnostic PASS về chất lượng**. Theo yêu cầu mới nhất “sau khi fix xong thì chạy lại full case”, vẫn hoàn thành native39 để kiểm cả chức năng, thay điều kiện dừng vì diagnostic quality của plan cũ. Không đổi treatment, bỏ lỗi hoặc tự chạy vòng2. Không cộng4replay thành43nativecases.

Owner: **Vertex / Gemini3.5FlashLite HIGH**, version `gemini-3.5-flash-lite`, global, candidate1, maxOutputTokens8192, thinkingHIGH, retry0, timeout90s. Verifier: **OpenAI / GPT‑6.1Sol HIGH**, version `gpt-6.1-sol`, Codex login/CLI0.159.2, bounded relay, max1HTTP/generation, retry0, timeout90s. Cấu hình chi tiết và hashes trong [REGISTRATION](REGISTRATION.json), [manifest nguyên bytes](frozen-inputs/manifest.json). Giữ3owner/2toolrounds/6calls/1verifier.

- Owner prompt SHA256: `27aaf35d22a6209512eeeddbc11b169eede5bd15bc6f8e2c9ed1c867301da6a9`.
- Verifier prompt SHA256: `0b240599a04d9a86c25ed2b3b815c152e83106c85e61940efde15b020e4c2fde`.
- Verdict schema SHA256: `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- Candidate handoff resolved content hash: `sha256:5dd55027ff47ee0124e26f82eda3490a0c09febc22a7d2e478eb065e6089b749`; source upstream absent, candidate chỉ trong3DBcôlập. Version/readback từngDB trong METRICS/raw integration.

Clean HEAD captured trước preflight/dispatch. Bốn provider preflights PASS/0generation. Quota read chỉ đọc ở đầu campaign (sau khi diagnostic đã bắt đầu), ordinaryUsageAllowed=true; không dùng resetcredit hoặc generation để thửquota. Không mô tả đó là quota precheck đã làm trước dispatch đầu tiên. [Commands thực chạy](commands.json), [raw byte hashes](RAW_HASHES.json).

## Kết quả actual

| Nhóm | Số ca | Send-eligible | Fallback | Handoff | NO_SEND có code reply |
|---|---:|---:|---:|---:|---:|
| B1 |24|23|1|0|0|
| Stateful |8|3|1|2|2|
| Openings |4|1|2|1|0|
| Negotiation |3|3|0|0|0|
| Tổng |39|30|4|3|2|

Hai NO_SEND là code xin thông tin checkout và private preview; **không phải khách không nhận tin**. Cả39có actual capture/text. Không có receipt-backed cart-summary recovery trong run này;7result có trường `recovery` chỉ ghi nguồn terminal ban đầu, không được đếm thành7recoverythànhcông.

Review nguyên lượt: **32dùngđược,3cầnsửa nội dung,4fallback**. “Dùng được” gồm các code/handoff outcome đúng khả năng và những câu còn cần gọt giọng; không có nghĩa32câu đều tự nhiên/thuyết phục tốt. Không chấm rejected draft như đã gửi, không keyword matching, không đổi criterion để cứu kết quả. [39hội thoại + nhận xét từng ca](CONVERSATIONS.md), [primary review](PRIMARY_REVIEW.json), [diagnostic4 riêng](DIAGNOSTIC.md). N1/non-blind, không humanpanel hoặc stability qualification.

### Bốn fallback

1. `stateful-correction`: Gemini generation2 trả HTTP200 nhưng `MALFORMED_RESPONSE`/`OWNER_FINISH_REASON`. State đã lưu74/96 đúng; chưa gọi verifier, không có finaldraft hợp lệ. Không kết luận lỗi giọng correction từ lượt này.
2. `b1-partial-source-v2`: Gemini generation2 `TRANSPORT_ERROR`, không HTTPstatus/usage. POS_UNAVAILABLE là fault đầu vào đã đăng ký; lỗi làm mất cả câu trả lời một phần là generationtransport, không phải verifier.
3. `sales-discovery-advice:need`: verifierFAIL `UNSUPPORTED_PROTECTED_ASSERTION`, refSQ629. Draft chọn short/cạpchun và nói “không lo bị bó bụng”. **Nguồn có cạpchun thật**, không gọi đây là bịa cấu tạo. Span bị chặn chưa được verifier chỉ rõ; nghi ranh giới bảo đảm vừa người là phân tích reviewer. Riêng chọn bộshort phong cách beach/resort cho yêu cầu bộ đi làm và thêm váy yếm là vấn đề tư vấn cần xem lại.
4. `sales-southern-delivery:deadline`: verifierFAIL refETA. Draft: “Dạ, set váy Thạch Thảo ship về Cần Thơ mất từ 4 đến 8 ngày nên không kịp giao vào sáng thứ Sáu chị nha.” Owner/verifier đều nhận clockFriday23/10,00:19 và ETA4–8. Promptverifier có câu “Nguồn dự kiến cũng không chứng minh chắc trễ”. Cần review phân biệt shop từ chối cam kết deadline với báo chắc lịch hãng vận chuyển; **không còn đúng nếu nói thiếu giờ xử lý**. Anchor/day convention của nguồn vẫn thiếu. Không tự nới verifier trong run.

### Ba câu gửi được nhưng cần sửa rõ

- `b1-buying-concern-v2`: khách hỏi có nên lấy nhưng bot khen cả bộ rồi kể mua áo/mua váy/phối món sẵn có; dài, chưa chọn hướng mua. Diagnostic cũng lặp vấn đề này.
- `sales-product-gallery:overview`: gửi được2ảnh chung, nhưng nói “chưa có phân loại màu be riêng”, thêm cả3giá và hỏi chọn bộ/mua rời. Thực hiện media tốt hơn, wording còn ngôn ngữ hệ thống và lệch trọng tâm xin ảnh. Asset-color binding vẫn thiếu.
- `negotiation-price-objection`: code đã cấp quoteversion2, discount30k, tổng499k ngay trong **functionResponse và currentstate**; bot vẫn nói giá gốc499k rồi quảng cáo giảm5%khi mua2. Lượt hỏi lại tổng sau đó trả đúng499k; tier/version/evidenceCount không tăng. Không chữa bằng thêm bản sao quote hoặc giả nguồn ưu đãi còn thiếu. Đây là lỗi dùng kết quả thao tác để đáp đúng việc khách hỏi.

## Điều cải thiện và điều còn lặp

First human-request và size handoff đều có lời xác nhận sau commit, không còn silent. Gallery gửi được ảnh chung trong scope được phép. Quote/native history và turn-time có mặt đúng chỗ trong captured requests. Checkout/đổi số lượng/ưu đãi/tổng tiếp tục hoạt động. Cả3DBtạm đã drop.

Giọng chưa cải thiện ổn định: nhóm concern/partialsource vẫn gom mềm/nhẹ/rũ/baybổng, câu dài và nhắc lại ngân sách; hỏi giá/tồn đơn giản thì khá gọn. Không đánh trượt mọi list/ngoặc: bảnggiá và preview cần chúng. `b1-changed-occasion-v3` chọn áo lẻ có lý do, `b1-buying-concern-v3` dùng chânváyđen khách có để quyết định; không ép mua áo hay cả bộ là đáp án duy nhất.

So full39trước: fallback19→4, nhưng trước có17fallbackquota, nay0quota và2lỗiGemini; **không quy mức giảm15cho prompt**. Handoff acknowledgement và generic media là cải thiện chức năng quan sát trực tiếp. Negotiation có quote mới nhưng vẫn bỏ qua, concern-v2 vẫn phân tán lựa chọn: hai root symptom cũ chưa giải quyết. Chọn món/material inference còn cần review theo ranh giới owner đã chấp nhận; không yêu cầu labtest cho mọi nhận xét, cũng không gọi PASS là safetyproof.

Hướng tiếp theo từ evidence, chưa implementation: xử lý kết quả thương lượng hiện tại trước policy bán thêm trong context; kiểm cơ chế model ưu tiên đọc chứ không thêm instruction trùng. Với discovery, kiểm lựa chọn theo mục đích sử dụng từ description đã có; không cần bịa thuộc tính hoặc thêm keywordregex. Với deadline, chốt nghĩa từ chối nhận deadline so với chắc ngày giao, cùng nguồn anchor thực. Gallery cần cách nói ảnh chung đơn giản và nguồn màu thật khi có. Với concern, kiểm riêng lựa chọn mua và mức giải thích cần thiết, không tiếp tục nối ví dụtheoca. Những bước này là đề xuất, không tự mở vòng mới.

## Request accounting / vận hành

Native **106generation requests=74owner+32verifier**. Diagnostic8=4+4. Tổng114, dưới cap160;114uniqueIDs/114captured wirebodies, mỗi generation1upstreamrequest,0retry. Verifier native30PASS/2FAIL,0providererror; diagnostic4PASS. Native owner2errors/74=2,70%; tổngnative2/106=1,89%;0timeout/0quotaerror quan sát. Fallback4/39=10,26%; handoff3/39=7,69%; rawNO_SEND2/39=5,13%; actualsilence0/39.

Recursive scan cả JSON lồng trong text và exact registeredcaseIds:0evaluatorlabelleak. Verifier wire tools=[]/tool_choice=none, model+effort khớp; owner wireHIGH/candidate1. [Request accounting](REQUEST_ACCOUNTING.json), [metrics](METRICS.json), rawcaptures giữ đủ errors.

Native verifier latency p50 **5,844s**, p95 **13,458s**; verificationstage+readback p50 **6,677s**, p95 **18,837s**. Wholeturn p50 **16,767s**, p95 **49,818s**. Nearest-rank, N32verifier/N39turns; không gồm toàn bộ launcher/build startup. Known tokenusage: owner input352266/output54821, thinking51099, có73/74usage; verifier input154164/output3024, reasoning2202, có32/32. Lượt transporterror usageunknown, không gán0. Cost không expose. Diagnosticusage/latency báo riêng ởMETRICS; runner không expose owner-only latency cho diagnostic.

## Verification và giới hạn

Thực chạy:4preflights; diagnostic4;6B1ranges1:1,9:9,15:15,2:8,10:14,16:24;3isolatedproviderjourneys với `--candidate-handoff`. Tất cả commands exit0; sáuB1runner builds PASS. Đây không đồng nghĩa mọi output PASS. Dùng đúng captured source; kết thúc39cleanHEAD540b8129, prompts/config không đổi. Accounting/coverage/label/model/DBcleanup và JSON/hash checks PASS.

Worker1956/focused262/protected21/Node558PASS2SKIP/typecheck/build/lint/COD34/BANK34 là checks của implementation trước, được tham chiếu riêng; không nhận đã chạy lại các suite đó trong campaign này. Không remoteCIclaim. Post-run changes chỉ evidence/tasks/docs, structural runtime delta0.

Source gaps chart đúngsảnphẩm/asset-color/attributes/ETAanchor chưa được lấp. N3b/N6b/staff-image và imagecomparison/28candidate slots ngoài39vẫn chưa được đánh giá ở lượt này. A vẫn OWNER_BYPASS; đây không phải chạy lại A2/A3 hoặc hoàn tất mọi journey tương lai.

**Recommendation: STOP tại kết quả vòng này, B chưa GO.** Đủ full39 đã đăng ký; giữ4fallback và3ca cần sửa, không auto-fix/rerun hoặc deploy/live send.
