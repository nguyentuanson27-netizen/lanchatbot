import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { resizeProductImage } from "./product-media.js";

const formats = ["image/jpeg", "image/png", "image/webp"] as const;

async function fixture(mimeType: typeof formats[number]): Promise<Buffer> {
  let image = sharp({
    create: {
      width: 2_400,
      height: 3_600,
      channels: 3,
      background: { r: 47, g: 111, b: 95 },
    },
  });
  if (mimeType === "image/jpeg") image = image.jpeg();
  else if (mimeType === "image/png") image = image.png();
  else image = image.webp();
  return image.toBuffer();
}

for (const mimeType of formats) {
  test(`sharp resizes ${mimeType} without changing format`, async () => {
    const resized = await resizeProductImage(await fixture(mimeType), mimeType, 1_600);
    const metadata = await sharp(resized).metadata();

    assert.equal(metadata.format, mimeType.replace("image/", "").replace("jpeg", "jpeg"));
    assert.ok(metadata.width);
    assert.ok(metadata.height);
    assert.ok(Math.max(metadata.width, metadata.height) <= 1_600);
    assert.ok(Math.max(metadata.width, metadata.height) > 1_500);
  });
}

test("sharp rejects unsupported output MIME", async () => {
  await assert.rejects(
    resizeProductImage(Buffer.from("not-an-image"), "image/gif", 1_600),
    /PRODUCT_MEDIA_MIME_INVALID/u,
  );
});
