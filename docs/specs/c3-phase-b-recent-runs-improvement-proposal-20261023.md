# Phase B — review các vòng gần đây và phương án tránh lặp

**PROPOSED, chưa implementation/provider mới.** Đối chiếu hai full39 opening-advice/repeat39, campaign sales-media12, followup19 (controls/native/advice riêng), giả định feedback initial8/confirmation2 ở hai source, và media-continuation7. Đọc các report, transcript tư vấn, review độc lập Astra và source liên quan. Không gọi đây là đọc lại mọi raw request của toàn bộ lịch sử C3.

## Kết quả nào có ý nghĩa

| Evidence | Điều đã chứng minh | Điều chưa chứng minh |
|---|---|---|
| Full39: 32→34 lượt dùng được | Biến thiên có thật dù cùng 17 frozen file hashes; quote/transport/tool behavior có thể đổi giữa lượt | Không phải hiệu quả một bản prompt mới. Discovery/deadline/concern/gallery vẫn có findings |
| Sales-media12 | Sửa chọn góc bổ sung và lưu attachment; cận/mặt sau dùng được. Xác nhận negative tool result chưa tới verifier | Hai cặp tư vấn rõ hơn phần nào nhưng có regression, không promote candidate |
| Followup19 | Observation theo operation/source/freshness tới cả hai model; 6 controls đúng; không retry hoặc mất denominator | Native thiếu feedback vẫn FAIL. Candidate một câu không thắng baseline, một ca thiếu hướng mua tiếp |
| Initial8 + confirmation2 | Sửa mất feedback flag và Markdown assetRef; positive feedback giả định gửi đúng ở confirmation | Không xác nhận feedback khách thật, không chữa concern/giọng; không coi toàn bộ initial8 đã PASS sau fix |
| Continuation7 | Hai lượt nối thực gửi đúng ảnh, ảnh+giá trả AO499k | Hai thiếu-feedback FAIL, size suy fit sai, concern bị egress chặn. Không đem 3/7 so trực tiếp 34/39 để kết luận regression |

Owner prompt active giữ hash `27aaf35d22a6209512eeeddbc11b169eede5bd15bc6f8e2c9ed1c867301da6a9`, verifier `0b240599a04d9a86c25ed2b3b815c152e83106c85e61940efde15b020e4c2fde` trong các campaign liên quan. Tool descriptions/context có đổi. Không nói mọi vòng “đã sửa prompt tư vấn mà vẫn không tiến bộ”; candidate không đạt đã không promote, nhiều lượt sau chủ yếu kiểm sửa đường dữ liệu/media.

## Vì sao có vòng lặp

1. Cùng terminal FALLBACK bị gom thành một lỗi dù có thể do source, owner, semantic verdict, provider hoặc final gate. Vì thế nhiều lần lời tư vấn bị chỉnh để chữa vấn đề ở tầng khác.
2. Negative media evidence đã sửa nhưng chưa chốt lời diễn đạt khả dụng. Controls SAFE dùng câu rất kỹ thuật/được giới hạn rõ; owner viết lời shop thông thường rồi vẫn FAIL. Controls hiện chưa chứng minh khoảng ngôn ngữ thực tế đó dùng được. Không phải cứ thêm context nữa là giải quyết.
3. Khi source thiếu chart, model vẫn cố trả lời từ mô tả. Tool outer status OK chỉ nghĩa tool chạy thành công, nested NO_VERIFIED_CHART mới là business outcome. Đọc được một kết quả không phải đã chọn được size. Fallback dựa vào có media operation càng che mất nhu cầu size.
4. Các chỉ dẫn “chọn hướng, nói tự nhiên, bớt mô tả” đã có. Thêm lại bằng câu khác không cung cấp chứng cứ phân biệt lựa chọn mới. Hai thử nghiệm owner nhỏ chưa cho lợi ích đủ giữ; không tiếp tục cùng can thiệp chỉ vì nó rẻ sửa.
5. Có ảnh trong nguồn, model chọn được ảnh và model đã xem ảnh là ba việc khác nhau. Concern thường dùng material description, chọn cận áo hoặc cận váy thiếu rồi khuyên về tổng thể. Những vòng gần đây chưa thực chứng native owner xem ảnh để đưa lời khuyên tổng thể.
6. N1, clock/source/history khác nhau và population khác nhau dễ làm con số thắng/thua che khuất nguyên nhân. Run toàn bộ lặp lại có thể chỉ đổi vị trí lỗi.
7. Kế hoạch discovery/deadline/quote còn mở trong khi nhiều lượt chuyển sang media. Không được gọi xong media là hoàn thành toàn Phase B hoặc liên tục viết kế hoạch mới rồi bỏ các việc cũ.

## Cách làm tiếp theo

### 1. Đóng lỗi code có thể kiểm không cần model trước

- Tách EGRESS_WORLD_CHANGED thành diagnostic revision / bindingVersion / exact snapshot mismatch. Chỉ lưu hashes, field paths và revisions đã được phép; không raw PII/private state/credentials.
- Tái hiện readback hai lần trên cùng nguồn và khi thực sự đổi nguồn. RED→GREEN cho nguyên nhân cụ thể, giữ chặn khi thay đổi thật. Không đơn giản thay hash, bỏ field hoặc bỏ readback để hết no-send. Nếu chưa tái hiện, ghi UNKNOWN và dừng sửa gate theo phỏng đoán.
- Rà consumer của recommend_size: biểu diễn NO_VERIFIED_CHART/NEEDS_INPUT/RECOMMENDED/HANDOFF không mập mờ với transport OK. Dùng kết quả business hiện có thay vì thêm bộ đoán intent hoặc rule tiếng Việt. Trước khi đổi top-level status, kiểm adapter/consumer/tests để không làm lỗi luồng size đã chạy tốt.
- Chốt cách kết thúc đúng khi thiếu chart với executor/handoff policy hiện hữu; không giao tiếp hứa đã chuyển khi chưa receipt. Kiểm permission/tag/capability và budget thật. Không tự thực hiện effect mới chỉ từ một nhãn action.
- Fallback có media operation không đồng nghĩa toàn lượt chỉ cần ảnh. Kiểm danh mục terminal hiện hữu, ưu tiên outcome business/handoff có receipt khi có. Khi chưa có outcome an toàn, giữ static/no-send và ghi hạn chế; không cắt phần giá/ảnh từ draft FAIL hoặc thêm classifier để salvage.

Hoàn tất bước này bằng focused deterministic tests, typecheck/build/lint và diff review, không provider loop. Một câu trả lời hết bị chặn do code bug chưa phải lời tư vấn hay.

### 2. Chốt đúng một ranh giới feedback, không nới chung verifier

- Dữ kiện để diễn đạt: trong nguồn/mẫu đang tra chưa có feedback đủ điều kiện gửi. Không khẳng định toàn shop không có ảnh ở mọi nguồn; không nói lỗi tải là ảnh không tồn tại.
- Lời shop thông thường “ảnh khách mặc mẫu này em chưa có để gửi” cần được xét cùng câu hỏi và observation, không bắt kể approval/index/source cho khách.
- Tách chặn phủ định feedback khỏi chặn mô tả ảnh thay thế không đúng phần. Ca1 mới chọn AO+UNKNOWN chưa chứng minh ảnh ren; không duyệt cả draft chỉ vì câu báo thiếu hợp lý.
- Chỉnh controls hiện hữu để bao phủ lời thường gặp và đối chứng UNSAFE cùng scope; labels chỉ evaluator. Freeze trước chạy. Thay clause liên quan trong verifier nếu cần, không chồng thêm ví dụ sản phẩm và không sửa đồng thời owner/context để mất khả năng xác định tác động.
- Unsafe lọt thì dừng, giữ evidence. Safe lỗi thì phân tích đúng verdict; không tự thay chữ rồi chạy đến khi PASS. Verdict không có clause nên không tự gọi mọi FAIL là chặn oan.

### 3. Kiểm riêng tư vấn bằng một thay đổi đầu vào có căn cứ

Giữ prompt owner baseline, model, policy và truth boundaries. Không thêm đoạn “tự nhiên/chọn một hướng” nữa. Hai ca visual đã có: lo tổng thể ren đi cưới và khách quen đồ trơn ngại cả bộ. Tạo diagnostic paired trên cùng captured world/history/clock:

- Baseline: description/metadata hiện có.
- Treatment: cùng đầu vào đó cộng bundle ảnh tổng thể đúng mẫu đã duyệt, chuẩn bị bằng đường vision hiện hữu. Hash cả ảnh đã chuẩn bị và metadata/binding; mọi trường chung giữ bằng nhau. Định nghĩa treatment là thêm visual evidence bundle, không giả rằng wire chỉ khác bytes ảnh.

Đây là phép thử model đã thực sự nhìn được tổng thể có giúp chọn/giải thích tốt hơn không, không phải production bắt mọi lượt view. Không dùng ảnh làm chứng nhận độ kín, độ bền hoặc fit. Hai cặp = 4 outcomes, tối đa 8 generations owner+verifier, N1; proposal chưa đăng ký/dispatch. Nếu capture không phù hợp hoặc ảnh không đủ authority thì BLOCKED diagnostic, không bơm facts. Khi cần native validation, đăng ký riêng với budget tool thật.

Review toàn đoạn: có giải quyết phân vân không, lý do có liên quan không, có giúp mua tiếp không, có tự gán đồ khách sở hữu không, có nhiều lời khen không cần thiết không. Không ép cả bộ/áo lẻ làm đáp án. Trích đoạn chỉ là bằng chứng, không cộng điểm từ khóa.

Nếu hai cặp vẫn chỉ nhắc chất liệu hoặc dài hơn, bác bỏ treatment này, giữ baseline. Không thêm prompt lần nữa và không mở tự động model comparison hay ba vòng sửa. Cần quyết định sản phẩm tiếp theo từ owner về mức tư vấn chấp nhận được trước campaign lớn.

### 4. Regression đúng thời điểm, không tăng corpus mặc định

- Giữ danh sách issue cố định: egress, size/source-action, feedback semantics, fallback hỗn hợp, visual decision; discovery/deadline/quote giữ thành backlog có liên kết tới plan hiện hữu, không đánh dấu đã fix.
- Mỗi issue ghi: evidence → nguyên nhân đã xác nhận/hypothesis → can thiệp → test phân biệt → kết quả và quyết định giữ/bỏ. Không dùng số commit hoặc số test thay cải thiện người dùng.
- Provider chỉ sau deterministic readiness, clean source seal, frozen inputs/config và preregistered budget. Không automatic retries, loại lỗi, sửa giữa run hoặc chạy lại để thay kết quả.
- Khi candidate có lý do đáng giữ, chạy lại full39 B1/B2/B3 hiện hữu, không âm thầm thêm thành full43 hay 185ca. Các lượt bổ sung media giữ denominator riêng. N3 chỉ dùng cho ca cần kiểm variance với ngân sách được chốt, không nhân cả suite mặc định.
- Không gộp source thật/giả định hoặc initial/confirmation thành một population PASS. Actual terminal trước, draft review sau; verifier PASS khác final eligibility và khác chất lượng bán hàng.

## Tiêu chí kết thúc vòng sửa đề xuất

Egress unchanged-source ổn định/chặn changed-source; size không bịa fit và xử lý đúng capability; feedback diễn đạt thông thường được sử dụng nhưng không mở rộng absence hay tráo feedback; fallback không giả hoàn thành nhu cầu khác; visual treatment chỉ giữ nếu giúp quyết định mà không regression. Không đủ thì báo đúng phần chưa đạt và dừng can thiệp đó. Không tuyên bố toàn Phase B GO từ một media diagnostic.

Lượt này chỉ review/proposal, không runtime/prompt changes, không gọi model hoặc independent reviewer mới. Không cần chạy lại test suite cho tài liệu.
