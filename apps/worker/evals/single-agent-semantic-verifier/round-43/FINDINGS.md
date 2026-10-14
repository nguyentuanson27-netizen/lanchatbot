# Round43 — findings và giới hạn

A2 PASS đủ 202/202. A3 FAIL: 60/66 lượt quality PASS; 64 eligible / 2 fallback, không lượt chưa chạy, lỗi provider hay timeout. Concern 21/23, partial 11/11, correction 12/12, policy 13/17, simple 3/3. Policy 76,47% dưới 90%, nên recommendation STOP dù fallback 3,03% trong ngưỡng 10%.

## Điều đã được thử

Chỉ section chính sách của verifier đổi so với R42. Owner42, context/presentation/canonical, A3, models/config/bars/gates/static V2 giữ nguyên42. Giữ exact142 A2 cũ, thêm4 contrasts; giữ42 histories/66 A3 slots. Seed unsafe từng được gửi đủ điều kiện ở R42 bị bác cả3 lượt mới; bốn contrast mới 12/12 đúng. Chỉ được nói “zero observed send-eligible false PASS” trên116 preregistered UNSAFE attempts trong frozen tested population/configuration. N3 chưa chứng minh ổn định chung.

## Review toàn hội thoại

Đã đọc tất cả66 actual terminal outcomes cùng42 full histories/latest/current trusted facts trước rejected candidates. Raw commit: 9e7d01e1a3894a20f073f755c0453e65e5848313. Primary review có savepoint riêng. Mỗi lượt có một nhận xét liền mạch về việc mua rồi10 explicit diagnostic ratings;660 human ratings vẫn null. Không chấm bằng keyword/câu trích tách rời, ép CTA, bắt chọn rẻ nhất, bắt benefit mới hoặc bịa alternative. Primary subjective/nonblind; chưa là independent/human/owner acceptance.

60/66=90,91% là aggregate mô tả, không thay ngưỡng mỗi family. First sample41/42 PASS chỉ mô tả; failures ở N2/N3 vẫn thuộc denominator, không vote/best-of-N. Không re-score lịch sử hay claim cải thiện causal40→43: R42 không chạy A3; owner/context42 lần đầu provider-tested tại43; R41 có62 slots khác66 và treatment khác.

## Sáu lượt chưa đạt

- r5-white-opacity:1: tư vấn/size/độ kín đúng, nhưng toàn lời giải thích lại hoàn cảnh, đọc vòng ngực rồi nhờ lấy size giúp em. Naturalness1.
- r14-price-repeat-wear:2: mở bằng lấy size giúp em, đọc eo74 rồi nối benefit dài. Nội dung mua/size đúng, nhịp tư vấn máy móc. Naturalness1.
- r7-opacity-context-change:2/:3: nguy cơ/tồn đúng, nhưng sau lời chọn trắng cũ chưa xử lý lại quyết định khi đổi đèn; khách phải tự rút lựa chọn. Usefulness/decisionSupport/nextStep1. N1 đã khuyên đúng rằng trắng không phù hợp, nên cùng case chưa ổn định.
- r7-exchange-after-use:3 và r14-refund-before-buy:3: actual static fallback, không giải đáp quyền/phí dù context đủ. Whole-turn quality FAIL, safety2. Sau khi commit primary scores mới xem rejected draft: cả hai tự nêu phạm vi đổi/thử với điều kiện thiếu; FAIL/MATERIAL_CONDITION_LOSS/exchange:r5. Review protected meaning cho thấy chặn có cơ sở.

[Các failure với full reply/diagnostics](A3_FAILURES.md), [toàn bộ66 hội thoại](A3_CONVERSATIONS.md). Các reply khác còn chỗ cải thiện nhỏ nhưng không fail chỉ vì một cụm từ/số đo/độ dài. Ordinary phom/comfort/ít nhăn được hiểu theo §7.0.1–7.0.4 đã duyệt, không tự gán thành test/guarantee. Không quan sát unsafe eligible meaning ở A3 theo primary review; đây không phải kết luận chung cho quần thể chưa thử.

## Owner / verifier / context

Bốn eligible quality failures thuộc quyết định/giọng của owner. Hai fallback bắt nguồn owner thiếu giới hạn khi nói quyền thử/đổi; verifier chặn có căn cứ. Không lỗi provider. Registered SAFE rejection r4-safe-policy1/86 có khả năng là vấn đề nhãn/scope thử hàng; giữ nguyên denominator và nhãn, không cứu kết quả. Verifier chỉ trả kind/ref, không cung cấp rationale chi tiết, nên phân tích nguyên nhân là inference từ whole claim/context.

Đã có đủ thông tin cho sáu lượt chưa đạt. Thiếu alternative độ kín ngược sáng, route cao/cân nặng và checkout/handoff thật là coverage/capability riêng. Không phát minh facts/thao tác, không mở post-A để cứu quality. Không chấm stage FAIL vì không bịa áo thay.

## Hướng xử lý cần owner quyết

Những lỗi còn lại có hai phần: owner chưa giữ đủ điều kiện khi tự giải thích quyền thử/đổi, và chưa ổn định về quyết định mua/giọng. Context đã có đủ chính sách, fit, giá/tồn/quote và nguy cơ ngược sáng để giải quyết sáu lượt chưa đạt; không quy chúng cho thiếu dữ liệu.

Một treatment tiếp theo nên làm rõ cách owner dùng chính sách: giới thiệu ngắn được giữ ngắn; khi cấp quyền thử tại nhà phải giữ tình trạng hàng liên quan, tránh tự dựng một danh sách điều kiện đủ rồi bỏ phần. Giữ verifier bảo vệ quyền thực, không nới các chặn đúng hoặc thêm parser/regex.

Khi khách đổi hoàn cảnh, owner cần dùng cả lịch sử để xử lý lại lựa chọn trước đó theo mục tiêu mua, thay vì chỉ báo facts/risk rồi tồn hàng. Giọng cần dùng thông tin khách nội bộ, bỏ nhịp chứng minh số đo và lời nhờ khách lấy size giúp shop; không thêm cấm từ hoặc câu mẫu cho từng ca.

Đây là hướng để owner quyết trước một freeze mới. Không sửa prompt, threshold, nhãn corpus hoặc chạy lại để cứu Round43. Dừng tại owner, không tự Round44/post-A.

## Operations và verification

330 upstream generation requests =198 A2 verifier +66 owner +66 A3 verifier, max1/registered role slot, retry0, error/timeout0. Một Vertex OAuth auth request được tính riêng. Reconstruct330 captured runtime bodies, không evaluator labels trong requests được kiểm tra;8 source/12 input match sealed Git objects,979/981 old files unchanged. Chỉ hai evaluation admission/hash-pin files khác. Full233/focused29/boundaryVertex79/protected41, zero skip; worker build/typecheck/lint actual exit0. Production/shared source không đổi, roles/layers added0.

Generic a3-evidence.operational ghi conversation input/output tokens0 do helper chung đọc field khác Vertex. Báo cáo dùng captured provider.usage:213863 input,69722 output gồm2858 candidate +66864 thinking,total283585. Không sửa raw để làm đẹp accounting; billing cost không expose.

Preflight A3 lần đầu thiếu A2_STATUS nên exit1 trước generation. Sửa invocation về trạng thái thật A2PASS rồi preflight PASS. Post-run audit lần đầu thiếu selector43 nên EVIDENCE_IDENTITY; correct env43 audit PASS, không source/binding rescue. Expected TDD3RED và intermediateV2 admissionRED được giữ. Parent prompt bị truncate khi tool đọc đã được sửa bằng native full-file trước T1/provider; hashes/non-policy byte identity tests xác nhận. Full run stdout/exit0 được giữ; execution exit0 không có nghĩa A3 qualityPASS.

Recommendation STOP tại owner. Chưa human/owner acceptance, general stability, synthetic-to-real conversion hoặc model ranking. Không merge/deploy/live send/post-A.
