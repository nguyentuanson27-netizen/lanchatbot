# Wave 1 batch r20 status — 2026-07-28

## Phạm vi

Batch này hoàn thiện bằng chứng offline cho ba lớp benchmark và bổ sung telemetry
alias theo taxonomy Wave 1. Batch không thay semantic matcher production, không mở
locked holdout, không tạo outbound mới và không thay quyền side effect.

## Benchmark

### Semantic candidate

- Candidate: `wave1-semantic-rules-candidate-v1`.
- Chỉ chạy trên development và validation.
- Locked holdout: không mở.
- Trạng thái promotion: `NOT_PROMOTED`.
- Validation macro-F1: `24,13%`.
- Validation `BUYING_COMMITTED`: precision `42,41%`, recall `57,26%`,
  F1 `48,73%`.
- Candidate giữ nguyên detector production cho `BUYING_COMMITTED`; không có
  regression ẩn sau macro-F1.
- Gate còn thiếu ở các label safety-critical và targeted-label improvement.

Report: `benchmarks/wave1/semantic-candidate-v1.json`.

### Runtime policy và reply quality

- Fixture cố định: 17 case tổng hợp, không chứa transcript hoặc PII.
- Runtime oracle mode: 17/17 pass; hard-safety violation `0`.
- Runtime model mode: 17/17 pass; hard-safety violation `0`.
- Reply quality: 13/13 pass; hard-safety violation `0`.
- Side effect: `DISABLED`.
- Đây là `SYNTHETIC_REFERENCE_CONFORMANCE`, không phải production baseline.
- Production replay vẫn là `PENDING_RECORDED_FIXTURES`.

Fixture:
`benchmarks/wave1/fixtures/wave1-conformance-v1.json`.

Report:
`benchmarks/wave1/synthetic-policy-reply-conformance-v1.json`.

## Production evidence availability

Kiểm tra chỉ đọc trên VPS ngày 2026-07-28, không đọc payload hoặc nội dung hội
thoại:

- `shadow_evaluations`: 0.
- `shadow_evaluations` có business-fact payload: 0.
- `conversation_events` có `adminSimulation`: 0.
- Event có đủ business/tool snapshot cho recorded replay: 0.
- Simulation run/result hiện có: 1/1, cùng trạng thái
  `INSUFFICIENT_EVIDENCE`.

Vì chưa có recorded snapshot, batch không giả lập production baseline từ
historical transcript và không kết luận fact-hallucination production.

## Runtime delta

Chỉ bổ sung event alias additive:

- `PRODUCT_MATCHED`.
- `BUYING_SIGNAL_COMMITTED`.
- `READY_TO_BUY`.
- `HANDOFF_REQUESTED`.
- `NO_REPLY_SELECTED`.

Event cũ vẫn được giữ để tương thích dashboard/consumer hiện hữu. Không đổi state
schema, policy, outbound, ownership, allowlist hoặc dedupe.

Các event chưa có nguồn sự kiện production đủ tin cậy trong batch này:

- `BUYING_SIGNAL_CANDIDATE`.
- `BUYING_SIGNAL_RETRACTED`.
- `BUYING_SIGNAL_NEGATED`.
- `STAGE_TRANSITION_REJECTED`.
- `ORDER_CREATED`.

`ORDER_CREATED` cần acknowledgement từ POS/order source-of-truth; không được suy
ra từ `PURCHASE_CONFIRMED`.

## Migration, flag và rollback

- Migration: không.
- Feature flag hành vi: không.
- Semantic candidate: offline-only, không được nối vào production.
- Rollback runtime: quay lại image/release r19; event alias mới là additive và có
  thể bị consumer cũ bỏ qua an toàn.

## Gate còn thiếu

Wave 1 chưa hoàn thành. Còn cần:

1. Recorded business/tool snapshots để chạy production runtime/reply replay.
2. Semantic candidate đạt precision/recall/support gate trên evaluation độc lập.
3. Representative control set trước controlled promotion.
4. Funnel đo được tới `ORDER_CREATED` từ source-of-truth.
5. Shadow/canary ít nhất 7 ngày và 500 eligible conversations, đồng thời đủ các
   minimum slice.
6. Smoke rollback và xác nhận incorrect handoff/false-positive post-sale không
   regression trên canary.

## Post-deploy evidence

- PR `#38` merge commit: `0cdd8ba06fcc2580ee6aee376803e0d2a5a6ec32`.
- Tag/release: `20260728-wave1-replay-telemetry-r20`.
- Realtime image: `sha256:d7e68a1095136a875b9dab505c2f88c355317c61c17f9b01c779aefb8b90ff0d`.
- Chỉ `realtime-worker` được recreate; semantic candidate không được bật.
- Realtime healthy, restart `0`, error/warning mới `0`; không có container unhealthy.
- API và Admin API liveness nội bộ pass; Admin public route trả `302` sang Authentik.
- Probe `http://156.67.214.197:8000/health` từ mạng Codex timeout; không dùng kết quả này để phủ định liveness nội bộ/container health.
- Rollback target là release/image r19; env backup đã được tạo và không có migration.

Manifest: `deploy/manifests/20260728-wave1-replay-telemetry-r20.json`.
