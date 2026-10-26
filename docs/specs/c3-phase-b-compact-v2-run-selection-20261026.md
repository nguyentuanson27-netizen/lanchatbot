# Compact V2 — explicit run selection

Base `b7c4e7d5`. Owner yêu cầu “fix và review lại” sau compact review APPROVE/no blocker. Không bịa lỗi trong review trước. Bổ sung phần còn thiếu cho lượt chạy sau: runner đang fixedV1, nên cần lựa chọn V2 rõ ràng/bound vào registration. **Không gọi provider/model/count API trong task này.** Không đổi dữ liệu, prompt, model, verifier, formatter, production entrypoint hoặc historical evidence.

Runner hỗ trợ `--presentation VI_DATA_BLOCKS_COMPACT_V2` ở cả preflight/run. Không chọn thì V1 như cũ; enum/args sai reject trước dispatch. Bundle/wire proof theo đúng formatter đã chọn. Registration ghi ownerContextPresentation và existing bundleHash; run phải deep-match frozen preflight. V2 dùng namespace slotIDs riêng, không adoption/retry oldV1 slots. ArmA luôn ORIGINAL; ArmB nhận đúng selection. Exact HTTP mock kiểm selection cho cả2versions×2arms và mandatory verifier mỗi final draft.

Campaign driver thêm duy nhất opt-in `--compact-v2`; không flag giữV1. Ghi selection trước provider và forward đúng lựa chọn tới offline preflight, diagnostic preflight và diagnostic run. Giữ17controls→16pairedslots, max49requests/N1/retry0, source clean/exact, nooverwrite, frozenworldclock, actualterminalblindreview như cũ. Driver argument tests thay toàn bộ git/child commands bằng stubs trong temporary directory; không coi chúng là provider/control acceptance.

Future command sau owner yêu cầu chạy và freeze/preregister source/input/config mới:

```powershell
python apps/worker/evals/single-agent-commerce-read-only/full-context-presentation-run-20261026/DISPATCH_DRIVER.py <new-external-output> --compact-v2
```

Đây chỉ là đường chọn config, không permission/current native/livequalification hoặc BGO. V2 quality/latency chưa có generation evidence. Không tự chạy câu lệnh trên trong lượt fix/review này.

Verification: RED observed missing selection export→GREEN; legacyV1 bundle/wires/IDs exact, V2 different IDs/expected compact wires, bad args rejected, mock HTTP selection and single mandatory verifier. Run focused/full commerce evals, Python argument tests and typecheck/lint; same reviewer review exact source, fix findings nếu có. Không thêm case answers, regex semantics/parser/framework hoặc sửa phong cách.

Implementation savepoint:3newNode tests PASS, toàn commerceeval208PASS;2Python driver tests PASS với toàn child/git stubbed; directworker typecheck/lint vàgitdiffcheck exit0. DefaultV1 bundleHash khớp archived registration0fd1893d.0realprovider/API calls. Chờ independent exact-source review trước khi kết luận APPROVE; không claim đã chạyV2 conversation.
