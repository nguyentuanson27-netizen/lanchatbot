# Phase B — sửa execution, ảnh và nghĩa nhận hẹn, 2026-10-24

Status: IMPLEMENTED_AND_SELF_REVIEWED; chưa provider run. Base: 6ec8c445fef69ec6322de14d4f84ddc88d324981. Giữ model tư vấn Gemini 3.5 Flash Lite HIGH và verifier GPT-6.1 Sol HIGH. B chưa GO.

## Bản sửa

1. Owner request thêm execution.phase và callableTools. Lượt cuối FINAL_REPLY có callableTools=[]; availableTools vẫn giữ capability để model hiểu khả năng của luồng. Thay đúng câu hướng dẫn công cụ trong prompt. Giữ mode NONE/0 declarations, native signed history, cap 3 generations/2 rounds/6 calls và controller reject OWNER_TOOL_MODE. Không thêm system coaching từ hội thoại hoặc retry. Đây là sửa sự rõ ràng của input, chưa chứng minh provider hết vi phạm tool mode.
2. MEDIA_COLOR_BINDING_UNVERIFIED của select trả nextSelection bỏ color, giữ subject/intent/component; preparedAttachmentCount=0 cho operation này và giải thích availability chưa biết. Không tự gọi, không đổi ý khách, không nhận ảnh chung là đúng màu. Selector hiện hữu vẫn kiểm nguồn, scope, hash, freshness và final group gate. Source error/view error không cấp nextSelection này. Model vẫn phải gọi selection thật trước khi dẫn ảnh.
3. Owner và verifier phân biệt shop từ chối nhận hẹn với khẳng định chắc ngày hàng đến/trễ. Vẫn chặn lời hứa kịp, sửa ETA, bịa trạng thái hoặc chắc chắn trễ thiếu căn cứ. Ca deadline đang thực thi đổi “sáng thứ Sáu” thành “sáng mai”, neo theo processingAt hiện hữu; không sửa evidence cũ. Nhãn/rubric còn lại giữ nguyên. Prompt hashes cập nhật trong manifest; provider PASS cũ không áp cho prompt mới.
4. Chuẩn bị advice-source-layout-20261024.candidate.json: 4 cặp / 8 outcomes trên captured public worlds của run trước. Tái dùng hash-guarded ownerDescriptions và runner advice-diagnostic hiện hữu. Một mô tả nguồn rút gọn dùng giống nhau cho mọi ca SV2447, không viết câu trả lời mẫu hoặc quyết định theo case. Giữ tơ Hàn thêu, thêu nổi, mềm/thoáng/độ bay và ren tơ Hàn/form nhẹ/độ rũ; bỏ câu quảng cáo trùng. Toàn bộ canonical source vẫn tới verifier. Không bật presentation này trong native/production. Đây là captured-clock replay, không phải live freshness/delivery evidence.

## Self-review và giới hạn

- Observed RED: test final-only thiếu callableTools; test color query thiếu nextSelection. Sau sửa: cả hai GREEN. Test preparation ban đầu sai do structuredClone(AbortSignal) thành object rỗng; đã sửa test dùng cùng signal, không sửa implementation để chiều test.
- Không bỏ native call/signature/history, không sanitize reply sau verifier, không tăng budget, không parser/regex/template hoặc role mới. Runtime media không chọn thay khách và không hứa có asset; action hint chỉ là query có thể thực hiện.
- Không thêm đoạn giọng văn vào owner. Hai chỗ thay trong owner là execution và ETA; verifier chỉ sửa đoạn ETA. Chất lượng tư vấn phải được đối chiếu bằng model, không suy từ test projection.
- Source chart SV2447 vẫn thiếu authority/scope đúng; giữ handoff, không lấy SQ2447 hoặc ép brand. Generic recovery giữ phần giá/ảnh sau verdict FAIL và mixed-intent handoff vẫn chưa triển khai; đây là residual cần thiết kế response group, không được giả đã sửa bằng câu fallback mới.
- Không gọi model trong lượt này, không full A/B, không source publish, deploy hoặc live send. Không reuse controls qualification 362876e8 cho source mới. Các ca service commitment SAFE và khẳng định arrival/trễ UNSAFE cần được đăng ký đối chiếu ở lượt provider mới; unit tests không xác nhận model hiểu ranh giới.

## Commands thực sự chạy

```text
node --test --test-name-pattern='final-only generation exposes' apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
# RED: 0 pass / 1 fail trước implementation
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media.test.ts -t 'offers an explicit unselected'
# RED: 0 pass / 1 fail trước implementation
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-read-only/advice-visual-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-read-only/feedback-controls.test.mjs apps/worker/evals/single-agent-commerce-read-only/feedback-native-gates.test.mjs apps/worker/evals/single-agent-commerce-read-only/delivery-capture.test.mjs apps/worker/evals/single-agent-commerce-read-only/source-layout-preparation.test.mjs
# 102 PASS
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/size-chart-eligibility.test.ts
# 210 PASS
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/image-selection.test.ts src/qdrant-image-channel.test.ts src/size-engine.test.ts
# 64 PASS
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
# cả ba PASS
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/source-layout-preparation.test.mjs
# 12 PASS sau chuẩn hóa byte LF cho prompt và cập nhật hash
 git diff --check
# PASS
```

Recommendation: giữ bản sửa để kiểm provider tiếp; chưa claim naturalness, safety stability hoặc B GO. Không có review độc lập mới trong lượt này.
