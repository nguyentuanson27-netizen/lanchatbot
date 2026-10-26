# Compact owner context — V2

Owner yêu cầu bỏ phần trình bày thừa sau khi V1 tăng19.7% owner input mà chưa cải thiện tổng thể. Base `a390eefa`. Chỉ candidate/evaluation, không đổi production entrypoint, nguồn shop, prompt/model/verifier/gates hoặc kết quả cũ.

Thêm opt-in `VI_DATA_BLOCKS_COMPACT_V2`; giữ V1/default nguyên để không đổi protocol/evidence lịch sử. Giữ thứ tự nhóm và completed trace trước history/latest như V1. Mỗi nhóm chỉ một nhãn và một dòng JSON compact, toàn first data message một text part. Bỏ path kiểm tra, số thứ tự từng record, fence JSON, indentation và nhãn lặp khỏi provider wire. Source paths chỉ nằm trong local reconstruction plan. Giữ mọi array/key/value/type, empty/null/false/zero, policy/source strings, openingQuote, history/role/latest nguyên vẹn. Không tóm tắt, suy diễn lợi ích hoặc thêm câu mẫu.

Observed RED: thiếu export compact; measurement preflight bắt lỗi truyền prompt như function trước provider, sửa và bổ sung test chuẩn bị đủ24counts. GREEN: independent original-field reconstruction, trace exact, injection/data boundaries, actual mocked HTTP body, no evaluator labels và oldV1/default regression.

Offline serialized request bytes trên8inputs: ORIGINAL198,910; V1 235,886; V2 200,389. Đây là bytes, không suy ra token hoặc sales quality từ tỷ lệ này.

Đo riêng input bằng `countTokens` đúng `gemini-3.5-flash-lite/global`, cùng project/credential route đã dùng;0generation requests, không verifier/tool/state/delivery. Chỉ24count calls (8cases×ORIGINAL/V1/V2), retry0; error giữ bằng chứng và dừng, không đổi model/endpoint hoặc giả kết quả. Source/config/input hash và toàn bộ24wire hashes freeze trên clean commit trước dispatch; output ngoài source. Không mở fullB hay rerun hội thoại. Count endpoint không thay thế usage thực tế từ generation; so ba variant qua cùng count API và ghi scope đó rõ ràng.

Official docs checked2026-10-26 before implementing count request: [REST countTokens](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/projects.locations.publishers.models/countTokens), [CountTokens guide](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/count-tokens). Request fields contents/systemInstruction/tools/generationConfig; toolConfig omitted from count body because it is generation control, not a documented count field. All system instructions/source contents retained. No API key or secret in logs.

Sau đo: report số liệu thực, source/command/errors và limitation; update tasks/PR. Chưa có evidence chất lượng hội thoại V2 hoặc quyền promote. Existing B NOT GO giữ nguyên.
