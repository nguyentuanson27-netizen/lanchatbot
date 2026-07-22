import type { ProductImage, StableProductDocument } from "./types.js";

/** Loại ảnh khách có thể hỏi. `GENERIC` là khi khách xin ảnh mà không nói rõ
 *  loại nào ("cho xem thêm ảnh"). */
export type CustomerImageIntent =
  | "FEEDBACK"
  | "DETAIL"
  | "BACK"
  | "SIZE_GUIDE"
  | "PRODUCT_ONLY"
  | "GENERIC";

export type ImageSelectionPurpose = "PRICE_CARD" | CustomerImageIntent;

export interface ImageSelection {
  readonly images: readonly ProductImage[];
  /** Vì sao chọn được từng đó ảnh. Ghi vào nhật ký, không gửi cho khách. */
  readonly reasonCode: string;
}

/** Số ảnh tối đa cho mỗi mục đích, theo quy tắc vận hành đang áp dụng. */
export const IMAGE_LIMITS: Readonly<Record<ImageSelectionPurpose, number>> = {
  PRICE_CARD: 2,
  FEEDBACK: 4,
  DETAIL: 2,
  BACK: 2,
  SIZE_GUIDE: 2,
  PRODUCT_ONLY: 2,
  GENERIC: 2,
};

const EMPTY: ImageSelection = { images: [], reasonCode: "NO_IMAGE_AVAILABLE" };

function byPresentationOrder(left: ProductImage, right: ProductImage): number {
  if (left.role !== right.role) return left.role === "PRIMARY" ? -1 : 1;
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  return left.url.localeCompare(right.url);
}

function distinct(images: readonly ProductImage[]): ProductImage[] {
  const seen = new Set<string>();
  const output: ProductImage[] = [];
  for (const image of images) {
    if (seen.has(image.url)) continue;
    seen.add(image.url);
    output.push(image);
  }
  return output;
}

/** Bộ nhớ đệm tìm kiếm ghi document dạng JSON thô, không qua schema, nên bản
 *  ghi tạo trước khi có trường `images` sẽ thiếu hẳn trường này. */
function allImages(product: StableProductDocument): readonly ProductImage[] {
  return Array.isArray(product.images) ? product.images : [];
}

/** Ảnh catalog thường, tức không phải feedback của khách. */
function catalogImages(product: StableProductDocument): ProductImage[] {
  return [...allImages(product)].filter((image) => !image.feedback).sort(byPresentationOrder);
}

/**
 * Ảnh chính để mở đầu câu báo giá.
 *
 * Ưu tiên ảnh vừa được đánh `PRIMARY` vừa chụp chính diện. Có mã được đánh nhiều
 * ảnh `PRIMARY` mà ảnh đầu lại là ảnh nghiêng (SV635), lấy đúng ảnh `PRIMARY`
 * đầu tiên sẽ khiến ảnh chính là ảnh nghiêng còn ảnh nghiêng thật thì mất chỗ.
 */
function mainImage(product: StableProductDocument): ProductImage | null {
  const pool = catalogImages(product);
  return pool.find((image) => image.role === "PRIMARY" && image.angle === "FRONT")
    ?? pool.find((image) => image.role === "PRIMARY")
    ?? pool.find((image) => image.angle === "FRONT")
    ?? pool[0]
    ?? null;
}

/** Thứ tự ưu tiên cho ảnh thứ hai của câu báo giá. Hết bậc này mới xuống bậc
 *  sau, và bậc cuối nhận mọi ảnh còn lại để luôn đủ hai ảnh khi sản phẩm có. */
const SECOND_IMAGE_RULES: readonly {
  readonly reasonCode: string;
  readonly matches: (image: ProductImage) => boolean;
}[] = [
  { reasonCode: "MAIN_AND_SIDE", matches: (image) => image.angle === "SIDE" },
  { reasonCode: "MAIN_AND_BACK", matches: (image) => image.angle === "BACK" },
  {
    reasonCode: "MAIN_AND_DETAIL",
    matches: (image) => image.angle === "CLOSEUP"
      || image.imageType === "DETAIL"
      || image.intents.includes("MATERIAL_CLOSEUP"),
  },
  { reasonCode: "MAIN_AND_ANY", matches: () => true },
];

/**
 * Ảnh cho câu báo giá: một ảnh chính và một ảnh phụ.
 *
 * Ảnh phụ đi theo `SECOND_IMAGE_RULES`: ưu tiên ảnh nghiêng, không có thì ảnh
 * mặt sau, rồi ảnh cận chất, cuối cùng là ảnh bất kỳ. Chỉ gửi một ảnh khi sản
 * phẩm đúng nghĩa chỉ có một ảnh.
 */
export function selectPriceCardImages(product: StableProductDocument): ImageSelection {
  const main = mainImage(product);
  if (!main) {
    // Chưa có metadata phân loại (dữ liệu cũ, hoặc bản ghi từ bộ nhớ đệm cũ):
    // vẫn gửi ảnh đầu tiên thay vì không gửi gì. Không suy ra ảnh nghiêng ở đây
    // vì không có căn cứ nào để nói ảnh thứ hai là ảnh nghiêng.
    const fallback = product.imageUrls[0];
    return fallback
      ? {
          images: [{
            url: fallback,
            role: "PRIMARY",
            angle: "UNKNOWN",
            imageType: "OTHER",
            intents: [],
            sortOrder: 0,
            qualityScore: null,
            feedback: false,
          }],
          reasonCode: "MAIN_ONLY_NO_METADATA",
        }
      : EMPTY;
  }
  const others = catalogImages(product).filter((image) => image.url !== main.url);
  for (const rule of SECOND_IMAGE_RULES) {
    const second = others.find((image) => rule.matches(image));
    if (second) return { images: [main, second], reasonCode: rule.reasonCode };
  }
  return { images: [main], reasonCode: "MAIN_ONLY_SINGLE_IMAGE" };
}

function matchesIntent(image: ProductImage, intent: CustomerImageIntent): boolean {
  switch (intent) {
    case "FEEDBACK":
      return image.feedback;
    case "DETAIL":
      return image.imageType === "DETAIL"
        || image.angle === "CLOSEUP"
        || image.intents.includes("DETAIL")
        || image.intents.includes("MATERIAL_CLOSEUP");
    case "BACK":
      return image.angle === "BACK";
    case "SIZE_GUIDE":
      return image.imageType === "SIZE_GUIDE" || image.intents.includes("SIZE_GUIDE");
    case "PRODUCT_ONLY":
      return image.imageType === "PRODUCT_ONLY" || image.imageType === "FLATLAY";
    case "GENERIC":
      return true;
  }
}

/**
 * Ảnh cho lượt khách chủ động xin ảnh.
 *
 * Không có ảnh đúng loại thì trả về rỗng chứ không thay bằng ảnh loại khác:
 * khách hỏi bảng size mà nhận ảnh người mẫu là trả lời sai, và luồng gọi sẽ
 * chuyển nhân viên thay vì gửi bừa.
 */
export function selectRequestedImages(
  product: StableProductDocument,
  intent: CustomerImageIntent,
): ImageSelection {
  const limit = IMAGE_LIMITS[intent];
  if (intent === "FEEDBACK") {
    const feedback = distinct(
      [...allImages(product)].filter((image) => image.feedback).sort(byPresentationOrder),
    );
    return feedback.length > 0
      ? { images: feedback.slice(0, limit), reasonCode: "FEEDBACK_IMAGES" }
      : { images: [], reasonCode: "NO_FEEDBACK_IMAGE_AVAILABLE" };
  }

  const matched = distinct(catalogImages(product).filter((image) => matchesIntent(image, intent)));
  if (matched.length === 0) {
    return { images: [], reasonCode: `NO_IMAGE_FOR_${intent}` };
  }
  return { images: matched.slice(0, limit), reasonCode: `MATCHED_${intent}` };
}

export function selectImages(
  product: StableProductDocument,
  purpose: ImageSelectionPurpose,
): ImageSelection {
  return purpose === "PRICE_CARD"
    ? selectPriceCardImages(product)
    : selectRequestedImages(product, purpose);
}

/**
 * Tập ảnh mà guard được phép coi là đã xác minh cho lượt trả lời này.
 *
 * `ProductFactsV1.imageUrls` chỉ nhận tối đa 6 phần tử. Trước đây runtime nhét
 * toàn bộ ảnh của sản phẩm vào đây mà không cắt, nên với mã nhiều hơn 6 ảnh cả
 * gói business facts trượt schema và guard coi như không có dữ liệu — chặn luôn
 * cả câu báo giá. Giữ đúng tập ảnh sắp gửi vừa khớp hợp đồng vừa thu hẹp quyền.
 */
export const MAX_VERIFIED_IMAGE_URLS = 6;

export function verifiedImageUrls(
  product: StableProductDocument,
  purpose: ImageSelectionPurpose,
): string[] {
  const selected = selectImages(product, purpose).images.map((image) => image.url);
  if (selected.length > 0) return selected.slice(0, MAX_VERIFIED_IMAGE_URLS);
  // Dữ liệu cũ chưa có metadata ảnh: lùi về thứ tự gốc để không mất khả năng
  // đính kèm, vẫn cắt đúng trần hợp đồng.
  return [...product.imageUrls].slice(0, MAX_VERIFIED_IMAGE_URLS);
}
