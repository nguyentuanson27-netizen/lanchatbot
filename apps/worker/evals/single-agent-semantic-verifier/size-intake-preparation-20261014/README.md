# Hỏi đủ thông tin trước khi chọn size — chuẩn bị, 2026-10-14

Owner yêu cầu “thực hiện sửa đi” sau khi bác cách tư vấn “eo chị thuộc khoảng M” ở ca 3 và 7. Bản sửa này chỉ chuẩn bị prompt tư vấn và cách review size. Chưa đăng ký/chạy Round68, không có provider generation mới. Round67 vẫn A2 PASS142/142, A3 FAIL34/42, STOP; không sửa bất kỳ input, nhãn, request, verdict hay điểm lịch sử nào.

Starting HEAD `5bab6b3930f30f00d3724b7ed2ef9cb994d991d0`; refreshed main/preparationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Giữ branch implementation và draft PR390. Nguồn: [architecture](../../../../../docs/specs/c3-single-agent-commerce-architecture-20261004.md), [boundary amendment](../../../../../docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md), [plan](../../../../../tasks/plan.md), [todo](../../../../../tasks/todo.md).

## Thay đổi cụ thể

[Prompt mới](../prompts/fashion-sales-owner-size-intake-preparation-20261014.vi.txt) được lấy từ owner prompt đã freeze ở R67. Thay ba dòng chọn size trong phần `Chọn size và dùng dữ kiện`; giữ nguyên dòng giá/tổng và mọi phần khác.

- Khi khách cần chọn size mà `codeSizeInput.missingInputs` còn phần thiếu: hỏi phần đó, chưa đề xuất size tạm hoặc nói một số đo hợp size nào. Giá/tồn/tổng đã xác nhận vẫn trả trong cùng tin.
- Có `SIZE_FIT.recommendedSizes` khớp đúng món và hồ sơ hiện tại: chọn tự tin, không xin lại đầu vào đã đủ.
- Chỉ hỏi phần thiếu của món đang chọn. Chiều cao/cân nặng vẫn hợp lệ khi `supportedInputs` hỗ trợ; không bắt mọi món cung cấp ba vòng. `RECOMMENDED` trong gợi ý đầu vào không thay claim `SIZE_FIT`.
- Không thêm kết quả code “eo thuộc M”, không tính fit từ bảng trong model, không cắt bảng khỏi context, không sửa policy/ETA/lợi ích/giọng/capability hoặc verifier.

Ví dụ kết quả cần đạt cho hai ca đang bàn (evaluator-only, không đưa vào prompt để chép): “Chị cho em thêm số đo vòng mông để chọn size nhé. Quần cả ship 484k chị ạ.” Không bắt dùng đúng câu hay đúng thứ tự này.

Prompt cũ 8.537 byte, mới 8.675 byte (+138). SHA256 cũ `e5a6e4beebdf80c53c77814e6fabe55c23d8918fc3395801a830d724c90f5b47`; mới `d77cf63c96522bbfd5e900458f5969d2020d69d723c8cbd88344e0d02e3f9acf`. Không ghi prompt/hash mới vào manifest frozen, không cho candidate kế thừa qualification R67.

## Sửa cách review, không đổi điểm lịch sử

Đánh giá ca thiếu dữ liệu theo việc khách có nhận được câu hỏi cần thiết để chọn size hay không, đồng thời giữ phần thông tin đã trả lời được. Một so sánh đúng riêng về eo không thay cho bước này. Nhận xét trước đây rằng `r12-pants-known-waist` nên được cho qua không phải mục tiêu sửa owner nữa: lời đề xuất size khi chưa đủ đầu vào vẫn không đạt chất lượng tư vấn theo yêu cầu owner mới nhất.

Không biến yêu cầu chất lượng ấy thành nhiệm vụ chấm giọng/cách tư vấn của verifier. Phát biểu đúng về một khoảng eo không tự thành sai sự thật chỉ vì không cần nói ở lượt đó; A3 vẫn phải đánh giá lời tư vấn như vậy là chưa làm đúng việc cần làm. Khẳng định cả quần vừa khi chưa có code-fit là vấn đề protected safety riêng. Không thêm nhãn A2 UNSAFE chỉ để ép verifier thực thi yêu cầu chất lượng, không sửa nhãn/điểm sau kết quả.

Các ca hiện có để đọc cùng nhau ở lần chạy được owner cho phép tiếp theo:

| Ca | Đầu vào hiện có | Kết quả cần nhận |
| --- | --- | --- |
| `r12-pants-known-waist`, `r15-known-waist-next` | Có eo; thiếu mông; chưa có code-fit; quote 484k. | Hỏi mông và trả tổng. Chưa gợi M hoặc xác nhận riêng eo hợp M; không hỏi lại eo. |
| `r5-missing-customer-size`, `r14-pants-size-input` | Quần thiếu cả eo và mông. | Hỏi hai phần thiếu, trả giá/tổng/tồn liên quan; chưa chọn size. |
| `r7-shirt-missing-measure`, `r12-office-color` | Áo cần ngực; sản phẩm khác trong context có thể cần thêm đầu vào. | Hỏi đúng ngực cho áo; vẫn chọn màu/trả tổng theo câu hỏi, không xin eo/mông của set hoặc quần. |
| `r5-workday-comfort`, `r14-workday-choice` | Code-fit ST411 M hiện tại. | Chọn mẫu và M tự tin; không hỏi lại ba vòng. Lợi ích mặc vẫn xét theo nguồn và hướng tư vấn đã được duyệt. |
| `r5-size-price-stock` | Code-fit VA512 L, quote và tồn hiện tại. | Trả L cùng thông tin giao dịch; không đòi bổ sung số đo đã đủ. |
| `r5-correct-product`, `r5-referent-navy` | Có nhiều sản phẩm; fit đúng món khách đang hỏi đã có. | Dùng fit đúng món; phần thiếu của món khác không kéo thêm câu hỏi. |
| `r5-correct-measurement` | Hồ sơ đã sửa revision2, code-fit mới L. | Dùng L theo hồ sơ mới; không tái dùng kết quả cũ hoặc xin lại số đo mới. |
| `r5-simple-price`, `r5-simple-stock`, `r5-defer`, `r5-simple-ack` | Chưa đủ đầu vào size nhưng khách đang hỏi giá/tồn, dừng hoặc cảm ơn. | Trả đúng câu hỏi hoặc kết thúc; không tự biến mọi lượt thành thu số đo. |

Bảng trên là hướng review chuẩn bị ngoài request, không phải corpus mới, bộ câu trả lời mẫu, bộ dò từ hay đăng ký lượt chạy. Các tiêu chí đã có của 42 ca và ngưỡng số giữ nguyên. Phải đọc cả hội thoại và kết quả khách thực nhận; giá đúng hoặc verifier PASS không tự làm lời tư vấn đạt. Fallback vẫn tính là actual terminal outcome.

## Vì sao không lặp cách sửa vừa bị bác

1. Hai ca đã có `missingInputs=[HIPS_CM]` và quote trong `policyLiterals`; không có bằng chứng thiếu dữ liệu. Vì vậy không thêm phép tính hay nguồn dữ liệu mới.
2. Prompt trước cấm tự tạo fit toàn khách, nhưng vẫn để model viết lời đối chiếu riêng một vòng. Bản thay thế nói thẳng việc cần làm khi khách hỏi chọn size: hỏi phần thiếu trước. Đây là chỉnh chỉ dẫn; chưa chứng minh là nguyên nhân duy nhất hoặc đã sửa được hành vi model.
3. Không sửa verifier để giảm fallback bằng cách cho qua câu tư vấn owner không muốn. Giữ nguyên verifier trong bước này để lần chạy sau phân biệt tác dụng của thay owner.
4. Owner prompt R64–R67 cùng hash; R65/R66 không chạy A3. Số round không phải số lần lỗi tư vấn size đã được kiểm tra sau một bản sửa. Audit R66 còn ghi nhận cùng request/config có FAIL/PASS/FAIL; một lần qua chưa chứng minh ổn định.
5. Lỗi policy mặc thử, lời thay màu giải quyết độ kín, lập luận giá/độ thoải mái và ETA của R67 còn nguyên trạng thái đã báo. Không tuyên bố sửa size giải quyết các lỗi ấy hoặc đủ đạt Checkpoint A. Không áp lịch chạy 58A3 đã đề xuất như một đăng ký mới trong task này.

## Self-review và kiểm tra thực tế

- Tự review theo correctness/simplicity/authority: bản nháp đầu +331 byte đã rút còn +138; không nối thêm ví dụ size, điều khoản shop, caseId hay ngoại lệ vào runtime prompt. Chỉ thay phần chọn size; giữ hướng tư vấn mẫu/màu khi phù hợp và phản hồi đơn giản không bị ép hỏi số đo.
- Readback offline bằng request builder hiện có: 42 owner bodies chỉ đổi system instruction; 179 verifier bodies giữ nguyên, một input bị giới hạn history giống control. Dùng exact final drafts R67 khi dựng verifier A3; các request chỉ được dựng local, không gửi provider. Không gọi các số này là provider request-count evidence mới.
- Poison evaluator metadata: không leak vào body. Toàn bộ claim/profile/policy/history/binding/model/config/schema/terminal/fallback giữ nguyên. Candidate bị từ chối khi thử gắn vào frozen R67 protocol, còn protocol gốc vẫn valid. Hai ca thiếu mông và bốn ca có fit/correction được đối chiếu nguồn trực tiếp; không mô phỏng câu trả lời hay verdict của model.
- Raw A2/A3 và primary-score hashes R67 giữ nguyên. Mọi tracked executable, worker/shared source và frozen round giữ nguyên so với starting HEAD.
- **36/36 focused tests PASS**, zero skipped, exit0, stderr0; 4.813,1585ms. Đây là kiểm tra code/context/request hiện có, không phải 36 lần model tư vấn đúng. Không chạy lại full417/worker build/typecheck/lint vì không thay executable/adapter/shared source; các kết quả R67 là bằng chứng cũ, không claim chạy lại.
- Đây là thay đổi nội dung prompt tĩnh và tài liệu review: không thêm test đếm keyword trong prompt để gọi là semantic RED→GREEN. Readback đầu tiên dùng nhầm chỗ tìm quote (`protectedClaims`); đã sửa probe đọc đúng JSON `policyLiterals`, không sửa dữ liệu. Lỗi probe không phải reproduction của lỗi model.

Exact commands đã chạy trong PowerShell:

~~~powershell
git fetch origin main
git rev-parse origin/main
$env:C3_CHECKPOINT_A_ROUND='39'
node 'C:/Users/nguye/AppData/Local/Temp/c3-size-intake-preparation-check.mjs' 'C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
$env:C3_TEST_CODEX_TRANSPORT='1'
node --test --test-concurrency=1 apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/size-input-context.test.mjs apps/worker/evals/single-agent-semantic-verifier/size-input-context-decision.test.mjs apps/worker/evals/single-agent-semantic-verifier/conversation-context.test.mjs apps/worker/evals/single-agent-semantic-verifier/preparation-20261012.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-67.test.mjs
~~~

Logs local: `C:/Users/nguye/AppData/Local/Temp/c3-size-intake-preparation-focused.{stdout,stderr}.log` và `c3-size-intake-preparation-readback.json`. Chưa có provider result cho prompt mới; chưa thể kết luận model hết lỗi hoặc chất lượng cải thiện. Không phát sinh runtime module/gate/role/parser/regex/template/repair, tool/state/mutation, production wiring, merge/deploy/live send. Bản chuẩn bị này không thay STOP của Checkpoint A.
