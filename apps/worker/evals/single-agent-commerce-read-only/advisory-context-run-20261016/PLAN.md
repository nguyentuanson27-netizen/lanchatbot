# Sửa và chạy một lượt Phase B

Owner yêu cầu sửa rồi chạy lại sau finding của đủ 24 B1 và 7 lượt stateful. Intake `995b1d4a59cff4577356e3fa602aaca41ee8d888`; đã refresh main, implementationBaseSha vẫn là `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.

## Rủi ro đang sửa

1. Verifier đã nhận đúng prompt/context nhưng vẫn chặn lời tư vấn cảm giác đã được owner cho phép. Thay phần phân biệt tư vấn với thuộc tính/cam kết bằng tiêu chí cụ thể về điều khách được dẫn tới tin. Độ thoáng/dễ chịu dự kiến, cảnh báo và gợi lớp mặc thông thường không cần phép thử mới; thuộc tính tự tạo, kết quả đo, độ kín chắc chắn, fit, tiền, quyền và receipt vẫn cần căn cứ tương ứng. Không whitelist câu hoặc quyết định verdict bằng code.
2. Phần policy đang để hai chỉ dẫn cạnh tranh: không bắt checklist nhưng lại coi một tóm tắt điều kiện là xét đủ quyền. Làm rõ xét thời hạn/phí trong toàn cuộc trò chuyện; chỉ quy bỏ điều kiện thành mở quyền khi reply thực sự bỏ giới hạn, cho phép hành vi bị cấm hoặc duyệt tình trạng trái/chưa đủ căn cứ. Không tự giả định khách đã giặt, làm bẩn hoặc mặc thử.
3. Owner tìm món khác sau khi đã đọc đúng thành phần của mẫu đang bind, dù POS thiếu không thể được khôi phục bằng tìm kiếm. Làm rõ referent thành phần và cách sử dụng phần dữ liệu đã có. Không tăng tool budget, retry, thêm router hoặc ép tool bằng parser.
4. Owner dùng catalog để viết một đoạn quảng cáo thay cho giúp quyết định. Sửa tại chỗ chỉ dẫn giọng và chọn phương án: giải quyết điều đang hỏi, nêu đánh đổi thực dụng, giữ quyết định nhất quán, không quay lại quảng cáo mọi lựa chọn. Không ép đáp án, số câu hay CTA cố định.
5. Đọc lại nguồn ETA để phân biệt prep/transit với ánh xạ địa chỉ. Chỉ sửa nếu nguồn hiện có đủ thẩm quyền. Không đoán map, điền ETA hoặc chuyển checkout thiếu nguồn thành thành công. Nếu mapping vẫn thiếu, ghi rõ dependency còn BLOCKED trong lần chạy mới.

## Thực hiện và kiểm chứng

- Dùng debugging và TDD cho thay đổi code nếu có; không viết test chứa keyword để giả chứng minh model hiểu nghĩa hoặc nói tự nhiên. Prompt-only được kiểm bằng protocol/adapter/firewall hiện có và kết quả provider mới.
- Self-review diff, hash/config, quyền/receipt/fit/policy và hồi quy; chạy focused protocol/provider/runtime/protected-reply, worker typecheck/build/lint. Không sửa historical evidence, shared package hay production entrypoint.
- Freeze exact prompt/config/schema/corpus/native-tool/source identity; commit rồi require clean source trước preflight. Thu một lần toàn bộ 24 B1 + 7 stateful, cùng population, model, effort và budget hiện tại. Không six-first stop, retry, bỏ lượt lỗi hoặc thêm vòng sau kết quả.
- Lưu raw trước primary; chấm cả actual terminal outcome và hành trình rồi mới đọc rejected draft. Báo đầy đủ denominator/request/error/token/latency/fallback cùng giới hạn N1 và review chủ quan. Update tasks/PR391 và dừng, không merge/deploy/live action hoặc Phase C.

Đây là sửa contract hướng dẫn, không phải kết luận model sẽ tuân thủ. Kết quả cũ giữ nguyên; A vẫn OWNER_BYPASS, sales/live chưa được chấp nhận.
