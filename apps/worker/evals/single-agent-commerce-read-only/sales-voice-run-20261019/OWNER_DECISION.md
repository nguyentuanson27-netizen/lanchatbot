# Owner decision — tạm chấp nhận bảy draft — 2026-10-19

Owner đã xem bảy lượt UNUSABLE/fallback của sales-voice-run-20261019 và quyết định:

> verify chặn quá tay, tạm chấp nhận các cách trở lời đó đi, fix nữa thì ko bao giờ xong, chấp nhận và ghi vào như 1 hạn chế còn tồn tại

## Quyết định áp dụng

**ACCEPTED_WITH_KNOWN_LIMITATIONS**, phạm vi là bảy draft đã trình owner, gồm:

| Lượt | Tình huống |
| --- | --- |
| stateful-2 / stateful-correction | Xác nhận sửa số đo và giữ size L khách chọn |
| b1-1 / b1-changed-occasion | Sân khấu, phối áo trong hoặc đổi Ngọc Trâm |
| b1-2 / b1-changed-occasion | Sân khấu, đổi Khánh Trang |
| b1-3 / b1-changed-occasion | Sân khấu, đổi Diệp An |
| advice-1 / b1-changed-occasion | Replay sân khấu, phối áo trong hoặc Ngọc Trâm |
| advice-2 / b1-changed-occasion | Replay sân khấu, Khánh Trang hoặc Thanh Vũ |
| advice-3 / b1-changed-occasion | Replay sân khấu, Diệp An hoặc phối áo trong |

Owner tạm chấp nhận các cách trả lời này cho mục tiêu tư vấn bán hàng. Không tiếp tục sửa prompt, thêm ví dụ hoặc chạy thêm vòng chỉ để bảy draft đó qua verifier. Chuyển bất đồng tư vấn/đặc tính và xác nhận lựa chọn/đánh giá fit ở các lượt này thành hạn chế còn tồn tại của verifier.

## Hạn chế được chấp nhận

Verifier hiện hành vẫn có thể chặn lời tư vấn owner chấp nhận, làm mất câu trả lời bán hàng và thay bằng static fallback. Calibration giữa lời khuyên thông thường, hàm ý công năng và cách xác nhận lựa chọn chưa khớp hoàn toàn với mức owner mong muốn. Chấp nhận hạn chế này để dừng vòng sửa lặp; không yêu cầu giải quyết trước khi xử lý các phần khác.

Đây là chấp nhận nội dung draft và tồn tại false-block theo đánh giá owner, không phải kết quả chạy lại. Runtime/verifier hiện chưa thay đổi nên vẫn có thể phát sinh fallback tương tự. Không thêm ngoại lệ theo caseId, không bypass runtime cho bảy câu hoặc đổi chúng thành facts sản phẩm đã xác minh.

## Cách đọc evidence sau quyết định

- Run source93db1d47, primary lock91d192be và raw evidence giữ nguyên. Bảy lượt thực tế vẫn là fallback; không đổi thành bảy câu đã gửi, không đổi29PASS/7FAIL thành36PASS.
- Primary UNUSABLE mô tả kết quả khách thực nhận lúc chạy. Nội dung bảy draft được owner chấp nhận sau khi xem; đọc quyết định này cùng [báo cáo](CHECKPOINT_B.md) và [bảy draft](FALLBACKS.md).
- Bảy draft này không còn là yêu cầu bắt buộc sửa để thoát STOP của báo cáo cũ. Không tự suy thành GO toàn bộ Phase B, kết quả A2 mới hoặc quyền deploy/live send.
- Các finding ngoài phạm vi này vẫn được theo dõi riêng: contract tìm mã, giới hạn context do acquisition, giọng catalog và lời do code formatter dựng. Không mở vòng fix/run mới từ tài liệu này.
