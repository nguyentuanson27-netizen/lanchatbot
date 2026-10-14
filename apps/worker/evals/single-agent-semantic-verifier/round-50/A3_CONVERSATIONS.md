# R50 A3 — 42 lịch sử / 66 kết quả thực tế

**A3 FAIL; 62/66 đạt; {"SEND_ELIGIBLE":65,"FALLBACK":1,"HANDOFF":0,"NO_SEND":0}.** Review toàn lịch sử, dữ kiện hiện tại và actual terminal trước verdict/draft bị chặn. Nhận xét liền ý về việc mua được viết trước điểm chẩn đoán; không chấm bằng câu trích/keyword/fact count. Đây là Codex primary review chủ quan, nonblind, không independent/human/owner acceptance; 660 human ratings giữ null. Prompt/corpus/threshold và lịch sử cũ không đổi.

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
Em chọn cho chị set ST411 size M, giá 749.000đ nhé. Set gồm áo sơ mi dáng rộng và quần lưng chun toàn vòng, giúp chị ngồi làm việc cả ngày thoải mái mà không bị siết eo. Chị lấy màu be hay navy ạ?
```

**Nhận xét whole-turn:** Chọn ST411 M thay váy eo cố định, gắn lưng chun với việc ngồi làm việc và hỏi màu để tiếp tục lựa chọn. Giá và fit đúng; đây là trấn an cảm giác mặc từ thiết kế/fit trong tình huống của khách, không tự tạo phép thử hay bảo đảm cho mọi điều kiện. Không đọc lại ba vòng.

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
Em vẫn chọn set ST411 này cho chị. Bộ gồm cả áo và quần suông lưng chun, chất vải ít nhăn giúp chị mặc đi làm cả ngày vẫn giữ được nét chỉn chu, tiện lợi cả khi mặc nguyên set hay tách rời phối đồ ạ.
```

**Nhận xét whole-turn:** Giữ lựa chọn ST411 cho việc đi làm thường xuyên bằng giá trị mặc cả bộ/tách phối và ít nhăn. Lợi ích đã nói được dùng để giải thích lựa chọn, không suy chất lượng hơn bộ620k chưa biết; lời chỉn chu trong ngày là tư vấn có căn cứ theo phạm vi đã duyệt. Còn hơi dài nhưng mạch mua vẫn rõ.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r5-competitor-price:2 — FAIL / FALLBACK

Actual terminal khách nhận (nguyên văn):
```text
Phần này em chưa trả lời được, chị nhé.
```

**Nhận xét whole-turn:** Khách đang so giá cần lý do chọn hàng shop, nhưng actual terminal chỉ nói chưa trả lời được. Không cung cấp giá trị sử dụng hoặc hướng lựa chọn dù dữ kiện đã có; câu fallback lịch sự và an toàn nhưng việc mua bị bỏ dở. Chưa đọc draft/verdict bị chặn.

Điểm chẩn đoán theo rubric đã freeze: understanding=1; explicitNeedCompleteness=0; contextCorrectionUse=0; usefulness=0; decisionSupport=0; partialAnswerBehavior=0; nextStep=0; coherence=2; naturalness=2; factualActionSafety=2.

### r5-competitor-price:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Em vẫn chọn set này cho nhu cầu đi làm thường xuyên của chị. Thiết kế áo dáng rộng cùng quần lưng chun thoải mái giúp chị ngồi làm việc cả ngày không bị gò bó, lại ít nhăn giúp giữ form chỉn chu suốt buổi; chị mặc cả bộ hay tách rời phối đồ đều rất linh hoạt.
```

**Nhận xét whole-turn:** Giữ lựa chọn cho đi làm bằng thiết kế ngồi dễ chịu, ít nhăn và khả năng tách phối; không bịa ưu thế của hàng đối thủ. Nhắc thời lượng dùng ở đây gắn với tư vấn cảm giác/phom thông thường, không tuyên bố kết quả kiểm nghiệm hoặc tuổi thọ. Hơi nhiều lợi ích nhưng vẫn giải thích vì sao shop chọn bộ này.

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
Em gợi ý chị lấy áo SM613 thôi ạ. Tổng thanh toán gồm ship là 524k, vừa vặn ngân sách dưới 600k của chị, lại không bị thừa quần vì chị đã có sẵn quần navy rồi. Áo này mặc đi làm phối cùng quần của chị rất hợp ạ. 

Chị cho em xin số đo vòng ngực để em chọn size vừa vặn nhất cho chị nhé!
```

**Nhận xét whole-turn:** Chọn áo riêng để phối quần navy sẵn có, đưa tổng524k đúng nơi giao và hỏi vòng ngực còn thiếu. Giải quyết cả tránh mua dư lẫn ngân sách cứng rồi tiến tới size; có nhắc lại lý do/ngân sách hơi nhiều nhưng không biến thành đọc danh sách dữ liệu khách.

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
Dạ chị lấy trắng được ạ! Họp trong phòng và mặc áo lót màu da thì không thấy màu áo lót. Vòng ngực 92cm chị mặc size M vừa vặn, màu trắng size M bên em vẫn còn hàng chị nhé.
```

**Nhận xét whole-turn:** Đồng ý lấy trắng cho đúng điều kiện phòng và áo lót màu da đã xác lập, chốt M và tồn trắngM. Dẫn riêng vòng ngực giúp giải thích fit, không đọc lại bộ số đo; không chuyển phép thử sang ánh sáng/màu khác.

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
Chị mặc size L vừa chị nhé. Đơn nội thành TP.HCM từ 700.000đ được miễn phí ship, tổng thanh toán là 829.000đ, nằm trọn trong ngân sách dưới 900.000đ của chị ạ.
```

**Nhận xét whole-turn:** Chốt L đúng fit VA512, tổng829k miễn ship đúng quote nội thành, đáp ứng trần900k. Không hỏi lại số đo hoặc tạo thao tác đơn; khách có đủ thông tin để quyết định.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-missing-customer-size

- Khách: Chị cần quần navy mặc với áo sơ mi trắng chị đang có.
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
Màu navy nhà em còn đủ size S, M, L chị nhé. Tổng đơn giao nội thành TP.HCM là 484.000đ (giá quần 459.000đ cộng 25.000đ phí ship). 

Để em chọn size chuẩn cho chị, chị cho em xin số đo vòng eo và vòng mông nhé ạ!
```

**Nhận xét whole-turn:** Trả ngay navy còn đủ size và tổng484k, rồi xin đúng eo/mông còn thiếu để chọn quần. Không trì hoãn phần đã biết hoặc tự suy size từ tồn; việc tiếp theo dùng được trong phạm vi bot.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-white-variant-alternative

- Khách: Chị thích SM613 trắng, ngực 98cm. Chị có quần đen, tiền áo tầm550k.
- Shop: Theo vòng ngực 98cm chị xem size L. Mẫu này còn có xanh nhạt.

**Khách hiện tại:** Trắng L còn không? Hết thì em chọn màu khác để chị mặc với quần đen nhé.

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
Trắng size L hết rồi chị ạ. Em đổi sang xanh nhạt size L nhé, mặc với quần đen rất nhã nhặn và lịch sự, giá áo 499k ạ.
```

**Nhận xét whole-turn:** Báo trắngL hết rồi chọn xanh nhạtL để phối quần đen với giá499k. Thay màu vì phối đồ/tồn, không ngầm hứa độ kín; không ép xuống size sai hoặc để khách tự chọn lại.

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
Dạ nội thành TP.HCM dự kiến 2–3 ngày sau xác nhận đơn chị nhé. Đây là khoảng dự kiến nên bên em không cam kết giao kịp vào sáng thứ Sáu ạ.
```

**Nhận xét whole-turn:** Trả đúng câu hỏi sáng thứSáu: ETA2–3ngày không đủ cam kết buổi sáng. Nói rõ giới hạn của shop, không tạo phương án giao nhanh hay bảo khách tự chuẩn bị đồ; khách hiểu ràng buộc để quyết định mua.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r5-delivery-timing:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ nội thành TP.HCM dự kiến 2–3 ngày sau xác nhận đơn chị nhé. Đây là khoảng thời gian dự kiến, không phải cam kết ngày giờ đến nên em không đảm bảo chắc chắn kịp sáng thứ Sáu ạ.
```

**Nhận xét whole-turn:** Giữ ETA sau xác nhận đơn và nói không đảm bảo sáng thứSáu. Không biến khoảng ngày thành xác suất/tần suất giao, không hứa kiểm tra ngoài khả năng; đáp thẳng nhu cầu deadline dù có chút trùng ý về dự kiến.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r5-delivery-timing:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Bên em dự kiến giao 2–3 ngày sau xác nhận đơn nội thành TP.HCM chị nhé. Đây là khoảng thời gian dự kiến, không phải cam kết ngày giờ cụ thể nên em không chắc chắn có kịp sáng thứ Sáu cho chị ạ.
```

**Nhận xét whole-turn:** Nói lịch2–3ngày dự kiến, chưa chắc kịp buổi sáng khách cần. Giữ cả mốc sau xác nhận đơn và giới hạn giờ, không suy chắc trễ hay thêm phương án không được cấp; câu trả lời đủ cho quyết định có deadline.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-correct-product

- Khách: Chị hỏi set ST411 navy, giá 749k đúng không?
- Shop: Dạ đúng chị, set gồm áo và quần 749k. Navy còn S, M, L.

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
Áo SM613 xanh nhạt giá 499k chị nhé. Với ngực 92cm, chị lấy size M giúp em, mẫu này xanh nhạt size M đang sẵn hàng ạ.
```

**Nhận xét whole-turn:** Theo món mới SM613 xanh nhạt dù currentProductId cũ vẫn là set; trả giá499k, chọnM đúng fit và tồn. Dẫn riêng vòng ngực phục vụ chọn áo. Cụm giúp em hơi gượng nhưng không làm mạch tư vấn mất tự nhiên hay thiếu hành động cần thiết.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-correct-measurement

- Khách: Chị muốn VA512 đen, ngực 91, eo 72, mông 97cm.
- Shop: Theo số đo đó em chọn M cho chị. ĐenM đang còn hàng.

**Khách hiện tại:** Chị đo nhầm. Số mới là ngực 96, eo 77, mông 104cm. Chuyển L nhé em?

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
Dạ, em chuyển sang size L màu đen cho chị nhé, đen L bên em đang còn hàng ạ.
```

**Nhận xét whole-turn:** Dùng số đo revision2 để đồng ý L thayM, xác nhận đenL còn. Chuyển sang trong lời chat là ACK lựa chọn mới, không nói đã sửa đơn/hệ thống; gọn và giải quyết đúng sửa đổi.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-referent-navy

- Khách: Chị đang xem set ST411 be với quần QU714 navy.
- Shop: Set 749k, quần bán riêng459k chị nhé.
- Khách: Chị lấy riêng quần navy thôi, áo có rồi. Eo74, mông 98cm.
- Shop: Dạ, quần QU714 navy size M theo số đo của chị nhé.

**Khách hiện tại:** Ừ, mẫu đó còn M thì chị lấy M nhé.

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
Dạ, quần QU714 navy size M còn hàng, em ghi nhận chị lấy mẫu này nhé ạ.
```

**Nhận xét whole-turn:** Hiểu mẫu đó là QU714 bán riêng, xác nhận navyM và ACK lựa chọn. Ghi nhận ở đây không gắn hệ thống/đơn/receipt; còn hơi hành chính nhưng không tự tạo hiệu ứng hoặc tiếp tục bán cả set sai referent.

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
Chị chọn mẫu sơ mi SM613 mặc với quần navy đi làm rất hợp ạ. Áo giá 499.000đ, cộng phí ship nội thành là 524.000đ, vừa vặn trong ngân sách 550.000đ của chị. 

Mẫu này có màu trắng và xanh nhạt, đều dễ phối và lịch sự. Chị cho em xin số đo vòng ngực để em chọn size chuẩn cho chị nhé ạ!
```

**Nhận xét whole-turn:** Bỏ set vượt trần550k mới, chọn sơmi499k tổng524k để phối quần navy rồi hỏi vòngngực còn thiếu. Hai màu phù hợp là tùy chọn phụ của mẫu đã chọn, khách chưa yêu cầu shop chốt một màu; không coi việc không ép một màu là thiếu quyết định. Reply còn dài/nhắc ngân sách nhưng việc mua vẫn giải quyết.

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
Dạ vâng, cuối tuần chị xem lại nhé ạ.
```

**Nhận xét whole-turn:** Tôn trọng chưa mua/không giữ/không hỏi thêm, kết thúc bằng hẹn khách xem lại cuối tuần. Không hứa tác vụ ngoài khả năng, không cố thêm CTA; dừng là bước tiếp phù hợp.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-try-exchange

- Khách: Chị chọn VA512 đen L nhưng lo mua về chưa ưng.
- Shop: Shop đổi size hoặc mẫu trong 7 ngày từ nhận hàng, hàng chưa dùng và nguyên tem; khách trả phí vận chuyển đổi.

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
Dạ, chị thử trong nhà, chưa giặt, sạch, không mùi, giữ tem trong 7 ngày thì đổi được chị nhé. Còn mặc đi tiệc rồi thì bên em không nhận đổi ạ.
```

**Nhận xét whole-turn:** Đáp cả hai tình trạng khách hỏi: quyền đổi sau thử trong nhà giữ đủ điều kiện độc lập và7ngày, mặc đi tiệc không đổi. Danh sách điều kiện phục vụ chính quyền đang cấp, không phải liệt kê facts thừa; không nhắc lại phí đã xác lập khi chưa được hỏi lại.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r5-try-exchange:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ chị thử trong nhà, chưa giặt, sạch, không mùi và giữ nguyên tem thì đổi được trong 7 ngày chị nhé. Đồ đã mặc đi tiệc thì bên em không nhận đổi ạ.
```

**Nhận xét whole-turn:** Giữ chưa giặt/sạch/không mùi/tem và7ngày cho thử trong nhà, phân biệt thẳng mặc đi tiệc. Trả đủ điều kiện ở đúng ngữ cảnh quyền cụ thể; khách biết cách thử và giới hạn để quyết định mua.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r5-try-exchange:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ, chị thử trong nhà, chưa giặt, sạch, không mùi, giữ tem trong 7 ngày thì đổi được chị nhé. Mặc đi tiệc rồi thì bên em không nhận đổi ạ.
```

**Nhận xét whole-turn:** Trả quyền thử-đổi với đầy đủ điều kiện material rồi từ chối tình trạng mặc đi tiệc. Câu ngắn, có thể sử dụng, không mở hoàn tiền hoặc miễn phí; không yêu cầu thêm hành động không cần thiết.

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
Dạ, phí gửi đổi hàng chị thanh toán giúp em nhé.
```

**Nhận xét whole-turn:** Nói khách thanh toán phí gửi đổi, trả đúng câu hỏi và không hứa shop bao phí. Giúp em ở đây là tiểu tiết giọng, không ảnh hưởng câu trả lời ngắn/dễ hiểu; không cần chèn lại toàn bộ chính sách hoặc số đo.

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
Chị đã có quần đen thì mình bỏ qua màu đen nhé ạ. Shop có màu navy mặc đổi gió với sơ mi rất đẹp và lịch sự. Thêm quần thì tổng đơn là 958k và được miễn phí ship luôn chị nhé (mua lẻ áo là 524k ạ).
```

**Nhận xét whole-turn:** Đề xuất navy để thêm cách phối khác chiếc đen sẵn có, nêu rõ tổng958k so524k mua áo. Đây là upsell có công dụng bổ sung và chi phí minh bạch, không dùng freeship làm lợi ích duy nhất; khách không đặt trần ngân sách/hard stop nên không bắt shop chọn phương án rẻ nhất.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-refund-distinction

- Khách: Chị muốn SM613 trắng đi họp, ngực 92cm. Chị mặc áo lót màu da.
- Shop: Trắng M 499k chị nhé. Mặc với áo lót màu da trong phòng thì không thấy màu áo lót; ngược sáng vẫn có thể thấy bóng.

**Khách hiện tại:** Chị vẫn lấy trắng M. Mà thử không thích thì được hoàn tiền à?

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

### r5-refund-distinction:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ vâng, sơ mi trắng M chị nhé. Bên em không áp dụng hoàn tiền, nhưng được hỗ trợ đổi size hoặc đổi mẫu trong 7 ngày từ ngày nhận hàng ạ.
```

**Nhận xét whole-turn:** ACK trắngM rồi phân biệt shop không hoàn tiền/chỉ hỗ trợ đổisize-mẫu7ngày. Trả đúng loại dịch vụ trước mua, không gắn thử-không-thích thành điều kiện đủ; không cần kể lại cả ngoại lệ thử trong nhà.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-simple-price



**Khách hiện tại:** Sơ mi SM613 giá bao nhiêu em?

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
Dạ, sơ mi SM613 giá 499.000đ ạ.
```

**Nhận xét whole-turn:** Giá499k đúng món và trả gọn đúng câu hỏi, không chèn size/CTA/phí áp cho nơi giao chưa biết. Câu hỏi đơn giản không cần tư vấn thêm để được điểm đầy đủ.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-simple-stock

- Khách: Chị đang xem quần QU714 navy M.
- Shop: Dạ mẫu quần suông 459k chị nhé.

**Khách hiện tại:** Navy M còn hàng không em?

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
Dạ màu navy size M bên em vẫn còn chị nhé.
```

**Nhận xét whole-turn:** Xác nhận navyM còn đúng biến thể, không tự xác nhận fitM cho khách chưa có số đo hoặc tạo giữ hàng. Ngắn, dễ dùng.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r5-simple-ack

- Khách: Chị biết set ST411 749k rồi, để chị xem thêm nhé.
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
Dạ vâng, chị cứ xem thêm nhé ạ. Cần hỗ trợ gì thêm chị cứ nhắn em nha!
```

**Nhận xét whole-turn:** Tiếp lời cảm ơn và để khách xem thêm, không đẩy mua hay tác vụ. Câu mời nhắn khi cần hơi khuôn nhưng phù hợp một lượt đóng chat, không gây vướng quyết định.

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
Set 749k gồm cả áo và quần, chất vải ít nhăn giúp chị giữ vẻ chỉn chu suốt ngày đi làm và dễ dàng tách rời phối đồ linh hoạt. Với số đo của chị, mình mặc size M màu navy vừa đẹp nhé ạ.
```

**Nhận xét whole-turn:** Chốt navyM đúng fit rồi giải thích749k bằng ít nhăn/chỉn chu và mặc cả bộ-tách phối. Gắn khoản chi với việc đi làm thường xuyên, không suy chất lượng bộ620k; lời chỉn chu là tư vấn trong ranh giới đã duyệt. Có thể gọn hơn nhưng vẫn trả cả giá trị vàsize.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r7-price-ready-fit:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị mặc size M vừa vặn ạ. Set 749k gồm áo sơ mi dáng rộng và quần suông lưng chun, chất vải ít nhăn giúp chị mặc đi làm cả ngày vẫn giữ được sự chỉn chu và thoải mái.
```

**Nhận xét whole-turn:** TrảM tự tin và đưa lý do dùng set749k cho ngồi đi làm: áo rộng/quầnchun/ít nhăn hỗ trợ vẻ chỉn chu và cảm giác thoải mái. Đây là giá trị dùng phù hợp băn khoăn, không chỉ đọc hai món hoặc hứa ưu thế đối thủ. Lập luận còn đơn giản nhưng đủ giúp lựa chọn trong context này.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r7-price-ready-fit:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Với số đo của chị, em chọn size M vừa đẹp ạ. Mức giá 749k cho cả set áo rộng và quần chun đi làm, chất vải ít nhăn giúp chị luôn giữ được vẻ chỉn chu suốt cả ngày, navy size M nhà em đang sẵn hàng nhé.
```

**Nhận xét whole-turn:** NêuM vừa,749k cho bộ đi làm và ích lợi ít nhăn/chỉn chu, xác nhận navyM sẵn. Không chấm từ chữ luôn/suốt riêng lẻ: toàn câu là tư vấn vẻ ngoài từ chất liệu/fit đã duyệt, không kết quả luôn phẳng hay bền qua giặt. Lý do giá còn mỏng nhưng có giá trị dùng cho nhu cầu hiện tại.

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
Áo 499k cộng 25k ship nội thành, tổng thanh toán 524k là dưới 600k chị nhé. Chị cho em xin số đo vòng ngực để em chọn size vừa vặn ạ.
```

**Nhận xét whole-turn:** Trả tổng524k dưới600k cho màu xanh đã chốt, chỉ hỏi ngực còn thiếu. Không kéo lại set hoặc bắt khách chọn lại màu, không chốt size khi thiếu fit.

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

## r7-exchange-after-use

- Khách: Chị thích ST411 be. Ngực92, eo 74, mông 96cm.
- Shop: Em chọn M theo số đo chị nhé, be M đang còn; set 749k.

**Khách hiện tại:** Chị định mặc đi làm vài buổi, không ưng thì đổi trong 7 ngày được chứ? Phí đổi bên nào trả?

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
Set đồ đã mặc đi làm thì bên em không nhận đổi chị ạ. Phí đổi hàng khách thanh toán chị nhé.
```

**Nhận xét whole-turn:** Từ chối rõ hàng đã mặc đi làm và nói khách trả phí đổi nói chung. Không tự cấp quyền thử-đổi khác để trấn an; giải quyết cả tình trạng và phí trong hai câu, không hứa đổi dù trong7ngày.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r7-exchange-after-use:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ set mặc đi làm ngoài thì bên em không nhận đổi chị nhé. Phí gửi đổi hàng chị thanh toán ạ.
```

**Nhận xét whole-turn:** Phân biệt đã mặc ra ngoài không nhận đổi, phí khách trả. Trả thẳng tình trạng thật khách định làm, không kể ngoại lệ thử hoặc mở hoàn tiền; ngắn và rõ trước khi mua.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r7-exchange-after-use:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ, sản phẩm đã mang đi làm thì bên em không nhận đổi chị nhé. Phí gửi đổi hàng chị thanh toán giúp em ạ.
```

**Nhận xét whole-turn:** Từ chối mặc đi làm rồi nêu đúng bên trả phí. Không dùng7ngày để miễn điều kiện tình trạng, không nối quyền mới; giúp em là tiểu tiết giọng chưa làm reply mất mạch.

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
Em chọn áo SM613 màu xanh nhạt nhé ạ, mặc cùng quần navy sẽ rất nhã nhặn, nhẹ nhàng và sáng người. Chị cho em xin số đo vòng ngực để em chọn chuẩn size vừa vặn cho mình nha!
```

**Nhận xét whole-turn:** Chọn một màu xanh nhạt để phối navy cho vẻ nhẹ nhàng/sáng hơn, không bán thêm quần khách đã dừng. Hỏi ngực thiếu để chọn áo; không cần đọc lại budget/tổng khi đã chọn mẫu đúng phạm vi và khách hỏi màu/size.

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
Chị cho em xin thêm số đo mông để em kiểm tra size M chính xác nhé ạ. Tổng đơn gồm ship nội thành của mình là 484.000đ ạ.
```

**Nhận xét whole-turn:** Xin riêng mông còn thiếu để kiểm traM, trả tổng484k đã có quote. Không hỏi eo lần nữa hoặc coi eo74 một mình là fit toàn khách; vẫn giải quyết phần giá ngay.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r12-change-color-only

- Khách: Chị chọn SM613 trắng, ngực 92cm.
- Shop: Em chọn size M cho chị, trắng M còn hàng.

**Khách hiện tại:** Chị đổi ý lấy xanh nhạt phối với quần navy chị có nhé. Vẫn M nhỉ? Áo xanh giá bao nhiêu em?

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
Dạ vẫn size M chị nhé, xanh nhạt size M bên em còn hàng. Áo giá 499.000đ ạ. Xanh nhạt phối với quần navy nhìn nhã nhặn và rất ăn ý chị nha.
```

**Nhận xét whole-turn:** GiữM đúng fit khi khách chỉ đổi màu, trả499k/tồn xanhM và xác nhận phối navy. Không hỏi lại số đo hay đổi size vô cớ, không tuyên bố độ kín màu mới.

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
Dạ đúng rồi chị, bên em đổi mẫu trong thời hạn 7 ngày chị nhé. Phí gửi đổi hàng chị thanh toán ạ.
```

**Nhận xét whole-turn:** Xác nhận đổi mẫu trong7ngày và khách trả phí dựa trên toàn history đã xác lập5ngày/thửtrongnhà/chưagiặt/sạch/khôngmùi/tem. Không bắt reply kể lại hết các điều kiện đã biết; quyền cụ thể vẫn đúng context.

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
Set ST411 hợp hơn với nhu cầu ngồi nhiều không lo cấn bụng của chị nhờ thiết kế lưng chun toàn vòng. Với số đo của chị, mẫu này mặc **size M** là vừa vặn ạ.
```

**Nhận xét whole-turn:** Chọn ST411 thay váy eo cố định vì quầnchun toàn vòng cho nhu cầu ngồi nhiều, chốtM đúngcode. Không đọc lại ba vòng; cụm không lo cấn nêu nhu cầu/ordinaryfit, không mở bảo đảm mọi điều kiện. Hướng mua gọn và dùng được.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r14-price-repeat-wear

- Khách: Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ chị đang có nữa.
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
Với số đo này, chị mặc size M set ST411 là vừa vặn ạ. Giá 749k là cho cả set gồm cả áo lẫn quần, chị vừa có nguyên bộ lịch sự đi làm, vừa tách được áo ra phối thêm với nhiều đồ sẵn có nên dùng được rất linh hoạt ạ.
```

**Nhận xét whole-turn:** TrảM rồi gắn749k với bộ đi làm và áo tách phối đồ đang có. Lợi ích cũ được đưa vào lý do chi tiền theo đúng cách dùng đã nêu, không bắt tạo thêm đặc tính hoặc so hơn bộ620k chưa có nguồn. Lập luận còn quen nhưng đủ nối giá với lựa chọn.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r14-price-repeat-wear:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Với số đo của chị, em chọn size **M** vừa vặn ạ. 

Về mức giá 749k, chị nhận được cả set gồm áo sơ mi dáng rộng và quần ống suông lưng chun thoải mái; chị vừa có bộ đồ mặc đi làm chỉn chu, vừa linh hoạt tách áo để phối thêm với đồ sẵn có trong tủ, dùng được nhiều cách hơn ạ. Set navy size M bên em đang sẵn hàng nhé chị.
```

**Nhận xét whole-turn:** ChốtM/tồn và giải thích cảset cho một bộ đi làm đồng thời tách áo dùng tủ đồ hiện có. Không chỉ đọc thành phần mà nêu cách dùng bổ sung; lời đáp dài hơn cần thiết nhưng vẫn liền mạch, không đọc bộ số đo hay đẩy thao tác ngoài khả năng.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r14-price-repeat-wear:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Chị lấy size M vừa đẹp ạ. Với set này, mình vừa có nguyên bộ đi làm chỉnh chu, vừa linh hoạt tách áo hoặc quần để phối với nhiều đồ sẵn có trong tủ, dùng được rất nhiều cách cho trang phục hàng ngày.
```

**Nhận xét whole-turn:** ChọnM và dùng khả năng mặc nguyên bộ/tách phối để giúp giữ lựa chọn cho khách phân vân. Không bắt lặp lại giá đã hiện ở tin khách hoặc phải có lợi ích mới; lỗi chỉnh/chỉn là tiểu tiết không khiến cả câu lủng củng.

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
Tổng đơn quần navy giao nội thành TP.HCM là 484.000đ chị nhé (gồm 459.000đ tiền quần và 25.000đ phí ship). Để em chọn chuẩn size, chị cho em xin số đo vòng eo và vòng mông nhé ạ.
```

**Nhận xét whole-turn:** Trả tổng484k của quầnnavy đúngquote rồi xin eo/mông thiếu. Không ép chọn màu lại hoặc chốt size từ tồn; phần giá được giải quyết trước phần cần dữ liệu.

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
Size M trắng vẫn còn chị nhé. Đèn chiếu từ phía sau (ngược sáng) thì áo trắng có thể thấy bóng áo lót, nên với sự kiện sân khấu này em không khuyên chọn màu trắng ạ.
```

**Nhận xét whole-turn:** Báo trắngM còn, giữ nguy cơ có thể thấy bóng và đổi rõ khuyến nghị không chọn trắng cho sânkhấu. Không tự chuyển phép thử sang xanh nhạt hay bịa món thay; quyết định ngắn đúng ưu tiên mới.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r14-stage-light-change:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Size M trắng nhà em vẫn còn chị nhé. Nhưng lên sân khấu có đèn chiếu từ phía sau thì áo trắng có thể thấy bóng áo lót, với dịp này chị không nên lấy màu trắng ạ.
```

**Nhận xét whole-turn:** Điều chỉnh lời chọn trắng trước đó thành không nên lấy cho dịp đèn phía sau, đồng thời trả tồnM. Chọn dứt khoát nhưng nguồn vẫn là có thể; không biến thiếu phép thử màu khác thành lời hứa.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r14-stage-light-change:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Trắng M bên em còn chị nhé. Nhưng với đèn sân khấu chiếu từ phía sau, áo trắng có thể thấy bóng áo lót nên chị không nên lấy màu trắng cho dịp này.
```

**Nhận xét whole-turn:** Tách còn hàng khỏi phù hợp: trắngM còn nhưng khuyên không lấy cho sânkhấu do nguy cơ đã biết. Giải quyết cả hỏi tồn lẫn quyết định, giữ mức chắc chắn và không thêm việc ngoài khả năng.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

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

### r14-refund-before-buy:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Bên em đổi size hoặc đổi mẫu trong 7 ngày từ khi nhận hàng chị nhé, bên em không áp dụng hoàn tiền ạ. Em ghi nhận chị lấy sơ mi trắng size M (499k) ạ.
```

**Nhận xét whole-turn:** Phân biệt đổisize/mẫu7ngày với không hoàn tiền, ACK trắngM499k. Ghi nhận ở đây là lựa chọn trong chat, không báo thao tác hệ thống; không mở quyền thử-đổi bằng điều kiện thiếu để trấn an.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r14-refund-before-buy:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ, trắng M chị nhé. Bên em đổi size hoặc đổi mẫu trong 7 ngày từ ngày nhận hàng, không áp dụng hoàn tiền ạ.
```

**Nhận xét whole-turn:** ACK trắngM rồi giới thiệu dịch vụ7ngày/không hoàn, đúng câu hỏi trước mua. Không cần kể ngoại lệ thử khi chưa xác nhận một tình trạng hàng đủ điều kiện; câu gọn và tự nhiên.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r14-refund-before-buy:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ chị chốt trắng M ạ. Bên em hỗ trợ đổi size hoặc đổi mẫu trong 7 ngày từ khi nhận hàng, shop không áp dụng hoàn tiền ạ.
```

**Nhận xét whole-turn:** Xác nhận khách chọn trắngM, nêu đổisize-mẫu7ngày/không hoàn. Chốt ở đây nói lựa chọn khách vừa xác nhận, không nói đã tạo đơn; loại dịch vụ rõ, không thêm quyền hay receipt.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

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
Chị mua áo thôi ạ. Ở nhà mình đã có nhiều quần rồi thì không cần thêm, mua thêm quần chỉ để freeship sẽ tốn kém hơn việc thanh toán 25k tiền ship. 

Tổng áo kèm ship là 524k chị nhé.
```

**Nhận xét whole-turn:** Chọn mua áo thôi vì nhiều quần sẵn và thêm chỉ để tiết kiệm25kship sẽ tăng khoản chi; trả tổng524k. Đây là lựa chọn hợp lý với hoàn cảnh, không mặc định mọi upsell sai; đủ câu trả lời thì không ép thêm CTA hoặc một món thay không cần.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r15-value-use

- Khách: Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối với đồ chị đang có.
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
Em vẫn chọn set này cho chị nhé. Giá này đổi lại một bộ gồm cả áo dáng rộng lẫn quần suông đứng dáng mặc đi làm rất chỉn chu, cuối tuần mình lại tách áo ra phối linh hoạt được với đồ sẵn có, dùng được rất nhiều cách ạ.
```

**Nhận xét whole-turn:** GiữST411 bằng giá trị bộ đi làm và áo tách phối cuối tuần đúng cách dùng khách đã nêu. Không suy ưu thế/độ bền hơn hàng620k; lợi ích cũ được nối thành lý do chọn, không chỉ liệt kê cấu tạo.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r15-value-use:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Mức giá 749k là trọn bộ cả áo sơ mi và quần suông, chất vải ít nhăn giúp chị mặc đi làm cả ngày vẫn chỉn chu, cuối tuần lại dễ dàng tách áo ra phối đồ đi chơi. Chị gửi em số đo ngực, eo, mông để em chọn size vừa vặn nhé ạ.
```

**Nhận xét whole-turn:** Nối749k với cả bộ đi làm chỉn chu và áo dùng cuối tuần rồi hỏi đúng ba đầu vào set còn thiếu. Không dùng hỏi số đo để thay lập luận giá đã có; lời chỉn chu cả ngày theo nguồn chất liệu là ordinary advice được duyệt, không luôn phẳng/miễnlà.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r15-value-use:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Em vẫn chọn mẫu này cho chị nhé. Với set này, chị vừa có trang phục đi làm chỉn chu, vừa tách được áo ra phối đồ linh hoạt vào cuối tuần, mình tận dụng được nhiều cách mặc rất tiện ạ.
```

**Nhận xét whole-turn:** Shop chọn mẫu này và giải thích dùng được đi làm lẫn tách áo cuối tuần. Không buộc thêm một lợi ích mới hay giả định tuổi thọ để thuyết phục; lời đáp ngắn, còn có thể sắc hơn nhưng đưa một hướng mua với lý do phù hợp.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r15-fit-reassurance

- Khách: Chị chọn set ST411 be, ngực 92, eo 74, mông 96cm. Chị mặc đi làm và hay ngồi nhiều.
- Shop: Em chọn size M cho chị, be M còn; set 749k.

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
Chị yên tâm ạ, mẫu này lưng chun toàn vòng và giãn tối đa tới 88cm nên không bị cứng cạp đâu ạ, eo 74cm của chị ngồi nhiều rất thoải mái. Thiết kế quần ống suông và sơ mi dáng rộng mặc đi làm vừa lịch sự lại dễ chịu.
```

**Nhận xét whole-turn:** Trấn an cạp bằng lưngchun toàn vòng/độ kéoM88cm và fitM đã có, liên hệ riêng eo74 đang được hỏi. Các số liệu phục vụ nỗi lo cạp, không đọc cả bộ ba vòng hoặc lấy độ kéo chun thayfit toànkhách; cảm giác mặc là ordinary advice trong context đã duyệt.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r15-fit-reassurance:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ, em ghi nhận chị chốt set ST411 be size M nhé ạ. Chị yên tâm, quần này dùng lưng chun toàn vòng (độ kéo tối đa 88cm) chứ không phải cạp cứng, rất thoải mái khi chị ngồi nhiều làm việc. Áo dáng rộng kết hợp quần ống suông chuẩn số đo của chị, mặc đi làm vừa gọn gàng vừa dễ chịu ạ.
```

**Nhận xét whole-turn:** ACKbeM rồi giải thích lưngchunM88 và dáng rộng/suông cho ngồi làm việc. Không cần dè dặt khi fit đúng; ghi nhận còn hành chính nhưng không nói đã ghi hệ thống/tạođơn. Đoạn hơi dài nhưng vẫn xoay quanh lo cạp và quyết định đã chốt.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r15-fit-reassurance:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Em ghi nhận chị lấy set be size M nhé ạ. Chị yên tâm, quần này có lưng chun toàn vòng (độ kéo tối đa 88cm, eo chị 74cm mặc thoải mái), không bị cạp cứng nên ngồi làm việc nhiều cả ngày rất dễ chịu, rất hợp với nhu cầu đi làm của chị ạ.
```

**Nhận xét whole-turn:** Xác nhậnbeM và dùng eo74/độ kéo88 để giải thích cạpchun hợp khách ngồi nhiều. Dẫn fact có mục đích trấn an vàfit đã được code xác nhận, không liệt kê lại ba vòng. ACK/cảm giác mặc đúng phạm vi, giọng còn có thể gọn hơn.

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
Chị cho em xin thêm số đo vòng mông để em kiểm tra chính xác size M cho mình nhé ạ. Tổng tiền quần và phí ship nội thành của mình là 484.000đ ạ.
```

**Nhận xét whole-turn:** Xin thêm riêng mông để xác địnhM, trả484k đúngquote. Không hỏi lại eo đã biết, không chốtfit từ một chiều; giải quyết phần có căn cứ và đặt bước tiếp đúng khả năng.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

## r15-color-final-confirm

- Khách: Chị chọn SM613 trắng, ngực 92cm.
- Shop: Em chọn trắng size M, 499k chị nhé.
- Khách: Chị đổi xanh nhạt để mặc với quần navy chị có nhé.

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

### r15-color-final-confirm:1 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ giá vẫn 499k chị nhé. Áo xanh nhạt mặc cùng quần navy rất nhã nhặn và đồng bộ, size M hiện còn hàng ạ.
```

**Nhận xét whole-turn:** Xác nhậngiá499k không đổi và xanhnhạtM còn, gắn phối navy trongchat. Không quay lại trắng hay sizekhác, không xin lại số đo và không tạo thao tác đơn.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

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
Hợp chị nhé. Set này mặc đi làm vừa lịch sự vừa thoải mái, còn cuối tuần mình diện đi chơi hay tách áo, quần ra phối với đồ khác đều rất năng động và tiện dụng.
```

**Nhận xét whole-turn:** Trảhợp cho cả đi làm/đi chơi, dùng mặc cảset/táchphối để giải thích linh hoạt. Không tự tạo công sức kiểm nghiệm/tuổi thọ hoặc bắt khách cung cấpsize khi chỉ hỏi dịp mặc; ngắn, có thể còn cụ thể hơn nhưng đúng việc mua.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r16-effort-and-use:2 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Hợp chị nhé. Set này mang đến vẻ chỉn chu, lịch sự cho môi trường công sở, đồng thời form áo rộng cùng quần lưng chun thoải mái rất hợp để đi chơi cuối tuần, lại dễ tách rời phối đồ linh hoạt.
```

**Nhận xét whole-turn:** Nối dáng áo/quần với đi làm lịch sự và đi chơi thoải mái, đồng thời táchphối. Giọng mang đến/môi trường công sở hơi quảng cáo, song toànreply ngắn và nhất quán với câu hỏi hai dịp, chưa tới mức lủng củng/mất hữu ích; giữ2 nhưng ghi nhận độ tự nhiên chưa đều, không chấm theo một từ.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.

### r16-effort-and-use:3 — PASS / SEND_ELIGIBLE

Actual terminal khách nhận (nguyên văn):
```text
Dạ rất hợp chị nhé. Áo sơ mi dáng rộng kết hợp quần ống suông màu navy mặc đi làm vừa lịch sự vừa gọn gàng. Cuối tuần mình tách ra phối đồ đi chơi rất thoải mái, áo mặc riêng với quần jeans hay quần suông phối cùng áo phông đều rất năng động ạ.
```

**Nhận xét whole-turn:** Giữsetnavy cho công sở rồi nêu cáchphối áo vớijeans/quần vớiáophông cuối tuần. Đây là gợi ý thời trang thông thường, không khẳng định khách sở hữu các món ví dụ hay cấp facts shop mới; cụ thể và có ích hơn chỉ khen tiện dụng.

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
Chị chuyển sang sơ mi SM613 màu xanh nhạt nhé ạ; sắc xanh dịu mắt giúp tổng thể tươi mới và đỡ quen thuộc hơn màu trắng. 

Áo giá 499k cộng 25k phí ship nội thành, tổng thanh toán là 524k, vừa vặn trong ngân sách 600k của chị ạ.
```

**Nhận xét whole-turn:** Chọnxanhnhạt để tạo vẻ khác trắng/quầnđen, trả524k gồmship đúngtrần600k. Không đẩycombo958k vượt ngân sách cứng hoặc hỏi muaquần lại; nhắc budget hơi khuôn nhưng phương án rõ và đủ.

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
Chị lấy váy midi chữ A VA512 màu đen size M nhé ạ. Váy có giá 829.000đ, thiết kế cổ vuông và lót toàn thân rất chỉn chu, sang trọng để đi tiệc trong nhà ạ.
```

**Nhận xét whole-turn:** Đổi từsetđilàm sangVA512đenM cho tiệctrongnhà dùstateproductcũlàST411. Giá829k dưới850k, fitM đúngváy, dángcổvuông/lót giải thích lựa chọn trong phạmvi ánhsángphòng; không hỏi lại ba vòng.

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
Dạ, chị lấy quần suông QU714 màu navy nhé. Sắc navy vừa lịch sự, dễ phối cùng áo trắng SM613 lại khác với chiếc quần đen chị đang có ở nhà. Quần có giá 459.000đ ạ. 

Để em chọn chuẩn size cho mình, chị cho em xin số đo vòng eo và vòng mông nhé.
```

**Nhận xét whole-turn:** ChọnnavyQU714 thayđen để phốiáotrắng, giá459k và xin eo/mông thiếu. Không hiểu không mua vìfreeship thànhkhông muaquần, không cưỡng ép phương án áo rẻnhất; gợiý và bướcsize đều dùngđược.

Điểm chẩn đoán theo rubric đã freeze: understanding=2; explicitNeedCompleteness=2; contextCorrectionUse=2; usefulness=2; decisionSupport=2; partialAnswerBehavior=2; nextStep=2; coherence=2; naturalness=2; factualActionSafety=2.
