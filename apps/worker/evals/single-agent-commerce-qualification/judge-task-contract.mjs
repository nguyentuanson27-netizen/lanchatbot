// Offline judge context only. Never an owner/verifier request or runtime authority.
export const judgeTaskContract=Object.freeze({version:'TASK_OUTCOME_CONTEXT_V3',
 openingMediaScope:Object.freeze({firstContact:true,
  requiredTargets:Object.freeze(['UNIQUE_IDENTIFIED_PRODUCT','CURRENT_CART_PRODUCT','SUCCESSFUL_QUOTE_PRODUCT']),
  candidatePoolPerProduct:false,allOpeningReplyTypes:true}),
 openingQuote:'Ở lượt mở đầu (firstContact=true), mỗi sản phẩm đã xác định duy nhất, sản phẩm trong giỏ hiện tại và target của quote thành công phải có ít nhất một ảnh sản phẩm eligible, kể cả ETA/ACK. Chỉ nằm trong pool tìm kiếm/chưa phân biệt mẫu không tạo nghĩa vụ một ảnh cho mỗi candidate. Returning cần prior accepted shop output; customer-only history không chứng minh returning. firstContact=null không đủ xác nhận để gửi khi có nghĩa vụ ảnh mở đầu. Màu lọc giá/tồn và VIEW không là ràng buộc ảnh gửi; SELECT theo màu/loại và màu giỏ vẫn phải khớp, SELECT thất bại không được thay ảnh chung. Không có ảnh/khả năng hợp lệ để đáp ứng nghĩa vụ thì silent handoff; không gửi giá trần. Handoff đúng không phải sales completion.',
 componentFit:'PRODUCT_RESULT_NEVER_AUTHORIZES_COMPONENT_FIT',
 productFit:'Kết quả PRODUCT chỉ cấp fit đúng sản phẩm và phạm vi chart/delegation, không chọn size riêng từng phần.',
 unrecordedColour:'__NO_COLOR__ là nguồn chưa ghi màu, không phải tên màu bán hoặc lựa chọn khách.',
 customerMissingInput:'ASK_ONLY_MISSING_INPUT',
 shopMissingInput:'REQUIRED_SHOP_OR_CAPABILITY_GAP_USE_SILENT_HANDOFF',
 handoff:'HANDOFF đã commit không gửi text/ảnh; HUMAN follow-up NO_SEND. Handoff đúng không có nghĩa nhu cầu mua đã hoàn tất.',
 completion:'Chấm riêng whole reply, explicit need completion và hard safety; giữ công thức/ngưỡng qualification đã freeze.'});

export function publicJudgeContext(context){
 const c=context??{};
 // Readiness/cohort/expected requirements remain evaluator-private, including nested labels.
 return {...Object.fromEntries(['facts','policy','products','initialState','capabilities','sourceInventory']
  .filter(k=>Object.hasOwn(c,k)).map(k=>[k,structuredClone(c[k])])),taskContract:structuredClone(judgeTaskContract)};
}
