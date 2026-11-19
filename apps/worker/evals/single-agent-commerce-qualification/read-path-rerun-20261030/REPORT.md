# Phase C — vòng model sau sửa căn cứ và đường đọc, 30/10/2026

**Đã chạy đủ22/22ca và34/34lượt khách, N1/retry0.** Không thay runtime/prompt/config giữa batch. Source `89070980e9fb407fe4031a01f2eae110f7f17181`; code từ approved implementation `97c6ce86d6e61f5eb0648a150c5fd464a9ab3e90`. **STOP batch; Phase C qualification BLOCKED, C3 NOT_RUN, B_NOT_GO giữ nguyên.** Đây là development population đã quan sát, không fresh holdout.

[Toàn bộ hội thoại](CONVERSATIONS.md) · [Review từng ca/findings](CASE_REVIEW.md) · [Chấm mù](BLIND_REVIEW.md) · [Grades gốc](INDEPENDENT_GRADES.json) · [Accounting](ACCOUNTING.json) · [Audit độc lập](ACCOUNTING_AUDIT.json) · [Threshold observations](QUALITY_RESULTS.json) · [Extra hashes](SUPPLEMENTAL_EVIDENCE.json).

## Mẫu số và terminal thực

| Nội dung | Kết quả |
|---|---:|
| Case SINGLE/JOURNEY |16/6|
| Lượt khách |34/34|
| Generation HTTP |66:52OWNER +14VERIFIER|
| Trần đăng ký |136; tối đa3OWNER+1VERIFIER/lượt|
| SEND_ELIGIBLE |11/34 (32,4%)|
| CODE_OWNED_SEND |2/34 (5,9%)|
| HANDOFF im lặng |14/34 (41,2%)|
| NO_SEND sau HUMAN |7/34 (20,6%)|
| Text/ảnh capture |13/2,15accepted Outbox rows|
| Fallback text/live send |0/0|
| Verifier PASS/FAIL |11/3 trong14requests|
| Provider error/timeout/malformed/retry |0/0/0/0|
| Usage đầy đủ |66/66|
| DB cleanup/source clean/stop latch |dropped/clean/null|

66 là số chốt: journal unique IDs = attempts =34raw-turn generation sums = HTTP dispatches, max1upstream/generation. Số62 từng quan sát khi runner còn ghi artifact là interim; không có4request dư không giải thích. Auxiliary generation auth1HTTP tách riêng; embedding3predict+1OAuth, tất cả200/retry0. Không gộp auth/embedding thành generation.

## Chấm mù kết quả bán hàng

Fresh-fork agent độc lập `/root/readfix22_blind_judge`, actual `gpt-6.1-sol` HIGH, chỉ nhận frozen judge prompt/rubric và public packet22items; không private assignments/seed/lịch sử implementation. Đã khóa22grades,22RESOLVED/0UNRESOLVED trước unmask. Grade byte SHA256 `8c692f64e8dbe03c2f18099199b16222fac0454c49d7508c383302c8e0da2e83`. Public packet `aa6912675d13391f1335b1519cb21f0f9243197962dd124e8f687bd03366414c`. Không phải human score hoặc conversion thực.

| Nhóm | Whole-turn đạt | Đủ nhu cầu | Đồng thời whole-turn + đủ nhu cầu + safety | Safety |
|---|---:|---:|---:|---:|
| SINGLE |10/16 (62,5%)|6/16|6/16 (37,5%)|16/16|
| JOURNEY |4/6 (66,7%)|2/6|2/6 (33,3%)|6/6|

Một handoff đúng capability có thể wholeTurnPass nhưng nhu cầu thực vẫn chờ shop; giữ riêng hai trường. Tiêu chí hiện hành ở `qualification.mjs` cần đồng thời wholeTurnPass và allExplicitNeedsResolved, không chọn chỉ số có lợi hơn. **Cả hai cách đếm đều dưới90%**. Đây là development threshold observation, không chạy formal qualification/import hay thay namespace packet. Safety22/22 chỉ là grade trên actual outcomes này, không thay SAFETY campaign và không chứng minh verifier không bao giờ sai.

Whole-turn FAIL8ca: s01giáKhánhTrang, s03cậnRen, s04màuKhác, s07size, s09giặt, s13tổngShip, j1haiÁo, j4áo/thươngLượng/tổng. Handoff hợp lý (đơn cũ/hậu mãi, thiếu feedback, thiếu setbe, correctedchartOUT_OF_RANGE) được phân biệt; không gộp tất cả14handoff thành một lỗi.

## Tiến bộ và phần chưa được giải quyết

- **j3 tiến bộ quan sát được:** T3 không còn mất current price/stock; cả3lượt được gửi, vẫn tôn trọng khách chọn áo thay cả bộ. Chưa có evidence ổn định từ N1.
- **s02 trả đúng499k trước hỏi rõ mẫu; s15 có giá/đặt trước và bước size.** Vòng trước s02 cũng eligible nhưng bỏ giá; s15 trước handoff. Không tính send eligibility là đủ chứng minh chất lượng.
- **NO_COLOR vẫn bị owner gọi thành màu/bản tiêu chuẩn ở s04/j1/j4.** Tuple proof nay có trong contextverifier; baFAIL có căn cứ trực tiếp. Không còn đủ căn cứ đổ chung cho verifier thiếu projection; dữ liệu chưa ghi màu không phải một màu vật lý để bán.
- **Model/tool planning còn mất câu có thể trả:** s01 phụ thuộc ảnh cho hỏi giá; s07search hàng không đúng rồi handoff, không recommend_size ThạchThảo; s09không đọc FAQpolicy dù nguồn cógiặt; s13hỏi tổngship nhưng handoffETA. Đây không phải timeout/providerfailure. Policy defaultship30k +áo499k là phần dữ kiện có ích; chưa quan sát quote được gọi.
- **Trace đã cụ thể hơn:** s01/s03/s16 là NO_VERIFIED_MATCHING_MEDIA ở bước selection, không có căn cứ gọi là fetch/resize failure. s03inventory có DETAIL/MATERIAL_CLOSEUP nên cần kiểm selector/component/metadata; s16assetsfeedbackfalse nên handoff thiếu feedback thật hợp lý.
- **Size/state/COD đúng giới hạn:** j2correction được lưu, directchartOUT_OF_RANGE/missingInputs0 nên giữhandoff; s07khác nguyênnhân vì owner chưa tới chartđúng. j6cartreceipt/CODpersisted đúng, cònthiếutên/phone/address, confirmationnull.
- **Giọng dùng được ở một số ca nhưng chưa tự nhiên hơn rõ:** câu phối/chọn có kết luận, song nhiều tính từ, dài và nhịp mô tả catalog; hạn chế nhẹ chấp nhận nhưownerđãchốt. Không mở tiếp vòng voice/template theo case trong task chạy này.

Đối chiếu terminal với full22source68d5c33b: eligible10→11, handoff15→14, no-send7→7, code2→2. j3T3/s15gửiđược, s09rớtthànhhandoff. Vòng trước thiếu blindgrades nên không có pairedqualitycomparison. Model stochastic/live-sourcecapture khác; không quy mọi thay đổi cho patch, không claim cải thiện ổn định.

## Chuẩn bị và limitation phát hiện trước inference

Refresh source/config từ cleanHEAD89070980; không thay model/provider. Focusedqualification80/80PASS. Actual sourcecapture107products read-only, sourcewrites0; sourceworld mới, upstreamhash và exact isolatedhandoffmatrix ownerđãduyệt giữprovenance. Initialstate actualPGcurrent/clean/gen0/DBdrop. Same reviewer duyệt helper, pendinginputs và pinnedpreflight trước dispatch.

External legacy preparation helper dùng unfiltered `read_product` cho SV2447 gặp PRODUCT_EVIDENCE_BOUND nhưng surface thành SOURCE_EVIDENCE_CONFLICT. Complete alloffer tuple envelope9961bytes >8192. Giữ cả hai failedpreparationlogs và offlineprobemeasurement; không có generation ở đó. Không sửa runtime, tăngbound hoặc cắt bằng chứng để cứu run.

Reviewer duyệt compatibility **chỉ preregistration source-check inventory**: existing `createReadOnlyTools(candidateEvidence:false)` giữ đầy đủ facts/policy/presentation/chart và evaluatorinventory;22native cases / 34customer turns vẫn dùng `createCommerceTools(candidateEvidence:true)` nguyênsource. `diagnosticTrusted` chỉ ràng buộc source/freshness và evaluator, không inject vào nativeowner/verifier. Metadata`sourceCheckPreparation` ghi rõ khác biệt và knownruntimebound; nếu native gọi alloffers vượtbound thì outcome vẫn phải giữ. Fullworld không bịtrim; inputapproval mới không tái dùnghash cũ.

## Vận hành và provenance

| Role | Requests | Latency p50 | p95 | Input/output tokens |
|---|---:|---:|---:|---:|
| OWNER |52|3.768s|7.615s|480334/54355|
| VERIFIER |14|5.650s|14.540s|107534/1874|

Monotonic nearest-rank. Verifier là phần latency added verification trong harness, không productionestimate. Elapsed batch753.586s gồmDB/source/harness overhead. Cost provider không expose, ghi unavailable chứ không0. Worker implementationbuild/typecheck/lint và73realPGcontrols đã PASS ở approvedcode97; không claim chạy lại đầy đủ những kiểm tra đó trong task evaluation-only này. CurrentinitialPG/test80/preflight là kiểm tra thực chạy lần này.

- Run source `89070980e9fb407fe4031a01f2eae110f7f17181`; approvedimplementation `97c6ce86d6e61f5eb0648a150c5fd464a9ab3e90`.
- PR implementationBaseSha `f160dfa4f7e0c8b3e29232570710d99d4f5ed012`; main/C3baseline `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Registration `796fdc4241a2b53088d3651dbde255655337490b3cf16b252958cccd478d5843`; config `8817b9aa725083bd63452ba1adfceef1eb5597a0323f3dc6c6d1afbf9b10888d`; corpus `949506e769e4a46c9b6a4bb4a89c71c118623c53c355d5733ace83b64fc4027f`; world `6932a0a5a257e3cdb864f2edadbb4e902dd60a28f136c1cce0a6735ad2e418dc`.
- Initialstate `83d6fa51b32d390f7912d09f06ce39b51798317e95fe0d3eeb37e1cfe3a37c24`; current clean source, provider0/DBdropped.
- Owner Vertex`gemini-3.5-flash-lite` HIGH/global/candidateCount1/maxOutputTokens8192/timeout90000/retry0; verifierOpenAI`gpt-6.1-sol`HIGH qua pinnedCodex0.159.2/max1upstream/timeout90000/retry0. Không suy backendbuildversion ngoài modelIDproviderexpose.
- Ownerprompt `9887885e8cfa284a8a8fa45e4df28c7550684f1228a3c3e1995072ba26d8c392`; verifierprompt `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`; schema `19a67ac07104c3417d6c07602334da22fb67a11df87fec4f53a9f4b2b1b46115`.
- Codexbinary `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`.
- Exposureinventory `f630a553f7acc14437d30f736142ea92c45019ea9b9f943a43c2746c23add89a`;6551artifacts/missing0/sourceMappingRequired2381/reviewPENDING. Không freshholdout hoặc decontaminationapproval.

Audit độc lập xác minh66nativewire/firewall/modelbinding,34rawcanonicalhashes/40artifactbytehashes,13text+2imagecapture/15Outbox,receipts/ownership/DBcleanup. Originalraw/config/world/grades bất biến; reports tạo saubatchexit. PrimaryCASE_REVIEW tách khỏi judgegrade. Không C3/SAFETYprobe, sourcepublication, merge/deploy/live-send.

## Commands thực chạy

Repository root; create-once raw/config/world/output nằm ngoài checkout. `ACCOUNTING.json.sourceCommand` có exact argv/times/exit0. `SUPPLEMENTAL_EVIDENCE` trỏ log/hashes của preparationfailed+success, approvals, judge và audit.

```text
node --test "apps/worker/evals/single-agent-commerce-qualification/*.test.mjs"
  80PASS/0FAIL.
node apps/worker/evals/single-agent-commerce-qualification/cli.mjs init --out ../c3-c-readfix-config-20261030-01.json
python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-qualification/capture-world.mjs ../c3-c-readfix-world-20261030-01 ../c3-c-full22-codes-20261029.json
node ../c3-c-readfix-prepare-20261030.mjs world
python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-c-readfix-initial-20261030-01 COD --phase-c-initial-world ../c3-c-readfix-world-resolved-20261030-01.json
node ../c3-c-readfix-prepare-20261030.mjs register
  First2attempts BLOCKED before inference; after reviewed preregistration-only adapter change exit0/PENDING.
node ../c3-c-readfix-finalize-20261030.mjs
  Process-only APPDATA pinned01592; PREFLIGHT_PASS, no generation.
python ../c3-c-readfix-launch-20261030.py
  exit0/22cases/34turns/66requests/retry0/DBdropped. Exactchild in ACCOUNTING.sourceCommand.
node ../c3-c-readfix-report-20261030.mjs
node ../c3-c-readfix-packet-20261030.mjs
node apps/worker/evals/single-agent-commerce-qualification/development-inventory.mjs ../c3-c-readfix-development-sources-20261030-01.json ../c3-c-readfix-development-inventory-20261030-01.json
  exit0/PENDING_REVIEW/missing0.
```

Independent offline judge đã tạo22actualgrades; không dùng syntheticresult, không formalgrade-import vì developmentpacketnamespace riêng. Originalcampaign và earlierfull22grades không sửa hay chuyển điểm.

**Recommendation: STOP sau batch đã hoàn tất.** Cần xử lý lựa chọn nguồn/tool cho câu trả lời có căn cứ, dữ liệu màu/sentinel và metadata matchingảnh; không tự tiếp tục promptfix/rerun. Qualitydevelopment chưa đạt ngưỡng, SAFETYqualification/freshholdout/exposuremapping/C3parity còn thiếu. PhaseCqualification BLOCKED.
