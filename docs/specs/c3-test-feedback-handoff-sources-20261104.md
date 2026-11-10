# Bổ sung feedback và handoff vào nguồn test Phase C

Owner yêu cầu tự bổ sung cả hai mục ngày 04/11/2026. Base `7ccd3347de9d4508a5785a4f1643eab8108d45b3`; executable `2a8a97ac363146d478341b75c3694fd2bd61efb0`. Scope: dữ liệu test/frozen-world; không publish hoặc sửa nguồn shop thật.

## Nội dung đã nối

**Feedback giả định:** dùng đúng ảnh cận AO đã duyệt, URL/hash được pin trong `testSupportSources` ở source-config. Chỉ gắn feedback cho áo `SV2447-AO` dưới hai mã cha SQ2447/SV2447, kiểm tra SKU qua offer AO và partsVisible AO. Giữ imageType/parts/hash/approval/clock gốc; không nhận proof INVALID. Đây là ảnh catalog được giả định làm feedback để kiểm cơ chế chọn/gửi, **không xác nhận khách thật hoặc ảnh khách mặc**, không đo sức thuyết phục thị giác của feedback thật. Không dùng ảnh set để giả thành ảnh riêng quần/váy, không thay lời tư vấn/prompt.

**Handoff policy active trong test:** dùng nguyên `handoff-matrix.candidate.json` hiện hành, pin content hash `5154e9ea1e04200c8f92b9812ddcdae39d20e7cb508f96fafc7613ae3d833d74`. Tái dùng isolatedHandoffRecords hiện có; thêm schemaVersion và serialize datetime cho đúng contract record vốn trước đây đi qua DB normalization. Tạo version/pointer identity ổn định theo nội dung, không thay clock gốc. Cả 30 rule đều SILENT_HANDOFF/null holding; 29 lý do hội thoại khách không tạo customer text. ADMIN_REQUEST vẫn không phải quyền model/khách.

Capture mới: raw world → supplement màu trắng → supplement feedback/policy. `PUBLIC_SOURCE_WORLD.json` giữ raw; `WORLD.json` có hai metadata giả định riêng cùng approval/config hash và hash input trước bổ sung. Recompute evidence hashes sau biến đổi. Frozen lookup/search chiếu cùng product đã bổ sung; frozen facts xác nhận provenance; search index, giá, tồn, timestamp và scope size giữ nguyên. Không rewrite world/run cũ.

Harness nạp policy records vào PostgreSQL clone. Nếu world đã có frozen matrix thì `--candidate-handoff` không tạo version mới; kiểm hash/version trước và sau resolver để giữ nguyên identity đã seal. Không có upstream active-pointer write.

## Kiểm chứng thực tế

- TDD RED trước implementation: 3/3 FAIL (feedback false, matrix absent, không chặn nguồn thay đổi). GREEN cuối: **170 Node tests PASS**, gồm toàn bộ qualification và candidate-handoff/handoff-matrix; 4 test support mới. Negative controls gồm sai hash/SKU, proof INVALID, candidate hash/approval, thiếu provenance và sai component.
- Unit phát hiện record từ helper DB cũ thiếu schemaVersion và chứa Date objects; đã chuẩn hóa trong adapter test mới, không đổi production contract. Composition test ban đầu thiếu inventory_source ở fixture; sửa fixture, không bỏ kiểm tra nguồn.
- Replay cùng raw world/clock 09:46:34: native lookup parity 2, white selections 8, component size sources 4, feedback selection TOP+trắng 2, active matrix 30 rules, 29 lý do khách SILENT và 2 commit ownership sang HUMAN không có text/media. Raw source/hash bất biến. [Bằng chứng](c3-test-support-sources-20261104.json).
- Replay đầu dùng thiếu scope sourceMessageId/sourceObservedAt khi kiểm từng reason, tạo malformed command. Không sửa runtime để cứu test; sửa scope fixture và chạy lại đủ 29. Bản preliminary không dùng làm coverage vẫn giữ ở `../c3-test-support-world-20261104-01/PRELIMINARY_SCOPE_ERROR.json`.
- Clean executable `2a8a97ac`: **real PostgreSQL 1/1 PASS** cho native initial-state capture; matrix được insert/read qua store/resolver, đúng frozen version/hash dù có `--candidate-handoff`; database đã drop, provider generation 0/live send false. [Policy refs và raw artifact hash](c3-test-support-pg-20261104.json).

PG check chỉ chứng minh initial-state/policy persistence, không phải hội thoại có model hay full end-to-end feedback delivery. Replay dùng in-memory handoff commit, không tải/prepare bytes ảnh. World replay ở clock cũ không phải fresh sealed model input. Cần capture/bind/seal mới nếu chạy model; không lấy các kiểm tra này làm quality/qualification GO.

Commands thực sự chạy:

```text
node --test apps/worker/evals/single-agent-commerce-qualification/test-support-sources.test.mjs
node --test apps/worker/evals/single-agent-commerce-qualification/test-support-sources.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-handoff.test.mjs apps/worker/evals/single-agent-commerce-read-only/handoff-matrix.test.mjs
node --test --test-concurrency=2 "apps/worker/evals/single-agent-commerce-qualification/*.test.mjs" apps/worker/evals/single-agent-commerce-read-only/candidate-handoff.test.mjs apps/worker/evals/single-agent-commerce-read-only/handoff-matrix.test.mjs
node ../c3-test-support-check-20261104-01.mjs
node --check apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs
python ../c3-media-context-model-source-wrapper-20261103-02.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-test-support-pg-20261104-01 COD --phase-c-initial-world ../c3-test-support-world-20261104-02/WORLD.json --candidate-handoff
git diff --check
```

Self-review: code/policy vẫn quyết định effects/ownership; source supplements chỉ nằm trong eval preparation/projection, có hash và nhãn giả định. Giá/tồn/màu/size, silent handoff và evaluator firewall giữ nguyên; không thêm model role, parser, repair loop hoặc production wiring. Không shared/worker runtime TypeScript change; không chạy lại build/full worker hoặc full PG matrix. Không model campaign, merge, deploy hoặc live send.
