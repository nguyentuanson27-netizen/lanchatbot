# DEV70 hội thoại bán hàng — R2

Đây là **hội thoại mô phỏng được biên soạn**, không phải log khách thật hoặc dữ liệu đại diện cho tần suất mua hàng của La.na.

R2 viết lại lớp hội thoại để giống Messenger bán hàng thật hơn trên cùng 70 ID của benchmark main R2.5. Facts được dùng giữ nguyên; 19 context amendment đã có trong PR379 được giữ lại để sửa các mâu thuẫn reachability/checkout/intent của source. R2 không thay runtime, prompt, rubric hay HOLDOUT.

## Mục tiêu naturalness

- Khách có thể nhắn ngắn, viết tắt, gửi nhiều tin liên tiếp, quay lại hoặc đổi ý; không phải câu nào cũng là tiếng Việt chuẩn hoàn chỉnh.
- Shop ưu tiên phản hồi ngắn và trực tiếp; không biến mọi lượt thành câu hỏi khảo sát/discovery.
- Không viết lời khách như instruction cho evaluator (ví dụ “đừng trừ thêm lần nữa”, “chưa phải hậu mãi”). Intent đó phải thể hiện tự nhiên qua ngữ cảnh.
- Các ca dài vẫn giữ đủ lịch sử để kiểm memory nhưng có nhịp im lặng/xác nhận/chuyển chủ đề tự nhiên hơn.
- Không làm đẹp bằng cách bỏ ca thiếu authority, stale capture hoặc câu nhiều mệnh đề.

## Phiên bản

- Dataset: `TRACK_C_DEV70_REALISTIC`
- Revision: `R2`
- Historical editorial parent: `R1` (artifact unavailable; comparison not verified).
- Source frozen: R2.5 trên `main` tại `a28bd12a8b15c4bbf65914c52236adac4ac41594`
- Lane: `BEHAVIOR_SIMULATION`

R2 là corpus opt-in và chưa đăng ký vào aggregate gate C2. Kết quả R2 phải ghi đúng revision; không gộp điểm với R1, R2.5 hoặc R2.9 như cùng population.

## File

- `dev70.cases.json`: input model-facing, không chứa expected/model output.
- `dev70.expectations.json`: tiêu chí evaluator; không đưa vào prompt.
- `facts-used.json`: frozen fixture facts lấy từ main R2.5, không phải facts live.
- `manifest.json`: identity, nguồn, hash và giới hạn.
- `change-map.json`: source R2.5 dialogue hashes, archival R1 hashes (unverified), and the pinned R2 review baseline.
- `coverage.json`: coverage và naturalness metrics trước/sau.
- `DEV70_HOI_THOAI_R2.md`: bản đọc 70 hội thoại + kỳ vọng.
- `validate.mjs`: static validator, không gọi mạng/model.

## Validate

Từ folder này:

```sh
node validate.mjs --self-test
```

Từ repo root để đối chiếu frozen R2.5 source/facts:

```sh
node apps/worker/evals/track-c-c2/dev70-realistic-r2/validate.mjs --self-test --repo .
```

## Không đổi

Producer/Strategist/Responder ownership, fact values, stale controls Q027/Q066 và negative capability gaps Q024/Q043 vẫn giữ nguyên. So với main R2.5 có 19 context amendment được liệt kê trong `coverage.json`; chúng sửa contradiction của benchmark và không cấp quyền ngoài các facts đã có.

## Giới hạn

R2 vẫn là 70 snapshot hội thoại mô phỏng, không phải 70 journey tự rẽ nhánh. Chưa chứng minh conversion, khách thật, Producer full-runtime, live catalog, transaction hoặc transport encoding. Chưa chạy Luna/judge cho R2 trong commit này.

## Review amendment baseline

`review-baseline.json` pins the published R2 input at `6ae9ad3d33010e5262ae5eb303df75411974960e`. The validator checks all case IDs, splits and context hashes against it and checks the exact bytes of expectations and facts. This does not establish the unavailable R1 comparison. Historical R1 metrics and dialogue hashes are retained as archival claims, not newly verified results.

The main source comparison remains R2.5 at `a28bd12a8b15c4bbf65914c52236adac4ac41594`; authoring metadata retained in older payloads must not be read as a new R1 verification.

From repository root:

```sh
node apps/worker/evals/track-c-c2/dev70-realistic-r2/validate.mjs --self-test --repo .
node --test apps/worker/evals/track-c-c2/dev70-realistic-r2/validator-regressions.test.mjs
```

The regression suite uses isolated synthetic fixtures, including deliberately invalid inputs with refreshed payload hashes. It is separate from validation of the real 70-case corpus. No model evaluation or memory-ablation result is claimed.
