# Phase B — áp dụng policy vào tình huống khách — 2026-10-20

Implementation base: `ab57daa2a1ebd73e4505025cf5ff9fb67281c07b`. Scope: sửa file sau review độc lập; không chạy provider.

## Finding và thay đổi

Ca `b1-policy-used-v2` trong full-b123-20261020: khách đã mặc thử năm phút; owner đồng ý đổi rồi đọc điều kiện chưa sử dụng/chưa giặt/sạch/nguyên tem/nguyên vẹn. Request có đủ policy; verifier từ chối đúng theo cách hiểu chỉ ướm/không mặc owner đã chốt. Không phải thiếu retrieval hay keyword điều kiện.

Review chỉ ra `3cff648b` đã bỏ diễn giải HOLD_UP_ONLY khỏi owner, trong khi verifier vẫn giữ. Đây là khác biệt hướng dẫn có bằng chứng; chưa chứng minh nó là nguyên nhân duy nhất hoặc bổ sung nghĩa sẽ làm output ổn định. Inspection gốc nói về kiểm hàng; không từ đó tạo quy tắc từ chối mọi đổi/trả, đặc biệt trả do lỗi shop.

- `publicPolicyLiteral` bổ sung `customerCare.inspection.tryOnModeDescription` khi nguồn có `HOLD_UP_ONLY`: “Chỉ ướm bên ngoài, không mặc vào người.” Chỉ giải nghĩa mã, không quyết định eligibility. Nguồn thiếu customerCare vẫn null; không mở shared schema/thêm enum giả.
- Giữ nguyên quy định exchange/returns, mã, thời hạn/phí và sourceVersion/ref/observedAt/expiry. Tool và trusted snapshot dùng cùng literal qua đường hiện có. Nội dung diễn giải nằm trong snapshot/binding; sourceVersion tiếp tục nhận diện nguồn upstream, không tự thành hash phần diễn giải.
- Thay section Chính sách owner: áp dụng vào việc khách đã nêu trước khi đồng ý; điều kiện khác không xóa việc đã bị loại trừ; chỉ hỏi điều có thể đổi kết luận; phân biệt hỏi thời hạn/phí với xác nhận quyền trong tình huống cụ thể, đổi hàng với trả do lỗi shop.
- Không nhét policy shop/câu mẫu vào prompt. Giữ giới hạn capability hiện có; không thêm gate/regex/parser/role/repair loop/state mới. Verifier/models/fallback/corpora và nhãn/raw lịch sử không đổi.
- Self-review so byte: chỉ section Chính sách thay; manifest chỉ đổi ownerHash. Prompt 10.044→10.523bytes (+479), SHA256 `28790ea5eaf56bd5a51f4aa8cc7089d6a51f057f334d04f1cd95114f7070d133`. Độ dài không phải quality gate.

## Commands thực sự chạy

1. `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts -t 'explains the inspection code'`: observed RED 2FAIL/42skip do thiếu nghĩa; sau sửa → GREEN 2PASS/42skip.
2. `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts`: **213PASS/0FAIL/0skip**.
3. `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs`: **59PASS/0FAIL/0skip**. Lần đầu 58PASS/1FAIL do test đọc nhầm result.providerRequests thay vì result.telemetry.providerRequests; sửa test theo contract hiện hữu, không đổi adapter.
4. `pnpm --filter @lana/worker typecheck`: **PASS**, gồm dependency prebuild.
5. `pnpm --filter @lana/worker exec tsc -p tsconfig.json`: **PASS**, build worker sau dependency prebuild; không nhận đã chạy lại wrapper pnpm build.
6. `pnpm --filter @lana/worker lint`: **PASS**.

Hai fixture đi qua resolver thật với 15ngày/30k và 7ngày/25k: tool/snapshot cùng projection, giữ nguyên nguồn/returns/provenance/orderEligibility:null; readback không đổi giữ binding, nguồn bỏ customerCare thì bỏ nghĩa và invalidates binding cũ. Captured HTTP test dùng stub local kiểm nghĩa trong trusted policy/native tool response, không mutate input và không leak evaluator canaries. Không có upstream provider request.

Không chạy toàn suite/PostgreSQL/provider trong lượt sửa này; local tests không chứng minh model đã áp dụng đúng hoặc giọng đã tốt hơn.

## Kiểm tra model tiếp theo — chưa freeze/chưa chạy

Đề xuất 8 lượt: ca gốc×3; chỉ ướm×1; cách thử chưa rõ×1; hỏi thời hạn/phí×1; báo lỗi sản xuất×1; cùng câu hỏi thời hạn/phí với snapshot hợp schema khác×1. Không tạo policy cho mặc thử vì schema hiện chỉ có HOLD_UP_ONLY.

Chấm actual outcome trước rồi chẩn đoán draft/verifier, kiểm cả đồng ý sai/từ chối quá tay, giọng và bước tiếp theo thực hiện được. Freeze inputs/executable và clean source trước provider. Chưa nhận đã hết fallback/cải thiện ổn định; A vẫn OWNER_BYPASS, B chưa live GO.

## Revision sau run 8 lượt — 2026-10-20

Implementation base: `e081d3e97701656548ffbdba54211fade9bdc7f8`. Owner yêu cầu sửa theo review lịch sử. Phần trên ghi bản sửa trước; run đó đã hoàn tất, 3 USABLE / 5 fallback, ca mặc thử sai cả 3 lần. Không đổi evidence hoặc nhãn của run.

### Vì sao sửa tiếp

- `bounded-source-run-20261018` và hai lượt lặp ngày 18/10 xử lý đúng cùng `b1-policy-used-v2`. Đối chiếu request với `full-b123-20261020`: cùng latest/history, Gemini 3.5 Flash Lite HIGH/config và policy sourceVersion `84302ec1478263a9e32739d767c0899d9f32b7ef22e8252774cbfe4c85941e86`.
- Commit `3cff648b` thay prompt owner đã bỏ phần giải nghĩa HOLD_UP_ONLY và quan hệ với điều kiện đổi hàng. Hai run `gemini-prompt-once-20261019` và `current-prompt-rerun-20261019` dispatch B1 1:4, không chạy ca 16 này. Có bằng chứng hồi quy và thiếu coverage, chưa chứng minh prompt là nguyên nhân duy nhất.
- Bản `89ab6cc6` đưa nghĩa mã vào context nhưng chưa diễn đạt quan hệ với exchange. Run 8 lượt xác nhận context đến model, owner vẫn cho đổi. Unit tests đúng serialization không chứng minh model áp dụng đúng.

### Thay đổi lần này

- Mở rộng **field giải nghĩa hiện có**, không thêm schema: khi nguồn vừa có `inspection.tryOnMode=HOLD_UP_ONLY` vừa có `exchange.requiredConditions.unused=true`, giải thích mặc thử không đáp ứng điều kiện chưa sử dụng; còn tem/chưa giặt/chưa ra ngoài không thay thế điều kiện đó. Nói rõ giới hạn thuộc exchange, không tự loại quyền trả do lỗi theo returns.
- Đây là diễn giải quan hệ nghiệp vụ owner đã chốt, được code đưa vào projection theo các giá trị nguồn; **không phải một field vốn đã có trong PostgreSQL**, không phải kết luận eligibility cho khách. Không đọc câu khách bằng code. Khi `unused=false` không thêm diễn giải loại trừ đổi hàng; không suy ra mặc thử được phép. Khi customerCare=null không có diễn giải.
- Giữ các số ngày/phí/actions/điều kiện/returns từ nguồn và nguyên provenance. Nội dung giải nghĩa tham gia exact snapshot binding, dù upstream sourceVersion giữ nguyên. Tool, owner và verifier nhận cùng policy literal.
- Owner: chỉ thay section Chính sách, phân biệt quyền đang hỏi → đối chiếu hành động → trả lời trực tiếp hoặc hỏi điều phân biệt còn thiếu. Khách báo lỗi chưa phải shop xác nhận lỗi/duyệt xử lý. Hỏi thời hạn/phí vẫn trả gọn; không ép checklist hoặc lời từ chối mặc định.
- Verifier prompt, giọng/tư vấn, models, fallback, corpus, adapter và production entrypoint không đổi. Không thêm regex, ví dụ đáp án, gate, role hoặc repair loop.

### Verification và giới hạn

- RED observed: focused test projection **2 FAIL / 1 PASS / 42 filtered-out** trước implementation. Hai FAIL vì thiếu quan hệ inspection/exchange; control unused=false đã PASS.
- GREEN: 7 focused Vitest files **214 PASS**, gồm các trường hợp 15 ngày/30k, 7 ngày/25k, unused=false, missing customerCare, giữ returns/provenance và invalidation khi nghĩa snapshot đổi.
- Adapter/protocol **59 PASS**: captured owner HTTP body và verifier request giữ cùng policy text, evaluator canaries không lọt vào request. Đây là local stubs, không phải provider verdict.
- Worker typecheck/build/lint: PASS; commands bên dưới.
- Self-review: dữ liệu nguồn không bị mutate; không blanket-deny returns; không viết policy ngày/phí vào owner prompt; không biến customer report thành shop-confirmed defect. Phần diễn giải vẫn là giả thuyết sửa hành vi, chưa có model evidence mới.
- Byte comparison: chỉ section Chính sách owner thay; verifier/corpus nguyên byte, manifest chỉ owner hash đổi. Owner 10.523 → 11.041 bytes (+518), SHA256 `b1d692e798e351a8f963c74a13de92d061c2b75bf0f48a7d675f66fd2b9d6d73`. Complexity delta: mở rộng một field hiện có và một nhánh boolean nguồn, không thêm layer/schema/state.

Commands thực sự chạy cho revision này:

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts -t 'explains inspection and exchange together'
  RED: 2 FAIL / 1 PASS / 42 filtered-out
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts
  GREEN: 214 PASS / 0 FAIL / 0 skip
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
  59 PASS / 0 FAIL / 0 skip
pnpm --filter @lana/worker typecheck
  PASS, includes dependency prebuild
pnpm --filter @lana/worker exec tsc -p tsconfig.json
  PASS, worker build after dependency prebuild
pnpm --filter @lana/worker lint
  PASS
```

Không chạy toàn suite/provider hoặc truy cập PostgreSQL trong revision này. Kiểm tra source preservation không thay được đánh giá whole-turn của model.

### Lần đo tiếp theo — chưa chạy

Giữ cùng model/config/context mới cho hai arm; chỉ thay section Chính sách owner giữa đoạn trước `3cff648b` và candidate. Ca gốc ×3 mỗi arm, thêm 5 control candidate đã có trong run 8 (chỉ ướm, thử chưa rõ, thời hạn/phí, lỗi shop, snapshot thời hạn/phí khác): **11 lượt**, không thêm case vào corpus lâu dài. Control cũ phải được trích từ Git và hash trước run; evaluator labels không vào request.

So sánh này kiểm tác dụng section prompt dưới cùng context mới, **không tách được tác dụng riêng của context so với run lịch sử**. Giữ toàn bộ denominator, không best-of-N. Nếu candidate còn sai hoặc có false PASS thực chất, dừng, không tự patch/chạy tiếp. Chỉ sau nhóm nhỏ đạt mới đăng ký full 24 B1 + 8 stateful; khi thay toàn bộ prompt phải giữ các ca policy trong coverage.

Lượt sửa file này không chạy provider, không freeze run mới, không đổi policy upstream hay live send; A vẫn OWNER_BYPASS, B chưa live GO.
