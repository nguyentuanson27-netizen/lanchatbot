# Checkpoint B — focused decision/scope observation

**FOCUS18_COMPLETE_STOP_BEFORE_FULL**. Đủ6ca B1 có sẵn ×3 =18lượt. Primary10USABLE /7NEEDS_EDIT /1UNUSABLE. Điều kiện tiếp tục full chưa đạt; **không chạy24B1+8stateful**. Không tự fix hoặc chạy vòng thứ hai.

## Identity và bằng chứng

- Implementation2470a79da74081fe16cb04debd34cf8f18c61316; runtime runSourceSha e2474d0df2f24e1600d3815e4baf8b926f02b703, clean trước dispatch. Nguồn SHA ghi ngoài frozen source.
- Raw commit176b2c95; primary lock01fa3d4b trước diagnosis. REGISTRATION.json giữ exact config/hashes; PRIMARY_LOCK.json, ARTIFACT_INDEX.json và SOURCE_AND_WIRE_AUDIT.json giữ chain.95raw public files byte-for-byte, gồm20logs được force-add vì global ignore;95Gitblob hashes khớp.
- Owner Vertex global gemini-3.5-flash-lite HIGH; verifier OpenAI/Codex gpt-6.1-sol high, CLI0.159.2. Generation configs/request bounds/schema/fallback theo frozen manifest. Không đổi provider/effort hoặc substitute.
- Owner prompt SHA256 e10fad7aa815038e0bb1d48ac4bc97e4d4913227807b14f40d7f8ee881eddee5; verifier0b240599a04d9a86c25ed2b3b815c152e83106c85e61940efde15b020e4c2fde; schema76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97. Corpus/config/hash còn lại trong registration;14frozen files không đổi.
-18child source/prompt registrations khớp;34exact owner prompts,18bindings được tính lại,52request bodies được audit,0evaluator labels leak.17actual eligible texts khớp exact draft đã verify.

## Kết quả toàn lượt

| Ca | Dùng được | Cần sửa | Không dùng được |
| --- | ---: | ---: | ---: |
|2 policy thời hạn/phí|2|1|0|
|4 giá set|0|3|0|
|9 đổi sang sân vườn|2|0|1|
|15 ngại quá điệu|0|3|0|
|17 gặp khách hàng|3|0|0|
|23 áo hay cả bộ/mặc lại|3|0|0|

USABLE có thể còn polish; không đồng nghĩa văn hay. Một reviewer là main agent, không human/blind adjudication. Thang đọc cả lượt theo scope hiện có, không số tính từ, keyword hoặc câu mẫu. Minor inference và upsell có lý do được chấp nhận. Xem CONVERSATIONS_AND_REVIEW.md cho đủ18lượt; FAILURES_AND_REVIEW.md chứa8lượt chưa dùng được/cần sửa.

- **Giá set —3/3 còn lỗi:** giá799k đúng nhưng cả ba mở bảng giá áo/váy rồi mời chọn lại cách mua. Capture đầu đã có availableOffers AO/CV/SET_VAY; cả ba vẫn gọi read_product chỉ có subjectRef, không offerType. Vì vậy chưa có bằng chứng thiếu lựa chọn bán hoặc schema làm model không thể chọn đúng. Đây là model không thực hiện hướng dẫn dùng context/công cụ và chọn nội dung, không phải tính sai giá.
- **Ngại quá điệu —3/3 còn lỗi:** tiếp tục khen tơ/ren/form nhẹ và đưa nhiều cách phối/mua, kết thúc hỏi khách thấy hướng nào hợp. Có nhiều chữ tư vấn nhưng phần chọn outfit shop được nhờ vẫn chưa rõ. Không fail riêng vì dài hoặc cứ có hai lựa chọn.
- **Policy —2/3 dùng được:** mốc15ngày/phí30k đúng cả ba, không có câu điều kiện đủ như vòng trước. r2-case02 lại mời bot lên đơn đổi trong B1 không có tool tác động/handoff. Đây là bước mua ngoài khả năng, không thuộc nhiệm vụ verifier kiểm lời báo effect đã hoàn tất. Không thêm cảnh báo policy/điều kiện để sửa sai lỗi này.
- **Sân vườn:** r1 trả trực tiếp dựa trên mềm/thoáng, dùng được trong ranh giới cảm giác thông thường nhưng sức tư vấn mỏng; không gán mọi lời trấn an ngoài trời thành protected overclaim. r2 thực sự tìm SQ748, nguồn có thô đũi/thoáng/thấm hút tốt và quần short, lý do gắn nhu cầu mới. r3 không có actual vì snapshotSTALE. Chưa thể nói đã sửa ổn định ca này.
- **Ca17 và23:**3/3 dùng được mỗi ca; được chọn cả bộ nếu lý do có ích. Giá áo499k/bộ799k rõ, không nói bộ rẻ hơn áo. Tuy nhiên model không lặp lại đúng câu mơ hồ về fit hay comparator từng bị chặn; không quy kết quả này riêng cho prompt verifier mới hoặc coi là bằng chứng đã đóng hẳn hai ranh giới.
- **Giọng:** lời hỏi giá đáng lẽ ngắn lại thành bảng/CTA; lo quá điệu lại thành nhiều đoạn giải thích; các ca đã chọn được vẫn lặp ngân sách, lời khen và cụm như giúp em/trọn vẹn/nhân đôi cách mặc. Chất lượng nội dung và tự nhiên chưa đạt, dù17câu được gửi hợp lệ theo gate. Danh sách/ngoặc/tính từ riêng lẻ không tự là lỗi.

## Verifier và final gate

18verifierPASS,0FAIL/UNCERTAIN/malformed/timeout/provider error.17actualSEND_ELIGIBLE;1HANDOFF/STALE với actual rỗng vì B1 không có handoff thật. **Không có static fallback**; không gọi đây là một verifier fallback. FallbackC3_A_NONPROTECTED_V2/text/hash giữ nguyên trong registration, không được dùng lần này.

r3-case09: CURRENT_SNAPSHOT expected/current khác nhau, revision1không đổi; protected claim business values, subjects, runtimeProducts và state ngoài factSnapshotVersion khớp. Readback có observedAt/provenance mới15:34:21.428Z thay15:04:21.342Z. Xem STALE_DIAGNOSIS.json. PASS không cấp quyền vượt gate hiện hành; không retry/regenerate/reverify. Đây là kết quả do identity nguồn thay trong lượt, không quy cho owner trả lời lỗi hoặc verifier chặn quá tay. Chưa sửa hợp đồng freshness trong lượt chạy.

Không dùng18PASS làm chứng minh an toàn hoặc chất lượng tư vấn. Các câu cần sửa chủ yếu nằm ngoài nhiệm vụ protected-language verifier; không chuyển việc chấm giọng/chọn mua sang verifier.

## Operational measurements

52generation requests =34owner+18verifier; request-count telemetry đều1/request, không retry hoặc best-of. Provider errors/timeouts0; usage đủ52/52. Owner142519input/31045output tokens; verifier87791/1505. Cost NOT_EXPOSED, không ước lượng.

Verifier latency p50=7.983s/p95=11.950s, n18. Added end-to-end verification latency p50=8.694s/p95=12.682s, n18. Tổng thời gian task còn gồm source/credential/build của mỗi native range invocation; không coi thời gian build là model latency. Dữ liệu từng generation và captured bodies trong REQUEST_ACCOUNTING.json. Không có database mutation, live send hay discarded attempt.

## Commands thực sự chạy và giới hạn

```text
python apps/worker/evals/single-agent-commerce-read-only/decision-scope-focus-20261021/run.py C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py C:/Users/nguye/AppData/Local/Temp/c3-decision-scope-focus-20261021
python C:/Users/nguye/AppData/Local/Temp/c3-gemini-prompt-once-publish.py C:/Users/nguye/AppData/Local/Temp/c3-decision-scope-focus-20261021 apps/worker/evals/single-agent-commerce-read-only/decision-scope-focus-20261021
python C:/Users/nguye/AppData/Local/Temp/c3-decision-scope-primary.py C:/Users/nguye/AppData/Local/Temp/c3-decision-scope-focus-20261021 apps/worker/evals/single-agent-commerce-read-only/decision-scope-focus-20261021/REGISTRATION.json
python C:/Users/nguye/AppData/Local/Temp/c3-decision-scope-metrics.py C:/Users/nguye/AppData/Local/Temp/c3-decision-scope-focus-20261021 apps/worker/evals/single-agent-commerce-read-only/decision-scope-focus-20261021
node C:/Users/nguye/AppData/Local/Temp/c3-decision-scope-audit.mjs C:/Users/nguye/AppData/Local/Temp/c3-decision-scope-focus-20261021 apps/worker/evals/single-agent-commerce-read-only/decision-scope-focus-20261021 01fa3d4b4cc7fe7073b0563299d36ea3e2834394
git diff --check
```

Parent wrapper exit0; provider/source preflight và18native child commands đều exit0. Exact child argv trong raw/commands.json, worker build do entrypoint chạy trước import. Không chạy mới standalone lint/typecheck hoặc test suite trong lượt observation;171focused PASS/1optionalSKIP/build evidence thuộc implementation2470a79d, không giả làm tests mới. Offline metrics/audit/primary writer không gọi provider. Không chạy deterministic COD/BANK hay stateful trong scope focus.

Cùng6caseIds với lịch sử nhưng prompt owner/verifier đã đổi, source reads theo thời gian thật, một reviewer và cách diễn giải ranh giới không hoàn toàn đồng nhất giữa các review. Không so10/18với20/24như cùng population, không khẳng định causal improvement hoặc stability. Bản sửa chữ chưa làm mất các lỗi lựa chọn/công cụ ở4/15; không tiếp tục thêm ví dụ hoặc patch riêng để cứu số liệu trong lượt này.

Structural delta:0production executable/role/layer/state/tool added; wrapper eval gọi lại range entrypoint, frozen registration và evidence. Giữ1owner+1verifier. **STOP_BEFORE_FULL**, A vẫnOWNER_BYPASS; không deploy/live send/promotion, không tự chạy full hay vòng fix mới.
