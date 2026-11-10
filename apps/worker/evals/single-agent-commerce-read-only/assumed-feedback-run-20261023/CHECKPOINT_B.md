# Phase B — giả định có feedback và fallback hữu ích hơn

**COMPLETE; chức năng gửi ảnh giả định đạt ở lượt xác nhận; B chưa GO.** User yêu cầu thêm giả định có ảnh và sửa fallback. [8 lượt ban đầu](initial/CONVERSATIONS.md), [2 lượt xác nhận](confirmation/CONVERSATIONS.md). Giữ Gemini 3.5 Flash Lite HIGH và verifier GPT-6.1 Sol HIGH, owner/verifier prompt không đổi. Không gửi khách thật, không thay nguồn shop.

## Kết quả

- Initial source `eea5ec72`: cùng bốn ca media × nguồn hiện tại/nguồn giả định, N1 mỗi điều kiện. Cả hai nhóm3 SEND_ELIGIBLE/1FALLBACK, tổng6/8eligible. Nguồn hiện tại không có feedback: actual fallback mới “Chị muốn xem ảnh tổng thể hay ảnh cận chi tiết của mẫu này ạ?” đã được capture.
- Nhóm giả định chọn được ảnh FEEDBACK nhưng verifier FAIL. Phát hiện projection không giữ cờ feedback, chỉ mang imageType MODEL và intent FEEDBACK; draft còn tự chèn Markdown với assetRef. Đây là hai vấn đề quan sát được, verdict chỉ có media ref nên không quy sole cause.
- Sửa thêm sau khi initial kết thúc: giữ explicit feedback flag từ source đến asset/tool result/trusted literal; mở rộng media fallback cho selected/viewed, không chỉ unavailable observation; tool description nêu code đính kèm ảnh, final chỉ viết lời nhắn, không Markdown/assetRef.
- Confirmation source `70d52342`: đăng ký riêng2ca detail + feedback bằng through-case hiện hữu, N1, cap8requests. **2/2 SEND_ELIGIBLE, cả hai giao đúng attachment qua capture.** Feedback: “Dạ, em gửi chị ảnh khách mặc set Thạch Thảo bên em ạ.” Không lặp sinh trong cùng attempt; không thay/loại kết quả initial, không dùng kết quả xác nhận để gọi initialPASS.

## Giả định được phép và giới hạn

`assumed-feedback.mjs` clone dữ liệu catalog rồi đặt feedback=true trên đúng một public asset đã APPROVED và metadataVerified. Các trường khác giữ nguyên; fail closed nếu asset không còn đủ điều kiện. Không publish registry, không sửa Qdrant/Redis/POS. Ảnh vốn là ảnh catalog, **chưa có bằng chứng khách thật mặc**. Attribution feedback chỉ đúng trong thế giới giả định của evaluation, không dùng để gửi khách thật hoặc tuyên bố shop có feedback. Registration lưu exact URL, assumption ID/meaning, file hash và sourceSHA; labels evaluator không vào model request. Model chỉ nhận dữ kiện của thế giới kiểm thử qua đường chuẩn.

## Fallback

Code-owned `C3_B_MEDIA_NEXT_STEP_V1`:

> Chị muốn xem ảnh tổng thể hay ảnh cận chi tiết của mẫu này ạ?

Chọn từ trạng thái media tool của lượt: có observation, selected hoặc viewed. Không phân loại câu bằng regex/model thứ ba. Câu không khẳng định ảnh tồn tại, đã gửi, đã lên đơn hay đã handoff; câu tiếp của khách phải được xử lý bằng tool/final gate bình thường. Exact text/ID được allowlist, protected additions bị từ chối. Generic V2 giữ cho lượt không có media operation. Scope media không phải fallback giải quyết mọi yêu cầu mua/đổi hàng; mixed-intent turn vẫn có thể cần outcome hữu ích hơn, chưa được campaign này kiểm. Chưa kiểm câu trả lời tiếp theo của khách sau câu hỏi fallback. Không mở recovery để gửi draft bị chặn.

## Review đủ10lượt

| Nhóm | Detail | Feedback | Back | Concern |
|---|---|---|---|---|
| Current-source initial | Gửi đúng cận, câu ngắn, dùng được | Fallback mới có hướng tiếp, chưa đáp đủ câu hỏi feedback | Gửi đúng mặt sau, dùng được | Gửi FRONT/BACK toàn bộ; nhưng lời dài, nhiều tính từ, mở cả bộ/áo lẻ. Cần sửa giọng/quyết định |
| Assumed-feedback initial | Gửi đúng cận, dùng được | Chọn đúng giả định nhưng draftFAIL; vẫn genericV2 do nhánh selected chưa chọn fallback media. Đã sửa sau run | Gửi mặt sau, dùng được | Không gọi media; khuyên áo lẻ rồi cả bộ, hỏi lại lựa chọn. Chưa cải thiện rõ |
| Assumed-feedback confirmation | Gửi đúng cận, lời ngắn | Gửi đúng ảnh giả định, reply ngắn, không MarkdownassetRef | NOT_RUN ở source mới | NOT_RUN ở source mới |

Nguồn có ảnh không tự chữa giọng/thuyết phục. N1 khác nguồn/clock và hai sourceSHAs không chứng minh causal improvement hoặc stability. Full39/B1/B2/B3 chưa chạy trong đợt này; B chưa GO.

## Accounting và verification

Initial8: 25requests (17owner/8verifier),0errors. Confirmation2: 6requests (4owner/2verifier),0errors. Tổng10outcomes, 31generations,0retry/providererror/timeout;3isolatedDBs đã drop. Không gộp hai source thành một frozen campaign. Exact args và configs: từng commands.json/REGISTRATION.json/registration.json. Runtime clean source/hash checks trước mỗi job; sourceSHA không ghi ngược vào frozen source.

Tokens: initial input141988/output10293; confirmation input32675/output2016. Cost không expose; output không cộng reasoning lần hai. Verifier latency nearest-rank: initial p507021ms/p959179ms; confirmation p505529ms/p956262ms. Không TTFT, N nhỏ. Captured request scan không có evaluator/assumption labels; raw metadata feedback là runtime fact của giả định.

Commands đã chạy:

- Media RED1/22 → focused media/read-only/ingress/boundary129PASS; boundary thêm exact fallback+recipient test54PASS.
- Node assumed-feedback + registration6PASS; protocol/gemini/delivery73PASS; stateful-provider syntaxPASS.
- Worker `build` gồm dependency builds, `lint`: PASS trước initial.
- Sau finding: media RED1/23 → focused media/read-only/ingress/boundary131PASS; Node gemini+assumed-feedback62PASS.
- `pnpm --filter @lana/worker exec tsc -p tsconfig.json` và `pnpm --filter @lana/worker lint`: PASS sau delta; dependencies không đổi, không lặp dependency build.
- Credential launcher/source-session: preflight + native4current, preflight + native4assumed, rồi source mới preflight + native2assumed: exit0. 0live sends;3DBdropped theo integration.json.
- collect.py ở mỗi source; exact raw outcomes/attachments retained; rendered transcript chỉ trim trailing whitespace.
- git diff checks trước source commits PASS; không claim full worker suite/remoteCI/deploy hoặc whole-Bqualification.

Recommendation: giữ fixes về feedback projection và fallback media. Dùng ảnh thật đã xác nhận feedback khi nguồn được bổ sung sau này; không promote nhãn giả định sang runtime shop. Giọng và quyết định mua vẫn là finding riêng.
