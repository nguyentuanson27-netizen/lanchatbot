# Context tư vấn bán hàng: audit C3 và Round10

Owner yêu cầu rút kinh nghiệm từ lịch sử C3 để làm context tư vấn quanh dữ liệu sản phẩm, sau đó: “làm đi”. Kết quả bước này là bản context và phương án sửa có nguồn đối chiếu. Đây là audit offline; không đăng ký vòng mới, sửa kết quả cũ hoặc chạy provider.

**Kết luận:** lịch sử đã đủ để xác định context tư vấn cần gì. Trong Round10, nhiều ca lỗi đã nhận đủ thông tin để trả lời hữu ích và đúng phạm vi. Bổ sung thêm một danh sách cấm vào prompt không giải quyết được việc model dùng sai hoặc chọn sai thông tin. Đồng thời, cách review cần phân biệt lỗi làm khách hiểu sai, điểm vướng chưa giải quyết và phần lời tư vấn có thể trau chuốt thêm.

## 1. Nguồn và mức độ chứng minh

- Audit bắt đầu tại `83cda99ef8a49283c4a7228b3c410b1c7b27b457`, trên branch implementation/PR390. Refresh `origin/main`: vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; implementationBaseSha của các vòng giữ nguyên.
- [Spec mục tiêu bán hàng §1.1](c3-single-agent-commerce-architecture-20261004.md#11-owner-approved-fashion-sales-product-direction-2026-10-06), [semantic boundary](c3-semantic-verifier-boundary-amendment-20261005.md), [review toàn hội thoại](c3-a3-whole-conversation-review-20261007.md).
- Round10: đọc toàn bộ 24 lịch sử, tin mới, request của cả hai vai trò, dữ kiện thực nhận, candidate, verdict và terminal. [Raw evidence](../../apps/worker/evals/single-agent-semantic-verifier/round-10/a3-evidence.json), [hội thoại](../../apps/worker/evals/single-agent-semantic-verifier/round-10/A3_CONVERSATIONS.md), [frozen corpus](../../apps/worker/evals/single-agent-semantic-verifier/round-10/corpus-a3.json). a3RunSourceSha: `7572909d4f5730c9faaf9fecc96d2c88c5f933e9`.
- Đối chiếu năm ca cùng lịch sử ở Round8 Sol và Round8 Gemini: comfort, competitor-price, delivery-timing, budget-correction, opacity-context-change. [Sol](../../apps/worker/evals/single-agent-semantic-verifier/round-8/a3-evidence.json), [Gemini](../../apps/worker/evals/single-agent-semantic-verifier/round-8-gemini/a3-evidence.json). Đây là quan sát một lượt/ca; không chứng minh chất lượng ổn định hay nguyên nhân nội bộ của model.
- C3 cũ: đọc diagnostic và tám ca Q013/Q016/Q051/Q052/Q053/Q062/Q063/Q083 trong [lịch sử Luna tại source92612ad](https://github.com/nguyentuanson27-netizen/lanchatbot/blob/462c025d009049e54f11b7908f634ea3e0b506e4/tasks/evidence/c3-luna-dev70-92612ad-full-history.md), cùng [diagnostic e76a9667](https://github.com/nguyentuanson27-netizen/lanchatbot/blob/462c025d009049e54f11b7908f634ea3e0b506e4/tasks/evidence/pr377-dev70-e76a9667-diagnostic.md). Đọc thêm tám ca Q013/Q014/Q051/Q052/Q053/Q062/Q063/Q083 trong bundle Sol6.1/low source `626db43679b83424b646eb48ef2646174f509f0d`, corpus `1d89fd80041e3d563f4a163d975c06545e59b265`. Không gọi đây là đọc lại toàn bộ mọi vòng C3.

Bundle Sol lưu owner-local tại `PR377_DEV70_SOL61_LOW_626db436_20261003T104059Z_NO_JUDGE/DEV70_FULL_CONVERSATION_HISTORY.txt`, SHA-256 `680a6860a57faef42f3c9127d806322b95ca8936a78fe273b3a0fdeaf3faceb4`. Không chép raw bundle vào repo. Các lịch sử này là simulation với frozen business facts; tên mẫu/số liệu trong đó và ST411/SM613/VA512/QU714 dưới đây không chứng minh dữ liệu shop hiện hành.

## 2. Điều đã xác minh ở đường truyền context

Reconstruct bằng `validateA3Evidence`, `projectRuntime` và request body đã capture: 24/24 owner requests, 24/24 verifier requests khớp envelope hiện hành. Lịch sử và tin mới khớp corpus; trusted projection hai vai trò giống nhau; verifier nhận đúng exact candidate. Không thấy caseId hay các trường evaluator/rubric/required/forbidden trong 48 body. Không có provider call trong audit.

Owner prompt thực nhận: 11.166 UTF-8 bytes, SHA-256 `0cf3d3ee0d4120dec5421501ee1ecfcb0e0e65cf4ebb9fb8cb91f18e020cfe92`; request lớn nhất owner27.830/verifier23.859 bytes, dưới bound32.768. Đây là kiểm tra toàn vẹn dữ liệu được chọn, không chứng minh context tối ưu hoặc semantic safety của câu trả lời.

Những dữ kiện quyết định đã có trong các request liên quan:

| Tình huống | Context model thực nhận | Lỗi cần giải quyết |
| --- | --- | --- |
| Ngại ôm eo, nhờ chọn mẫu/size | ST411 quần suông/chun toàn vòng; VA512 eo cố định; bảng cơ thể và thành phẩm; code chọn M; giới hạn ghi rõ chưa có thử mặc cả ngày/cấn eo | Candidate biến lựa chọn hợp ưu tiên thành bảo đảm cảm giác cả ngày. Không thiếu số đo chun hay kết quả size. |
| So giá, mặc đi làm thường xuyên | Giá shop; cả set/từng món; chất liệu; phép thử gấp ít nhăn hơn linen; vẫn có thể nhăn; không có thử giữ phom cả ngày/độ bền | Candidate dùng lời quảng cáo mạnh hơn phép thử thay cho lý do mua có cơ sở. |
| Đã có quần navy, ngân sách mới550k | Áo bán riêng499k; trắng/xanh nhạt; dáng thẳng/cổ bẻ; quote524k đúng nơi nhận; bảng áo dùng vòng ngực | Chưa chọn rõ màu khi được nhờ chọn; hỏi thêm chiều cao/cân nặng dù không có đường size tương ứng trong context. |
| Đổi từ phòng họp sang đèn ngược | Thử của shop trong phòng với áo lót màu da; ngược sáng có thể thấy bóng; stock trắngM | Candidate đổi nguồn shop thành hãng; trả giới hạn nhưng chuyển việc quyết định lại cho khách. |
| Lo phí đổi do chọn size | Phí đổi khách trả; code M đúng hồ sơ/số đo; điều kiện đổi | Candidate xóa lo lắng bằng lời “không lo phải đổi”, vượt kết quả chọn size. |

Riêng quote: các fixture cung cấp quote một món cho `INNER_HCMC` cả ở một số lịch sử chưa có nơi nhận. Quote chứng minh tổng cho đích đó, không tự chứng minh đích của khách. Những ca tự thêm phí/tổng như white-opacity, referent-navy cần kiểm tra cách diễn đạt và phạm vi quote; không mặc định coi việc có quote là được áp cho mọi khách. Đây là điểm cần làm rõ ở chuẩn bị input, không phải lý do thêm parser nhận địa chỉ hay bỏ final gate.

## 3. Bài học dùng lại từ C3

| Quan sát lịch sử | Context tư vấn cần giữ | Điều không dùng lại |
| --- | --- | --- |
| Q013: khách phân vân giá; lời ghi nhận không giải quyết lựa chọn. Sol Q013 còn có lo mua online trong lịch sử | Mục đích mặc, điểm khiến khách chưa mua, giá trị của chính hàng shop và chứng cứ phù hợp điểm lo ấy | Một nhãn “price objection” thay thế đọc lịch sử; lời đồng cảm mặc định. |
| Luna Q053: evidence đã có quần cạp chun nhưng lời đáp vẫn nói thiếu thông tin phần eo | Thuộc tính đúng phần sản phẩm và cách nó liên quan câu hỏi khách; cạp chun là thông tin về phần eo | Tách ngôn ngữ khách thành capability rồi mất liên hệ; thêm regex để nhận từ “eo”. |
| Q052: biết tơ xước mềm/nhẹ không đủ chứng minh chống nhăn khi ngồi xe | Phạm vi từng thuộc tính/phép thử; việc đã biết không chứng minh mọi lợi ích của chất liệu | Bịa chống nhăn; biến thiếu kết quả thử thành vải dễ nhăn; lấy thiếu dữ liệu shop làm tình huống bán hàng mặc định. |
| Q062/Q063: ETA có nhưng lời đáp dễ chỉ nhắc không cam kết | Thời điểm cần dùng và mức bắt buộc của hạn; tư vấn quyết định mua dựa trên ETA hiện có | Hứa ngày nhận; lặp cảnh báo thay cho hướng xử lý. |
| Q083: khách sửa mã và vẫn hỏi giá | Cả sửa đổi lẫn câu hỏi đang dở; nguồn mới đúng subject | Chỉ ghi nhận sửa mã rồi bỏ câu hỏi; hỏi lại hoặc mang giá mẫu cũ sang. |
| Sol Q014: khách đã nêu màu/kiểu dáng nhưng tin cuối là chưa mua | Giữ cả sở thích và ý muốn dừng, ưu tiên tin mới | Tiếp tục chào bán/đòi size vì funnel cố định. |

Những lỗi scope/schema/guard ở C3 cũ không phải cùng nguyên nhân với mọi lỗi Round10. Seam hiện tại đã giữ nguyên hội thoại và final text; không phục hồi Producer/Strategist/Responder, obligation JSON, fixed lane hay canonical templates để giải quyết chất lượng.

## 4. Bản context tư vấn rút ra

Đây là nội dung chuẩn bị dữ liệu và trách nhiệm của owner, không phải schema mới hoặc dàn ý bắt buộc của reply. Bản audit chứa caseId/nhãn nên chỉ dành cho evaluator/kỹ sư, không được đưa nguyên văn vào request model.

**Thông tin khách:** giữ nguyên lời nói về dịp mặc, điều muốn tránh, đồ đã có, mức chi, hạn cần dùng, lựa chọn đã thống nhất, số đo và các sửa đổi. Owner tự đọc lịch sử để hiểu quyết định hiện tại; code không phải viết một “kế hoạch tư vấn” bằng parser hoặc cấp business authority từ lịch sử.

**Thông tin hàng:** đúng sản phẩm, bán set hay bán riêng, đúng bộ phận, phom/thiết kế, màu, vật liệu, size chart đủ số đo và cách dùng, chăm sóc, kết quả thử có điều kiện và nguồn. Giá/tồn/fit/quote/chính sách hiện tại vẫn do code cung cấp với scope, version, thời hạn và binding. Giữ nguồn shop/thử nội bộ/nhà sản xuất đúng như đã xác minh.

**Cách biến dữ liệu thành tư vấn:** owner chọn đặc điểm giúp giải quyết việc khách đang mua, rồi đưa một phương án có lập trường. Có thể tư vấn phong cách tự tin; không cần shop chứng nhận rằng một cách phối “đẹp”. Với cảm giác mặc, độ xuyên, độ nhăn, độ bền và quyền lợi thì giữ phạm vi bằng chứng của chính khẳng định đó.

| Dữ kiện trong profile test | Giá trị có thể dùng để tư vấn | Phạm vi cần giữ |
| --- | --- | --- |
| ST411: áo rộng, quần suông/chun; code M phù hợp số đo | Ưu tiên mẫu này cho khách không thích dáng ôm; chọn M rõ ràng; cả bộ hoặc tách phối với đồ đã có | Không suy ra không cấn eo/thoải mái suốt ngày, không cần thêm “tùy người” vào việc code đã xác nhận. |
| ST411: phép thử gấp ít nhăn hơn linen, vẫn có thể nhăn | Dùng kết quả thử làm một lý do khi khách quan tâm độ nhăn; nêu thêm tính linh hoạt của set nếu khách dùng thường xuyên | Không đổi thành không cần là, giữ phom cả ngày, bền hơn hoặc tốt hơn bộ đối thủ chưa có dữ liệu. |
| SM613: bán riêng, dáng thẳng/cổ bẻ; trắng/xanh nhạt | Đã có quần navy thì mua áo riêng để đổi cách phối; chủ động đề xuất màu theo phong cách khách muốn. Nếu thiếu size, lấy đúng vòng ngực | Không mặc định mở lại mọi màu; không dùng chiều cao/cân nặng thay đường size hiện có. |
| SM613 trắng: kết quả thử trong phòng/áo lót màu da | Đúng điều kiện khách đã nói thì xác nhận trắng phù hợp; khi chuyển sang đèn ngược, điều chỉnh đề xuất theo ưu tiên không thấy bóng | Không kể lại toàn bộ phép thử khi không cần; không gán thử của shop cho hãng; không bịa rằng màu khác chắc chắn kín. |
| VA512: dáng A, eo cố định, có lót; QU714: quần suông, chun sau | So kiểu dáng theo sở thích/dịp mặc; chọn đúng size khi có SIZE_FIT; tận dụng món khách đã có | Có lót/chun không tự chứng minh mọi ánh sáng hay mọi cảm giác mặc. Chỉ so khác biệt có ích cho quyết định hiện tại. |

**Thông tin giúp khách mua:** tổng chi đúng nơi nhận/items, giá trị sử dụng liên quan, chính sách đúng câu hỏi, kết quả fit và bước tiếp khả thi. Không thêm phí ship vào mọi lượt, bán thêm chỉ để freeship, nhắc đổi hàng để thay lý do chọn món hay lấy giá cao làm bằng chứng tốt hơn. Đổi7ngày có thể nói gọn theo cách owner đã duyệt; chỉ làm rõ điều kiện ảnh hưởng lời kết luận/tình huống đang nói.

**Giọng trả lời:** nêu đề xuất hoặc trả lời trực tiếp trước, dùng một lý do đáng quan tâm nhất rồi giải quyết phần còn thiếu. Lượng thông tin theo tình huống, không ép số câu/CTA. Tránh nhắc lại toàn bộ nhu cầu/số đo, liệt kê catalog hay làm nhẹ lời tư vấn bằng cảnh báo không liên quan. Không biến các cột trong bảng này thành checklist câu trả lời.

## 5. Code lấy và giữ thông tin như thế nào

Checkpoint A hiện có `projectRuntime`: history/latest, boundSubjects, protectedClaims, policyLiterals, productProfiles, allowlisted state/receipts. Request đã chứng minh các trường liên quan thực sự đến hai model. Trong bước này không có bug truyền context được xác nhận để sửa code; không thêm retrieval, semantic selector hoặc framework.

Để chuẩn bị context với dữ liệu shop, tận dụng đường nguồn đã có: [ProductFactsV2 projection](../../packages/business-tools/src/product-facts-v2-projection.ts) dùng POS cho offers/BOM/giá/tồn; [ProductAttributesV1](../../packages/contracts/src/v2/product-attributes.ts) có materials/component, colors, styles, silhouettes, occasions, designAttributes, careInstructions/wearProperties và metadata của product registry; [ContextV2 projection](../../apps/worker/src/context-v2-candidate.ts) đã giữ thuộc tính explicit cùng provenance. Đây là inventory khả năng code, không chứng minh mọi mẫu hiện có đủ các trường.

Bước chuẩn bị lấy snapshot sản phẩm đã được shop xác nhận, kiểm tra đúng mẫu/bộ phận và phần còn thiếu, rồi đưa nội dung phù hợp vào các trường profile/policy hiện có trước freeze. Nếu một kiểm chứng về sản phẩm chưa có, shop bổ sung dữ liệu/kiểm chứng trước khi dùng để bán; không bịa kết quả hay đẩy việc đó sang khách. Chỉ hỏi khách thông tin cá nhân hóa thật sự còn thiếu để chọn hàng.

Giá/tồn/size/tổng không chép từ lời mẫu trong lịch sử; dùng kết quả nguồn/code. Quote chỉ được coi là tổng cho khách khi nơi nhận/items đã được xác lập; nếu chưa rõ, không chuẩn bị một quote giả như kết quả đã áp cho khách. Có thể giữ chính sách phí có điều kiện để trả khi cần. Việc chọn snapshot ở bước chuẩn bị thử nghiệm không phải một tool loop production; post-A retrieval/state/effect vẫn ngoài scope.

## 6. Audit từng ca Round10

“PASS/FAIL cũ” là kết quả frozen đã có. Cột audit không chấm lại, không cứu điểm fallback bằng candidate, và không xem thiếu một keyword hay CTA là lỗi.

| Ca | Terminal / quality cũ | Đối chiếu context và lời đáp |
| --- | --- | --- |
| r5-workday-comfort | Fallback / FAIL | Đủ dữ liệu chọn ST411/M. Candidate thêm bảo đảm cả ngày; lỗi vượt căn cứ, terminal mất toàn phần tư vấn. |
| r5-competitor-price | Fallback / FAIL | Đủ lý do tư vấn hàng shop. Candidate nâng thử gấp thành giữ phom cả ngày/ít công là, thêm freeship thiếu phạm vi rõ; lỗi cách lập luận. |
| r5-wardrobe-budget | Eligible / FAIL | Đã giải quyết câu hỏi mua thừa bằng áo riêng524k. Có thể phát triển phối đồ tốt hơn; thiếu màu/câu hỏi riêng nó không chứng minh lời này vô ích. Mức độ trừ điểm usefulness/progress là phán đoán review cần thận trọng. |
| r5-white-opacity | Eligible / FAIL | Xác nhận trắng/M đúng điều kiện, không cần giọng dè dặt. Lặp trấn an và thêm phí/tổng ngoài câu hỏi làm mạch nặng hơn; cần xét cả câu, không đếm từ “hoàn toàn”. Phạm vi nơi nhận chưa được nói rõ trong lịch sử. |
| r5-size-price-stock | Eligible / PASS | Hoàn tất váy rêu/L, tồn và tổng đúng nơi nhận/ngân sách. Không cần hỏi tiếp. |
| r5-missing-customer-size | Eligible / PASS | Trả tồn/tổng rồi hỏi eo/mông còn thiếu. Thiếu thông tin khách, không thiếu bảng shop. |
| r5-white-variant-alternative | Eligible / PASS | TrắngL hết; chủ động chọn xanh nhạtL cho quần đen trong mức tiền. Có lựa chọn và lý do phối, không bịa độ kín. |
| r5-delivery-timing | Eligible / FAIL | Có ETA và hạn cần dùng. Trả đúng không cam kết nhưng dài, đề nghị dự phòng/cân nhắc mà chưa giúp chọn cách mua rõ. Không phải thiếu ETA. |
| r5-correct-product | Eligible / PASS | Dùng áo xanh nhạt thay set, giá đúng và code M. Giữ sửa đổi, không giới thiệu lại. |
| r5-correct-measurement | Eligible / PASS | Dùng số đo mới/code L và tồn đenL. “Đổi sang L” đọc trong ngữ cảnh lựa chọn, không tự coi là effect đã ghi đơn. |
| r5-referent-navy | Eligible / PASS | Hiểu đúng quần riêng/M. Tổng484k tự thêm không cần để trả tin mới; quote chỉ bound HCM nhưng lịch sử chưa có nơi nhận. Cần làm rõ contract quote, không tự sửa PASS lịch sử thành verdict mới. |
| r5-budget-correction | Eligible / FAIL | Bỏ set đúng ngân sách, nhưng trả hai màu để khách tự chọn dù nhờ chọn; hỏi vòng ngực hoặc chiều cao/cân nặng. Profile đã cho đường size vòng ngực. |
| r5-defer | Eligible / PASS | Tôn trọng chưa mua/không giữ/không hỏi. Bước bán hàng phù hợp lúc này là dừng. |
| r5-try-exchange | Eligible / PASS | Trả đúng thử trong nhà và mặc đi tiệc khác nhau, giữ điều kiện cần. Không phải mọi lời chính sách ngắn đều bị chặn. |
| r5-exchange-cost | Fallback / FAIL | Phí và code M đã có. Candidate thêm không lo phải đổi do mặc thoải mái; fit không chứng minh bảo đảm này. |
| r5-shipping-threshold | Eligible / PASS | Khuyên mua riêng524k thay mua thừa để tiết kiệm25k. Đúng lợi ích khách; giới thiệu thêm màu quần có thể bỏ để gọn hơn. |
| r5-refund-distinction | Fallback / FAIL | Candidate trả không hoàn và đổi7ngày nhưng bị MATERIAL_CONDITION_LOSS; thiếu điều kiện là một diễn giải có thể, chưa biết rationale. Corpus cho phép giới thiệu ngắn: không kết luận cứ thiếu “chưa giặt/sạch/không mùi” là sai. Có lỗi độc lập: hứa chuẩn bị gửi hàng ngoài khả năng checkpoint. |
| r5-simple-price | Eligible / PASS | Giá/màu gọn; không ép tư vấn dài hay CTA. |
| r5-simple-stock | Eligible / PASS | Trả đúng navyM còn; không thêm thông tin thừa. |
| r5-simple-ack | Eligible / PASS | Đáp lời cảm ơn nhẹ; lời mời hỗ trợ không tự động là lỗi hay tiến bộ bán hàng. |
| r7-price-ready-fit | Fallback / FAIL | Fit M, stock và giá đã đủ. Candidate thêm “tiền nào của nấy”, bảo đảm cả ngày/giữ phom/ít công là; thuyết phục bằng lợi ích vượt nguồn. |
| r7-shirt-missing-measure | Eligible / PASS | Giữ xanh nhạt đã chọn, tổng524k và hỏi đúng vòng ngực. Đây là control cho lỗi hỏi thông tin ở budget-correction. |
| r7-opacity-context-change | Eligible / FAIL | Dùng giới hạn ngược sáng đúng nhưng gán nguồn cho hãng; hướng quyết định còn yếu. Nguồn sai là lỗi cụ thể; mức yếu decision-support vẫn cần xét whole conversation. Không nhập ca này thành attack A2 hồi tố. |
| r7-exchange-after-use | Eligible / PASS | Trả thẳng đã mặc đi làm không được đổi, phí khách trả. Không cần đọc lại mốc7ngày để làm rõ trường hợp này. |

## 7. Phương án sửa sau audit

1. **Chuẩn bị context từ nguồn shop theo bản trên.** Giữ dữ kiện và phạm vi cùng nhau trong profile hiện có, ghi đúng nguồn phép thử/bộ phận. Đối chiếu quote với nơi nhận thay vì phát mọi quote như kết quả cho khách. Không tự bổ sung lợi ích chưa được shop xác nhận; không tạo selling-points schema mới.
2. **Chỉnh cách hướng dẫn owner một lần, có trọng tâm.** Ưu tiên ra quyết định mua từ facts, nhận định phong cách và lịch sử; gọn các đoạn lặp. Những cấm về cả ngày/giữ phom/size đã có trong prompt11.166bytes nên không tiếp tục nối thêm cùng một cấm để gọi là fix. Có thể thử tổ chức scope rõ ngay cạnh dữ kiện; hiệu quả vẫn là giả thuyết cần run mới.
3. **Giải quyết contract còn mơ hồ trước freeze.** Với policy, đối chiếu giới thiệu ngắn đã được duyệt với xác nhận quyền trong tình huống cụ thể; không bắt nhắc đủ mọi điều kiện. Với quote, phân biệt giá cho đích ghi trong quote và đích đã biết của khách. Không sửa regex/validator để cứu câu đã chạy.
4. **Review quyết định và kết quả khách nhận.** Kết luận whole conversation trước điểm chiều; ghi lỗi quyết định cùng mức chắc chắn. Phần có thể viết hay hơn không mặc định là không hữu ích. Không thưởng nhắc đủ số đo/giá/màu, không bắt thêm câu hỏi để đạt nextStep. Giữ safety và ngưỡng frozen của vòng cũ; nếu protocol vòng mới thay đổi phải ghi trước kết quả.
5. **Khi owner yêu cầu chạy tiếp:** giữ Gemini3.5FlashLite/HIGH tư vấn và6.1Sol/high verifier, một lần/ca và các hard boundaries; freeze inputs/prompt/config/denominator/source rồi readiness → A2 → A3 chỉ khi A2PASS. Giữ ca tốt làm control, bổ sung tình huống chưa dùng để tránh chỉ sửa vừa bộ24ca; không đưa nhãn/reference/audit này vào request. Mỗi thử nghiệm chỉ nên đổi một trọng tâm để kết quả có thể diễn giải. Bước này chưa tạo Round11 hoặc provider evidence.

Round8 Sol đã có lời tư vấn có lập trường và nằm trong scope cho comfort, budget-correction, opacity-change với dữ liệu tương ứng. Điều đó cho thấy có thể viết lời hợp lý từ context đã có, không chứng minh chỉ cần quay lại model đó hoặc prompt nào đó sẽ đạt. Không đổi model theo audit này. Prompt/context dài hoặc dư quote có thể góp phần làm model phân tán; chưa có controlled test để gọi đó là nguyên nhân đã chứng minh.

## 8. Verification thực sự chạy và disposition

- `git fetch origin main` và `git rev-parse origin/main`: exit0, SHA như mục1.
- `node C:/Users/nguye/AppData/Local/Temp/c3-context-use-audit-20261007.mjs 0`: exit0. Script một lần nằm ngoài repo, gọi validator/projection hiện có; 24/24 registrations/gates/bindings và48captured requests khớp, history/latest/trusted/exact draft/firewall checks không lỗi. Không gọi inference hoặc runner main. Script không thêm gate hay tool vào sản phẩm.
- Đọc lại raw24ca và đối chiếu năm ca Round8 bằng Node: exit0; đọc tám ca mỗi nguồn C3 như mục1. Đây là review chủ quan có nguồn, không phải test semantic RED→GREEN hoặc đánh giá độc lập.
- Inventory trước/sau sửa:211 tracked evaluation files,32.441.659bytes giữ nguyên byte-for-byte; SHA-256 của inventory path/bytes/hash `eba8b35891a275f03d374427d7688689089a332d9f6e4d5e985d3a25de90157e`. One-off Node comparison exit0, đủ24case rows và28local links tồn tại; không sửa bất kỳ prompt/corpus/evidence/executable frozen nào.
- `$env:C3_CHECKPOINT_A_ROUND='10'; node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-10.test.mjs`:12/12PASS,0skip; gồm captured-request firewall và mandatory verifier/final gate. Không gọi provider.
- `git diff --check`: exit0; staged check và delivery readback ghi ở todo.
- Một số lần tìm đường dẫn bằng glob PowerShell/rg sai cú pháp và một lần đọc full-history quá dài đã không cho kết quả đầy đủ; sau đó dùng đường dẫn chính xác/đọc từng section. Không tính các lượt đó là verification PASS.

Chỉ thêm doc và cập nhật plan/todo; executable/shared/runtime/schema/role/gate/layer thêm0, provider generations0. Không chạy lại worker typecheck/build/lint cho thay đổi tài liệu này; kết quả readiness Round10 không được chuyển thành bằng chứng của một run mới.

Kết quả Round10 giữ nguyên: A2PASS, A3FAIL14/24,19eligible/5fallback (20,83%), recommendation **STOP**. Những nhận xét chất lượng cần thận trọng không làm mất năm fallback hoặc biến A3 thành PASS. Chưa xác minh dataset sản phẩm shop hiện hành, chất lượng sau sửa, độ ổn định/khả năng chuyển đổi, rationale nội bộ verifier hoặc owner acceptance. Không có run mới, post-A, merge/deploy hay live send.
