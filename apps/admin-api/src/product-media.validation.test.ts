import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdtemp, readdir, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  GoogleSheetsManualImageIntake,
  MANUAL_IMAGE_INTAKE_HEADERS,
  type ProductMediaUploadInput,
} from "./product-media.js";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const identity = { email: "owner@example.com", role: "OWNER" as const, pageScope: "ALL" as const, subject: "owner-1" };
const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]);
const resizedJpeg = Buffer.from([0xff, 0xd8, 0xff, 0x10, 0x20]);

function uploadInput(overrides: Partial<ProductMediaUploadInput> = {}): ProductMediaUploadInput {
  return {
    maSp: "CB182",
    mediaPurpose: "DETAIL_FABRIC",
    notes: "",
    originalFileName: "cb182.jpg",
    mimeType: "image/jpeg",
    contentBase64: validJpeg.toString("base64"),
    ...overrides,
  };
}

async function createHarness(options: {
  productExists?: boolean;
  existingRows?: unknown[][];
  maxBytes?: number;
  resizeImpl?: (input: Buffer, mimeType: string, maxDimension: number) => Promise<Buffer>;
  appendDelayMs?: number;
  appendFailure?: boolean;
  now?: () => Date;
} = {}) {
  const root = await mkdtemp(join(tmpdir(), "lana-product-media-validation-"));
  const rows: unknown[][] = options.existingRows
    ? options.existingRows.map((row) => [...row])
    : [[...MANUAL_IMAGE_INTAKE_HEADERS]];
  let appendCount = 0;
  let resizeCount = 0;
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const decodedUrl = decodeURIComponent(url);
    if (url === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "test-token", expires_in: 3_600 });
    }
    if (decodedUrl.includes("product_registry!A:A")) {
      return Response.json({ values: options.productExists === false ? [["MA_SP"]] : [["MA_SP"], ["CB182"]] });
    }
    if (url.includes("fields=sheets.properties.title")) {
      return Response.json({ sheets: [{ properties: { title: "manual_image_intake" } }] });
    }
    if (decodedUrl.includes("manual_image_intake!A:O") && init?.method === "GET") {
      return Response.json({ values: rows });
    }
    if (url.includes(":append")) {
      if (options.appendDelayMs) await new Promise((resolve) => setTimeout(resolve, options.appendDelayMs));
      if (options.appendFailure) {
        return Response.json({ error: "temporary" }, { status: 503 });
      }
      const values = (JSON.parse(String(init?.body)) as { values: unknown[][] }).values;
      rows.push(...values.map((row) => [...row]));
      appendCount += 1;
      return Response.json({});
    }
    return Response.json({});
  };
  const service = new GoogleSheetsManualImageIntake({
    directory: join(root, "public"),
    originalDirectory: join(root, "originals"),
    publicBaseUrl: "https://admin.lanadesign.vn/lana-public/products",
    maxBytes: options.maxBytes ?? 8_388_608,
    resizeMaxDimension: 1_600,
    originalTtlMs: 86_400_000,
    cleanupIntervalMs: 3_600_000,
    spreadsheetId: "sheet-id",
    serviceAccount: {
      email: "test@example.iam.gserviceaccount.com",
      privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    },
    fetchImpl: fetchImpl as typeof fetch,
    ...(options.now ? { now: options.now } : {}),
    resizeImpl: async (input, mimeType, maxDimension) => {
      resizeCount += 1;
      return (options.resizeImpl ?? (async () => resizedJpeg))(input, mimeType, maxDimension);
    },
  });
  return {
    service,
    root,
    rows,
    appendCount: () => appendCount,
    resizeCount: () => resizeCount,
  };
}

test("rejects invalid image signatures before accessing Sheets", async () => {
  const harness = await createHarness();
  try {
    await assert.rejects(
      harness.service.upload(identity, uploadInput({ contentBase64: Buffer.from("not-jpeg").toString("base64") })),
      /PRODUCT_MEDIA_SIGNATURE_INVALID/u,
    );
    assert.equal(harness.appendCount(), 0);
  } finally {
    await rm(harness.root, { recursive: true, force: true });
  }
});

test("rejects images above the configured upload limit", async () => {
  const harness = await createHarness({ maxBytes: 4 });
  try {
    await assert.rejects(
      harness.service.upload(identity, uploadInput()),
      /PRODUCT_MEDIA_SIZE_INVALID/u,
    );
    assert.equal(harness.appendCount(), 0);
  } finally {
    await rm(harness.root, { recursive: true, force: true });
  }
});

test("rejects unknown product codes", async () => {
  const harness = await createHarness({ productExists: false });
  try {
    await assert.rejects(
      harness.service.upload(identity, uploadInput()),
      /PRODUCT_MEDIA_PRODUCT_NOT_FOUND/u,
    );
    assert.equal(harness.appendCount(), 0);
  } finally {
    await rm(harness.root, { recursive: true, force: true });
  }
});

test("returns an existing intake without resizing or appending", async () => {
  const imageHash = createHash("sha256").update(validJpeg).digest("hex");
  const intakeId = createHash("sha256").update(`CB182|${imageHash}`).digest("hex").slice(0, 32);
  const existing = [
    [...MANUAL_IMAGE_INTAKE_HEADERS],
    [intakeId, "CB182", "https://cdn.example/existing.jpg", "DETAIL_FABRIC", "", "", true, "PENDING", "", "2026-07-24T00:00:00.000Z"],
  ];
  const harness = await createHarness({ existingRows: existing });
  try {
    const result = await harness.service.upload(identity, uploadInput());
    assert.equal(result.duplicate, true);
    assert.equal(result.imageUrl, "https://cdn.example/existing.jpg");
    assert.equal(harness.resizeCount(), 0);
    assert.equal(harness.appendCount(), 0);
  } finally {
    await rm(harness.root, { recursive: true, force: true });
  }
});

test("rejects invalid resized output and cleans the private original", async () => {
  const harness = await createHarness({
    resizeImpl: async () => Buffer.from("invalid-resized-image"),
  });
  try {
    await assert.rejects(
      harness.service.upload(identity, uploadInput()),
      /PRODUCT_MEDIA_RESIZED_SIGNATURE_INVALID/u,
    );
    assert.deepEqual(await readdir(join(harness.root, "originals")), []);
    assert.equal(harness.appendCount(), 0);
  } finally {
    await rm(harness.root, { recursive: true, force: true });
  }
});

test("rejects resized output above the configured limit and cleans the private original", async () => {
  const harness = await createHarness({
    maxBytes: validJpeg.length,
    resizeImpl: async () => Buffer.from([0xff, 0xd8, 0xff, 0x10, 0x20, 0x30]),
  });
  try {
    await assert.rejects(
      harness.service.upload(identity, uploadInput()),
      /PRODUCT_MEDIA_RESIZED_SIZE_INVALID/u,
    );
    assert.deepEqual(await readdir(join(harness.root, "originals")), []);
    assert.equal(harness.appendCount(), 0);
  } finally {
    await rm(harness.root, { recursive: true, force: true });
  }
});

test("reconciles a public orphan only after the retention window and a Sheet recheck", async () => {
  let clock = new Date("2026-07-24T00:00:00.000Z");
  const harness = await createHarness({
    appendFailure: true,
    now: () => clock,
  });
  try {
    await assert.rejects(
      harness.service.upload(identity, uploadInput()),
      /PRODUCT_MEDIA_SHEETS_HTTP_503/u,
    );
    assert.equal((await readdir(join(harness.root, "public"))).length, 1);
    assert.equal((await readdir(join(harness.root, "originals"))).length, 2);
    const originalNames = await readdir(join(harness.root, "originals"));
    for (const name of originalNames) {
      await utimes(join(harness.root, "originals", name), clock, clock);
    }

    clock = new Date("2026-07-25T01:00:00.000Z");
    assert.equal(await harness.service.cleanupExpiredOriginals(), 2);
    assert.deepEqual(await readdir(join(harness.root, "public")), []);
    assert.deepEqual(await readdir(join(harness.root, "originals")), []);
  } finally {
    await rm(harness.root, { recursive: true, force: true });
  }
});

test("serializes concurrent duplicate uploads and appends one Sheet row", async () => {
  const harness = await createHarness({ appendDelayMs: 25 });
  try {
    const results = await Promise.all([
      harness.service.upload(identity, uploadInput()),
      harness.service.upload(identity, uploadInput()),
    ]);
    assert.equal(results.filter((result) => !result.duplicate).length, 1);
    assert.equal(results.filter((result) => result.duplicate).length, 1);
    assert.equal(harness.resizeCount(), 1);
    assert.equal(harness.appendCount(), 1);
    assert.equal((await readdir(join(harness.root, "public"))).length, 1);
  } finally {
    await rm(harness.root, { recursive: true, force: true });
  }
});
