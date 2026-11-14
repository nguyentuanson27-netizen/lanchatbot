# Phase C — context publication và size scope

Repair base `a549f8cf7a1330d55b2d479a9202e99559195a1d`; plan `c968c122c105e253c4dcf47e4ac70b70c1e2437d`; code/run source `1427d2f17028e007df442c73a8d555990a3dc6ee`. [Approved plan](c3-phase-c-context-publication-fix-plan-20261101.md), [review record](c3-phase-c-context-publication-review-20261101.md), [full run/evidence](../../apps/worker/evals/single-agent-commerce-qualification/context-publication-run-20261101/REPORT.md).

## Implementation

- Read-only tools stage policy cache/literal cùng chart projections cho các sản phẩm đã có. Cùng projection dùng ở static/full reads; chart bị thu hồi được bỏ. Malformed/oversized publication fail closed, không để chart cũ cấp quyền; independent facts vẫn giữ làm evidence. Policy read generation bảo vệ cả late success và late failure khi policy mới đã được publish.
- Nhiều PRODUCT chưa có focus chỉ prepare metadata/read refs; không numeric-prefetch thiết kế chưa chọn. Fact đã admit không bị xóa. Vẫn debit preparation trước I/O, giữ cap và admission hiện có.
- `recommend_size` nhận closed `fitScope=PRODUCT|COMPONENT` (legacy mặc định PRODUCT); componentRole chỉ hợp lệ khi COMPONENT. Port hiện không hỗ trợ component fit nên trả source gap trước engine/CAS. PRODUCT result ghi rõ scope; trusted authority vẫn là ProtectedClaimV1 SIZE_FIT cấp sản phẩm. Không thêm claim schema, generic parser hoặc suy FIT từ prose.
- Owner/verifier prompts thêm ranh giới chung: size thường mặc chưa phải đã chọn mua; product fit không cấp size từng phần. Không thêm ví dụ riêng theo ca. Candidate pre-dispatch error giữ byte budget và zero-HTTP accounting, thay vì mất telemetry.

Không đổi models, generation settings, caps, delivery gate, production wiring hoặc source shop. Online semantic roles/layers thêm: **0**. Ngoài scope này: component-fit API mới, atomic offer replacement, callable-tool pruning, A2 provider rerun, C3 comparison và deployment.

## Verification

Observed RED: 4 failures cho late chart/scope, 2 cho multi-target preparation, 2 cho policy concurrency; GREEN minimum rồi broaden focused checks. First typecheck bắt test sửa readonly fixture; fixture được sửa, final typecheck PASS.

- Worker: **512 PASS / 15 matching files**; Node evals **781 PASS / 2 existing SKIP**; native adapter/admission/provider **85 PASS**.
- Worker build, final direct compilation, typecheck và lint: PASS.
- Actual isolated PostgreSQL trên source sạch1427: **76/76**, validator hiện có **7/7**, DB dropped, generation0/sendfalse.
- Offline old-world/clock policy replay: chart đã có trước verifier và snapshot unchanged ở readback. Không dùng clock cũ để cấp send eligibility.
- Offline continuation với actual native signature/call/result và đủ time/media/entry envelope: current prompt **64399 byte**, optional hints bị omitted bởi WIRE_BOUND hiện có; verifier **32247 byte**. Đây không phải original second body không được capture.

Các commands/logs/hash và failures giữ trong report/JSON. Cùng reviewer độc lập APPROVE IMPLEMENTATION + DISPATCH tại exact clean1427 sau kiểm artifacts/source/dist/helper hashes.

## Kết quả model và giới hạn

Full21/28 N1/retry0 hoàn tất, không snapshot hard stop: 52 generations / 51 HTTP; 13 eligible, 11 silent handoff, 4 no-send; 13 text và 2 ảnh. P09 đọc đúng hai thiết kế và follow-up, P07 dùng đúng COMPONENT → handoff. s08 vẫn request-bound; s09 malformed tool selection trước verifier, nên chưa chứng minh model đi qua đường policy đã sửa. j6 verifier transport failure giữ cart đã commit, không replay.

Grade độc lập đã khóa trước unmask: whole13/21, FAIL7, UNRESOLVED1; chỉ8/21 đủ cả whole+explicit-needs+hard-safety. Packet development không được import như official qualification. Cohort nguồn thiếu không đều handoff; j2 readiness chỉ cấp sản phẩm chưa chứng minh component applicability, P06 referent/BOM chưa đủ. P08 bước sửa giỏ không hoàn tất và trả bước khách không làm được; không quy vấn đề này chỉ cho văn phong.

**STOP development batch / Phase C qualification BLOCKED / C3 NOT_RUN / B_NOT_GO.** Giữ các hạn chế giọng nhẹ; ưu tiên capability/budget, mutation failure handling và evaluator prerequisites. Không tự mở vòng model tiếp theo hoặc promotion sau report này.
