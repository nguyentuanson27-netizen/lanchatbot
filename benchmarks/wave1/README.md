# Wave 1 benchmark

Thư mục này chỉ chứa manifest/report đã ẩn danh. Không commit transcript, gold
payload, evidence thô hoặc PII.

## Foundation v1

- Bundle binding: 2.000.
- Included: 1.955.
- Excluded: 45.
- Split: 1.173 development, 391 validation, 391 locked holdout.
- Rare/safety là overlay, không phải split thứ tư.
- Split seed: `lana-wave1-gold-v2-split-v1`.
- Split checksum:
  `485db42764e18583a02937b68dcdd6fd04e9b6bab867b11d4b041e55e573985e`.
- Run fingerprint:
  `87d1985455a7f06582947682a0dde3a7312b5921510b264af3c7b8415f3b3bab`.

Report: `foundation-v1.json`.

## Current deterministic baseline v1

Baseline chỉ dùng matcher buying-signal đang chạy ở production và chỉ chấm
`DEVELOPMENT`/`VALIDATION`; locked holdout không được mở. Historical export
không có verified catalog envelope, vì vậy adapter không suy đoán product context.

Validation hiện tại:

- `BUYING_COMMITTED` precision: `42,41%`.
- `BUYING_COMMITTED` recall: `57,26%`.
- Evidence validity: `100%`.
- Macro-F1 toàn bộ label: `1,28%`; các label có gold support nhưng không có
  prediction được tính F1 bằng `0`.

Runtime-policy và reply-quality baseline mang trạng thái
`PENDING_RECORDED_FIXTURES`: hai lớp này cần simulation replay với policy/business
snapshot cố định, không được suy ra side effect hoặc fact envelope từ transcript.

Report: `current-deterministic-baseline-v1.json`.
Artifact SHA-256:
`7e42ea12c4dfe87b1d236c9bfd5eba45fcb3026f3099bba9618d80109d3ff5f2`.

## Chạy lại

Build package:

```bash
pnpm --filter @lana/dataset-review build
```

Chạy bằng ba artifact ngoài Git:

```bash
node packages/dataset-review/dist/wave1-benchmark-cli.js \
  --gold /protected/path/gold.json \
  --history /protected/path/history.json \
  --manifest /protected/path/transcript-manifest.json
```

CLI mặc định khóa SHA-256 của official manifest. Output chỉ có checksum, count,
split và label support; không chứa source key, transcript hoặc evidence.

Chạy current deterministic baseline:

```bash
node packages/dataset-review/dist/wave1-current-baseline-cli.js \
  --gold /protected/path/gold.json \
  --history /protected/path/history.json \
  --manifest /protected/path/transcript-manifest.json \
  --output benchmarks/wave1/current-deterministic-baseline-v1.json
```
