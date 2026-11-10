# Review quá trình sửa C3 từ Checkpoint A đến Phase B

Ngày 22/10/2026. Review tại HEAD `47b0cd995952eb7ac7e0c51174a853220698d17e`; runtime của campaign mới nhất là `a39e45affbd1a8171d8e13ffe2d741cc6624278d`.

Phạm vi: lịch sử yêu cầu và quyết định của owner từ A đến B; git history, các checkpoint/findings và phép so sánh đã lưu; đọc lại đủ 39 hội thoại campaign mới nhất, đối chiếu các hội thoại và findings lịch sử liên quan. Đây là review xuyên suốt quá trình, không phải một lần chấm lại độc lập từng raw attempt của mọi vòng. Không chạy provider/tests hoặc sửa runtime/prompt trong review này. Không ghi đè điểm lịch sử.

## Kết luận

Phần thực hiện giao dịch đã tiến bộ rõ hơn phần tư vấn. Các lỗi tư vấn chính vẫn lặp qua nhiều lần thay prompt. Ngoài chất lượng model, quy trình sửa còn ba vấn đề: chọn sai tầng để sửa, tiêu chí review chưa nhất quán, và độ phủ hành trình bán hàng được mở rộng quá muộn.

Không đủ bằng chứng nói toàn kiến trúc thất bại hoặc model không thể viết tự nhiên. Cũng không đủ bằng chứng nói đã gần hoàn tất chỉ vì ít fallback ở bộ ca quen thuộc. A vẫn OWNER_BYPASS; B chưa GO.

## 1. Diễn biến và phần thực sự có ích

| Giai đoạn | Điều đã làm | Bài học có bằng chứng |
|---|---|---|
| A: boundary và adversarial safety | Envelope, exact draft/snapshot binding, final gate, unsafe/safe corpus | Đúng vai trò kiểm an toàn trên tập đã chạy. A2 PASS không bảo đảm A3 bán hàng tốt; safe refusal và unsafe false PASS vẫn xuất hiện ở những vòng khác. |
| A: sửa lời tư vấn và ranh giới verifier | Điều chỉnh policy scope, suy luận chất liệu, ACK/receipt, size, whole-turn review | Có nhiều thay đổi yêu cầu hợp lệ từ owner. Không được so raw điểm trước/sau như cùng một bài kiểm tra; cũng không được coi mọi chênh lệch là model tiến bộ. |
| B đầu: nguồn thật và stateful | Nối product/policy, giỏ, số đo, quote, private checkout, handoff | Lộ lỗi mã field, offer scope, thứ tự tool, địa chỉ–vùng và receipt. Chúng cần sửa hợp đồng/code/source, không thể giải quyết chỉ bằng giọng văn. |
| B: phân công model–code | Chuẩn bị nguồn sản phẩm, ánh xạ field, dùng lại quote/receipt, checkout do code | Campaign 19/10 có 3/3 mở giỏ, đổi giỏ và checkout theo chuỗi đã đăng ký. Đây là tiến bộ chức năng cụ thể. Advice-only và B1 integrated cùng 8/12 USABLE: bỏ điều phối tool chưa chữa được tư vấn trong phép thử đó. |
| B: thử giọng/context/ví dụ | Rút hoặc thay chỉ dẫn, biên tập mô tả, thêm hội thoại mẫu, dùng prompt Gemini | Kết quả pha trộn, chưa chứng minh một cách sửa cho cải thiện ổn định. Không nên tiếp tục coi thêm/bớt chữ là giả thuyết mới. |
| B: nối tác vụ còn thiếu | History/product focus, media, negotiation, private intake; sửa source binding | Có tiến bộ code và integration riêng. Nhưng campaign mới nhất có 3 fallback và 1 silent handoff ở cả 4 opening mới; khả năng bán hàng đầu cuộc chưa dùng được trong các lượt này. |

Nguồn: [A2 full](../../apps/worker/evals/single-agent-semantic-verifier/a2-full-rerun-20261014/CHECKPOINT_A.md), [A3 follow-up](../../apps/worker/evals/single-agent-semantic-verifier/a3-full-followup-20261014/CHECKPOINT_A.md), [review 93 lượt](../../apps/worker/evals/single-agent-commerce-read-only/bounded-source-repeat-2x-20261018/REVIEW_93.md), [model–code division](../../apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/CHECKPOINT_B.md), [latest campaign](../../apps/worker/evals/single-agent-commerce-read-only/full-b123-connections-20261022/CHECKPOINT_B.md).

## 2. Các finding còn tồn tại trong hội thoại

### 2.1. Hiểu câu hỏi nhưng chưa biến thành lời khuyên mua rõ

`b1-buying-concern-v2`: khách quen đồ trơn, ngại ren điệu. Bot nhận ra điều đó nhưng lần mới nhất lại đưa áo lẻ, váy lẻ, cả bộ và hỏi khách chọn. `b1-buying-concern-v3`: ban đầu khuyên áo để phối váy đen có sẵn, cuối lại mở cả bộ và hỏi chọn lại. Cùng kiểu đã có trong review 93 lượt và các focused runs.

Vấn đề không phải luôn chọn áo hay luôn chọn set. Một phương án đắt hơn vẫn có thể bán tốt. Vấn đề là lý do chọn và thứ tự thông tin không giải quyết ưu tiên của khách; đưa nhiều lựa chọn làm mất vai trò tư vấn khi khách vừa nhờ shop chọn.

Prompt hiện hành đã yêu cầu shop chọn, giải thích điểm khác biệt và không mở lại các hướng. Vì vậy “thêm yêu cầu chọn một phương án” không phải sửa mới. Cần kiểm khả năng thực hiện yêu cầu trên input hiện tại, đồng thời kiểm source có lựa chọn/thuộc tính phù hợp thật hay không. Chưa xác định được duy nhất một nguyên nhân nội tại model.

### 2.2. Hoàn cảnh đổi nhưng bot chưa đổi việc mình đang làm

Ca sân vườn/dễ nóng tiếp tục trả mềm–thoáng–nhẹ, nhắc lại hoàn cảnh rồi mời nhắn nếu muốn xem thêm. Các vòng trước từng chuyển sang khuyên bóng râm/quạt mini hoặc trấn an mặc lâu không bí. Cả hai đều có thể không giải quyết chuyện mua trang phục.

Đích sửa là giúp khách quyết định mua/đổi/phối như thế nào với hàng shop có, chứ không chỉ thêm câu “xét lại lời khuyên”. Nếu cần món thay, phải kiểm bước tìm/đọc món thay có thực hiện được; không mặc định thêm vô hạn thuộc tính sẽ chữa vấn đề.

### 2.3. Giọng giống catalog và thông báo thao tác

Lượt mới nhất vẫn có “tơ Hàn thêu… mềm, thoáng, bay tự nhiên”, chuỗi tính từ và “hệ thống bên em chưa tra được…”. Correction còn “em đã cập nhật lại số đo…”. Chủ đề và giọng này đã được owner phản hồi từ nhiều vòng trước.

Không tự chấm lỗi vì một từ “nếu”, dấu ngoặc, việc nhắc một số đo hoặc một câu xác nhận. Phải xem toàn lượt có dài hơn mức cần thiết, giải thích lại điều khách đã biết, hay chuyển gánh quyết định về khách không. Chính cách chọn ý khiến câu dài và máy móc; chỉ thay từ không giải quyết được.

### 2.4. Tool contract gây lỗi trước cả verifier

Hai ca mới discovery và height/weight truyền `fitPreference` bằng tiếng Việt. `gemini-inference.mjs` cho `value` là number/string/string-array chung; domain `CustomerProfileV1Schema` chỉ chấp nhận FITTED/REGULAR/RELAXED. Cả patch bị từ chối. Size tốn vòng sửa state rồi gọi `recommend_size` khi tools đã NONE.

Đây là mismatch xác nhận được từ code và trace. Chưa chạy size engine nên không kết luận lần này do thiếu chart. Trước đây đã sửa field số đo; việc value domain khác vẫn không được phản ánh trong tool cho thấy sửa theo đường ca đang lỗi chưa bao phủ cả hợp đồng state.

Nguồn: [tool declaration](../../apps/worker/evals/single-agent-commerce-read-only/gemini-inference.mjs), [profile contract](../../packages/contracts/src/v2/customer-size-cart.ts), [latest conversations](../../apps/worker/evals/single-agent-commerce-read-only/full-b123-connections-20261022/CONVERSATIONS.md).

### 2.5. “Không lấy được dữ liệu” tiếp tục bị hiểu thành “shop không có”

Các vòng trước có POS lỗi → suy shop chỉ bán cả set. Lần mới: không có ảnh đã bind màu be → nói shop không có riêng màu be, dù chọn ảnh chung thành công. Đây là cùng loại suy luận từ trạng thái truy xuất sang sự thật hàng hóa, xuất hiện ở một công cụ mới.

Cần phân biệt rõ trong kết quả tool: không có asset đúng yêu cầu, chưa biết thuộc tính, hay nguồn xác nhận không bán. Không thêm regex riêng cho màu be. Verifier đã FAIL draft gallery; schema chỉ trả loại vi phạm/ref, không có giải thích span nên việc xác định mệnh đề gây FAIL vẫn là chẩn đoán, không phải lời giải thích trực tiếp từ verifier.

### 2.6. Recovery giữ đúng authority nhưng trải nghiệm còn yếu

Ba opening nhận cùng “Phần này em chưa trả lời được, chị nhé.” ETA chuyển HUMAN im lặng; một B1 bị STALE cũng không có reply. Trả giá được code giảm 30k đúng, nhưng draft bị loại và khách chỉ nhận bảng tóm tắt giỏ, không thấy rõ lợi ích shop vừa hỗ trợ.

Không nên bỏ gate hay gửi một phần draft chưa verify. Cần tận dụng recovery/receipt hiện có đúng phạm vi và kiểm actual customer outcome. Một terminal tên SEND_ELIGIBLE vẫn có thể là code recovery sau verifier FAIL; NO_SEND lại có thể đã enqueue câu hỏi checkout. Chỉ đếm nhãn terminal sẽ đọc sai trải nghiệm.

## 3. Những điểm chưa ổn trong chính quá trình sửa và review

### 3.1. Đã nhiều lần ghi root cause nhưng cách sửa vẫn là nhắc lại mục tiêu

Tài liệu từ 18–19/10 đã cảnh báo việc thêm lại “ngắn, tự nhiên, chọn rõ” không cung cấp thông tin mới. Prompt hiện tại có những quy tắc đó; lỗi vẫn lặp. Giả thuyết “model chưa được yêu cầu bán hàng” không còn phù hợp: câu đầu prompt đã xác định nhân viên bán hàng thời trang, gỡ băn khoăn và giúp khách mua.

### 3.2. Prompt phình–rút nhưng chất lượng không đi cùng độ dài

Git blob owner prompt: `ae461e0d` 9.710 bytes; `ef3a1cfb` 10.044; `950d05b4` 13.538; `2470a79d` 14.170; hiện tại 13.762. Đây là byte, không phải token. Candidate thêm 5 ví dụ từng tăng 12.135→14.870 bytes; hai arm đều 4/6 dùng được. Candidate bỏ hướng dẫn capability không có trong B1 cũng không cải thiện trong mẫu đã chạy.

Độ dài là dấu hiệu bảo trì, chưa phải nguyên nhân nhân quả đã chứng minh. Không đề xuất một đợt cắt mạnh tiếp theo để lấy tỷ lệ rút gọn, cũng không thêm ví dụ đúng đáp án các ca quen thuộc.

Nguồn: [additive examples](../../apps/worker/evals/single-agent-commerce-read-only/advice-examples-additive-20261021/CHECKPOINT_B.md), [capability comparison](../../apps/worker/evals/single-agent-commerce-read-only/advice-capability-20261021/CHECKPOINT_B.md), [context comparison](../../apps/worker/evals/single-agent-commerce-read-only/context-comparison-20261020/CHECKPOINT_B.md).

### 3.3. Reviewer vẫn có chỗ thay chuẩn giữa các vòng

Ví dụ trực tiếp: `explicit-offer-focus` chấm NEEDS_EDIT câu trả 799k rồi thêm 499k/449k vì mở các cách mua không được hỏi. Campaign mới nhất chấm USABLE một câu cùng case còn liệt kê cả ba giá và hỏi khách mua bộ hay lẻ. Correction “đã cập nhật số đo” ở một full run được USABLE có polish, vòng mới thành NEEDS_EDIT.

Không khẳng định mọi đổi nhãn đều sai: owner đã có những thay đổi chấp nhận hợp lệ. Nhưng trong các cặp này báo cáo chưa chỉ rõ khác biệt mức độ nào làm vượt ngưỡng. Điểm USABLE/NEEDS_EDIT chưa đủ ổn định để dùng riêng làm thước đo tiến bộ hay dừng toàn chương trình.

Chưa chấm lại các câu đó trong review này. Đề nghị giữ điểm cũ và đối chiếu những cặp bất đồng dưới cùng quyết định owner hiện tại. Tách “dùng được nhưng nên gọn hơn” khỏi “không giúp quyết định”; không cần thêm mô hình chấm hoặc bộ điểm phức tạp.

### 3.4. Số lượt nhiều nhưng độ phủ nhu cầu bán hàng còn hẹp

Audit 22/10 cho thấy full32 là 24 B1 thuộc 8 nhóm và 8 lượt stateful; 15/24 B1 được cấp sản phẩm sẵn, stateful chủ yếu một áo với M→L/×2. Khách tự chọn size không kiểm được bot tư vấn size từ cao/nặng. Hỏi đúng mã không kiểm được tìm đồ từ nhu cầu. Quote giỏ không kiểm được trả giá; có IMAGE transport không kiểm được xin ảnh theo màu.

Đó là lý do có thể chạy rất nhiều vòng mà lỗi state enum và gallery vẫn lộ muộn. Full39 mới có 7 lượt cho phần mới nối; 28 slot candidate còn NOT_REGISTERED. Không được gọi là đã chạy hết mọi hành trình mới.

### 3.5. Khác biệt số điểm đang trộn thay đổi, nhiễu và vận hành

Ba full runs cùng implementation `950d05b4` có B1 23/24, 20/24, 20/24 USABLE. Vòng hai có 3 lỗi provider; vòng ba có 2 semantic fallback. Chênh lệch không chứng minh prompt bị sửa tệ hơn vì prompt không đổi. Live source, stochastic generation và review chủ quan cũng ảnh hưởng.

Các report thường đã ghi caveat này, nhưng hướng sửa sau mỗi run vẫn cần thực sự tuân theo: không sửa giọng vì 429, không nới verifier vì owner gọi tool sai, không gọi nguồn chưa đọc được là thiếu dữ liệu shop, không gọi lỗi từng được owner chấp nhận là regression mới chỉ bằng nhãn cũ.

## 4. Hướng nên giữ và hướng nên dừng

| Giữ, có cơ sở cụ thể | Không tiếp tục theo cách cũ |
|---|---|
| Code sở hữu quote, selection validation, receipt, private checkout, CAS/fence và final gate | Dùng prompt nhắc model tự làm đúng phần mà tool schema/source contract đang mô tả sai hoặc thiếu |
| Phân biệt lựa chọn mua với fit, thiếu nguồn với không bán, ACK với effect | Chấm theo từ khóa, thiếu một điều kiện policy, dấu ngoặc hoặc một câu nhắc số đo |
| Đọc actual reply cùng diễn biến và state; ghi cả mẫu lỗi | Lấy giảm fallback làm bằng chứng tư vấn tốt, hoặc lấy raw score khác chuẩn làm tiến bộ |
| Kiểm các hợp đồng hữu hạn bằng deterministic tests rồi đo hành vi bằng model | Chạy lặp provider để phát hiện lại lỗi schema có thể tái hiện trực tiếp |
| Handoff có commit và capture; chuẩn bị đúng capability cho owner | Cấm một bước bán hàng hợp lý chỉ vì chưa nối capability mà không giải quyết việc nối |
| Kiểm lời khuyên trên nhu cầu bán hàng mới ngoài những ca đã sửa | Tăng repetitions/ca gần trùng thay cho coverage ảnh, discovery, size và chuỗi mua thật |

## 5. Thứ tự xử lý tiếp theo đề xuất

1. **Sửa hợp đồng state tool:** value theo field, đặc biệt fitPreference; phản hồi lỗi cho biết field và miền giá trị hợp lệ. Kiểm cả các field cùng cơ chế, giữ atomicity/source validation, không đoán/normalize tiếng Việt bằng parser mới. Kiểm chuỗi state→size trong budget hiện có.
2. **Sửa nghĩa kết quả media và kiểm ETA source:** media missing không thành stock/color absence. Đối chiếu Cần Thơ với resolver miền Nam và source selection thực tế; ETA_DATA_MISSING_OR_EXPIRED chưa chỉ rõ producer nào sai. Không sửa fixture thành key nội bộ để qua test.
3. **Đóng khoảng trống chẩn đoán hiện có:** ở STALE, readback cần cho biết public field nào khác trong evidence hiện có, không thêm gate; giữ chặn khi world đổi. Không suy từ hash mismatch ra nguyên nhân cụ thể.
4. **Giữ một chuẩn review trước khi sửa tiếp giọng:** dùng vài cặp actual replies đang bị chấm khác nhau, ghi rõ mức dùng được/polish và lỗi quyết định thực chất. Giữ các quyết định owner về suy luận định tính, upsell và nhắc fact hữu ích.
5. **Đo riêng tư vấn sau khi input/capability đúng:** tập trung đổi hoàn cảnh, xử lý ngại kiểu dáng và chọn cách mua. So exact replies trên context tương đương; một thay đổi có giả thuyết cụ thể mỗi lần. Không mặc định thêm prompt sẽ chữa được. Nếu arm không hơn, giữ baseline và kết luận phép thử đó không có lợi, không thêm ngoại lệ mới ngay.
6. **Mở rộng đúng hành trình còn thiếu:** discovery→chọn mẫu→ảnh→size→giỏ→checkout, trả giá và hậu mãi. Dùng bộ ca tự nhiên đã duyệt; chỉ các lượt được đăng ký mới được gọi hoàn tất. Lỗi cũ kiểm lặp có mục đích, tránh tăng số lượt vô hạn.

Không đề xuất đổi kiến trúc, thêm role, loop sửa–verify, parser hoặc nới gate. Không có model run mới trong review này. Kết luận hiện tại: tiếp tục hoàn thiện theo thứ tự trên có cơ sở hơn một vòng sửa prompt chung rồi chạy full ngay.
