import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  GoogleSheetsManualImageIntake,
  MANUAL_IMAGE_INTAKE_HEADERS,
} from "./product-media.js";

test("manual product image upload stores only the resized URL and removes originals after 24 hours", async () => {
  const root = await mkdtemp(join(tmpdir(), "lana-product-media-"));
  const publicDirectory = join(root, "public");
  const originalDirectory = join(root, "originals");
  const original = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]);
  const resized = Buffer.from([0xff, 0xd8, 0xff, 0x10, 0x20, 0x30]);
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  let clock = new Date("2026-07-24T00:00:00.000Z");
  let appendedValues: unknown[][] = [];

  const fetchImpl = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const decodedUrl = decodeURIComponent(url);
    if (url === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "test-token", expires_in: 3600 });
    }
    if (decodedUrl.includes("product_registry!A:AZ")) {
      return Response.json({ values: [["MA_SP", "BRAND", "ACTIVE"], ["CB182", "La.na Design", true]] });
    }
    if (url.includes("fields=sheets.properties.title")) {
      return Response.json({ sheets: [{ properties: { title: "manual_image_intake" } }] });
    }
    if (decodedUrl.includes("manual_image_intake!A:O") && init?.method === "GET") {
      return Response.json({ values: [[...MANUAL_IMAGE_INTAKE_HEADERS]] });
    }
    if (url.includes(":append")) {
      appendedValues = (JSON.parse(String(init?.body)) as { values: unknown[][] }).values;
      return Response.json({});
    }
    return Response.json({});
  };

  const service = new GoogleSheetsManualImageIntake({
    directory: publicDirectory,
    originalDirectory,
    publicBaseUrl: "https://admin.lanadesign.vn/lana-public/products",
    maxBytes: 8_388_608,
    resizeMaxDimension: 1_600,
    originalTtlMs: 86_400_000,
    cleanupIntervalMs: 3_600_000,
    spreadsheetId: "sheet-id",
    serviceAccount: {
      email: "test@example.iam.gserviceaccount.com",
      privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    },
    fetchImpl: fetchImpl as typeof fetch,
    now: () => clock,
    resizeImpl: async (input, mimeType, maxDimension) => {
      assert.deepEqual(input, original);
      assert.equal(mimeType, "image/jpeg");
      assert.equal(maxDimension, 1_600);
      return resized;
    },
  });

  try {
    const result = await service.upload(
      { email: "owner@example.com", role: "OWNER", pageScope: "ALL", subject: "owner-1" },
      {
        maSp: "cb182",
        brand: "La.na Design",
        originalFileName: "cb182-original.jpg",
        mimeType: "image/jpeg",
        contentBase64: original.toString("base64"),
      },
    );

    const publicFiles = await readdir(publicDirectory);
    const originalFiles = await readdir(originalDirectory);
    assert.equal(publicFiles.length, 1);
    assert.equal(originalFiles.length, 1);
    assert.deepEqual(await readFile(join(publicDirectory, publicFiles[0]!)), resized);
    assert.equal(result.imageUrl, `https://admin.lanadesign.vn/lana-public/products/${publicFiles[0]}`);
    if (process.platform !== "win32") {
      assert.equal((await stat(publicDirectory)).mode & 0o777, 0o755);
      assert.equal((await stat(join(publicDirectory, publicFiles[0]!))).mode & 0o777, 0o644);
      assert.equal((await stat(join(originalDirectory, originalFiles[0]!))).mode & 0o777, 0o600);
    }
    assert.equal(appendedValues[0]?.[2], result.imageUrl);
    assert.equal(appendedValues[0]?.[3], "AI_AUTO");
    assert.equal(appendedValues[0]?.[7], "PENDING_AI");
    assert.equal(appendedValues[0]?.[15], "La.na Design");
    assert.notEqual(appendedValues[0]?.[2], join(originalDirectory, originalFiles[0]!));

    clock = new Date("2026-07-25T01:00:00.000Z");
    const oldTime = new Date("2026-07-24T00:00:00.000Z");
    await utimes(join(originalDirectory, originalFiles[0]!), oldTime, oldTime);
    assert.equal(await service.cleanupExpiredOriginals(), 1);
    assert.deepEqual(await readdir(originalDirectory), []);
    assert.deepEqual(await readdir(publicDirectory), publicFiles);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("media pipeline redacts errors and retries only the same retryable intake row", async () => {
  const root = await mkdtemp(join(tmpdir(), "lana-product-media-pipeline-"));
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const intakeId = "a".repeat(32);
  const hash = "deadbeef";
  const putRanges: string[] = [];
  const intake = [
    [...MANUAL_IMAGE_INTAKE_HEADERS],
    [
      intakeId,
      "CB182",
      "https://untrusted.example/cb182.jpg",
      "AI_AUTO",
      "",
      "",
      true,
      "ERROR",
      "owner-1",
      "2026-07-24T00:00:00.000Z",
      hash,
      "cb182.jpg",
      "image-1",
      "2026-07-24T00:01:00.000Z",
      "timeout https://private.example/path owner@example.com",
      "La.na Design",
    ],
  ];
  const registry = [["IMAGE_HASH", "IMAGE_ID", "REVIEW_STATUS", "ACTIVE", "PUBLISHED_HASH", "PUBLISHED_AT"]];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const decodedUrl = decodeURIComponent(url);
    if (url === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "test-token", expires_in: 3600 });
    }
    if (url.includes("fields=sheets.properties.title")) {
      return Response.json({ sheets: [{ properties: { title: "manual_image_intake" } }] });
    }
    if (decodedUrl.includes("manual_image_intake!A:P") && (!init?.method || init.method === "GET")) {
      return Response.json({ values: intake });
    }
    if (decodedUrl.includes("image_registry!A:AP") && (!init?.method || init.method === "GET")) {
      return Response.json({ values: registry });
    }
    if (init?.method === "PUT") {
      putRanges.push(decodedUrl);
      if (decodedUrl.includes("manual_image_intake!H2")) intake[1]![7] = "PENDING_AI";
      if (decodedUrl.includes("manual_image_intake!M2:O2")) {
        intake[1]![13] = "";
        intake[1]![14] = "";
      }
      return Response.json({});
    }
    return Response.json({});
  };
  const service = new GoogleSheetsManualImageIntake({
    directory: join(root, "public"),
    originalDirectory: join(root, "originals"),
    publicBaseUrl: "https://admin.lanadesign.vn/lana-public/products",
    maxBytes: 8_388_608,
    resizeMaxDimension: 1_600,
    originalTtlMs: 86_400_000,
    cleanupIntervalMs: 3_600_000,
    spreadsheetId: "sheet-id",
    serviceAccount: {
      email: "test@example.iam.gserviceaccount.com",
      privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    },
    fetchImpl: fetchImpl as typeof fetch,
    now: () => new Date("2026-07-24T02:00:00.000Z"),
  });

  try {
    const pipeline = await service.pipeline();
    assert.equal(pipeline.items[0]?.stage, "ERROR");
    assert.equal(pipeline.items[0]?.retryable, true);
    assert.equal(pipeline.items[0]?.duplicateChecksum, false);
    assert.equal(pipeline.items[0]?.error, "timeout [redacted-url] [redacted-email]");
    assert.equal(pipeline.items[0]?.imageUrl, "");
    const retried = await service.retry(
      { email: "owner@example.com", role: "OWNER", pageScope: "ALL", subject: "owner-1" },
      intakeId,
    );
    assert.equal(retried.status, "PENDING_AI");
    assert.equal(retried.intakeId, intakeId);
    assert.ok(putRanges.some((range) => range.includes("manual_image_intake!H2")));
    assert.ok(putRanges.some((range) => range.includes("manual_image_intake!M2:O2")));
    const writeCount = putRanges.length;
    const repeated = await service.retry(
      { email: "owner@example.com", role: "OWNER", pageScope: "ALL", subject: "owner-1" },
      intakeId,
    );
    assert.equal(repeated.status, "PENDING_AI");
    assert.equal(putRanges.length, writeCount);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
