# Implementation — media/size context

Base `b86825a1de84314175bf98d88a991fb940a7ddf2`. Approved plan revision2 hash2cb2803f; plan bytes giữ nguyên. Candidate/source-only; không model/provider/source-store writes/publish/live send. Đây không phải B GO.

## S0 — field map và data readiness

| Dữ liệu | Producer | Hash/publisher | Adapter/validator | Candidate |
| --- | --- | --- | --- | --- |
| Feedback thật | image_registry VERIFIED + loại/intents FEEDBACK, p23c-jobs.ts | feedback_verified, payload hash | qdrant.ts → feedback, search.ts strict | select_product_media FEEDBACK |
| Phần trang phục | PARTS_VISIBLE/AI_PARTS_VISIBLE sau review | image_parts_visible, p23c-jobs/hash/publisher | qdrant.ts → partsVisible, search.ts | DETAIL + componentRole |
| Màu biến thể của ảnh | Chưa có contract tương đương; VISUAL_COLORS chỉ là ngoại hình | Cần thêm verified pair/status vào payload/provenance; không embedding | ProductImage optional colorBinding; strict validator | candidate selector xác minh asset, không chỉ product.colors |
| Khả năng ảnh | Cùng source đã prepare/read | Request-local hint, không business receipt | owner request có một projection bounded | dùng cùng predicate với selector |
| Size | Engine đã nhận fitPreference và tạo SIZE_FIT | canonical binding hiện hành | owner facts đã có M/alternatives=[] và state RELAXED | tool response sẽ co-locate hai field; chưa chứng minh cải thiện model |

Audit repo/capture không xác nhận registry IMAGE_ID thật hoặc metadata mới. Matrix dưới dùng source capture50753ec7 ngày26/10, không giả là live readiness. Feedback/cận váy/color còn DATA_NOT_READY; triển khai code và synthetic tests vẫn tiếp tục. Không đánh dấu fixture là hàng shop đã xác minh.

```json
{
  "capturedAt": "2026-10-26T16:49:45.308Z",
  "assets": [
    {
      "assetIndex": 1,
      "imageSha256": "6af482330db999b995608d26965fdb8eea8107f2197c3b0f337f7a7a938555f7",
      "registryImageId": "NOT_YET_RESOLVED",
      "feedback": false,
      "partsVisible": [
        "UNKNOWN"
      ],
      "verifiedVariantColor": "NOT_PRESENT_IN_CAPTURE",
      "readiness": "DATA_NOT_READY"
    },
    {
      "assetIndex": 2,
      "imageSha256": "b3d828d8ce15114441c356abf66feab67652201b00f53ad77350cc6e703b96c8",
      "registryImageId": "NOT_YET_RESOLVED",
      "feedback": false,
      "partsVisible": [
        "FULL_SET"
      ],
      "verifiedVariantColor": "NOT_PRESENT_IN_CAPTURE",
      "readiness": "DATA_NOT_READY"
    },
    {
      "assetIndex": 3,
      "imageSha256": "3a321ad8b6b888fa470bdda8b83ae24c19238ca5132a56fbeab3dabe3ef7c2fc",
      "registryImageId": "NOT_YET_RESOLVED",
      "feedback": false,
      "partsVisible": [
        "AO",
        "CHAN_VAY"
      ],
      "verifiedVariantColor": "NOT_PRESENT_IN_CAPTURE",
      "readiness": "DATA_NOT_READY"
    },
    {
      "assetIndex": 4,
      "imageSha256": "e651cf09b93cc24f14b21c3539f33430df24346b96d76f580e7e4fcd7d4dd4a3",
      "registryImageId": "NOT_YET_RESOLVED",
      "feedback": false,
      "partsVisible": [
        "UNKNOWN"
      ],
      "verifiedVariantColor": "NOT_PRESENT_IN_CAPTURE",
      "readiness": "DATA_NOT_READY"
    },
    {
      "assetIndex": 5,
      "imageSha256": "4faaa0ba7fea7dc2058d6e7ece47f6d422be40c96ff06ab6ea568ba9c0aa1961",
      "registryImageId": "NOT_YET_RESOLVED",
      "feedback": false,
      "partsVisible": [
        "AO"
      ],
      "verifiedVariantColor": "NOT_PRESENT_IN_CAPTURE",
      "readiness": "DATA_NOT_READY"
    },
    {
      "assetIndex": 6,
      "imageSha256": "8ff6f315a32aaee37d9a6bad154579241ca6aa2116d6106c34332ba7a98cad56",
      "registryImageId": "NOT_YET_RESOLVED",
      "feedback": false,
      "partsVisible": [
        "AO",
        "CHAN_VAY"
      ],
      "verifiedVariantColor": "NOT_PRESENT_IN_CAPTURE",
      "readiness": "DATA_NOT_READY"
    },
    {
      "assetIndex": 7,
      "imageSha256": "fde1e4c575c26587d753dad576701b4a51634a25ef6ac1dd5510b5db16e14f9f",
      "registryImageId": "NOT_YET_RESOLVED",
      "feedback": false,
      "partsVisible": [
        "FULL_SET"
      ],
      "verifiedVariantColor": "NOT_PRESENT_IN_CAPTURE",
      "readiness": "DATA_NOT_READY"
    },
    {
      "assetIndex": 8,
      "imageSha256": "7844275ffdb4d48159d8c10ab9f1fba6b920188471f7994940fda725d46d02cf",
      "registryImageId": "NOT_YET_RESOLVED",
      "feedback": false,
      "partsVisible": [
        "FULL_SET"
      ],
      "verifiedVariantColor": "NOT_PRESENT_IN_CAPTURE",
      "readiness": "DATA_NOT_READY"
    },
    {
      "assetIndex": 9,
      "imageSha256": "2052d1c8bf997f04e8f4e9f80dcbc59b62797bb1865b146f41b775197b36cb6a",
      "registryImageId": "NOT_YET_RESOLVED",
      "feedback": false,
      "partsVisible": [
        "AO",
        "CHAN_VAY"
      ],
      "verifiedVariantColor": "NOT_PRESENT_IN_CAPTURE",
      "readiness": "DATA_NOT_READY"
    },
    {
      "assetIndex": 10,
      "imageSha256": "6c35b67587902c75a223c1e82f13d98ef8208128e3cb95362641a2dc555a9af9",
      "registryImageId": "NOT_YET_RESOLVED",
      "feedback": false,
      "partsVisible": [
        "AO",
        "CHAN_VAY"
      ],
      "verifiedVariantColor": "NOT_PRESENT_IN_CAPTURE",
      "readiness": "DATA_NOT_READY"
    },
    {
      "assetIndex": 11,
      "imageSha256": "36652f18a147e6369d608be9bb1748f70c5cbad9ee57fd608f8e46864774a1c7",
      "registryImageId": "NOT_YET_RESOLVED",
      "feedback": false,
      "partsVisible": [
        "AO",
        "CHAN_VAY"
      ],
      "verifiedVariantColor": "NOT_PRESENT_IN_CAPTURE",
      "readiness": "DATA_NOT_READY"
    }
  ]
}
```

## Size baseline public excerpt

Exact final owner request hash (JSON.stringify): `fe3413ffa3dc27f9078498230e22591b3c36d0540ec9101a4bb2c0342885f53c`. Raw được giữ ngoài source. Không export profile UUID/fingerprint.

```json
{
  "facts": [
    {
      "type": "SIZE_FIT",
      "value": {
        "alternativeSizes": [],
        "customerProfileRevision": 2,
        "evidenceBasis": "MEASUREMENTS",
        "recommendedSizes": [
          "M"
        ]
      }
    }
  ],
  "state.fitPreference": "RELAXED"
}
```

Implementation và commands sẽ được ghi theo evidence; chưa có PASS implementation ở savepoint S0.

## S1 — metadata implementation savepoint

Observed RED: qdrant adapter không giữ colorBinding; sau minimum GREEN qdrant7PASS. Binding ABSENT/VALID/INVALID giữ xuyên publisher→adapter→strict validator, không promote visual/AI colors. Legacy missing không tự có field màu; invalid partial/hash vẫn INVALID. Source pipeline đọc A:AR và append thêm hai manual columns AQ/AR, giữ vị trí A:AP và vùng AI A:V. Không Sheet/Qdrant writes thực tế.

Recognition publisher cần ngoại lệ hẹp cho delivery-only color metadata: PAYLOAD_ONLY nếu stripped content identity và pipeline giữ nguyên; update payload exact point, giữ observation timestamp/vector, readback xác nhận. Không được NOOP bỏ mất metadata hoặc re-embed chỉ vì color binding. Legacy V3 embedding hash không đổi, payload/provenance hashes đổi. HTTP overwrite payload theo [Qdrant official reference](https://api.qdrant.tech/api-reference/points/overwrite-payload), đã đọc trước khi thêm adapter method; tests chỉ mock HTTP, không gọi service. Không thay generic framework hoặc provider API.

Các test đã chạy tới savepoint: shared focused192PASS; targeted worker112PASS trước closure, publisher/adapter48PASS, staging/publisher51PASS (2 files thực sự được discover, không gọi tên test file không tồn tại là đã chạy), sau closure thêm tests source errors/bounds/readback100+ checks trong bước tiếp theo. S1 test metadata-only write failure có no-success-without-readback, generic/default metadata path vẫn giữ. Build shared và directworker tsc trước closure PASS; final checks sẽ chạy lại trên source hoàn tất.

## S2 — bounded media capability và request projection

Observed RED: mediaCapabilities chưa có; sau GREEN getter lấy từ source catalog đã đọc, initial prepare/read_product/batch/media source dùng cùng catalog wrapper. Không thêm catalogue read/download. Lookup lỗi source mới clear hint; deep clone observation immutable, getter không renew TTL, expiry/permission/binding thay đổi omit. Sáu query cố định và một color query theo lần read_product; cùng predicate eligibility với media selector. Field tối đa1.024B/product và4.096B/tổng; toàn field bị omit nếu vượt, không truncate thành negative. Hint không vào canonical protected snapshot/receipt và không thêm invalidation cho reply không dùng media; selected media readback vẫn nguyên.

Có một field projection trên owner execution, không copy vào tool history. Code capture thời điểm generation cho hint validity để audit/request builder và HTTP giống nhau ở biên expiry; không dùng processingAt đầu lượt giả thời điểm mới. Omission diagnostics chỉ telemetry, không gửi evaluator labels hoặc thông tin source nội bộ. RED về request ảnh lớn đã xác nhận rồi GREEN: default transport giữ image bound hiện hành, không vô tình ép xuống64KB; optional hint bị bỏ nếu cần, không drop image/facts/history. CompactV2 vẫn64KB cũ.

Tests: actual mocked HTTP matches, ORIGINAL/CompactV2 native pairs/signatures/history exact, malformed/unbound/expired hints omitted, near-bound omission, large-image default regression5PASS. Worker media tests kiểm no extra reads/immutable expiry/source-error/field bound/authority/color tuple; runtime lifecycle đều dùng helper thuần. Toàn commerceeval214PASS trước final thêm expiry/large-image tests; final source sẽ chạy lại. Không provider thật.

S1 self-review follow-up: metadata write readback so toàn payload bằng canonicalJsonV1, không dùng canonicalForHash vốn bỏ bookkeeping. S0 excerpt đã bỏ synthetic profile UUID/fingerprint, chỉ giữ M/alternatives và RELAXED như cam kết.

## S3 — co-location size và instruction consistency

Observed RED: recommend_size response chưa có inputFitPreference/alternativeSizes. Minimum GREEN thêm đúng hai field cạnh recommendedSizes; alternatives lấy từ verified claim, null khi không có claim, recommendedSizes rỗng khi decision không được claim xác nhận. Engine/bands/SIZE_FIT/verifier không đổi. Test profile RELAXED/M-only đối chiếu actual canonical claim; missing measurements không được quảng bá raw candidates thành alternatives. Không thêm block size, profile IDs hoặc bảng chart mới vào owner wire.

Chỉ thay hai dòng owner prompt (ảnh và size); policy/giọng/form báo giá giữ, verifier prompt hash giữ nguyên. Current owner hash cập nhật manifest. Các historical frozen wire tests đọc đúng historical prompt từ artifact, không ghi lại corpus; một test riêng chứng minh current prompt bị từ chối khi thử dùng historical population. Snapshot/run cũ giữ nguyên. Đây là presentation/adherence hypothesis; chưa có model generation evidence để kết luận owner hết thêm L.

Preflight driver full native thêm exact Codex CLI version/hash/login check trước source capture hoặc control đầu tiên; đăng ký client identity, native phải khớp. Hai Python argument/accounting tests PASS qua all-child stubs, trong đó wrong client phải reject trước mọi output/child. Không hạ version global, không launch provider.

## S4 — final verification và self-review

Executable source `ff5e0543fb425ddf0f2a1b5ec6d722a690e831f9`, worktree sạch trước các checks cuối. Verification output ngoài repository: `C:/Users/nguye/Documents/Sản phẩm AI/c3-b-media-size-verification-20261027`. Source và logs được giữ riêng với historical model runs; không ghi đè frozen inputs/evidence cũ.

| Check đã chạy trên source hoàn tất | Kết quả |
| --- | --- |
| Worker focused, 17 files | 537 PASS |
| Shared focused đúng 7 files trong plan | 192 PASS |
| Shared bổ sung image-selection, cùng 6 files overlap | 116 PASS; không cộng thành số test duy nhất với hàng trên |
| Commerce eval Node suite | 216 PASS, 0 skipped |
| Native full driver Python, all children stubbed | 2 PASS |
| Shared typecheck/build | exit 0 |
| Worker direct typecheck/build/lint | exit 0 từng command |
| git diff --check | PASS |

Lệnh unittest discover đầu tìm 0 test do tên file `driver.test.py`; exit0 đó không được tính là test PASS. Đã chạy trực tiếp đúng file và quan sát 2 tests PASS. Build cũ không còn process exit result không được lấy làm proof; command build cuối có exit0 trên source hoàn tất. Mọi test suite nêu trên chạy local, không phải remote CI hoặc model generation.

Self-review đối chiếu diff với base: giữ ba trạng thái binding, byte/hash/approval checks và chỉ ABSENT dùng legacy fallback; payload-only recognition giữ vector/timestamp và xác nhận full payload bằng readback; producer/consumer ranges khép tới AQ/AR; hint dùng cùng predicate/cache, không extra reads/download, không canonical claims/receipts; request bound omit không làm mất verified data/history/image; SIZE_FIT engine/verifier và handoff/delivery gates nguyên. Những điểm closure được sửa trước source seal gồm source-read error clear cache, recognition metadata-only propagation, generation-clock consistency và regression request ảnh lớn.

Structural delta: 4 helper modules hẹp (color-binding adapter, shared eligibility, request-local capability cache, wire projection); không thêm semantic role, parser/router, template theo ca, provider framework, rewrite/reverify hoặc generation retry. Recognition publisher có một nhánh PAYLOAD_ONLY cho đúng metadata màu, không áp dụng cho thay đổi recognition content khác. Prompt owner chỉ sửa hai dòng về ảnh/size và hai tool descriptions liên quan; không vòng sửa giọng văn. Không đổi barrel export của shared package hoặc production entrypoint.

Approved plan SHA256 vẫn `2cb2803f96e65511cee7daf0b9471fc957eceef875a991826c115ce9fe18e4ba`. Owner prompt SHA256 `ecc60d49142849d34263471bb8b9a14d54d33747a0ef078af64d308ed947dff6`; verifier SHA256 `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`, bytes không đổi so với base. Manifest khớp hai hash. Independent review trước đó APPROVE kế hoạch; implementation này self-review, không mạo nhận đã có independent code approval.

### Exact commands thực sự chạy

Paths dưới tương đối với repository root; log name trong verification directory giữ output của từng command.

```powershell
pnpm --filter @lana/worker exec vitest run src/p23c-jobs.test.ts src/p23c-hash-v3.test.ts src/p23c-recognition-publisher.test.ts src/p23b-metadata-staging.test.ts src/p23c-publisher.test.ts src/image-recognition-qdrant.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-media-delivery.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-product-groups.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-session-silent.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts
pnpm --filter @lana/business-tools exec vitest run src/qdrant.test.ts src/business-tools.test.ts src/media-selector-v2.test.ts src/size-engine.test.ts src/size-claim-guard.test.ts src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/business-tools exec vitest run src/qdrant.test.ts src/business-tools.test.ts src/image-selection.test.ts src/media-selector-v2.test.ts src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts
node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/driver.test.py
pnpm --filter @lana/business-tools typecheck
pnpm --filter @lana/business-tools build
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

### Phân biệt acceptance

Code correctness đã có focused regression evidence. Data readiness vẫn DATA_NOT_READY ở các asset chưa xác nhận IMAGE_ID/feedback/component/color binding thật; không tự điền metadata hoặc publish. Owner adherence/quality sau sửa chưa verified: chưa có provider request nào trong implementation này, chưa chứng minh model không tự thêm L hay giảm handoff. Native full51 + fresh17controls chỉ là bước qualification sau khi được yêu cầu chạy, không lấy các local tests làm model PASS/B GO. Không merge/deploy/live send hoặc source-store write.

### Persisted PostgreSQL — COMPLETE

Cả hai command exit0: **49COD+49BANK_TRANSFER PASS** trên exact executable source `ff5e0543`, `sourceDirty:false`. Hai database riêng có prefix `c3_b_test_` và cả hai `testDatabaseDropped:true`. Synthetic domain/tool-owner/verifier stubs + current policy capture; `providerGenerations:0`, `sendEnabled:false`, delivery capture không gọi Meta/Pancake thật. Live policy source được đọc qua route hiện có ở chế độ read-only; schema/test data chỉ ghi trong database test rồi drop. Không gọi đây là model/native quality hoặc live-send proof.

Suite kiểm partial commits/recovery accounting, silent và configured holding policies, media source/revision invalidation/restart, exact response-group capture/idempotency, private checkout, sửa hồ sơ/size receipts, cart/quote/negotiation, confirmation, concurrency và rollback safety. PURCHASE_CONFIRMED/ownership/event/tag/zero-new-Outbox theo policy vẫn giữ. Hai phương thức thanh toán dùng database riêng, không trộn attempt hoặc dùng rerun để bỏ lỗi; không có case FAIL trong hai lượt.

```powershell
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs "C:/Users/nguye/Documents/Sản phẩm AI/c3-b-media-size-verification-20261027/postgres-cod" COD --candidate-handoff --composed-only
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs "C:/Users/nguye/Documents/Sản phẩm AI/c3-b-media-size-verification-20261027/postgres-bank" BANK_TRANSFER --candidate-handoff --composed-only
```

[Machine-readable verification](../../apps/worker/evals/single-agent-commerce-read-only/media-size-context-implementation-20261027/VERIFICATION.json) chỉ curate source/hash/check/case status và cleanup; không copy raw published-policy pointers hoặc customer/profile identifiers. Raw integration reports/logs giữ ở verification directory ngoài source. Bounded added-diff credential scan có0 matches cho private-key blocks, credential literals/URLs và provider-key patterns; không thay thế full security/PII audit. `git diff --check` kiểm lại trước commit.

Kết luận implementation: **S0–S4 COMPLETE, code sẵn cho qualification tiếp theo**. Metadata shop thật vẫn DATA_NOT_READY, chưa cập nhật AQ/AR hoặc nhãn ảnh thật; **fresh provider/model qualification NOT_RUN**, không kết luận tư vấn/owner adherence đã cải thiện và không B GO. Các commit sau executable source chỉ ghi documentation/evidence, không đổi executable/config. Không triển khai post-plan work hoặc tự mở model rerun.
