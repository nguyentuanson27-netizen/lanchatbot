import { detectBuyingSignal } from "@lana/business-tools";
import type {
  Wave1BenchmarkConversation,
  Wave1BenchmarkMessage,
} from "./benchmark-bundle.js";
import type { SemanticPrediction } from "./semantic-benchmark.js";

export const WAVE1_SEMANTIC_CANDIDATE_VERSION =
  "wave1-semantic-rules-candidate-v1";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[đĐ]/gu, "d")
    .toLocaleLowerCase("vi")
    .replace(/[^a-z0-9[\]<>]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function wordCount(text: string): number {
  return text ? text.split(" ").length : 0;
}

function isQuestion(raw: string, text: string): boolean {
  return (
    raw.includes("?") ||
    has(
      text,
      /(?:^|\s)(?:khong|ko|k|chua|nao|sao|gi|bao nhieu|may|the nao)(?:\s|$)/u,
    )
  );
}

function customerLabels(input: {
  readonly raw: string;
  readonly text: string;
  readonly hasPriorShop: boolean;
  readonly priorCommitted: boolean;
  readonly postSaleContext: boolean;
}): readonly string[] {
  const { raw, text, hasPriorShop, priorCommitted, postSaleContext } = input;
  const labels = new Set<string>();
  const question = isQuestion(raw, text);

  if (
    has(
      text,
      /(?:^|\s)(?:gia|gia bao nhieu|bao nhieu|bn tien|nhieu tien|xin gia|ib gia)(?:\s|$)/u,
    )
  ) {
    labels.add("PRICE_QUESTION");
  }
  if (
    has(
      text,
      /(?:^|\s)(?:chat|chat lieu|vai|form|dang|dai|rong|co gian|lot|day|mong|thong tin|mo ta)(?:\s|$)/u,
    ) &&
    (question ||
      has(text, /(?:cho xem|tu van|nhu the nao|loai gi|bao nhieu cm)/u))
  ) {
    labels.add("PRODUCT_INFO_QUESTION");
  }
  if (
    has(
      text,
      /(?:^|\s)(?:anh|hinh|video|clip|feedback|can vai|can chat|anh that|hinh that)(?:\s|$)/u,
    ) &&
    !has(text, /(?:gui anh thong tin|anh dia chi)/u)
  ) {
    labels.add("IMAGE_REQUEST");
  }

  const measurement =
    has(
      text,
      /(?:^|\s)(?:cao|chieu cao|can nang|nang|vong nguc|nguc|eo|mong)\s*(?:\d{2,3})(?:\s*(?:cm|kg))?(?:\s|$)/u,
    ) ||
    has(text, /(?:^|\s)\d{2,3}\s*[-/]\s*\d{2,3}\s*[-/]\s*\d{2,3}(?:\s|$)/u) ||
    has(text, /(?:^|\s)1m\d{2}\s+\d{2,3}\s*(?:kg)?(?:\s|$)/u);
  if (measurement) labels.add("MEASUREMENTS_PROVIDED");

  const sizeMention = has(
    text,
    /(?:^|\s)(?:size|sz|co)\s*(?:xs|s|m|l|xl|xxl|\d{1,2})(?:\s|$)/u,
  );
  if (
    has(text, /(?:^|\s)(?:size|sz|co|vua|mac vua|tu van size)(?:\s|$)/u) &&
    (question ||
      measurement ||
      has(text, /(?:size nao|size gi|mac size|chon size|tu van size)/u))
  ) {
    labels.add("SIZE_QUESTION");
  }

  const colorSelection = has(
    text,
    /(?:^|\s)(?:mau|color)\s+(?:den|trang|do|hong|xanh|nau|be|kem|ghi|xam|tim|vang)(?:\s|$)/u,
  );
  if (
    sizeMention ||
    colorSelection ||
    has(
      text,
      /(?:^|\s)(?:lay|chon|chot)\s+(?:mau|size|sz|co|ao|quan|chan vay)(?:\s|$)/u,
    )
  ) {
    labels.add("VARIANT_SELECTION");
  }

  const cancellation = has(
    text,
    /(?:^|\s)(?:huy|bo|cancel)(?:\s+(?:don|don hang))?(?:\s|$)|(?:khong|ko|k)\s+(?:lay|mua|chot|dat)\s+(?:nua|dau)|thoi\s+(?:khong|ko)\s+(?:lay|mua)/u,
  );
  const negated = has(
    text,
    /(?:^|\s)(?:khong|ko|k|chua)\s+(?:lay|mua|chot|dat|ship)(?:\s|$)|(?:^|\s)(?:thoi|de sau|khong can)(?:\s|$)/u,
  );
  // Preserve the production buying guard exactly. Candidate-only rules must not
  // regress the safety-critical commitment label.
  const committed = detectBuyingSignal(raw, {
    hasProductContext: false,
  }).isBuyingSignal;
  const candidate =
    !cancellation &&
    !negated &&
    !committed &&
    has(
      text,
      /(?:^|\s)(?:muon mua|muon lay|quan tam|ung|thich|de chi xem|can nhac|tham khao)(?:\s|$)/u,
    );
  if (committed) {
    labels.add("BUYING_COMMITTED");
  } else if (cancellation) {
    labels.add(priorCommitted ? "BUYING_RETRACTED" : "BUYING_NEGATED");
    labels.add("ORDER_CANCELLATION");
  } else if (negated) {
    labels.add(priorCommitted ? "BUYING_RETRACTED" : "BUYING_NEGATED");
  } else if (candidate) {
    labels.add("BUYING_CANDIDATE");
  }

  if (
    hasPriorShop &&
    wordCount(text) <= 10 &&
    (
      sizeMention ||
      colorSelection ||
      measurement ||
      has(
        text,
        /^(?:ok|oke|vang|da|duoc|dung|co|khong|ko|chua|mau nay|size nay|cai nay)(?:\s|$)/u,
      )
    )
  ) {
    labels.add("CONTINUATION");
  }

  if (
    has(
      text,
      /(?:so voi|khac gi|mau nao|cai nao|em nao|loai nao).*(?:hon|dep|hop)|(?:2|hai|ba)\s+(?:mau|san pham|sp)|(?:mau|cai|em)\s+nay\s+va\s+(?:mau|cai|em)/u,
    )
  ) {
    labels.add("MULTI_PRODUCT_COMPARISON");
  }

  if (
    has(text, /(?:gia cao|dat qua|mac qua|bot gia|giam gia|re hon)/u)
  ) {
    labels.add("PRICE_OBJECTION");
  } else if (
    has(text, /(?:so chat|so rong|so khong vua|khong hop dang|beo|map|gay)/u)
  ) {
    labels.add("FIT_OBJECTION");
  } else if (
    has(text, /(?:khong hop kieu|khong thich kieu|dung tuoi|gia qua|sen)/u)
  ) {
    labels.add("STYLE_OBJECTION");
  } else if (
    has(text, /(?:vai nong|vai mong|chat xau|so xu|nhan|phai mau)/u)
  ) {
    labels.add("MATERIAL_OBJECTION");
  } else if (
    has(text, /(?:ship lau|ship cao|phi ship cao|doi lau|giao lau)/u) &&
    !postSaleContext
  ) {
    labels.add("DELIVERY_OBJECTION");
  } else if (
    has(text, /(?:so lua dao|co uy tin|hang that|hang giong hinh|tin duoc)/u)
  ) {
    labels.add("TRUST_OBJECTION");
  }
  if (
    has(
      text,
      /(?:nhieu mau qua|khong biet chon|roi qua|phan van|mau nao cung dep)/u,
    )
  ) {
    labels.add("CHOICE_OVERLOAD");
  }

  const returnWords = has(
    text,
    /(?:^|\s)(?:doi|tra|hoan tien|doi tra)(?:\s|$)/u,
  );
  const preSalePolicy =
    returnWords &&
    (
      has(text, /(?:neu|chinh sach|quy dinh|co duoc|duoc khong|trong bao lau)/u) ||
      question
    ) &&
    !postSaleContext &&
    !has(text, /(?:da nhan|don cua|hang giao|vua nhan|mua roi)/u);
  if (preSalePolicy) labels.add("PRE_SALE_RETURN_POLICY_QUESTION");

  if (
    has(
      text,
      /(?:ma van don|tra don|kiem tra don|don den dau|don dau|bao gio nhan|khi nao nhan|ship toi dau)/u,
    )
  ) {
    labels.add("ORDER_TRACKING_QUESTION");
  }
  if (
    has(
      text,
      /(?:chua nhan|giao lau|ship lau|tre qua|qua ngay|mai chua toi|don cham)/u,
    ) &&
    postSaleContext
  ) {
    labels.add("DELIVERY_DELAY_COMPLAINT");
  }
  if (
    returnWords &&
    !preSalePolicy &&
    has(text, /(?:doi size|doi mau|doi sang|doi giup|muon doi|can doi)/u)
  ) {
    labels.add("EXCHANGE_REQUEST");
  }
  if (
    returnWords &&
    !preSalePolicy &&
    has(text, /(?:tra hang|hoan tien|khong nhan|muon tra|gui tra)/u)
  ) {
    labels.add("RETURN_REQUEST");
  }
  if (
    has(
      text,
      /(?:hang loi|bi rach|bung chi|sai mau|sai size|khong giong|lem|bep|hu|hong)/u,
    )
  ) {
    labels.add("PRODUCT_COMPLAINT");
  }
  if (
    has(text, /(?:da nhan|nhan duoc).*(?:hang doi|do doi|mau doi|size doi)/u)
  ) {
    labels.add("POST_EXCHANGE_CONFIRMATION");
  }

  if (
    has(
      text,
      /(?:<PHONE>|<ADDRESS>|<NAME>)|\[(?:PHONE|ADDRESS|NAME)(?::[^\]]+)?\]/u,
    ) ||
    has(
      text,
      /(?:^|\s)(?:cod|chuyen khoan)\s*(?:nhe|nha|a)?(?:\s|$)/u,
    )
  ) {
    labels.add("CHECKOUT_DETAILS_PROVIDED");
  }

  return [...labels].sort();
}

function shopLabels(input: {
  readonly raw: string;
  readonly text: string;
  readonly priorShopTexts: readonly string[];
  readonly buyingObserved: boolean;
  readonly consecutiveShopMessages: number;
}): readonly string[] {
  const { raw, text, priorShopTexts, buyingObserved, consecutiveShopMessages } =
    input;
  const labels = new Set<string>();
  const repeated = priorShopTexts.includes(text);
  if (repeated) {
    labels.add("REPEATED_SHOP_MESSAGE");
    if (isQuestion(raw, text)) labels.add("REPEATED_SHOP_QUESTION");
  }
  if (
    !buyingObserved &&
    has(
      text,
      /(?:cho|gui|de lai).*(?:so dien thoai|sdt|dia chi|ten nguoi nhan|thong tin nhan hang)/u,
    )
  ) {
    labels.add("PREMATURE_PII_REQUEST");
  }
  if (
    has(
      text,
      /(?:chuyen nhan vien|nhan vien ho tro|bo phan.*kiem tra|de shop kiem tra|cho shop kiem tra|doi shop kiem tra)/u,
    )
  ) {
    labels.add("POSSIBLE_HANDOFF_LANGUAGE");
  }
  if (
    has(
      text,
      /(?:xac nhan don|don hang cua|shop chot don|don cua chi|don cua ban|kiem tra don)/u,
    )
  ) {
    labels.add("ORDER_CONFIRMATION_TEXT_OBSERVED");
  }
  if (has(text, /(?:giao thanh cong|da giao|khach da nhan hang)/u)) {
    labels.add("EXPLICIT_DELIVERED_MESSAGE");
  }
  if (
    consecutiveShopMessages >= 2 &&
    has(text, /(?:chi oi|ban oi|con quan tam|phan hoi|tra loi shop)/u)
  ) {
    labels.add("FOLLOW_UP_SPAM");
  }
  return [...labels].sort();
}

function prediction(
  conversationId: string,
  message: Wave1BenchmarkMessage,
  labelCode: string,
): SemanticPrediction {
  return {
    conversationId,
    labelCode,
    scope: message.role === "CUSTOMER" ? "CUSTOMER_MESSAGE" : "SHOP_MESSAGE",
    turnIndex: message.turnIndex,
    evidenceText: message.redactedText,
    confidence: "HIGH",
  };
}

export function predictWave1SemanticCandidate(
  conversations: readonly Wave1BenchmarkConversation[],
): readonly SemanticPrediction[] {
  const predictions: SemanticPrediction[] = [];
  for (const conversation of conversations) {
    let hasPriorShop = false;
    let priorCommitted = false;
    let buyingObserved = false;
    let postSaleContext = false;
    let consecutiveShopMessages = 0;
    const priorShopTexts: string[] = [];
    for (const message of conversation.messages) {
      const text = fold(message.redactedText);
      if (message.role === "CUSTOMER") {
        consecutiveShopMessages = 0;
        const labels = customerLabels({
          raw: message.redactedText,
          text,
          hasPriorShop,
          priorCommitted,
          postSaleContext,
        });
        for (const labelCode of labels) {
          predictions.push(
            prediction(conversation.conversationId, message, labelCode),
          );
        }
        if (
          labels.includes("BUYING_COMMITTED") ||
          labels.includes("BUYING_CANDIDATE")
        ) {
          buyingObserved = true;
        }
        if (labels.includes("BUYING_COMMITTED")) priorCommitted = true;
        if (
          labels.includes("BUYING_RETRACTED") ||
          labels.includes("BUYING_NEGATED")
        ) {
          priorCommitted = false;
        }
        if (
          labels.some((label) =>
            [
              "ORDER_TRACKING_QUESTION",
              "DELIVERY_DELAY_COMPLAINT",
              "EXCHANGE_REQUEST",
              "RETURN_REQUEST",
              "PRODUCT_COMPLAINT",
            ].includes(label)
          )
        ) {
          postSaleContext = true;
        }
      } else {
        consecutiveShopMessages += 1;
        const labels = shopLabels({
          raw: message.redactedText,
          text,
          priorShopTexts,
          buyingObserved,
          consecutiveShopMessages,
        });
        for (const labelCode of labels) {
          predictions.push(
            prediction(conversation.conversationId, message, labelCode),
          );
        }
        hasPriorShop = true;
        priorShopTexts.push(text);
        if (
          has(
            text,
            /(?:xac nhan don|don hang cua|giao thanh cong|da giao|ma van don)/u,
          )
        ) {
          postSaleContext = true;
        }
      }
    }
  }
  return predictions;
}
