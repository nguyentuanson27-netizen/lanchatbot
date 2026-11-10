# Phase B F1–F3 replay — 2026-10-18

**Đã chạy đủ45lượt; recommendation STOP.** Primary review: **36USABLE /2NEEDS_EDIT /4UNUSABLE /3ownership controls**. So với vòng execution-contract trước, dùng được23→36, fallback11→4. Cả3hành trình tới preview/xác nhận mua, nhưng vẫn1lượt nhận mua đầu tiên thất bại và1lượt được code recovery cứu. B1 còn lỗi xử lý sân khấu/quyết định; không chạy16ca còn lại, không patch hoặc tự chạy candidate tiếp. A vẫn OWNER_BYPASS, không phải A PASS.

## Source, cấu hình và phạm vi

- implementationBaseSha/main vừa fetch: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; implementation/intake: `2bfc568d32196c844dcd81191f3cae98438672c9`. [Implementation/tests/limits](../../../../../docs/specs/c3-phase-b-contract-fixes-implementation-20261018.md), [revised plan](../../../../../docs/specs/c3-phase-b-rollback-and-contract-plan-20261018.md).
- Exact clean **bRunSourceSha `7d01e594c79ec88d45886d832c80b3137b03da4d`**. Raw savepoint **`458230a7`** trước whole-outcome primary **`711233c7`**, sau đó mới audit/diagnosis. Frozen executable/config/prompt/corpus/criteria/helper bytes không đổi trong run.
- Owner: Vertex AI global **gemini-3.5-flash-lite /HIGH**, version exact model id, candidateCount1, text/plain, maxOutputTokens8192, thinkingLevelHIGH/includeThoughtsfalse, temperature/topP omitted. Verifier: **gpt-6.1-sol /high**, Codex login/CLI0.159.2 bounded relay, toolsnone/strict verdict JSON. Timeout90s, retry0, max1upstream generation request per invocation. Exact identity/config trong [FROZEN_INPUTS.json](FROZEN_INPUTS.json).
- Owner prompt SHA256 `d5ce738518816d3fabc4c6d0dd13ab362b2cea0deba0e0b71afae2b02ba0cbde`; verifier `5d35e5de46030ea7e1ad10e6a4bde3bdf28a968ee48c8eb6825543ec0b61dbfd`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`. Owner dùng bản rollback và execution user-data; F1 có thay add tool schema/description. Không đổi verifier, nguồn policy/corpus/rubric, budgets hoặc fallback.
- [Scope](SCOPE.md):3owner generations/2tool rounds/6calls/1verifier mỗi public turn; owner65536/verifier32768wire bytes. Một owner, tối đa một verifier; code giữ identity/freshness/state/permission/effects/receipts/privacy. Không thêm role/parser/router/durable proof/repair loop hay tăng budget.

## Đủ denominator và actual outcomes

Same15unique priority cases ×3 =45outcomes: ba hành trình stateful7lượt và8B1×3. Stateful chạy trước, tối đa2native processes với build/import startup nối tiếp;3DB độc lập đều dropped. Giữ mọi lỗi/downstream; không majority/best-of/replacement/retry. Remaining16B1 NOT_RUN theo tiêu chí đã freeze. Provider snapshots/history thay đổi theo từng đọc/hành trình; không phải thí nghiệm tách từng nguyên nhân.

| Population | USABLE | NEEDS_EDIT | UNUSABLE | Controls |
| --- | ---: | ---: | ---: | ---: |
| B1,24outcomes | 19 | 2 | 3 | 0 |
| Stateful,21outcomes | 17 | 0 | 1 | 3 |
| Total | **36** | **2** | **4** | **3** |

17stateful usable gồm10model replies,1code recovery và6code preview/confirmation.3ownership controls không có capture và không phải bằng chứng nhân viên thật đã nhận việc. Primary là review kỹ thuật chủ quan, ownerAcceptance=null, không phải human acceptance độc lập.

Terminal: **32SEND_ELIGIBLE /4FALLBACK /3NO_SEND /6HANDOFF**.32eligible=31exact model PASS+1code receipt summary.3NO_SEND là PRIVATE_CHECKOUT_COMMITTED có capture preview;6HANDOFF gồm3PURCHASE_CONFIRMED có capture và3customer-requested ownership controls. Không cộng nhãn NO_SEND/HANDOFF thành lỗi hoặc gọi đó là actual staff handling/POS order/delivery.

Toàn bộ45hội thoại/capture/state/reasons: [CONVERSATIONS_AND_REVIEW.md](CONVERSATIONS_AND_REVIEW.md), [primary JSON](CANDIDATE_PRIMARY.json). Đọc actual customer outcome trước rejected drafts/verdict. Không nâng điểm fallback nhờ câu nháp bị chặn; không phạt mọi nhắc số đo, upsell hoặc lựa chọn cả set.

## F1/F2 và hành trình mua

| Hành trình | Nhận mua đầu | Các lượt sau | Actual final |
| --- | --- | --- | --- |
| Rep1 | Ghi đúng76/98, thêm1AO/BE/M; owner gọi quote_cart dưới NONE. Code recovery gửi tổng529000gồm ship và báo đặt trước. | Đổi đúng2AO/BE/L; quote978100; correction74/96. Có một quote thừa sau đổi giỏ. | Preview/xác nhận mua hoàn tất; opening USABLE nhờ code, không phải model PASS. |
| Rep2 | Ghi đúng76/98, đọc product rồi recommend_size dù khách đã chọn M. Generation cuối NONE gọi add với productRef/variantId, thiếu subjectRef/offerType/color. | Call cuối không chạy, opening fallback/no cart. Lượt đổi L/lấy2 mới thêm đúng2AO/BE/L; quote và correction đúng. | Preview/xác nhận mua hoàn tất, không xóa lỗi opening. |
| Rep3 | Quote số đo chứa76và98 bị từ chối; owner nhận fieldErrors, tách quote thành76/98rồi addAO/BE/M trong round2. | Đổi đúng2AO/BE/L. Correction lại trích74/96chung, nhận fieldErrors và sửa trong round2; state đúng. | Opening và ba public lượt sau hữu ích; preview/xác nhận mua hoàn tất. |

**F1:** cả3add thực sự được thực thi có offerAOtường minh, đúng màu/size/số lượng; không thấy default-offer selection lỗi hoặc mất màu trong các commit này. Missing-offer guard không được kích hoạt trên một permitted call trong population này: late malformed rep2 bị chặn ở NONE trước argument execution. Không lấy kết quả này để tuyên bố guard đã được stress-test bằng provider; offline controls bảo vệ missing/unknown/single-offer paths. Cả3opening vẫn đọc product trước add; một recommend_size và quote thừa còn tồn tại.

**F2:** fieldErrors ONE_VALUE được cấp trong hai event rep3 opening/correction; chúng xuất hiện lặp trong native continuation history, không phải4lỗi độc lập. Cả hai sửa thành công trong ngân sách hiện có, không thêm generation retry. Tất cả profile76/98và corrections74/96theo đúng field trong mẫu đã đọc, sizeLkhông bị đổi theo số đo. Đây là quan sát hữu ích; vòng trước cũng có một correction tự sửa được, nên chưa quy thành công chỉ cho error detail. General field/person referent correctness chưa được chứng minh; không có ca người thứ hai trong population này.

Hai NONE tool completions vẫn là lỗi, không được phép thực thi muộn: rep1 có commit/receipt nên recovery cứu actual outcome; rep2 chưa có commit nên fallback. Provider-internal cause chưa biết; giảm fallback không đồng nghĩa chữa tool planning/NONE.

## F3, tư vấn và giọng

- **9/9 partial-source outcomes dùng được.** Chân váy/set: trả được ren/tơ/form có nguồn, giữ giá/tồn/cách bán ở mức chưa kiểm tra được. Không thấy suy chỉ bán nguyên bộ, hết hàng hoặc hẹn kiểm tra/báo lại ngoài capability trong chín actual replies. Captured requests của cả9case có SOURCE_UNAVAILABLE và vẫn giữ content; không coi wire reason đúng là proof nó gây ra cải thiện. Owner prompt cũng đã rollback so với execution run và mỗi case chỉ3lần.
- Concern ren đơn giản3/3dùng được, chọn cả bộ đúng799k và giải thích bằng mềm/form/rũ. Giọng còn nhiều tính từ, nhắc ngân sách và lời chốt hơi quảng cáo; không tự coi phủ định rườm rà là claim kiểm nghiệm.
- Meeting3/3dùng được: chọn cả bộ với lý do đồng bộ/nhẹ/rũ phù hợp cuộc gặp mới. Không ép đáp án áo riêng mới đạt. Repeat-wear3/3dùng được:2upsell cả bộ và1chọn áo riêng, đều có lý do gắn váy đen khách có; không lặp so799kset rẻ hơn chỉ499kshirt hoặc hứa giữ hàng.
- Compound concern rep1 có ưu tiên cả bộ và áo riêng nếu vẫn ngại, dùng được dù dài. **Rep2 NEEDS_EDIT:** trải cả bộ/váy riêng/áo riêng rồi hỏi khách tự chọn; lời khuyên chính chưa rõ và từ độ nhún gượng. **Rep3 actual fallback:** không có lựa chọn bán hàng gửi khách.
- **Stage rep1 NEEDS_EDIT:** cảnh báo/gợi mặc lớp nhưng khách đã nói nếu có nguy cơ thì đổi mẫu; reply lại hỏi điều kiện đổi thay vì dùng khả năng tìm mẫu. Cách nói sẽ hơi thấu quang từ mô tả tơ nhẹ còn ranh giới cảnh báo chung so với thuộc tính cụ thể chưa phân xử. Rep2/3stage chỉ gửi fallback.

Giọng stateful vẫn có thêm vào giỏ/cập nhật/ghi nhận xác nhận; câu Chị đã đổi ở rep1 có chủ thể gượng. Đây là điểm chỉnh văn nhưng actual cart/state/quote đúng và câu trả vẫn dùng được, như cách chấm các vòng trước. Readback eo74/mông96vừa được sửa là hữu ích, không liệt kê lại hồ sơ để chứng minh hiểu. Partial replies còn chữ hệ thống/thông cảm giúp em; không chấm FAIL chỉ vì một từ. Một số reply bán hàng vẫn mở bằng mô tả dài và nhiều lời khen rồi mới chọn, chưa chứng minh giọng tự nhiên ổn định.

## Ba semantic fallbacks sau primary

1. **Rep2 sân khấu:** nháp đề xuất Khánh Trang và nói thô boi kín đáo/đứng form hơn, mặc sân khấu rất yên tâm. Retrieved description có thô boi/ren/form nhẹ, không có căn cứ độ kín dưới đèn. Verifier FAIL/UNSUPPORTED_PROTECTED_ASSERTION, refSV1561; có lý do thực chất để chặn kết quả mà món thay được ngầm hứa.
2. **Rep3 sân khấu:** nháp nói tơ mềm/thoáng nên sẽ hơi thấu, dễ thấy bên trong, rồi hỏi dáng váy/set để tìm. Verifier FAIL/refSV2447. Near meaning warning ở rep1 lại PASS; cần đọc mức lời khẳng định và toàn đoạn, chưa gọi đây là overblock chắc chắn hoặc kết luận verifier chỉ nhìn keyword. Không sửa nhãn cũ.
3. **Rep3 compound concern:** nháp nhận xét form nhẹ/không phồng, đưa váy riêng hoặc set rồi nói mặc lên vừa vặn. Verifier FAIL/refSV2447. Có thể bị hiểu là bảo đảm độ vừa của khách, cũng có cách đọc khen dáng chung. Kind/ref không chỉ ra exact clause; chưa kết luận chỉ vì từ vừa vặn. Actual fallback vẫn UNUSABLE, dù một cách đọc nháp có thể được chấp nhận về tư vấn.

Rep2opening là fallback thứ4do NONE, không phải semantic refusal.3verifier FAIL không tự chứng minh3draft unsafe; các cách đọc còn tranh luận giữ unresolved. Không adjudicate thêm một protected false PASS rõ ràng ở31model PASS; stage rep1 vẫn là open reading. Không đưa headline zero-safety-errors hoặc khẳng định toàn bộ verifier calibration đã ổn.

## So sánh hai vòng trước, cùng45outcomes

| Chỉ số | Offer projection b3107465 | Execution4619eaa5 | F1–F3 7d01e594 |
| --- | ---: | ---: | ---: |
| USABLE / EDIT / UNUSABLE / controls | 32/1/9/3 | 23/8/11/3 | **36/2/4/3** |
| B1 usable | 20/24 | 9/24 | **19/24** |
| Stateful usable, ngoài3controls | 12/18 | 14/18 | **17/18** |
| Fallback | 7 | 11 | **4** |
| Opening hữu ích | 2/3,1code recovery | 0/3 | **2/3,1code recovery** |
| Preview+confirmation | 2/3 | 3/3 | **3/3** |
| Final-only calls/requests | 5/9 | 2/8 | **2/7** |
| Verifier FAIL | 3 | 8 | **3** |
| Generation requests | 115 | 117 | **117** |

Có tiến bộ quan sát so với vòng execution, chủ yếu partial-source và stateful. So với offer-projection dùng cùng owner prompt, B1không vượt best cũ và opening vẫn2/3nhờ một code recovery. Các ca mạn tính chọn hành động/sân khấu/quyết định chưa hết. Không thể quy tăng36cho riêng F1/F2/F3 hoặc coi một sample là ổn định, do prompt rollback, live snapshots/history và stochastic generation cùng khác.

## Accounting, latency và audit

- **117invocations/117upstream generation requests=83owner+34verifier**, tất cảHTTP200;0unknown request accounting,0auth/transport/quota/finish errors,0timeouts/retries.2OWNER_TOOL_MODEcompletion errors=1,71%invocations, không phải lỗi mạng. Trong7final-only requests có2unexpected calls. Một lỗi được code recovery cứu; lỗi kia giữ fallback.
- **34model finals /34verifier calls**,31PASS/3FAIL.34exact bindings và31eligible model replies khớp exact final draft; không classifier skip.1eligible code summary tách riêng;3private checkout0modelcalls.
- Verifier p50/p95 **5,824/11,350giây**,N34; added verification interval **6,559/12,775giây**,N34, gồm readback/gate overhead. Owner **2,319/5,620giây**,N83. Whole turn **16,406/43,989giây**,N45. Nearest-rank, không phải paired causal delta hay live SLA.
- Tokens **515.825input /57.047output**, usage117/117; cost NOT_EXPOSED. Embedding/source requests ngoài generation denominator. Fallback4/45=8,89%; HANDOFF6/45=13,33%vàNO_SEND3/45=6,67%với nghĩa milestones/controls ở trên, không phải tất cả là lỗi bán hàng.
-68raw hashes, frozen files/runtime/tool schemas/helpers,34bindings/31draft matches và captured-request firewall checked;0observed evaluator/private-checkout fixture leaks.3DBdropped; không có real customer/POS writes hoặc actual delivery.4metadata JSON có CRLF normalized bởi Git; raw hashes là bytes trên đĩa, không khẳng định mọi Git blob bằng disk bytes.
- [Metrics](CANDIDATE_METRICS.json), [request accounting](CANDIDATE_REQUEST_ACCOUNTING.json), [diagnosis](DIAGNOSIS.json), [raw hashes](CANDIDATE_RAW_HASHES.json), [commands](commands.json), [runtime source](runtime.json).

## Commands và giới hạn

Reuse honest checks của unchanged implementation2bfc568d: RED→GREEN;65focusedNode/280worker/protected21PASS; full1869Vitest/508NodePASS+2optionalSKIP; build/lint(noEmit)/C2validators exit0. Fresh source-check gọi canonical worker build và live readback0generation. Config preflight CONFIG_READY_CONNECTIONS_UNVERIFIED và stateful PREFLIGHT_PASS đều0generation; không coi preflight config là test tất cả connections. Không chạy lại full test để gọi đó là run result; remote CI/full-repository PASS không được claim.

```powershell
git fetch origin main
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/contract-replay-20261018/cases.priority.json --source-check --out C:/Users/nguye/AppData/Local/Temp/c3-contract-fixes-replay-source-20261018
node C:/Users/nguye/AppData/Local/Temp/c3-contract-fixes-replay-freeze.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py python C:/Users/nguye/AppData/Local/Temp/c3-contract-fixes-replay-preflight.py
python C:/Users/nguye/AppData/Local/Temp/c3-contract-fixes-replay-run.py
node C:/Users/nguye/AppData/Local/Temp/c3-contract-fixes-replay-collect.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-contract-fixes-replay-judge.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-contract-fixes-replay-render-primary.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-contract-fixes-replay-audit.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-contract-fixes-replay-diagnose.mjs
git diff --check
```

Six runner processes exit0 nghĩa collection hoàn tất, không phải mọi lượt PASS. Judge helper ghi review kỹ thuật đã đọc actual45outcomes, không gọi một provider judge thứ ba; criteria/provider helper hashes được freeze trước generation. Structural complexity không tăng trong run: chỉ thêm evidence/docs, không sửa source/prompt sau seal. F1–F3 implementation vẫn37added/12removed logic lines trong3files, không thêm runtime layer.

**STOP trước16; không patch/next round.** Tiếp theo cần xử lý đúng hành động khi khách đã chọn mua, quote không cần thiết, quyết định gọn trong compound concern và phân xử whole stage/fit meanings. Đây là findings, chưa thực hiện sửa mới. Sales voice, general field/person semantics, singleton provider behavior, model NONE, actual staff/POS/delivery và full remaining16chưa được verified. A OWNER_BYPASS; không deploy/live send/source publication/Phase C.

Final local verification thực sự chạy: `python C:/Users/nguye/AppData/Local/Temp/c3-contract-fixes-replay-final-check.py` exit0 xác minh frozen inputs/runtime/helpers/criteria/launcher,68raw hashes,69JSON/6JSONL,59local links và chỉ run/tasks đổi sau seal;0secret-pattern hits (không phải universal guarantee). `git diff --check` exit0. Một inline verification command trước đó trả exit1/không output; chuyển sang file-based checker rồi PASS, không thay model/source/evidence hoặc loại assertion. Remote CI vẫn riêng, không claim PASS.
