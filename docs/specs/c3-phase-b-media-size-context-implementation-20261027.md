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
