/**
 * Readable, PII-safe fixtures for offline sales-quality judging. They are not
 * C1 safety fixtures: C1 remains the frozen seven-case B3 contract corpus.
 */
export interface TrackCQualityFixtureV1 {
  readonly id: string;
  readonly customerMessage: string;
  readonly context: Readonly<{
    readonly productId: string | null;
    readonly priorCustomerMessages: readonly string[];
  }>;
  readonly verifiedFacts: readonly string[];
  readonly expectedQualityBehavior: readonly string[];
  readonly qualityTags: readonly string[];
}

/**
 * Fixture-local facts for offline quality comparison only. They are not
 * runtime facts, provenance, or deterministic C1 guard authority.
 */
export interface TrackCQualitySuiteFactsV1 {
  readonly contractVersion: "TRACK_C_QUALITY_SUITE_FACTS_V1";
  readonly origin: "FIXTURE_LOCAL_EVALUATION_ONLY";
  readonly fixtureId: string;
  readonly facts: readonly string[];
}

function fixture(
  id: string,
  customerMessage: string,
  productId: string | null,
  priorCustomerMessages: readonly string[],
  verifiedFacts: readonly string[],
  expectedQualityBehavior: readonly string[],
  qualityTags: readonly string[],
): TrackCQualityFixtureV1 {
  return Object.freeze({
    id,
    customerMessage,
    context: Object.freeze({ productId, priorCustomerMessages: Object.freeze([...priorCustomerMessages]) }),
    verifiedFacts: Object.freeze([...verifiedFacts]),
    expectedQualityBehavior: Object.freeze([...expectedQualityBehavior]),
    qualityTags: Object.freeze([...qualityTags]),
  });
}

export const TRACK_C_QUALITY_SUITE_V1 = Object.freeze([
  fixture("q01-stock", "Mẫu SD398 còn không em?", "SD398", [], ["stock: SD398 available"], ["Answer stock directly", "Offer at most one useful next step"], ["STOCK", "NATURAL_NEXT_STEP"]),
  fixture("q02-size-m", "size M còn k", "SD398", [], ["size M: available"], ["Answer the requested size", "Do not ask for product again"], ["SIZE", "CONTEXT_USE"]),
  fixture("q03-color-size", "màu đen còn size S ko", "SD398", [], ["black/S: available"], ["Resolve both color and size"], ["VARIANT", "MULTI_INTENT"]),
  fixture("q04-price", "mẫu này bao nhiêu vậy", "SD398", [], ["sale price: 699000"], ["State the price directly", "Do not open a menu"], ["PRICE", "DIRECT_ANSWER"]),
  fixture("q05-price-shorthand", "bn em", "SD398", [], ["sale price: 699000"], ["Interpret bn as price question", "State price directly"], ["PRICE", "VIETNAMESE_SHORTHAND"]),
  fixture("q06-sale-price", "giá này đã sale chưa", "SD398", [], ["list price: 799000", "sale price: 699000"], ["Explain current sale fact only"], ["PRICE", "PROMOTION"]),
  fixture("q07-extra-discount", "có giảm thêm không em", "SD398", [], ["promotion: no additional discount"], ["Address price hesitation naturally", "Do not invent promotion"], ["PRICE_OBJECTION", "FACT_GROUNDING"]),
  fixture("q08-voucher", "shop có mã giảm giá ko", "SD398", [], ["voucher: FREESHIP50 available"], ["State available voucher exactly"], ["PROMOTION", "FACT_GROUNDING"]),
  fixture("q09-size-height-weight", "1m60 48kg mặc size gì", "SD398", [], ["size guide: 160cm/48kg -> S"], ["Give size advice when data is sufficient"], ["SIZE_GUIDE", "DIRECT_ANSWER"]),
  fixture("q10-size-known-weight", "chị 52kg mặc M được không", "SD398", ["chị cao 1m60"], ["size guide: 160cm/52kg -> M"], ["Use provided height and weight", "Do not ask them again"], ["SIZE_GUIDE", "MULTI_TURN_CONTEXT"]),
  fixture("q11-size-missing-weight", "mình cao 1m65 nhưng chưa biết cân nặng thì chọn size sao", "SD398", [], ["size guide needs height and weight"], ["Recognize missing weight", "Ask only for weight"], ["SIZE_GUIDE", "NATURAL_NEXT_STEP"]),
  fixture("q12-waist-size", "eo 68 thì mặc size nào", "SD398", [], ["size guide: waist 68 -> M"], ["Use provided waist", "Avoid irrelevant questions"], ["SIZE_GUIDE", "DIRECT_ANSWER"]),
  fixture("q13-color-cream", "mẫu này có màu kem không", "SD398", [], ["colors: black, cream"], ["Answer color availability directly"], ["COLOR", "DIRECT_ANSWER"]),
  fixture("q14-easy-color", "màu nào dễ mặc nhất em", "SD398", [], ["colors: black, cream", "black: versatile"], ["Recommend from verified options", "Keep advice short"], ["COLOR", "CONSULTING"]),
  fixture("q15-fabric-heat", "vải này có nóng không", "SD398", [], ["fabric: cotton blend", "fabric property: breathable"], ["Describe verified fabric property without exaggeration"], ["FABRIC", "FACT_GROUNDING"]),
  fixture("q16-form-tummy", "form này có ôm bụng không", "SD398", [], ["fit: relaxed waist"], ["Answer fit concern naturally"], ["FIT", "CONSULTING"]),
  fixture("q17-short-height", "người hơi thấp mặc mẫu này ổn không", "SD398", [], ["length: 92cm", "fit: high waist"], ["Give grounded suitability advice"], ["FIT", "CONSULTING"]),
  fixture("q18-hanoi-eta", "ship HN mấy ngày", "SD398", [], ["Hanoi ETA: 2-3 days"], ["State delivery estimate directly"], ["SHIPPING", "DIRECT_ANSWER"]),
  fixture("q19-tomorrow", "mai nhận được không", "SD398", ["chị ở Hà Nội"], ["Hanoi ETA: 2-3 days", "today: 2026-09-07"], ["Do not promise tomorrow beyond facts"], ["SHIPPING", "FACT_GROUNDING"]),
  fixture("q20-express", "có ship hoả tốc không em", "SD398", [], ["express shipping: unavailable"], ["Answer shipping option exactly"], ["SHIPPING", "FACT_GROUNDING"]),
  fixture("q21-size-exchange", "không vừa có đổi size được không", "SD398", [], ["exchange policy: size exchange within 7 days"], ["Explain exchange policy clearly and briefly"], ["POLICY", "DIRECT_ANSWER"]),
  fixture("q22-return", "mua về không hợp có trả được không", "SD398", [], ["return policy: return within 7 days unopened"], ["State actual return right without overpromising"], ["POLICY", "FACT_GROUNDING"]),
  fixture("q23-product-code", "chị hỏi mẫu SD398", "SD398", [], ["product: SD398"], ["Use the supplied code", "Do not ask for it again"], ["PRODUCT_CONTEXT", "MULTI_TURN_CONTEXT"]),
  fixture("q24-prior-image", "mẫu chị gửi ảnh lúc nãy còn không", "SD398", ["customer sent image matched SD398"], ["stock: SD398 available"], ["Use prior image resolution", "Do not reset context"], ["PRODUCT_CONTEXT", "MULTI_TURN_CONTEXT"]),
  fixture("q25-stock-and-price", "mẫu này còn M không và bao nhiêu tiền", "SD398", [], ["size M: available", "sale price: 699000"], ["Answer both stock and price"], ["MULTI_INTENT", "STOCK", "PRICE"]),
  fixture("q26-variant-and-eta", "còn màu đen size S không, ship SG mất mấy ngày", "SD398", [], ["black/S: available", "Ho Chi Minh ETA: 1-2 days"], ["Cover both variant and delivery", "Remain concise"], ["MULTI_INTENT", "SHIPPING"]),
  fixture("q27-compare", "mẫu này với mẫu kia cái nào dễ mặc hơn", null, ["mẫu đang xem: SD398", "mẫu kia: SD512"], ["SD398: relaxed fit", "SD512: body fit"], ["Compare using actual fit facts", "Ask one preference only if needed"], ["COMPARISON", "CONSULTING"]),
  fixture("q28-party", "chị đi tiệc nhẹ thì nên chọn mẫu nào", null, ["options: SD398, SD512"], ["SD398: minimalist", "SD512: dressy"], ["Recommend a grounded option for occasion", "Avoid a long list"], ["CONSULTING", "NATURAL_NEXT_STEP"]),
  fixture("q29-price-hesitation", "đẹp mà hơi đắt nhỉ", "SD398", [], ["sale price: 699000", "fabric: cotton blend"], ["Handle objection empathetically", "Do not force checkout"], ["PRICE_OBJECTION", "NATURALNESS"]),
  fixture("q30-commit", "ok chị lấy mẫu này", "SD398", [], ["product: SD398"], ["Move to the single necessary checkout detail"], ["CLOSING", "NATURAL_NEXT_STEP"]),
  fixture("q31-anti-robot-short", "mẫu SD398 còn không em?", "SD398", [], ["stock: SD398 available"], ["Penalize overly curt stock-only wording"], ["ANTI_ROBOT", "CONCISION"]),
  fixture("q32-anti-robot-menu", "mẫu SD398 còn không em?", "SD398", [], ["stock: SD398 available"], ["Penalize menu CTA after a single stock question"], ["ANTI_ROBOT", "CTA_STAGE_FIT"]),
  fixture("q33-anti-robot-found", "mẫu này bao nhiêu", "SD398", [], ["sale price: 699000"], ["Penalize Em đã tìm thấy sản phẩm template opening"], ["ANTI_ROBOT", "NATURALNESS"]),
  fixture("q34-known-product", "size M còn k", "SD398", [], ["size M: available"], ["Penalize asking which product when context is resolved"], ["ANTI_ROBOT", "MULTI_TURN_CONTEXT"]),
  fixture("q35-language", "mẫu này còn không em", "SD398", [], ["stock: SD398 available"], ["Penalize English reply to Vietnamese customer"], ["ANTI_ROBOT", "LANGUAGE_MATCH"]),
  fixture("q36-known-measurements", "size gì em", "SD398", ["chị 1m60 48kg"], ["size guide: 160cm/48kg -> S"], ["Use known measurements", "Penalize asking height or weight again"], ["MULTI_TURN_CONTEXT", "ANTI_ROBOT"]),
  fixture("q37-natural-shipping", "ship HN mấy ngày", "SD398", [], ["Hanoi ETA: 2-3 days"], ["Prefer a natural Messenger answer over formal system wording"], ["NATURALNESS", "SHIPPING"]),
  fixture("q38-early-cta", "đẹp mà hơi đắt", "SD398", [], ["sale price: 699000"], ["Penalize immediate order CTA before resolving price concern"], ["PRICE_OBJECTION", "CTA_STAGE_FIT"]),
  fixture("q39-answer-all", "mẫu này còn M không và bao nhiêu", "SD398", [], ["size M: available", "sale price: 699000"], ["Penalize answering only one requested fact"], ["MULTI_INTENT", "QUESTION_RESOLUTION"]),
  fixture("q40-close-concise", "ok chị lấy mẫu này", "SD398", [], ["product: SD398"], ["Penalize long product recap and multiple questions"], ["CLOSING", "CONCISION", "CTA_STAGE_FIT"]),
  fixture("q41-shorthand-product", "m này còn k e", "SD398", [], ["stock: SD398 available"], ["Interpret m, k, e from context"], ["VIETNAMESE_SHORTHAND", "STOCK"]),
  fixture("q42-shorthand-price", "bn v e", "SD398", [], ["sale price: 699000"], ["Interpret bn and v from context", "Answer price"], ["VIETNAMESE_SHORTHAND", "PRICE"]),
  fixture("q43-shorthand-size", "sz m còn ko shop", "SD398", [], ["size M: available"], ["Interpret sz as size", "Answer requested size"], ["VIETNAMESE_SHORTHAND", "SIZE"]),
  fixture("q44-shorthand-variant", "màu đen còn s k ạ", "SD398", [], ["black/S: available"], ["Interpret S size and k as không"], ["VIETNAMESE_SHORTHAND", "VARIANT"]),
  fixture("q45-shorthand-shipping", "ship hn tầm bn ngày e", "SD398", [], ["Hanoi ETA: 2-3 days"], ["Interpret HN and bn", "Answer ETA naturally"], ["VIETNAMESE_SHORTHAND", "SHIPPING"]),
  fixture("q46-shorthand-size-guide", "1m6 48kg mặc sz j", "SD398", [], ["size guide: 160cm/48kg -> S"], ["Interpret sz and j", "Give grounded size advice"], ["VIETNAMESE_SHORTHAND", "SIZE_GUIDE"]),
  fixture("q47-shorthand-exchange", "có dc đổi sz ko e", "SD398", [], ["exchange policy: size exchange within 7 days"], ["Interpret dc and sz", "Explain policy exactly"], ["VIETNAMESE_SHORTHAND", "POLICY"]),
  fixture("q48-short-body", "m này có bị dìm dáng k", "SD398", [], ["fit: high waist", "length: 92cm"], ["Interpret everyday wording", "Give natural form advice"], ["VIETNAMESE_SHORTHAND", "FIT"]),
  fixture("q49-price-slang", "xinh á mà hơi chát :))", "SD398", [], ["sale price: 699000"], ["Interpret chát as price objection", "Respond naturally without pressure"], ["VIETNAMESE_SHORTHAND", "PRICE_OBJECTION"]),
  fixture("q50-close-intent", "ok chốt e này nha", "SD398", [], ["product: SD398"], ["Interpret intent to buy", "Ask only the necessary next checkout detail"], ["VIETNAMESE_SHORTHAND", "CLOSING", "NATURAL_NEXT_STEP"]),
] satisfies readonly TrackCQualityFixtureV1[]);

export function qualitySuiteFactsForJudge(
  fixture: TrackCQualityFixtureV1,
): TrackCQualitySuiteFactsV1 {
  return Object.freeze({
    contractVersion: "TRACK_C_QUALITY_SUITE_FACTS_V1",
    origin: "FIXTURE_LOCAL_EVALUATION_ONLY",
    fixtureId: fixture.id,
    facts: Object.freeze([...fixture.verifiedFacts]),
  });
}
