# Implementation, RED→GREEN và self-review

Owner yêu cầu fix rồi chạy lại. Intake `40f400e7d3d121fa12da7a2a02ca1cf8fdccb9ee`; `git fetch origin main` thành công, implementationBaseSha vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Giữ branch/PR391, evidence và A OWNER_BYPASS.

## Code sửa tại boundary đang có

- `single-agent-commerce-effects.ts`: sau parse argument, validate allowlist riêng cho REMOVE_LINE, SET_QUANTITY và SET_COMPONENT_VARIANT. Field thuộc action khác bị TOOL_ARGUMENTS trước authorize/effect/CAS, không còn bị lặng lẽ bỏ qua. Không thêm mutation kind hoặc batch framework; hai action hợp lệ tiếp tục dùng batch/transaction/receipt hiện tại.
- `gemini-inference.mjs`: ở successful add/change, chỉ bỏ full `data.cart` khi cart OPEN/VND và projection khớp cả `state.cartItems` lẫn `state.cartQuote`, gồm identity/revision/money/quantity/components. Operation ID, effect flags và receipt vẫn còn. Bản cũ/khác/thiếu readback, non-success hoặc cart khác status được giữ. Native model parts, call IDs/signatures và context gốc không đổi; verifier vẫn nhận original trusted context, raw tool results vẫn đầy đủ.
- Native declarations chỉ thay descriptions, không field/type/tool count. Nêu rõ mỗi cart action làm gì, đổi biến thể và số lượng dùng hai action có thể cùng batch. Rút những hướng dẫn đã lặp trong prompt.
- Owner sửa đoạn hiện có về lý do đúng điều khách lo, giọng chat và phạm vi policy. Không nối lời nhận xử lý vào câu chỉ hỏi thời hạn/phí, không hardcode policy mới. Verifier và tất cả model/config/budget/corpus/fallback giữ nguyên.

Savepoint minimum GREEN: `a2bc12085e8fe4fbb9ad2b3cd91d668c43365466`, trước native description/owner treatment sau đó.

## RED quan sát và kết quả

| Boundary | RED | Minimum GREEN |
| --- | --- | --- |
| Effect action fields | 38 PASS / 3 FAIL: variant+quantity, quantity+size, remove+quantity | 41 PASS, gồm valid two-action batch và duplicate không commit lại |
| Owner projection/bound | 27 PASS / 2 FAIL: full cart trùng vẫn còn; long-signature request bị bound trước dispatch | 29 PASS: one current readback, unchanged/different controls và native signature nguyên vẹn |

Hai lỗi assumption của test được giữ trong log: positive effect test kỳ vọng màu lowercase nhưng domain canonicalize NAVY; đã sửa expectation đúng domain trước khi ghi RED cuối. Một assertion clone cả AbortSignal so với object gốc gây fail ở bước GREEN adapter; sửa so sánh đúng context/contents, vẫn kiểm không mutate và giữ đầy đủ native identity. Đây không phải các bug production được tính vào RED.

## Self-review và headroom

Không thêm role/layer/store/gate, router/parser/regex, semantic repair/reverify, generation retry hoặc production wiring. Runtime thêm 6 dòng guard và 9 dòng projection, reuse existing snapshot/readback/receipt/CAS; không re-verify identity/freshness ngoài boundary code đang sở hữu. Không sửa core policy/state/checkout hoặc fixture để làm source checkout thành công.

Owner prompt: **11.756 → 10.835 bytes**, −921 / −7,83%; hash `0b8f38a8f9f4818ebd993cdabb52a5d0740a2c766082807cbdbea227489f72d8`. Verifier giữ 11.646 bytes/hash `b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24`. Giữ hướng bán hàng, tư vấn tự tin có căn cứ, context, scope/fit/quote/receipt/privacy và tránh checklist. Không rút 44%, đổi giọng sang mẫu cố định, thêm câu trả lời case hoặc giả định prompt ngắn tự tốt hơn.

[Offline check](OFFLINE_COMPATIBILITY.json): reconstitute 60 owner wire captures của run trước, assert toàn owner trusted view và native model parts không đổi, max projection mới **28.342/32.768 bytes**. Không có wire cho invocation đã bị chặn trước dispatch nên không giả lập nó là captured request. Một variation dùng continuation capture cũ với độ dài signature 11.364 ký tự quan sát ở run sau: old treatment **35.052**, new projection **32.484 bytes**. Còn **284 bytes** headroom trong variation đó; chưa chứng minh mọi signature đều vừa. Giữ bound/fail-closed, không cắt encrypted signature, tăng bound hoặc retry. Không provider generation trong check offline, không claim đã cải thiện thực tế.

Official docs đã đọc ngày 2026-10-16: [Gemini function calling](https://ai.google.dev/gemini-api/docs/generate-content/function-calling.md) về function declarations/parameters và [thought signatures](https://ai.google.dev/gemini-api/docs/generate-content/thought-signatures) về giữ nguyên native signed parts trong continuation. Không dùng API/schema feature mới; endpoint và generation config giữ nguyên. Trang Vertex guide timeout, đã đọc official Gemini guide thay thế; không lấy forum làm căn cứ implementation.

## Commands kiểm tra thực sự chạy

```text
git fetch origin main
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker exec vitest run src
pnpm --filter @lana/worker test:evals
node --test apps/worker/evals/single-agent-semantic-verifier/round-56.test.mjs
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
node C:/Users/nguye/AppData/Local/Temp/c3-native-contract-offline-20261016.mjs
git diff --check
```

| Check | Actual result |
| --- | --- |
| Focused effects / adapter | 41 PASS / 29 PASS sau RED |
| Provider/protocol/comparison | 50 PASS |
| Full worker | 130 files / 1.796 PASS |
| Protected claims/reply | 21 PASS |
| Full Node eval, first run | 491 PASS / 1 FAIL / 2 existing optional SKIP |
| Isolated historical round56 reproduction | 7 PASS, không reproduce fallback |
| Full Node eval, repeated after failure | 492 PASS / 0 FAIL / 2 existing optional SKIP |
| Worker typecheck/build/lint | Mỗi command exit 0 |
| Offline projection/native/bound | PASS, 0 provider generations |

Full worker dùng helper junction đã có cho tracked Windows symlink placeholder; helper kiểm absolute target trong workspace, chỉ tạo/xóa đúng junction và restore original bytes. Invocation đầu bằng Windows PowerShell 5 đọc sai UTF-8 path, dừng ở Resolve-Path trước test/mutation. Đã chạy helper qua shell hiện tại và lấy kết quả 1.796 PASS; placeholder được đọc lại đúng `../track-c-c2/v2`.

Full Node first failure thuộc local mocked-provider test trong `round-56.test.mjs`, fallback thay expected reply; không đi qua adapter B vừa sửa. Chạy file riêng và full suite lại đều PASS, không đổi test/fixture/expectation, source hoặc timeout để cứu. Nguyên nhân nội bộ của lần fail đầu vẫn UNKNOWN; không xóa lần fail hoặc claim suite luôn ổn định. Không có live model generations trong các unit tests.

## Controlled PostgreSQL integration

Đã chạy lại cả hai payment-method controls, mỗi loại **24/24 PASS**, **0 provider generations**, cả hai uniquely owned test DB đã drop. [COD raw report](controls/cod.json) / [bank raw report](controls/bank.json). Bao gồm hai mutation cùng batch, exact receipt/delivery, fencing, supersession, private checkout, handoff và rollback bằng synthetic domain data/current captured policy; đây không phải source-backed purchase hoặc provider outcomes.

```text
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-native-contract-cod-20261016 COD
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-native-contract-bank-20261016 BANK_TRANSFER
```

Reports ghi source `a2bc1208`/sourceDirty true vì chạy ở preparation trước commit native descriptions/prompt/docs. Core effect source và compiled guard là code đã test; không claim đây là provider run trên clean sealed HEAD. Dùng [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md) và credential/source-session route đã có, không in secrets hoặc live source mutation.

No shared source change; không claim full-repository `pnpm check` hoặc remote CI PASS. Provider replay chỉ chạy sau freeze/clean source/preflights. Tại preparation, model quality và actual checkout chưa được xác nhận bởi các test này.
