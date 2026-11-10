# R50 A3 — các outcomes chưa đạt

**A3 FAIL; 62/66 đạt; {"SEND_ELIGIBLE":65,"FALLBACK":1,"HANDOFF":0,"NO_SEND":0}.** Review toàn lịch sử, dữ kiện hiện tại và actual terminal trước verdict/draft bị chặn. Nhận xét liền ý về việc mua được viết trước điểm chẩn đoán; không chấm bằng câu trích/keyword/fact count. Đây là Codex primary review chủ quan, nonblind, không independent/human/owner acceptance; 660 human ratings giữ null. Prompt/corpus/threshold và lịch sử cũ không đổi.

## r5-competitor-price

- Khách: Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao.
- Shop: Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L.

**Khách hiện tại:** Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

**Việc mua cần giải quyết:** Cân nhắc giá trị mua đồ đi làm tại shop.

**Băn khoăn:** Chênh129k; chưa bị thuyết phục để mua set.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "ST411",
      "kind": "PRODUCT",
      "label": "Set sơ mi quần suông ST411",
      "bindingVersion": "binding-r5-v1"
    },
    {
      "ref": "SM613",
      "kind": "PRODUCT",
      "label": "Sơ mi dáng thẳng SM613",
      "bindingVersion": "binding-r5-v1"
    }
  ],
  "protectedClaims": [
    {
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "ST411",
        "variantId": null
      },
      "value": {
        "amountVnd": 749000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "ST411",
        "variantId": "ST411:be:S"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "ST411",
        "variantId": "ST411:be:M"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "ST411",
        "variantId": "ST411:be:L"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "ST411",
        "variantId": "ST411:navy:S"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "ST411",
        "variantId": "ST411:navy:M"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "ST411",
        "variantId": "ST411:navy:L"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": null
      },
      "value": {
        "amountVnd": 499000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": "SM613:trắng:S"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": "SM613:trắng:M"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": "SM613:trắng:L"
      },
      "value": {
        "status": "OUT_OF_STOCK",
        "availableQuantity": 0
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": "SM613:xanh nhạt:S"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": "SM613:xanh nhạt:M"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": "SM613:xanh nhạt:L"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    }
  ],
  "policyLiterals": [
    {
      "ref": "exchange:r5",
      "text": "Đổi size hoặc mẫu: trong 7 ngày từ nhận hàng, chưa sử dụng, nguyên tem. Thử trong nhà: chưa giặt, sạch và không mùi, giữ tem. Mặc ra ngoài: không nhận đổi. Phí vận chuyển đổi: khách trả. Hoàn tiền: không áp dụng. Cách diễn đạt tóm tắt được shop xác nhận: đổi trong 7 ngày có cùng mốc tính từ ngày nhận hàng. Đây là giới thiệu chính sách có các giới hạn trên; không xác nhận mọi khách hoặc mọi hàng đều đủ điều kiện đổi. Quyền đổi cho tình huống cụ thể vẫn phụ thuộc thời hạn và tình trạng hàng; không hợp mẫu/size tự nó không đủ xác lập quyền đổi."
    },
    {
      "ref": "shipping-fee:r5",
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Nơi giao của khách chưa xác lập; mức nội thành nêu trên là chính sách chung, chưa phải phí, tổng hoặc ưu đãi áp cho khách."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Nơi giao của khách chưa xác lập; mức nội thành nêu trên là chính sách chung, chưa phải phí, tổng hoặc ưu đãi áp cho khách."
    }
  ],
  "effectReceipts": [],
  "state": {
    "conversationOwner": "BOT",
    "revision": 1,
    "currentProductId": "ST411",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true
  },
  "productProfiles": [
    {
      "ref": "profile:ST411",
      "subjectRef": "ST411",
      "details": {
        "silhouette": "Hình thức bán: cả set áo và quần. Áo sơ mi dáng rộng. Quần ống suông, lưng chun toàn vòng.",
        "material": "Vải: 65% polyester, 35% viscose, không co giãn. Số đo trên quần: chun kéo tối đa S82/M88/L94cm. Thử gấp cùng điều kiện: ít nhăn hơn linen; vẫn có thể nhăn. Phép thử này không đo độ bền, giữ phom cả ngày hoặc thời gian không cần là.",
        "colors": [
          "be",
          "navy"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"]}",
          "S: thành phẩm ngực áo100, eo quần thả66, mông100, dài quần96cm; hướng dẫn cơ thể ngực82–87/eo64–69/mông86–91cm.",
          "M: ngực106, eo thả72, mông106, dài97cm; cơ thể ngực88–94/eo70–76/mông92–98cm.",
          "L: ngực112, eo thả78, mông112, dài98cm; cơ thể ngực95–101/eo77–83/mông99–105cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể; độ kéo chun là số đo trên quần. Có thiết kế và code-fit để tư vấn cảm giác mặc dự kiến; không có phép thử cảm giác cả ngày. Kết quả gấp chỉ so độ nhăn với linen, không đo độ bền, giữ phom theo thời gian hay miễn là ủi."
      }
    },
    {
      "ref": "profile:SM613",
      "subjectRef": "SM613",
      "details": {
        "silhouette": "Hình thức bán: riêng áo. Sơ mi tay dài, dáng thẳng, cổ bẻ.",
        "material": "Vải: 100% cotton dệt dày 180g/m², không co giãn. Phép thử của shop cho màu trắng: ánh sáng phòng, áo lót màu da — không thấy màu áo lót. Đèn ngược sáng — có thể thấy bóng áo lót.",
        "colors": [
          "trắng",
          "xanh nhạt"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"BUST_CM\"],\"missingInputs\":[\"BUST_CM\"]}",
          "S: thành phẩm ngực100, vai38, dài62cm; cơ thể ngực82–87cm.",
          "M: ngực106, vai39, dài63cm; cơ thể ngực88–94cm.",
          "L: ngực112, vai40, dài64cm; cơ thể ngực95–100cm."
        ],
        "care": "Giặt nhẹ nước mát, tách màu, phơi râm; là nhiệt vừa.",
        "limitations": "Bảng áo dùng vòng ngực cơ thể. Phép thử độ xuyên thuộc màu trắng và hai điều kiện ánh sáng ghi ở material; chưa có kết quả độ xuyên màu xanh nhạt. Đây là thử của shop, không phải hãng. Dữ liệu màu để tư vấn phối đồ không phải kết quả độ kín."
      }
    }
  ]
}
```

### r5-competitor-price:2 — FAIL / FALLBACK

Actual terminal khách nhận (nguyên văn):
```text
Phần này em chưa trả lời được, chị nhé.
```

**Nhận xét whole-turn:** Khách đang so giá cần lý do chọn hàng shop, nhưng actual terminal chỉ nói chưa trả lời được. Không cung cấp giá trị sử dụng hoặc hướng lựa chọn dù dữ kiện đã có; câu fallback lịch sự và an toàn nhưng việc mua bị bỏ dở. Chưa đọc draft/verdict bị chặn.

Điểm chẩn đoán theo rubric đã freeze: understanding=1; explicitNeedCompleteness=0; contextCorrectionUse=0; usefulness=0; decisionSupport=0; partialAnswerBehavior=0; nextStep=0; coherence=2; naturalness=2; factualActionSafety=2.

## r7-opacity-context-change

- Khách: Chị muốn áo trắng đi họp, ngại thấy áo lót.
- Shop: SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé.
- Khách: Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm.
- Shop: Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn.

**Khách hiện tại:** Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

**Việc mua cần giải quyết:** Biết giới hạn áo trắng khi đổi sang đèn ngược sáng và tồn size đã chọn.

**Băn khoăn:** Biết giới hạn áo trắng khi đổi sang đèn ngược sáng và tồn size đã chọn.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "SM613",
      "kind": "PRODUCT",
      "label": "Sơ mi dáng thẳng SM613",
      "bindingVersion": "binding-r5-v1"
    }
  ],
  "protectedClaims": [
    {
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": null
      },
      "value": {
        "amountVnd": 499000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": "SM613:trắng:S"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": "SM613:trắng:M"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": "SM613:trắng:L"
      },
      "value": {
        "status": "OUT_OF_STOCK",
        "availableQuantity": 0
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": "SM613:xanh nhạt:S"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": "SM613:xanh nhạt:M"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": "SM613:xanh nhạt:L"
      },
      "value": {
        "status": "IN_STOCK",
        "availableQuantity": 2
      },
      "authorization": "NONE"
    },
    {
      "type": "SIZE_FIT",
      "scope": {
        "kind": "PRODUCT",
        "productId": "SM613",
        "variantId": null
      },
      "value": {
        "recommendedSizes": [
          "M"
        ],
        "alternativeSizes": [],
        "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
        "customerProfileRevision": 1,
        "measurementFingerprint": "6f423570bb69b20b038a6004bf760d8eb9ca9262c51f40bdb3eeaaf588306f15",
        "evidenceBasis": "MEASUREMENTS"
      },
      "authorization": "NONE"
    }
  ],
  "policyLiterals": [
    {
      "ref": "exchange:r5",
      "text": "Đổi size hoặc mẫu: trong 7 ngày từ nhận hàng, chưa sử dụng, nguyên tem. Thử trong nhà: chưa giặt, sạch và không mùi, giữ tem. Mặc ra ngoài: không nhận đổi. Phí vận chuyển đổi: khách trả. Hoàn tiền: không áp dụng. Cách diễn đạt tóm tắt được shop xác nhận: đổi trong 7 ngày có cùng mốc tính từ ngày nhận hàng. Đây là giới thiệu chính sách có các giới hạn trên; không xác nhận mọi khách hoặc mọi hàng đều đủ điều kiện đổi. Quyền đổi cho tình huống cụ thể vẫn phụ thuộc thời hạn và tình trạng hàng; không hợp mẫu/size tự nó không đủ xác lập quyền đổi."
    },
    {
      "ref": "shipping-fee:r5",
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Nơi giao của khách chưa xác lập; mức nội thành nêu trên là chính sách chung, chưa phải phí, tổng hoặc ưu đãi áp cho khách."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Nơi giao của khách chưa xác lập; mức nội thành nêu trên là chính sách chung, chưa phải phí, tổng hoặc ưu đãi áp cho khách."
    }
  ],
  "effectReceipts": [],
  "state": {
    "conversationOwner": "BOT",
    "revision": 1,
    "currentProductId": "SM613",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
    "customerProfileRevision": 1,
    "measurementFingerprint": "6f423570bb69b20b038a6004bf760d8eb9ca9262c51f40bdb3eeaaf588306f15"
  },
  "productProfiles": [
    {
      "ref": "profile:SM613",
      "subjectRef": "SM613",
      "details": {
        "silhouette": "Hình thức bán: riêng áo. Sơ mi tay dài, dáng thẳng, cổ bẻ.",
        "material": "Vải: 100% cotton dệt dày 180g/m², không co giãn. Phép thử của shop cho màu trắng: ánh sáng phòng, áo lót màu da — không thấy màu áo lót. Đèn ngược sáng — có thể thấy bóng áo lót.",
        "colors": [
          "trắng",
          "xanh nhạt"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\"],\"missingInputs\":[]}",
          "S: thành phẩm ngực100, vai38, dài62cm; cơ thể ngực82–87cm.",
          "M: ngực106, vai39, dài63cm; cơ thể ngực88–94cm.",
          "L: ngực112, vai40, dài64cm; cơ thể ngực95–100cm."
        ],
        "care": "Giặt nhẹ nước mát, tách màu, phơi râm; là nhiệt vừa.",
        "limitations": "Bảng áo dùng vòng ngực cơ thể. Phép thử độ xuyên thuộc màu trắng và hai điều kiện ánh sáng ghi ở material; chưa có kết quả độ xuyên màu xanh nhạt. Đây là thử của shop, không phải hãng. Dữ liệu màu để tư vấn phối đồ không phải kết quả độ kín."
      }
    }
  ]
}
```

### r7-opacity-context-change:1 — FAIL / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Trắng M bên em vẫn còn chị nhé. Đi sự kiện có đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót, chị cân nhắc thêm nhé ạ.
```

**Nhận xét whole-turn:** Trả đúng tồn và nguy cơ thấy bóng, nhưng sau khi lịch đổi sang đèn phía sau vẫn để lựa chọn trắngM cũ treo bằng câu cân nhắc. Khách đã nhờ shop chọn trắng ở history; không đưa hướng mua mới dù có đủ căn cứ để khuyên tránh cho dịp này. An toàn ngôn nghĩa nhưng thiếu chủ động quyết định.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=1; usefulness=1; decisionSupport=1; partialAnswerBehavior=2; nextStep=1; coherence=2; naturalness=2; factualActionSafety=2.

### r7-opacity-context-change:2 — FAIL / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Đi sự kiện có đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót chị nhé. Trắng M bên em hiện vẫn còn.
```

**Nhận xét whole-turn:** Đáp hai facts đúng nhưng không điều chỉnh lời shop trước đó đã chọn trắngM cho họp trong phòng. Ở dịp mới ưu tiên tránh lộ, chỉ nguy cơ+tồn chưa giúp khách quyết định có nên giữ lựa chọn; đây là lỗi mạch tư vấn, không phải thiếu kết quả màu thay hay chỉ thiếu một từ khóa.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=1; usefulness=1; decisionSupport=1; partialAnswerBehavior=2; nextStep=1; coherence=2; naturalness=2; factualActionSafety=2.

### r7-opacity-context-change:3 — FAIL / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Trắng M bên em còn chị nhé. Tuy nhiên, đi sự kiện có đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót chị nha.
```

**Nhận xét whole-turn:** Nêu còn hàng rồi nguy cơ đúng mức có thể, song không đổi lập trường mua từ điều kiện phòng sang đèn phía sau. Để khách tự giải quyết xung đột đã phát sinh trong lời shop; khả năng khuyên tránh món đó hiện có nhưng chưa dùng.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=1; usefulness=1; decisionSupport=1; partialAnswerBehavior=2; nextStep=1; coherence=2; naturalness=2; factualActionSafety=2.
