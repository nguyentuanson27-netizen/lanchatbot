# Phase B full Compact V2 — chạy đủ 51 lượt

**Hoàn tất 17 controls + 51 native outcomes.** Kết quả native: **36 SEND_ELIGIBLE, 11 HANDOFF, 4 NO_SEND**. Không có fallback text hoặc lỗi provider trong campaign đúng cấu hình. Không coi 36 eligible là 36 hội thoại bán hàng đạt; **B chưa GO**.

Owner yêu cầu chạy toàn bộ và chọn Compact V2. Mỗi ca một lần, không sửa prompt/corpus theo kết quả, không tự retry. Đã đọc cả 51 outcome, gồm các ca im lặng và code-only. [51 hội thoại](CONVERSATIONS.md), [review từng ca](WHOLE_TURN_REVIEW.json), [actual terminals](ACTUAL_TERMINALS.json).

## Source, cấu hình và phạm vi

- Implementation base: `dc1308c90a7f790767e21249d115877e55b633b9`.
- Exact runtime source: `50753ec7aab3d7365fdabc2e2c71152c448719ea`, worktree sạch và HEAD không đổi trong toàn campaign. Bằng chứng chỉ được thêm vào source sau khi generation kết thúc.
- Owner: Vertex `gemini-3.5-flash-lite`, observed version cùng tên, HIGH/global, candidateCount1, text/plain, maxOutput8192, thinking HIGH. Verifier: `gpt-6.1-sol`, observed version cùng tên, high, route Codex ChatGPT login. Temperature/topP omitted, retry0, timeout90s, tối đa một upstream request/generation.
- CLI đúng contract: `codex-cli 0.159.2`, binary SHA256 `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`. [CLI identity](CLI_IDENTITY.json).
- Prompt, schema, corpus, source config, model config và driver hashes được đăng ký trước provider trong [registration](REGISTRATION.json). Không đổi prompt, nguồn shop hoặc ngưỡng verifier. Không có generation API/client mới.
- [Kế hoạch/implementation](../../../../../docs/specs/c3-phase-b-compact-native-full-run-20261026.md). Explicit `--owner-presentation VI_DATA_BLOCKS_COMPACT_V2` được truyền cho cả B1 và stateful runner, ghi vào registration trước dispatch; request audit và HTTP dùng cùng lựa chọn.

V2 trước đây chỉ dùng với forced-final/textual replay. Lượt native giữ nguyên vị trí functionCall/functionResponse, thoughtSignature, ảnh và history; chỉ context envelope đầu được đổi nhãn/compact JSON. Forced-final text vẫn giữ treatment cũ. Vì vậy đây không phải cùng treatment ordering của 8 cặp trước, cũng không phải phép so sánh A/B mới. Default/production không đổi.

51 ca giữ nguyên population: báo giá5, media7, POS unavailable3, B1 LIVE21, journey openings4, stateful8, negotiation3. Có 50 public turns và một private code-only turn. **21 B1 chỉ kiểm eligibility; 30 lượt còn lại có persisted ingress/capture trong database test.** Không gửi Meta/Pancake/POS thật. Source PostgreSQL chỉ đọc; Redis/Qdrant đọc qua route có sẵn. Sáu database test đều được drop. Không merge/deploy hoặc ghi nguồn shop.

## Kết quả tác vụ

| Phần | Quan sát thực tế |
| --- | --- |
| Báo giá đầu vào ads/organic | 5/5 hoàn tất. Hai ca đầu xác định mẫu có text đúng giá 799k, thành phần/size và hai ảnh. Ca hỏi lại giá không lặp form/ảnh. Chưa xác định mẫu thì hỏi ảnh/tên. Câu hỏi nhiều phần trả đủ set799k/áo499k. |
| Tra giá, tồn và policy B1 | 21/21 eligible. Áo M499k, váy M449k đúng nguồn. Policy hiện15ngày/30k thay lịch sử7ngày. Đã mặc đi làm, mặc thử trong nhà hoặc cắt tem/giặt đều bị từ chối đúng nghĩa toàn reply. |
| Sửa state và giỏ | Cart thêm áo beM, đổi sang L/hai chiếc, quote978.100đ đúng. Sửa eo74/mông96 đã commit, giữ size L và số lượng khách chọn. |
| Checkout | NO_SEND ở bước thiếu thông tin vẫn có câu hỏi do code tạo; private code-only có ORDER_PREVIEW/capture. Sau confirm: PURCHASE_CONFIRMED, HUMAN/event1/tag1, **zero new Outbox và zero capture**, không ACK. |
| Thương lượng | Có cart actual; hỗ trợ ship30k theo policy, giá áo499k không đổi, tổng cuối499k đúng. |
| Giao miền Nam | Cần Thơ dùng ETA4–8ngày; trả không kịp sáng mai, không bịa phương án giao nhanh. |
| Ảnh | Tổng bảy ảnh actual: ba ca báo giá mỗi ca hai ảnh, một ca ảnh cận áo một ảnh. Không gửi ảnh sai màu hoặc giả ảnh người mua. |

## 11 handoff và 4 NO_SEND

Tất cả 11 handoff đều có HUMAN/event/tag và không có tin hoặc ảnh gửi khách. Đây là kết quả đúng quy tắc handoff im lặng owner đã chốt; không được gọi là bot đã giải đáp được nhu cầu.

| Nhóm / ca | Số handoff | Nguyên nhân |
| --- | --- | --- |
| media-overview-next:ask, media-detail-next:ask, media-and-price:ask | 3 | Khách cần ảnh feedback; nguồn không có asset feedback=true. Ở ca hỏi kèm giá, silent handoff cũng bỏ phần giá đã có. |
| media-decision:ask | 1 | Khách chỉ ngại ren. Owner tự chọn lookup ảnh DETAIL/SKIRT nhưng thiếu asset cận váy có binding; dependency trở thành handoff. Đây là điểm yếu chọn tác vụ: tạo thêm phụ thuộc chưa cần thiết cho việc tư vấn. |
| Ba POS unavailable | 3 | Fault có kiểm soát; không có giá/tồn nên handoff PRICE_UNAVAILABLE, không đoán. |
| sales-product-gallery:overview | 1 | Khách xin ảnh màu be; ảnh trong source chưa được gắn màu, không có căn cứ gửi ảnh như đúng màu. |
| sales-size-advice:height-weight | 1 | **Owner sai, verifier chặn đúng:** recommend_size chọn M, owner tự nói có thể nhích lên L để mặc rộng. Không có SIZE_FIT cho L. Không phải thiếu bảng size, lỗi quota hoặc keyword rejection. |
| stateful-confirm, stateful-human-request | 2 | Confirm chuyển quyền theo quy trình; khách yêu cầu người xử lý thì chuyển quyền. Không gửi ACK. |

Bốn NO_SEND gồm hai lượt media tiếp theo khi HUMAN đã nhận quyền, cùng hai lượt checkout do code tạo câu hỏi/preview. **NO_SEND không đồng nghĩa cả bốn lượt đều không có nội dung khách nhận.** [Actual capture](ACTUAL_TERMINALS.json) giữ sự phân biệt này; export thông tin riêng đã redact nên review giọng ở một phần câu hỏi/preview có giới hạn.

### Ảnh có sẵn nhưng chưa đủ nhãn để dùng đúng yêu cầu

Fresh canonical source có 11 ảnh; feedback=false ở tất cả và color=null. Có một ảnh DETAIL/AO, chưa có DETAIL gắn riêng SKIRT. [Offline selector replay](MEDIA_SOURCE_DIAGNOSIS.json) xác nhận trên control capture: FEEDBACK→NO_VERIFIED_MATCHING_MEDIA; màu be→MEDIA_COLOR_BINDING_UNVERIFIED; DETAIL/SKIRT→NO_VERIFIED_MATCHING_MEDIA; DETAIL/TOP→OK, một asset. Đây là replay trên source capture đầu campaign, không giả là exact readback từng native turn.

Vì vậy không thể giải thích chung là “shop không có ảnh”. Phần còn thiếu chủ yếu là **metadata/provenance cho đúng mục đích ảnh**, cộng với việc owner tự gọi tool ảnh cho một băn khoăn tư vấn. Theo quy tắc hiện hành, gặp thiếu dữ liệu shop thì handoff; lượt này không tự bổ sung ảnh giả, sửa nguồn hoặc nới gate.

## Hiệu quả tư vấn và giọng

Review cả lượt, không đếm từ khóa và không bắt mọi câu theo một khuôn:

- **Còn yếu rõ:** b1-buying-concern vẫn phủ định rườm rà rồi nói mềm/rũ/thanh thoát. Chưa giúp khách hình dung lựa chọn phù hợp hơn. media-decision cần tư vấn thì lại phát sinh phụ thuộc ảnh cận váy và kết thúc handoff.
- **Dùng được:** ca mua áo lẻ hay cả bộ chọn áo499k vì khách đã có váy đen; ca gặp khách buổi sáng chọn áo lẻ và phối quần âu/chân váy cơ bản. Ca quen đồ trơn giải thích tiệc cưới là dịp mặc điệu hơn ngày thường; đây là lý do bán hàng hợp lý, không ép phải có phương án phối mới được tính hữu ích. Một upsell có ích/trong ngân sách không tự là lỗi.
- **Lỗi owner cần phân biệt với giọng:** ca size tự thêm L là vượt kết quả size của code, nên bị chặn đúng. Không dùng thay đổi giọng để chữa lỗi này.
- **Giọng còn hạn chế nhưng tạm chấp nhận:** nhiều “dạ/ạ/nhé”, tính từ và mô tả chất liệu; câu “giữ nguyên trong giỏ” còn giọng hệ thống, một ca báo giá thêm ngoặc chất liệu chưa cần thiết. Không tự mở vòng sửa từ ngữ tiếp theo.
- Lời về đỡ nhăn/đứng phom hoặc thoải mái từ cấu tạo được đọc theo ranh giới advisory owner đã chốt; không bắt có phép thử cho mọi lời tư vấn. “Không lo bó bụng” ở discovery vẫn là trấn an chưa được kết quả fit cá nhân chứng minh; không lấy verifier PASS thành proof độ thoải mái của khách cụ thể.

[Review51ca](WHOLE_TURN_REVIEW.json) là **self-review của primary agent**, không có independent review mới. Không có model judge bổ sung. Không chấm eligible thành quality PASS hoặc đổi rubric để báo tiến bộ.

### So với lượt full trước

[So sánh cùng51case IDs](PRIOR_COMPARISON.json): trước37eligible/10handoff/4NO_SEND, hiện36/11/4. Ba ca đổi disposition: media-decision eligible→handoff; discovery handoff→eligible; size advice eligible→handoff. Những tác vụ giao dịch chính vẫn hoạt động; **chưa có bằng chứng cải thiện tổng thể về tư vấn**. N1, source clocks/dữ liệu live đọc lại và output ngẫu nhiên không cho phép quy thay đổi riêng cho formatter. Không gộp với paired8case thành nhiều repetitions của cùng thử nghiệm.

## Accounting và vận hành

[Metrics/wire audit](REVIEW_METRICS.json), [commands](COMMANDS.json), [cleanup](DATABASE_CLEANUP.json), [controls](CONTROLS_OUTCOME.json), [toàn task kể cả lượt bị chặn](TASK_TOTAL_ACCOUNTING.json).

- Campaign hợp lệ: đủ68outcomes =17controls +51native, không bỏ ca lỗi/không gửi. **140 generation requests**:86owner,37native verifier,17control verifier. Cap217, max1upstream/generation, retry0;0HTTP/provider errors/timeouts, observed model versions đúng cấu hình.
- Controls8safe eligible/8unsafe bị chặn/probe eligible. **Zero observed send-eligible false PASS** trên8unsafe controls của bộ này; không phải full A2 hoặc semantic safety proof. Verifier vẫn mandatory cho final draft sống sót hard precheck. Các lượt code-only/HUMAN/handoff không có owner final draft được giữ trong denominator.
- 86 owner HTTP request hashes/bytes khớp log V2. 54 actual verifier bodies được capture:33 khớp pre-dispatch logged wire (controls/persisted),21 B1 chỉ có capture/telemetry match, **không có independent pre-dispatch shadow cho21B1**. Không gọi cả54 là independent request reconstruction.
- Bounded scan140actual bodies:0 evaluator-key, secret-key hoặc caseId-string matches. Mock native test cũng kiểm actual HTTP đúng formatter; không tuyên bố kiểm privacy phổ quát.
- **910.216input /84.758output tokens**, trong đó77.729thinking/reasoning đã gồm trong output. Owner input572.699, native verifier211.801, controls125.716. Không dùng output gồm reasoning làm độ dài hội thoại. Cost provider không expose, null.
- Native verifier telemetry37samples p50 **7,036s**, p95 **13,651s**. Verification gồm readback p50 **8,477s**, p95 **18,105s**. Total slot51samples p50 **24,038s**, p95 **49,472s**; không live SLA hoặc causal latency claim.
- Native handoff11/51 (**21,6%**), NO_SEND4/51 (**7,8%**), fallback0. Chỉ30persisted outcomes có actual capture; không trộn21B1 eligibility vào delivery-success rate. Sáu database test đã drop; silent confirm state được kiểm riêng.

### Lượt bị chặn do CLI trước campaign hợp lệ

Global CLI đã lên0.164.0 trong khi manifest pin0.159.2. Lượt đầu source50753ec7 chạy17controls rồi native preflight báo CODEX_CLIENT_VERSION; **0native đã chạy**. Giữ nguyên raw/status/registration và accounting, không relabel thành PASS đúng config. [Blocked record](BLOCKED_ENVIRONMENT.json).

Đã cài riêng đúng package0.159.2 vào external scoped runtime, xác nhận binary hash cũ và login status trước mọi request của campaign mới. Không đổi global CLI, model hoặc client contract. Việc pin version để tái lập được hỗ trợ trong [OpenAI Docs](https://developers.openai.com/cookbook/examples/codex/build_iterative_repair_loops_with_codex); exact version/hash ở đây do repo contract quyết định.

Toàn owner task dùng **157generation requests =17lượt bị chặn +140campaign hợp lệ**.17request đầu dùng125.606input/2.378output tokens vẫn trong accounting; không loại khỏi chi phí. Hai registration được giữ riêng; không có native case nào bị generation retry. Lượt đầu có51native NOT_RUN do config block, lượt sau chạy đúng51native mới.

## Commands và checks thực sự chạy

Implementation: native V2 RED tại OWNER_PRESENTATION_FINAL_ONLY trước GREEN;8focused tests PASS, toàn commerceeval **210PASS**, Python driver argument/accounting test **1PASS** (mọi child/git stubbed). Worker build, direct tsc và lint exit0; node --check cả hai runners PASS, git diff --check exit0 trước seal.

```powershell
node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/driver.test.py
pnpm --filter @lana/worker build
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker lint
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/DISPATCH_DRIVER.py <first-external-raw> controls
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/DISPATCH_DRIVER.py <first-external-raw> native
npm install --prefix "C:/Users/nguye/Documents/Sản phẩm AI/c3-eval-runtime-01592/npm/node_modules/@openai/codex" --ignore-scripts --no-audit --no-fund "@openai/codex-win32-x64@npm:@openai/codex@0.159.2-win32-x64"
python "C:/Users/nguye/Documents/Sản phẩm AI/c3-compact-native-pinned-launch.py"
node "../c3-b-compact-native-full-pinned-model-20261026/ANALYZE.mjs"
node "../c3-b-compact-native-full-pinned-model-20261026/MEDIA_SOURCE_DIAGNOSIS.mjs"
```

Pinned launcher checks exact CLI version/hash/login, sets process-local APPDATA and invokes committed driver controls→native. Valid campaign: cả20child commands exit0. First campaign native preflight exit1/version mismatch retained. Local post-run analyzer initially assumed B1 had VERIFIER_REQUEST shadow; corrected to capture/telemetry checks for21B1 and rerun offline, then PASS. Local media diagnostic import path corrected before successful offline replay. **Không có provider rerun do các lỗi script báo cáo này.** Không claim mọi shell command lần đầu đều PASS.

Post-run assertions PASS: source/registration/51case population, request counts/one upstream, exact V2 owner hashes, verifier logging scopes, bounded label/key scan,51review artifact hashes,11silent handoffs, correction persisted measurements/cart, silent confirm zeroOutbox/capture, six cleanup reports và controls. Raw/hashes giữ tại hai external output directories; [raw inventory](RAW_SHA256.json). Không chạy mới full semanticA2/A3 hoặc remoteCI; no new shared-package source. Build có rebuild dependencies nhưng không coi đó là shared tests.

**Recommendation:** giữ kết quả full campaign, **B chưa GO**. Tác vụ giao dịch chính có bằng chứng hoạt động; data/provenance ảnh, lựa chọn lookup tùy chọn và owner tự thêm size còn ảnh hưởng trải nghiệm. Không tự sửa nguồn, prompt hoặc mở vòng model tiếp theo sau báo cáo này. Chưa chứng minh ổn định, human acknowledgement hoặc live delivery.
