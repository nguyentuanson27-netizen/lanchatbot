# Owner feedback sau run — 2026-10-20

Implementation base `678dab0b`. Đây là quyết định mới của owner, không thay raw, frozen rubric, PRIMARY_REVIEW/LOCK hoặc điểm lịch sử.

## Điều chỉnh cách hiểu finding lượt 10

Owner chấp nhận quy trình nhận thông tin lỗi → kiểm tra → làm thủ tục đổi/trả; sau đó phải có handoff để nhân viên tiếp tục. Không coi quy trình ấy là sai chỉ vì bot không tự thực hiện toàn bộ. Nhận xét trước “ngoài capability” cần giới hạn vào việc chưa có handoff thật trong phép đo, thay vì bác bỏ hướng xử lý bán hàng.

Run vừa rồi là final-reply replay với tools OFF. Nó không đo được request_handoff, commit quyền HUMAN hoặc tin báo giao khách từ handoff matrix. Vì thế chưa có bằng chứng luồng chuyển nhân viên của ca này thành công hay thất bại. Verifier PASS không chứng minh handoff. Không dùng nhận xét mới để tự đánh lại 8/8 hoặc bỏ yêu cầu kiểm chứng luồng thật.

## Hướng trả lời owner chốt

- Khi đủ căn cứ hỗ trợ đổi/trả: báo ngắn kết luận rồi đưa bước khách cần làm theo quy trình. Không kể lại “lỗi đường may thuộc lỗi sản xuất”, “nhận hôm qua trong hạn 5 ngày” hoặc các điều kiện đã đối chiếu chỉ để chứng minh đủ điều kiện.
- Chỉ nhắc điều kiện còn phải làm, phí liên quan hoặc điều khách hỏi. Cần phân biệt hành động chưa rõ vẫn hỏi đúng phần đó; việc đã bị policy loại trừ vẫn trả lời đúng giới hạn.
- Tiếp nhận báo lỗi và hướng dẫn cung cấp thông tin không phải shop đã xác minh nguyên nhân/duyệt xong hồ sơ. Nhân viên kiểm tra và làm thủ tục. Chuyển qua request_handoff khi capability có; không chỉ nói sẽ chuyển/lên đơn rồi kết thúc.
- Không yêu cầu verifier chặn câu ngắn vì không đọc lại điều kiện đã thỏa. Verifier giữ phạm vi xét nghĩa quyền lợi và effects, không chấm độ dài hoặc việc hoàn thành workflow tương lai.

## Thay đổi file và giới hạn

Chỉ sửa section Chính sách của owner + owner hash trong manifest. Các phần tư vấn/giọng, verifier, policy data, tool schema/runtime, corpus và lịch sử giữ nguyên. Không đưa câu mẫu/đáp án benchmark vào prompt. Handoff dùng cơ chế đã có, không tạo tool/gate/role/repair loop mới.

Đã đối chiếu implementation: createCommerceTools chỉ cấp request_handoff khi caller cấp port. createCommerceHandoffTools commit quyền HUMAN/event/tag theo scope và policy, rồi trả terminal code-owned. Sau handoff, runner dừng; actual customer text là holdingReply từ matrix/default, không phải model draft kèm câu hứa. Vì vậy prompt không tự thực hiện được chuỗi “gửi draft trước rồi chuyển”; nếu muốn kết luận/quy trình xuất hiện trong tin handoff, phải kiểm và dùng holdingReply nguồn hiện hành theo cơ chế sẵn có. Lượt này không sửa DB/matrix/default hoặc thay seam đó bằng model-authored handoff text.

Việc cần kiểm tiếp là **ca hiện có** qua composition với request_handoff bật và policy matrix thực: model chọn đúng reason, state chuyển HUMAN, receipt/readback đúng, actual holding reply có hướng dẫn phù hợp và không đọc lại điều kiện. Các test handoff deterministic hiện hữu chỉ bảo vệ cơ chế, không chứng minh model đã chọn đúng luồng hay giọng đã cải thiện.

Commands revision này:

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-read-only.test.ts
  37 PASS / 0 FAIL / 0 skip
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
  59 PASS / 0 FAIL / 0 skip
```

Self-review byte comparison: chỉ section Chính sách thay, verifier/corpus/locked primary nguyên byte; manifest chỉ owner hash. Owner 11.041→12.023 bytes (+982), SHA256 `a667558ecd3f87bddcf46b9020745af6554b23bcef046f296753a6aeeae95474`. Không dùng số byte hoặc tests làm bằng chứng hội thoại tự nhiên. Không chạy provider/typecheck/build/lint lại cho lượt chỉ sửa prompt/docs; A OWNER_BYPASS/B chưa live GO.
