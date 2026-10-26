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
        "customerProfileId": "ccf3970a-62bf-4239-9884-489be82e82da",
        "customerProfileRevision": 2,
        "evidenceBasis": "MEASUREMENTS",
        "measurementFingerprint": "b44eef747feceaef833fd5a668f7682ebf2882360fa0a454f8166f2b8243cb94",
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
