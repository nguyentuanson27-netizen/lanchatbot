# Full24-case B1 replay — STOP nghiệm thu bán hàng

Đã chạy đủ **24/24 ca, mỗi ca một lần** theo [scope đã freeze](SCOPE.md), giữ nguyên **Gemini 3.5 Flash Lite High** tư vấn và **GPT-6.1 Sol High** verifier. **14 SEND_ELIGIBLE, 10 fallback; không handoff/no-send.** Review toàn hội thoại: **10 USABLE, 4 NEEDS_EDIT, 10 FALLBACK_OR_NO_SEND**. Đủ điều kiện gửi không đồng nghĩa tư vấn đã dùng tốt. [Toàn bộ câu khách nhận](CONVERSATIONS.md), [primary từng ca/10 dimensions](PRIMARY_REVIEW.json), [nháp bị chặn và chẩn đoán](DIAGNOSTICS.md).

## Đánh giá thực tế

Báo giá cả bộ đạt3/3; xử lý hàng đã dùng/mặc thử/cắt tem và giặt đạt3/3. Bot đọc đúng policy hiện tại, phân biệt ướm với mặc thử và từ chối chính tình huống khách, không cần đọc mọi điều kiện. Tồn và giá áo/váy lẻ đều đúng các lần đọc theo size M; một ca hỏng bước tiếp theo vì mời lên đơn ngoài capability read-only. Tư vấn cả bộ799k ởca23 là upsell hợp lý trong850k, có lý do dùng lại chân váy khách đã có; không ép mọi ca mua ít hơn.

Chưa dùng tốt: đổi hoàn cảnh0/3usable, policy thời hạn/phí0/3 và search→read0/3. Hai ca đã tìm đúng mã nhưng đọc nhầm ref rồi hết budget; tên Khánh Trang không được retrieval trả đúng target. Ba câu policy trả đúng15ngày/30.000đ nhưng chuyển giải thích quy định thành cho phép đổi khi chưa xét đơn. Có lỗ hổng context availableOffers giữa owner/verifier ởca15. Hai lời tư vấn công năng vượt nguồn (spotlight/không nóng), một suy diễn POS lỗi thành không bán lẻ bị chặn. Không coi mọi fallback là verifier quá chặt.

Giọng còn thiên mô tả catalog và khen dồn ở câu phức tạp, nhưng câu giá ngắn gọn và lời từ chối đã hiểu đúng tình huống. Không chấm theo keyword, không cấm nhắc một fact liên quan hoặc upsell. Bốn ca cần sửa được ghi cả lý do toàn đoạn, không lấy từng mảnh câu làm bằng chứng đã đạt.

| Nhóm | Số ca | Dùng được | Cần sửa | Fallback/no-send |
| --- | ---: | ---: | ---: | ---: |
| Đổi hoàn cảnh | 3 | 0 | 1 | 2 |
| Policy hiện tại | 3 | 0 | 0 | 3 |
| Nguồn thiếu một phần | 3 | 1 | 1 | 1 |
| Hỏi giá | 3 | 3 | 0 | 0 |
| Món lẻ/giá/tồn | 3 | 2 | 1 | 0 |
| Tìm rồi đọc | 3 | 0 | 0 | 3 |
| Cân nhắc mua | 3 | 1 | 1 | 1 |
| Hàng đã dùng/thử/giặt | 3 | 3 | 0 | 0 |

## Toàn bộ24kết luận

| Ca | Kết quả khách nhận | Review toàn lượt | Lý do |
| --- | --- | --- | --- |
| 1/b1-changed-occasion | FALLBACK | FALLBACK_OR_NO_SEND | Khách đổi sang sân khấu và hỏi độ kín; tin thực nhận không giúp chọn tiếp hay nêu được phần nào có căn cứ. |
| 2/b1-current-policy | FALLBACK | FALLBACK_OR_NO_SEND | Nguồn có hạn và phí hiện tại nhưng khách không nhận được câu trả lời về ngày thứ mười hoặc đổi màu. |
| 3/b1-partial-source | SEND_ELIGIBLE | USABLE | Trả đúng hai chất liệu, tách rõ giá/tồn size M đang chưa đọc được. Lời hơi giống mô tả catalog và nhắc hệ thống, nhưng vẫn trả phần biết được mà không bịa hoặc hứa theo dõi. |
| 4/b1-price | SEND_ELIGIBLE | USABLE | Một câu báo đúng giá cả set 799.000đ, đủ cho câu hỏi; không thêm bước hoặc câu hỏi thừa. |
| 5/b1-component-stock | SEND_ELIGIBLE | USABLE | Đúng áo bán riêng, giá 499.000đ và tồn đã đọc theo M. Gọi khách là bạn làm giọng lệch nhẹ, không làm sai nội dung giao dịch. |
| 6/b1-search-read | FALLBACK | FALLBACK_OR_NO_SEND | Khách chỉ hỏi giá đúng mã SD375 nhưng chỉ nhận fallback; chưa có thông tin mua hàng dùng được. |
| 7/b1-buying-concern | SEND_ELIGIBLE | NEEDS_EDIT | Có lựa chọn và giá đúng ngân sách nhưng cả đoạn dùng nhiều lời khen chung, chưa giúp khách hình dung vì sao phần ren không rườm rà. Câu mời tư vấn size còn vượt capability đọc nguồn của runner này; không đánh lỗi chỉ vì bot tư vấn tự tin. |
| 8/b1-policy-used | SEND_ELIGIBLE | USABLE | Hiểu mặc đi làm là đã dùng và từ chối đổi trực tiếp, đúng policy. Khi không có giao dịch đổi, không bắt buộc kể phí đổi giả định. Giọng quy định hơi hành chính nhưng câu trả lời vẫn rõ và dùng được. |
| 9/b1-changed-occasion-v2 | FALLBACK | FALLBACK_OR_NO_SEND | Thay đổi sang ngoài trời và lo nóng không nhận được tư vấn nào ở kết quả thực tế; không thay fallback bằng nội dung nháp. |
| 10/b1-current-policy-v2 | FALLBACK | FALLBACK_OR_NO_SEND | Khách hỏi ngày thứ mười hai và phí nhưng chỉ nhận một câu không trả lời được dù nguồn policy có dữ liệu. |
| 11/b1-partial-source-v2 | FALLBACK | FALLBACK_OR_NO_SEND | POS lỗi là tình huống đã đăng ký; chất liệu/dáng váy vẫn có nguồn nhưng khách không nhận được cả phần này. |
| 12/b1-price-v2 | SEND_ELIGIBLE | USABLE | Dùng lịch sử đúng món và báo ngắn gọn giá cả bộ 799.000đ. |
| 13/b1-component-stock-v2 | SEND_ELIGIBLE | NEEDS_EDIT | Phần chân váy riêng 449.000đ và tồn M có nguồn, nhưng câu mời lên đơn tạo bước tiếp theo bot không làm được ở B1 read-only. Đây là lời mời thao tác tương lai, không phải báo đã tạo đơn hay một semantic false PASS về effect hoàn tất. |
| 14/b1-search-read-v2 | FALLBACK | FALLBACK_OR_NO_SEND | Khách muốn tìm đúng Khánh Trang và giá; kết quả thực nhận không tìm được món hoặc giải thích phần cần làm rõ. |
| 15/b1-buying-concern-v2 | FALLBACK | FALLBACK_OR_NO_SEND | Khách cần quyết định có mua theo gu ít họa tiết, nhưng không nhận được lựa chọn hay lý do nào. |
| 16/b1-policy-used-v2 | SEND_ELIGIBLE | USABLE | Áp dụng đúng chỉ được ướm, phân biệt với mặc thử dù trong phòng và còn tem, rồi trả lời không đổi size cho chính tình huống khách. Diễn đạt sản phẩm chỉ áp dụng ướm hơi cứng nhưng không làm câu trả lời sai. |
| 17/b1-changed-occasion-v3 | SEND_ELIGIBLE | NEEDS_EDIT | Có chọn cả bộ nhưng lý do vẫn là sang trọng, hài hòa và hợp tiệc tối, chưa giải quyết ưu tiên nhìn gọn hơn sau khi khách đổi sang gặp khách hàng. Không bắt buộc phải chọn áo; điều thiếu là lý do thuyết phục cho lựa chọn ở hoàn cảnh mới. |
| 18/b1-current-policy-v3 | FALLBACK | FALLBACK_OR_NO_SEND | Không sửa được hiểu nhầm mốc bảy ngày cũ hay giúp khách biết ngày thứ chín còn trong hạn; chỉ có fallback. |
| 19/b1-partial-source-v3 | SEND_ELIGIBLE | NEEDS_EDIT | Có trả đúng chất liệu và chưa có giá/tồn, nhưng kết bằng câu hỏi chị quan tâm mẫu này khi khách đang hỏi chính mẫu đó, rồi chuyển sang mẫu tương tự chưa được yêu cầu. Cả đoạn dài và bước tiếp không ăn khớp, không phải lỗi chỉ vì liệt kê hai chất liệu khách đã hỏi. |
| 20/b1-price-v3 | SEND_ELIGIBLE | USABLE | Báo đúng giá nguyên set trong một câu tự nhiên, không thêm nhu cầu khác. |
| 21/b1-component-stock-v3 | SEND_ELIGIBLE | USABLE | Xác nhận bán lẻ áo, tồn M và giá 499.000đ từ đúng offer; không biến size khách chọn thành lời hứa vừa hoặc tự thêm thao tác. |
| 22/b1-search-read-v3 | FALLBACK | FALLBACK_OR_NO_SEND | Có mã SQ223 rõ ràng nhưng khách vẫn không nhận được tồn và giá hay câu trả lời phần nào. |
| 23/b1-buying-concern-v3 | SEND_ELIGIBLE | USABLE | Chọn cả bộ 799.000đ trong ngân sách, giải thích có thể mặc nguyên set và tách áo phối chân váy sẵn có. Đây là upsell có lý do và dùng lại context hợp lý; không buộc bot khuyên mua ít hơn. Có thể bớt tính từ nhưng lựa chọn bán hàng vẫn dùng được. |
| 24/b1-policy-used-v3 | SEND_ELIGIBLE | USABLE | Đọc cả câu thấy bot từ chối vì đã cắt tem và giặt, đúng tình huống; phần còn trong hạn không thành lời đồng ý đổi. Có thể bỏ đoạn mở đầu thời hạn cho gọn nhưng không chấm sai chỉ vì nhắc điều kiện liên quan. |

## Provenance và cấu hình

- implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; runSourceSha: `9a523979129871b28bf71589e9fb2e8d51371907`. Source đã commit/clean trước generation; không executable/prompt/config diff từ bản review0bbabea.
- Raw commit `cf49effe7ec024476e2804cb9694d1a811f34772` trước primary commit `616be825d02200eb1b6aaffd4a25fa107f65552a`, rồi mới đọc nháp/verdict để chẩn đoán. Primary không blind với task/source nhưng chưa xem nháp bị chặn và violation details của run này; human acceptance=null. Chỉ bản hiển thị hội thoại được bỏ khoảng trắng cuối dòng; raw/primary judgment giữ nguyên.
- [Registration](raw/registration.json), [spec/plan blob IDs và command/log hashes](PREPARATION.json), [28raw/source byte hashes](RAW_HASHES.json). Architecture/amendment và B execution/integration audit đều ghi blob tại run source.
- Vertex/global: gemini-3.5-flash-lite High, candidate1, max8192, HIGH thinking/includeThoughts=false, temperature/topP omitted. Codex-login: gpt-6.1-sol High, CLI0.159.2, binary SHA25652f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a, strict JSON/tools0, một upstream/attempt, timeout90s, retry0. ModelVersion trả đúng các alias; không có dated immutable snapshot.

| Frozen input | SHA-256 |
| --- | --- |
| ownerPrompt | `81b17e0e6854fdb89403d54995bac7f0f48418c10efece346db9f5f678848c11` |
| verifierPrompt | `fe7e21965c6cc608c854b97f2513130c9d2f39cf5bec443f4a637f7d8e6f7957` |
| verdictSchema | `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97` |
| readOnlyToolDeclarations | `ac4a42e7329043eee542b3b964d777d67be967950839bcc631b2fc7cbeb4aaa3` |
| corpus | `790a28e0415bf4b0bdf23c44993cbe78fe76415827a080e9bb09e777775dca67` |
| sourceConfig | `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e` |
| manifest | `a363a794349a07f3419c938d0eaba14a754fb7b68a7880fa2b968e6e7744eadc` |

Policy thật PUBLISHED ở nguồn PostgreSQL: version84302ec1478263a9e32739d767c0899d9f32b7ef22e8252774cbfe4c85941e86, hạn15ngày/phí hai chiều30.000đ/HOLD_UP_ONLY; orderEligibility=null. Dùng Qdrant/catalog và Redis POS thật. Ba ca3/11/19 được đăng ký trước là POS_UNAVAILABLE; đó không phải ba outage quan sát được. Không sửa/publish policy, không thay fixtures.

[AUDIT](AUDIT.json) PASS:28raw disk/Git blob hashes,79unique generation IDs,0evaluator-label leaks khi kiểm cả JSON nằm trong string,22exact draft/snapshot/dialogue bindings và14eligible exact-draft matches. Mọi22final draft đều đi qua verifier; hai ca budget không có final draft.79requests đều có accounting, không retry hay bỏ outcome. Gemini có prepared body cộng existing fake-HTTP adapter evidence, không có independent live HTTP echo;22Codex relay bodies có capture thực tế. Audit PASS chỉ nói về các kiểm tra này, không phải chất lượng hoặc A PASS.

Fallback code-owned C3_A_NONPROTECTED_V2: “Phần này em chưa trả lời được, chị nhé.”, SHA256cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2. Tám semantic FAIL→fallback, hai BUDGET→fallback. PASS→exact reply eligible/send disabled; malformed/UNCERTAIN/error/timeout dùng fallback, stale/readback/permission/privacy dùng terminal map đã freeze. Không có effect recovery hay live send.

## Accounting và vận hành

[Metrics](METRICS.json), [từng generation](REQUEST_ACCOUNTING.json).

| Chỉ số | Kết quả |
| --- | ---: |
| Case đăng ký/thu đủ | 24/24, N1 |
| Generation invocations/HTTP | 79/79; giới hạn tối đa96 |
| Owner/verifier HTTP | 57/22 |
| Verifier PASS/FAIL | 14/8 |
| Runtime/tool-budget fallback | 2 |
| Fallback/handoff/no-send | 10/0/0; kết hợp41,67% |
| Generation/provider HTTP error/timeout/retry | 0/0/0/0 |
| Verifier error/timeout rate | 0/22;0/22 |
| Input/output tokens | 266.020/25.219 trên79/79generations |
| Cost | null, provider không expose; không ước tính thay |
| Verifier latency p50/p95 | 7,024s/10,998s, N22 |
| Added verification latency p50/p95 | 7,717s/11,656s, N22 |
| Whole-turn latency p50/p95 | 14,741s/22,047s, N24 |
| Owner generation latency p50/p95 | 2,025s/6,240s, N57 |
| Runtime tool calls | 34 |
| Source counters catalog/POS/policy/embedding calls | 66/40/12/4 |
| Known owner OAuth exchanges | 1; Codex auth không expose |

Latency dùng nearest-rank, mô tả mẫu nhỏ và send-disabled; không phải độ trễ Meta delivery. Token output gồm phần thinking/reasoning provider expose. Source counters không tự là HTTP request-count proof; embedding/auth tách khỏi79generation HTTP.

## Commands thực chạy và verification

Từ repo root, approved credential route qua environment và test Codex transport tắt:

```text
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json --out C:/Users/nguye/AppData/Local/Temp/c3-b24-post-review-source-9a52397
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json --out C:/Users/nguye/AppData/Local/Temp/c3-b24-post-review-provider-9a52397
```

Cả ba exit0; initial configuration preflight tại d24b1812, source-check/run tại9a523979. Hai lệnh sau tự chạy `pnpm --filter @lana/worker build` synchronously và đều qua. Provider exit0 chỉ nghĩa thu đủ dữ liệu. Preserve/primary/audit commands và hashes của scripts/logs trong PREPARATION, đều exit0; offline audit không gọi provider.

Đã chạy node --check cho các helper preserve/audit/primary-view. Lần diff-check đầu thấy khoảng trắng cuối dòng do transcript giữ exact text; chỉ làm sạch bản hiển thị và giữ raw bytes. Chạy lại diff-check ở delivery. Không chạy lại full worker/database tests, typecheck/lint hoặc composed stateful database cho đợt evidence-only này: dùng bằng chứng executable0bbabea đã báo trước, ghi rõ NOT_RERUN. Không suy remote CI PASS; không có kết quả CI xác minh cho head mới tại lúc viết.

## Hướng tiếp theo và giới hạn

Ưu tiên sửa canonical ref cho search→read và cùng căn cứ availableOffers cho owner/verifier, rồi tách trả lời thời hạn/phí khỏi duyệt đơn. Giữ ba ca từ chối đổi đúng và luồng báo giá/món lẻ đã làm được. Sau đó sửa lựa chọn khi hoàn cảnh đổi, giọng quảng cáo và bước tiếp theo theo capability; không thêm ví dụ để fit từng ca, regex, role hoặc repair loop. [Chẩn đoán và việc cụ thể](DIAGNOSTICS.md). Đây là đề xuất, chưa sửa hoặc chạy thêm dưới yêu cầu test này.

Mẫu N1/current sources và prompt/tool hashes khác historical24run, nên không quy biến động14eligible/10fallback so với16/8 cũ cho một thay đổi riêng. Primary10usable so với11 cũ cũng không phải thử nghiệm A/B hay ổn định. Tồn theo M được đọc thật nhưng protected scope chỉ có offer identity, chưa có explicit size field khi không chọn được SKU; cần giữ lỗ hổng contract này trong phạm vi nghiệm thu, không suy các câu tồn quan sát được là sai. Chưa có human acceptance, hội thoại ngoài24ca hoặc live delivery.

Bộ7stateful trước vẫn riêng:4fallback/2handoff/1no-send, không cart/eligible;24ca B1 này không thay thế kiểm B2/B3 hoặc chứng minh mua hàng end-to-end. Không gộp thành31ca với cùng quality denominator.

**Recommendation: STOP nghiệm thu bán hàng/live activation.** Batch yêu cầu đã hoàn thành. A vẫn OWNER_BYPASS, không A2/A3 requalification, Phase C, production entrypoint, live mutation/send, migration, merge hay deploy. Complexity delta của đợt này:0production code changes,0new semantic roles/layers/gates/stores; chỉ freeze, raw, review và báo cáo trên draftPR391.
