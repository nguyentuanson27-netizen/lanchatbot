/** One closed intake field, not a Vietnamese intent parser. Unmatched segments cannot authorize payment. */
export type PaymentChoice={kind:"RESOLVED";method:"COD"|"BANK_TRANSFER"}|{kind:"AMBIGUOUS"|"UNSUPPORTED"|"NO_SIGNAL"};
const cod="(?:cod|tiền mặt|tien mat|nhận hàng trả|nhan hang tra|trả (?:tiền )?khi nhận hàng|tra (?:tien )?khi nhan hang|thanh toán khi nhận hàng)";
const transfer="(?:ck|chuyển khoản|chuyen khoan|bank|thanh toán chuyển khoản)";
const affirmative=new RegExp(`^(?:(?:chị|em|tôi|mình) )?(?:(?:muốn |chọn |lấy |thanh toán |trả (?:bằng )?))?(${cod}|${transfer})(?: (?:nhé|nha|ạ))?$`,"iu");
const signal=/(?:\bcod\b|\bck\b|chuyển khoản|chuyen khoan|tiền mặt|tien mat|nhận hàng|nhan hang|thanh toán|thanh toan|chưa chọn|chua chon|\bbank\b)/iu;
export function paymentChoice(text:string):PaymentChoice{
 const lines=text.normalize("NFC").trim().split(/\r?\n/),label=/^(?:thanh toán|thanh toan|payment)\s*:\s*/iu;
 const labeled=lines.filter(l=>label.test(l));
 const otherField=/^(?:tên|ten|họ tên|ho ten|người nhận|nguoi nhan|sđt|sdt|điện thoại|dien thoai|phone|địa chỉ|dia chi|đ\/c|dc)\s*:/iu;
 const segments=lines.filter(l=>l.trim()&&!otherField.test(l)).map(l=>l.replace(label,""));
 if(!segments.length)return {kind:"NO_SIGNAL"};
 const choices=segments.map(s=>s.toLowerCase().trim().replace(/\s+/gu," ").replace(/[.!]+$/u,""));
 const matches=choices.map(s=>affirmative.exec(s));
 if(matches.every(Boolean)){
  const methods=matches.map(m=>new RegExp(`^${cod}$`,"iu").test(m![1]!)?"COD" as const:"BANK_TRANSFER" as const);
  return new Set(methods).size===1?{kind:"RESOLVED",method:methods[0]!}:{kind:"AMBIGUOUS"};
 }
 return {kind:labeled.length||choices.some(s=>signal.test(s))?"UNSUPPORTED":"NO_SIGNAL"};
}
