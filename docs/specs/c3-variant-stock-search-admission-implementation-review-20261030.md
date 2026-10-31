# Independent implementation review — variant stock và search admission

Owner yêu cầu fix theo approved plan → same independent reviewer → fix → review đến APPROVE. Implementation base3c793f6c; reviewer `/root/bc_fix_review`, read-only, không viết patch hoặc gọi provider. [Implementation](c3-variant-stock-search-admission-implementation-20261030.md), [plan](c3-variant-stock-search-admission-fix-plan-20261030.md).

## Findings và cách đóng

| Finding reviewer | Bản sửa / evidence |
|---|---|
| Same exact stock scope khác sourceVersion/evidenceRef/authority nhưng cùng availableQuantity/contentHash vẫn qua | Exact scope uniqueness gồm value/contentHash/authority/sourceVersion/evidenceRef; raw same-key counter/version cũng phải khớp. Negative tests shared + hai DB guards |
| Canonical component sort dùng localeCompare, hash có thể phụ thuộc ICU | Codepoint ordering + Unicode reordered components test |
| Old deferred search ghi đè offer pin/context của newer full read | Final synchronous current-pin reconciliation; changed source reject trước publication, same identity giữ admitted literal/expiry; deferred regression |
| Counter chỉ bind vào inventoryVersion của candidate mode | Bind counter/unit ở cả resolver modes, thêm mode-param tests; không đổi legacy offerId scope |
| Preparation double catalog error/sai product xóa evidence đã admit | RED3 trước sửa → throw closed SOURCE_ERROR trước map writes; independent static fallback vẫn giữ; readback fail closed |
| Reverse race: old full/details/prepare hoặc eager-batch read ghi đè newer search | Baseline object capture trước awaits và batch fetch, staged merge trước product/POS/media publication. RED4→GREEN, same-identity positive; reviewer độc lập91testsPASS |

Trong self-review/broad checks còn sửa budget phải dùng existing duplicate projection để giữ discovery, và synthetic PG fixtures phải có stock source units khi muốn chứng minh M/L độc lập. Failed PG attempts và baseline deltas được giữ trong implementation/verification, không bỏ guards để lấy PASS.

Reviewer đã đồng ý scoped cv2 producer ở code-owned native lane giữ baseline C3; source-unit/overlap guards vẫn áp dụng legacy, không miễn raw counter trùng. Thêm ingress cart claim builder thứ3 phát hiện qua caller audit; conversational selectionRef không thay.

## Review thực hiện độc lập

- Formal d4ad7f2a REQUEST_CHANGES: provenance, Unicode sort, stale search; đã đóng qua e7ff.
- Exact3d2ba008: reviewer tự chạy71contracts và102worker(catalog19/readtools83) PASS, không source edit/provider. Source/package cuối giữ nguyên shared runtime bytes của các checks này.
- Exact050db1dd: reviewer tự chạy86readtools PASS và audit prepare/source-fixture delta; còn yêu cầu reverse-race fix.
- Working delta050→3a: reviewer audit và tự chạy91readtools PASS; sau đó xác nhận delta đã commit vào exact3a06936f chỉ gồm hai file đã review, không blocker code mới. Chưa dùng các lượt lặp làm distinct test totals.
- Reviewer gặp một lần lỗi quota; sau đó tiếp tục được cùng agent, không đổi model hoặc mô phỏng review.

## Final evidence review

Exact executable `3a06936f8f43b7b31e09215fd8cd516f79797429`. Main đã gửi worker507PASS, Node768PASS/2SKIP, shared71/55/56 và canonical checks; actual PG04 sourceclean76checks/7invariantsPASS, generation0,sendfalse,DBdroppedtrue. PG03 là source050, không dùng thay exact final PG04.

**APPROVE IMPLEMENTATION** exact `3a06936f8f43b7b31e09215fd8cd516f79797429`. Reviewer tự kiểm tra56artifact hashes/lengths khớp; gọi existing validateRealAdapterReport trên PG04, đủ7/7 invariants và76unique casesPASS; source sạch, DBdroppedtrue, generation0, sendfalse. Ba controls mới M/L, tamper tại DB và shared raw counter đềuPASS. Compiled module SHA256 khớp emit witness, packages e7ff→3a diffempty; final log counts và DB negative spotcheck phù hợp, không cộng lặp coverage.

Reviewer kết luận mọi finding code trước đã đóng bằng regressions; report phân biệt đúng synthetic PG/component replay/model NOT_RUN và giữ failed attempts. Được delivery docs/tasks-only mà không thay approved executable bytes. Không chạy model/campaign mới hoặc đổi Phase C BLOCKED/C3 NOT_RUN/B_NOT_GO; approval không cấp quyền merge/deploy hoặc Phase C GO.
