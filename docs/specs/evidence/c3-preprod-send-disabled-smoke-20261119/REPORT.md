# PREPROD smoke — ba ca với gửi tin bên ngoài tắt

**Kết quả 2/3 PASS. Chưa bật candidate trên trang test.** Ba ca dùng ingress, stores, engine nghiệp vụ và Outbox thật trên PostgreSQL cô lập. Danh mục, khách, địa chỉ và transport là fixture. Owner thực tế Gemini 3.5 Flash Lite High, verifier GPT-6.1 Sol High. Cờ trang giả lập cho Outbox chạy vào transport chặn trong tiến trình, với recipient/token giả. External Meta và Pancake requests bằng 0.

| Ca | Kết quả | Quan sát |
| --- | --- | --- |
| **1. ADS hỏi giá + ảnh** | **PASS** | Báo đúng sơ mi SM613 **499.000đ**. Verifier PASS. Outbox nhận đúng một tin và một ảnh thuộc mẫu, sequence 0/1 cùng response group. |
| **2. Size → giỏ → checkout + webhook trùng** | **FAIL** | Engine chọn **M**, reply tư vấn M và vào Outbox test. Giỏ ghi đúng một áo M giá **499.000đ**. Phát lại cùng webhook không vào Inbox lần hai, không đổi giỏ, không thêm Outbox. Ngay lượt thêm giỏ candidate chuyển **HANDOFF / DEPENDENCY_FAILURE**. Hai lượt sau giữ `HUMAN_OWNS_CONVERSATION`, giỏ dừng ở `CART_OPEN`. Preview, tổng checkout và xác nhận chưa được thử thành công. |
| **3. Thiếu bảng size shop** | **PASS** | `SIZE_RULE_UNAVAILABLE`, một handoff event, quyền xử lý sang HUMAN, **0 tin và 0 ảnh**, Outbox trống. |

Ca 2 ở lần đầu đã nhận engine M và gửi M vào Outbox test, nhưng harness đọc sai cấu trúc mảng kết quả fit nên dừng trước giỏ. Đã sửa chỉ ở harness và chạy lại riêng ca 2. Câu tư vấn lần đầu đề xuất M rồi thêm “bình thường chị hay mặc L thì mình có thể tham khảo thêm”, còn mơ hồ. Lần chạy lại đề xuất M, nhắc L như thói quen của khách. P07 vẫn được theo dõi. Nhật ký lần chạy giữ mã handoff cấp lượt, chưa đủ để xác định nguồn cụ thể kích hoạt `DEPENDENCY_FAILURE` sau khi giỏ đã ghi.

## Accounting và lệnh thực chạy

- Preflight đầu dừng trước model do assertion nhầm giữa cờ outbound của trang giả lập và chế độ external send. DB cô lập đã dọn, 0 generation. Source `d024193b2cc5bed3c0630986973d7d36f5d36027`.
- Ba ca ở source `1038501cb63003b81da0b97c0b0dfb143874a10e` dùng 7 generation. Chạy lại riêng ca 2 sau khi sửa harness ở source `0db0afd14d34bbf348a2e297d6d02877f7d9f125` dùng 5. Tổng 12 HTTP generation gồm 9 owner và 3 verifier, 0 lỗi hoặc timeout provider. Tất cả DB cô lập đã dọn.

```powershell
$env:APPDATA=(Resolve-Path ../c3-verifier-replay-cli-01592).Path
python ../c3-current-cart-choice-launch-20261119.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs '../c3-preprod-send-disabled-smoke-20261119075537182' COD --candidate-handoff --check-prefix 'PREPROD smoke '
python ../c3-current-cart-choice-launch-20261119.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs '../c3-preprod-send-disabled-fit-continuation-20261119075846552' COD --candidate-handoff --check-prefix 'PREPROD smoke ' --preprod-smoke-fit-only '../c3-preprod-send-disabled-smoke-20261119075537182/integration.json'
```

Hai lần model đều giữ exit 1 của smoke suite do ca 2 chưa qua. Giữ kết quả 2 PASS theo từng ca. Không đổi cấu hình trang test hay deploy.
