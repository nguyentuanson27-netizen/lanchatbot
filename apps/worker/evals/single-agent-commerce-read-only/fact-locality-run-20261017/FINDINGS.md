# Findings sau khôi phục facts tại native offers

**Bốn bước giỏ/profile/quote đã hoạt động trong lượt mới; checkout vẫn BLOCKED.** Actual terminal: **4 SEND_ELIGIBLE, 0 static fallback, 2 HANDOFF, 1 NO_SEND**. [Bảy hội thoại và state cuối lượt](CONVERSATIONS.md). Primary5USABLE gồm bốn tác vụ giỏ/profile/quote và một ownership control, không phải năm đơn mua hay năm ca tư vấn thời trang đã đạt.

Source `c6476301539988f134f0843a0e3f2a31fff0560e`, N1; raw `2dffdfa7` được lưu trước primary `bece6452`, rồi mới đọc detailed tool/verifier traces. Không sửa executable, retry/replacement/reseed hoặc thêm generation sau kết quả.

## Điều thay đổi và điều quan sát được

Chỉ gỡ fact-array dedup khỏi serializer; giá/tồn giữ cạnh từng offer dù trusted header cũng có. Giữ prompt, model, config, native declaration, nguồn LIVE, corpus, budget3owner/2tool-round/6calls/1verifier, fallback và các authority boundaries. Current runtime delta3insert/7delete, net-4lines; không thêm role/layer/gate/store/parser/regex/framework.

| Lượt | Hành vi thực tế | Kết quả |
| --- | --- | --- |
| Lấy áo be/M×1 | Apply76/98 + read mặc định; vòng2 add đầy đủ AO/be/M×1; generation3 FINAL dưới NONE. | Profile2, cart1, đúng áo lẻ; exact ACK qua verifier và gate. |
| Đổi L, lấy2 | Hai calls trong cùng batch: SET_COMPONENT_VARIANT TOP/L/BE và SET_QUANTITY2, từng command commit. | Cart3/L/BE×2 ngay cùng lượt; không cần quote sau cứu quantity. |
| Hỏi tổng | Dùng current code-owned quote; không đọc/thao tác thừa. | Exact978.100đ, ship30.000đ; không tự báo tạo đơn. |
| Sửa số đo | Apply74/96, rồi FINAL; không recommend_size hoặc đổi lựa chọn khách. | Profile3, giữ L/BE×2; không đọc lại cả hồ sơ. |
| Private checkout | Code planner tra current cart và nguồn ETA. | HANDOFF/DEPENDENCY_FAILURE, exact cause CART_ETA_REGION_UNRESOLVED. |
| Xác nhận mua | Sau handoff, current authority đã thay đổi. | NO_SEND/CURRENT_AUTHORITY_CHANGED,0model calls; không mua hàng. |
| Xin nhân viên | Owner request_handoff(CUSTOMER_REQUESTED_HUMAN). | Ownership control thành công trong harness; không có actual human service. |

Vòng trước4fallback không còn trong N1 này. Tuy nhiên cả hai run đều đọc nguồn LIVE và model sinh một lần; **không thể quy toàn bộ cải thiện cho fact locality hoặc kết luận ổn định**. Lượt đầu vẫn đọc mặc định trước add, dù prompt cho phép add trực tiếp. Việc tránh readAO lần hai là hành vi quan sát được, không phải một semantic parser hay planner mới.

## NONE và request bound chưa được giải quyết tổng quát

Run mới có **1 request final-only NONE và0call vi phạm**; vòng trước có4requestNONE/cả4trảcall. Đây là hai mức tiếp xúc khác nhau. Request integrity/IDs/signatures đã được audit trước; không sửa REST adapter theo suy đoán. Nguyên nhân của các vi phạm cũ vẫn UNKNOWN.

Actual max wire31.877/32.768bytes, chỉ còn891bytes headroom;0bound error trong run. Offline60captured inputs khôi phục đúng prior action-contract serialization; controlled signature variation vẫn35.905bytes và reject. Không cắt signatures/tăng bound và không gọi rủi ro payload đã resolved.

## Phần thông tin mua hàng còn thiếu trong lời trả lời

Current source complete selections là **PRE_ORDER/stock0**. Sau add, owner trusted facts có PRE_ORDER; cả bốn verifier packets cũng có protected stock status này. Vì vậy đây **không phải context bị thiếu**. Tuy nhiên cả bốn actual ACK/quote đều chưa nói hàng đặt trước. Chúng cũng không nói hàng sẵn và chưa có purchase/checkout preview hoàn tất, nên không gọi tất cả PASS này là false in-stock assertions.

Đây là khoảng trống về truyền đạt điều kiện mua: verifier PASS về những claim được viết ra không chứng minh câu trả lời đã nói đủ điều khách cần trước khi chốt mua. Primary đã giữ caveat này trước khi đọc trace; không đổi nhãn để cứu hoặc làm xấu điểm sau verdict. Chưa có customer acceptance; bốn ACK không chứng minh giọng tư vấn đã tốt. Lượt4 còn nhịp báo trạng thái dài và “nhé ạ!”, nên vẫn có thể viết gọn tự nhiên hơn mà không cần liệt kê số đo.

## Checkout có nguyên nhân cụ thể, khác lượt trước

Run trước cart null nên NO_TRANSITION_PLAN, chưa đến ETA. Run này cart hợp lệ và tới **CART_ETA_REGION_UNRESOLVED**. Resolver thiếu mapping có thẩm quyền từ địa chỉ fixture sang key vùng; transit/preparation data tồn tại không tự chứng minh vùng nào đúng. Handoff và confirmation fencing hoạt động; **không có đơn mua hoàn tất**.

Không đoán MIEN-NAM, thêm DEFAULT hoặc publish catalog. Việc tiếp theo cần nguồn mapping/region contract hợp lệ tại checkout. Khi nối được ETA, vẫn phải kiểm chứng việc thông báo đặt trước/lead time trước xác nhận mua; dùng stock facts đã có, không biến verifier thành một bộ đếm keyword hay thêm mẫu câu theo case.

## Evidence và phạm vi kết luận

13generation/13HTTP200 gồm9owner+4verifier,0retry/error/timeout. Cả4finals đều verify/gate và khớp exact text capture. Audit16raw/preparationhashes,16frozen input/runtimehashes,6reference blobs tại run source,9actual owner wire hashes và4actual verifier wires/bindings;0observed evaluator/private fixture leaks. Private checkout/confirm0model. Disposable DB đã drop, source read-only/capture-only.

Verifier latency p50/p95 **4,394/5,722ms**, N4. Recorded verification interval gồm readback/gate p50/p95 **6,225/8,686ms**; đây không phải causal delta của paired run có/không verifier. Input68,082/output6,408tokens, đầy đủ13/13; cost không expose. [Chi tiết](METRICS.json).

**Recommendation: giữ bản sửa nhỏ để kiểm chứng tiếp; STOP sales/live acceptance, source checkout BLOCKED.** Không chạy24B1/A2/A3, không gọi A PASS hoặc hoàn tất Phase B; A giữ OWNER_BYPASS. Không auto-fix/rerun sau kết quả này, không source publication/merge/deploy/live send hoặc Phase C.
