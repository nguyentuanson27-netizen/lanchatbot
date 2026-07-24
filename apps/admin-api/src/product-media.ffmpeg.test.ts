import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { resizeProductImage } from "./product-media.js";

const ffmpegAvailable = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0
  && spawnSync("ffprobe", ["-version"], { stdio: "ignore" }).status === 0;

const formats = [
  { mimeType: "image/jpeg", codec: "mjpeg", signature: (value: Buffer) => value.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) },
  { mimeType: "image/png", codec: "png", signature: (value: Buffer) => value.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) },
  { mimeType: "image/webp", codec: "libwebp", signature: (value: Buffer) =>
      value.subarray(0, 4).toString("ascii") === "RIFF" && value.subarray(8, 12).toString("ascii") === "WEBP" },
] as const;

for (const format of formats) {
  test(`real ffmpeg resizes ${format.mimeType} without changing format`, { skip: !ffmpegAvailable }, async () => {
    const generated = spawnSync("ffmpeg", [
      "-hide_banner",
      "-loglevel", "error",
      "-f", "lavfi",
      "-i", "color=c=0x2f6f5f:s=2400x3600",
      "-frames:v", "1",
      "-f", "image2pipe",
      "-vcodec", format.codec,
      "pipe:1",
    ], { encoding: null, maxBuffer: 32 * 1024 * 1024 });
    assert.equal(generated.status, 0, generated.stderr?.toString());
    assert.ok(generated.stdout.length > 0);

    const resized = await resizeProductImage(generated.stdout, format.mimeType, 1_600);
    assert.equal(format.signature(resized), true);
    const probed = spawnSync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "json",
      "pipe:0",
    ], { input: resized, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    assert.equal(probed.status, 0, probed.stderr);
    const body = JSON.parse(probed.stdout) as { streams?: { width?: number; height?: number }[] };
    const dimensions = body.streams?.[0];
    assert.ok(dimensions?.width);
    assert.ok(dimensions?.height);
    assert.ok(Math.max(dimensions.width, dimensions.height) <= 1_600);
    assert.ok(Math.max(dimensions.width, dimensions.height) > 1_500);
  });
}

test("real ffmpeg rejects unsupported output MIME", async () => {
  await assert.rejects(
    resizeProductImage(Buffer.from("not-an-image"), "image/gif", 1_600),
    /PRODUCT_MEDIA_MIME_INVALID/u,
  );
});
