# Wave 1 capability/delta audit — 2026-07-28

Baseline source: GitHub `main` commit `63d8e60`.

Runtime observed before implementation:

- VPS current release: `20260727-admin-web-assets-r18.8.1`.
- Realtime Worker: `realtime-measurement-continuation-r17`, healthy.
- Shadow Worker: `realtime-wave1-shadow-f27de9c`, healthy.
- Admin API/Web, Inbox/Outbox, PostgreSQL và Redis healthy.
- Không thay đổi dataset hoặc runtime production trong audit.

## Capability map

| Capability | Trạng thái đầu kỳ | Evidence hiện có | Delta Wave 1 v1.2 |
|---|---|---|---|
| Transcript parse/redaction/dedup | DONE | `packages/dataset-review` | Giữ nguyên; khóa version trong run manifest |
| Gold-v2 binding | PARTIAL | guarded replacement adapter | Chuyển thành read-only bundle validator dùng manifest checksum |
| Dataset universe 1.955 | MISSING | dry-run thủ công | Tự động loại 45 và enforce official counts |
| Dev/validation/holdout split | PARTIAL | `assignSplits` có `RARE_SAFETY` split thứ tư | Thêm split ba phần, rare/safety overlay và support constraints |
| Leakage guard | PARTIAL | duplicate-group split tests | Thêm split checksum và leakage count bắt buộc bằng 0 |
| Semantic benchmark | DONE/BASELINED | AI pre-label/evidence validator | Scorer multilabel, evidence, confusion, Wilson interval, promotion gate và deterministic dev/validation baseline đã có |
| Runtime-policy benchmark | DONE/PENDING_FIXTURES | golden replay và policy simulation | Oracle/model scorer đã có; recorded business-envelope replay còn chờ batch kế tiếp |
| Reply-quality benchmark | DONE/PENDING_FIXTURES | Judge v2 shadow | Deterministic scorer đã có; fixed-envelope replay/judge baseline còn chờ batch kế tiếp |
| `NO_REPLY` buying guard | DONE/CANARY | business guard và realtime golden tests | Đưa vào hard-safety benchmark, không viết lại |
| Stage/Sales Cycle | DONE/PARTIAL | conversation engine, sales-cycle runtime | Bổ sung coverage theo oracle semantic fixtures nếu thiếu |
| Funnel/decision telemetry | DONE/PARTIAL | decision events và Admin funnel | Audit event completeness theo Wave 1 event list |
| Shadow diff | PARTIAL | Phase 4 shadow evaluation | Mở rộng output để tách semantic/runtime/reply layer |
| Post-sale gate | DONE/PARTIAL | deterministic pre-sale policy và post-sale early routing | Thêm false-positive post-sale benchmark/gate |
| Commitment lifecycle | DONE/PARTIAL | natural checkout, buying signal, cart/state | Bổ sung negation/retraction chronology tests |
| Clarification state | DONE | missing-field flows hiện có | State additive lưu reason/missing/product, budget 3, fingerprint chống lặp, progress reset và telemetry |
| Ownership/fence/dedupe | DONE | conversation engine, Inbox/Outbox, page allowlist | Đưa vào hard-safety benchmark; không viết lại |
| Verified facts | DONE | ProductFactsV2, guard, verified envelope | Dùng recorded/synthetic/snapshot fixture cho fact hallucination |
| Rollback compatibility | DONE/PARTIAL | feature flags và release rollback | Smoke riêng cho benchmark adapter và runtime delta |

## Quyết định triển khai

1. Mở rộng `packages/dataset-review`; không tạo service benchmark mới.
2. Tái sử dụng `apps/admin-simulation-worker` và conversation replay cho adapter
   runtime; scorer thuần nằm trong Dataset Review.
3. Không import gold vào dataset production và không chạy replacement apply.
4. Không gọi model hoặc Judge để quyết định hard safety.
5. Runtime chỉ thay đổi khi baseline/scorer chỉ ra delta chưa được guard hiện có
   bao phủ.

## Batch evidence

Batch foundation đạt khi:

- Official bundle checksum đạt.
- Included/excluded là 1.955/45.
- Annotation count 13.887.
- Split 1.173/391/391.
- Leakage bằng 0.
- Nhãn đủ support có locked holdout ít nhất 50.
- Nhãn thiếu support mang `INSUFFICIENT_TOTAL`.

## Implementation evidence

Foundation và baseline:

- Official bundle: 2.000 binding, 1.955 included, 45 excluded, 13.887 annotation.
- Split: 1.173 development / 391 validation / 391 locked holdout; leakage `0`.
- Deterministic baseline chỉ chạy development/validation, không mở holdout.
- Validation `BUYING_COMMITTED`: precision `42,41%`, recall `57,26%`.
- Validation evidence validity: `100%`.
- Runtime-policy/reply-quality baseline giữ trạng thái `PENDING_RECORDED_FIXTURES`;
  không suy diễn side effect hoặc verified facts từ historical transcript.

Runtime delta:

- `SalesCycleRuntimeState` giữ `schemaVersion: 2`; field clarification là additive/optional.
- Lưu reason code, missing fields, product ID đã có trong sales-cycle, attempt count,
  max attempts, question fingerprints và timestamp.
- Tối đa ba câu hỏi khác nhau; lượt thứ tư không tiến triển chuyển `NHAN_VIEN`
  với reason `CLARIFICATION_RETRY_EXHAUSTED`.
- Khi missing-field set giảm, attempt reset về 1; khi đủ dữ liệu, clarification được
  resolve và flow tiếp tục sang order preview.
- Decision telemetry chỉ ghi enum/count/fingerprint state, không ghi PII hoặc raw text.

Test evidence:

- Dataset Review: 51/51 test pass.
- Chat Runtime: 32/32 test pass.
- Worker: 272/272 test pass.
- Root `pnpm check`: typecheck, test và build toàn workspace đều pass.