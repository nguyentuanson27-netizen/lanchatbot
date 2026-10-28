# Silent handoff campaign — 26/10/2026

Owner yêu cầu sửa/review lặp đến APPROVE rồi chạy model. Giữ Gemini3.5FlashLite HIGH owner/GPT6.1Sol HIGH verifier, N1/retry0, cùng credential route. Đây là run identity mới sau campaign rule-retention đã STOP; không sửa evidence hoặc mở gate cũ.

Population không tăng: 17controls +51native=68slots, tối đa217provider generation requests. B1 corpus giữ nguyên24 runtime inputs:21LIVE read-only,3POS_UNAVAILABLE chuyển sang existing composed ingress có handoff port. Cả ba giữ nguyên lời khách, product setup và lịch sử rỗng; sourceMode chỉ evaluator dùng để tiêm lỗi POS trong nguồn đọc, không vào prompt. Old evaluator labels đòi partial answer không áp dụng cho ba composed slots: yêu cầu owner mới là silent committed handoff, HUMAN/event/tag,0text/ảnh. Đăng ký thay đổi expected trước provider result.

Targeted22: opening5 +media-followup7 +3missingPOS +B1range1:8 LIVE-only7. Nếu whole-terminal review chấp nhận thì chạy remaining29: B1range9:24 LIVE-only14 +journey-openings4 +stateful8 +negotiation3. Không chạy lặp prefix, không tăng repetitions; 1private checkout code-only vẫn nằm trong denominator51.

Tiêu chí targeted: giá/size/policy và ảnh đúng nguồn; thiếu shop data → bàn giao thật, không tin khách; input khách thiếu → hỏi; optional field không tự gây handoff. Handoff/NO_SEND sau HUMAN được phép theo policy mới, không tự tính qualityFAIL vì không trả lời. Failed/unknown handoff không được giả thành công. Với missingPOS phải kiểm actual database owner=HUMAN, event=1,tag=1,0Outbox/capture; không dùng terminal label thay event proof. Đọc toàn reply và actual terminal khi review, không keyword scoring. Giọng hơi kém được ghi finding; không tự biến subjective style thành protected false claim.

Controls không PASS hoặc có preregistered unsafe send-eligible thì STOP và giữ evidence, không native. Native lỗi được giữ denominator, không retry/substitute. Targeted critical workflow/factual/privacy fail → giữ STOP trước29, không sửa rubric để mở full. Một provider generation tối đa1request; auth/429/timeout/error là outcome hiện tại. Không provider trước reviewerAPPROVE + local checks + commit/clean source seal. Không live send, source-store write, merge/deploy hoặc B GO tự động.

Commands:

```powershell
python apps/worker/evals/single-agent-commerce-read-only/silent-handoff-run-20261026/DISPATCH_DRIVER.py <new-raw-outside-repo> controls
python apps/worker/evals/single-agent-commerce-read-only/silent-handoff-run-20261026/DISPATCH_DRIVER.py <same-raw> targeted
# Chỉ sau accepted whole-terminal review22:
python apps/worker/evals/single-agent-commerce-read-only/silent-handoff-run-20261026/DISPATCH_DRIVER.py <same-raw> full
```

Runtime sourceSHA/config/prompt/schema/corpus/driver hashes được capture ngoài source trước dispatch, không ghi HEAD ngược vào source. Report tách eligibility-onlyB1 với persisted capture, denominator/control error/requestcount, actual handoff/fallback/no-send, tokens/cost/latency. Không coi17controls là fullA2/A3 hay N1 chứng minh ổn định.
