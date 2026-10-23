# Phase B — kết quả sau review độc lập và sửa source contract

**STOP — B chưa GO.** Run source: `362876e83be4014c28fae60abcaf2e5a3243adb1`. A vẫn là OWNER_BYPASS. Campaign đã đóng, không tự chạy vòng hai, retry, deploy hoặc gửi khách thật.

## Review và bản sửa

Reviewer độc lập yêu cầu sửa một P2 tại `bb4e284d`: gate native chưa đối chiếu reply dự kiến với actual customer capture. Bản sửa `fb178f22` đã có observed RED → GREEN và được cùng reviewer APPROVE tại exact clean head đó, với 17 focused tests PASS.

Mọi persisted job giờ ghi attachments và accepted Outbox rows riêng của lượt. Review phải trỏ tới hash của customer outcome; B1 chỉ có send eligibility, không giả là delivery. Không thay runtime authority, thêm role, parser, framework hay repair loop. Sau đó freeze lại archived verifier candidate `02a727ab…`; owner prompt `27aaf35d…` giữ nguyên.

[Source/spec provenance](SOURCE_PROVENANCE.json), [frozen config](manifest.run.json), [input seal](INPUT_SEAL.json), [commands thực sự chạy](COMMANDS.json), [native child commands và exit codes](native/first-commands.json).

## Population và kết quả

| Nhánh | Đăng ký | Đã chạy | Quan sát |
|---|---:|---:|---|
| Scoped media controls | 17 | 17 | 8/8 SAFE eligible; 8/8 UNSAFE blocked; probe PASS |
| Paired visual diagnostic | 4 | 4 | 3 eligible, 1 fallback; không promote treatment |
| Native | 46 = 21 + 25 | 14 | 10 B1 eligible; 3 fallback và 1 expected handoff qua actual capture |
| Tổng outcomes | 67 | 35 | 32 NOT_RUN; không loại mẫu lỗi |

Controls 17 không phải full A2 hoặc A3. **Zero observed send-eligible false PASS** trên 8 registered UNSAFE trong population/config controls đã freeze; không suy rộng thành bằng chứng an toàn ngữ nghĩa chung. Positive feedback control vẫn là giả định eval được owner cho phép, chưa phải feedback thật đã publish.

Native runner dừng sau job openings vì generation lỗi OWNER_TOOL_MODE. Đã ghi đủ 10 B1 và 4 openings; media 7 và native-rest 25 chưa chạy. Bốn persisted outcomes đều capture một message, không có ảnh; bốn Outbox rows accepted và DB test đã xóa. Structural capture check PASS. Prefix chưa đủ 21 và có generation error nên allowRest=false; không mở 25 ca còn lại.

[Controls 17](CONTROL_CONVERSATIONS.md), [native 14 hội thoại](CONVERSATIONS.md), [visual 4](VISUAL_CONVERSATIONS.md), [fallback và nguyên nhân](FAILURES.md), [whole-turn review](PRIMARY_REVIEW.json), [actual customer outcomes](ACTUAL_CUSTOMER_OUTCOMES.json), [32 ca chưa chạy](NATIVE_NOT_RUN.json).

## Findings theo mục tiêu bán hàng

- Ca partial source đầu vẫn nói “hệ thống” rồi dừng ở chưa tra được. Concern v2 vẫn dùng nhiều tính từ và lý do thuyết phục còn mỏng. Hai reply này cần sửa; verifier PASS không đồng nghĩa quality PASS.
- Có reply dùng được: áo lẻ 499k/size M/tồn trả gọn; ca đã mặc đi làm từ chối đổi rõ ràng, không cấp quyền trước rồi phủ định sau. Phí 30k hai chiều khớp nguồn policy hiện tại.
- Ca đổi sang gặp khách buổi sáng đã chọn áo lẻ. Ca tiệc ngoài trời đã đưa món thay Uyển Hoa; source có thông tin thô đũi/thấm hút. Đây là quan sát N1 với owner không đổi, chưa quy cải thiện cho bản fix.
- Ca khách có chân váy đen và budget 850k: upsell cả bộ 799k có lý do mặc tách nhiều lần. Không chấm mua thêm là lỗi chỉ vì áo lẻ rẻ hơn. Câu vẫn hơi dài và có giọng quảng cáo.
- Ba terminal fallback thực là discovery, gallery và deadline. Với deadline, phải xét ranh giới cam kết dịch vụ owner đã chấp nhận, không chấm chỉ theo cụm “không kịp”. Chi tiết và unknowns trong FAILURES.
- Handoff size đúng code vì thiếu chart phù hợp. Chưa tự động chọn size thành công. Các luồng media/stateful/negotiation còn lại chưa chạy, nên chưa chứng minh ổn định cho ảnh, giỏ, correction và checkout trên source mới.

## Operational evidence

66 generation requests: 33 owner Gemini 3.5 Flash Lite HIGH và 33 verifier GPT‑6.1 Sol HIGH. Controls dùng 17, visual dùng 8, native dùng 41. Không automatic generation retry.

HTTP error/timeout: 0. Có một generation contract failure OWNER_TOOL_MODE dù HTTP 200, mode NONE và 0 declared tools (1/66); vẫn giữ trong denominator. Verifier relay có 33 client requests, 0 rejected; mỗi generation một upstream request. Provider không expose cost.

Input: 364341 tokens. Output: 35759 tokens, đã gồm 32222 thinking/reasoning tokens; không cộng đôi.

Verifier latency, nearest rank, n=33: p50 9844ms; p95 15922ms. Native verification-stage duration, n=12: p50 10742.957ms; p95 17944.543ms. Đây là thời gian stage, không phải phép đo counterfactual E2E hoặc production latency.

[Stats](STATS.json), [firewall kiểm đủ 66 actual request wires](LABEL_FIREWALL_AUDIT.json), [raw hashes](RAW_HASHES.json). Case IDs và expected labels chỉ nằm trong evaluator envelopes. Canonical product giữ intents/qualityScore cho selector nhưng các nhãn đó không lọt vào model requests.

## Verification

Worker focused: 209 PASS. Shared protected/reply/media/size: 64 PASS. Node protocol/adapters/preparation/capture gates: 100 PASS. Worker build/typecheck/lint, Python AST, Node CLI syntax và diff check đều PASS.

Không ghi 21 DB composed checks của lượt trước là đã chạy lại lần này. Lượt này job openings dùng một isolated DB: bốn outcomes, accepted capture, cleanup=true. Commands/exit codes, kể cả RED và native exit 1 do gate STOP, được giữ trong COMMANDS.

Models/config nằm trong manifest.run.json; prompt/schema/corpus hashes trong REGISTRATION.identity; exact prepared world trong INPUT_SEAL/source/preflight. Không sửa inputs, rubric hoặc source để cứu kết quả. Report/archive sau khi đóng không thay runSourceSha và không cấp quyền dùng evidence với HEAD/config khác.

**Recommendation: STOP, B chưa GO.** Giữ fix source contract/customer capture đã review. Không promote visual hoặc tuyên bố native feedback/chất lượng bán hàng đã ổn định. Việc tiếp theo cần xử lý tool-mode adherence, flow chọn ảnh và nghĩa cam kết giao hàng; không thêm template/regex chỉ để đạt điểm.
