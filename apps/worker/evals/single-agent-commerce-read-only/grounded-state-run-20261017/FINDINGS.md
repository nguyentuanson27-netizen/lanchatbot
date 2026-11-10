# Finding, nguyên nhân và phần còn lại

Một lượt mới, đúng 7 stateful rồi 24 B1, N1, source `d894eb1afe0c3e1aca3d6599334b734decafc825`. Raw `bab60f7c` trước primary `cf52f303`, trước đọc trace. [Toàn bộ hội thoại](CONVERSATIONS.md), [review và đính chính](PRIMARY_REVIEW.md), [accounting](REQUEST_ACCOUNTING.json). Không chạy lại hoặc thay attempt lỗi.

## 1. Sửa state đã giải quyết đúng lỗi được nhắm tới trong lượt quan sát

- Mở giỏ: owner trích `Eo chị 76` và `mông 98`, code ghi 76/98; áo be M ×1 được thêm đúng.
- Đổi biến thể/số lượng: giỏ thành be L ×2. Tổng 998.000 − 49.900 + 30.000 = 978.100đ, trả đúng cho khách.
- Correction: owner gửi `REPLACE` với `eo 74`/`mông 96`; tool OK, profile revision 2→3, state cuối là 74/96 và giỏ vẫn L ×2. Reply gọn: “Dạ vâng ạ, chị vẫn lấy 2 áo size L nha chị.” Không yêu cầu đọc lại số đo để chứng minh đã hiểu.

Lỗi trước là code nhận số model đưa mà không kiểm nguồn số, rồi lỗi correction không được giữ qua các batch/FINAL/recovery. Bản sửa kiểm numeric copy trước CAS, gắn đúng message/time, giữ pending theo field và tái sử dụng các boundary hiện có. Không biến verifier thành bộ kiểm tính đúng của write đã xảy ra.

Run này không có numeric rejection, nên chỉ chứng minh đường accepted thật của các input trên. Các đường reject/correction vòng sau/unrelated no-op/stronger evidence/receipt recovery được kiểm bằng test, không giả làm provider observations. Quote chứa số đúng vẫn chưa chứng minh field, referent, phủ định hay số cũ/mới; đây là giới hạn còn lại, không phải lý do viết thêm parser.

## 2. Thiếu thông tin đặt trước vẫn tồn tại dù đã có context đúng

Sau add, owner và verifier nhận đúng `stockStatus: PRE_ORDER`, quantity 0 của áo be đã chọn, ngay cạnh components M/BE; sau đổi là L/BE. Owner vẫn chỉ xác nhận thêm/đổi giỏ. Không có câu báo hàng sẵn, không có purchase đã tạo, nhưng khách chưa được biết đây là hàng đặt trước.

Đây là thiếu thông tin phục vụ quyết định mua. Verifier hiện không chấm độ đầy đủ; PASS cho ACK đúng receipt không chứng minh owner đã hoàn thành việc disclosure. Giỏ thật đã ghi, nên cũng không gọi đây là lỗi không thực hiện mutation.

Same-snapshot pair trước run xác nhận cả M/L: màu chưa rõ → `CART_VARIANT_AMBIGUOUS`; BE → READY/PRE_ORDER. Không sửa resolver, không chọn SKU ngầm. Context locality giúp loại giả thuyết owner không được thấy selected stock; chưa chứng minh chỉ thêm context sẽ làm owner nói ra. Preview hiện có là nơi code đảm bảo disclosure trước confirmation; source-backed preview chưa tới được vì dependency ở mục 3. Không thêm normal-reply assembler, store hoặc post-PASS append trong lượt này.

## 3. Checkout chưa hoàn tất do nguồn ánh xạ vùng, không do hai model

Stateful slot 5 có `privateCheckoutFailure.stage=PLANNER`, `reasonCode=CART_ETA_REGION_UNRESOLVED`. Không có owner/verifier generation, không có preview/tin capture; terminal HANDOFF/DEPENDENCY_FAILURE. Slot 6 bị `CURRENT_AUTHORITY_CHANGED`, cũng 0 generation và không chốt đơn. Giỏ giữ nguyên.

Dữ liệu thời gian giao `shipping_eta` có sẵn. Phần thiếu là căn cứ ánh xạ địa chỉ riêng của khách sang key vùng đó; không suy ra TP.HCM→một key bằng trí nhớ hoặc để model tự chọn. Không gọi đây là thiếu toàn bộ dữ liệu vận chuyển. Control PostgreSQL dùng source synthetic đã cấu hình vẫn qua preview/confirmation; điều đó không gỡ dependency của source thật.

Hai HANDOFF không chứng minh nhân viên đã nhận việc. Slot 7 là control riêng, chỉ đo bot nhường ownership khi khách yêu cầu. Không có holding message được cấu hình trong source hiện tại thì không tự hứa nhân viên đang xử lý.

## 4. Chín fallback B1 có hai nguyên nhân khác nhau

| Slot | Case | Nguyên nhân quan sát |
| --- | --- | --- |
| 1 | b1-changed-occasion | Verifier FAIL/UNSUPPORTED_PROTECTED_ASSERTION, product:SV2447. |
| 15 | b1-search-read-v2 | Verifier FAIL/UNSUPPORTED_PROTECTED_ASSERTION, ref null. |
| 18 | b1-current-policy-v3 | Verifier HTTP 429/usage_limit_reached, không có verdict. |
| 19 | b1-partial-source-v3 | Cùng lỗi quota verifier. |
| 20 | b1-price-v3 | Cùng lỗi quota verifier. |
| 21 | b1-component-stock-v3 | Cùng lỗi quota verifier. |
| 22 | b1-search-read-v3 | Cùng lỗi quota verifier. |
| 23 | b1-buying-concern-v3 | Cùng lỗi quota verifier. |
| 24 | b1-policy-used-v3 | Cùng lỗi quota verifier. |

Slot 15: owner từ kết quả tìm chưa trúng kết luận “shop không có mẫu set váy Khánh Trang”. Không có căn cứ danh mục đầy đủ cho phủ định đó; block đúng. Đây là lỗi suy từ search miss sang không tồn tại, không phải cần nhét thêm tên mẫu vào prompt.

Slot 1: nháp nói áo “sẽ hơi thấu nhẹ bên trong” dưới đèn mạnh rồi gợi áo hai dây/lót nude. Gợi lớp mặc thông thường đã được owner cho phép; dữ liệu không có phép thử độ xuyên và không xác nhận độ mỏng. Phải xét toàn đoạn để phân biệt lời cảnh báo/phối đồ với thông báo kết quả che phủ. Verdict không có giải thích chi tiết nên chưa tách được nó chặn câu khẳng định độ xuyên hay chặn quá rộng phần phối đồ. Giữ FAIL thật, không tự sửa nhãn thành SAFE và không kết luận mọi lời gợi lớp lót đều phải chặn.

Bảy lượt 429 vẫn có owner FINAL nhưng không có semantic verdict. Không được chấm như verifier đã đọc sai policy hoặc xem nháp trông hợp lý là khách đã nhận câu đó. Actual đều là fallback tĩnh, vẫn trong denominator. Không retry, không đổi model/route và không phát sinh vòng mới.

## 5. Giọng tư vấn còn mang nhịp catalog; lỗi chấm cũng cần được sửa

B1 slots 3/6 dùng nhiều tính từ và lý do từ mô tả hàng, khiến lời chọn đồ dài và ít gần với tin nhắn bán hàng. Slots 5/8 trả được phần chất liệu khi source giá/tồn thiếu, nhưng kết thúc bằng giọng “hệ thống chưa hiển thị/kiểm tra được” và không có bước xử lý dùng được. Không sửa bằng cách bịa giá, hứa sẽ kiểm tra hoặc mặc định có nhân viên tiếp nhận.

Slot 4: gợi mặc thêm lớp lót/chuẩn bị ô khi khách dễ nóng là quyết định chưa tốt; cần chỉnh lời khuyên, không tự tăng yêu cầu kiểm nghiệm. Primary ban đầu đã chấm quá chặt phần cảm giác ngoài trời thành UNUSABLE/safety 0. Đối chiếu [spec owner đã duyệt](../../../../../docs/specs/c3-phase-b-advisory-and-chat-boundary-20261016.md) thì nguồn mềm/nhẹ/thoáng cho phép lời trấn an đó. Đính chính thành NEEDS_EDIT/safety 2; giữ bản ban đầu ở primary commit và metadata JSON. Đây là sửa việc áp dụng sai rubric đã freeze, không thay rubric để cứu run. Không dùng slot này để tuyên bố một verifier false PASS.

Sau đính chính, B1: 10 USABLE, 5 NEEDS_EDIT, 9 fallback. Stateful: 3 USABLE (gồm một ownership-only control), 2 NEEDS_EDIT vì cùng một thiếu disclosure kéo dài, 2 không có reply/checkout. Tổng 13/7/11, không có đơn được chốt. Không cộng điểm keyword hay bắt mọi lượt có CTA, không phạt list giá/upsell hợp lý, không yêu cầu lặp mọi điều kiện policy.

Đoạn profile hiện tại thực sự có nhiều lời quảng cáo gần với đầu ra; đó là bằng chứng context có ảnh hưởng tới nhịp viết, chưa phải causal proof model chỉ chép từ nguồn. Lượt này chỉ đổi owner paragraph về numeric grounding, không thử treatment văn phong mới.

## Hướng tiếp theo, chưa thực hiện trong run này

1. Giữ bản sửa state và các test biên; không đổi shared evidence ordering hay thêm semantic parser. Chưa coi N1 này chứng minh ổn định cho mọi correction.
2. Khôi phục quota của route verifier hiện tại trước lần chạy được owner cho phép tiếp theo. Không tăng repetitions hoặc loại 429 để làm đẹp tỷ lệ.
3. Lấy/cấu hình nguồn địa chỉ→vùng đã được shop xác nhận trong flow hiện có; giữ dữ liệu thời gian giao và private code path. Không sửa bằng đoán mapping hoặc thêm gate vận hành.
4. Xử lý disclosure ở nơi hiện có chịu trách nhiệm kết quả mua: selected context và code-owned preview. Nếu muốn bắt buộc thông báo ngay ở add ACK, phải nêu rõ thay đổi ownership/egress trước khi implement; lượt này chưa thêm cơ chế đó.
5. Khi sửa lời tư vấn, dùng một hướng dẫn rõ về việc quyết định theo nhu cầu, lấy facts thay vì giọng quảng cáo của nguồn; thay đoạn cũ, không nối thêm danh sách từ cấm/câu mẫu theo case. Giữ quyền suy luận cảm giác/phối đồ owner đã duyệt. Chỉ phân tích lại ca sân khấu theo toàn nghĩa, không gom chung với search miss hoặc lỗi quota.

Không thực hiện các mục tiếp theo sau khi xem kết quả. Sales/live recommendation STOP; source checkout BLOCKED; A vẫn OWNER_BYPASS. Không A2/A3 mới, source publication, merge/deploy, live send/effect hay Phase C.
