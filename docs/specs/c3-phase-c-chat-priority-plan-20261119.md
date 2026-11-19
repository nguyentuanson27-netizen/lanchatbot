# Phase C — đưa câu tư vấn về đúng việc khách đang cần

Ngày 19/11/2026. Bản 2 sau review độc lập. Evidence gốc là full 34 ca, 55 lượt trên `992e360f`, báo cáo tại `8810904e`. Phạm vi là lời tư vấn và cách trình bày preview checkout trong môi trường test.

## 1. Vấn đề cần giải quyết

- 18/47 lượt có tin dùng ngoặc. 17 tin khớp draft Gemini đã đưa cho verifier. Preview checkout còn lại do formatter tạo. Request của cả 17 lượt có chỉ dẫn cho phép ngoặc để phân biệt giá, lựa chọn hoặc điều kiện. Đối chiếu theo cụm nguyên văn, 15 lượt có cụm ngoặc chỉ xuất hiện ở draft mới; P09/T2 và J4/T3 lặp đúng cụm đã có trong lịch sử shop. Đây là bằng chứng về nguồn tạo câu. Mức ảnh hưởng của chỉ dẫn prompt và lịch sử đến kết quả cần đo.
- P06 giấu tổng cả ship trong ngoặc rồi mở thêm size. S15 giấu trạng thái đặt trước, mở bằng giá dù khách đang nói thích màu be, rồi mời khách hai việc. S05/S06 gộp mô tả chất liệu, lời khen và bước chốt vào lời tư vấn. J2 đọc lại số đo khi khách cần biết size có đổi. J4 hỏi lại bước chốt đã được nêu ở lượt ngay trước. S04 đã cho thấy có thể nói rõ trắng sẵn và be đặt trước bằng một câu.
- Các vòng trước đã thử sửa lời văn và đổi projection. Việc tước dữ kiện từng làm mất trạng thái đặt trước và làm ca sửa số đo yếu đi. Phần giá, tồn, size, chính sách, ảnh và effect cần đủ để đánh giá lời tư vấn và cấp quyền theo đúng nguồn.

[Lịch sử 55 lượt](evidence/c3-phase-c-full-20261119/CONVERSATIONS.md) · [Lần sàng lọc giọng gần nhất](evidence/c3-support-source-screen-20261118/REPORT.md) · [Giới hạn lần sửa trước](c3-phase-c-sales-voice-source-fix-plan-20261118.md).

## 2. Thay đổi dự kiến

### Tin tư vấn do owner viết

Chỉ thay đoạn sau tiêu đề **Giọng chat** trong `owner.vi.txt`, dòng 53–60 trên source báo cáo. Nối các câu trùng ý thành một đoạn. Bỏ trần mặc định hai câu và dòng dành riêng một ngoại lệ rộng cho ngoặc. Đoạn dự kiến đưa vào prompt dùng nguyên tắc chung, không có lời đáp hoặc mã ca trong bộ đo.

> Xưng em, gọi khách là chị. Viết câu ngắn bằng từ thường ngày. Trả thẳng việc khách đang cần. Với giá hoặc tổng tiền, nói con số đã xác minh ở ngay câu trả lời chính. Khi khách nhờ chọn, chọn một phương án và nói điểm giúp khách hình dung cách mặc hoặc quyết định mua. Đưa tình trạng hàng và điều kiện ảnh hưởng quyết định vào câu chính. Nếu cần trình bày vài lựa chọn, xuống dòng theo từng lựa chọn.
>
> Dùng lại thông tin đã có. Khi khách sửa số đo hoặc sở thích, nói kết quả có đổi hay không. Nhắc một dữ kiện khách đã cung cấp khi nó giải thích được lựa chọn. Tiếp tục từ món khách đang quan tâm. Chỉ hỏi phần còn thiếu cho bước khách muốn làm. Khi bước đó đã được hỏi ở lượt ngay trước và khách chuyển sang hỏi giá, trả câu hỏi giá trước. Đáp gọn khi khách cảm ơn hoặc muốn xem thêm.
>
> Dùng tên món, màu và cách gọi khách hiểu. Nói kết quả hoặc việc còn cần làm bằng ngôn ngữ của shop. Tránh kể lại thao tác nội bộ, mã sản phẩm và lời dẫn dài. Giữ nguyên phạm vi của size, trạng thái hàng, giá, điều kiện và việc shop đã làm.

Các mục **Hiểu khách và tư vấn**, **Size, state và giao dịch** và **Báo giá** nằm ngoài diff. Form dùng cho khách mới hoặc từ ads hỏi giá mẫu đã xác định vẫn nêu tên/phần bán, giá, chất liệu/phom có nguồn và size đã xác nhận, kèm ảnh theo nhánh hiện hành. Hỏi tổng tiền dùng code quote đúng mặt hàng/số lượng và phạm vi phí. Giữ yêu cầu công bố đặt trước ở dòng 39 và form theo phạm vi ở dòng 65. Ảnh theo rule opening đã xác nhận, gồm ảnh của từng mẫu khi báo giá từ hai mẫu trở lên. Các điều kiện ảnh, receipt, handoff im lặng và quyền thao tác do code xác định.

Dữ liệu Compact V2, history gốc và cả lời cũ có ngoặc đều đi vào hai nhánh đối chứng. P07 là việc riêng về ranh giới tư vấn size. Engine trả M, draft đưa L thành phương án mua cho khách đang nhờ tư vấn. Bản kế hoạch giọng giữ nguyên prompt nghiệp vụ size và trạng thái STOP cho finding này. Verifier kiểm nghĩa protected của exact draft theo hợp đồng hiện hành.

### Preview checkout do code dựng

Sửa trình bày lựa chọn tại điểm dựng preview, dùng dữ liệu từ cart đã commit. Hiển thị tiêu đề đã bind đúng mẫu và số lượng, rồi mô tả thành phần theo đúng sản phẩm. Một cách trình bày từ preview đã ghi nhận là “Set váy Thạch Thảo ×1: 799.000đ” rồi “Áo size M và chân váy size M”. Khi size hoặc màu từng món khác nhau, đưa chi tiết ngay sau đúng món. Không rút chuỗi tên theo mẫu cứng; tên chưa resolve tiếp tục dùng định danh hiện có. Trường giá dòng, giá tổng, tiền ship, ưu đãi, ETA, phương thức thanh toán và phần riêng tư của preview tiếp tục theo contract.

`formatCartLineSelection` được dùng lại trong commerce effects. Giới hạn style mới tại điểm dựng preview; kiểm consumer ngoài preview theo kết quả hiện hành. Dùng test checkout/ingress/effects đang có và thêm assert cho set khác màu và khác size, món lẻ, combo và title chưa resolve nếu các test hiện tại chưa bắt được.

## 3. Kiểm định thay đổi

### 3.1. Kiểm định xác định

- Khoanh diff prompt vào đoạn đã nêu. Cập nhật hash owner trong manifest và liên kết quyết định cho candidate. Seal exact source sau khi build, typecheck, lint, kiểm focused adapter wire, quote, fit, care, checkout, effects và ingress. Dữ liệu giá/ưu đãi, chart, policy, ảnh, receipt, state và quyền gửi được kiểm trên các path hiện hành.
- Chạy checkout qua ingress fixture bằng dữ liệu riêng tư giả lập. Preview phải giữ đủ món, số lượng, màu/size, tổng, ship, ưu đãi, ETA, cách thanh toán và trường riêng tư đúng kênh. Kiểm nhóm tin test thực nhận, quyền và receipt sau xác nhận, một lần xử lý, cùng shape của consumer effects. Checkout formatter có kết quả kiểm độc lập với điểm giọng.
- Chuẩn bị registration A/B 8 cặp và diagnostic native 4 ca riêng trong eval. Tái sử dụng `finalOwnerWire`, `assertReplayWire`, sender hiện hành và các port của `isolated-integration.mjs`. Bộ đếm và validators của các screen cũ gắn với quần thể và source cũ. Thêm registry eval nhỏ, gồm ghi nhận replay owner, packet judge 8 cặp và chạy native. Mỗi mode xác thực danh sách slot, hash input/rubric, trần gọi, retry và claim trước dispatch. Giữ source/flags của các screen lịch sử. Test registry từ chối ca ngoài danh sách, sai identity, dispatch lặp, thừa slot và ADS metadata sai fixture. Test và preflight dùng fetch trap để xác nhận dựng và khóa input không gọi provider.

### 3.2. Đối chứng lời tư vấn với tám cặp

- Sáu input đích khóa trước, mỗi input một lượt. P06, S15, S05, S08, J2/T2, J4/T3 lấy từ các journal của full 19/11, repetition 1. Hai control là S04 trong full này và `c-context-opening` lượt đầu, repetition 1, từ native CONTROLS ngày 15/11. Capture ADS lấy ở `9a65450fdf29b1c5c544465bf61c450d3c22f133`, có entry `firstContact:true, fromAd:true`, wire hash `02b92301081942348bc9687325fdbb98ec375856b140abcc5184510b43119dd7`; run gốc có một tin và một ảnh. Đã chạy `finalOwnerWire` và `assertReplayWire` trên cả tám capture, 0 request. Khóa cả tám hoặc dừng ở preflight nếu mất input/hashes.
- Hai nhánh dùng Gemini 3.5 Flash Lite High, chung byte nội dung, tool declarations, model signatures, settings và lịch sử. Thay duy nhất `systemInstruction` giữa prompt trên `992e360f` và candidate. Assert hash ngoài `systemInstruction` bằng nhau, wire vẫn trong bound và không có label đánh giá. Mode native trong wire được giữ, sender replay chỉ đọc kết quả. Lệnh tool trả về được ghi `TOOL_CALL_NOT_EXECUTED` và lượt đó trượt. Mọi HTTP, timeout, malformed, tool call và thiếu điểm được giữ trong mẫu số. Mỗi nhánh một generation. Trần 16 owner + 8 judge, retry 0.
- Chốt trước judge offline GPT‑6.1 Sol High qua Codex CLI 0.159.2, một lượt/cặp, mô hình/schema/rubric và thứ tự mù có hash. Judge nhận câu khách, lời trước có liên quan, verified facts và kết quả tool cần kiểm, hai câu trả lời theo thứ tự ngẫu nhiên. Ghi đủ `voicePass`, `factsComplete`, `materialFailure`, `preferred` và lý do. Chấm cả lượt theo ba câu hỏi. Câu trả ngay việc khách cần chưa? Lời khuyên và câu hỏi giúp chọn, mua hay đi tiếp ở lượt này không? Món, số tiền, điều kiện hàng, size và việc đã làm có căn cứ đúng không? Đọc tự nhiên, rõ ý, đủ dữ kiện quyết định là đạt; dấu ngoặc, số từ và số câu chỉ dùng để định vị chỗ cần đọc lại.
- Control ADS ở replay chỉ chấm phần form chữ và dữ kiện được cấp. Bằng chứng ảnh và effect đến từ actual terminal ở native. 8/8 cặp phải đủ câu và điểm, ít nhất 5/6 ca đích đạt giọng, thắng ròng dương trên sáu ca đích, cả hai control đủ việc khách cần và đủ thông tin đúng. Bất kỳ lỗi trọng yếu của candidate về fact, policy, receipt, privacy hoặc mất điều kiện làm đổi quyết định đều STOP, kể cả lỗi baseline cũng mắc. Baseline được ghi riêng để đọc chênh lệch. Mọi lỗi hạ tầng làm thiếu cặp đều STOP và giữ evidence.

### 3.3. Kiểm hành trình thật trong DB test sau khi replay qua

- Đăng ký từ đầu J2 3 lượt, J4 3 lượt, P09 2 lượt, ADS 1 lượt. Dùng đúng kịch bản khách và nguồn hiện hành đã kiểm. Seal world, source, model, slot và handler test, rồi preflight trước provider. Mỗi ca một lần, trần 3 owner + 1 verifier/lượt và 36 native generation cả nhóm. Ghi runtime recovery trong cap đã duyệt nếu xảy ra. Trần này và 24 request đối chứng/chấm mù cho phép tối đa 60 request của kế hoạch. Review native do người review đọc actual terminal từ 9 lượt, dùng cùng tiêu chí về câu trả lời, giữ trace kiểm cơ chế riêng.
- Ở native ADS, bind đúng synthetic envelope từ fixture `c-context-opening` trong `SALES_CONTEXT_CONTROL_CASES_20261115.json`, gồm nguồn ADS, mẫu đã xác định và first-contact trong dữ liệu fixture được seal. Native runner hiện chỉ cấp envelope này cho CONTROLS của campaign cũ. Mở một đường đăng ký eval-only có hash và kiểm exact case/turn/fixture để chạy control trên source mới, dùng cùng native ingress và đường chuẩn bị ảnh. Test offline chứng minh envelope vào đúng ingress, entry thực sự từ ads, ảnh nằm trong response group test cùng form giá và khớp sản phẩm. Control thiếu môi trường fixture/ảnh báo BLOCKED trước run; không lấy first-contact thường thay cho ADS.
- PASS yêu cầu thu đủ 9/9 terminal, J2 giữ số đo đã sửa và size engine qua ba lượt, J4 giữ quote hỗ trợ/tổng theo code và lượt hỏi tổng tránh lặp câu chốt, P09 phân biệt đúng hai set rồi tiếp tục theo món khách vừa xác định, ADS có form và ảnh đúng mẫu trong Outbox test. Ca trượt nếu mất lời tư vấn cần thiết, gửi sai nguồn/màu/giá, ghi state thiếu căn cứ hoặc mất condition. Handoff/no-send ghi và chấm theo việc khách thực tế nhận. Lỗi provider, hụt lượt hoặc ca chưa đạt đều STOP ở sàng lọc. Kết quả N=1 phục vụ kiểm phát triển; qualification Phase C có bộ đăng ký riêng.

Phạm vi của tài liệu này là chốt phương án. Các lệnh build và chạy model ở §3 thuộc lượt triển khai sau khi phương án được duyệt.
