# Policy application run — 2026-10-20 — STOP

Đủ8/8lượt, **3USABLE/5actualfallback**. Exact ca lỗi cũ chạy3lần đều tái diễn đồng ý đổi dù khách đã mặc thử. Thêm nghĩa mã vào context và sửa hướng dẫn áp dụng policy **chưa giải quyết được ca gốc** trên cấu hình/population này. Không sửa tiếp hoặc chạy thêm trong lượt được yêu cầu.

## Scope và provenance

Implementation `89ab6cc66a18d2f216d563dba660504b64e84cea`; runSourceSha **`2b16a79a832f8b938a28272d245d596468268d7b`**, source sạch trước provider/preflight. Primary commit **`5b85b9d2`** trước diagnosis; primary SHA256 `ff3666640039451367e76c13430257d04799e6c2f60779d9a3bebd65d4bea590`. [Scope](SCOPE.md), [registration](REGISTRATION.json), [đủ8hội thoại/draft/review](CONVERSATIONS_AND_REVIEW.md).

Đây là replay sau khi có policy, owner tools-off; mỗi slot1owner+1verifier và final deterministic gate. Chưa kiểm chuỗi tool, readback live ngay trước gửi, B2/B3, full B hay full A2/A3. Source chuẩn bị đọc PostgreSQL active pointers chỉ đọc;7slots dùng policy hiện hành15ngày/30k qua resolver/projection mới;slot8 synthetic schema-valid7ngày/25k có identity riêng, không cập nhật shop. Không được coi fixture8 là policy live khác. Không có DB mới hoặc live send.

Exact model/provider/version/effort/generation configs nằm đầy đủ ở REGISTRATION.json: owner Vertex global **gemini-3.5-flash-lite/HIGH**, verifier OpenAI/Codex-login **gpt-6.1-sol/high**, actual modelVersion khớp ở cả16generation. Không substitute model, repair hoặc generation retry.

Owner prompt SHA256 `28790ea5eaf56bd5a51f4aa8cc7089d6a51f057f334d04f1cd95114f7070d133`; verifier `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`; verdict schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`; input `444a6bd27f9d5161ceab376701b42a4375bd26ec61e915373e6a51fe287cc34c`. Static fallback C3_A_NONPROTECTED_V2: “Phần này em chưa trả lời được, chị nhé.”, hash/terminal map giữ manifest.

## Findings

| Lượt | Actual | Diagnosis sau primary |
| --- | --- | --- |
| 1–3: đã mặc thử5phút | 3fallback | Owner đều mở “Dạ được”, rồi nêu nguyên tem/chưa dùng/thời hạn. Lỗi áp dụng policy vào hành động khách vẫn còn; verifier chặn đúng lỗi chính. Lượt2 còn khẳng định “hoàn toàn đủ điều kiện” và khuyến khích cứ thử. |
| 4: chỉ ướm | USABLE | Giới thiệu đổi size có điều kiện; không tự suy khách đã làm bẩn/hỏng để bắt thiếu keyword. |
| 5: “thử” chưa rõ | fallback | Owner không hỏi đã mặc vào hay chỉ ướm, chuyển sang xin size. Thiếu thông tin quyết định. Verifier FAIL; mức chặn cần đọc cùng sự mơ hồ này, không khẳng định đã chứng minh khách mặc thử. |
| 6: hỏi thời hạn/phí | USABLE | Đúng15ngày/30k. |
| 7: báo lỗi đường may | fallback | Đúng nhánh báo lỗi, không tự từ chối vì đã mặc. Nhưng nói lỗi từ nhà sản xuất như đã xác định và đề xuất đổi mới/trả hoàn,100%ship trước khi xin ảnh. Nguồn có returns lỗi đường may,100%phí và hoàn sau xác nhận; cần phân biệt giới thiệu dịch vụ với duyệt hồ sơ và quyền đổi mới. Verifier không xuất rationale nên chưa quy toàn bộ FAIL vào một nguyên nhân đã được chứng minh. Xin ảnh để làm thủ tục không phải báo effect đã xong. |
| 8: nguồn đối chứng | USABLE | Đúng7ngày/25k, không chép15ngày/30k. |

Quan sát hỗ trợ phân biệt **đọc số liệu nguồn** với **áp dụng các quy định vào tình huống**: control6/8 đúng, ca gốc vẫn3/3sai. Captured requests chứng minh owner thực sự nhận prompt mới và nghĩa mã; không còn giả thuyết quên cập nhật prompt/request. Chưa chứng minh nguyên nhân suy luận bên trong model. Quy định inspection và exchange vẫn ở hai nhánh riêng; thêm nghĩa thao tác chưa làm rõ quan hệ eligibility trong nguồn. Đây là hướng cần xem tiếp nếu owner yêu cầu, không tự thêm policy kết luận/regex/câu mẫu.

Ba reply gửi được ngắn, đúng câu hỏi. Không thể từ subset policy này kết luận giọng hoặc sức thuyết phục của toàn bot tốt hơn. Fallback5/8=62,5%; population được chọn để soi lỗi, không so tỷ lệ với full24 hoặc full32 như cùng phân bố. Ba repetition ca gốc không là ba hành trình độc lập. Primary3USABLE/5UNUSABLE được giữ nguyên dù diagnosis có vùng cần phân định.

## Operations và kiểm tra

16generationrequests=8owner+8verifier, mọi generation1upstreamrequest; retry0, error0, timeout0, không bỏ attempt khỏi denominator. Verifier3PASS/5FAIL. Latency verifier p50 **7.162ms**, p95 **11.071ms**; added verification p50 **7.164ms**, p95 **11.072ms**. Đây là measured inference/gate latency của replay, không live delivery latency hay so tốc độ hai model. Owner latency riêng không được adapter expose.

Tokens: owner input21.098/output7.622; verifier input28.611/output1.619; không thiếu usage, output có thể gồm reasoning. Cost **NOT_EXPOSED**. Chi tiết METRICS.json/REQUEST_ACCOUNTING.json.

Exact commands đã chạy:

- Chuẩn bị bằng launcher hiện hữu: `python %TEMP%/c3-division-session-20261019.py node apps/worker/evals/single-agent-commerce-read-only/policy-application-run-20261020/prepare.mjs %TEMP%/c3-policy-preparation-20261020` → PREPARED8,0generation,8offline projections không leak labels.
- `node --test apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs` → **65PASS/0FAIL/0skip**. Không chạy lại typecheck/build/lint của fix89ab trong lượt chỉ thêm eval inputs/wrapper.
- `python apps/worker/evals/single-agent-commerce-read-only/policy-application-run-20261020/run-targeted.py %TEMP%/c3-division-session-20261019.py %TEMP%/c3-policy-application-run-20261020` → exit0. Child provider-preflight0/targeted0; exactargv trong raw/commands.json.
- `python %TEMP%/c3-policy-metrics.py %TEMP%/c3-policy-application-run-20261020 apps/worker/evals/single-agent-commerce-read-only/policy-application-run-20261020` và `node %TEMP%/c3-policy-audit.mjs` → PASS. Audit8bindings/8exactownerprojections+telemetryhashes/8canonicalverifiercontexts/32wirecaptures/3exacteligibletexts/14exactrawfiles;0evaluatorlabels leaked,9executable/input/config Gitblobs giữ nguyên từ source seal; primary hash không đổi.32wirecaptures không phải32requests.

Complexity delta lượt chạy: không sửa production/runtime/prompt/provider; chỉ frozen8inputs, preparation source read, nhỏ wrapper reuse entrypoint và artifacts.0semantic role/layer/gate/state/parser thêm. Recommendation **STOP** ở targeted policy evaluation: bản sửa chưa đạt mục tiêu; không tuyên bố A PASS hoặc B/live GO.
