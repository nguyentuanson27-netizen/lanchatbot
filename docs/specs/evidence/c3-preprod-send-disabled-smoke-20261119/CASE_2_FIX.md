# PREPROD smoke ca 2 — fit sau thêm giỏ và checkout

**PASS kỹ thuật cho ca 2**, trên `4b61005650199a31400e0e91dc55c4568b84d4c7`, một hành trình đủ năm lượt với gửi ngoài tắt. Fixture nghiệp vụ chạy qua ingress, PostgreSQL cô lập và Outbox capture. [Root cause](CASE_2_ROOT_CAUSE.md) · [Lượt ba ca trước sửa](REPORT.md).

Code giữ `SIZE_FIT` không có variant theo `fitTarget` đã xác minh. Kiểm đúng sản phẩm, phần áo, revision hồ sơ, số đo và hạn bằng chứng vẫn áp dụng. Claim giá/tồn và claim có variant cụ thể tiếp tục kiểm đúng variant. Có receipt ghi giỏ trước khi owner được phép xác nhận.

Prompt cũ dặn owner “nói việc em làm”. Kết quả tool vừa trả việc ghi giỏ thành công, nên owner kể thao tác đó cho khách. Đã thay chỉ dẫn giọng tại chỗ để xác nhận lựa chọn của khách và bước tiếp theo, chỉ nhắc giỏ khi khách hỏi giỏ.

| Lượt | Quan sát |
| --- | --- |
| Tư vấn size | Engine chọn **M cho áo**. Draft qua verifier nhưng vẫn lặp số đo và nhắc L theo câu khách nói, với cụm “tham khảo thêm size này” dễ hiểu mơ hồ. Vấn đề diễn đạt trong P07 còn mở. |
| Khách lấy áo | Receipt thành công, verifier PASS, một tin vào Outbox test. Một áo navy M, giá áo 499.000đ. Webhook trùng không tạo thêm dòng giỏ, revision hoặc tin. |
| Khách muốn chốt | Tin hướng dẫn bổ sung thông tin checkout được ghi trong Outbox test. |
| Khách gửi thông tin | Code dựng `ORDER_PREVIEW`, tổng **529.000đ**, phí ship **30.000đ**. Dữ liệu riêng tư đi qua code intake. |
| Khách xác nhận | `PURCHASE_CONFIRMED` trên DB test rồi handoff theo quy trình. |

Tin thực tế ở lượt lấy áo:

> Dạ, em nhận áo sơ mi SM613 màu navy size M ạ. Tổng cộng là 529.000đ gồm 499.000đ tiền áo và 30.000đ phí ship, chị có muốn chốt đơn luôn không ạ?

Câu bỏ lời kể “thêm vào giỏ”. “Em nhận áo” và câu hỏi chốt vẫn hơi gượng. Kết quả là một mẫu, chưa đo độ ổn định giọng. Hai ca ADS và thiếu chart giữ kết quả PASS ở lượt trước, chỉ ca 2 được chạy lại trên commit này.

## Xác minh

- Đã quan sát RED ở composed regression khi mong chờ SEND_ELIGIBLE sau commit. Sau sửa, regression và tập xác minh 441 worker tests PASS, một test pinned-main C3 bị loại khỏi lượt chạy cuối sau hai timeout 60 giây. Các lượt chạy cùng compile, model và load cao cũng quan sát một số timeout 5 giây ở test import adapter. Fixture này dùng thời hạn 30 giây thuộc lệnh chạy cuối, không đổi cấu hình repo.
- 20 protocol Node tests, worker TypeScript emit compile, `node --check` smoke và kiểm diff qua.
- Một lượt model thực hiện đúng ca 2 gồm 6 owner và 2 verifier, 0 lỗi provider. DB đã dọn. 0 Meta/Pancake request ra ngoài. Trang test chưa bật.

```powershell
pnpm --filter @lana/worker exec vitest run --reporter=dot src/single-agent-commerce.test.ts -t 'keeps a measured fit'
node --test --test-reporter=dot apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
pnpm --filter @lana/worker exec tsc -p tsconfig.json
pnpm --filter @lana/worker exec vitest run --reporter=dot --maxWorkers=2 --testTimeout=30000 -t '^(?!.*runs pinned-main C3 builders)' src/single-agent-commerce.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-ingress.test.ts
$env:APPDATA=(Resolve-Path ../c3-verifier-replay-cli-01592).Path
python ../c3-current-cart-choice-launch-20261119.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs '../c3-preprod-fit-after-scope-fix-20261119083622235' COD --candidate-handoff --check-prefix 'PREPROD smoke ' --preprod-smoke-fit-only '../c3-preprod-send-disabled-smoke-20261119075537182/integration.json'
```
