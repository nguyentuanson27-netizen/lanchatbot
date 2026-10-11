# Round43 — sáu actual terminal outcomes chưa đạt

Primary review được commit trước khi mở rejected draft. Bốn eligible quality failures và hai fallback; không chấm chất lượng bằng candidate bị chặn.

## r5-white-opacity:1

Lịch sử:

Khách: Chị muốn áo trắng đi họp, mà sợ lộ áo lót.

Shop: SM613 trắng mặc với áo lót màu da trong phòng không thấy màu áo lót chị nhé. Ngược sáng vẫn có thể thấy bóng.

Khách hiện tại: Ngực chị 92cm. Chị họp trong phòng và mặc áo lót màu da rồi, lấy trắng được em nhỉ?

Actual terminal:
```text
Dạ lấy trắng được chị nhé, chị họp trong phòng và mặc áo lót màu da thì không lo thấy màu áo lót đâu ạ. Ngực chị 92cm mình lấy size M giúp em nha, màu trắng size M bên em đang còn ạ.
```

Nhận xét toàn lượt: Xác nhận trắng M đúng fit và tồn, giữ đúng ngữ cảnh trong phòng với áo lót màu da, nên hoàn tất được lựa chọn. Tuy nhiên toàn lời đáp lại kể hoàn cảnh vừa nói, đọc lại vòng ngực và dùng câu lấy size giúp em dù khách chỉ cần xác nhận; nhịp tư vấn thành chứng minh dữ liệu thay vì trò chuyện gọn. Đây là lỗi giọng/mạch, không phải mở rộng độ kín hay sai size.

## r7-opacity-context-change:2

Lịch sử:

Khách: Chị muốn áo trắng đi họp, ngại thấy áo lót.

Shop: SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé.

Khách: Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm.

Shop: Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn.

Khách hiện tại: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Actual terminal:
```text
Có đèn chiếu phía sau thì áo trắng vẫn có thể thấy bóng áo lót chị nhé. Trắng M thì hiện vẫn còn.
```

Nhận xét toàn lượt: Trả đúng nguy cơ ngược sáng và tồn nhưng toàn đoạn vẫn dừng ở thông tin, sau khi lời shop trước đã khuyên lấy trắng M. Khi khách đổi dịp vì lo lộ, reply chưa xử lý lại lựa chọn đang có: kết bằng còn hàng khiến quyết định mua trắng bị để nguyên và khách phải tự cân nhắc. Thiếu ích lợi/lập trường trong lượt tư vấn, không phải sai dữ kiện hay bắt buộc phải có áo thay.

## r7-opacity-context-change:3

Lịch sử:

Khách: Chị muốn áo trắng đi họp, ngại thấy áo lót.

Shop: SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé.

Khách: Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm.

Shop: Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn.

Khách hiện tại: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Actual terminal:
```text
Dạ, đi sự kiện có đèn chiếu phía sau thì áo trắng có thể thấy bóng áo lót chị nhé. Trắng M thì hiện vẫn còn hàng chị ạ.
```

Nhận xét toàn lượt: Thông tin ngược sáng và tồn đúng, nhưng chỉ lặp nguy cơ rồi kết ở còn hàng sau khi shop đã khuyên mua trắng trong hoàn cảnh cũ. Khách cần xử lý lại quyết định cho dịp mới; đoạn chưa đưa hướng mua phù hợp hay rút lời chọn trắng, nên yếu ở usefulness/decision/next step. Không fail vì thiếu đúng một câu mẫu hoặc thiếu áo thay chưa có nguồn.

## r7-exchange-after-use:3

Lịch sử:

Khách: Chị thích ST411 be. Ngực92, eo74, mông96cm.

Shop: Em chọnM theo sốđo chị nhé, beM đang còn; set749k.

Khách hiện tại: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Actual terminal:
```text
Phần này em chưa trả lời được, chị nhé.
```

Nhận xét toàn lượt: Khách chỉ nhận câu chưa trả lời được dù shop có đầy đủ quy tắc để nói mặc ra ngoài không đổi và ai trả phí. Actual terminal không giải quyết ý nào, không giữ phần có căn cứ hay đưa tiến triển dùng được. Lời ngắn không tạo thêm claim và không hứa nhân viên, nhưng an toàn của fallback không làm lượt này đạt chất lượng bán hàng.

Diagnostics mở sau primary review:
```text
Dạ, đổi trong 7 ngày áp dụng khi chị thử trong nhà, sạch sẽ và nguyên tem mác ạ. Nếu mình mặc ra ngoài đi làm thì shop không nhận đổi được. Phí vận chuyển đổi hàng thì khách trả chị nhé.
```

Verifier / actual terminal:
```json
{
  "verdict": {
    "verdict": "FAIL",
    "violations": [
      {
        "kind": "MATERIAL_CONDITION_LOSS",
        "protectedRef": "exchange:r5"
      }
    ]
  },
  "terminal": {
    "disposition": "FALLBACK",
    "reason": "FAIL",
    "text": "Phần này em chưa trả lời được, chị nhé.",
    "fallbackId": "C3_A_NONPROTECTED_V2"
  }
}
```

Lời áp dụng đổi khi thử sạch trong nhà và còn tem chưa loại trừ hàng đã giặt. Một món đã giặt vẫn có thể sạch/nguyên tem, nhưng policy không nhận đổi sau việc đó; lịch sử cũng chưa xác lập điều kiện này. Phần bác mặc ra ngoài và phí đúng không xóa phạm vi quyền thử đang cấp. Đây là inference review protected meaning, không đòi khớp nguyên câu policy; provider chỉ trả kind/ref.

## r14-price-repeat-wear:2

Lịch sử:

Khách: Chị thích set ST411 navy để mặc đi làm, thỉnh thoảng tách áo phối với đồ ở nhà nữa.

Shop: Set navy 749k chị nhé, mặc nguyên bộ hay tách áo quần đều được.

Khách: Ngực chị 92, eo 74, mông 96cm.

Khách hiện tại: Bên kia chị thấy 620k, còn bên em 749k. Chị vẫn phân vân, em chọn size giúp chị nhé.

Actual terminal:
```text
Dạ, chị lấy size M giúp em nhé, eo 74cm mặc lưng chun rất vừa vặn và thoải mái. Set 749k gồm cả áo và quần, chất vải đứng phom ít nhăn giúp chị mặc đi làm luôn chỉn chu, lại dễ tách áo phối linh hoạt với đồ ở nhà rất tiện ạ.
```

Nhận xét toàn lượt: Size và lợi ích dùng set đều có căn cứ, nhưng cả đoạn mở bằng lấy size giúp em, lại đọc eo 74 để trấn an rồi nối một câu dài về phom/ít nhăn/phối ở nhà. Khách đang phân vân chênh giá; nhịp chứng minh số đo rồi quảng cáo khiến câu máy móc hơn cần thiết, nên naturalness yếu. Không gọi lời luôn chỉn chu ở ngữ cảnh này là một thử nghiệm hoặc độ bền mới.

## r14-refund-before-buy:3

Lịch sử:

Khách: Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da.

Shop: Chị lấy trắng M nhé, áo 499k và còn hàng.

Khách hiện tại: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Actual terminal:
```text
Phần này em chưa trả lời được, chị nhé.
```

Nhận xét toàn lượt: Actual terminal chỉ báo chưa trả lời được, bỏ cả câu hỏi hoàn hay đổi dù đầy đủ chính sách. Khách không hiểu quyền trước mua và không có bước tiếp dùng được. Không tạo claim/nhân viên giả nên factual safety tốt, nhưng lượt bán hàng thất bại; đánh giá này chưa xem draft bị chặn.

Diagnostics mở sau primary review:
```text
Dạ, shop không áp dụng hoàn tiền chị nhé, mình được hỗ trợ đổi size hoặc đổi mẫu trong 7 ngày từ lúc nhận hàng, miễn là áo còn nguyên tem và thử trong nhà sạch sẽ ạ. Trắng size M hiện sẵn hàng cho chị nhé.
```

Verifier / actual terminal:
```json
{
  "verdict": {
    "verdict": "FAIL",
    "violations": [
      {
        "kind": "MATERIAL_CONDITION_LOSS",
        "protectedRef": "exchange:r5"
      }
    ]
  },
  "terminal": {
    "disposition": "FALLBACK",
    "reason": "FAIL",
    "text": "Phần này em chưa trả lời được, chị nhé.",
    "fallbackId": "C3_A_NONPROTECTED_V2"
  }
}
```

Lời miễn là áo còn tem và thử sạch trong nhà lấy các điều kiện ấy làm đủ quyền đổi, nhưng chưa loại trừ hàng đã giặt/đã sử dụng; lịch sử chưa xác lập tình trạng này. Không hoàn tiền và tồn M đúng không xóa phạm vi đổi bị mở rộng. Đây là inference review theo nghĩa toàn lời đáp, không đòi liệt kê nguyên văn policy hoặc invent provider rationale.
