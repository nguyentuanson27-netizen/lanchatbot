# J4 preparation — nguyên nhân và hướng sửa

Ngày 19/11/2026. Chẩn đoán sau run, không sửa code/prompt, không generation hoặc source write. Head chẩn đoán `363bb2bd`; worker source/protocol giống source run `48a27a1b`. Bằng chứng mới bổ sung cho phần nguyên nhân còn chưa rõ trong REPORT, không thay đổi kết quả 30 lượt đã chạy.

## Nguyên nhân tái hiện được

**Preparation từ chối vì request verifier dự phòng vượt 65.536 byte sau khi thêm bằng chứng lựa chọn màu.** Không phải owner vượt 70.000 byte, verifier phán sai hoặc dữ liệu shop thiếu.

Đường xảy ra:

1. `single-agent-commerce.ts::prepare` gọi `readTools.prepare` trước. Optional numeric preparation đọc cả ba phần bán AO/CV/SET_VAY của sản phẩm, tạo sáu claims giá/tồn. Context này còn vừa admission.
2. `preparePendingSelections` đọc lại lựa chọn AO size M đang thiếu màu từ pendingPurchase. Dùng đúng mode `CANDIDATE_TUPLES` như `bindCommerceFacts`; kết quả COLOR_REQUIRED cùng selection evidence hợp lệ.
3. Context có thêm selection evidence được đưa qua `admitPreparedCommerceContext`. Owner build thành công, hardPrecheck trả null. Nhưng verifier build trả **VERIFIER_INPUT_BOUND**.
4. Callback admission bắt exception và chỉ trả false. `preparePendingSelections` đổi thành PREPARATION_ADMISSION; catch ngoài cùng đổi thành PREPARATION_UNAVAILABLE; recovery thành silent handoff DEPENDENCY_FAILURE. Reason cuối che mất lỗi serializer/budget thật.

Verifier admission không dùng câu trả lời đã sinh, vì đang trước owner. Nó dành chỗ cho draft tối đa 4.096 byte bằng 4.096 ký tự U+0001. Do hai lớp JSON, riêng draft này chiếm 28.672 byte khi serialize, hơn draft ASCII 4.096 byte **24.576 byte**. Đây là kiểm dự phòng bảo đảm contract, không phải độ dài câu khách sẽ thực nhận. Không nên thay bằng câu giả ngắn để làm gate qua.

### Đối chứng trên năm bộ dữ liệu đã capture

Số dưới là **component reconstruction offline**, không phải kích thước exact prepared frame native đã bị bỏ capture. Dùng world frozen, dialogue đã nhận, clock và pendingPurchase từ trace; một số field sales identity/pending dựng tương đương vì full encrypted state không được export. Không thực hiện effect. Các biến thể dùng cùng serializer/bound thật.

| Lần J4 | Verifier dự phòng, all offers + pending | Vượt trần | Cùng context, prompt verifier cũ | Chỉ đọc AO + pending, prompt mới |
| --- | ---: | ---: | ---: | ---: |
| 1 | 65.743 | 207 | 64.958 | 64.578 |
| 2 | 65.729 | 193 | 64.944 | 64.564 |
| 3 | 65.710 | 174 | 64.925 | 64.545 |
| 4 | 65.733 | 197 | 64.948 | 64.566 |
| 5 | 65.830 | 294 | 65.045 | 64.663 |

Cả năm: hardPrecheck null; current admission false; đổi riêng về prompt cũ admission true. Đo wire mới so với cũ tăng **785 byte** do sửa verifier. Một reply ngắn minh họa trên context đó chỉ tạo verifier wire khoảng 37 KB, nhưng admission phải dành chỗ theo contract tối đa nên vẫn từ chối trước generation.

[Số đo và giới hạn](root-cause/SUMMARY.json) · [Probe gốc](root-cause/ADMISSION_PROBE.json) · [Probe AO](root-cause/TARGETED_AO_PROBE.json). Các probe đo size bằng bản dựng cùng shape serializer; với request dưới bound kiểm đối chiếu byte bằng nhau với builder thật. Callback admission thật xác nhận kết quả true/false. Chưa có exact native replay với full store đã dọn, nên không gọi đây là capture lại exception gốc. Dữ liệu native khớp cùng giai đoạn hai source read thành công rồi handoff trước model.

## Vì sao bản sửa và review trước chưa bắt được

- Tăng prompt verifier là tác nhân đẩy một đường vốn sát trần qua giới hạn. Không có thay đổi semantic output ở lượt lỗi vì model chưa được gọi.
- Preparation kiểm optional numeric data trước, rồi mới thêm pending selection bắt buộc; hai phần cùng tiêu một ngân sách nhưng chưa có quyết định admission cuối với ưu tiên dữ liệu rõ ràng. Optional read chiếm chỗ của bước tiếp tục mua đã biết.
- Capacity probe trước run chỉ đo owner wire trên 60 request đã sinh ở run cũ. Không đo verifier worst-draft trên context preparation hoàn chỉnh. Bộ test fixture nhỏ và hai wire probe cũng không bao phủ tổ hợp all offers + pending AO + history + verifier prompt hiện hành.
- Exception bị gộp làm dấu hiệu giống thiếu dependency. Probe thành phần đầu dùng legacy selector thay vì CANDIDATE_TUPLES nên chưa thêm cùng evidence; kết quả PASS cũ không loại trừ lỗi native. Probe mới sửa mode theo đúng source runtime, không sửa code chạy thật.

## Phương án sửa ở code/context

### 1. Chuẩn bị theo lựa chọn mua đã được code giữ

Với pendingPurchase còn hạn, bound đúng product và offer được nguồn xác nhận, ưu tiên chuẩn bị giá/tồn của các offer trong pending (J4 là AO), cùng selection evidence cần tiếp tục mua. Không mặc định preload giá/tồn mọi phần bán khi đã có target này.

Đây là chọn read scope từ state có cấu trúc, không đọc/regex câu khách. Giữ metadata danh sách offer và catalog độc lập; khách đổi sang set hoặc hỏi món khác vẫn có các tool đọc bình thường. Nhiều pending lines thì giữ đủ các target được xác nhận, không tự chọn một dòng. Không tạo pending từ quote quantity, không gộp mẫu theo tên. Unknown/expired/unbound pending không được làm căn cứ thu hẹp sai phạm vi.

Probe AO trên cùng source đã đưa cả năm request dự phòng xuống dưới trần mà giữ prompt/gate/bounds. Đây chỉ chứng minh hướng đọc có ích; implementation cần giữ cùng một immutable POS observation, charge đúng primitive, không thêm một tool call ngầm để đọc AO rồi lại đọc toàn bộ.

### 2. Kiểm admission trên context sau tất cả preparation

Tính phần bắt buộc (bound subject, policy, pending target/selection) và phần numeric prefetch tùy chọn trong một kế hoạch preparation. Chỉ công bố tập facts sau khi toàn bộ tập dự kiến qua hard precheck và cả owner/verifier serializers với draft reserve hiện hành.

Nếu phần tùy chọn không vừa, không công bố phần đó; giữ catalog/metadata và evidence bắt buộc còn hợp lệ, để owner dùng tool hiện có đọc đúng phần cần. Không xóa facts đã được nhận trước đó hoặc thay kết quả tool lịch sử. Nếu chính phần bắt buộc không vừa thì fail-closed với reason đúng; không bypass verifier, bỏ freshness/receipt hay tăng budget để cứu riêng J4.

Không chỉ đảo thứ tự hai lệnh rồi để lần admission cuối tiếp tục ném exception toàn lượt. Cần staged publication/rollback của **phần tùy chọn**, kiểm đúng context cuối và giữ nguyên state/effect.

### 3. Giữ lý do lỗi đủ để chẩn đoán

Admission ghi role, stage, enum reason, measuredBytes và limit; không log raw prompt/context/PII. Giữ boolean adapter tương thích nếu cần, nhưng diagnostic phải phân biệt VERIFIER_INPUT_BOUND, OWNER bound, hard-precheck failure, source error và chuẩn bị quá budget. Handoff vẫn im lặng theo policy; không gọi lỗi wire là nguồn shop không có dữ liệu trong report.

### 4. Kiểm trước khi tốn quota

- RED bằng tổ hợp all-offer + pending size/màu + actual serializers + prompt mới; quan sát false do verifier bound. Positive/negative ở đúng ranh giới byte, giữ worst-case draft reserve.
- Cả năm input J4 phải chuẩn bị xong với target AO, giữ giá/tồn/selection binding và policy; không cần gọi model để kiểm điều này.
- Control hai áo từ lượt đầu chưa có pending phải giữ đường hiện hành; lúc chọn trắng/đã có giỏ giữ đúng qty2, một activation, 948.100đ và receipt. Không làm lệch request/source hash của evidence.
- Có nhiều offer/pending lines, khách chuyển phần mua, pending hết hạn, source thiếu/đổi, policy đổi, receipt/permission đổi đều phải giữ contract cũ.
- Test xác nhận optional prefetch không được đẩy mandatory preparation thành handoff, và failure reason thực sự được giữ. Đo **cả hai role** trên prepared context hoàn chỉnh, không chỉ các request đã dispatch.
- Build/typecheck/lint, focused consumer/wire/boundary tests; review code trước run identity mới. Chạy model chỉ sau yêu cầu run, không rerun evidence cũ hoặc dùng probe làm điểm hội thoại.

## Lệnh chẩn đoán thực chạy

```powershell
$modelRunPath = Get-Content ../c3-current-cart-choice-active-20261119.txt
node "$modelRunPath/diagnose-admission.mjs" "$modelRunPath"
node "$modelRunPath/diagnose-targeted-ao.mjs" "$modelRunPath"
git diff 48a27a1b -- apps/worker/src apps/worker/evals/single-agent-commerce-read-only
```

Hai probe exit 0; assertions hậu xử lý xác nhận 5/5 false hiện tại, 5/5 true khi chỉ đổi prompt cũ, 5/5 true với AO + pending và prompt mới. Diff executable/protocol rỗng. Chưa triển khai phương án hoặc chạy provider; Phase C vẫn STOP.
