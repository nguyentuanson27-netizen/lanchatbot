# Full B1/B2/B3 repeat — checkout hoàn tất, ba fallback vận hành

2026-10-21. **FULL32_COMPLETE_QUALITY_AND_AVAILABILITY_NOT_COMPLETE**. Owner yêu cầu chạy lại một lần, giữ nguyên implementation/prompt/model/config/corpus. Đủ24B1+8stateful, một lần/ca, không retry hoặc mẫu bù. A vẫn OWNER_BYPASS; chưa live GO.

## Identity

- Implementation `950d05b4d3279089b8c9a91d09e700f59731cdbb`; preparation base `f5f111e1724b4fa9058879862090a72d2e7f3963`.
- Clean run source `89c6965c6a76ceab52380a5c8167c0b946bc06dd`.
- Raw commit `a5b369bc`; primary khóa tại `65cfcbe0`, trước verdict/error diagnosis.
- Owner Vertex global `gemini-3.5-flash-lite`, HIGH; verifier OpenAI/Codex login `gpt-6.1-sol`, high, CLI0.159.2, không tool. Exact generation config/credential route trong REGISTRATION.json và child registrations.
- Owner prompt `644d4535c9a2f73d5ef0203ddd2a6ce5b157a2cc51e62327ea5b14a623d1d361`,13.538bytes; verifier `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
-14frozen files giữ nguyên. Runtime/code/prompt không đổi so vòng76d821bb, cùng implementation950d05b4; đây là repeat, không phải một bản fix mới.

## Actual customer outcomes

| Population | Đã ghi | USABLE | NEEDS_EDIT | UNUSABLE do provider | Control |
| --- | --- | --- | --- | --- | --- |
| B1 | 24/24 | 20 | 1 | 3 | 0 |
| Stateful | 8/8 | 7 | 0 | 0 | 1 HUMAN |

[Toàn bộ32hội thoại](CONVERSATIONS_AND_REVIEW.md), [các ca chưa đạt/fallback](FAILURES_AND_REVIEW.md), [primary](PRIMARY_REVIEW.json). Reviewer là agent, không blind/human adjudication. USABLE chấp nhận polish nhỏ; không chấm keyword, tính từ, ngoặc hoặc ép phương án rẻ nhất. Primary dùng actual terminal/history/public state, giữ nguyên sau khi đọc diagnosis.

**Ba fallback đều là lỗi vận hành, không phải semantic FAIL:**

| Ca | Role lỗi | Lỗi | Kết quả khách nhận |
| --- | --- | --- | --- |
| B1–11 | Verifier Sol High | HTTP200 nhưng stream có event error, PROVIDER_STREAM_ERROR | Fallback tĩnh |
| B1–13 | Verifier Sol High | HTTP504 | Fallback tĩnh |
| B1–14 | Owner Gemini High | HTTP429, chưa có final draft | Fallback tĩnh |

Hai draft trước verifier error vẫn giữ trong FAILURE_DIAGNOSIS.json, không gửi chưa verify, không tính chúng thành câu thành công. Không gọi đây là verifier chặn quá tay: hai lượt không trả verdict. Không thay model hoặc chạy lại generation.

**B1–9 còn sai:** “mặc ra sân vườn đứng lâu cũng dễ chịu, không bị nặng hay bí người”. Trusted context chỉ có mô tả tơ/ren mềm, thoáng, nhẹ và độ bay/rũ; không xác nhận cảm giác của người dễ nóng khi ở ngoài trời lâu. Model biến nhận xét chất liệu thành lời bảo đảm theo đúng hoàn cảnh sử dụng khách nêu. Đây vừa là lỗi tư vấn chưa giải quyết lựa chọn trang phục, vừa là protected-language overclaim được verifier PASS. Ghi nhận1observed send-eligible overclaim ở vòng này theo review agent; không tuyên bố zero observed false PASS hay verifier đã chứng minh an toàn. Không yêu cầu phép thử cho mọi lợi ích; ranh giới nằm ở lời bảo đảm hiệu quả cụ thể.

**Stateful hoàn tất:** thêm beM×1 → đổi beL×2 → tổng978100 (998000−49900+30000) → sửa eo74/mông96 giữL → code-owned checkout invitation → private ORDER_PREVIEW/COD/pre-order/ETA8–14 → PURCHASE_CONFIRMED và tin chuyển nhân viên. Lượt8 là HUMAN silence control trong journey riêng. Hai model NO_SEND có actual code messages, không phải mất phản hồi hoặc fallback. Không có đơn POS hay live Meta send. DB thử mới đã xóa.

## So với vòng trước, cùng implementation

Trước (source76d821bb): B123USABLE/1NEEDS_EDIT,0fallback; stateful4USABLE/1UNUSABLE/2dependent blocks/1control. Lần này B120/1/3fallback; stateful7USABLE/1control.

- Ba caB1–11/13/14 chuyển USABLE → fallback vì provider errors. Điểm giảm ở đây không chứng minh prompt tư vấn kém đi.
- LỗiGemini429 ở bước checkout vòng trước không lặp lại tại bước đó; lần này cả hành trình đi tới xác nhận. Một mẫu thành công không chứng minh recovery/availability đã được sửa: không có code fix mới,429 xuất hiện ởB1–14.
- B1–4 vẫn trả799k cả bộ trước, không hỏi lại bộ/lẻ; còn tự thêm giá lẻ. B1–21 tiếp tục trả bán lẻ/cònM/499k rồi dừng, không mời giỏ ngoài capability. Đây là biểu hiện tốt lặp lại, chưa chứng minh ổn định toàn corpus.
- B1–9 vẫn tái diễn và lời trấn an mạnh hơn vòng trước: hết đoạn quạt mini nhưng lại khẳng định không bí khi đứng lâu. Rút ngắn câu không đủ cải thiện nội dung.
- B1–15 lần này khuyên mua cả bộ, có lý do tách phối ngày thường; B1–23 cũng chọn cả bộ để có thêm cách mặc tiệc và vẫn dùng áo với váy đen. Upsell hợp lý không tự thành lỗi. Câu tiết kiệm hơn mua lẻ ởB1–15 cần hiểu/viết rõ đang so mua riêng cả hai món, không phải799k rẻ hơn chỉ áo499k.
- B1–17 chọn áo499k phối quần âu/váy cơ bản cho gặp khách, lời khuyên cụ thể hơn. Stateful–4 bỏ báo cập nhật số đo, chỉ xác nhận giữ2áoL; không đọc lại hồ sơ. B1–3 bỏ văn phong tham khảo chất liệu giúp em; B1–19 còn chữ hệ thống.
- Giọng chưa đều: các ca7/15/23 vẫn mở bằng budget/giả định, nhiều lời khen và đoạn giải thích dài; ghi polish khi lựa chọn vẫn hữu ích. B1–1 chọn V168 nhưng ít hằn nếp hơn hẳn còn mạnh; nguồn có chất liệu/2lớp/đứng form, không có so sánh chống nhăn trực tiếp. Đây là finding cần owner xem phạm vi inference, không thêm nhãn FAIL chỉ vì không có test riêng.

COMPARISON.json giữ từng ca và historical primary bất biến. Hai vòng cùng cấu hình vẫn là ít mẫu, nguồn đọc live; không có kết luận nhân quả hay stability GO.

## Requests, latency và audit

-85generation requests =58owner+27verifier; mỗi attempt1upstream, retry0.3errors/85 (3,53%):1owner429,2verifier lỗi. Client TIMEOUT0, nhưng có upstreamHTTP504 (gateway timeout), không che nó trong số lỗi.
- Verifier25PASS/2provider errors/0FAIL. B121SEND_ELIGIBLE+3FALLBACK; stateful4SEND_ELIGIBLE+2NO_SEND(có code outcome)+2HANDOFF(gồm1silence control). Final fallback3/32=9,375%, hoặc3/24B1=12,5%; handoff2/32, modelNO_SEND2/32. Không loại lỗi khỏi denominator.
- Owner known input237226/output37555, thiếu usage đúng1lượt lỗi; verifier109971/2068, thiếu usage2lượt lỗi. Có usage82/85, không ước tính phần thiếu; costNOT_EXPOSED.
- Verifier latency p50 **7486,37ms**, p95 **16788,85ms**, n27 gồm lỗi; owner per-generation p50 **2551,67ms**, p95 **5700,75ms**, n58. Đây là hai workload khác nhau.
- Added verification/readback B1 p50 **7440,54ms**, p95 **14862,47ms**, n23; stateful p50 **13757,83ms**, p95 **32110,06ms**, n4. Không gồm setup/source build của child.
- Embedding2requests: source-check1+B1final cumulative1+stateful0. Không cộng lặp cumulative counters.
-58exact owner prompt captures,27verifier bindings recomputed,89wire bodies audit,0evaluator-label leaks,25exact eligible text matches.45published raw hashes và45Git blob hashes khớp;37exact copies+8public attempts chỉ bỏ private synthetic ingress batch. Nguồn gốc task-temp giữ lại. Scoped attributes giữ CRLF/trailing spaces của evidence, không sửa lời model.
- Fresh source/provider preflight PASS, fresh stateful DB dropped. Reuse COD28/28+BANK28/28 từ source76d821bb vì runtime/adapter/config không đổi; **không claim chạy lại hai job deterministic đó**. Tests147PASS/build của implementation950d05b4 giữ nguyên; entrypoint tự build trước khi dùng dist, không thêm full suite/lint/typecheck mới.

## Commands thực sự chạy và disposition

```text
python apps/worker/evals/single-agent-commerce-read-only/full-b123-20261021-offer-capability-repeat/run.py C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py C:/Users/nguye/AppData/Local/Temp/c3-full-b123-20261021-offer-capability-repeat
```

Exit0;4child commands exit0: provider-preflight/source-check/stateful-1/b1-1. Exact args/logs ở raw/commands.json và raw/*.log. Collector exit0 là đủ outcome, không có nghĩa mọi ca đạt chất lượng.

Collection/review/audit: task-temp c3-gemini-prompt-once-publish.py, c3-gemini-prompt-once-primary.py, c3-full-b123-metrics.py, c3-offer-capability-repeat-report.py, c3-full-b123-repeat-audit.mjs; one-off hash/secret/Git-blob comparisons. Chỉ sửa scope mới trong offline audit để kiểm DB mới thực sự có, không tạo chứng cứ COD/BANK giả. Primary khóa trước diagnosis; runtime/config/prompt không đổi trong hoặc sau run.

**STOP_AT_OWNER_REVIEW.** Không tự chạy lại3fallback, không sửa prompt/verifier từ một câu đơn lẻ. Nếu xử lý tiếp, tách provider availability khỏi ranh giới bảo đảm cảm giác sử dụng; giữ no-retry/fail-closed và inference thẩm mỹ/chất liệu thông thường. Complexity delta:0runtime role/gate/tool/parser/state/framework mới; chỉ registration/copywrapper/evidence/report. Không deploy/live send/promotion.
