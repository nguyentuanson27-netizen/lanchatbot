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
