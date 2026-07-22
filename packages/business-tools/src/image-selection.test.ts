import { describe, expect, it } from "vitest";
import {
  selectImages,
  selectPriceCardImages,
  selectRequestedImages,
  verifiedImageUrls,
} from "./image-selection.js";
import type { ProductImage, StableProductDocument } from "./types.js";

function image(url: string, overrides: Partial<ProductImage> = {}): ProductImage {
  return {
    url,
    role: "ADDITIONAL",
    angle: "FRONT",
    imageType: "MODEL",
    intents: [],
    sortOrder: 0,
    qualityScore: null,
    feedback: false,
    ...overrides,
  };
}

function product(images: readonly ProductImage[]): StableProductDocument {
  return {
    productId: "SD396",
    parentProductId: "SD396",
    canonicalCode: "SD396",
    aliases: [],
    title: "SD396",
    colors: [],
    materials: [],
    silhouettes: [],
    occasions: [],
    imageUrls: images.map((item) => item.url),
    images,
    catalogVersion: "catalog-v2",
  };
}

const main = image("https://cdn.example/main.jpg", { role: "PRIMARY", sortOrder: 1 });
const side = image("https://cdn.example/side.jpg", { angle: "SIDE", sortOrder: 4 });
const back = image("https://cdn.example/back.jpg", { angle: "BACK", sortOrder: 5 });

describe("báo giá", () => {
  it("gửi đúng ảnh chính rồi ảnh nghiêng", () => {
    const selection = selectPriceCardImages(product([back, side, main]));
    expect(selection.images.map((item) => item.url)).toEqual([main.url, side.url]);
    expect(selection.reasonCode).toBe("MAIN_AND_SIDE");
  });

  it("lùi sang ảnh mặt sau khi không có ảnh nghiêng", () => {
    const selection = selectPriceCardImages(product([main, back]));
    expect(selection.images.map((item) => item.url)).toEqual([main.url, back.url]);
    expect(selection.reasonCode).toBe("MAIN_AND_BACK");
  });

  it("lùi tiếp sang ảnh cận chất khi không có cả nghiêng lẫn mặt sau", () => {
    const closeup = image("https://cdn.example/close.jpg", { angle: "CLOSEUP", sortOrder: 3 });
    const selection = selectPriceCardImages(product([main, closeup]));
    expect(selection.images.map((item) => item.url)).toEqual([main.url, closeup.url]);
    expect(selection.reasonCode).toBe("MAIN_AND_DETAIL");
  });

  it("lấy ảnh bất kỳ khi không có cả ba loại", () => {
    const plain = image("https://cdn.example/plain.jpg", { angle: "FRONT", sortOrder: 3 });
    const selection = selectPriceCardImages(product([main, plain]));
    expect(selection.images.map((item) => item.url)).toEqual([main.url, plain.url]);
    expect(selection.reasonCode).toBe("MAIN_AND_ANY");
  });

  it("giữ đúng thứ tự ưu tiên nghiêng trước mặt sau trước cận chất", () => {
    const closeup = image("https://cdn.example/close.jpg", { angle: "CLOSEUP", sortOrder: 2 });
    const selection = selectPriceCardImages(product([main, closeup, back, side]));
    expect(selection.images[1]?.url).toBe(side.url);
    expect(selectPriceCardImages(product([main, closeup, back])).images[1]?.url).toBe(back.url);
  });

  it("chỉ gửi một ảnh khi sản phẩm đúng nghĩa chỉ có một ảnh", () => {
    const selection = selectPriceCardImages(product([main]));
    expect(selection.images.map((item) => item.url)).toEqual([main.url]);
    expect(selection.reasonCode).toBe("MAIN_ONLY_SINGLE_IMAGE");
  });

  it("lấy ảnh FRONT làm ảnh chính khi không mã nào được đánh PRIMARY", () => {
    const front = image("https://cdn.example/front.jpg", { angle: "FRONT", sortOrder: 2 });
    const closeup = image("https://cdn.example/close.jpg", { angle: "CLOSEUP", sortOrder: 1 });
    expect(selectPriceCardImages(product([closeup, front])).images[0]?.url).toBe(front.url);
  });

  it("vẫn gửi ảnh đầu tiên khi sản phẩm chưa có metadata phân loại", () => {
    const legacy: StableProductDocument = {
      ...product([]),
      imageUrls: ["https://cdn.example/legacy.jpg"],
    };
    const selection = selectPriceCardImages(legacy);
    expect(selection.images.map((item) => item.url)).toEqual(["https://cdn.example/legacy.jpg"]);
    expect(selection.reasonCode).toBe("MAIN_ONLY_NO_METADATA");
  });

  // Bản ghi từ bộ nhớ đệm cũ không đi qua schema nên thiếu hẳn trường `images`.
  it("không vỡ khi trường images bị thiếu hoàn toàn", () => {
    const stale = { ...product([]), images: undefined } as unknown as StableProductDocument;
    expect(() => selectPriceCardImages(stale)).not.toThrow();
  });
});

describe("khách xin ảnh", () => {
  it("gửi tối đa 4 ảnh feedback", () => {
    const feedback = Array.from({ length: 6 }, (_, index) =>
      image(`https://cdn.example/fb${index}.jpg`, { feedback: true, sortOrder: index }));
    const selection = selectRequestedImages(product([main, ...feedback]), "FEEDBACK");
    expect(selection.images).toHaveLength(4);
    expect(selection.images.every((item) => item.feedback)).toBe(true);
  });

  it("không thay ảnh feedback bằng ảnh catalog khi chưa có feedback nào", () => {
    const selection = selectRequestedImages(product([main, side]), "FEEDBACK");
    expect(selection.images).toEqual([]);
    expect(selection.reasonCode).toBe("NO_FEEDBACK_IMAGE_AVAILABLE");
  });

  it("giới hạn 2 ảnh cho các loại còn lại", () => {
    const details = Array.from({ length: 4 }, (_, index) =>
      image(`https://cdn.example/d${index}.jpg`, { imageType: "DETAIL", sortOrder: index }));
    expect(selectRequestedImages(product(details), "DETAIL").images).toHaveLength(2);
  });

  it("nhận ảnh chi tiết qua cả image_type, góc cận và intent", () => {
    const byType = image("https://cdn.example/a.jpg", { imageType: "DETAIL" });
    const byAngle = image("https://cdn.example/b.jpg", { angle: "CLOSEUP" });
    const byIntent = image("https://cdn.example/c.jpg", { intents: ["MATERIAL_CLOSEUP"] });
    const selection = selectRequestedImages(product([byType, byAngle, byIntent]), "DETAIL");
    expect(selection.images.length).toBeGreaterThanOrEqual(2);
  });

  it("trả rỗng khi không có ảnh đúng loại, thay vì gửi ảnh loại khác", () => {
    const selection = selectRequestedImages(product([main, side]), "SIZE_GUIDE");
    expect(selection.images).toEqual([]);
    expect(selection.reasonCode).toBe("NO_IMAGE_FOR_SIZE_GUIDE");
  });

  it("coi ảnh flatlay là ảnh sản phẩm không người mẫu", () => {
    const flat = image("https://cdn.example/flat.jpg", { imageType: "FLATLAY" });
    expect(selectRequestedImages(product([main, flat]), "PRODUCT_ONLY").images)
      .toEqual([flat]);
  });

  it("không bao giờ trộn ảnh feedback vào ảnh catalog", () => {
    const fb = image("https://cdn.example/fb.jpg", { feedback: true, angle: "BACK" });
    expect(selectRequestedImages(product([back, fb]), "BACK").images).toEqual([back]);
  });
});

describe("tập ảnh được guard coi là đã xác minh", () => {
  // Đây là lỗi đã chặn 86/99 mã không báo được giá: nhét cả 13 ảnh vào
  // `ProductFactsV1.imageUrls` (trần 6) làm gói facts trượt schema.
  it("không bao giờ vượt trần 6 URL dù sản phẩm có rất nhiều ảnh", () => {
    const many = Array.from({ length: 13 }, (_, index) =>
      image(`https://cdn.example/x${index}.jpg`, { sortOrder: index }));
    expect(verifiedImageUrls(product(many), "PRICE_CARD").length).toBeLessThanOrEqual(6);
  });

  it("chỉ xác minh đúng những ảnh sắp gửi", () => {
    const many = [main, side, back];
    expect(verifiedImageUrls(product(many), "PRICE_CARD")).toEqual([main.url, side.url]);
  });

  it("mọi ảnh được chọn đều nằm trong tập đã xác minh", () => {
    const many = [main, side, back, image("https://cdn.example/z.jpg", { imageType: "DETAIL" })];
    for (const purpose of ["PRICE_CARD", "DETAIL", "BACK", "GENERIC"] as const) {
      const verified = new Set(verifiedImageUrls(product(many), purpose));
      for (const chosen of selectImages(product(many), purpose).images) {
        expect(verified.has(chosen.url)).toBe(true);
      }
    }
  });
});

describe("mã có nhiều ảnh PRIMARY", () => {
  // SV635 ngoài thực tế: ảnh PRIMARY đầu tiên là ảnh nghiêng, ảnh PRIMARY thứ
  // hai mới là chính diện. Lấy nhầm thì ảnh chính thành ảnh nghiêng.
  it("chọn ảnh PRIMARY chính diện làm ảnh chính, ảnh nghiêng làm ảnh thứ hai", () => {
    const primarySide = image("https://cdn.example/p-side.jpg", {
      role: "PRIMARY", angle: "SIDE", sortOrder: 6,
    });
    const primaryFront = image("https://cdn.example/p-front.jpg", {
      role: "PRIMARY", angle: "FRONT", sortOrder: 11,
    });
    const selection = selectPriceCardImages(product([primarySide, primaryFront]));
    expect(selection.images.map((item) => item.url)).toEqual([primaryFront.url, primarySide.url]);
    expect(selection.reasonCode).toBe("MAIN_AND_SIDE");
  });
});
