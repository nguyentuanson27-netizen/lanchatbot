# Phase C — source-bound model round, báo cáo 03/11/2026

Run source: `a8c7ebee18e883770379f6fea665b8ab1cd31839`; approved runtime `b6676b68`. Known development population, N1/retry0. Owner Gemini3.5FlashLite HIGH; verifier GPT6.1Sol HIGH/Codex0.159.2. Không đổi prompt/model/effort hoặc sửa giữa run.

Đã thực thi đủ33ca/48lượt, không NOT_RUN. Hai registrations được giữ riêng; các tổng dưới đây chỉ là coverage/accounting, không phải pooled quality/safety population.

| Nhóm | Ca/lượt | Generation records/HTTP | Có gửi | Handoff | Human-owned no-send |
|---|---:|---:|---:|---:|---:|
| Purchase |21/28|47/47|8eligible +2code-owned|15|3|
| Remainder |12/20|23/21|1eligible|12|7|

Capture thực tế:11text +8ảnh. Mỗi generation tối đa1HTTP; không automaticretry. Cả hai disposable databases đã drop, không live send/deploy/merge. Source/world/readiness/seed/input được review trước provider; accounting/firewall/native capture đã được review độc lập sau run. Locked quality grades chưa được thực hiện; qualificationBLOCKED/C3NOT_RUN/B_NOT_GO.

[Hội thoại nhóm21ca](purchase/CONVERSATIONS.md) · [Hội thoại nhóm12ca](remainder/CONVERSATIONS.md) · [Coverage](COVERAGE.json).

## Những gì đã quan sát được

- p08 thêm setM rồi đổi áoM được gửi đúng cart/tổng; j6 thêm giỏ kèm ảnh rồi nativecode hỏi tên. Không claim đã tạo preview hoặc hoàn tất đơn. So sánh nhóm21 với đợt cũ cho thấy số lượt có gửi5→10, nhưng source/readiness/owneroutput thay đổi và N1 không chứng minh stability hay causal improvement chỉ do code.
- Handoff/no-send vẫn nhiều: nhóm21 là18/28; nhóm12 là19/20. Có source/ảnh/fit gaps, nghiệp vụ hậu mãi và technicalfailures. Không gọi toàn bộ các lượt im lặng là lỗi ngôn ngữ hoặc semanticFAIL.
- s02/s13 có request68081/68073byte >65536,0HTTP: context/continuation bound, không phải quota. Proof67byte headroom trước đó chỉ là frozen reconstruction cũ.
- s04 có read_product malformed shape tại HTTP200/STOP. DiagnosticDETAILS_ONLY được giữ; không giả lập đầy đủ args không được capture.
- j1turn2 có nativeMALFORMED dù cả hai OWNERrecordsOK. Wire trước đó có9subjects so với boundarycap8; full exactgate snapshot không được giữ, nên chỉ khẳng định observed over-cap input, không sole-cause replay. Cart đã ghi được giữ, reply không gửi.
- j3verifier có đúng1HTTP429usage_limit_reached, không verdict, không retry. Các lượt sau human-owned no-send. Đây không phải verifier semanticFAIL.
- j4attemptadd_to_cart(AO,M,color:null) trảUNAVAILABLE/SELECTION_UNAVAILABLE, chưa commitcart và khôngMEDIA_SELECT. Không quy nó thành cùng sentinel-to-media bug cũ hoặc nói owner chưa gọi tool.
- P08 vẫn kết bằng lời chốt chung chung sau khi khách đã muốn mua; p01 form báo giá còn dài. Những nhận xét trải nghiệm này là primarywhole-turn observations, không phải chấm keyword hoặc lockedqualityFAIL. Không có bằng chứng riêng rằng giọng/thuyết phục đã ổn định hơn.

## Đo lường

Nhóm21: verifierp50/p95 khoảng7,52/10,12giây; nativeverification+readback9,10/12,58giây. Nhóm12: verifier3,04/9,20giây trên2attempts (gồm1quotaerror); nativeverification+readback7,42/11,11giây. Đây là harness measurements, không phải productionSLO hoặc causaloverhead estimate.

Generationtokenusage observed: nhóm21input488277/output42871 (47rows); nhóm12input216518/output26701 (20rows). Missingusage/cost không được giả định0. AuxiliaryOAuth/embeddingHTTP được lưu riêng trong OPERATIONAL.json; cost không được expose.

## Provenance và giới hạn

Fresh107-product publiccapture, maxfactage7200s giữ nguyên, exact previously approved isolatedhandoffmatrix. Readinessv3 frozen trước provider: purchase7ready/14gaps, remainder2ready/10gaps. P10 ba discoveryrefs chỉ là evaluator prerequisite từ exposure cũ, không ép runtime hoặc bảo đảm completepool. Historical outcomes/cohorts không bị sửa.

Modelgenerations chạy trong khoảng23:30–23:47 ngày02/11/2026 giờAsia/Saigon theo commandrecords UTC16:30–16:47. Report/audit được hoàn tất sau đó; raw/seal file names dùng registration date02/11.

Primaryfinding và exactdiagnostics: [purchase](purchase/FINDINGS.md), [remainder](remainder/FINDINGS.md). Independentaudit và artifact hashes ở từng nhóm. Recommendation: STOP sau lượt đã authorize; chưa chạy thêm ca lỗi, chưa patch tiếp hoặc tự dispatch C3/qualification.
