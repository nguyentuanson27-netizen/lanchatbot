# Phase B — full39 và7lượt media hiện hành

**COMPLETE: core39/39 + media7/7; B chưa GO.** Source `e1a81192c9b4f5894c5d6aff6098df7d856fa381`, clean executable/config trước từng job và sau run. User yêu cầu full sau failed controls; native run này được đăng ký riêng, không diễn giải controls trước đã PASS. Không sửa source, prompt, model/config, rubric hoặc corpus giữa run, không generation retry/rerun.

[46 hội thoại và review](CONVERSATIONS.md), [primary review](PRIMARY_REVIEW.json), [metrics](METRICS.json), [actual outcomes](OUTCOMES.json), [source/config registration](REGISTRATION.json), [exact commands](commands.json).

## Population và actual outcomes

| Cohort | Registered/recorded | Eligible | Fallback | Handoff | NO_SEND có code reply |
|---|---:|---:|---:|---:|---:|
| B1 |24/24|23|1|0|0|
| Stateful |8/8|4|0|2|2|
| Openings |4/4|3|0|1|0|
| Negotiation |3/3|3|0|0|0|
| **Core** |**39/39**|**33**|**1**|**3**|**2**|
| Media continuation (riêng) |7/7|3|3|1|0|

Không gọi46là46ca độc lập: media7 thuộc5journeys với hai cặp nối thực. Không lặp bộ media4 cũ hoặc chạy4visualdiagnostic/17controls để tăng denominator. Full core giữ24B1+8stateful+4openings+3negotiation,38public+1private; media7 được nêu rõ trước dispatch, max28generation riêng. Trần chung180, thực tế132.

Hai NO_SEND core là CHECKOUT_DETAILS_MISSING và PRIVATE_CHECKOUT_COMMITTED, đều có tin code capture, không phải khách không nhận tin. **Actual silence0/46.** Handoff có code/policy/transaction, không coi là automation chọn size thành công.

B1 là isolated send eligibility seam, không delivery thật. Stateful/openings/negotiation/media dùng real PostgreSQL cô lập + public catalog/POS/policy reads + capture delivery transport; không Meta send khách thật/POS order. Candidate handoff matrix vẫn clone trong DB eval, chưa publish nguồn shop. Catalog description dùng isolated registry presentation đã đăng ký trong source-config/candidate-description hiện hữu; các reads giá/tồn/ảnh vẫn từ adapters hiện hành. Không gọi đây là nguyên trạng toàn bộ raw catalog hay đã publish description lên shop.

## Điều đã hoạt động

- Stateful thêm đúng áo/be/M, đổi thành2áo/L, giữ màu và current cart. Correction giữ lựa chọn L, không đọc lại cả hồ sơ số đo.
- Quote2áo:998.000−49.900+30.000=978.100đ đúng code. Preview/checkout/private input/confirmation và human-request có actual outcomes; không PII vào provider request.
- Negotiation nhận hỗ trợ ship30k, tổng499k; câu hỏi tổng sau đó giữ cùng quote, không tự tăng ưu đãi. Cần polish lời “mã giảm” và “tốt nhất/chốt giúp em”, nhưng không phải sai arithmetic.
- **Cả2native no-chart cases** (opening height/weight và media+size) kết thúc HANDOFF với câu “Em chuyển nhân viên chọn size cho chị nhé.” Không sinh draft bịa fit/thoải mái, không gửi ảnh chuẩn bị trước terminal handoff. Đây là evidence native cho sửa code mới, không đóng gap chart đúng sản phẩm.
- Hai lượt nối sau mediafallback gửi đúng FRONT/BACK cảbộ và DETAIL/AO theo metadata/capture. Không phải phải hỏi lại mẫu hoặc seed history thành công.
- Media concern lần này chọn áo lẻ giảm phần ren, gửi ảnh cận áo đúng món định bán; có quyết định rõ hơn một số output cũ. Đây là N1, không chứng minh thay đổi code/ảnh gây cải thiện giọng. Không có view_product_media; không claim model đã nhìn pixel để tư vấn.

## Các ca chưa đạt

### Bốn actual fallback

1. **b1-buying-concern-v2:** verifierFAIL/UNSUPPORTED_PROTECTED_ASSERTION refSV2447. Draft dài, mở cảbộ/áolẻ, cuối có “mặc lên rất sang và vừa vặn”. Nguồn không có SIZE_FIT cho khách, nên fit là nghi vấn cần đối chiếu; verdict không chỉ clause, không tự quy chính xác sole cause hay gọi false rejection. Actual chỉ generic fallback. Dù semantic được cho qua, draft vẫn yếu về quyết định/giọng.
2. **media-overview-next:ask:** draft báo shop chưa có feedback rồi chủ động gửi ảnh khác; FAIL refmedia-lookup. Actual static hỏi tổng thể/cận, chưa trả trực tiếp yêu cầu feedback.
3. **media-detail-next:ask:** cùng region lời báo thiếu feedback, FAIL refmedia-lookup; không phải chưa truyền observation.
4. **media-and-price:ask:** draft có giá499k đúng nhưng kèm “Shop hiện chưa có ảnh khách mặc thực tế”; FAIL refmedia-lookup, actual bỏ luôn phần giá. Mixed-intent residual vẫn có thật.

Ba negative-feedback drafts và verdict giữ nguyên dưới media/provider-attempt1/3/5 và transcript. Không coi mỗi vùng FAIL là một failure family mới, không patch regex hoặc chạy lại để lấy câu tránh chữ đó.

### Tám reply core cần sửa chất lượng

- **b1-partial-source / v2:** trả phần đã biết đúng nhưng nói “hệ thống chưa cập nhật/chưa có thông tin” — suy nguyên nhân từ nguồn chưa đọc được và giọng nội bộ.
- **b1-buying-concern:** mở ngân sách rồi chuỗi mô tả/tính từ; trấn an chưa chỉ ra lý do tổng thể giúp quyết định.
- **b1-changed-occasion-v2:** nhận hoàn cảnh nóng nhưng chỉ mô tả/dự đoán oi, thiếu hướng mua hữu ích. Không gọi nhận xét cảm giác là claim kỹ thuật sai.
- **b1-changed-occasion-v3:** chọn áo cho gặp khách đúng, nhưng lại mở cả bộ cho buổi tối thay vì tập trung lịch mới và lời nhờ chọn.
- **b1-buying-concern-v3:** chọn bộ có lý do thêm chân váy, nhưng nhiều quảng cáo chung, chưa giải thích gọn lợi ích phần trả thêm so áo lẻ. Không ép áo lẻ làm đáp án.
- **sales-product-gallery:overview:** ảnh chung được capture, nhưng exact final có hai `[asset:...]` opaque IDs và giọng “hình ảnh xác thực riêng”. **VerifierPASS không chặn output-surface defect này.** Không xóa IDs trong transcript để làm kết quả đẹp hơn; không raw PII/secret leak nhưng là lỗi customer-visible.
- **sales-southern-delivery:deadline:** ETA4–8ngày/không cam kết kịp đúng nguồn; câu lại kể hệ thống thiếu mốc giờ và bảo khách cân nhắc giúp shop, chưa thành lời trả lời bán hàng tự nhiên.

Manual core:25USABLE +2CODE_CHECKOUT +3HANDOFF +8NEEDS_EDIT +1FALLBACK. USABLE có thể còn polish nhỏ, không có nghĩa25câu đều thuyết phục tốt. Media:3USABLE+1HANDOFF+3FALLBACK. Whole-turn/manual nonblind/N1, không cộng keyword hoặc coi đủ facts là sales quality. Chưa có benchmark conversion hoặc blind paired quality comparison.

## So với các run gần đây

- Với repeat39 source01e689b4: core hiện33eligible/1fallback/3handoff/2codecheckout so với31/3/3/2. [So từng ca](COMPARISON_CORE39.json). Đây là khác outcome, không causal A/B: code/source/time/history khác, N1. Không dùng manual25+5 để so trực tiếp34dùngđược trước vì review hiện tại liệt kê chi tiết cả giọng và usefulness.
- Với continuation7 source4564b7fb: cũ3eligible/3fallback/1silence; nay3eligible/3fallback/1handoff. Size từ unsafe-fit fallback thành code handoff; concern từ egressno-send thành usable eligible; ảnh+giá từ eligible thành fallback do lần này có negativefeedback clause. Cùng eligible count không có nghĩa không thay đổi; cũng không cho thấy negativefeedback đã được sửa.
- Không xảy ra EGRESS_WORLD_CHANGED ở46lượt mới. Không tái hiện được exact incident cũ nên **root egress vẫn UNKNOWN**, không coi thêm diagnostic là đã sửa nguyên nhân.
- Các lỗi tư vấn dài/nhiều tính từ và lời báo thiếu feedback vẫn thuộc lỗi cũ. Finding output opaque assetRefs cần xử lý ở projection/output boundary thay vì chỉ nhắc prompt thêm lần nữa; không sửa trong run này.

## Accounting, models và verification

- Owner Vertex `gemini-3.5-flash-lite` HIGH/global; verifier GPT‑6.1Sol HIGH/Codex login bounded relay. Owner prompt27aaf35d…/verifier baseline0b240599…; exact versions/config/hashes trong registrations. Không dùng verifier candidate đã fail controls trước hoặc model substitute.
- **132requests=92owner+40verifier**, max1upstreamrequest/generation,0retry/providererror/timeout/quotaerror. Verifier36PASS/4FAIL. Mọi hard-precheck-surviving final draft đều verifier; no-chart/code terminals không có draft để verify.
- Input672.554/output67.596tokens; thinking/reasoning đã nằm output, không cộng lần2. Provider không expose cost.
- Core verifierp50 6,77s/p95 17,52s; verification+readbackp50 8,02s/p95 18,26s; wholeturnp50 17,52s/p95 49,72s. Media verifierp50 7,65s/p95 13,98s; wholeturnp50 30,64s/p95 44,88s. Nearest-rank, N nhỏ, không TTFT.
- Recursive key + serializedJSON + exactcaseID scan:0evaluatorlabelleak.132generation accounting retained; request bodies giữ nguyên, no secrets/authheaders in reports.
-5preflights+5nativejobs đều exit0, exactcommands ở commands.json. Hai jobs độc lập tối đa2processes; không subagent hoặc modeljudge thêm. Journals/source/hash checks trước từng job và sau run.
-4DB đều testDatabaseDropped=true. No-chart handoff có native evidence ở candidate policy source, không publish. B1runner build từ source hiện hànhPASS. Không rerun full unit/lint/shared suite vì source không đổi sau các checks ở lượt implementation; không claim remoteCI/fullA/livequalification.
- Collector một lần gọi --new khi chưa có PRIMARY_REVIEW lỗi helper sau khi đã ghi metrics; đã dùng notes hiện hữu/render đầy đủ. Không ảnh hưởng provider/raw/denominator, không generation retry.

Recommendation: **STOP sau full run, B chưa GO.** Giữ evidence code no-chart đã tốt hơn, còn feedback boundary, gallery opaque references, source chart gap và chất lượng tư vấn. Không auto fix/rerun, không deployment hoặc public send.
