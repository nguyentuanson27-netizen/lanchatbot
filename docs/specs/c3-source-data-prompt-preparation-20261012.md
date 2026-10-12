# C3 — tách dữ liệu nguồn khỏi prompt, chuẩn bị sau Round52

**Phạm vi:** bản chuẩn bị chưa kích hoạt, owner yêu cầu sửa kỹ và giữ kết quả các vòng trước. Không đăng ký Round53, không chạy provider, không nối nguồn thật hoặc làm post-A. Round52 vẫn STOP.

`preparationBaseSha = 4235f7d18cac0763b965e08b7a7522de8d98d8d5`. Đã refresh `origin/main`; `implementationBaseSha = 296cdcfbf5759f5bf9cbb24acf3dc63005589361`.

Áp dụng [parent spec](c3-single-agent-commerce-architecture-20261004.md), [boundary amendment](c3-semantic-verifier-boundary-amendment-20261005.md), [plan](../../tasks/plan.md) và [R52 findings](../../apps/worker/evals/single-agent-semantic-verifier/round-52/FINDINGS.md). Các điều khoản 7 ngày/thử trong nhà trong tài liệu và kết quả cũ là hợp đồng của population lịch sử; không phải policy được chọn cho lần chạy tương lai.

## Nguồn policy tìm được trong repo

| Nguồn | Điều đã xác nhận trong repo | Giới hạn sử dụng |
| --- | --- | --- |
| `docs/current/PRODUCTION_BASELINE_20260722.md`, mục Customer care policy r10.1 | `shop-policy-customer-care-v2`, version ID `24400b36-6d12-4e3c-b0ca-cf41014ed0d8`; chỉ được ướm, không mặc thử | Baseline lịch sử, không phải đọc lại pointer live hiện tại |
| `deploy/manifests/20260723-customer-care-policy-r10-1.json` | Identity/version/lifecycle PUBLISHED của bản lịch sử | Manifest không chứa toàn bộ policy payload |
| `apps/worker/src/pre-sale-policy.test.ts`, `packages/chat-runtime/src/runtime-policy-resolver.test.ts` | Bản fixture cấu trúc: đổi size/màu/mẫu 15 ngày, một lần, phí hai chiều 30k; trả do lỗi trong 5 ngày, shop chịu ship, hoàn 1–3 ngày làm việc sau xác nhận lỗi; `HOLD_UP_ONLY` | Fixtures hỗ trợ đối chiếu baseline, không tự chứng minh policy live hay chính sách mới |
| `packages/contracts/src/v4/admin-policy-control-base.ts` | Hợp đồng dữ liệu tách exchange/returns/inspection, inspection chỉ `HOLD_UP_ONLY` | Schema exchange hiện chưa có trường lý do lỗi shop; không thay schema/shared package ở Checkpoint A |
| Owner trong chat hiện tại | Chỉ được ướm, không mặc thử; chỉ chấp nhận đổi do lỗi shop, như lỗi sản xuất/giao sai size/mẫu | Ghi riêng thành dữ liệu chuẩn bị; không giả danh version Admin đã publish |

Như vậy repo **có** nguồn policy; thiếu bản nguồn đầy đủ khớp quy tắc đổi chỉ do lỗi shop vừa chốt. Không mang 15 ngày/30k của exchange, hoặc 5 ngày/hoàn tiền của returns sang quy tắc exchange mới. Thời hạn, phí, hoàn tiền của quy tắc mới chưa xác lập trong nguồn đã tìm thấy. Không lấy policy 7 ngày/thử trong nhà của corpus C3 làm policy shop mới.

Trong A, policy là snapshot fixture được freeze và đưa vào `trusted.policyLiterals`; cả hai model đọc cùng nguồn. Trong B, reuse `RuntimePolicySourcePort.loadActivePointers` / `RuntimePolicyResolver` cùng version/content hash/pointer revision để nối nguồn thật. Không implement connector/policy migration hoặc ghi Admin trong bản chuẩn bị này.

## Thay đổi có giới hạn

1. Viết riêng hai prompt ứng viên. Bỏ thời hạn, quyền thử/đổi, phí, mốc ETA cụ thể và license lợi ích gắn với một loại sản phẩm khỏi chỉ dẫn. Giữ nguyên nguyên tắc tư vấn tự tin có căn cứ, phân biệt tóm tắt dịch vụ với cấp quyền cụ thể, và toàn bộ giới hạn claims/effects.
2. Chuẩn bị serializer dùng canonical projection hiện có: gom subject/profiles/claims theo productId, giữ đầy đủ giá trị nguồn và metadata, đọc trường JSON `CodeSizeInput` đã có. Không dùng `ownerPolicyPresentation`/`ownerProfilePresentation`, không diễn giải tiếng Việt hoặc suy dữ kiện mới. Native history/tin cuối được giữ nguyên.
3. Builder chỉ phục vụ preview/tests, reuse envelope/config hiện có; không được runner hoặc production import. Verifier vẫn đọc exact draft + canonical trusted input; binding/freshness/final gate không đổi.
4. Test RED trước GREEN cho việc giữ nguồn và policy thay đổi, kiểm tra 42 fixture R52 như population **local compatibility**, không dùng chúng để đánh giá policy mới hoặc claim model đã PASS.

Giữ các kết quả đã mất công chốt: đúng missingInputs của món cần size, SIZE_FIT bound theo khách/revision/fingerprint, HEIGHT/WEIGHT khi được hỗ trợ; sửa lập trường khi hoàn cảnh đổi; phản đối giá theo lợi ích dùng đồ có căn cứ; upsell hữu ích không bị mặc định sai; dẫn một fact hợp lý không bị chấm như đọc lại toàn bộ hồ sơ. Không thêm forced CTA, câu cấm, rubric theo keyword, parser/router/template, repair/reverify, role hoặc gate mới.

Policy text/profile/history vẫn là dữ liệu, không được ghi đè system instructions hoặc cấp authorization. Thiếu kết quả kiểm nghiệm không tự phủ định ordinary advice có căn cứ; ordinary advice không cho phép tạo đặc tính/kết quả thử/bảo đảm mới. Không require phép thử riêng cho mọi lợi ích; không biến ít nhăn thành miễn chăm sóc hoặc tồn/màu thành bằng chứng công năng.

## Kiểm tra và điều kiện trước một run tương lai

Các checks local: focused preparation RED→GREEN; toàn Node eval suite với môi trường compatibility R39 và transport stub; worker boundary/provider; protected-claims/reply-assembler/size-engine; worker build/typecheck/lint; diff và lịch sử đối chiếu với preparation base. Lưu commands thực sự chạy và kết quả tại bản evidence chuẩn bị.

Trước provider phải có nguồn policy đầy đủ được chọn rõ, prospective corpus/nhãn/rubric khớp nguồn đó, prompt/context/protocol hashes và run authorization riêng. Đổi verifier prompt cần **fresh A2**; A2 PASS mới A3. Không kế thừa A2 qualification của R52, không đổi nhãn lịch sử, không claim chất lượng ngôn ngữ/safety model từ tests local. Model/provider/effort/bars/fallback/terminal/gate hiện có không bị thay trong bản chuẩn bị.
