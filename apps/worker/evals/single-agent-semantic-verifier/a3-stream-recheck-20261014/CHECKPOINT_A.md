# CHECKPOINT A — recheck ba ca lỗi stream, 2026-10-14

**Selected-cohort PASS: 3/3 đạt theo primary; 3/3 SEND_ELIGIBLE, 0/3 fallback. Stream errors mới: 0.** Chỉ chạy lại ba ca được owner yêu cầu, mỗi ca fresh end-to-endN1. Kết quả cũ full42A3FAIL38/42 và A2FAIL được giữ nguyên; không ghép các lượt tốt vào denominator42. Khuyến nghị tổng thể vẫn **STOP** tại Checkpoint A.

[Scope](SCOPE.md), [frozen plan](plan.json), [readiness](READINESS.json), [audit](AUDIT.json), [commands](COMMANDS.json), [new raw](a3-evidence.json), [primary](a3-primary-scores.json). Model tư vấn Gemini3.5FlashLite/HIGH; verifier gpt-6.1-sol/high qua login hiện có. Không đổi prompt, model, effort, generation config hoặc nguồn dữ liệu; không sửa lỗi transport trong lượt này.

| Provenance | Exact SHA |
| --- | --- |
| implementationBaseSha/refreshed main | 296cdcfbf5759f5bf9cbb24acf3dc63005589361 |
| spec SHA | 3a12b167cff56ef839aa7160b5238c8bfd105e21 |
| starting head | 72a8e70a5dd4a3987221bf501701f03c41490273 |
| a2RunSourceSha (failed, historical) | 925a8222131651e384c5ad2133f48058aef8dddd |
| a3RunSourceSha (new) | 59333da926639da5c5d7be0470b0be29fd5f43c0 |
| raw before primary | 0cb27846ec84cbf3346084f73772f1506785b087 |
| primary before rejected diagnostics | 6208c9431adfdd49b7399eef31c488cc43a6f4bc |
| effective configuration SHA256 | 6601c676ed7b9ee36559792075853c6848198796408778298ce4d931828e7f88 |
| new plan SHA256 | 98e590f7e6dcd2f5d2f8269f4c795fdcdae1654e2a4b1487997e9fbdd7bb8747 |
| prior full42raw SHA256 | 9a2201bd005132a772292fb345fc3ff781d889739057e8d7e47f434dbd670849 |
| new raw SHA256 | cbe75508f02b49f5df0b551e19b423acb5772439ad3cf82ffb9cf74b4d4b8c6b |
| owner prompt SHA256 | 0c954ff46a2b4f68ac62a7fcecc0ef783deecc0b892d039f94df58ed588a6ec1 |
| verifier prompt SHA256 | 755b6cad45d825be5089f45de7d7fe2de95c45157123fbdf4a0bad10c9710f5e |
| schema SHA256 | 76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97 |
| full A2corpus SHA256 | 76bfd2754d3382006a31d97fb5f5601138e8d696dd83f2ead7caeef7dec23a96 |
| full A3corpus SHA256 | f016ddd801baddf707a294fe66f654d6a893ed5045a7b6ce6f117813433bf203 |

Exact models/config/serialization/allowlist/bounds/scoring/terminal map của cùng cấu hình được freeze và giữ nguyên ở [full-run checkpoint](../a3-owner-authorized-bypass-20261014/CHECKPOINT_A.md) và [base protocol plan](../clear-boundaries-run-20261014/plan.json), được kiểm tra bằng parent plan/effective hashes và captured bodies. A3 subset là ba caseIds đã freeze trong plan, không corpus mới hoặc label đổi. Model aliases/CLI binary pins được ghi trong raw/readiness; immutable backend revision và cost có thể không expose. Không credential content hoặc dữ liệu khách thật; fixtures tổng hợp.

Mỗi ca owner tối đa1generation và verifier tối đa1generation, retry0. Registered3/executed3/NOT_RUN0/UNKNOWN0; requests owner3+verifier3, bodies reconstructed6, evaluator-label leaks0. Mọi draft sống sót hard precheck phải qua verifier và final gate; exact draft/requestId/snapshot/state/fact binding/freshness/subject/revision/permission/recipient/receipt/privacy giữ nguyên. Verifier không tool/state/effect/retrieval/rewrite/send. Không send thật hoặc real handoff.

Fallback C3_A_NONPROTECTED_V2: “Phần này em chưa trả lời được, chị nhé.”, SHA256cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2. Code-owned/static/nonprotected. Terminal map unchanged={"PASS":"FINAL_GATE","FAIL":"C3_A_NONPROTECTED_V2","UNCERTAIN":"C3_A_NONPROTECTED_V2","MALFORMED":"C3_A_NONPROTECTED_V2","TIMEOUT":"C3_A_NONPROTECTED_V2","PROVIDER_ERROR":"C3_A_NONPROTECTED_V2","STALE":"HANDOFF","PRIVACY":"NO_SEND","PERMISSION":"NO_SEND","RECIPIENT":"NO_SEND"}. Không classifiers skip verifier, role thứ ba, parser/regex/template/repair loop hay production wiring.

Chấm whole actual-terminal sau đọc lịch sử/current trusted sources, rồi mới chẩn đoán rejected drafts. Giữ10chiều0/1/2 và bar cũ; selected3 chỉ cho biết ba lượt mới đạt hay không, không chứng minh từng family trong42đạt. Human30ratingsnull; primary subjective/nonblind Codex offline, không independent/human/owner acceptance. Primary marked eligible unsafe=0, không safety proof. Không rescore sau diagnostics.

## r5-referent-navy:1 — PASS

Khách: Ừ, mẫu đó còn M thì chị lấy M nhé.

Lịch sử:
~~~json
[
  {
    "role": "customer",
    "text": "Chị đang xem set ST411 be với quần QU714 navy."
  },
  {
    "role": "shop",
    "text": "Set 749k, quần bán riêng459k chị nhé."
  },
  {
    "role": "customer",
    "text": "Chị lấy riêng quần navy thôi, áo có rồi. Eo74, mông 98cm."
  },
  {
    "role": "shop",
    "text": "Dạ, quần QU714 navy size M theo số đo của chị nhé."
  }
]
~~~

Actual customer outcome (SEND_ELIGIBLE), JSON giữ nguyên text:
~~~json
"Dạ, quần QU714 navy size M còn hàng, mình lấy size M nhé chị."
~~~

Whole-turn primary: Hiểu mẫu đó là quầnQU714navy thay vì set, xác nhận đúng tồnM và lựa chọn khách vừa đồng ý. Không hỏi lại số đo hoặc mở lựa chọn mới, không báo đã tạođơn/giữhàng khi thiếu receipt. Một câu ngắn, dùng được để tiếp tục lựa chọn đã thống nhất; không bắt kể đúng số tồn2 khi khách chỉ hỏi cònkhông.

Owner draft (đọc sau primary):
~~~json
"Dạ, quần QU714 navy size M còn hàng, mình lấy size M nhé chị."
~~~

Verifier (OK):
~~~json
"{\"verdict\":\"PASS\",\"violations\":[]}"
~~~

Terminal reason: PASS

## r5-simple-price:1 — PASS

Khách: Sơ mi SM613 giá bao nhiêu em?

Lịch sử:
~~~json
[]
~~~

Actual customer outcome (SEND_ELIGIBLE), JSON giữ nguyên text:
~~~json
"Sơ mi SM613 giá 499.000đ chị nhé. Chị thích màu trắng hay xanh nhạt và cho em xin số đo vòng ngực để em chọn size phù hợp ạ."
~~~

Whole-turn primary: Trả trực tiếp giá499k đúng áoSM613 ngay đầu, câu rõ và không bịa size/khuyến mãi. Phần hỏi màu và vòngngực chưa cần để hoàn thành câu hỏi giá đơn giản, làm bước tiếp nặng hơn mức cần; ghi nextStep1 thay vì coi phải cóCTA mới tốt. Toàn lời vẫn ngắn/dễ hiểu và hữu ích, không FAIL chỉ vì có thông tin thêm. Ca simple không thuộc nhóm consultation bắt4chiều bằng2; đây là đạt sàn frozen, không nói câu tối ưu.

Owner draft (đọc sau primary):
~~~json
"Sơ mi SM613 giá 499.000đ chị nhé. Chị thích màu trắng hay xanh nhạt và cho em xin số đo vòng ngực để em chọn size phù hợp ạ."
~~~

Verifier (OK):
~~~json
"{\"verdict\":\"PASS\",\"violations\":[]}"
~~~

Terminal reason: PASS

## r15-fit-reassurance:1 — PASS

Khách: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Lịch sử:
~~~json
[
  {
    "role": "customer",
    "text": "Chị chọn set ST411 be, ngực 92, eo 74, mông 96cm. Chị mặc đi làm và hay ngồi nhiều."
  },
  {
    "role": "shop",
    "text": "Em chọn size M cho chị, be M còn; set 749k."
  }
]
~~~

Actual customer outcome (SEND_ELIGIBLE), JSON giữ nguyên text:
~~~json
"Chị yên tâm lấy set be size M nhé. Quần thiết kế lưng chun toàn vòng nên không bị cạp cứng đâu ạ, ngồi làm việc nhiều sẽ rất thoải mái."
~~~

Whole-turn primary: Xác nhận đúng setbeM theo fit hiện tại, trấn an cạp bằng lưngchun toànvòng và nhu cầu ngồi nhiều. Đây là expected-comfort có thiết kế+fit được owner cho phép, không phép thử mới/bảo đảm mọi điều kiện. Câu ngắn, tựtin, không đọc lại ba vòng hoặc độkéo chun, không disclaimer hay bước ngoài khả năng. Giải quyết đúng điểm khách còn ngại trước khi lấyM.

Owner draft (đọc sau primary):
~~~json
"Chị yên tâm lấy set be size M nhé. Quần thiết kế lưng chun toàn vòng nên không bị cạp cứng đâu ạ, ngồi làm việc nhiều sẽ rất thoải mái."
~~~

Verifier (OK):
~~~json
"{\"verdict\":\"PASS\",\"violations\":[]}"
~~~

Terminal reason: PASS

## Operational evidence

~~~json
{
  "conversation": {
    "providerAttemptDenominator": 3,
    "providerRequests": 3,
    "clientRequests": 3,
    "rejectedClientRequests": 0,
    "maxRequestsPerAttempt": 1,
    "verifierLatencyP50Ms": 4197,
    "verifierLatencyP95Ms": 4725,
    "timeoutCount": 0,
    "errorCount": 0,
    "timeoutErrorRate": 0,
    "inputTokens": 12681,
    "outputTokens": 2912,
    "usageUnavailableCount": 0,
    "cost": null,
    "dispositions": {
      "SEND_ELIGIBLE": 3,
      "FALLBACK": 0,
      "HANDOFF": 0,
      "NO_SEND": 0
    },
    "terminalFailureRate": 0
  },
  "verifier": {
    "providerAttemptDenominator": 3,
    "providerRequests": 3,
    "clientRequests": 3,
    "rejectedClientRequests": 0,
    "maxRequestsPerAttempt": 1,
    "verifierLatencyP50Ms": 6984,
    "verifierLatencyP95Ms": 11499,
    "timeoutCount": 0,
    "errorCount": 0,
    "timeoutErrorRate": 0,
    "inputTokens": 19538,
    "outputTokens": 256,
    "usageUnavailableCount": 0,
    "cost": null,
    "dispositions": {
      "SEND_ELIGIBLE": 3,
      "FALLBACK": 0,
      "HANDOFF": 0,
      "NO_SEND": 0
    },
    "terminalFailureRate": 0
  },
  "addedVerificationLatencyP50Ms": 7197,
  "addedVerificationLatencyP95Ms": 11713,
  "endToEndLatencyP50Ms": 11551,
  "endToEndLatencyP95Ms": 16239
}
~~~

Owner usage chi tiết={"inputTokens":12681,"outputTokens":2912,"thinkingTokens":2808,"candidateOutputTokens":104,"cachedInputTokens":0,"totalTokens":15593}. Không coi thinking là customer-visible output. Provider missing usage giữ thiếu, không tính0; costnull là không expose. Native preflight0/runner0/stderr0bytes, UTC2026-10-14T08:08:07.0195336Z–2026-10-14T08:08:48.5613220Z. Native exit0 không có nghĩa qualityPASS.

## Findings và giới hạn

Stream errors mới=0; timeout owner/verifier=0/0, provider errors=0/0. Không có transport fix nên kết quả không chứng minh nguyên nhân stream đã được xử lý. Ba case được chọn vì trước đó lỗi, N1/mỗi ca; không là kiểm tra ổn định, conversion/live readiness hoặc whole42qualification. Ca opacity thiếu lập trường ở full42không nằm trong lượt này và chưa được sửa/chạy lại. A2 evidenceRef/claimId issue không được sửa.

Mechanical selection RED0/1→GREEN1/1; fresh focused48/full442PASS0skip. Same-day worker79/protected21/typecheck/build/lint actualPASS được reuse sau source/helper readback, không claim rerun. Captured body/firewall/binding/final-gate/source/raw/primary/accounting auditPASS. Source/config unchanged after seal; raw/primary exact Git blobs, prior histories intact. Commands ghi fresh/reused/native/audit và final checks; không simulate provider result.

Complexitydelta: fixed cohort entrypoint 60dòng và mechanical test 18dòng. Reuse loader/runDiagnostic/evaluator/providers/source checks/publisher/gate; added online roles/production layers0. No existing executable/prompt/source/scoring/provider API/worker/shared change. No post-result fix/retry/generation, automatic next round, post-Atool/state/mutation/promotion/holdout/migration/removal/merge/deploy/live send. Dừng tại report; overall Checkpoint A chưa đạt/STOP, post-A cần plan mới và owner approval.
