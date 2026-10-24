# Hai vòng bổ sung — độ ổn định của tư vấn và stateflow

**Chạy đủ32/32slots mới; stateflow đúng trên hai hành trình test, tư vấn chưa ổn định để GO.** Giữ nguyên owner Gemini3.5FlashLiteHIGH/verifier Sol6.1high, prompt/config/runtime/cases/scoring. Mỗi vòng16slots N1, không fix ở giữa, không retry/mẫu bù. Đây là subset hiện hữu8stateful+4integratedB1+4captured advice/vòng, không full24 B1 hay A2/A3. Không deploy/live send/tạo POS order; A vẫn OWNER_BYPASS.

Cả hai chạy tại clean source `35c9007b6e979e9708f3474d34307b8f66fa6d55`, HEAD không đổi trong generation. Primary locks SHA256 `836f66abdae3c005f9a1337544b5b57289b630c775c88e1cfef46e4df63a91b5` / `bed8d8371498c84868cd28195af3199a8ea4d5f85c2980f039c1376c14b53c7d`; savepoint `b3d068e2ea86bb82fca4843c43e5ebef0a4a0e18` trước rejected-draft/verifier diagnosis. Đây là whole-turn review của Codex, chưa phải independent human scoring. Không sửa điểm/raw lịch sử hoặc dùng số từ khóa làm thước đo.

## Kết quả

| Vòng | Slots | Dùng được | Cần sửa trước gửi | Không dùng được — actual fallback | Nhường nhân viên theo yêu cầu | Generation requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline trước đó | 16 | 14 | 0 | 1 | 1 | 35 |
| Bổ sung 1 | 16 | 13 | 1 | 1 | 1 | 35 |
| Bổ sung 2 | 16 | 13 | 1 | 1 | 1 | 35 |

Hai vòng mới: **26USABLE +2NEEDS_EDIT +2UNUSABLE actual fallback +2OWNERSHIP_CONTROL =32**. USABLE vẫn có góp ý giọng; không tự là đạt chuẩn bán hàng hoàn chỉnh. Fallback2/32slots=6,25%; nếu chỉ xét30outcomes có nội dung cho khách thì2/30=6,67%. Hai human-control không phải lỗi. Mỗi vòng còn2HANDOFF/2NO_SEND nghiệp vụ (xác nhận mua, xin nhân viên, mời checkout, preview code), không cộng thành fallback.

Tổng70generation requests (46owner/24verifier), mỗi generation1upstream request, không retries;24verifier verdicts gồm22PASS/2FAIL. Không provider errors/recorded timeout/lỗi nguồn bất ngờ/thiếu capture/BLOCKED. POS_UNAVAILABLE ở partial-source là fixture cố ý, không gọi là lỗi mạng hoặc ép model bịa giá/tồn để vượt qua. Đếm cả code preview và control trong16slots nhưng không coi chúng là model generations.

## Điểm ổn định và điểm còn dao động

1. **Giỏ, giá và checkout:** cả hai vòng mở đúng áo beM, đổi thành2áoL, cập nhật eo74/mông96 mà không đổi size khách giữ, tổng978.100đ khớp998.000−49.900+30.000. Preview và chuyển nhân viên đúng state. Private checkout0model requests, DB test đã drop. Đây là bằng chứng trên hai hành trình test; chưa chứng minh mọi đường B2/B3.
2. **Ca đi xe dự cưới tiếp tục lỗi cùng family cũ.** Vòng bổ sung1, integrated bị chặn vì hứa “rũ nhẹ hoặc treo lên…phẳng phiu…ngay”; captured advice gửi được lời chọn Diệp An dựa mô tả2lớp/đứng form. Vòng bổ sung2, integrated gửi được so sánh định tính nhưng đưa2mẫu rồi hỏi khách chọn lại; advice bị chặn vì hứa ngồi ô tô3tiếng “vẫn…phẳng phiu”. Không có thông tin nguồn xác nhận các hiệu quả cụ thể bị hứa. Cả hai rejection đúng ranh giới hiện hành; không có bằng chứng đây là verifier chặn quá tay.
3. **Đếm fallback như nhau không có nghĩa reply ổn định.** Baseline và mỗi vòng mới đều1fallback, nhưng nó đổi giữa integrated/advice. Trên6outputs của ca đổi hoàn cảnh qua3vòng (3live-integrated+3replay phụ thuộc context), có3fallback,1reply cần sửa cách ra quyết định và2reply dùng được. Không dùng majority vote hay lời gửi được ở lượt khác để xóa attempt lỗi;6outputs này không phải6live journeys độc lập.
4. **Giọng xác nhận chưa tốt đều:** vòng1 có “Chị đã thêm…cho mình” sai vai trong câu ACK nên cần sửa trước gửi; vòng2 “Dạ em đã thêm…” đúng. Cả hai correction vẫn dùng “đã cập nhật” rồi nhắc lựa chọn. Nhắc lại hai số vừa sửa trong vòng1 có ích, không chấm lỗi chỉ vì có số đo; phần còn cần trau chuốt là nhịp văn hành chính/dài.
5. **Báo thiếu nguồn:** cả4partial-source replies mới đều trả phần chất liệu/dáng và không kể chuyện “hệ thống”, không tự báo giá/tồn/bán lẻ. Đây là điểm giữ được. Tuy vậy vẫn có “mức bán lẻ này”, “hỗ trợ tách lẻ”, “chị thông cảm giúp em”; có thể nói tự nhiên và gọn hơn. Không đánh rớt chỉ vì fixture thiếu POS, cũng không coi USABLE là giọng đã hay.
6. **Tư vấn băn khoăn còn theo khuôn:** cả4concern replies được gửi và dùng được, nhưng vẫn dựa nhiều vào mềm/nhẹ/rũ/bay bổng, nhắc ngân sách rồi CTA. Lời phối áo với váy trơn ở advice vòng1 thiết thực hơn; hai CTA vòng2 mời chốt khá sớm, có câu lặp “luôn”. Các nhận xét thẩm mỹ này nằm trong phạm vi cho phép, không bị đánh thành fact sai chỉ vì không có phép thử.
7. **Lookup:** giá áo929k/cả bộ1.065k đúng ở cả4outputs mới, phân biệt đúng loại bán, có câu hỏi mua tiếp dùng được. “Hiện có sẵn hai lựa chọn” nói về offer trong cả đoạn, chưa tuyên bố tồn size; vẫn nên nói gọn để tránh hiểu nhầm. Không dựng lỗi stock chỉ từ cụm từ bị tách khỏi câu.

## Phân chia nguyên nhân

- **Owner:** khi cần thuyết phục, vẫn có lúc biến mô tả vật liệu thành hiệu quả chống/phục hồi nhăn cụ thể để giữ món đang tư vấn. Cùng một input mục tiêu có thể chọn món thay hoặc trấn an quá mức về món cũ. Đây là inference/ra quyết định, không phải thiếu thêm một câu mẫu. Một lượt còn trả quyền chọn cho khách dù khách đã nhờ chọn; ACK và giọng dài cũng dao động.
- **Verifier:** chặn đúng hai lời hứa công năng không có căn cứ. Các draft bị chặn khác nội dung draft PASS; dữ liệu này không chứng minh verifier “cùng nghĩa lúc cho lúc chặn”. Không cần đổi verifier chỉ để hạ số fallback. Review chưa phát hiện protected false PASS rõ ràng khác trong22send-eligible model replies mới; đó là quan sát giới hạn, không phải chứng nhận safety.
- **Nguồn/context:** có mô tả món và các lựa chọn thay, không có phép thử phục hồi nếp nhăn; chưa có phép thử không bắt buộc từ chối mọi tư vấn so sánh định tính. Partial-source cố ý thiếu POS là hạn chế cơ hội chốt giá/tồn, không phải root cause của lời hứa vải tự phẳng. Context/source live được chụp ở thời điểm mới; đây là so sánh mô tả, không quy mọi chênh lệch cho sampling đơn thuần.
- **Code:** không quan sát sai mutation/tiền/profile/checkout hoặc cần sửa code từ hai hành trình này. Fallback tĩnh an toàn nhưng mất toàn bộ giá trị tư vấn của ca; giữ như hạn chế terminal hiện hành, không thêm repair loop hay fallback viết lại reply trong lượt đo.

## Vận hành và giới hạn

Verifier24records: p50 **6,529s**, p95 **10,861s**. Added verification/readback/final-gate latency24records: p50 **8,213s**, p95 **11,733s**. Không có owner latency trong generation record shape, không dùng thời gian runner suy thành latency model. Cost không expose. Usage owner input168.484/output39.989; verifier input112.203/output2.186; không thiếu usage.

Audit tổng24bindings/46exact owner prompt captures/86wire bodies/8capture hashes/68published raw artifacts PASS,0evaluator-label leaks;10frozen Git hash checks PASS; cả10child commands exit0. Helper accounting có110wire events do một request được ghi nhiều phase, không nhầm với70generation requests. Raw68files gồm52exact bytes và16public-attempt copies chỉ bỏ synthetic private ingress batch; staged Git blob hashes khớp68/68. Source-check/B1 đã build; không chạy lại full tests/typecheck/lint từ lượt chỉ thêm registration/evidence/report. Không claim các checks kỹ thuật chứng minh giọng tự nhiên.

Runtime/roles/layers/gates/state/parser/framework thêm:0. Không sửa prompt/runtime hay nới tiêu chí giữa hai vòng, không phát sinh provider round thứ ba. So baseline có40USABLE/2NEEDS_EDIT/3fallback/3control trên48slots, nhưng số lượng nhỏ và advice phụ thuộc capture; không kết luận tỷ lệ thành công toàn hệ thống từ bộ này.

## Kết luận và hướng xử lý sau phép đo

**STOP sales/live readiness.** Stateflow ổn trong phạm vi đã đo; phần báo thiếu nguồn đã tránh giọng hệ thống nhưng chưa gọn tự nhiên; tư vấn đổi hoàn cảnh và dẫn quyết định chưa ổn định. Không tiếp tục thêm prompt cấm từng câu hay nới verifier để làm đẹp fallback count. Nếu owner muốn sửa tiếp, rủi ro đang sở hữu là owner chọn lý do bán hàng trong phạm vi mô tả vật liệu rồi kết luận lựa chọn, thay vì tự hứa hiệu quả cụ thể của món cũ. Cần xem cùng lúc cả reply được gửi lẫn fallback của family này; không chỉ chạy câu lỗi đến khi có một mẫu PASS. Lượt này dừng ở evidence, chưa thực hiện hướng sửa đó.

- [Vòng bổ sung1: đủ16hội thoại](../wording-stability-1-20261019/CONVERSATIONS_AND_REVIEW.md), [báo cáo](../wording-stability-1-20261019/CHECKPOINT_B.md), [fallback/draft](../wording-stability-1-20261019/FALLBACKS.md).
- [Vòng bổ sung2: đủ16hội thoại](CONVERSATIONS_AND_REVIEW.md), [báo cáo](CHECKPOINT_B.md), [fallback/draft](FALLBACKS.md).
- [Đối chiếu từng ca và exact replies](STABILITY_COMPARISON.json); registrations và raw/commands.json giữ exact config/argv/exitcodes.
