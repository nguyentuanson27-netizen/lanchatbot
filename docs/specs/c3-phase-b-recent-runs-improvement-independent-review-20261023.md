# Independent review — phương án cải thiện sau các vòng gần đây

**REVISE — ba P2 required, một P3 tùy chọn.** Reviewer `/root/review_recent_runs_improvement`, context độc lập, HEAD `62a6bd9befebd290b029f6532e25615414c061a6`. Parent ghi lại kết luận reviewer. Read-only, đã đối chiếu proposal, reports/transcripts được dẫn chiếu và source egress/size/handoff/media/advice runner. Không sửa plan/runtime, không gọi provider. Lượt khởi động đầu lỗi model capacity; cùng reviewer thử lại và hoàn tất, không thay model hoặc tạo reviewer thứ hai.

Proposal: [c3-phase-b-recent-runs-improvement-proposal-20261023.md](c3-phase-b-recent-runs-improvement-proposal-20261023.md).

## P2 required — size/fallback còn thiếu quyết định thực thi

Proposal dòng33–35 mới yêu cầu chốt hành vi. Transport OK có thể chứa NO_VERIFIED_CHART/action HANDOFF; khi kết quả xuất hiện sau round tool thứ hai, owner không còn round gọi request_handoff. Chỉ đổi status/instruction có thể lặp lỗi.

Trước implementation phải lập bảng terminal RECOMMENDED / NEEDS_INPUT / NO_VERIFIED_CHART, kèm còn/hết budget, handoff được phép/bị từ chối/commit chưa rõ. Chọn điểm nối executor hiện hữu, business action không tự cấp quyền effect. Deterministic tests cần đúng trace ảnh+state+size hết round, receipt readback và fallback không hỏi lại ảnh đã chọn. Nếu chỉ giữ static/no-send thì mixed-intent vẫn mở, không được tính đã giải quyết.

## P2 required — visual diagnostic chưa có runner/projection cụ thể

Proposal dòng49–54: advice-diagnostic hiện không truyền catalogImages; thêm ảnh vào capture chưa làm pixel tới Gemini. Image comparison hiện hữu khóa sáu ca/12outcomes, preload/native khác captured-world bốn outcomes.

Chỉ định đường replay bốn outcomes; reuse preparation pipeline nhưng phải truyền catalogImages cùng vision literal hợp lệ. Preflight kiểm inlineData, exact bytes hash/binding, baseline không có ảnh, diff chỉ là bundle và metadata cần thiết. Verifier nhận projection evidence hiện hữu, không retrieval/vision role riêng. Prerequisite lỗi thì BLOCKED trước generation, không ép native view.

## P2 required — feedback controls chưa giữ regression cũ

Proposal dòng44–45 cho phép chỉnh controls/clause nhưng chưa yêu cầu giữ controls đã PASS. Nguy cơ chữa lời hiện tại và mất ranh giới cũ.

Giữ controls cũ; thêm số lượng cố định đối chứng lời shop thông thường: scoped no-match, source error, query giới hạn màu/component, feedback thật/ảnh mẫu, lời dẫn ảnh lệch component. Freeze attempts/budget trước chạy. Chạy controls và focused boundary/projection regressions tại source mới; unsafe lọt thì dừng. Positive feedback giả định báo riêng, không thay bằng chứng nguồn thật.

## P3 tùy chọn — đừng dùng độ dài làm tiêu chí bác treatment

Proposal dòng58: N1 dài hơn nhưng hữu ích hơn vẫn có thể tốt. Quyết định theo toàn lượt usefulness/safety, không độ dài đơn lẻ; không kết luận stability/năng lực model từ N1.

## Phần giữ nguyên

Chẩn đoán egress trước sửa gate; changed/expired-source fail-closed; không salvage draft FAIL; giữ owner baseline; không regex/template/role mới; diagnostic tách full B và không nhận GO từ media hoặc candidate handoff chưa published. Hướng này tránh vòng lặp tốt hơn chỉ thêm chỉ dẫn giọng văn.

Chưa sửa proposal theo review trong lượt này; reviewer chưa APPROVE bản sửa tiếp theo.
