# Independent review — B–C review/repair

Owner yêu cầu review toàn bộ → chốt hướng → independent review → fix → cùng reviewer review đến APPROVE. Reviewer là subagent độc lập `/root/bc_fix_review`, read-only; không tham gia sửa production code hoặc chạy provider. Không tự ghi model identity/effort khi tool metadata không expose.

## Audit và plan

Reviewer tự đọc diff cuốiBf160→C, latest22ca/34turns, B reports và diagnostic; quyết định không rollback toàn bộ. KEEP các sửa C tuple parity/replay/COD/private state; REPAIR representation/bound attribution; SOURCE/MODEL/UNRESOLVED giữ riêng. Reviewer nhắc B4ef≠cuốiB và quote form phải giữ ảnh; s01 không phải owner tự tạo dependency.

Initial PLAN REQUEST_CHANGES:

1. TTL normalization mơ hồ. Reviewer đầu tiên đề xuất minoptionexpiry, sau khi kiểm actual callers đã sửa đề nghị thành giữ EXACT V1 authoritative-envelope normalization để không đổi policy trong patch representation. Plan revision2 ghi rõ legacy normalization cả2phía và kiểm full tuple identity/source trước factor.
2. Unknown merge exception cần terminal/reason cụ thể và không leak. Chốt existing outer boundary UNAVAILABLE/SOURCE_ERROR, known bound/conflict riêng, snapshot atomic.
3. Cần mapping từng22ca/34turns, không nhận compact patch là sửa mọi fallback. Mapping đã thêm.

**APPROVE PLAN** revision2 exact `f57518e83d78b870d6830625dfd78df6178c733e`. Không có blocking plan finding còn mở.

## Implementation

Reviewer prereview và exact-source review V2 constructor, full-option checks trước factor, strict schema/hash/time/selectors, shared expander4consumers, immutable readback and catch handling; không thấy blocking source finding. Reviewer yêu cầu đủ same-source realSV2447 multi-offer + neutral single/SV1561, exact protected claims và native wire envelopes, không chỉ hash presence hoặc byte count.

Main thực chạy RED5 → GREEN9, finalworker340/protected21, build/typecheck/lintPASS, Node768PASS/2SKIP; actualPG73/73PASS+7invariantsPASS. Reviewer tự chạy compact+evidence10/10unit và nativewire1/1, sau đó tự parse CompactV2 owner và verifier frame so FULL selectionEvidence với snapshot:24/24tuples khớp. Đây là repeated verification, không cộng vào distinct totals.

**APPROVE IMPLEMENTATION** exact clean `e6880a70cbbb2eb0745c2b008b0a4617005a71d5`. Reviewer tự validate actualPG report bằng existing validateRealAdapterReport: sourceDirty=false,73checksPASS,7invariantsPASS, DBdropped=true, provider0,sendfalse. Same-input6query protectedclaims bằng cuốiB; current source clean. Không còn blocking implementation finding trong approved scope.

Sau PG, test-only `3ace47b3c9858ffd44212b705a006998daf44de9` thêm5lines permanent native full-envelope deepEqual. Reviewer tự chạy lại Node1/1PASS, kiểm production source/packages byte-identical e688 và **20/20 artifact hashes/byte lengths** trong verification. **APPROVE test-only delta**, carry forward implementation approval; không nhận PG đã rerun trên source mới.

## Nonblocking và giới hạn

- Observer chưa allowlist SELECTION_EVIDENCE_STALE nên diagnostic có thể UNKNOWN_INTERNAL; tool/finalgate vẫn failclosed. Không mở thêm source patch hoặc rerunPG chỉ vì telemetry này.
- V1 pending/source-result hashes không migrate để qua V2 replay; rollout tương lai cần plan riêng.
- FinalB media-eligibility blob `de9e51725ac639e226dd3c5dc5a41a047e0bcf68` giống current. Revalidation không phải công riêng C; giữ C vì tuple/state fixes thực sự mới.
- Source expiry/metadata/chart, NO_COLOR và owner planning/giọng còn theo mapping; chưa có model-quality run mới. Không PhaseC GO, C3 comparison hoặc rollout approval.

Reviewer còn review draft report accuracy trước delivery và không thấy claim vượt evidence. Exact source/test approvals, commands/hashes và scope được giữ riêng trong [implementation](c3-bc-review-repair-implementation-20261030.md) và verification JSON; tool transcripts giữ independent command outputs. Không thay lịch sử raw/grades để lấy PASS.
