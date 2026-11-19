# Báo giá hỗ trợ trước giỏ — chạy đủ J4 ×5 và hai áo ×5

Ngày 18/11/2026. Source thực thi sạch **`98bff18b1941663c62120a044d71f45b430e2e47`**, gồm code đã review `ecdbf325` và tài liệu. Chạy đủ **10 hội thoại / 30 lượt**: **29 SEND_ELIGIBLE, 1 HANDOFF im lặng, 0 NO_SEND**, không gửi tin thật.

**Cơ chế báo giá hỗ trợ trước giỏ hoạt động trong 10/10 lần.** Chấm mù GPT-6.1 Sol High: **J4 5/5**, **hai áo 4/5** đạt wholePass. Một lượt hai áo bị verifier chặn khi khách hỏi tổng dù ledger đã có ưu đãi. Đây là kết quả hai ca development, **Phase C vẫn STOP**, chưa phải qualification đầy đủ hoặc chứng minh giọng đã ổn định.

[Toàn bộ 30 lượt và verdict](CONVERSATIONS.md) · [Kết quả chấm mù](BATCH_JUDGE_RESULTS.json) · [Review tác giả](AUTHOR_REVIEW.json) · [Tổng hợp](SUMMARY.json) · [Cấu hình và nguồn](PROVENANCE.json).

## Kết quả cơ chế mới

| Ca | Kết quả thực tế |
| --- | --- |
| J4 ×5 | Cả năm lần trả lời ngay lời xin hỗ trợ bằng miễn ship 30.000đ và **499.000đ cả ship** cho một áo. Lượt hỏi gửi Cần Thơ tiếp tục giữ đúng 499.000đ. Không cần tạo giỏ/chọn màu để biết mức này; không tạo giỏ khi khách chưa chọn màu. |
| Hai áo ×5 | Cả năm lần báo **948.100đ trước giỏ**, gồm giảm 5% và miễn ship. Khi khách chọn trắng, cả năm giỏ đều có đúng hai áo M trắng, một lần activation và tổng **948.100đ** khớp quote trước đó. Không trừ ship lần hai. |

Có 15 lượt verifier nhận canonical quote hỗ trợ: 10 lượt J4 và năm lượt đầu control. Quote vẫn NOT_GRANTED/receipt=null, chỉ cho phép đề nghị mức giá; effect sau mua dùng biên nhận thật. [Audit quote và giỏ](SUPPORT_QUOTE_AUDIT.json), [receipt](PENDING_RECEIPT_AUDIT.json), [mức từ policy đã tính trước run](EXPECTED_POLICY_QUOTES.json).

Trong audit kỹ thuật, `finalPendingStatus=null` nghĩa public state không expose field pending; không chứng minh lời xin đã biến mất. Pending/activation được đối chiếu bằng canonical quote và các receipt trong ledger.

Thay đổi giải quyết đúng nút thắt vừa chốt: bot có mức cụ thể để bán hàng thay cho “lên giỏ rồi shop xem hỗ trợ”. Chưa giải quyết hết cách hỏi tiếp hoặc bằng chứng được cấp cho verifier ở lượt sau.

## Lượt handoff và nguyên nhân

**Hai áo lần 3, lượt 3.** Khách: “Cả ship hết bao nhiêu em?”

Draft bị chặn:

> Dạ, tổng thanh toán gồm cả ship của chị là 948.100đ ạ. Phí ship 30.000đ đã được shop miễn phí hoàn toàn rồi chị nhé. Chị chốt đơn luôn giúp em nha?

Verifier trả EFFECT_WITHOUT_RECEIPT vì `effectReceipts=[]`, dù `cartQuote.appliedAdjustments` đã có FREE_SHIPPING 30.000đ. Actual terminal là HANDOFF không gửi tin; điểm toàn hành trình lần này giữ FAIL.

Đối chiếu ledger: CART_OPENED và NEGOTIATION_EVENT đã thành công từ lượt trước; tổng giỏ 948.100đ và các adjustment đúng. Ở lần 4, context cũng không có effectReceipts, nhưng câu “mình được miễn phí ship luôn rồi” lại PASS. [Hai context và receipt trong ledger](RECEIPT_CONTEXT_COMPARISON.json).

Nguyên nhân quan sát được gồm **thiếu receipt liên quan trong projection lượt mới** và **verifier phân biệt lời mô tả quyền lợi hiện hành với claim thao tác chưa nhất quán**. Không phải shop thiếu policy hoặc code tính sai tổng. Theo toàn bộ ledger, đây là từ chối thừa về trải nghiệm; không gọi là thiếu biên nhận thực tế hoặc unsafe false PASS.

Hướng xử lý tiếp theo nên làm đúng ở ranh giới bằng chứng: cấp readback/receipt đã kiểm khớp giỏ hiện hành cho việc mô tả ưu đãi được giữ từ lượt trước; giữ receipt bắt buộc cho claim thao tác mới. Không phát lại activation hay ghi state chỉ để tạo receipt mới, không thêm regex cho các từ “đã/được”. **Chưa sửa thêm hoặc chạy lại lượt này.**

## Review toàn bộ lời thoại và dùng tool

J4 trả lời gọn hơn về đúng điều khách cần: mức hỗ trợ và tổng tiền. Hỏi màu vẫn có ích cho bước mua vì khách chưa chọn, nên không tự chấm trượt chỉ vì câu hỏi được lặp sau lần khách chuyển sang hỏi giá.

Nhóm hai áo còn các điểm không nên bị che bởi điểm task-pass:

- **4/5 lượt đầu hỏi lại mua/thêm giỏ** dù khách đã nói lấy hai áo. Chỉ lần 2 hỏi màu ngay, nhưng có lỗi gõ “chơn”. Kịch bản tiếp theo tự cung cấp trắng nên hành trình vẫn chạy được, chưa chứng minh câu hỏi đầu dẫn khách tốt.
- Lần 2/3 vẫn nói “hệ thống áp dụng”; lần 5 liệt kê nhiều khoản và lặp lời mời chốt ở các lượt sau. Judge chấp nhận mức giọng này, review tác giả giữ nó là hạn chế; không tuyên bố đã hết cảm giác máy móc.
- **J4 lần 3 và 4** gọi record_negotiation mới cho câu chỉ hỏi tổng ở lượt cuối, với intent PRICE_OBJECTION. Code xác thực được đúng source text nhưng không thể tự chứng minh model đã hiểu đúng ý định. Có hai pending record ở hai hành trình này. Mức vẫn ở lần phản đối đầu, không tăng hỗ trợ hoặc có thêm grant, nhưng state write và tool use còn dư. Không nên xử lý bằng parser/regex câu khách.
- Hai áo lần 5 gọi RECORD bị từ chối và đọc/quote lặp trước khi ADD thành công. Trình tự cuối vẫn đúng và không ghi ưu đãi hai lần; chưa gọi tool use ổn định chỉ vì khách nhận đủ câu trả lời.

[Toàn bộ tool args](TOOL_CALLS.json) và [audit rút gọn](PUBLIC_AUDIT.json) giữ đủ các lần gọi bị từ chối. Điểm judge nguyên gốc giữ nguyên, không đổi rubric sau khi nhìn kết quả và không chạy lại mẫu khó.

## Kế toán, lỗi và thời gian

**90 request native** = 60 owner + 30 verifier; **10 judge**, tổng **100 model HTTP**. Đủ 90 STARTED khớp 90 kết quả native, không unknown completion. Mọi request và lỗi vẫn nằm trong mẫu số. [Kế toán đối soát](GENERATION_ACCOUNTING.json), [phép đo](OPERATIONAL_METRICS.json).

- Không lỗi HTTP transport, timeout, BUILD hoặc admission; tất cả owner frame trong bound 70.000, lớn nhất **69.015 byte**. [Kích thước từng frame](REQUEST_SIZE_AUDIT.json).
- Có **một HTTP 200 MALFORMED_FUNCTION_CALL**, J4 lần 2 lượt 1. Runtime dùng **một bounded owner retry theo policy đã duyệt**, rồi tiếp tục trong trần ba owner generation/lượt; lần đó vẫn đủ cả ba owner + một verifier, không vượt tổng 120 native đã đăng ký. Không có transport retry hoặc thay model. Lỗi malformed giữ nguyên trong kế toán.
- Bản MEASUREMENT_CONTRACT tự viết có field `automaticGenerationRetry=0` quá rộng so với policy runtime đang được owner duyệt trong repo. Giữ nguyên bản prereg này và ghi rõ sai khác; **không claim zero generation retry hoặc toàn bộ field prereg đều khớp**. Models/config và retry policy source không được đổi trong run.
- Helper summarize cũ gộp mọi ERROR thành “local build rejection”, nên đếm nhầm completion malformed thành một lỗi BUILD. SUMMARY công khai đã đối soát theo failureLayer/providerRequests, giữ SUMMARY gốc trong local run; đây là sửa nhãn thống kê, không sửa kết quả generation.
- Sáu DB model và DB chụp initial state đều đã dọn. Không shop-source write, deploy hoặc live send.

| Phép đo | p50 | p95 | Input token | Output token |
| --- | --- | --- | --- | --- |
| Owner adapter, 60 HTTP | 5,17 giây | 12,64 giây | 825.637 | 56.996 |
| Verifier adapter, 30 HTTP | 7,59 giây | 11,28 giây | 332.756 | 3.957 |
| Thời gian bước verification trong runtime, 30 lượt | 11,03 giây | 15,53 giây | — | — |

Judge dùng 461.448 input / 3.468 output token. Cost không expose. Handoff 1/30 = **3,33%**; fallback/static reply và NO_SEND đều 0. Verifier 29 PASS/1 FAIL, không timeout hoặc provider error. Không đồng nhất thời gian adapter với tổng thời gian bước verification có readback/gate.

## Nguồn, cách chấm và phạm vi kết luận

World mới **`4c84080583bf34204156718464c52a1fb33b868d0c48c6b52a96527730cccfbf`**, chụp 16:00:35 ngày 18/11 theo Asia/Saigon, 107 sản phẩm. Snapshot mục tiêu chụp 15:59:59, freshness hiện hành 7.200 giây; chạy theo đồng hồ thật, không làm mới timestamp giả. Giữ các giả định test về màu/feedback/media đã được owner duyệt; không trình bày chúng thành xác minh hàng thật. [Verification](VERIFICATION.json).

Owner Gemini 3.5 Flash Lite High; verifier và offline judge GPT-6.1 Sol High, cùng login route/config hiện hành. Source, prompt hashes, corpus/registration/world và helper hashes được khóa trước generation. Preflight sáu job PASS, chụp initial state bằng store thực, không generation. Lời khách và N=5 mỗi ca giữ như lượt whole-journey trước.

Tiêu chí evaluator và judge được cập nhật **trước model run** để công nhận quote hỗ trợ trước giỏ thay vì bắt giữ tổng cũ 529.000đ/978.100đ. Khoản đã tính phải đúng quote hiện hành; claim đã thao tác vẫn cần receipt. [Hợp đồng prereg](MEASUREMENT_CONTRACT.json), [judge identity](BATCH_JUDGE_IDENTITY.json), [đối chiếu input](COMPARISON_INPUTS.json). Không phải phép A/B cùng source/prompt/world; không so trực tiếp điểm 1/6 ở replay trước với 9/10 hành trình lần này.

So với vòng whole-journey 70.000 byte trước: J4 giữ 5/5, hai áo từ 5/5 còn 4/5 vì handoff ở lượt sau. Điểm tiến bộ cụ thể là **khách biết mức hỗ trợ trước giỏ** trong cả mười lần; chưa có tiến bộ đủ rõ về giọng hoặc bước hỏi màu của control. Ngưỡng task tối thiểu 4/5 đạt ở hai ca theo judge, nhưng các finding còn lại và toàn bộ Phase C chưa được đo lại, nên không đề xuất Phase C GO.

### Lệnh thực sự đã chạy

Local run: `C:/Users/nguye/Documents/Sản phẩm AI/c3-precart-support-native-98bff18b-20261118-160005`. Helper source giữ trong [helpers](helpers); source runtime không sửa trong lượt đo này.

```powershell
pnpm --filter @lana/worker exec tsc -p tsconfig.json
pnpm --filter @lana/worker lint
node --test --test-reporter=dot apps/worker/evals/single-agent-commerce-read-only/owner-result-meaning.test.mjs apps/worker/evals/single-agent-commerce-qualification/candidate-provider.test.mjs apps/worker/evals/single-agent-commerce-read-only/preparation-admission.test.mjs
$taskRun = Get-Content ../c3-precart-support-active-20261118.txt
python ../c3-precart-support-launch-20261118.py node apps/worker/evals/single-agent-commerce-qualification/capture-world.mjs "$taskRun/world" "$taskRun/CODES.json" --test-media-proof-world ../c3-convergence-model-world-20261111-10/WORLD.json
python ../c3-precart-support-launch-20261118.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs "$taskRun/initial" COD --phase-c-initial-world "$taskRun/world/WORLD.json"
node "$taskRun/seal.mjs" "$taskRun"
node "$taskRun/judge.mjs" freeze "$taskRun"
python ../c3-precart-support-launch-20261118.py python ../c3-precart-support-session-20261118.py
node "$taskRun/audit.mjs" "$taskRun"
node ../c3-precart-support-audit-20261118.mjs "$taskRun"
node "$taskRun/judge.mjs" prepare "$taskRun"
node "$taskRun/judge.mjs" run "$taskRun"
python "$taskRun/summarize.py" "$taskRun"
python "$taskRun/publish.py" "$taskRun"
git diff --check
```

Compile/lint và 38 Node tests PASS; capture/initial/seal/freeze/session/audit/judge/publish đều exit 0. Một lệnh preflight policy dạng inline ban đầu import package từ sai workspace root, đã sửa sang dist path trước generation, provider 0. Không claim chạy lại suite 759/155 của lượt implementation trong lần model này. Không có review giữa các ca hoặc patch runtime để cứu kết quả; chỉ review toàn bộ sau khi đủ 30 lượt.
