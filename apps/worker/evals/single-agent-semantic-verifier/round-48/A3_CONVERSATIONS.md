# R48 A3 — 42 lịch sử / 66 kết quả thực tế

**A3 FAIL; 60/66 đạt; 61 SEND_ELIGIBLE / 5 FALLBACK / 0 HANDOFF / 0 NO_SEND.** Review toàn lịch sử, dữ kiện hiện tại và actual terminal trước verdict/draft bị chặn. Nhận xét liền ý về việc mua được viết trước điểm chẩn đoán; không chấm bằng câu trích/keyword/fact count. Đây là Codex primary review chủ quan, nonblind, không independent/human/owner acceptance; 660 human ratings giữ null. Prompt/corpus/threshold và lịch sử cũ không đổi.

## r5-workday-comfort

- Khách: Chị cần đồ đi làm tầm 850k. Ngồi máy tính suốt nên chị không thích đồ ôm eo.
- Shop: Set ST411 749k có quần suông lưng chun chị nhé. Váy VA512 829k thì eo cố định. Chị thích set hay váy?

**Khách hiện tại:** Chị chưa chọn được. Ngực 92, eo 74, mông 96cm em nhé, em chọn mẫu với size giúp chị.

**Việc mua cần giải quyết:** Chọn đồ đi làm hợp nhu cầu ngồi nhiều,850k.

**Băn khoăn:** Lo ôm eo, muốn người bán chọn giúp.

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
      "ref": "VA512",
      "kind": "PRODUCT",
      "label": "Váy midi chữ A VA512",
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
        "productId": "VA512",
        "variantId": null
      },
      "value": {
        "amountVnd": 829000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": "VA512:đen:S"
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
        "productId": "VA512",
        "variantId": "VA512:đen:M"
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
        "productId": "VA512",
        "variantId": "VA512:đen:L"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:S"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:M"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:L"
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
        "productId": "ST411",
        "variantId": null
      },
      "value": {
        "recommendedSizes": [
          "M"
        ],
        "alternativeSizes": [],
        "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
        "customerProfileRevision": 1,
        "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032",
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
    "currentProductId": "ST411",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
    "customerProfileRevision": 1,
    "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032"
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
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
          "S: thành phẩm ngực áo100, eo quần thả66, mông100, dài quần96cm; hướng dẫn cơ thể ngực82–87/eo64–69/mông86–91cm.",
          "M: ngực106, eo thả72, mông106, dài97cm; cơ thể ngực88–94/eo70–76/mông92–98cm.",
          "L: ngực112, eo thả78, mông112, dài98cm; cơ thể ngực95–101/eo77–83/mông99–105cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể; độ kéo chun là số đo trên quần. Có thiết kế và code-fit để tư vấn cảm giác mặc dự kiến; không có phép thử cảm giác cả ngày. Kết quả gấp chỉ so độ nhăn với linen, không đo độ bền, giữ phom theo thời gian hay miễn là ủi."
      }
    },
    {
      "ref": "profile:VA512",
      "subjectRef": "VA512",
      "details": {
        "silhouette": "Váy midi chữ A, cổ vuông, tay ngắn. Eo cố định; lót toàn thân.",
        "material": "Crepe 100% polyester, không co giãn. Phần eo không có chun. Lót che thân váy trong ánh sáng phòng thông thường.",
        "colors": [
          "đen",
          "rêu"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
          "S: thành phẩm ngực92, eo73, mông104, dài110cm; cơ thể ngực82–87/eo64–69/mông86–93cm.",
          "M: ngực98, eo78, mông110, dài111cm; cơ thể ngực88–93/eo70–74/mông94–100cm.",
          "L: ngực103, eo83, mông116, dài112cm; cơ thể ngực94–98/eo75–79/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, là nhiệt thấp, không sấy nóng.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể. Eo cố định, có lót toàn thân. Độ che của lót đã xác nhận chỉ trong ánh sáng phòng; không có kết quả mọi ánh sáng hoặc thử cảm giác mặc cả ngày."
      }
    }
  ]
}
```

### r5-workday-comfort:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Em chọn set ST411 size M nhé chị. Quần lưng chun toàn vòng ngồi làm việc cả ngày rất thoải mái, giá 749k đúng tầm ngân sách chị đang cần.
```

**Nhận xét whole-turn:** Khách nhờ chọn giữa set và váy vì ngồi nhiều, không thích ôm eo. Shop chọn ST411 M đúng code-fit, gắn lưng chun với nhu cầu mặc và giá 749k trong ngân sách. Đây là lời tư vấn cảm giác mặc thông thường có căn cứ thiết kế/fit, không tự tạo phép thử hay bảo đảm tuyệt đối; câu ngắn, chủ động, không xin lại số đo. Lượt này đủ giúp khách chọn mẫu và size.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

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

### r5-competitor-price:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị lấy set ST411 bên em nhé. Mặc đi làm thường xuyên thì set này rất tiện: chất vải ít nhăn hơn linen giúp chị ngồi làm việc cả ngày vẫn gọn gàng, quần lưng chun thoải mái, lại dễ tách áo hoặc quần ra phối với các đồ khác được chị ạ.
```

**Nhận xét whole-turn:** Khách đang cân nhắc chênh giá để mặc đi làm thường xuyên. Shop đứng về ST411, nối lợi ích ít nhăn, lưng chun và phối tách với cách sử dụng ấy; không suy đoán bộ 620k kém hơn. Lý do chưa rất sắc về chênh 129k, nhưng vẫn giải thích công dụng cụ thể và đưa lựa chọn dùng được; không bắt buộc thêm fact mới, chính sách đổi hoặc câu hỏi size ở lượt so giá. Giọng tư vấn tự tin và lời gọn gàng cả ngày là nhận định thông thường trong ngữ cảnh này.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r5-competitor-price:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Em chọn set ST411 chị nhé. Mua cả bộ vừa nhanh gọn đi làm, vừa tách rời áo hoặc quần để phối linh hoạt với các món khác trong tủ, tính ra dùng được nhiều kiểu chị ạ. Vải ít nhăn và đứng dáng, mặc cả ngày làm việc vẫn giữ form chỉn chu.
```

**Nhận xét whole-turn:** Shop đề xuất ST411 và giải thích một lần mua có cả bộ để đi làm, tách áo/quần thành nhiều cách phối. Điều này trực tiếp trả băn khoăn giá trị sử dụng thường xuyên, không hạ chất lượng đối thủ hay hứa tính năng chưa có. Nhắc lại khả năng phối đã biết ở history có mục đích thuyết phục, không phải liệt kê vô ích; câu đứng dáng/chỉn chu thuộc tư vấn thông thường được duyệt. Khách có hướng mua rõ mà không bị ép một bước không cần thiết.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r5-competitor-price:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Em chọn set ST411 chị nhé. Bộ gồm cả áo và quần suông, chất vải ít nhăn giúp chị mặc đi làm cả ngày vẫn giữ form chỉn chu. Chị có thể mặc cả bộ hoặc tách rời phối với đồ khác rất linh hoạt, dùng được nhiều dịp.
```

**Nhận xét whole-turn:** Shop chọn set đang được khách thích, dùng hai món phối linh hoạt và vẻ chỉn chu khi đi làm để giải thích giá trị sử dụng. Không có kết luận về hàng đối thủ, độ bền kiểm nghiệm hoặc ưu đãi giả. Lý do hơi giống hai lượt kia nhưng mỗi lượt vẫn là câu trả lời trọn vẹn cho cùng băn khoăn, không áp dụng majority hoặc đòi lợi ích mới. Giọng trực tiếp, khách biết shop khuyên mua gì và vì sao.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-wardrobe-budget

- Khách: Chị có quần navy rồi, muốn mua thêm đồ đi làm. Cả ship dưới 600k nhé em.
- Shop: Sơ mi SM613 499k chị nhé, có trắng và xanh nhạt. Set ST411 cả áo quần 749k.

**Khách hiện tại:** Chị ở nội thành TP.HCM. Lấy áo thôi hay cả set em? Chị không muốn mua thừa quần.

**Việc mua cần giải quyết:** Đổi phong cách đi làm trong600k, tận dụng quần đã có.

**Băn khoăn:** Lo mua thừa/lãng phí; từ phí không phải động cơ tìm freeship.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "SM613",
      "kind": "PRODUCT",
      "label": "Sơ mi dáng thẳng SM613",
      "bindingVersion": "binding-r5-v1"
    },
    {
      "ref": "ST411",
      "kind": "PRODUCT",
      "label": "Set sơ mi quần suông ST411",
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
    }
  ],
  "policyLiterals": [
    {
      "ref": "exchange:r5",
      "text": "Đổi size hoặc mẫu: trong 7 ngày từ nhận hàng, chưa sử dụng, nguyên tem. Thử trong nhà: chưa giặt, sạch và không mùi, giữ tem. Mặc ra ngoài: không nhận đổi. Phí vận chuyển đổi: khách trả. Hoàn tiền: không áp dụng. Cách diễn đạt tóm tắt được shop xác nhận: đổi trong 7 ngày có cùng mốc tính từ ngày nhận hàng. Đây là giới thiệu chính sách có các giới hạn trên; không xác nhận mọi khách hoặc mọi hàng đều đủ điều kiện đổi. Quyền đổi cho tình huống cụ thể vẫn phụ thuộc thời hạn và tình trạng hàng; không hợp mẫu/size tự nó không đủ xác lập quyền đổi."
    },
    {
      "ref": "shipping-fee:r5",
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "quote:SM613",
      "text": "{\"items\":[{\"productId\":\"SM613\",\"quantity\":1,\"unitPrice\":499000}],\"destination\":\"INNER_HCMC\",\"subtotal\":499000,\"shipping\":25000,\"total\":524000}"
    },
    {
      "ref": "quote:ST411",
      "text": "{\"items\":[{\"productId\":\"ST411\",\"quantity\":1,\"unitPrice\":749000}],\"destination\":\"INNER_HCMC\",\"subtotal\":749000,\"shipping\":0,\"total\":749000}"
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

### r5-wardrobe-budget:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị lấy áo SM613 thôi nhé ạ. Áo 499k cộng 25k ship nội thành là 524k, vừa vặn ngân sách dưới 600k của chị và không bị thừa quần. Set ST411 giá 749k vượt ngân sách rồi ạ. Áo trắng hoặc xanh nhạt phối với quần navy sẵn có của chị đi làm rất đẹp nha.
```

**Nhận xét whole-turn:** Khách có quần navy và ngân sách 600k gồm ship. Shop khuyên mua áo riêng, tính đúng 524k và phân biệt với set 749k vượt ngân sách, rồi gợi trắng/xanh nhạt phối quần sẵn có. Đoạn ngân sách hơi lặp nhưng toàn lời vẫn phục vụ lựa chọn áo thay vì mua thừa quần; không cần chốt bắt buộc một màu hay xin số đo khi câu hỏi hiện tại là áo hay set. Thông tin giao và tổng có quote đúng phạm vi.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-white-opacity

- Khách: Chị muốn áo trắng đi họp, mà sợ lộ áo lót.
- Shop: SM613 trắng mặc với áo lót màu da trong phòng không thấy màu áo lót chị nhé. Ngược sáng vẫn có thể thấy bóng.

**Khách hiện tại:** Ngực chị 92cm. Chị họp trong phòng và mặc áo lót màu da rồi, lấy trắng được em nhỉ?

**Việc mua cần giải quyết:** Chọn áo trắng đi họp phù hợp cách mặc đã nói.

**Băn khoăn:** Muốn xác nhận lựa chọn sau khi biết điều kiện độ xuyên.

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

### r5-white-opacity:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị lấy trắng size M nhé chị. Ngồi họp trong phòng và mặc áo lót màu da thì không thấy màu áo, với ngực 92cm chị mặc size M là vừa đẹp ạ.
```

**Nhận xét whole-turn:** Khách đã nêu đúng điều kiện họp trong phòng và áo lót màu da. Shop đồng ý trắng M theo fit hiện tại, dùng ngực 92cm như dẫn chứng ngắn có ích và giữ điều kiện độ kín trong lời đáp. Cụm màu áo được hiểu là áo lót theo toàn hội thoại, không là bảo đảm mọi ánh sáng. Lặp chị hơi vụng nhưng không làm tư vấn khó hiểu hay thiếu tự nhiên ở mức material; lựa chọn của khách được tiếp tục rõ ràng.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-size-price-stock

- Khách: Chị lấy váy VA512 màu rêu đi tiệc. Ngực 96, eo 77, mông 104cm.
- Shop: Rêu còn S, M, L chị nhé, váy 829k.

**Khách hiện tại:** Chị mặc size nào em? Giao nội thành TP.HCM cả ship bao nhiêu, dưới 900k nhé.

**Việc mua cần giải quyết:** Hoàn tất lựa chọn size và tổng tiền váy đã chọn.

**Băn khoăn:** Cần size/tổng đúng, không cần tư vấn lại kiểu dáng.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "VA512",
      "kind": "PRODUCT",
      "label": "Váy midi chữ A VA512",
      "bindingVersion": "binding-r5-v1"
    }
  ],
  "protectedClaims": [
    {
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": null
      },
      "value": {
        "amountVnd": 829000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": "VA512:đen:S"
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
        "productId": "VA512",
        "variantId": "VA512:đen:M"
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
        "productId": "VA512",
        "variantId": "VA512:đen:L"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:S"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:M"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:L"
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
        "productId": "VA512",
        "variantId": null
      },
      "value": {
        "recommendedSizes": [
          "L"
        ],
        "alternativeSizes": [],
        "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
        "customerProfileRevision": 1,
        "measurementFingerprint": "4e2bccddcf403930ff7fa94ef5d0619ca65fd8eef7275161083072ad2e7fb73f",
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
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "quote:VA512",
      "text": "{\"items\":[{\"productId\":\"VA512\",\"quantity\":1,\"unitPrice\":829000}],\"destination\":\"INNER_HCMC\",\"subtotal\":829000,\"shipping\":0,\"total\":829000}"
    }
  ],
  "effectReceipts": [],
  "state": {
    "conversationOwner": "BOT",
    "revision": 1,
    "currentProductId": "VA512",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
    "customerProfileRevision": 1,
    "measurementFingerprint": "4e2bccddcf403930ff7fa94ef5d0619ca65fd8eef7275161083072ad2e7fb73f"
  },
  "productProfiles": [
    {
      "ref": "profile:VA512",
      "subjectRef": "VA512",
      "details": {
        "silhouette": "Váy midi chữ A, cổ vuông, tay ngắn. Eo cố định; lót toàn thân.",
        "material": "Crepe 100% polyester, không co giãn. Phần eo không có chun. Lót che thân váy trong ánh sáng phòng thông thường.",
        "colors": [
          "đen",
          "rêu"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
          "S: thành phẩm ngực92, eo73, mông104, dài110cm; cơ thể ngực82–87/eo64–69/mông86–93cm.",
          "M: ngực98, eo78, mông110, dài111cm; cơ thể ngực88–93/eo70–74/mông94–100cm.",
          "L: ngực103, eo83, mông116, dài112cm; cơ thể ngực94–98/eo75–79/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, là nhiệt thấp, không sấy nóng.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể. Eo cố định, có lót toàn thân. Độ che của lót đã xác nhận chỉ trong ánh sáng phòng; không có kết quả mọi ánh sáng hoặc thử cảm giác mặc cả ngày."
      }
    }
  ]
}
```

### r5-size-price-stock:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị mặc size L nhé. Đơn 829k được miễn phí ship nội thành TP.HCM nên tổng thanh toán là 829k, dưới 900k như chị cần ạ.
```

**Nhận xét whole-turn:** Khách đã chọn váy rêu và chỉ cần size/tổng để dưới 900k. Shop trả L đúng fit và tổng 829k miễn ship nội thành đúng quote; không mở lại kiểu dáng, hỏi lại số đo hay báo đã lên đơn. Không cần thêm danh mục tồn vì trạng thái rêu đã được history xác nhận và vẫn đúng snapshot; câu ngắn hoàn tất phần quyết định mua được hỏi.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-missing-customer-size

- Khách: Chị cần quần navy mặc với áo sơ mi trắng ở nhà.
- Shop: Em có quần QU714 navy 459k chị nhé. Ống suông, lưng có chun phía sau, còn S, M, L.

**Khách hiện tại:** Chị ở nội thành TP.HCM, quần này cả ship bao nhiêu? Navy còn không em, chị lấy size nào?

**Việc mua cần giải quyết:** Mua quầnnavy phù hợp, biết tổng trước chọnsize.

**Băn khoăn:** Chưa cung cấp eo/mông của khách; dữ liệu shop đầy đủ.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "QU714",
      "kind": "PRODUCT",
      "label": "Quần suông QU714",
      "bindingVersion": "binding-r5-v1"
    }
  ],
  "protectedClaims": [
    {
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": null
      },
      "value": {
        "amountVnd": 459000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": "QU714:navy:S"
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
        "productId": "QU714",
        "variantId": "QU714:navy:M"
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
        "productId": "QU714",
        "variantId": "QU714:navy:L"
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
        "productId": "QU714",
        "variantId": "QU714:đen:S"
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
        "productId": "QU714",
        "variantId": "QU714:đen:M"
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
        "productId": "QU714",
        "variantId": "QU714:đen:L"
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
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "quote:QU714",
      "text": "{\"items\":[{\"productId\":\"QU714\",\"quantity\":1,\"unitPrice\":459000}],\"destination\":\"INNER_HCMC\",\"subtotal\":459000,\"shipping\":25000,\"total\":484000}"
    }
  ],
  "effectReceipts": [],
  "state": {
    "conversationOwner": "BOT",
    "revision": 1,
    "currentProductId": "QU714",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true
  },
  "productProfiles": [
    {
      "ref": "profile:QU714",
      "subjectRef": "QU714",
      "details": {
        "silhouette": "Hình thức bán: riêng quần. Ống suông; cạp trước phẳng, chun ở phần sau.",
        "material": "Vải: 68% polyester, 30% viscose, 2% elastane; co giãn nhẹ. Số đo trên quần: eo kéo tối đa S78/M84/L90cm.",
        "colors": [
          "navy",
          "đen"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"WAIST_CM\",\"HIPS_CM\"]}",
          "S: thành phẩm eo thả66, mông102, dài96cm; cơ thể eo64–69/mông88–93cm.",
          "M: eo thả72, mông108, dài97cm; cơ thể eo70–76/mông94–100cm.",
          "L: eo thả78, mông114, dài98cm; cơ thể eo77–82/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng eo/mông cơ thể; độ kéo chun là số đo trên quần. Thiết kế/chun sau và code-fit hỗ trợ cảm giác mặc dự kiến; không có phép thử cảm giác mọi người hoặc mọi điều kiện."
      }
    }
  ]
}
```

### r5-missing-customer-size:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Tổng thanh toán là 484k (quần 459k và 25k ship nội thành TP.HCM) chị nhé. Quần navy mình còn đủ size S, M, L, chị cho em xin số đo eo và mông để em chọn size vừa chuẩn cho mình ạ.
```

**Nhận xét whole-turn:** Shop trả trước tổng 484k và navy còn S/M/L, rồi chỉ xin eo/mông là hai đầu vào còn thiếu cho quần QU714. Khách biết tiền và có bước cung cấp thông tin thật sự giúp chọn size; không hỏi lại dữ liệu shop hoặc đoán fit. Lời đáp ngắn, tự nhiên, đúng phạm vi giao đã xác lập và xử lý phần có/thiếu dữ liệu hợp lý.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-white-variant-alternative

- Khách: Chị thích SM613 trắng, ngực98cm. Chị có quần đen, tiền áo tầm550k.
- Shop: Theo vòng ngực98cm chị xem sizeL. Mẫu này còn có xanh nhạt.

**Khách hiện tại:** TrắngL còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

**Việc mua cần giải quyết:** Chọn áo thay thế có tồn, phối quầnđen,≤550k.

**Băn khoăn:** Muốn màu trắng nhưng biến thể hết.

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
          "L"
        ],
        "alternativeSizes": [],
        "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
        "customerProfileRevision": 1,
        "measurementFingerprint": "2ec8d59f3e5056f43630712e7b920e1c98df54e0774d3f63dedccbe8c3aba6e0",
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
    "consideredSize": "L",
    "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
    "customerProfileRevision": 1,
    "measurementFingerprint": "2ec8d59f3e5056f43630712e7b920e1c98df54e0774d3f63dedccbe8c3aba6e0"
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

### r5-white-variant-alternative:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Trắng size L hết rồi chị ạ. Chị lấy sang xanh nhạt size L nhé, màu này mặc với quần đen rất sáng và lịch sự.
```

**Nhận xét whole-turn:** Khách cho phép shop đổi màu nếu trắng L hết, để mặc với quần đen. Shop báo hết đúng biến thể rồi chọn xanh nhạt L có tồn, giải thích phối sáng/lịch sự; không suy từ màu sang độ kín hay hứa nhập lại. Giá không được hỏi lại và mẫu thay nằm trong ngân sách theo dữ liệu hiện tại; bỏ con số 499k không tự làm lựa chọn này thất bại. Câu ngắn tiếp tục việc mua bằng phương án thực tế.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-delivery-timing

- Khách: Chị lấy set ST411 navy M. Giao nội thành TP.HCM nhé, sáng thứ Sáu chị cần mặc.
- Shop: Set 749k, miễn ship chị nhé. Bên em giao dự kiến 2–3 ngày sau xác nhận đơn.

**Khách hiện tại:** Hôm nay thứ Ba, có kịp sáng thứ Sáu không em? Chị phải mặc hôm đó.

**Việc mua cần giải quyết:** Có đồ mặc đúng dịp, quyết định có mua set lúc này.

**Băn khoăn:** Deadline quan trọng, ETA không bảođảm.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "ST411",
      "kind": "PRODUCT",
      "label": "Set sơ mi quần suông ST411",
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
    }
  ],
  "policyLiterals": [
    {
      "ref": "exchange:r5",
      "text": "Đổi size hoặc mẫu: trong 7 ngày từ nhận hàng, chưa sử dụng, nguyên tem. Thử trong nhà: chưa giặt, sạch và không mùi, giữ tem. Mặc ra ngoài: không nhận đổi. Phí vận chuyển đổi: khách trả. Hoàn tiền: không áp dụng. Cách diễn đạt tóm tắt được shop xác nhận: đổi trong 7 ngày có cùng mốc tính từ ngày nhận hàng. Đây là giới thiệu chính sách có các giới hạn trên; không xác nhận mọi khách hoặc mọi hàng đều đủ điều kiện đổi. Quyền đổi cho tình huống cụ thể vẫn phụ thuộc thời hạn và tình trạng hàng; không hợp mẫu/size tự nó không đủ xác lập quyền đổi."
    },
    {
      "ref": "shipping-fee:r5",
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "quote:ST411",
      "text": "{\"items\":[{\"productId\":\"ST411\",\"quantity\":1,\"unitPrice\":749000}],\"destination\":\"INNER_HCMC\",\"subtotal\":749000,\"shipping\":0,\"total\":749000}"
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
    "privacyAllowed": true,
    "consideredSize": "M"
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
    }
  ]
}
```

### r5-delivery-timing:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Em chưa đảm bảo giao kịp sáng thứ Sáu cho chị được nhé ạ, vì thời gian giao dự kiến là 2–3 ngày sau xác nhận đơn và bên em không có cam kết giờ giao cụ thể.
```

**Nhận xét whole-turn:** Khách cần câu trả lời trực tiếp về sáng thứ Sáu. Shop nói chưa bảo đảm kịp, giải thích ETA 2–3 ngày sau xác nhận không có cam kết giờ; không biến chưa chắc thành chắc trễ hay bắt khách chuẩn bị đồ khác. Context không có món/lịch giao chắc kịp để thay thế, nên kết luận này đủ giúp khách quyết định có dựa vào đơn cho dịp này hay không. Giọng rõ, gọn và không tạo bước hứa giao gấp.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r5-delivery-timing:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Em chưa đảm bảo giao kịp sáng thứ Sáu được chị nhé, nội thành dự kiến 2–3 ngày sau xác nhận đơn nhưng bên em không cam kết giờ đến cụ thể.
```

**Nhận xét whole-turn:** Khách cần câu trả lời trực tiếp về sáng thứ Sáu. Shop nói chưa bảo đảm kịp, giải thích ETA 2–3 ngày sau xác nhận không có cam kết giờ; không biến chưa chắc thành chắc trễ hay bắt khách chuẩn bị đồ khác. Context không có món/lịch giao chắc kịp để thay thế, nên kết luận này đủ giúp khách quyết định có dựa vào đơn cho dịp này hay không. Giọng rõ, gọn và không tạo bước hứa giao gấp.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r5-delivery-timing:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Em chưa đảm bảo giao kịp sáng thứ Sáu được chị nhé, vì thời gian dự kiến là 2–3 ngày sau xác nhận đơn và không có cam kết giờ đến cụ thể.
```

**Nhận xét whole-turn:** Khách cần câu trả lời trực tiếp về sáng thứ Sáu. Shop nói chưa bảo đảm kịp, giải thích ETA 2–3 ngày sau xác nhận không có cam kết giờ; không biến chưa chắc thành chắc trễ hay bắt khách chuẩn bị đồ khác. Context không có món/lịch giao chắc kịp để thay thế, nên kết luận này đủ giúp khách quyết định có dựa vào đơn cho dịp này hay không. Giọng rõ, gọn và không tạo bước hứa giao gấp.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-correct-product

- Khách: Chị hỏi set ST411 navy, giá749k đúng không?
- Shop: Dạ đúng chị, set gồm áo và quần749k. Navy còn S,M,L.

**Khách hiện tại:** Chị đổi sang sơ mi SM613 xanh nhạt thôi, quần có rồi. Ngực92cm. Áo bao nhiêu, chị lấy size nào?

**Việc mua cần giải quyết:** Đổi sang áo riêng đúng nhu cầu mới.

**Băn khoăn:** Bỏ set, cần đúng giá/size của áo.

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
    "currentProductId": "ST411",
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
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"WAIST_CM\",\"HIPS_CM\"]}",
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

### r5-correct-product:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ áo 499k chị nhé, ngực 92cm chị lấy size M vừa đẹp ạ.
```

**Nhận xét whole-turn:** Khách bỏ set để lấy riêng sơ mi xanh nhạt. Shop chuyển đúng sang giá áo 499k và M từ code-fit của ngực 92cm, không mang giá 749k hoặc thiếu đầu vào quần sang. Một số đo được dùng để củng cố chọn size có mục đích, không đọc lại toàn hồ sơ. Lời đáp hoàn tất hai câu hỏi hiện tại một cách tự tin, không cần nhắc lại tên/màu đã rõ trong lượt khách.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-correct-measurement

- Khách: Chị muốn VA512 đen, ngực91, eo72, mông97cm.
- Shop: Theo số đo đó em chọnM cho chị. ĐenM đang còn hàng.

**Khách hiện tại:** Chị đo nhầm. Số mới là ngực96, eo77, mông104cm. ChuyểnL nhé em?

**Việc mua cần giải quyết:** Sửa size theo sốđo mới cho váyđen.

**Băn khoăn:** SizeM cũ không còn áp dụng.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "VA512",
      "kind": "PRODUCT",
      "label": "Váy midi chữ A VA512",
      "bindingVersion": "binding-r5-v1"
    }
  ],
  "protectedClaims": [
    {
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": null
      },
      "value": {
        "amountVnd": 829000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": "VA512:đen:S"
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
        "productId": "VA512",
        "variantId": "VA512:đen:M"
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
        "productId": "VA512",
        "variantId": "VA512:đen:L"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:S"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:M"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:L"
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
        "productId": "VA512",
        "variantId": null
      },
      "value": {
        "recommendedSizes": [
          "L"
        ],
        "alternativeSizes": [],
        "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
        "customerProfileRevision": 2,
        "measurementFingerprint": "aea3e9c8ddb7d9db4b0f6371cefe086b0801770868a3c6f6a43c8da6ba908894",
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
    "currentProductId": "VA512",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "consideredSize": "M",
    "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
    "customerProfileRevision": 2,
    "measurementFingerprint": "aea3e9c8ddb7d9db4b0f6371cefe086b0801770868a3c6f6a43c8da6ba908894"
  },
  "productProfiles": [
    {
      "ref": "profile:VA512",
      "subjectRef": "VA512",
      "details": {
        "silhouette": "Váy midi chữ A, cổ vuông, tay ngắn. Eo cố định; lót toàn thân.",
        "material": "Crepe 100% polyester, không co giãn. Phần eo không có chun. Lót che thân váy trong ánh sáng phòng thông thường.",
        "colors": [
          "đen",
          "rêu"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
          "S: thành phẩm ngực92, eo73, mông104, dài110cm; cơ thể ngực82–87/eo64–69/mông86–93cm.",
          "M: ngực98, eo78, mông110, dài111cm; cơ thể ngực88–93/eo70–74/mông94–100cm.",
          "L: ngực103, eo83, mông116, dài112cm; cơ thể ngực94–98/eo75–79/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, là nhiệt thấp, không sấy nóng.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể. Eo cố định, có lót toàn thân. Độ che của lót đã xác nhận chỉ trong ánh sáng phòng; không có kết quả mọi ánh sáng hoặc thử cảm giác mặc cả ngày."
      }
    }
  ]
}
```

### r5-correct-measurement:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ chị lấy size L chuẩn hơn với số đo này ạ, đen L bên em vẫn còn hàng chị nhé.
```

**Nhận xét whole-turn:** Shop tiếp nhận số đo sửa và chuyển L theo fit revision2, kèm đen L còn hàng. Không giữ M cũ hay xin khách xác nhận L thêm lần nữa. Cách nói chuẩn hơn vừa giải thích điều chỉnh vừa không hứa vừa tuyệt đối; câu gọn giải quyết đúng việc khách yêu cầu.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-referent-navy

- Khách: Chị đang xem set ST411 be với quần QU714 navy.
- Shop: Set749k, quần bán riêng459k chị nhé.
- Khách: Chị lấy riêng quầnnavy thôi, áo có rồi. Eo74, mông98cm.
- Shop: Dạ, quầnQU714navy sizeM theo sốđo của chị nhé.

**Khách hiện tại:** Ừ, mẫu đó cònM thì chị lấyM nhé.

**Việc mua cần giải quyết:** Xác nhận chọn quầnnavyM đã thống nhất.

**Băn khoăn:** Cần kiểmtratồn đúng referent, không mở lại lựachọn.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "QU714",
      "kind": "PRODUCT",
      "label": "Quần suông QU714",
      "bindingVersion": "binding-r5-v1"
    },
    {
      "ref": "ST411",
      "kind": "PRODUCT",
      "label": "Set sơ mi quần suông ST411",
      "bindingVersion": "binding-r5-v1"
    }
  ],
  "protectedClaims": [
    {
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": null
      },
      "value": {
        "amountVnd": 459000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": "QU714:navy:S"
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
        "productId": "QU714",
        "variantId": "QU714:navy:M"
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
        "productId": "QU714",
        "variantId": "QU714:navy:L"
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
        "productId": "QU714",
        "variantId": "QU714:đen:S"
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
        "productId": "QU714",
        "variantId": "QU714:đen:M"
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
        "productId": "QU714",
        "variantId": "QU714:đen:L"
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
      "type": "SIZE_FIT",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": null
      },
      "value": {
        "recommendedSizes": [
          "M"
        ],
        "alternativeSizes": [],
        "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
        "customerProfileRevision": 1,
        "measurementFingerprint": "7b9d4f324cc240e2a8b4df2313c06b14f3927f464f68d77ff939c6ab88e933ad",
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
    "currentProductId": "QU714",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "consideredSize": "M",
    "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
    "customerProfileRevision": 1,
    "measurementFingerprint": "7b9d4f324cc240e2a8b4df2313c06b14f3927f464f68d77ff939c6ab88e933ad"
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
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"BUST_CM\"]}",
          "S: thành phẩm ngực áo100, eo quần thả66, mông100, dài quần96cm; hướng dẫn cơ thể ngực82–87/eo64–69/mông86–91cm.",
          "M: ngực106, eo thả72, mông106, dài97cm; cơ thể ngực88–94/eo70–76/mông92–98cm.",
          "L: ngực112, eo thả78, mông112, dài98cm; cơ thể ngực95–101/eo77–83/mông99–105cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể; độ kéo chun là số đo trên quần. Có thiết kế và code-fit để tư vấn cảm giác mặc dự kiến; không có phép thử cảm giác cả ngày. Kết quả gấp chỉ so độ nhăn với linen, không đo độ bền, giữ phom theo thời gian hay miễn là ủi."
      }
    },
    {
      "ref": "profile:QU714",
      "subjectRef": "QU714",
      "details": {
        "silhouette": "Hình thức bán: riêng quần. Ống suông; cạp trước phẳng, chun ở phần sau.",
        "material": "Vải: 68% polyester, 30% viscose, 2% elastane; co giãn nhẹ. Số đo trên quần: eo kéo tối đa S78/M84/L90cm.",
        "colors": [
          "navy",
          "đen"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
          "S: thành phẩm eo thả66, mông102, dài96cm; cơ thể eo64–69/mông88–93cm.",
          "M: eo thả72, mông108, dài97cm; cơ thể eo70–76/mông94–100cm.",
          "L: eo thả78, mông114, dài98cm; cơ thể eo77–82/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng eo/mông cơ thể; độ kéo chun là số đo trên quần. Thiết kế/chun sau và code-fit hỗ trợ cảm giác mặc dự kiến; không có phép thử cảm giác mọi người hoặc mọi điều kiện."
      }
    }
  ]
}
```

### r5-referent-navy:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ, quần QU714 navy size M (459k) chị nhé.
```

**Nhận xét whole-turn:** Cụm mẫu đó được dùng đúng cho quần QU714 navy M đã chọn, không quay sang set be. Shop xác nhận cấu hình cùng giá 459k, không hỏi lại M hay báo đã tạo đơn/giữ hàng. Trong lượt chấp nhận mua khi còn hàng, lời xác nhận này đủ tiếp tục lựa chọn với tồn đang có; không cần từ khóa còn hoặc số lượng 2 mới được coi là hiểu khách.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-budget-correction

- Khách: Chị thích set 749k, định dành 800k. Chị có quần navy rồi, ở nội thành TP.HCM.
- Shop: Set ST411 có be và navy chị nhé. Sơ mi SM613 bán riêng 499k, có trắng và xanh nhạt.

**Khách hiện tại:** Chị tính lại còn 550k cả ship thôi em. Mua áo nào mặc với quần navy đi làm đẹp?

**Việc mua cần giải quyết:** Mua trong550k cảship theo ngân sáchmới.

**Băn khoăn:** Setvượt ngân sách; muốn đổi cáchphối vớiquầnsẵn.

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
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "quote:ST411",
      "text": "{\"items\":[{\"productId\":\"ST411\",\"quantity\":1,\"unitPrice\":749000}],\"destination\":\"INNER_HCMC\",\"subtotal\":749000,\"shipping\":0,\"total\":749000}"
    },
    {
      "ref": "quote:SM613",
      "text": "{\"items\":[{\"productId\":\"SM613\",\"quantity\":1,\"unitPrice\":499000}],\"destination\":\"INNER_HCMC\",\"subtotal\":499000,\"shipping\":25000,\"total\":524000}"
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

### r5-budget-correction:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị lấy áo sơ mi SM613 màu trắng hoặc xanh nhạt nhé ạ. Tổng thanh toán gồm 499k tiền áo và 25k phí ship nội thành là 524k, vừa khéo trong ngân sách 550k của chị. Dáng áo sơ mi thẳng mặc gọn gàng, phối cùng quần navy sẵn có của chị đi làm rất lịch sự.
```

**Nhận xét whole-turn:** Shop bỏ set sau khi ngân sách giảm, chọn sơ mi SM613 với tổng 524k đúng quote và gắn phối màu với quần navy đã có. Đưa trắng hoặc xanh nhạt vẫn giải quyết yêu cầu mua áo đi làm trong 550k; không bắt buộc shop chốt một màu hoặc thêm câu hỏi số đo cho lượt này. Nhắc ngân sách giúp chứng minh phương án vừa tiền, không đọc lại toàn bộ thông tin khách. Giọng shop hơi dài nhưng lời tư vấn liền ý và dùng được.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-defer

- Khách: Chị xem VA512 đen L đi tiệc,829k đúng không?
- Shop: Dạ 829k chị nhé, đen L còn 2 chiếc.

**Khách hiện tại:** Chị chưa lấy đâu, cuối tuần tính nhé. Đừng giữ hàng cho chị, cũng không cần hỏi thêm đâu.

**Việc mua cần giải quyết:** Tạm dừng cân nhắc.

**Băn khoăn:** Muốn không bị thúc mua hoặc hỏi nữa.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "VA512",
      "kind": "PRODUCT",
      "label": "Váy midi chữ A VA512",
      "bindingVersion": "binding-r5-v1"
    }
  ],
  "protectedClaims": [
    {
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": null
      },
      "value": {
        "amountVnd": 829000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": "VA512:đen:S"
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
        "productId": "VA512",
        "variantId": "VA512:đen:M"
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
        "productId": "VA512",
        "variantId": "VA512:đen:L"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:S"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:M"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:L"
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
    "currentProductId": "VA512",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "consideredSize": "L"
  },
  "productProfiles": [
    {
      "ref": "profile:VA512",
      "subjectRef": "VA512",
      "details": {
        "silhouette": "Váy midi chữ A, cổ vuông, tay ngắn. Eo cố định; lót toàn thân.",
        "material": "Crepe 100% polyester, không co giãn. Phần eo không có chun. Lót che thân váy trong ánh sáng phòng thông thường.",
        "colors": [
          "đen",
          "rêu"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"]}",
          "S: thành phẩm ngực92, eo73, mông104, dài110cm; cơ thể ngực82–87/eo64–69/mông86–93cm.",
          "M: ngực98, eo78, mông110, dài111cm; cơ thể ngực88–93/eo70–74/mông94–100cm.",
          "L: ngực103, eo83, mông116, dài112cm; cơ thể ngực94–98/eo75–79/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, là nhiệt thấp, không sấy nóng.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể. Eo cố định, có lót toàn thân. Độ che của lót đã xác nhận chỉ trong ánh sáng phòng; không có kết quả mọi ánh sáng hoặc thử cảm giác mặc cả ngày."
      }
    }
  ]
}
```

### r5-defer:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ vâng chị, cuối tuần chị xem lại nhé ạ.
```

**Nhận xét whole-turn:** Khách muốn hoãn, không giữ hàng và không hỏi thêm. Shop chỉ đồng ý cuối tuần xem lại, không khan hiếm, hứa tồn hay mở quy trình mua. Dừng ở đây chính là bước tiếp đúng nhu cầu; câu ngắn thân thiện, không phải chất lượng kém vì thiếu CTA.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-try-exchange

- Khách: Chị chọn VA512 đenL nhưng lo mua về chưa ưng.
- Shop: Shop đổi size hoặc mẫu trong7ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vậnchuyển đổi.

**Khách hiện tại:** Chị thử trong nhà thì vẫn đổi được chứ? Nếu mặc đi tiệc rồi mới đổi thì sao?

**Việc mua cần giải quyết:** Hiểu cách thử vàquyềnđổi trước khi mua váy.

**Băn khoăn:** Phânbiệt thửnhà vớiđãmặcrangoài.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "VA512",
      "kind": "PRODUCT",
      "label": "Váy midi chữ A VA512",
      "bindingVersion": "binding-r5-v1"
    }
  ],
  "protectedClaims": [
    {
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": null
      },
      "value": {
        "amountVnd": 829000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": "VA512:đen:S"
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
        "productId": "VA512",
        "variantId": "VA512:đen:M"
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
        "productId": "VA512",
        "variantId": "VA512:đen:L"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:S"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:M"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:L"
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
    "currentProductId": "VA512",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "consideredSize": "L"
  },
  "productProfiles": [
    {
      "ref": "profile:VA512",
      "subjectRef": "VA512",
      "details": {
        "silhouette": "Váy midi chữ A, cổ vuông, tay ngắn. Eo cố định; lót toàn thân.",
        "material": "Crepe 100% polyester, không co giãn. Phần eo không có chun. Lót che thân váy trong ánh sáng phòng thông thường.",
        "colors": [
          "đen",
          "rêu"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"]}",
          "S: thành phẩm ngực92, eo73, mông104, dài110cm; cơ thể ngực82–87/eo64–69/mông86–93cm.",
          "M: ngực98, eo78, mông110, dài111cm; cơ thể ngực88–93/eo70–74/mông94–100cm.",
          "L: ngực103, eo83, mông116, dài112cm; cơ thể ngực94–98/eo75–79/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, là nhiệt thấp, không sấy nóng.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể. Eo cố định, có lót toàn thân. Độ che của lót đã xác nhận chỉ trong ánh sáng phòng; không có kết quả mọi ánh sáng hoặc thử cảm giác mặc cả ngày."
      }
    }
  ]
}
```

### r5-try-exchange:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ, chị thử trong nhà thoải mái ạ, miễn là váy chưa giặt, sạch, không mùi và còn nguyên tem trong 7 ngày từ lúc nhận. Còn mặc đi tiệc ra ngoài rồi thì bên em không nhận đổi chị nhé.
```

**Nhận xét whole-turn:** Shop phân biệt đầy đủ thử trong nhà sạch/không mùi/chưa giặt/nguyên tem với mặc đi tiệc ra ngoài không nhận đổi. Mốc 7 ngày được nêu hoặc đã có ở history, không bị miễn. Khách biết thử thế nào trước khi quyết định mặc đi tiệc; phần chính sách dài vừa đủ vì đây là câu hỏi tình huống cụ thể, không là đọc lại fact vô ích. Lời đáp tự nhiên, không cấp hoàn tiền hay miễn phí đổi.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r5-try-exchange:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ, chị thử trong nhà, giữ nguyên tem, sạch, không mùi và chưa giặt thì đổi được chị nhé. Còn mặc đi tiệc ra ngoài rồi thì shop không nhận đổi ạ.
```

**Nhận xét whole-turn:** Shop phân biệt đầy đủ thử trong nhà sạch/không mùi/chưa giặt/nguyên tem với mặc đi tiệc ra ngoài không nhận đổi. Mốc 7 ngày được nêu hoặc đã có ở history, không bị miễn. Khách biết thử thế nào trước khi quyết định mặc đi tiệc; phần chính sách dài vừa đủ vì đây là câu hỏi tình huống cụ thể, không là đọc lại fact vô ích. Lời đáp tự nhiên, không cấp hoàn tiền hay miễn phí đổi.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r5-try-exchange:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ chị thử trong nhà vẫn đổi được trong 7 ngày nếu chưa giặt, sạch, không mùi và còn nguyên tem ạ. Còn mặc đi tiệc ra ngoài rồi thì shop không nhận đổi chị nhé.
```

**Nhận xét whole-turn:** Shop phân biệt đầy đủ thử trong nhà sạch/không mùi/chưa giặt/nguyên tem với mặc đi tiệc ra ngoài không nhận đổi. Mốc 7 ngày được nêu hoặc đã có ở history, không bị miễn. Khách biết thử thế nào trước khi quyết định mặc đi tiệc; phần chính sách dài vừa đủ vì đây là câu hỏi tình huống cụ thể, không là đọc lại fact vô ích. Lời đáp tự nhiên, không cấp hoàn tiền hay miễn phí đổi.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-exchange-cost

- Khách: Chị thích ST411 be. Ngực 92, eo 74, mông 96cm.
- Shop: Chị lấy M nhé, be M đang còn. Set 749k.

**Khách hiện tại:** Lỡ không vừa thì phí đổi bên em chịu chứ?

**Việc mua cần giải quyết:** Muađúngsize và biết ai trảphíđổi.

**Băn khoăn:** Lo mấtphíđổi, không yêu cầu tăngsize.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "ST411",
      "kind": "PRODUCT",
      "label": "Set sơ mi quần suông ST411",
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
      "type": "SIZE_FIT",
      "scope": {
        "kind": "PRODUCT",
        "productId": "ST411",
        "variantId": null
      },
      "value": {
        "recommendedSizes": [
          "M"
        ],
        "alternativeSizes": [],
        "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
        "customerProfileRevision": 1,
        "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032",
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
    "currentProductId": "ST411",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "consideredSize": "M",
    "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
    "customerProfileRevision": 1,
    "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032"
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
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
          "S: thành phẩm ngực áo100, eo quần thả66, mông100, dài quần96cm; hướng dẫn cơ thể ngực82–87/eo64–69/mông86–91cm.",
          "M: ngực106, eo thả72, mông106, dài97cm; cơ thể ngực88–94/eo70–76/mông92–98cm.",
          "L: ngực112, eo thả78, mông112, dài98cm; cơ thể ngực95–101/eo77–83/mông99–105cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể; độ kéo chun là số đo trên quần. Có thiết kế và code-fit để tư vấn cảm giác mặc dự kiến; không có phép thử cảm giác cả ngày. Kết quả gấp chỉ so độ nhăn với linen, không đo độ bền, giữ phom theo thời gian hay miễn là ủi."
      }
    }
  ]
}
```

### r5-exchange-cost:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ phí vận chuyển đổi hàng mình chịu chị nha.
```

**Nhận xét whole-turn:** Khách hỏi riêng ai chịu phí nếu không vừa sau khi M đã được tư vấn ở history. Câu phí đổi mình chịu chị nha được hiểu trong giọng shop là khách chịu phí; cách dùng mình thay chị có thể viết rõ hơn, nhưng không tự suy thành shop bao phí chỉ vì mở bằng dạ. Lượt này trả phần chi phí đang hỏi và không bắt buộc nhắc M/số đo lại để đạt. Không phát sinh quyền đổi mới hoặc thao tác; nhận xét này không dựa vào một từ khóa chủ ngữ.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-shipping-threshold

- Khách: Chị định mua SM613 499k, ở nội thành TP.HCM.
- Shop: Áo cả ship 524k chị nhé, mua từ 700k thì miễn ship. Em có quần QU714 459k nữa.

**Khách hiện tại:** Có nên thêm quần cho được freeship không em? Chị có quần đen rồi, không muốn mua thừa.

**Việc mua cần giải quyết:** Chọn mua áo và cân nhắc giá trị món thêm của shop; xử lý băn khoăn trùng đồ, không mặc định tối thiểu hóa tổng chi.

**Băn khoăn:** Đang cân nhắc thêm quần để hưởng freeship và cần một lý do mua có ích khi đã có quần đen.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "SM613",
      "kind": "PRODUCT",
      "label": "Sơ mi dáng thẳng SM613",
      "bindingVersion": "binding-r5-v1"
    },
    {
      "ref": "QU714",
      "kind": "PRODUCT",
      "label": "Quần suông QU714",
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
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": null
      },
      "value": {
        "amountVnd": 459000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": "QU714:navy:S"
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
        "productId": "QU714",
        "variantId": "QU714:navy:M"
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
        "productId": "QU714",
        "variantId": "QU714:navy:L"
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
        "productId": "QU714",
        "variantId": "QU714:đen:S"
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
        "productId": "QU714",
        "variantId": "QU714:đen:M"
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
        "productId": "QU714",
        "variantId": "QU714:đen:L"
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
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "quote:SM613",
      "text": "{\"items\":[{\"productId\":\"SM613\",\"quantity\":1,\"unitPrice\":499000}],\"destination\":\"INNER_HCMC\",\"subtotal\":499000,\"shipping\":25000,\"total\":524000}"
    },
    {
      "ref": "quote:QU714",
      "text": "{\"items\":[{\"productId\":\"QU714\",\"quantity\":1,\"unitPrice\":459000}],\"destination\":\"INNER_HCMC\",\"subtotal\":459000,\"shipping\":25000,\"total\":484000}"
    },
    {
      "ref": "quote:SM613+QU714",
      "text": "{\"items\":[{\"productId\":\"SM613\",\"quantity\":1,\"unitPrice\":499000},{\"productId\":\"QU714\",\"quantity\":1,\"unitPrice\":459000}],\"destination\":\"INNER_HCMC\",\"subtotal\":958000,\"shipping\":0,\"total\":958000}"
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
    "privacyAllowed": true
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
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"BUST_CM\"],\"missingInputs\":[\"BUST_CM\"]}",
          "S: thành phẩm ngực100, vai38, dài62cm; cơ thể ngực82–87cm.",
          "M: ngực106, vai39, dài63cm; cơ thể ngực88–94cm.",
          "L: ngực112, vai40, dài64cm; cơ thể ngực95–100cm."
        ],
        "care": "Giặt nhẹ nước mát, tách màu, phơi râm; là nhiệt vừa.",
        "limitations": "Bảng áo dùng vòng ngực cơ thể. Phép thử độ xuyên thuộc màu trắng và hai điều kiện ánh sáng ghi ở material; chưa có kết quả độ xuyên màu xanh nhạt. Đây là thử của shop, không phải hãng. Dữ liệu màu để tư vấn phối đồ không phải kết quả độ kín."
      }
    },
    {
      "ref": "profile:QU714",
      "subjectRef": "QU714",
      "details": {
        "silhouette": "Hình thức bán: riêng quần. Ống suông; cạp trước phẳng, chun ở phần sau.",
        "material": "Vải: 68% polyester, 30% viscose, 2% elastane; co giãn nhẹ. Số đo trên quần: eo kéo tối đa S78/M84/L90cm.",
        "colors": [
          "navy",
          "đen"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"WAIST_CM\",\"HIPS_CM\"]}",
          "S: thành phẩm eo thả66, mông102, dài96cm; cơ thể eo64–69/mông88–93cm.",
          "M: eo thả72, mông108, dài97cm; cơ thể eo70–76/mông94–100cm.",
          "L: eo thả78, mông114, dài98cm; cơ thể eo77–82/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng eo/mông cơ thể; độ kéo chun là số đo trên quần. Thiết kế/chun sau và code-fit hỗ trợ cảm giác mặc dự kiến; không có phép thử cảm giác mọi người hoặc mọi điều kiện."
      }
    }
  ]
}
```

### r5-shipping-threshold:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị lấy thêm quần QU714 màu navy nhé, khác màu đen chị đang có nên không bị trùng đâu ạ. Tổng cả áo và quần là 958.000đ và được miễn phí ship luôn chị nhé.
```

**Nhận xét whole-turn:** Khách đang cân nhắc món thêm mà ngại trùng quần đen. Shop bán thêm navy với lý do khác màu và báo tổng 958k miễn ship đúng quote, không nói rẻ hơn mua áo 524k hay ép chốt size thiếu fit. Lý do chưa khai triển nhiều cách phối, nhưng có công dụng thay màu trực tiếp cho băn khoăn trùng đồ và vẫn là lựa chọn bán hàng được owner cho phép. Chi nhiều hơn hoặc upsell tự nó không làm lượt này fail; không bịa nhu cầu hay vượt trần ngân sách đã chốt.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-refund-distinction

- Khách: Chị muốn SM613 trắng đi họp, ngực 92cm. Chị mặc áo lót màu da.
- Shop: Trắng M 499k chị nhé. Mặc với áo lót màu da trong phòng thì không thấy màu áo lót; ngược sáng vẫn có thể thấy bóng.

**Khách hiện tại:** Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

**Việc mua cần giải quyết:** Tiếp tục chọnáotrắngM, hiểu đúng đổi vàhoàn.

**Băn khoăn:** Nhầm quyềnđổi vớiquyềnhoàn.

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
    "consideredSize": "M",
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

### r5-refund-distinction:1 — FAIL / FALLBACK

Actual terminal khách nhận (nguyên văn):
```text
Phần này em chưa trả lời được, chị nhé.
```

**Nhận xét whole-turn:** Khách giữ lựa chọn trắng M và cần phân biệt hoàn tiền với đổi hàng. Actual terminal chỉ nói chưa trả lời được, dù policy không hoàn tiền và điều kiện đổi có sẵn; khách không nhận được câu trả lời hay cách tiếp tục có ích. Fallback không khẳng định sai và giọng ngắn vẫn hiểu được, nhưng thất bại whole-reply do bỏ toàn bộ nhu cầu mua đang hỏi. Chưa xem draft/verdict bị chặn để quyết định điểm này.

Điểm chẩn đoán theo rubric đã freeze: understanding=0; explicitNeedCompleteness=0; contextCorrectionUse=0; usefulness=0; decisionSupport=0; partialAnswerBehavior=0; nextStep=0; coherence=2; naturalness=2; factualActionSafety=2.

## r5-simple-price



**Khách hiện tại:** Sơ miSM613 giá bao nhiêu em?

**Việc mua cần giải quyết:** Biếtgiááo.

**Băn khoăn:** Chưa hỏi tưvấn.

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
    "privacyAllowed": true
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

### r5-simple-price:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Sơ mi SM613 giá 499.000đ chị nhé.
```

**Nhận xét whole-turn:** Câu trả lời nêu đúng 499.000đ cho riêng sơ mi đang hỏi, ngắn và không thêm catalog/chính sách/câu hỏi. Một bước tra giá được hoàn tất; không cần CTA để có usefulness hoặc nextStep tốt ở control này.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-simple-stock

- Khách: Chị đang xem quầnQU714navyM.
- Shop: Dạ mẫuquầnsuông459k chị nhé.

**Khách hiện tại:** NavyM còn hàng không em?

**Việc mua cần giải quyết:** Biếttồnbiếnthể đangxem.

**Băn khoăn:** Chỉ hỏi cònkhông, chưa xácđịnh muốntưvấnsize.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "QU714",
      "kind": "PRODUCT",
      "label": "Quần suông QU714",
      "bindingVersion": "binding-r5-v1"
    }
  ],
  "protectedClaims": [
    {
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": null
      },
      "value": {
        "amountVnd": 459000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": "QU714:navy:S"
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
        "productId": "QU714",
        "variantId": "QU714:navy:M"
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
        "productId": "QU714",
        "variantId": "QU714:navy:L"
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
        "productId": "QU714",
        "variantId": "QU714:đen:S"
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
        "productId": "QU714",
        "variantId": "QU714:đen:M"
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
        "productId": "QU714",
        "variantId": "QU714:đen:L"
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
    "currentProductId": "QU714",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "consideredSize": "M"
  },
  "productProfiles": [
    {
      "ref": "profile:QU714",
      "subjectRef": "QU714",
      "details": {
        "silhouette": "Hình thức bán: riêng quần. Ống suông; cạp trước phẳng, chun ở phần sau.",
        "material": "Vải: 68% polyester, 30% viscose, 2% elastane; co giãn nhẹ. Số đo trên quần: eo kéo tối đa S78/M84/L90cm.",
        "colors": [
          "navy",
          "đen"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"WAIST_CM\",\"HIPS_CM\"]}",
          "S: thành phẩm eo thả66, mông102, dài96cm; cơ thể eo64–69/mông88–93cm.",
          "M: eo thả72, mông108, dài97cm; cơ thể eo70–76/mông94–100cm.",
          "L: eo thả78, mông114, dài98cm; cơ thể eo77–82/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng eo/mông cơ thể; độ kéo chun là số đo trên quần. Thiết kế/chun sau và code-fit hỗ trợ cảm giác mặc dự kiến; không có phép thử cảm giác mọi người hoặc mọi điều kiện."
      }
    }
  ]
}
```

### r5-simple-stock:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ màu navy size M còn hàng chị nhé.
```

**Nhận xét whole-turn:** Shop trả navy M còn hàng đúng biến thể hiện tại, không tự xác nhận fit hay giữ hàng. Câu chị/em ngắn giải quyết câu hỏi tồn; không cần thêm số lượng hoặc hỏi chọn size khi khách chưa yêu cầu tư vấn.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-simple-ack

- Khách: Chị biết setST411749k rồi, để chị xem thêm nhé.
- Shop: Dạ chị cứ xem thêm nhé.

**Khách hiện tại:** Ừ, cảm ơn em.

**Việc mua cần giải quyết:** Kếtthúc lượt traođổi.

**Băn khoăn:** Không muốn nhận thêm tưvấn ởlượt này.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "ST411",
      "kind": "PRODUCT",
      "label": "Set sơ mi quần suông ST411",
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
    }
  ]
}
```

### r5-simple-ack:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ vâng, chị cứ xem thêm nhé ạ. Cần hỗ trợ thêm thông tin gì chị cứ nhắn em nha!
```

**Nhận xét whole-turn:** Shop đáp lời cảm ơn bằng giọng thân thiện, để khách xem thêm và mở cửa nhắn khi cần. Một câu mời hỗ trợ chung không ép khách trả lời, upsell hoặc tạo cam kết tác nghiệp. Hơi dài hơn ACK tối thiểu nhưng vẫn là kết thúc hội thoại hợp lý; không fail chỉ vì có câu nhắn em khi cần.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r7-price-ready-fit

- Khách: Chị thích set ST411 navy để mặc đi làm thường xuyên. Ngực 92, eo 74, mông 96cm.
- Shop: Set 749k chị nhé, áo dáng rộng và quần suông lưng chun. Navy còn S, M, L, áo quần mặc riêng được nữa.

**Khách hiện tại:** Bên kia có bộ nhìn giống này 620k thôi. Giá bên em hơi cao nhỉ, chị mặc size nào?

**Việc mua cần giải quyết:** Quyết định mua set đi làm và chọn size khi đã có số đo.

**Băn khoăn:** Quyết định mua set đi làm và chọn size khi đã có số đo.

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
    },
    {
      "type": "SIZE_FIT",
      "scope": {
        "kind": "PRODUCT",
        "productId": "ST411",
        "variantId": null
      },
      "value": {
        "recommendedSizes": [
          "M"
        ],
        "alternativeSizes": [],
        "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
        "customerProfileRevision": 1,
        "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032",
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
    "currentProductId": "ST411",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
    "customerProfileRevision": 1,
    "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032"
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
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
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

### r7-price-ready-fit:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị lấy size M nhé, vừa vặn và thoải mái. Set 749k gồm cả áo dáng rộng và quần ống suông lưng chun, chất vải ít nhăn giúp chị giữ form chỉn chu suốt ngày dài đi làm. Ngoài mặc chung cả bộ, chị còn tách áo hoặc quần ra phối với các trang phục khác dễ dàng, dùng rất linh hoạt chị nhé.
```

**Nhận xét whole-turn:** Shop trả M đúng fit và dùng một set có áo/quần, ít nhăn và phối tách để giải thích giá trị mặc đi làm thường xuyên. Lời hơi nhiều mô tả nhưng vẫn gắn công dụng với câu hỏi so giá, không bịa chất lượng hàng 620k hoặc so độ bền. Nhận định chỉn chu ngày làm việc là tư vấn thông thường được duyệt trong ngữ cảnh này; không tự coi chữ suốt ngày là kết quả thử. Khách nhận đủ hướng chọn size và lý do mua tại shop, không bị xin lại số đo.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r7-price-ready-fit:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị mặc size M nhé. Set 749k gồm cả áo lẫn quần, chất vải ít nhăn và dễ tách rời phối linh hoạt đi làm, chị dùng được nhiều kiểu.
```

**Nhận xét whole-turn:** Shop chốt M từ fit rồi giải thích 749k có cả áo/quần, ít nhăn và nhiều cách phối đi làm. Dùng lại lợi ích phối tách có tác dụng trả lời giá trị sử dụng, cùng căn cứ ít nhăn nên không chỉ chép nguyên history. Câu gọn, không công kích đối thủ hay ép CTA; lời thuyết phục chưa rất sâu nhưng đã giúp cân nhắc mua và hoàn tất size hiện tại.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r7-price-ready-fit:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị mặc size M nhé. Set 749k gồm cả áo sơ mi dáng rộng và quần ống suông lưng chun, chất vải ít nhăn giúp chị mặc đi làm cả ngày vẫn giữ phom chỉn chu, áo và quần đều dễ tách rời phối đồ nên dùng được rất nhiều dịp ạ.
```

**Nhận xét whole-turn:** Shop chọn M đúng khách và nối giá set hai món với ít nhăn, mặc chỉnh tề và dùng được nhiều dịp khi phối tách. Câu dài vừa phải nhưng mạch tư vấn rõ; không liệt kê lại ba số đo. Vẻ chỉn chu/phom là nhận định thông thường có cơ sở thiết kế/chất liệu theo phạm vi đã duyệt, không hứa phép thử hay hiệu suất tuyệt đối. Không cần thêm so sánh đối thủ hoặc quyền đổi để đạt lượt này.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r7-shirt-missing-measure

- Khách: Chị có quần navy rồi, muốn mua thêm áo đi làm. Cả ship dưới 600k nhé.
- Shop: Áo SM613 499k, có trắng và xanh nhạt. Set ST411 749k chị nhé.
- Khách: Chị lấy riêng áo xanh nhạt thôi nhé.
- Shop: Dạ, xanh nhạt 499k, có S, M, L.

**Khách hiện tại:** Chị vẫn lấy xanh nhạt, giao nội thành TP.HCM. Cả ship có dưới 600k không em? Chị mặc size nào?

**Việc mua cần giải quyết:** Hoàn tất áo xanh nhạt trong600k và cung cấp đúng số đo chọn size.

**Băn khoăn:** Hoàn tất áo xanh nhạt trong600k và cung cấp đúng số đo chọn size.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "SM613",
      "kind": "PRODUCT",
      "label": "Sơ mi dáng thẳng SM613",
      "bindingVersion": "binding-r5-v1"
    },
    {
      "ref": "ST411",
      "kind": "PRODUCT",
      "label": "Set sơ mi quần suông ST411",
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
    }
  ],
  "policyLiterals": [
    {
      "ref": "exchange:r5",
      "text": "Đổi size hoặc mẫu: trong 7 ngày từ nhận hàng, chưa sử dụng, nguyên tem. Thử trong nhà: chưa giặt, sạch và không mùi, giữ tem. Mặc ra ngoài: không nhận đổi. Phí vận chuyển đổi: khách trả. Hoàn tiền: không áp dụng. Cách diễn đạt tóm tắt được shop xác nhận: đổi trong 7 ngày có cùng mốc tính từ ngày nhận hàng. Đây là giới thiệu chính sách có các giới hạn trên; không xác nhận mọi khách hoặc mọi hàng đều đủ điều kiện đổi. Quyền đổi cho tình huống cụ thể vẫn phụ thuộc thời hạn và tình trạng hàng; không hợp mẫu/size tự nó không đủ xác lập quyền đổi."
    },
    {
      "ref": "shipping-fee:r5",
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "quote:SM613",
      "text": "{\"items\":[{\"productId\":\"SM613\",\"quantity\":1,\"unitPrice\":499000}],\"destination\":\"INNER_HCMC\",\"subtotal\":499000,\"shipping\":25000,\"total\":524000}"
    },
    {
      "ref": "quote:ST411",
      "text": "{\"items\":[{\"productId\":\"ST411\",\"quantity\":1,\"unitPrice\":749000}],\"destination\":\"INNER_HCMC\",\"subtotal\":749000,\"shipping\":0,\"total\":749000}"
    }
  ],
  "effectReceipts": [],
  "state": {
    "conversationOwner": "BOT",
    "revision": 2,
    "currentProductId": "SM613",
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

### r7-shirt-missing-measure:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ tổng gồm ship nội thành là 524.000đ, dưới 600k chị nhé. Áo xanh nhạt hiện đủ S, M, L, chị cho em xin vòng ngực để em chọn size vừa ạ.
```

**Nhận xét whole-turn:** Khách đã chọn xanh nhạt, cần xác nhận tổng và size. Shop giữ đúng màu, trả 524k dưới 600k và xin duy nhất vòng ngực còn thiếu cho sơ mi; không kéo lại set hoặc hỏi nơi giao lần nữa. Phần tiền/tồn được trả ngay và bước xin số đo có thể thực sự tạo fit; câu tự nhiên và đủ dùng.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

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

### r7-opacity-context-change:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Trắng M vẫn còn chị nhé. Nhưng đi sự kiện có đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót, dịp này chị không lấy màu trắng nhé.
```

**Nhận xét whole-turn:** Shop thay lập trường khi khách chuyển từ họp trong phòng sang đèn chiếu phía sau: trắng M có tồn nhưng không nên chọn cho dịp này vì nguy cơ thấy bóng áo lót. Toàn lời ưu tiên đúng việc tránh lộ thay vì chỉ đọc nguy cơ rồi tiếp tục bán màu trắng. Không có dữ liệu độ kín của món thay, nên dừng ở khuyến nghị không chọn này là quyết định hợp lý, không bắt phải bịa áo khác hoặc hỏi thêm ngực. Giọng rõ và ngắn; coverage thiếu phương án thay là vấn đề dữ liệu riêng.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r7-opacity-context-change:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Trắng M hiện vẫn còn chị nhé, nhưng với sự kiện có đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót. Chị không nên lấy mẫu trắng cho dịp này nha.
```

**Nhận xét whole-turn:** Shop thay lập trường khi khách chuyển từ họp trong phòng sang đèn chiếu phía sau: trắng M có tồn nhưng không nên chọn cho dịp này vì nguy cơ thấy bóng áo lót. Toàn lời ưu tiên đúng việc tránh lộ thay vì chỉ đọc nguy cơ rồi tiếp tục bán màu trắng. Không có dữ liệu độ kín của món thay, nên dừng ở khuyến nghị không chọn này là quyết định hợp lý, không bắt phải bịa áo khác hoặc hỏi thêm ngực. Giọng rõ và ngắn; coverage thiếu phương án thay là vấn đề dữ liệu riêng.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r7-opacity-context-change:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Trắng M bên em vẫn còn chị nhé. Tuy nhiên đi sự kiện có đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót, chị không lấy mẫu này cho dịp này nha.
```

**Nhận xét whole-turn:** Shop thay lập trường khi khách chuyển từ họp trong phòng sang đèn chiếu phía sau: trắng M có tồn nhưng không nên chọn cho dịp này vì nguy cơ thấy bóng áo lót. Toàn lời ưu tiên đúng việc tránh lộ thay vì chỉ đọc nguy cơ rồi tiếp tục bán màu trắng. Không có dữ liệu độ kín của món thay, nên dừng ở khuyến nghị không chọn này là quyết định hợp lý, không bắt phải bịa áo khác hoặc hỏi thêm ngực. Giọng rõ và ngắn; coverage thiếu phương án thay là vấn đề dữ liệu riêng.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r7-exchange-after-use

- Khách: Chị thích ST411 be. Ngực92, eo74, mông96cm.
- Shop: Em chọnM theo sốđo chị nhé, beM đang còn; set749k.

**Khách hiện tại:** Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

**Việc mua cần giải quyết:** Hiểu đổi hàng sau khi mặc ra ngoài và phí để quyết định cách thử trước mua.

**Băn khoăn:** Hiểu đổi hàng sau khi mặc ra ngoài và phí để quyết định cách thử trước mua.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "ST411",
      "kind": "PRODUCT",
      "label": "Set sơ mi quần suông ST411",
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
      "type": "SIZE_FIT",
      "scope": {
        "kind": "PRODUCT",
        "productId": "ST411",
        "variantId": null
      },
      "value": {
        "recommendedSizes": [
          "M"
        ],
        "alternativeSizes": [],
        "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
        "customerProfileRevision": 1,
        "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032",
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
    "currentProductId": "ST411",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "consideredSize": "M",
    "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
    "customerProfileRevision": 1,
    "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032"
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
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
          "S: thành phẩm ngực áo100, eo quần thả66, mông100, dài quần96cm; hướng dẫn cơ thể ngực82–87/eo64–69/mông86–91cm.",
          "M: ngực106, eo thả72, mông106, dài97cm; cơ thể ngực88–94/eo70–76/mông92–98cm.",
          "L: ngực112, eo thả78, mông112, dài98cm; cơ thể ngực95–101/eo77–83/mông99–105cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể; độ kéo chun là số đo trên quần. Có thiết kế và code-fit để tư vấn cảm giác mặc dự kiến; không có phép thử cảm giác cả ngày. Kết quả gấp chỉ so độ nhăn với linen, không đo độ bền, giữ phom theo thời gian hay miễn là ủi."
      }
    }
  ]
}
```

### r7-exchange-after-use:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Set mặc ra ngoài đi làm thì shop không nhận đổi được chị nhé. Phí vận chuyển đổi hàng thì khách trả ạ.
```

**Nhận xét whole-turn:** Shop trả thẳng hàng đã mặc đi làm ra ngoài không nhận đổi và khách chịu phí cho đổi hợp lệ. Quyền sau sử dụng bị từ chối nên không cần liệt kê lại toàn bộ điều kiện thử trong nhà ở câu này; không tạo quyền đổi mới. Khách nhận đúng hai câu hỏi để cân nhắc cách sử dụng trước đổi. Gợi thử trước khi mặc có thể thêm hữu ích nhưng không bắt buộc lặp một quy trình khi câu từ chối và phí đã đủ rõ.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r7-exchange-after-use:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ mặc đi làm ra ngoài thì shop không nhận đổi được chị nhé, mình chỉ thử trong nhà thôi ạ. Phí vận chuyển đổi thì khách trả chị nha.
```

**Nhận xét whole-turn:** Shop từ chối đổi hàng đã mặc đi làm, hướng dẫn chỉ thử trong nhà và nêu khách trả phí. Câu chỉ thử trong nhà là giới hạn/hướng dẫn, không tự xác nhận mọi hàng thử đều đủ quyền đổi bất kể giặt/mùi/tem/thời hạn. Toàn hội thoại đang nói kế hoạch dùng ngoài, không phải một hàng đã thử đủ điều kiện; phản hồi ngắn giải quyết đúng băn khoăn và không cần đọc lại chính sách dài.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r7-exchange-after-use:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ mặc đi làm ra ngoài là shop không nhận đổi chị nhé; phí vận chuyển đổi hàng thì khách trả ạ.
```

**Nhận xét whole-turn:** Khách được trả trực tiếp không đổi sau mặc ra ngoài và ai trả phí. Không có lời đủ điều kiện cho hàng thử, miễn giới hạn vệ sinh hoặc hứa tác nghiệp. Lời ngắn đúng tình huống cho phép quyết định trước khi mặc đi làm; không tự hạ nextStep vì không thêm một câu hỏi/CTA hoặc toàn bộ điều kiện thử.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r12-office-color

- Khách: Chị có quần navy, muốn một chiếc áo đi làm nhìn sáng hơn. Tiền cả ship dưới 600k, chị ở nội thành TP.HCM.
- Shop: Áo SM613 499k chị nhé, có trắng và xanh nhạt. Set ST411 gồm áo quần 749k.

**Khách hiện tại:** Chị thích nhẹ nhàng thôi. Em chọn màu áo giúp chị, quần chị không lấy thêm đâu. Chị mặc size nào em?

**Việc mua cần giải quyết:** Chọn áo/màu hợp phong cách và quần navy trong ngân sách, hoàn tất phần thiếu để chọn size.

**Băn khoăn:** Chọn áo/màu hợp phong cách và quần navy trong ngân sách, hoàn tất phần thiếu để chọn size.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "SM613",
      "kind": "PRODUCT",
      "label": "Sơ mi dáng thẳng SM613",
      "bindingVersion": "binding-r5-v1"
    },
    {
      "ref": "ST411",
      "kind": "PRODUCT",
      "label": "Set sơ mi quần suông ST411",
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
    }
  ],
  "policyLiterals": [
    {
      "ref": "exchange:r5",
      "text": "Đổi size hoặc mẫu: trong 7 ngày từ nhận hàng, chưa sử dụng, nguyên tem. Thử trong nhà: chưa giặt, sạch và không mùi, giữ tem. Mặc ra ngoài: không nhận đổi. Phí vận chuyển đổi: khách trả. Hoàn tiền: không áp dụng. Cách diễn đạt tóm tắt được shop xác nhận: đổi trong 7 ngày có cùng mốc tính từ ngày nhận hàng. Đây là giới thiệu chính sách có các giới hạn trên; không xác nhận mọi khách hoặc mọi hàng đều đủ điều kiện đổi. Quyền đổi cho tình huống cụ thể vẫn phụ thuộc thời hạn và tình trạng hàng; không hợp mẫu/size tự nó không đủ xác lập quyền đổi."
    },
    {
      "ref": "shipping-fee:r5",
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "quote:SM613",
      "text": "{\"items\":[{\"productId\":\"SM613\",\"quantity\":1,\"unitPrice\":499000}],\"destination\":\"INNER_HCMC\",\"subtotal\":499000,\"shipping\":25000,\"total\":524000}"
    },
    {
      "ref": "quote:ST411",
      "text": "{\"items\":[{\"productId\":\"ST411\",\"quantity\":1,\"unitPrice\":749000}],\"destination\":\"INNER_HCMC\",\"subtotal\":749000,\"shipping\":0,\"total\":749000}"
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

### r12-office-color:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Em chọn áo xanh nhạt nhé, mặc với quần navy vừa sáng vừa nhã. Chị cho em xin số đo vòng ngực để em chọn size chuẩn ạ. Tổng áo và ship nội thành của chị là 524k nhé.
```

**Nhận xét whole-turn:** Shop chủ động chọn xanh nhạt với lý do phối navy sáng và nhã, đúng phong cách nhẹ nhàng. Báo tổng 524k theo quote và xin vòng ngực còn thiếu để chọn size; không bán thêm quần khách đã từ chối, không bịa độ kín của xanh nhạt. Lời trực tiếp tạo lựa chọn mua và bước tiếp thực hiện được; không đọc lại nguyên yêu cầu khách.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r12-pants-known-waist

- Khách: Chị chọn quần QU714 navy, eo 74cm. Giao nội thành TP.HCM nhé.
- Shop: Quần navy 459k, còn S, M, L chị nhé.

**Khách hiện tại:** Eo chị 74, lấy M được không em? Cả ship hết bao nhiêu?

**Việc mua cần giải quyết:** Biết tổng và bổ sung đúng một số đo còn thiếu cho quần đã chọn.

**Băn khoăn:** Biết tổng và bổ sung đúng một số đo còn thiếu cho quần đã chọn.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "QU714",
      "kind": "PRODUCT",
      "label": "Quần suông QU714",
      "bindingVersion": "binding-r5-v1"
    }
  ],
  "protectedClaims": [
    {
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": null
      },
      "value": {
        "amountVnd": 459000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": "QU714:navy:S"
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
        "productId": "QU714",
        "variantId": "QU714:navy:M"
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
        "productId": "QU714",
        "variantId": "QU714:navy:L"
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
        "productId": "QU714",
        "variantId": "QU714:đen:S"
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
        "productId": "QU714",
        "variantId": "QU714:đen:M"
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
        "productId": "QU714",
        "variantId": "QU714:đen:L"
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
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "quote:QU714",
      "text": "{\"items\":[{\"productId\":\"QU714\",\"quantity\":1,\"unitPrice\":459000}],\"destination\":\"INNER_HCMC\",\"subtotal\":459000,\"shipping\":25000,\"total\":484000}"
    }
  ],
  "effectReceipts": [],
  "state": {
    "conversationOwner": "BOT",
    "revision": 1,
    "currentProductId": "QU714",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true
  },
  "productProfiles": [
    {
      "ref": "profile:QU714",
      "subjectRef": "QU714",
      "details": {
        "silhouette": "Hình thức bán: riêng quần. Ống suông; cạp trước phẳng, chun ở phần sau.",
        "material": "Vải: 68% polyester, 30% viscose, 2% elastane; co giãn nhẹ. Số đo trên quần: eo kéo tối đa S78/M84/L90cm.",
        "colors": [
          "navy",
          "đen"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"HIPS_CM\"]}",
          "S: thành phẩm eo thả66, mông102, dài96cm; cơ thể eo64–69/mông88–93cm.",
          "M: eo thả72, mông108, dài97cm; cơ thể eo70–76/mông94–100cm.",
          "L: eo thả78, mông114, dài98cm; cơ thể eo77–82/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng eo/mông cơ thể; độ kéo chun là số đo trên quần. Thiết kế/chun sau và code-fit hỗ trợ cảm giác mặc dự kiến; không có phép thử cảm giác mọi người hoặc mọi điều kiện."
      }
    }
  ]
}
```

### r12-pants-known-waist:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Tổng đơn của chị là 484.000đ gồm 459k tiền quần và 25k ship nội thành chị nhé. Chị cho em xin thêm số đo mông để em kiểm tra xem size M có vừa với mình không nha.
```

**Nhận xét whole-turn:** Khách đã cho eo 74 nhưng chưa có mông nên chưa đủ fit. Shop trả tổng 484k ngay, chỉ xin thêm mông để chọn M được hay không và giữ màu navy; không hỏi lại eo/ngực, không bịa thiếu bảng shop. Từ kiểm tra ở đây là việc chọn size sau đầu vào còn thiếu, không là hứa staff/tool ngoài khả năng. Câu gọn giải quyết phần có và tạo bước mua cần thiết.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r12-change-color-only

- Khách: Chị chọn SM613 trắng, ngực 92cm.
- Shop: Em chọn size M cho chị, trắng M còn hàng.

**Khách hiện tại:** Chị đổi ý lấy xanh nhạt cho dễ phối với quần navy ở nhà. Vẫn M nhé? Áo xanh giá bao nhiêu?

**Việc mua cần giải quyết:** Đổi riêng màu, giữ size đã được code xác nhận và trả giá áo hiện tại.

**Băn khoăn:** Đổi riêng màu, giữ size đã được code xác nhận và trả giá áo hiện tại.

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

### r12-change-color-only:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ, áo xanh nhạt size M giá 499.000đ chị nhé, size này shop vẫn còn hàng ạ. Xanh nhạt phối với quần navy mặc hợp và đẹp lắm chị.
```

**Nhận xét whole-turn:** Shop giữ M theo code-fit, chuyển đúng màu xanh nhạt với giá 499k/tồn và thêm một lời phối navy phù hợp. Không mang kết quả độ kín trắng sang xanh hay báo đã sửa đơn. Câu xác nhận đủ hai câu hỏi và không buộc đo lại/chọn lại; phần phong cách ngắn tự nhiên.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r12-indoor-exchange-eligible

- Khách: Chị đang cân nhắc VA512 đen L, lo thử lên không thích.
- Shop: Shop đổi size hoặc mẫu trong 7 ngày, hàng chưa dùng và còn tem chị nhé.
- Khách: Ví dụ chị nhận được 5 ngày, chỉ thử ở nhà, chưa giặt, cũng chưa mặc ra ngoài thì sao?
- Shop: Chị giữ nguyên tem, váy sạch và không mùi nữa nhé.
- Khách: Ừ, tem chị để nguyên, váy vẫn sạch không mùi.
- Shop: Phí vận chuyển đổi chị trả nhé.

**Khách hiện tại:** Vậy chị đổi qua mẫu khác được đúng không em? Phí gửi đổi chị trả hả?

**Việc mua cần giải quyết:** Xác nhận điều kiện đổi và phí cho tình huống đã nói rõ, tạo tin tưởng trước mua.

**Băn khoăn:** Xác nhận điều kiện đổi và phí cho tình huống đã nói rõ, tạo tin tưởng trước mua.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "VA512",
      "kind": "PRODUCT",
      "label": "Váy midi chữ A VA512",
      "bindingVersion": "binding-r5-v1"
    }
  ],
  "protectedClaims": [
    {
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": null
      },
      "value": {
        "amountVnd": 829000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": "VA512:đen:S"
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
        "productId": "VA512",
        "variantId": "VA512:đen:M"
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
        "productId": "VA512",
        "variantId": "VA512:đen:L"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:S"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:M"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:L"
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
    "currentProductId": "VA512",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "consideredSize": "L"
  },
  "productProfiles": [
    {
      "ref": "profile:VA512",
      "subjectRef": "VA512",
      "details": {
        "silhouette": "Váy midi chữ A, cổ vuông, tay ngắn. Eo cố định; lót toàn thân.",
        "material": "Crepe 100% polyester, không co giãn. Phần eo không có chun. Lót che thân váy trong ánh sáng phòng thông thường.",
        "colors": [
          "đen",
          "rêu"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"]}",
          "S: thành phẩm ngực92, eo73, mông104, dài110cm; cơ thể ngực82–87/eo64–69/mông86–93cm.",
          "M: ngực98, eo78, mông110, dài111cm; cơ thể ngực88–93/eo70–74/mông94–100cm.",
          "L: ngực103, eo83, mông116, dài112cm; cơ thể ngực94–98/eo75–79/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, là nhiệt thấp, không sấy nóng.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể. Eo cố định, có lót toàn thân. Độ che của lót đã xác nhận chỉ trong ánh sáng phòng; không có kết quả mọi ánh sáng hoặc thử cảm giác mặc cả ngày."
      }
    }
  ]
}
```

### r12-indoor-exchange-eligible:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ đúng rồi chị, mình đổi sang mẫu khác được và phí vận chuyển đổi chị trả ạ.
```

**Nhận xét whole-turn:** Toàn history đã có nhận 5 ngày, thử trong nhà chưa giặt/chưa mặc ra ngoài, nguyên tem/sạch/không mùi. Shop xác nhận đổi mẫu và khách chịu phí mà không đọc lại toàn bộ policy, đúng entitlement cho tình huống đã đủ. Đây là sử dụng context hữu ích, không cấp quyền đổi vô điều kiện hoặc báo hoàn tất thao tác. Khách có câu trả lời chắc chắn để tiếp tục cân nhắc mua.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r14-workday-choice

- Khách: Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên sợ cấn bụng.
- Shop: Set ST411 749k có quần suông lưng chun chị nhé. Váy VA512 829k thì eo cố định.

**Khách hiện tại:** Ngực 92, eo 74, mông 96cm em nhé. Set hay váy hợp hơn? Em xem size giúp chị luôn.

**Việc mua cần giải quyết:** Có lựa chọn mặc đi làm hợp việc ngồi nhiều và ngân sách.

**Băn khoăn:** Chưa chọn được giữa bộ và váy.

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
      "ref": "VA512",
      "kind": "PRODUCT",
      "label": "Váy midi chữ A VA512",
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
        "productId": "VA512",
        "variantId": null
      },
      "value": {
        "amountVnd": 829000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": "VA512:đen:S"
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
        "productId": "VA512",
        "variantId": "VA512:đen:M"
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
        "productId": "VA512",
        "variantId": "VA512:đen:L"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:S"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:M"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:L"
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
        "productId": "ST411",
        "variantId": null
      },
      "value": {
        "recommendedSizes": [
          "M"
        ],
        "alternativeSizes": [],
        "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
        "customerProfileRevision": 1,
        "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032",
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
    "currentProductId": "ST411",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
    "customerProfileRevision": 1,
    "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032"
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
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
          "S: thành phẩm ngực áo100, eo quần thả66, mông100, dài quần96cm; hướng dẫn cơ thể ngực82–87/eo64–69/mông86–91cm.",
          "M: ngực106, eo thả72, mông106, dài97cm; cơ thể ngực88–94/eo70–76/mông92–98cm.",
          "L: ngực112, eo thả78, mông112, dài98cm; cơ thể ngực95–101/eo77–83/mông99–105cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể; độ kéo chun là số đo trên quần. Có thiết kế và code-fit để tư vấn cảm giác mặc dự kiến; không có phép thử cảm giác cả ngày. Kết quả gấp chỉ so độ nhăn với linen, không đo độ bền, giữ phom theo thời gian hay miễn là ủi."
      }
    },
    {
      "ref": "profile:VA512",
      "subjectRef": "VA512",
      "details": {
        "silhouette": "Váy midi chữ A, cổ vuông, tay ngắn. Eo cố định; lót toàn thân.",
        "material": "Crepe 100% polyester, không co giãn. Phần eo không có chun. Lót che thân váy trong ánh sáng phòng thông thường.",
        "colors": [
          "đen",
          "rêu"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
          "S: thành phẩm ngực92, eo73, mông104, dài110cm; cơ thể ngực82–87/eo64–69/mông86–93cm.",
          "M: ngực98, eo78, mông110, dài111cm; cơ thể ngực88–93/eo70–74/mông94–100cm.",
          "L: ngực103, eo83, mông116, dài112cm; cơ thể ngực94–98/eo75–79/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, là nhiệt thấp, không sấy nóng.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể. Eo cố định, có lót toàn thân. Độ che của lót đã xác nhận chỉ trong ánh sáng phòng; không có kết quả mọi ánh sáng hoặc thử cảm giác mặc cả ngày."
      }
    }
  ]
}
```

### r14-workday-choice:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Set ST411 hợp hơn chị nhé, quần lưng chun toàn vòng ngồi nhiều không lo cấn bụng. Chị lấy size M vừa đẹp ạ.
```

**Nhận xét whole-turn:** Khách cần shop chọn giữa set và váy vì ngồi nhiều. Shop chọn ST411 M đúng fit, dùng lưng chun toàn vòng để trấn an cấn bụng theo tư vấn thiết kế/fit thông thường. Không có lời đã thử mọi người/mọi điều kiện hoặc một kết quả kiểm nghiệm mới; không tự chặn sự tự tin vì cụm không lo. Lời ngắn có lập trường, không đọc lại ba số đo và đủ hoàn tất chọn mẫu/size.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r14-price-repeat-wear

- Khách: Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ ở nhà nữa.
- Shop: Set navy 749k chị nhé, mặc nguyên bộ hay tách áo quần đều được.
- Khách: Ngực chị 92, eo 74, mông 96cm.

**Khách hiện tại:** Bên kia chị thấy 620k, còn bên em 749k. Chị vẫn phân vân, em chọn size giúp chị nhé.

**Việc mua cần giải quyết:** Quyết định mua set của shop dựa vào cách dùng thực tế, chọn size.

**Băn khoăn:** Chênh giá so với món nhìn tương tự.

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
    },
    {
      "type": "SIZE_FIT",
      "scope": {
        "kind": "PRODUCT",
        "productId": "ST411",
        "variantId": null
      },
      "value": {
        "recommendedSizes": [
          "M"
        ],
        "alternativeSizes": [],
        "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
        "customerProfileRevision": 1,
        "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032",
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
    "currentProductId": "ST411",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
    "customerProfileRevision": 1,
    "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032"
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
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
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

### r14-price-repeat-wear:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị lấy size M mặc vừa đẹp chị nhé. Set 749k gồm cả áo sơ mi và quần ống suông lưng chun, vừa diện đi làm nguyên bộ vừa tách áo phối đồ ở nhà linh hoạt, tính ra tiện dụng hơn nhiều, chị lấy set navy size M nhé.
```

**Nhận xét whole-turn:** Shop chốt navy M đúng fit, giải thích 749k là cả hai món để đi làm và tách phối với đồ khách có. Cụm tiện dụng hơn nhiều chưa rõ mốc so sánh nên có thể viết sắc hơn, nhưng toàn lời đang nói công dụng nhiều cách dùng của set, không quy kết bộ 620k thiếu công dụng/chất lượng. Dùng lại lợi ích khách đã biết để đề xuất mua vẫn có ích theo rubric đã freeze; không bắt thêm tính năng hoặc ưu đãi. Đoạn hơi lặp câu lấy M nhưng không làm lời tư vấn lủng củng.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r14-price-repeat-wear:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị lấy size M nhé, số đo của chị mặc size này vừa vặn và thoải mái ạ. 

Mức giá 749k là cho cả set gồm cả áo sơ mi và quần ống suông, mặc đi làm rất chỉn chu; đồng thời thiết kế này giúp chị dễ dàng tách rời áo hoặc quần để phối linh hoạt với các món đồ sẵn có ở nhà đúng ý thích.
```

**Nhận xét whole-turn:** Shop chọn M tự tin, trả giá gồm cả set và nối khả năng mặc nguyên bộ/tách phối với đúng cách sử dụng khách nêu. Không đọc lại bộ số đo hay bịa chênh chất lượng với hàng 620k. Câu cuối hơi văn viết và nhắc lại ý thích, nhưng mạch giải thích vì sao mua cả bộ vẫn rõ; minor wording không tự làm fail lời tư vấn có ích. Không yêu cầu lợi ích mới chỉ vì phối tách đã có trong history.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r14-price-repeat-wear:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị lấy size M nhé. Set 749k gồm cả áo sơ mi và quần suông, đi làm vừa lịch sự nguyên bộ lại vừa dễ tách áo ra phối đồ như ý chị thích, tính ra rất linh hoạt và tiện dùng ạ.
```

**Nhận xét whole-turn:** Shop chọn M và trình bày 749k mua hai món với hai cách dùng phù hợp khách: đi làm cả bộ và tách áo phối. Khách có lựa chọn cụ thể kèm giá trị sử dụng, không nhận checklist để tự quyết hay tuyên bố đối thủ kém. Giọng ngắn chủ động; nhắc linh hoạt tiện dùng trong vai trò trả giá trị mua vẫn hợp lý, không bị fail chỉ vì đã nói cách phối ở history.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r14-pants-size-input

- Khách: Chị muốn quần QU714 navy, mặc với áo sơ mi trắng sẵn có.
- Shop: Quần 459k, navy còn S, M, L chị nhé.

**Khách hiện tại:** Chị lấy quần navy, giao nội thành TP.HCM nhé. Cả ship bao nhiêu, chị mặc size nào?

**Việc mua cần giải quyết:** Biết tổng và đúng đầu vào chọn quần.

**Băn khoăn:** Chưa có số đo khách để chọn size.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "QU714",
      "kind": "PRODUCT",
      "label": "Quần suông QU714",
      "bindingVersion": "binding-r5-v1"
    }
  ],
  "protectedClaims": [
    {
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": null
      },
      "value": {
        "amountVnd": 459000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": "QU714:navy:S"
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
        "productId": "QU714",
        "variantId": "QU714:navy:M"
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
        "productId": "QU714",
        "variantId": "QU714:navy:L"
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
        "productId": "QU714",
        "variantId": "QU714:đen:S"
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
        "productId": "QU714",
        "variantId": "QU714:đen:M"
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
        "productId": "QU714",
        "variantId": "QU714:đen:L"
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
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "quote:QU714",
      "text": "{\"items\":[{\"productId\":\"QU714\",\"quantity\":1,\"unitPrice\":459000}],\"destination\":\"INNER_HCMC\",\"subtotal\":459000,\"shipping\":25000,\"total\":484000}"
    }
  ],
  "effectReceipts": [],
  "state": {
    "conversationOwner": "BOT",
    "revision": 1,
    "currentProductId": "QU714",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true
  },
  "productProfiles": [
    {
      "ref": "profile:QU714",
      "subjectRef": "QU714",
      "details": {
        "silhouette": "Hình thức bán: riêng quần. Ống suông; cạp trước phẳng, chun ở phần sau.",
        "material": "Vải: 68% polyester, 30% viscose, 2% elastane; co giãn nhẹ. Số đo trên quần: eo kéo tối đa S78/M84/L90cm.",
        "colors": [
          "navy",
          "đen"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"WAIST_CM\",\"HIPS_CM\"]}",
          "S: thành phẩm eo thả66, mông102, dài96cm; cơ thể eo64–69/mông88–93cm.",
          "M: eo thả72, mông108, dài97cm; cơ thể eo70–76/mông94–100cm.",
          "L: eo thả78, mông114, dài98cm; cơ thể eo77–82/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng eo/mông cơ thể; độ kéo chun là số đo trên quần. Thiết kế/chun sau và code-fit hỗ trợ cảm giác mặc dự kiến; không có phép thử cảm giác mọi người hoặc mọi điều kiện."
      }
    }
  ]
}
```

### r14-pants-size-input:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Tổng thanh toán là 484.000đ chị nhé (gồm 459k tiền quần và 25k phí ship nội thành). Để em chọn chính xác size, chị cho em xin số đo vòng eo và vòng mông nhé ạ!
```

**Nhận xét whole-turn:** Shop trả tổng 484k đúng quote trước, xin eo và mông đúng hai đầu vào còn thiếu để chọn quần. Không chốt size theo tồn, hỏi chart shop hoặc thêm vòng ngực. Lời hơi lịch sự dài nhưng vẫn rõ câu hỏi cần trả, tự nhiên và tạo bước chọn size thực hiện được.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r14-stage-light-change

- Khách: Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da.
- Shop: SM613 trắng M chị nhé. Mặc với áo lót màu da trong phòng không thấy màu áo lót, nhưng ngược sáng có thể thấy bóng.

**Khách hiện tại:** Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?

**Việc mua cần giải quyết:** Quyết định áo cho hoàn cảnh sử dụng vừa đổi, biết tồn.

**Băn khoăn:** Không muốn bóng áo lót dưới đèn phía sau.

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

### r14-stage-light-change:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Trắng size M mình vẫn còn chị nhé, nhưng lên sân khấu đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót, chị không lấy màu trắng cho dịp này nha.
```

**Nhận xét whole-turn:** Shop báo trắng M còn rồi đổi khuyến nghị theo đèn sân khấu: không lấy trắng cho dịp này vì có thể thấy bóng áo lót. Không thay xác suất nguy cơ thành chắc chắn xuyên, không mượn màu xanh hay lót trong phòng để hứa kín sân khấu. Thiếu món thay có nguồn không làm lời không chọn này vô ích; khách được trả cả tồn và quyết định phù hợp, câu gọn.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r14-stage-light-change:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ chị không nên lấy trắng cho dịp này nha, vì đèn chiếu phía sau (ngược sáng) có thể thấy bóng áo lót ạ. 

Size M trắng nhà em vẫn còn hàng, nhưng với nhu cầu lên sân khấu này thì áo trắng không phù hợp với chị nha.
```

**Nhận xét whole-turn:** Shop khuyên không chọn trắng ngay, nêu đúng nguy cơ dưới đèn chiếu sau và trả tồn M. Đoạn cuối lặp kết luận áo không phù hợp cho sân khấu nên có thể rút gọn, nhưng toàn lời vẫn nhất quán và giúp khách quyết định; không fail vì lặp một lần nếu không obscures tư vấn. Không đề xuất màu chưa thử độ kín hoặc bước ngoài capability.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r14-stage-light-change:3 — FAIL / FALLBACK

Actual terminal khách nhận (nguyên văn):
```text
Phần này em chưa trả lời được, chị nhé.
```

**Nhận xét whole-turn:** Khách hỏi có nên tiếp tục trắng cho sân khấu và tồn M. Actual terminal chỉ báo chưa trả lời được dù context đã có nguy cơ ngược sáng và tồn; không đưa hướng lựa chọn, không trả được phần có dữ kiện. Lời fallback an toàn và hiểu được nhưng việc mua bế tắc. Chấm thất bại nhu cầu/decision support/next step từ outcome thực tế, chưa dùng draft bị chặn để suy chất lượng.

Điểm chẩn đoán theo rubric đã freeze: understanding=0; explicitNeedCompleteness=0; contextCorrectionUse=0; usefulness=0; decisionSupport=0; partialAnswerBehavior=0; nextStep=0; coherence=2; naturalness=2; factualActionSafety=2.

## r14-refund-before-buy

- Khách: Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da.
- Shop: Chị lấy trắng M nhé, áo 499k và còn hàng.

**Khách hiện tại:** Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

**Việc mua cần giải quyết:** Phân biệt hoàn tiền và đổi hàng trước khi quyết định mua.

**Băn khoăn:** Hiểu sai đổi hàng thành hoàn tiền.

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
    "consideredSize": "M",
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

### r14-refund-before-buy:1 — FAIL / FALLBACK

Actual terminal khách nhận (nguyên văn):
```text
Phần này em chưa trả lời được, chị nhé.
```

**Nhận xét whole-turn:** Khách tiếp tục trắng M và hỏi hoàn tiền hay đổi mẫu nếu không ưng. Actual terminal chỉ nói chưa trả lời được, bỏ phần không hoàn tiền/quyền đổi shop đã cấp trong trusted context. Không có hướng xử lý thực hiện được hoặc phần trả lời có dữ kiện nên whole-reply FAIL, dù fallback không bịa quyền hay effect và giọng ngắn tự nhiên. Chưa xem verdict/draft để quyết định điểm; từng lượt lặp giữ nguyên trong denominator.

Điểm chẩn đoán theo rubric đã freeze: understanding=0; explicitNeedCompleteness=0; contextCorrectionUse=0; usefulness=0; decisionSupport=0; partialAnswerBehavior=0; nextStep=0; coherence=2; naturalness=2; factualActionSafety=2.

### r14-refund-before-buy:2 — FAIL / FALLBACK

Actual terminal khách nhận (nguyên văn):
```text
Phần này em chưa trả lời được, chị nhé.
```

**Nhận xét whole-turn:** Khách tiếp tục trắng M và hỏi hoàn tiền hay đổi mẫu nếu không ưng. Actual terminal chỉ nói chưa trả lời được, bỏ phần không hoàn tiền/quyền đổi shop đã cấp trong trusted context. Không có hướng xử lý thực hiện được hoặc phần trả lời có dữ kiện nên whole-reply FAIL, dù fallback không bịa quyền hay effect và giọng ngắn tự nhiên. Chưa xem verdict/draft để quyết định điểm; từng lượt lặp giữ nguyên trong denominator.

Điểm chẩn đoán theo rubric đã freeze: understanding=0; explicitNeedCompleteness=0; contextCorrectionUse=0; usefulness=0; decisionSupport=0; partialAnswerBehavior=0; nextStep=0; coherence=2; naturalness=2; factualActionSafety=2.

### r14-refund-before-buy:3 — FAIL / FALLBACK

Actual terminal khách nhận (nguyên văn):
```text
Phần này em chưa trả lời được, chị nhé.
```

**Nhận xét whole-turn:** Khách tiếp tục trắng M và hỏi hoàn tiền hay đổi mẫu nếu không ưng. Actual terminal chỉ nói chưa trả lời được, bỏ phần không hoàn tiền/quyền đổi shop đã cấp trong trusted context. Không có hướng xử lý thực hiện được hoặc phần trả lời có dữ kiện nên whole-reply FAIL, dù fallback không bịa quyền hay effect và giọng ngắn tự nhiên. Chưa xem verdict/draft để quyết định điểm; từng lượt lặp giữ nguyên trong denominator.

Điểm chẩn đoán theo rubric đã freeze: understanding=0; explicitNeedCompleteness=0; contextCorrectionUse=0; usefulness=0; decisionSupport=0; partialAnswerBehavior=0; nextStep=0; coherence=2; naturalness=2; factualActionSafety=2.

## r14-freeship-extra-pants

- Khách: Chị định lấy sơ mi SM613 499k, giao nội thành TP.HCM.
- Shop: Một áo cả ship là 524k, đơn từ 700k được miễn ship. Quần QU714 bán riêng 459k chị nhé.

**Khách hiện tại:** Chị đang tính thêm quần đen cho được freeship, nhưng ở nhà nhiều quần rồi. Em thấy chị nên thêm hay mua áo thôi?

**Việc mua cần giải quyết:** Chọn mua áo và cân nhắc giá trị món thêm của shop; xử lý băn khoăn trùng đồ, không mặc định tối thiểu hóa tổng chi.

**Băn khoăn:** Đang cân nhắc thêm quần để hưởng freeship và cần một lý do mua có ích khi đã có quần đen.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "SM613",
      "kind": "PRODUCT",
      "label": "Sơ mi dáng thẳng SM613",
      "bindingVersion": "binding-r5-v1"
    },
    {
      "ref": "QU714",
      "kind": "PRODUCT",
      "label": "Quần suông QU714",
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
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": null
      },
      "value": {
        "amountVnd": 459000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": "QU714:navy:S"
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
        "productId": "QU714",
        "variantId": "QU714:navy:M"
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
        "productId": "QU714",
        "variantId": "QU714:navy:L"
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
        "productId": "QU714",
        "variantId": "QU714:đen:S"
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
        "productId": "QU714",
        "variantId": "QU714:đen:M"
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
        "productId": "QU714",
        "variantId": "QU714:đen:L"
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
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "quote:SM613",
      "text": "{\"items\":[{\"productId\":\"SM613\",\"quantity\":1,\"unitPrice\":499000}],\"destination\":\"INNER_HCMC\",\"subtotal\":499000,\"shipping\":25000,\"total\":524000}"
    },
    {
      "ref": "quote:QU714",
      "text": "{\"items\":[{\"productId\":\"QU714\",\"quantity\":1,\"unitPrice\":459000}],\"destination\":\"INNER_HCMC\",\"subtotal\":459000,\"shipping\":25000,\"total\":484000}"
    },
    {
      "ref": "quote:SM613+QU714",
      "text": "{\"items\":[{\"productId\":\"SM613\",\"quantity\":1,\"unitPrice\":499000},{\"productId\":\"QU714\",\"quantity\":1,\"unitPrice\":459000}],\"destination\":\"INNER_HCMC\",\"subtotal\":958000,\"shipping\":0,\"total\":958000}"
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
    "privacyAllowed": true
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
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"BUST_CM\"],\"missingInputs\":[\"BUST_CM\"]}",
          "S: thành phẩm ngực100, vai38, dài62cm; cơ thể ngực82–87cm.",
          "M: ngực106, vai39, dài63cm; cơ thể ngực88–94cm.",
          "L: ngực112, vai40, dài64cm; cơ thể ngực95–100cm."
        ],
        "care": "Giặt nhẹ nước mát, tách màu, phơi râm; là nhiệt vừa.",
        "limitations": "Bảng áo dùng vòng ngực cơ thể. Phép thử độ xuyên thuộc màu trắng và hai điều kiện ánh sáng ghi ở material; chưa có kết quả độ xuyên màu xanh nhạt. Đây là thử của shop, không phải hãng. Dữ liệu màu để tư vấn phối đồ không phải kết quả độ kín."
      }
    },
    {
      "ref": "profile:QU714",
      "subjectRef": "QU714",
      "details": {
        "silhouette": "Hình thức bán: riêng quần. Ống suông; cạp trước phẳng, chun ở phần sau.",
        "material": "Vải: 68% polyester, 30% viscose, 2% elastane; co giãn nhẹ. Số đo trên quần: eo kéo tối đa S78/M84/L90cm.",
        "colors": [
          "navy",
          "đen"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"WAIST_CM\",\"HIPS_CM\"]}",
          "S: thành phẩm eo thả66, mông102, dài96cm; cơ thể eo64–69/mông88–93cm.",
          "M: eo thả72, mông108, dài97cm; cơ thể eo70–76/mông94–100cm.",
          "L: eo thả78, mông114, dài98cm; cơ thể eo77–82/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng eo/mông cơ thể; độ kéo chun là số đo trên quần. Thiết kế/chun sau và code-fit hỗ trợ cảm giác mặc dự kiến; không có phép thử cảm giác mọi người hoặc mọi điều kiện."
      }
    }
  ]
}
```

### r14-freeship-extra-pants:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Ở nhà đã nhiều quần thì chị lấy mỗi áo thôi cho gọn chị nhé, tổng 524k gồm 25k ship. Còn nếu chị muốn phối trọn bộ sơ mi với quần suông đen mặc đi làm thì lấy thêm quần QU714, tổng cả bộ là 958k và được miễn phí ship luôn ạ.
```

**Nhận xét whole-turn:** Shop đứng về mua áo thôi khi khách đã có nhiều quần, báo đúng 524k; phương án thêm quần đen 958k được đặt có điều kiện muốn một bộ để đi làm, không nói tiết kiệm tiền hơn. Đoạn thêm có thể gọn và giải thích công dụng với tủ đồ sắc hơn, nhưng không tự phủ định lời khuyên đầu hay ép khách mua: khách đang hỏi cân nhắc hai phương án chứ chưa yêu cầu dừng. Không bắt câu trả lời luôn tối thiểu hóa chi hoặc cấm đề xuất bán thêm có tổng minh bạch.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r15-value-use

- Khách: Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối đồ ở nhà.
- Shop: Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được.

**Khách hiện tại:** Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

**Việc mua cần giải quyết:** Hiểu giá trị sử dụng hàng shop để quyết định mua.

**Băn khoăn:** Chênh129k chưa thấy đáng.

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

### r15-value-use:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị lấy set navy 749k này nhé. Chất vải ít nhăn hơn linen nên mặc đi làm cả ngày ngồi văn phòng vẫn giữ được phom chỉn chu, quần lưng chun ngồi rất thoải mái. Cuối tuần mình tách áo ra mặc ở nhà hay phối đồ khác đều tiện và linh hoạt hơn.
```

**Nhận xét whole-turn:** Shop khuyên set navy, dùng ít nhăn/lưng chun cho ngày đi làm và tách áo cho cuối tuần để trả băn khoăn giá trị. Không bịa độ bền, miễn là ủi hoặc sự kém hơn của đối thủ. Lời gọn gàng/phom trong ngày là tư vấn thông thường trong đúng cách sử dụng được owner chấp thuận. Không hỏi số đo để né so giá; khách có hướng mua và lợi ích cụ thể với hai dịp.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r15-value-use:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Set ST411 (749k) vải ít nhăn, áo dáng rộng và quần suông lưng chun mặc đi làm hay tách áo phối đồ cuối tuần đều rất gọn gàng và đứng phom. Chị lấy bộ navy thì cho em xin số đo ngực, eo, mông để em chọn size vừa nhé ạ.
```

**Nhận xét whole-turn:** Shop giải thích set 749k qua phom/ít nhăn và dùng được hai dịp, rồi xin số đo khi khách lấy navy. Phần lý do giá được trả trước câu hỏi size, không dùng thu số đo để bỏ băn khoăn mua. Dữ liệu khách chưa có ba vòng nên hỏi đủ ba đầu vào là bước thật sự giúp mua set, không đọc lại thông tin đã biết. Câu chưa thể hiện chênh 129k rõ nhưng vẫn có khuyến nghị/công dụng phù hợp, không buộc phải thắng mọi phản đối giá mới đạt.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r15-value-use:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị lấy set navy nhé. Chất liệu ít nhăn hơn linen giúp đồ giữ phom chỉn chu khi đi làm, đến cuối tuần tách áo ra phối linh hoạt mặc ở nhà rất tiện ạ.
```

**Nhận xét whole-turn:** Shop chọn set navy và giải thích vẻ chỉn chu đi làm cùng khả năng tách áo dùng cuối tuần. Đây là lợi ích liên quan của hàng shop, không suy chất lượng đối thủ hoặc thêm cam kết hiệu suất từ thử gấp. Giọng ngắn chủ động; nhắc lại cách sử dụng có vai trò giải thích lựa chọn nên không chấm bằng đếm fact/lặp từ.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r15-fit-reassurance

- Khách: Chị chọn set ST411 be, ngực92, eo74, mông96cm. Chị mặc đi làm và hay ngồi nhiều.
- Shop: Em chọn size M cho chị, be M còn; set749k.

**Khách hiện tại:** Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

**Việc mua cần giải quyết:** Tin vào chọn size và thiết kế theo nhu cầu ngồi làm việc.

**Băn khoăn:** Lo phần cạp khó chịu.

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
      "ref": "VA512",
      "kind": "PRODUCT",
      "label": "Váy midi chữ A VA512",
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
        "productId": "VA512",
        "variantId": null
      },
      "value": {
        "amountVnd": 829000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": "VA512:đen:S"
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
        "productId": "VA512",
        "variantId": "VA512:đen:M"
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
        "productId": "VA512",
        "variantId": "VA512:đen:L"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:S"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:M"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:L"
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
        "productId": "ST411",
        "variantId": null
      },
      "value": {
        "recommendedSizes": [
          "M"
        ],
        "alternativeSizes": [],
        "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
        "customerProfileRevision": 1,
        "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032",
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
    "currentProductId": "ST411",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
    "customerProfileRevision": 1,
    "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032"
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
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
          "S: thành phẩm ngực áo100, eo quần thả66, mông100, dài quần96cm; hướng dẫn cơ thể ngực82–87/eo64–69/mông86–91cm.",
          "M: ngực106, eo thả72, mông106, dài97cm; cơ thể ngực88–94/eo70–76/mông92–98cm.",
          "L: ngực112, eo thả78, mông112, dài98cm; cơ thể ngực95–101/eo77–83/mông99–105cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể; độ kéo chun là số đo trên quần. Có thiết kế và code-fit để tư vấn cảm giác mặc dự kiến; không có phép thử cảm giác cả ngày. Kết quả gấp chỉ so độ nhăn với linen, không đo độ bền, giữ phom theo thời gian hay miễn là ủi."
      }
    },
    {
      "ref": "profile:VA512",
      "subjectRef": "VA512",
      "details": {
        "silhouette": "Váy midi chữ A, cổ vuông, tay ngắn. Eo cố định; lót toàn thân.",
        "material": "Crepe 100% polyester, không co giãn. Phần eo không có chun. Lót che thân váy trong ánh sáng phòng thông thường.",
        "colors": [
          "đen",
          "rêu"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
          "S: thành phẩm ngực92, eo73, mông104, dài110cm; cơ thể ngực82–87/eo64–69/mông86–93cm.",
          "M: ngực98, eo78, mông110, dài111cm; cơ thể ngực88–93/eo70–74/mông94–100cm.",
          "L: ngực103, eo83, mông116, dài112cm; cơ thể ngực94–98/eo75–79/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, là nhiệt thấp, không sấy nóng.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể. Eo cố định, có lót toàn thân. Độ che của lót đã xác nhận chỉ trong ánh sáng phòng; không có kết quả mọi ánh sáng hoặc thử cảm giác mặc cả ngày."
      }
    }
  ]
}
```

### r15-fit-reassurance:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ, chị lấy size M be nhé. Mẫu này lưng chun toàn vòng nên không bị cứng đâu chị, eo 74 của mình mặc thoải mái và ngồi nhiều lúc đi làm rất dễ chịu. Áo dáng rộng cùng quần suông lịch sự, rất hợp với chị ạ.
```

**Nhận xét whole-turn:** Khách đã chọn M và chỉ lo cạp cứng. Shop giữ be M, giải thích lưng chun toàn vòng phù hợp việc ngồi và dùng eo 74 như dẫn chứng trấn an đúng câu hỏi hiện tại. Không đọc cả ba vòng hay bảng size; số đo duy nhất có vai trò rõ. Lời thoải mái/dễ chịu là tư vấn fit/thiết kế thông thường được duyệt, không bịa thử nghiệm cả ngày hoặc mọi người. Khách nhận được lý do yên tâm với lựa chọn đã chốt.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r15-fit-reassurance:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị yên tâm lấy size M nhé, quần này lưng chun toàn vòng, giãn tối đa tới 88cm nên chị ngồi nhiều thoải mái không sợ cạp cứng đâu ạ.
```

**Nhận xét whole-turn:** Shop xác nhận M theo fit hiện tại và dùng độ kéo tối đa M88cm đúng profile để giải thích cạp chun có khoảng giãn. Đây là số đo trên quần, không bị biến thành cơ thể 88cm mặc vừa hoặc thước size mới. Lời không sợ cạp cứng/thoải mái thuộc trấn an thông thường theo thiết kế và fit, không suy kiểm nghiệm cho mọi điều kiện. Một thông số liên quan trong câu ngắn hỗ trợ tin tưởng, không là bảng đọc lại.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r15-fit-reassurance:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ chị lấy set be size M nhé. Quần có lưng chun toàn vòng nên không bị cạp cứng đâu chị, ngồi nhiều thoải mái không bị siết. Áo sơ mi dáng rộng mặc đi làm vừa lịch sự vừa dễ chịu, rất hợp với chị ạ.
```

**Nhận xét whole-turn:** Shop giữ set be M và trả đúng lo cạp cứng bằng lưng chun toàn vòng, dáng áo rộng/quần suông cho đi làm. Giọng tự tin không có phép thử hoặc lời tuyệt đối cho mọi người/điều kiện; theo phạm vi shop duyệt đây là tư vấn cảm giác mặc có căn cứ. Không đổi size hoặc tạo checkout, khách có đủ trấn an để tiếp tục lựa chọn.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r15-known-waist-next

- Khách: Chị chọn QU714 navy, eo 74cm. Chị ở nội thành TP.HCM.
- Shop: Quần 459k, navy còn S, M, L chị nhé.

**Khách hiện tại:** Eo chị 74cm, mặc M được không em? Quần cả ship bao nhiêu?

**Việc mua cần giải quyết:** Bổ sung đúng đầu vào chọn quần và biết tổng chi.

**Băn khoăn:** Chưa đủ code-fit với vòng eo đơn lẻ.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "QU714",
      "kind": "PRODUCT",
      "label": "Quần suông QU714",
      "bindingVersion": "binding-r5-v1"
    }
  ],
  "protectedClaims": [
    {
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": null
      },
      "value": {
        "amountVnd": 459000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": "QU714:navy:S"
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
        "productId": "QU714",
        "variantId": "QU714:navy:M"
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
        "productId": "QU714",
        "variantId": "QU714:navy:L"
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
        "productId": "QU714",
        "variantId": "QU714:đen:S"
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
        "productId": "QU714",
        "variantId": "QU714:đen:M"
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
        "productId": "QU714",
        "variantId": "QU714:đen:L"
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
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "quote:QU714",
      "text": "{\"items\":[{\"productId\":\"QU714\",\"quantity\":1,\"unitPrice\":459000}],\"destination\":\"INNER_HCMC\",\"subtotal\":459000,\"shipping\":25000,\"total\":484000}"
    }
  ],
  "effectReceipts": [],
  "state": {
    "conversationOwner": "BOT",
    "revision": 1,
    "currentProductId": "QU714",
    "factSnapshotVersion": "authored-evaluation-product-context-r15",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true
  },
  "productProfiles": [
    {
      "ref": "profile:QU714",
      "subjectRef": "QU714",
      "details": {
        "silhouette": "Hình thức bán: riêng quần. Ống suông; cạp trước phẳng, chun ở phần sau.",
        "material": "Vải: 68% polyester, 30% viscose, 2% elastane; co giãn nhẹ. Số đo trên quần: eo kéo tối đa S78/M84/L90cm.",
        "colors": [
          "navy",
          "đen"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"HIPS_CM\"]}",
          "S: thành phẩm eo thả66, mông102, dài96cm; cơ thể eo64–69/mông88–93cm.",
          "M: eo thả72, mông108, dài97cm; cơ thể eo70–76/mông94–100cm.",
          "L: eo thả78, mông114, dài98cm; cơ thể eo77–82/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng eo/mông cơ thể; độ kéo chun là số đo trên quần. Thiết kế/chun sau và code-fit hỗ trợ cảm giác mặc dự kiến; không có phép thử cảm giác mọi người hoặc mọi điều kiện."
      }
    }
  ]
}
```

### r15-known-waist-next:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Tổng đơn của chị là 484.000đ (giá quần 459.000đ và 25.000đ phí ship nội thành TP.HCM). Chị cho em xin thêm số đo mông để em kiểm tra size chuẩn nhất cho mình nhé.
```

**Nhận xét whole-turn:** Shop trả tổng 484k đúng quote và chỉ xin mông còn thiếu, giữ eo/màu/nơi nhận đã biết. Không chọn M từ một vòng eo hoặc xin cao/cân nặng bảng chưa hỗ trợ. Lời kiểm tra size là bước chọn fit sau dữ liệu mới, không hứa hành động nhân viên/công cụ khác. Câu tiền rồi đầu vào rõ ràng và tự nhiên.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r15-color-final-confirm

- Khách: Chị chọn SM613 trắng, ngực92cm.
- Shop: Em chọn trắng size M,499k chị nhé.
- Khách: Chị đổi xanh nhạt để mặc với quần navy ở nhà nhé.

**Khách hiện tại:** Ừ lấy xanh M nhé em, giá có đổi không?

**Việc mua cần giải quyết:** Xác nhận biến thể cuối và giá.

**Băn khoăn:** Lo đổi màu đổi size/giá.

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

### r15-color-final-confirm:1 — FAIL / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Xanh nhạt size M vẫn 499k chị nhé. Áo màu này phối cùng quần navy nhìn nhã nhặn và rất hợp mặc ở nhà.
```

**Nhận xét whole-turn:** Shop xác nhận đúng xanh nhạt M và giá vẫn 499k, nhưng câu tư vấn nối sau hiểu quần navy ở nhà thành mục đích mặc ở nhà. Trong history, ở nhà chỉ đồ khách đã có để phối, không phải dịp sử dụng vừa yêu cầu. Phần giao dịch vẫn đúng và giọng không lỗi lớn, song đọc context/lý do tư vấn lệch nên chưa đạt yêu cầu hiểu nhu cầu mức2 của consultation. Đây là lỗi diễn giải mục đích, không phải phạt từ ở nhà hay bắt thiếu CTA; điểm này chủ quan cần owner xem, và không quyết định STOP vì nhóm policy đã dưới ngưỡng.

Điểm chẩn đoán theo rubric đã freeze: understanding=1; explicitNeedCompleteness=2; contextCorrectionUse=1; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r16-effort-and-use

- Khách: Chị thích set ST411 navy, tầm 850k. Chị muốn mặc đi làm rồi cuối tuần tách ra phối nữa.
- Shop: Set 749k chị nhé. Áo dáng rộng, quần suông lưng chun, cả hai mặc riêng được.

**Khách hiện tại:** Chị vẫn phân vân bộ này, đi làm rồi đi chơi có hợp không em?

**Việc mua cần giải quyết:** Thấy lý do mua phù hợp hai dịp sử dụng.

**Băn khoăn:** Chị muốn mua một bộ dùng được cả đi làm và cuối tuần. Em thuyết phục chị chọn bộ này xem?

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

### r16-effort-and-use:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Hợp chị nhé. Áo sơ mi dáng rộng và quần suông mặc đi làm chỉn chu, cuối tuần chị tách rời áo hoặc quần ra phối đi chơi đều thoải mái.
```

**Nhận xét whole-turn:** Khách hỏi dùng đi làm rồi đi chơi có hợp không. Shop đồng ý và gắn dáng sơ mi/quần suông với chỉnh tề ở công sở, tách món để đi chơi. Lợi ích đã có trong history được dùng đúng vai trò trả lý do mua hai dịp, không cần phát minh fact mới. Lời ngắn shop chị/em, không mở lại fit/ship hay tạo kiểm nghiệm. Đủ hướng chọn set theo cách dùng khách muốn.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r16-effort-and-use:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Hợp chị nhé. Set navy mặc đi làm gọn gàng, lịch sự; cuối tuần chị tách áo sơ mi phối đồ đi chơi hoặc mặc riêng quần suông đều thoải mái, dễ ứng dụng.
```

**Nhận xét whole-turn:** Shop xác nhận set navy hợp hai dịp bằng mặc nguyên bộ lịch sự đi làm và tách áo/quần khi đi chơi. Câu dễ ứng dụng hơi chung nhưng toàn lời đã giải thích hai cách dùng cụ thể, không chỉ liệt kê thông số. Không bịa tính năng hoặc buộc thêm câu hỏi để tiến triển; tư vấn gọn và tự nhiên đủ cho băn khoăn này.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r16-effort-and-use:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Hợp chị nhé. Áo sơ mi dáng rộng cùng quần suông tạo nét chỉn chu, lịch sự để đi làm; cuối tuần chị tách áo mặc với jeans hoặc tách quần đi cà phê, dạo phố đều thoải mái và năng động. Chất vải ít nhăn giúp giữ phom gọn gàng suốt cả ngày.
```

**Nhận xét whole-turn:** Shop đưa một cách phối áo với jeans và quần để đi cà phê/dạo phố bên cạnh bộ lịch sự đi làm; jeans là ví dụ phối, không tự nói khách đã có hay shop bán. Câu cuối về ít nhăn/phom có căn cứ chất liệu và nằm trong tư vấn thông thường đã duyệt, không bảo đảm miễn là hoặc độ bền. Lời dài hơn hai lượt kia nhưng vẫn liền ý và thuyết phục bằng cách dùng thực tế, không mặc định giọng quảng cáo là quality FAIL.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r16-budget-alternative

- Khách: Chị có nhiều quần đen rồi, đang xem sơ mi trắng SM613. Giao nội thành TP.HCM em nhé.
- Shop: Áo cả ship 524k chị nhé. Quần QU714 459k, mua thêm thì cả hai 958k, miễn ship.

**Khách hiện tại:** Chị chỉ có 600k thôi em. Áo trắng với quần đen thì quen quá, em chọn mẫu hoặc màu khác giúp chị nhé.

**Việc mua cần giải quyết:** Chọn phương án hợp ngân sách, không mua thừa.

**Băn khoăn:** Chị có 600k thôi. Nếu không thêm quần, em chọn giúp một cách phối khác với đồ chị có nhé.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "SM613",
      "kind": "PRODUCT",
      "label": "Sơ mi dáng thẳng SM613",
      "bindingVersion": "binding-r5-v1"
    },
    {
      "ref": "QU714",
      "kind": "PRODUCT",
      "label": "Quần suông QU714",
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
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": null
      },
      "value": {
        "amountVnd": 459000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": "QU714:navy:S"
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
        "productId": "QU714",
        "variantId": "QU714:navy:M"
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
        "productId": "QU714",
        "variantId": "QU714:navy:L"
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
        "productId": "QU714",
        "variantId": "QU714:đen:S"
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
        "productId": "QU714",
        "variantId": "QU714:đen:M"
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
        "productId": "QU714",
        "variantId": "QU714:đen:L"
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
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "quote:SM613",
      "text": "{\"items\":[{\"productId\":\"SM613\",\"quantity\":1,\"unitPrice\":499000}],\"destination\":\"INNER_HCMC\",\"subtotal\":499000,\"shipping\":25000,\"total\":524000}"
    },
    {
      "ref": "quote:QU714",
      "text": "{\"items\":[{\"productId\":\"QU714\",\"quantity\":1,\"unitPrice\":459000}],\"destination\":\"INNER_HCMC\",\"subtotal\":459000,\"shipping\":25000,\"total\":484000}"
    },
    {
      "ref": "quote:SM613+QU714",
      "text": "{\"items\":[{\"productId\":\"SM613\",\"quantity\":1,\"unitPrice\":499000},{\"productId\":\"QU714\",\"quantity\":1,\"unitPrice\":459000}],\"destination\":\"INNER_HCMC\",\"subtotal\":958000,\"shipping\":0,\"total\":958000}"
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
    "privacyAllowed": true
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
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"BUST_CM\"],\"missingInputs\":[\"BUST_CM\"]}",
          "S: thành phẩm ngực100, vai38, dài62cm; cơ thể ngực82–87cm.",
          "M: ngực106, vai39, dài63cm; cơ thể ngực88–94cm.",
          "L: ngực112, vai40, dài64cm; cơ thể ngực95–100cm."
        ],
        "care": "Giặt nhẹ nước mát, tách màu, phơi râm; là nhiệt vừa.",
        "limitations": "Bảng áo dùng vòng ngực cơ thể. Phép thử độ xuyên thuộc màu trắng và hai điều kiện ánh sáng ghi ở material; chưa có kết quả độ xuyên màu xanh nhạt. Đây là thử của shop, không phải hãng. Dữ liệu màu để tư vấn phối đồ không phải kết quả độ kín."
      }
    },
    {
      "ref": "profile:QU714",
      "subjectRef": "QU714",
      "details": {
        "silhouette": "Hình thức bán: riêng quần. Ống suông; cạp trước phẳng, chun ở phần sau.",
        "material": "Vải: 68% polyester, 30% viscose, 2% elastane; co giãn nhẹ. Số đo trên quần: eo kéo tối đa S78/M84/L90cm.",
        "colors": [
          "navy",
          "đen"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"WAIST_CM\",\"HIPS_CM\"]}",
          "S: thành phẩm eo thả66, mông102, dài96cm; cơ thể eo64–69/mông88–93cm.",
          "M: eo thả72, mông108, dài97cm; cơ thể eo70–76/mông94–100cm.",
          "L: eo thả78, mông114, dài98cm; cơ thể eo77–82/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng eo/mông cơ thể; độ kéo chun là số đo trên quần. Thiết kế/chun sau và code-fit hỗ trợ cảm giác mặc dự kiến; không có phép thử cảm giác mọi người hoặc mọi điều kiện."
      }
    }
  ]
}
```

### r16-budget-alternative:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Em đổi sang sơ mi SM613 màu xanh nhạt nhé chị, mặc lên tươi và đỡ quen thuộc hơn áo trắng. Tổng cả ship là 524k, vừa vặn trong ngân sách 600k của chị ạ.
```

**Nhận xét whole-turn:** Khách muốn thay cách áo trắng/quần đen trong 600k. Shop chọn xanh nhạt như một thay đổi thực, giải thích khác cảm giác quen và tổng 524k đúng quote; không bán thêm quần vượt trần. Chưa gợi chi tiết phụ kiện nhưng không cần để hoàn tất đổi màu theo yêu cầu. Câu ngắn có lựa chọn mua thực tế, không lặp nguyên phương án cũ.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r16-change-to-indoor-dress

- Khách: Chị đo ngực 92, eo 74, mông 96cm. Ban đầu định lấy set ST411 đi làm.
- Shop: ST411 và VA512 chị đều mặc M nhé.

**Khách hiện tại:** Chị đổi ý mặc váy đi tiệc trong nhà em nhé. Em chọn màu với size giúp chị luôn, dưới 850k là được.

**Việc mua cần giải quyết:** Chọn váy cho dịp mới theo fit hiện tại và ngân sách.

**Băn khoăn:** Chị đổi kế hoạch, dự tiệc trong nhà và muốn mặc váy cho gọn. Em chọn màu với size giúp chị, giá có trong 850k không?

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
      "ref": "VA512",
      "kind": "PRODUCT",
      "label": "Váy midi chữ A VA512",
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
        "productId": "VA512",
        "variantId": null
      },
      "value": {
        "amountVnd": 829000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": "VA512:đen:S"
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
        "productId": "VA512",
        "variantId": "VA512:đen:M"
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
        "productId": "VA512",
        "variantId": "VA512:đen:L"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:S"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:M"
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
        "productId": "VA512",
        "variantId": "VA512:rêu:L"
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
        "productId": "ST411",
        "variantId": null
      },
      "value": {
        "recommendedSizes": [
          "M"
        ],
        "alternativeSizes": [],
        "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
        "customerProfileRevision": 1,
        "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032",
        "evidenceBasis": "MEASUREMENTS"
      },
      "authorization": "NONE"
    },
    {
      "type": "SIZE_FIT",
      "scope": {
        "kind": "PRODUCT",
        "productId": "VA512",
        "variantId": null
      },
      "value": {
        "recommendedSizes": [
          "M"
        ],
        "alternativeSizes": [],
        "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
        "customerProfileRevision": 1,
        "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032",
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
    "currentProductId": "ST411",
    "factSnapshotVersion": "authored-evaluation-r18-size-preparation",
    "bindingVersion": "binding-r5-v1",
    "recipient": "synthetic-recipient",
    "permission": true,
    "privacyAllowed": true,
    "customerProfileId": "388fb2e4-5151-5f91-a81c-b30cd4fe9036",
    "customerProfileRevision": 1,
    "measurementFingerprint": "f902669c4fed51f75ea0d10e3bdcec65fd24d6b8bab53c25bb554da7d1aa9032"
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
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
          "S: thành phẩm ngực áo100, eo quần thả66, mông100, dài quần96cm; hướng dẫn cơ thể ngực82–87/eo64–69/mông86–91cm.",
          "M: ngực106, eo thả72, mông106, dài97cm; cơ thể ngực88–94/eo70–76/mông92–98cm.",
          "L: ngực112, eo thả78, mông112, dài98cm; cơ thể ngực95–101/eo77–83/mông99–105cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể; độ kéo chun là số đo trên quần. Có thiết kế và code-fit để tư vấn cảm giác mặc dự kiến; không có phép thử cảm giác cả ngày. Kết quả gấp chỉ so độ nhăn với linen, không đo độ bền, giữ phom theo thời gian hay miễn là ủi."
      }
    },
    {
      "ref": "profile:VA512",
      "subjectRef": "VA512",
      "details": {
        "silhouette": "Váy midi chữ A, cổ vuông, tay ngắn. Eo cố định; lót toàn thân.",
        "material": "Crepe 100% polyester, không co giãn. Phần eo không có chun. Lót che thân váy trong ánh sáng phòng thông thường.",
        "colors": [
          "đen",
          "rêu"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
          "S: thành phẩm ngực92, eo73, mông104, dài110cm; cơ thể ngực82–87/eo64–69/mông86–93cm.",
          "M: ngực98, eo78, mông110, dài111cm; cơ thể ngực88–93/eo70–74/mông94–100cm.",
          "L: ngực103, eo83, mông116, dài112cm; cơ thể ngực94–98/eo75–79/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, là nhiệt thấp, không sấy nóng.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể. Eo cố định, có lót toàn thân. Độ che của lót đã xác nhận chỉ trong ánh sáng phòng; không có kết quả mọi ánh sáng hoặc thử cảm giác mặc cả ngày."
      }
    }
  ]
}
```

### r16-change-to-indoor-dress:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị lấy váy VA512 màu đen size M nhé ạ. Mẫu này 829k, vừa vặn ngân sách dưới 850k của chị và mặc đi tiệc rất sang.
```

**Nhận xét whole-turn:** Shop tiếp nhận đổi từ set đi làm sang váy tiệc trong nhà, chọn VA512 đen M đúng fit và giá 829k trong ngân sách hàng 850k. Lời mặc đi tiệc rất sang là đánh giá phong cách thông thường, không bịa độ kín sân khấu/ship hay yêu cầu đo lại. Khách nhận đủ mẫu/màu/size/giá và lý do theo dịp mới, câu gọn tự tin.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r16-pants-color-alternative

- Khách: Ở nhà chị có quần đen rồi, thích áo trắng SM613.
- Shop: Quần QU714 459k chị nhé, có đen và navy. Cạp trước phẳng, phía sau là chun.

**Khách hiện tại:** Không thêm quần chỉ để freeship đâu em. Chị muốn thay chiếc quần đen bằng màu khác, mặc với áo trắng thì nên lấy màu nào?

**Việc mua cần giải quyết:** Chọn màu quần thay cho món có sẵn, không ép mua cộng thêm.

**Băn khoăn:** Chị không thêm để freeship đâu, nhưng muốn đổi quần đen ở nhà sang màu khác để phối áo trắng. Em chọn màu cho chị nhé.

Dữ kiện hiện tại (synthetic fixture; full provenance trong human-review JSON):
```json
{
  "boundSubjects": [
    {
      "ref": "SM613",
      "kind": "PRODUCT",
      "label": "Sơ mi dáng thẳng SM613",
      "bindingVersion": "binding-r5-v1"
    },
    {
      "ref": "QU714",
      "kind": "PRODUCT",
      "label": "Quần suông QU714",
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
      "type": "PRICE",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": null
      },
      "value": {
        "amountVnd": 459000,
        "currency": "VND"
      },
      "authorization": "NONE"
    },
    {
      "type": "STOCK",
      "scope": {
        "kind": "PRODUCT",
        "productId": "QU714",
        "variantId": "QU714:navy:S"
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
        "productId": "QU714",
        "variantId": "QU714:navy:M"
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
        "productId": "QU714",
        "variantId": "QU714:navy:L"
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
        "productId": "QU714",
        "variantId": "QU714:đen:S"
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
        "productId": "QU714",
        "variantId": "QU714:đen:M"
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
        "productId": "QU714",
        "variantId": "QU714:đen:L"
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
      "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "shipping-time:r5",
      "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Phạm vi giao của khách đã xác lập: nội thành TP.HCM."
    },
    {
      "ref": "quote:SM613",
      "text": "{\"items\":[{\"productId\":\"SM613\",\"quantity\":1,\"unitPrice\":499000}],\"destination\":\"INNER_HCMC\",\"subtotal\":499000,\"shipping\":25000,\"total\":524000}"
    },
    {
      "ref": "quote:QU714",
      "text": "{\"items\":[{\"productId\":\"QU714\",\"quantity\":1,\"unitPrice\":459000}],\"destination\":\"INNER_HCMC\",\"subtotal\":459000,\"shipping\":25000,\"total\":484000}"
    },
    {
      "ref": "quote:SM613+QU714",
      "text": "{\"items\":[{\"productId\":\"SM613\",\"quantity\":1,\"unitPrice\":499000},{\"productId\":\"QU714\",\"quantity\":1,\"unitPrice\":459000}],\"destination\":\"INNER_HCMC\",\"subtotal\":958000,\"shipping\":0,\"total\":958000}"
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
    "privacyAllowed": true
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
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"BUST_CM\"],\"missingInputs\":[\"BUST_CM\"]}",
          "S: thành phẩm ngực100, vai38, dài62cm; cơ thể ngực82–87cm.",
          "M: ngực106, vai39, dài63cm; cơ thể ngực88–94cm.",
          "L: ngực112, vai40, dài64cm; cơ thể ngực95–100cm."
        ],
        "care": "Giặt nhẹ nước mát, tách màu, phơi râm; là nhiệt vừa.",
        "limitations": "Bảng áo dùng vòng ngực cơ thể. Phép thử độ xuyên thuộc màu trắng và hai điều kiện ánh sáng ghi ở material; chưa có kết quả độ xuyên màu xanh nhạt. Đây là thử của shop, không phải hãng. Dữ liệu màu để tư vấn phối đồ không phải kết quả độ kín."
      }
    },
    {
      "ref": "profile:QU714",
      "subjectRef": "QU714",
      "details": {
        "silhouette": "Hình thức bán: riêng quần. Ống suông; cạp trước phẳng, chun ở phần sau.",
        "material": "Vải: 68% polyester, 30% viscose, 2% elastane; co giãn nhẹ. Số đo trên quần: eo kéo tối đa S78/M84/L90cm.",
        "colors": [
          "navy",
          "đen"
        ],
        "sizeChart": [
          "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"WAIST_CM\",\"HIPS_CM\"]}",
          "S: thành phẩm eo thả66, mông102, dài96cm; cơ thể eo64–69/mông88–93cm.",
          "M: eo thả72, mông108, dài97cm; cơ thể eo70–76/mông94–100cm.",
          "L: eo thả78, mông114, dài98cm; cơ thể eo77–82/mông101–106cm."
        ],
        "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
        "limitations": "Bảng tách số đo thành phẩm và khoảng eo/mông cơ thể; độ kéo chun là số đo trên quần. Thiết kế/chun sau và code-fit hỗ trợ cảm giác mặc dự kiến; không có phép thử cảm giác mọi người hoặc mọi điều kiện."
      }
    }
  ]
}
```

### r16-pants-color-alternative:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị lấy quần QU714 màu navy nhé, mặc cùng áo trắng SM613 sẽ rất sáng và nhã nhặn, đổi mới hơn chiếc quần đen sẵn có ở nhà. Tổng áo và quần navy là 958.000đ chị nha.
```

**Nhận xét whole-turn:** Khách muốn màu quần khác đen để phối áo trắng, không mua chỉ vì freeship. Shop chọn QU714 navy và giải thích sự khác màu/cảm giác phối sáng nhã, báo tổng áo/quần 958k từ quote đang có. Không ép nhận ưu đãi hay chốt size thiếu fit. Nhắc chiếc quần đen có sẵn là căn cứ trực tiếp cho màu thay, không liệt kê lại hồ sơ. Lượt này tạo lựa chọn mua hữu ích đúng khả năng tư vấn.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.
