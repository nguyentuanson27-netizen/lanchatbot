# Review độc lập — kế hoạch media/size context

Planning base `b6099923747474a0ee2f71af6966b35113253e45`. Reviewer: `/root/media_size_plan_review`, độc lập với primary soạn kế hoạch. Scope là kế hoạch, không implementation/model acceptance. Reviewer chỉ đọc source/evidence, không chạy provider, truy cập credential hoặc ghi nguồn.

## Revision 1 — REVISE

Plan SHA256 `90bbc5715032ab9acf0884d7613a4cff36af65c9ad7b908d5aca0bf228e8ecc6`.

| Finding | Risk | Sửa trong revision 2 |
| --- | --- | --- |
| P2: Size đã có đủ facts trong exact final owner wire | Thêm lại thông tin không chứng minh sửa root cause, dễ phình context | Sửa chẩn đoán: M/alternatives=[]/RELAXED đã tới owner. Chỉ co-locate thêm hai field vào tool response hiện có; không third size block hoặc raw profile IDs. Giữ baseline wire và tách deterministic/provider acceptance. |
| P1: Binding màu hỏng có thể rơi về single-color fallback | Sai hash/partial bị xóa thành unknown rồi được cấp quyền màu | ABSENT/VALID/INVALID xuyên producer/adapter/validator. Chỉ ABSENT được fallback cũ; invalid/conflicting binding không fallback. Thêm tests hash/partial/legacy. |
| P2: Hint chưa có lifecycle và byte omission rõ | Snapshot cũ được làm mới thời gian; hint đẩy vượt bound làm mất quote | Observation từ source read bất biến, TTL theo earliest transition, clear khi lỗi/expiry/binding/permission đổi. 1.024B/product,4.096B/field; omit nguyên hint gần bound, không truncate thành negative hoặc bỏ base facts. |
| P2: Thiếu producer/consumer/instruction surface và nguồn IMAGE_ID | Field rơi ở strict validator/hash, tool description thúc lookup cũ, audit capture bị coi là live proof | Chỉ rõ search.ts, tests hash/validator/ingress/session/persistence; sửa cả select/view descriptions. Capture chỉ asset/hash; source IMAGE_ID còn NOT_YET_RESOLVED nếu chưa đọc registry. |

Reviewer đã xác nhận exact final request của sales-size-advice có SIZE_FIT M, alternatives rỗng và state RELAXED. Đây là điểm sửa chẩn đoán, không được gọi là thiếu context đơn thuần.

## Revision 2 — APPROVE, không còn blocker

Plan SHA256 `2cb2803f96e65511cee7daf0b9471fc957eceef875a991826c115ce9fe18e4ba`. Cùng reviewer đã kiểm lại đủ bốn finding và APPROVE exact revision/hash này. Reviewer xác nhận: size đã sửa đúng hypothesis và giới hạn thay đổi; binding màu giữ ABSENT/VALID/INVALID; hint có lifecycle/byte omission và không cấp quyền; producer/consumer/instruction/validator/regression coverage đã khép. Không còn blocker ở phạm vi kế hoạch. Không có provider/tests/credential/source writes từ reviewer.

Các kiểm tra tài liệu đã làm: relative links và các tên focused test hiện hữu đều tồn tại; git diff --check PASS. Không chạy runtime tests hoặc provider vì task chỉ plan/review. Không claim các commands runtime dự kiến đã PASS. Relative links/focused test paths và git diff --check được kiểm lại sau sửa; không có runtime tests/provider trong task này.

## Trạng thái cuối

**APPROVE cho kế hoạch candidate, chưa implementation.** Giữ nguyên bytes plan revision2 để hash đã review không đổi. Chữ REVIEW_PENDING trong snapshot plan mô tả thời điểm gửi review, không phải trạng thái hiện tại; decision hiện hành là APPROVE tại review trail này và tasks/plan.md.

Không coi APPROVE là đã sửa runtime, metadata thật, model quality hoặc B GO. User có thể dùng plan này cho task triển khai riêng; các source writes/publishing/live send/deploy vẫn ngoài scope hiện tại. Không có runtime/test/provider command nào được dùng để xin approval kế hoạch.
