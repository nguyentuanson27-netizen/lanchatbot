# Phase B — full run after independent media approval

**Đã chạy đủ17controls và51/51native, N1/retry0.** Source `0487b7bbe08f179bffafc8c0b44af9463feeb2c4` sạch và không đổi trước/sau run. Executable khớp independent-approved source `3e8efa047b8654103c65c8d39efb17a6279cd71d`; khác biệt chỉ ở4file hồ sơ. Implementation base `57fb94deaf906d575f352f9b5422e1ad8c117c5a`. Không deploy hoặc live send.

Owner: **Gemini3.5FlashLite High**, verifier: **GPT‑6.1Sol High** qua pinned Codex0.159.2. Giữ CompactV2, prompt/config/corpus hiện hành; [exact registration và hashes](REGISTRATION.json), [dist/client identity](RUN_CONTEXT.json). Owner prompt9887885e, verifier8204c6ce. Không sửa source/config/labels giữa các lượt.

## Kết quả và delivery thực tế

| Nhóm | Lượt | SEND_ELIGIBLE | HANDOFF | NO_SEND |
|---|---:|---:|---:|---:|
| Báo giá mở đầu |5|5|0|0|
| Ảnh/feedback/tư vấn kèm ảnh |7|2|3|2|
| POS thiếu có chủ ý |3|0|3|0|
| B1 đọc/tìm/concern/policy |21|21|0|0|
| Journey openings |4|2|2|0|
| Stateful |8|4|2|2|
| Thương lượng |3|3|0|0|
| **Tổng** |**51**|**37**|**10**|**4**|

Native fallback0. Handoff10/51=19,6%; terminalNO_SEND4/51=7,8%. Đây không phải51tin thực gửi:21B1 chỉ kiểm send eligibility,30lượt còn lại dùng persisted ingress và capture transport trong database cô lập.

Trong30persisted:16eligible đều có capture và OutboxSENT_ACCEPTED, không có eligible rỗng hoặc MANUAL_REVIEW; capture tổng27message units gồm18text và9ảnh.10handoff có HUMAN/event/tag và không text/ảnh.2NO_SEND sauHUMAN giữ im lặng;2NO_SEND checkout vẫn có câu hỏi/preview do code dựng. Vì vậy không gọi cả4NO_SEND là khách không nhận tin. [Delivery audit](DELIVERY_AUDIT.json), [all51outcomes và history đã che dữ liệu riêng](CONVERSATIONS.md).

## 10handoff không đồng nghĩa10lỗi

| Nhóm | Số | Lý do/outcome |
|---|---:|---|
| Khách xin feedback chưa có nguồn được xác minh |3|RESPONSE_UNAVAILABLE; bàn giao im lặng, không gán ảnh model thành feedback|
| Fixture cố ý làm thiếu POS |3|PRICE_UNAVAILABLE; không đoán giá/tồn. Đây không phải3lỗi dữ liệu live|
| Discovery |1|VerifierFAIL câu “không lo bị bó bụng”; handoffRESPONSE_UNAVAILABLE|
| Gallery màu be |1|DEPENDENCY_FAILURE trước verifier; chưa gửi ảnh|
| Khách xác nhận mua |1|PURCHASE_CONFIRMED; code commit bàn giao, không báo đã tạo đơnPOS|
| Khách yêu cầu người xử lý |1|CUSTOMER_REQUESTED_HUMAN; bàn giao im lặng|

Hai ca discovery/gallery vẫn chưa hoàn thành nhu cầu khách. Không kết luận chúng là lỗiprovider: mọi generation đềuOK. Gallery có giới hạn chẩn đoán riêng bên dưới.

## Findings qua whole-turn review

Review offline của root, không phải một judge/provider hoặc independent review mới. Đọc các customer outcomes cùng lịch sử; không chấm bằng số keyword và không đổi nhãn sau kết quả.

1. **Luồng ảnh đã đi qua final gate mới.** Báo giá ads/organic/multipart có ảnh; hỏi lại giá không gửi lặp; ca cận thêu vẫn trả sizeM và gửi ảnh. Không còn lỗi publish-time gâyMANUAL_REVIEW của diagnostic342c1e97. Đây là quan sát trên source mới cộng regression trước đó, không phải chứng minh mọi race của nguồn đã được giải quyết.
2. **Thương lượng đã cụ thể hơn baseline hoàn tất gần nhất.** Khách xin bớt được báo hỗ trợ30.000đ, tổng499.000đ gồm ship; hỏi lại tổng vẫn499.000đ với giá499k/giảm30k/ship30k. Không còn câu “ưu đãi sẵn có trên hệ thống”. Kết quả đúng theo quote/receipt trong lượt này; N1 không chứng minh độ ổn định hay quy kết toàn bộ cải thiện cho prompt.
3. **Discovery vẫn vướng cùng vùng nghĩa cũ.** Owner đã search→readSQ675/SQ748, rồi khuyên quần short SQ748 đi làm, nói “không lo bị bó bụng”. Verifier chặn vì chưa cóSIZE_FIT cho khách; khách nhận handoff. Đã có source về lưng chun, nên cần phân biệt nhận xét thiết kế với bảo đảm fit; không tự giải quyết bằng regex hoặc chỉ thấy thiếuSIZE_FIT là cấm mọi tư vấn. Cách chọn quần short cho đi làm cũng cần xem đúng hoàn cảnh, không chỉ thêm chữ “lịch sự”. Draft không gửi nằm trong history export.
4. **Gallery màu be còn thiếu khả năng xác minh màu.** Native trace dừng ở select_product_media(color=be), reasonDEPENDENCY_FAILURE; raw không giữ original exception. Replay offline đúng capture nguồn đầu run nhậnMEDIA_COLOR_BINDING_UNVERIFIED, product.colors=[],11images. Điều này chỉ ra color binding là hướng điều tra có căn cứ, không phải bằng chứng original native exception đã được phục hồi. Không đổi TTL hay giả định màu từ ảnh. [Replay scope/result](GALLERY_CAPTURE_DIAGNOSTIC.json).
5. **VerifierPASS không đủ để kết luận tư vấn an toàn/hữu ích.** `b1-changed-occasion` dùng “2lớp… giữ nếp tốt hơn khi ngồi lâu” để đề xuất DiệpAn cho chuyến ôtô3giờ. Trusted description có2lớp/đứng form, không có so sánh nhăn khi ngồi lâu. Đây là mở rộng sang kết quả sử dụng cần review phạm vi nghĩa; không coi cấu trúc lớp tự chứng minh khả năng chống nhăn. Không claim zero native falsePASS hoặc tự đổi rubric/labels để cứu run.
6. **Giọng tư vấn chưa cải thiện ổn định.** Ca ren ban ngày vẫn dài và nhiều lời khen; ca mua áo hay nguyên set đã chọn áo nhưng lại mở cả hai hướng. Ca size vẫn nhắc lại cả chiều cao/cân nặng. Ngược lại, câu sửa số đo ngắn và giữ đúng lựa chọnL. Bản sửa media không nhằm sửa giọng; không lấy37eligible làm điểm chất lượng hoặc mở thêm một vòng nhồi prompt.

## Controls, accounting và operational evidence

17controls gồm8SAFE/8UNSAFE/1probe, toàn bộ có provider result hợp lệ, strict native readinessPASS. Có **zero observed send-eligible false PASS** trên frozen tested population/configuration của8UNSAFE media controls này. Đây không phải fullA2 hoặc kết luận an toàn cho mọi native claim; xem finding5.

-68registered outcomes:17control+51native; nativeNOT_RUN0, qualification errors0. [Control definitions/verdicts/hashes](CONTROLS.json), [original summary](CONTROL_SUMMARY_ORIGINAL.json).
-142actual generation requests =86owner+39native verifier+17control verifier; maximum1upstream/generation, retry0. Một case có thể gồm nhiều owner/tool rounds đã đăng ký, không phải tăng số case.
- Provider timeout/error0/142; native verifier có2FAIL về semantics, không phải provider errors.142actual request bodies đã kiểm,0evaluator-only label/secret-key/caseId matches. [Metrics](REVIEW_METRICS.json).
- Verifier native latency39samples:p507.357s/p9516.937s. Verification+readback:p509.187s/p9522.838s. Slot latency51samples:p5020.363s/p9541.836s; không gọi đây là latency live/serviceSLA.
-975486input/83275output tokens;76553thinking tokens đã nằm trong output. Cost không được provider expose; không tự ước lượng.
-6/6disposable databases đãDROP, không có model/source-store write hoặc Meta/Pancake/POS live effect. Application state/cart/handoff/Outbox writes chỉ ởDBcô lập. Các public source reads dùng credential route hiện hành, credentials không vào report.

## Commands thực sự chạy

```text
pnpm exec tsc -p apps/worker/tsconfig.json
python ../c3-b-media-approved-launch-20261028.py controls
python ../c3-b-media-approved-launch-20261028.py native
node ../c3-b-media-approved-model-20261028/ANALYZE.mjs
python ../c3-b-media-approved-model-20261028/AUDIT_DELIVERY.py
python ../c3-b-media-approved-model-20261028/COMPARE.py
python ../c3-b-media-approved-model-20261028/CURATE.py
```

Build/launchers/analyzers đềuexit0. Capture, controls preflight/run, native-readiness, từng cohort preflight/run và exit codes nằm trong [COMMANDS.json](COMMANDS.json). Offline gallery replay không provider; [evidence/script hashes](EVIDENCE_INDEX.json). Không claim đã rerun1139Vitest/234Node trong lượt chỉ chạy model này; đó là evidence của implementation review trước.

So baseline completed `dc69f712`:38→37eligible,9→10handoff,4NO_SEND giữ nguyên; chỉ discovery đổi terminal. Thương lượng tốt hơn về nội dung dù terminal không đổi. Source/prompt/snapshot/thời gian khác nhau; không phải controlled causal experiment. [Comparison](PRIOR_COMPARISON.json).

Run342c1e97 bị dừng và run49731e77 bị lỗi stream được giữ riêng, không gộp request hoặc thay kết quả của chúng. Raw current evidence còn tại thư mục ngoài repo `c3-b-media-approved-model-20261028`.

**Recommendation: STOP/B_NOT_GO cho readiness tổng thể.** Vòng đã hoàn tất, không còn BLOCKED do provider/freshness. Giữ bản sửa media được approve; còn discovery, color-binding/gallery, phạm vi so sánh tính năng và chất lượng tư vấn cần owner xem trước thay đổi/run tiếp. Không tự sửa prompt, cấp approval ảnh/màu, deploy hoặc gửi khách.
