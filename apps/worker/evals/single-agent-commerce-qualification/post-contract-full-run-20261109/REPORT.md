# Phase C — full 34 ca / 55 lượt sau sửa contract, 09/11/2026

**Đã chạy đủ 34 ca / 55 lượt, mỗi ca một lần, không còn NOT_RUN.** Source sạch xuyên suốt dispatch: `312858f5f782d1372339e2dd03bfd3a480ce1578`; implementation code `4e0d1e542dc79f23b32d51cc348eae4e51e45c2e`. Không đổi code, prompt, model, dữ liệu hoặc câu khách giữa run; không generation retry.

Review toàn bộ hội thoại một lần sau khi hoàn tất: **22 TASK_OK, 7 MATERIAL_FAIL/chưa hoàn thành, 5 EXPECTED_HANDOFF**. Tổng nhãn bằng vòng trước; kết quả từng ca thay đổi. Đây là review thủ công của coding agent, không phải independent/blind judge hoặc điểm qualification 90%. **STOP / Phase C chưa GO.**

[Toàn bộ 55 lượt](CONVERSATIONS.md) · [Bảy ca chưa hoàn thành và draft không gửi](FAILURES.md) · [Review từng ca](REVIEW.json) · [Metrics](METRICS.json) · [Kiểm tra integrity](INTEGRITY.json) · [Nhóm ảnh thực gửi](MEDIA_COHERENCE.json) · [Source, model, commands và giới hạn](PROVENANCE.json).

## Thực thi và accounting

Owner Vertex **Gemini 3.5 Flash Lite HIGH**; verifier **GPT-6.1 Sol HIGH**, Codex CLI 0.159.2 qua credential route hiện hành. Giữ Compact V2, tối đa 3 owner/1 verifier mỗi lượt, 6 primitive/2 tool rounds, N1/retry0. Không dùng metadata B. Corpus/customer scripts giữ nguyên so với full trước. Snapshot mới gồm 107 sản phẩm, hash `2b8cf58c3ce6496ffbd0f87050133e2d627b2e38e4c6234aa9de4dbfc6066a9d`; giữ các giả định test đã được owner duyệt, không publish nguồn shop.

| Nhóm | Ca / lượt | Model send | Code send | Handoff | No-send | Generation HTTP |
|---|---:|---:|---:|---:|---:|---:|
| R1 | 4 / 7 | 6 | 0 | 1 | 0 | 22 |
| R2 | 9 / 17 | 9 | 2 | 5 | 1 | 39 |
| Remainder | 20 / 24 | 16 | 0 | 6 | 2 | 55 |
| Checkout | 1 / 7 | 1 | 5 | 1 | 0 | 5 |
| **Tổng** | **34 / 55** | **32** | **7** | **13** | **3** | **121** |

- 121 generation attempts / 121 generation HTTP: 85 owner + 36 verifier. 118 OK, 1 owner transport error, 2 owner MALFORMED sau HTTP200. Không bỏ attempt lỗi khỏi denominator.
- Verifier: 36/36 có verdict, không timeout/provider error; latency provider p50 **5.808 giây**, p95 **13.050 giây**. Adapter window p50 **6.675 giây**, p95 **13.894 giây**. Không coi các con số này là độ trễ end-to-end tổng của cuộc hội thoại.
- Token provider quan sát được: **1.153.598 input / 91.314 output**, có usage cho 120/121 generations; transport lỗi không expose usage. Cost không expose. OAuth owner 4 HTTP là accounting riêng, không cộng vào generation HTTP; embedding giữ policy/native port cũ, không suy số embedding HTTP từ số search.
- Tỷ lệ silent handoff 13/55 = **23,6%**; no-send 3/55 = **5,5%**. Handoff gồm 7 ca chưa hoàn thành, 5 ca thiếu nguồn/nghiệp vụ cần bàn giao, và một lần PURCHASE_CONFIRMED cuối checkout. Ba NO_SEND do HUMAN giữ quyền ở J4/J5, không phải ba lỗi model mới.
- Bốn DB model và một DB initial-state đã được xóa. Generation retry0, live send0, source-shop write0.

## Bảy ca chưa hoàn thành

| Ca | Kết quả thực tế | Attribution từ trace |
|---|---|---|
| **P06** — tổng ba món | Không gửi draft “1 áo và 2 quần”, dù tổng 989.000đ đúng | Source có SD023-AO/TOP và QD001/OTHER, không có tên/cấu tạo xác nhận QD001 là quần. Verifier chặn phần cụ thể hóa loại món. Không sửa source hoặc coi mã SKU tự chứng minh loại hàng. |
| **S15** — thích màu be/cảm ơn | Handoff trước verifier, không có ACK | Owner batch `apply_customer_state` + `quote_product`; quote batch cấm state write đi cùng quote nên reject trước I/O, recovery OWNER_TOOL_MODE. Không có lookup ảnh lỗi trong run này; không phải nhánh incidental-media vừa sửa lại thất bại. |
| **S16** — ảnh khách mặc | Verifier chặn, không gửi ảnh hoặc reply | Owner vẫn xác nhận “shop có” theo câu hỏi khách mặc. Evidence ghi feedback/detail/CLOSEUP và customerWearingEvidence=NOT_RECORDED. Giả định feedback test không xác nhận customer-wearing provenance. Giữ nhãn chưa hoàn thành/source-contract unresolved như run trước; không đổi thành quality PASS vì chặn an toàn. |
| **J2 T3** — thích mặc thoải mái | Owner transport error sau khi engine đã trả M | T1/T2 sửa quote trong budget, profile cuối đúng 162cm/51kg/88/70/94. T3 ghi RELAXED thành công, engine TOP/M OK, rồi owner generation2 TRANSPORT_ERROR/HTTPnull. Không phải pending-field/chart quay lại lỗi. |
| **J4 T2** — hỗ trợ giá | Handoff trước tool, T3 giữ HUMAN/no-send | Owner batch `record_negotiation` + `quote_product`, bị quote batch reject trước I/O. Không chạm result NOT_EVALUATED mới; không có thêm claim “giá hãng/không hỗ trợ” được verifier chặn như trước. |
| **S09** — giặt tay hay máy | HTTP200 nhưng completion sai schema, handoff | `read_product` dùng `selection=DETAILS_ONLY` đồng thời có `offerType`, sai nhánh schema; adapter OWNER_TOOL_OUTPUT/MALFORMED. Chưa đọc care source, không phải shop thiếu hướng dẫn giặt. |
| **S04** — màu khác | Cùng lỗi completion như S09 | `DETAILS_ONLY` + `offerType` sai nhánh. Không chạy lại generation để sửa hoặc gán đây là thiếu nguồn màu. |

Trong bảy ca: hai lỗi kế hoạch batch của owner, hai lỗi schema completion, một lỗi transport, một suy diễn loại component và một contract nguồn ảnh chưa đủ. Không gom thành “verifier chặn quá tay” hoặc “thiếu context” nói chung.

## Bản sửa đã được chạm tới đâu?

- **P08: có bằng chứng trực tiếp.** Owner vẫn copy marker `__NO_COLOR__` từ SET_VAY sang AO. Code mới trả COLOR_REQUIRED/NEEDS_CUSTOMER_CHOICE thay vì báo hết áo M. Reply actual: “Áo thêu Thạch Thảo có hai màu là trắng và be (màu trắng có sẵn, màu be hàng đặt trước). Chị lấy áo màu nào ạ?”. Cart revision1 vẫn giữ SET_VAY, không báo đã đổi xong. Script dừng ở đó: chưa chứng minh mutation sau khi khách chọn màu.
- **S15: chưa exercise nhánh sửa media.** Dừng sớm bởi batch state+quote bị cấm. Không thể dùng outcome này kết luận automatic media handoff còn hay đã hết ở native.
- **S05: không còn gửi nhầm ảnh, nhưng không phải native chứng minh REPLACE.** Owner chỉ search rồi read hai ứng viên, chọn SQ748 bằng text và không gọi select ảnh; actual gửi 0 ảnh. Không có ảnh SQ675 lẫn. Phạm vi code gate hiện hành không bắt mỗi ứng viên search có ảnh; không tự coi thiếu ảnh là material mới. Lifecycle REPLACE/APPEND vẫn mới được chứng minh deterministic trong implementation tests.
- **J4: chưa exercise NOT_EVALUATED.** Batch bị reject trước record_negotiation; chưa có bằng chứng model sẽ dùng trạng thái mới đúng.
- **S16: giới hạn nguồn đã được chuyển tới cả hai model**, verifier dùng nó để chặn câu xác nhận ảnh khách mặc. Owner chưa tận dụng giới hạn để tự handoff trước draft; chưa có ảnh đúng provenance để đáp ứng yêu cầu.
- **J1: gửi được tổng trước giỏ** 978.100đ cho hai áo M/L; không có transport lỗi ở sample này. Không có code chữa transport nên không quy việc phục hồi cho patch.
- **S08: không còn tự thêm lớp lót** trong sample này; dùng đúng “thiết kế 2 lớp”. Prompt owner không đổi và patch không chữa semantic paraphrase, nên chưa có bằng chứng ổn định từ N1.

## So với full trước

| Chỉ số | Full trước | Full này |
|---|---:|---:|
| Review TASK_OK / MATERIAL / EXPECTED_HANDOFF | 22 / 7 / 5 | 22 / 7 / 5 |
| Model send + code send | 33 + 7 | 32 + 7 |
| Handoff / no-send | 12 / 3 | 13 / 3 |
| Generation HTTP | 128 | 121 |
| Lỗi transport / malformed | 1 / 0 | 1 / 2 |

Bốn ca trước chưa hoàn thành nay phục vụ được: **P08, J1, S05, S08**; bốn ca từng đạt nay chưa hoàn thành: **P06, J2, S09, S04**. S15/S16/J4 vẫn chưa hoàn thành nhưng S15/J4 đổi failure layer. N1 và fresh snapshot không phải paired stability test. Chưa có cải thiện tổng thể đủ để nói bản sửa đã giải quyết xong Phase C; cũng không nên rollback toàn bộ chỉ từ nhãn tổng vì P08 đã có bằng chứng sửa đúng cơ chế.

## Giọng và hiệu quả bán hàng

Giọng vẫn dài, nhiều tính từ và thường dẫn lại chất liệu trước trọng tâm: S06 phối quần nâu là ví dụ rõ; P04/S07 còn nhắc lại chiều cao/cân nặng. J2 dùng “giúp em”; J3 còn “em ghi nhận/chuẩn bị gửi”. Giữ chúng là hạn chế nhỏ theo chỉ đạo owner, không hạ cả ca chỉ vì một từ. S08 chọn Diệp An rồi lại mở Odette cho khách tự chọn nên sức quyết định chưa mạnh. Form giá và ảnh ở các ca hỏi giá vẫn hoạt động; checkout đủ bảy lượt hoàn tất đúng code-owned flow.

Lượt này không sửa prompt hay chạy lại để tìm câu hay hơn. Những lỗi khiến khách không nhận được câu trả lời được ưu tiên ghi riêng khỏi giọng chưa tối ưu.

## Kiểm tra và giới hạn

- Hash/source/world, roles/caps, evaluator firewall và accepted text-Outbox hashes đạt trên 121 request; 32 exact verifier-draft→captured-text bindings, 36 native witness rows có mặt. Ba loại literal riêng tư giả lập không xuất hiện trong captured provider bodies được kiểm. Không claim exhaustive PII audit hoặc replay đầy đủ final gate.
- Một transport lỗi không có response modelVersion; audit ghi **unavailable**, không gọi đó là response đã xác minh model. 120 response còn lại có observed version phù hợp. Audit v1 quá chặt ở lỗi transport đã dừng; v2 sửa cách accounting sau run, giữ v1, không đổi runtime/corpus/verdict hay chạy lại model.
- Lần capture đầu dùng nhầm danh sách có SM613 fixture, fail validation null product trước generation. Lần capture02 dùng đúng danh sách sản phẩm thật như full trước và chụp mới 107 sản phẩm. Không thay fixture làm nguồn thật, không giấu failed capture.
- Các commands capture/initial/preparation/seal/dispatch và raw artifact hashes nằm trong PROVENANCE/RAW_ARTIFACTS. Không chạy lại worker build/typecheck/lint trong lượt execution-only; evidence implementation trước là riêng. Không có independent/blind judge, formal qualification/C3 A/B hoặc stability qualification.

**Recommendation: STOP / chưa Phase C GO.** Không tự fix hoặc mở run tiếp. Hướng kiểm tra tiếp cần bám vào batch hợp lệ và schema nhánh tool cho S15/J4/S04/S09; không thêm ví dụ prompt để chữa cả bốn và không dùng output của lần này để đổi nhãn nguồn ảnh.
