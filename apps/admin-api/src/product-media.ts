import { createHash, createSign, randomUUID } from "node:crypto";
import sharp from "sharp";
import { chmod, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AdminIdentity } from "./types.js";
import {
  PostgresProductMediaIntakeStore,
  type ProductMediaIntakeInput,
  type ProductMediaLegacyIntake,
} from "@lana/database";

export const MANUAL_IMAGE_INTAKE_SHEET = "manual_image_intake";
export const MANUAL_IMAGE_INTAKE_HEADERS = [
  "INTAKE_ID",
  "MA_SP",
  "IMAGE_URL",
  "MEDIA_PURPOSE",
  "IMAGE_INTENTS",
  "NOTES",
  "ACTIVE",
  "STATUS",
  "UPLOADED_BY",
  "UPLOADED_AT",
  "IMAGE_HASH",
  "ORIGINAL_FILE_NAME",
  "IMAGE_ID",
  "PROCESSED_AT",
  "ERROR",
  "BRAND",
] as const;

export interface ProductMediaUploadInput {
  readonly maSp: string;
  readonly brand: string;
  readonly originalFileName: string;
  readonly mimeType: string;
  readonly contentBase64: string;
}

export interface ProductMediaUploadResult {
  readonly intakeId: string;
  readonly maSp: string;
  readonly brand: string;
  readonly imageUrl: string;
  readonly classificationStatus: "PENDING_AI";
  readonly status: "PENDING_AI";
  readonly uploadedAt: string;
  readonly duplicate: boolean;
}

export interface ProductMediaCatalog {
  readonly brands: readonly string[];
  readonly products: readonly {
    readonly maSp: string;
    readonly brand: string;
    readonly active: boolean;
  }[];
}

export interface ProductMediaPipelineItem {
  readonly intakeId: string;
  readonly maSp: string;
  readonly brand: string;
  readonly imageUrl: string;
  readonly imageHash: string;
  readonly imageId: string | null;
  readonly stage: "PENDING_AI" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ACTIVE" | "QDRANT" | "ERROR";
  readonly reviewStatus: string | null;
  readonly duplicateChecksum: boolean;
  readonly retryable: boolean;
  readonly lastAttemptAt: string | null;
  readonly error: string | null;
}

export interface ProductMediaPipeline {
  readonly items: readonly ProductMediaPipelineItem[];
  readonly counts: Readonly<Record<string, number>>;
}

export interface ProductMediaRetryResult {
  readonly intakeId: string;
  readonly status: "PENDING_AI";
  readonly retriedAt: string;
}

export interface ProductMediaService {
  ready(): Promise<boolean>;
  catalog(): Promise<ProductMediaCatalog>;
  pipeline(limit?: number): Promise<ProductMediaPipeline>;
  retry(identity: AdminIdentity, intakeId: string): Promise<ProductMediaRetryResult>;
  upload(identity: AdminIdentity, input: ProductMediaUploadInput): Promise<ProductMediaUploadResult>;
  close?(): Promise<void>;
}
export interface ProductMediaDedupeStore {
  ready(): Promise<boolean>;
  reserve(input: ProductMediaIntakeInput): ReturnType<PostgresProductMediaIntakeStore["reserve"]>;
  backfill(inputs: readonly ProductMediaLegacyIntake[]): Promise<number>;
  markProjected(intakeId: string, imageUrl: string): Promise<void>;
  markFailed(intakeId: string, errorCode: string): Promise<void>;
  close(): Promise<void>;
}

interface ServiceAccountCredential {
  readonly email: string;
  readonly privateKey: string;
}

export interface ProductMediaServiceOptions {
  readonly directory: string;
  readonly originalDirectory: string;
  readonly publicBaseUrl: string;
  readonly maxBytes: number;
  readonly resizeMaxDimension: number;
  readonly resizeConcurrency?: number;
  readonly originalTtlMs: number;
  readonly cleanupIntervalMs: number;
  readonly registryCacheMs?: number;
  readonly spreadsheetId: string;
  readonly serviceAccount: ServiceAccountCredential;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => Date;
  readonly resizeImpl?: (input: Buffer, mimeType: string, maxDimension: number) => Promise<Buffer>;
  readonly dedupeStore?: ProductMediaDedupeStore;
}

const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Still-image resize is handled in-process by sharp/libvips.

const RETRYABLE_MEDIA_ERROR =
  /too many requests|timeout|timed out|econnreset|socket hang up|(?<!\d)(?:429|500|502|503|504)(?!\d)/iu;

function safePipelineError(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.replace(/https?:\/\/\S+/giu, "[redacted-url]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/gu, "[redacted-email]")
    .slice(0, 240);
}

const PENDING_PUBLIC_PREFIX = ".pending-public-";
const base64Url = (value: string | Buffer): string => Buffer.from(value).toString("base64url");

function normalizePrivateKey(value: string): string {
  return value.trim().replace(/^=+/u, "").replace(/\\n/gu, "\n");
}

function validImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  if (mimeType === "image/webp") {
    return buffer.length >= 12
      && buffer.subarray(0, 4).toString("ascii") === "RIFF"
      && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

export async function resizeProductImage(
  input: Buffer,
  mimeType: string,
  maxDimension: number,
): Promise<Buffer> {
  if (!(mimeType in MIME_EXTENSIONS)) throw new Error("PRODUCT_MEDIA_MIME_INVALID");
  const boundedDimension = Math.max(320, Math.min(4_096, Math.trunc(maxDimension)));
  let image = sharp(input, {
    failOn: "error",
    limitInputPixels: 40_000_000,
    sequentialRead: true,
  })
    .rotate()
    .resize({
      width: boundedDimension,
      height: boundedDimension,
      fit: "inside",
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    });
  if (mimeType === "image/jpeg") image = image.jpeg({ quality: 85, chromaSubsampling: "4:2:0" });
  else if (mimeType === "image/png") image = image.png({ compressionLevel: 7 });
  else image = image.webp({ quality: 85 });
  return image.toBuffer();
}

function sheetRows(values: unknown[][]): Record<string, string>[] {
  const headers = (values[0] ?? []).map((value) => String(value ?? "").trim().toUpperCase());
  return values.slice(1).map((row) => Object.fromEntries(
    headers.map((header, index) => [header, String(row[index] ?? "").trim()]),
  ));
}

const normalizeLookupValue = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]/giu, "")
    .toLowerCase();

interface RegistryProduct {
  readonly maSp: string;
  readonly brand: string;
  readonly active: boolean;
}

export class GoogleSheetsManualImageIntake implements ProductMediaService {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly resizeImpl: (input: Buffer, mimeType: string, maxDimension: number) => Promise<Buffer>;
  private readonly resizeConcurrency: number;
  private activeResizes = 0;
  private readonly resizeWaiters: Array<() => void> = [];
  private readonly intakeLocks = new Map<string, Promise<void>>();
  private accessToken: { value: string; expiresAt: number } | null = null;
  private registryCache: { expiresAt: number; products: readonly RegistryProduct[] } | null = null;
  private readonly dedupeStore: ProductMediaDedupeStore | undefined;
  private dedupeIndexPromise: Promise<void> | null = null;

  constructor(private readonly options: ProductMediaServiceOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.resizeImpl = options.resizeImpl ?? resizeProductImage;
    this.resizeConcurrency = Math.max(1, Math.min(4, Math.trunc(options.resizeConcurrency ?? 2)));
    void this.cleanupExpiredOriginals().catch(() => undefined);
    this.dedupeStore = options.dedupeStore;
    const cleanupTimer = setInterval(() => {
      void this.cleanupExpiredOriginals().catch(() => undefined);
    }, options.cleanupIntervalMs);
    cleanupTimer.unref();
  }

  async ready(): Promise<boolean> {
    const configured = Boolean(
      this.options.directory
      && this.options.originalDirectory
      && this.options.publicBaseUrl.startsWith("https://")
      && this.options.spreadsheetId
      && this.options.serviceAccount.email.includes("@")
      && this.options.serviceAccount.privateKey.includes("PRIVATE KEY"),
    );
    return configured && (!this.dedupeStore || await this.dedupeStore.ready());
  }

  async close(): Promise<void> {
    await this.dedupeStore?.close();
  }

  async catalog(): Promise<ProductMediaCatalog> {
    const products = await this.products();
    return {
      brands: [...new Set(products.filter((product) => product.active).map((product) => product.brand))]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "vi")),
      products,
    };
  }

  async pipeline(limit = 100): Promise<ProductMediaPipeline> {
    await this.ensureSheet();
    const [intakeValues, registryValues] = await Promise.all([
      this.getValues(`${MANUAL_IMAGE_INTAKE_SHEET}!A:P`),
      this.getValues("image_registry!A:AP").catch(() => []),
    ]);
    const intakeRows = sheetRows(intakeValues);
    const publicImagePrefix = `${this.options.publicBaseUrl.replace(/\/+$/u, "")}/`;
    const registryRows = sheetRows(registryValues);
    const checksumCounts = new Map<string, number>();
    for (const row of intakeRows) {
      const hash = String(row.IMAGE_HASH ?? "").toLowerCase();
      if (hash) checksumCounts.set(hash, (checksumCounts.get(hash) ?? 0) + 1);
    }
    const registryByHash = new Map(registryRows.filter((row) => row.IMAGE_HASH)
      .map((row) => [String(row.IMAGE_HASH).toLowerCase(), row]));
    const registryById = new Map(registryRows.filter((row) => row.IMAGE_ID)
      .map((row) => [String(row.IMAGE_ID), row]));
    const items = intakeRows.slice()
      .sort((left, right) => String(right.UPLOADED_AT).localeCompare(String(left.UPLOADED_AT)))
      .slice(0, Math.max(1, Math.min(500, Math.trunc(limit))))
      .map((row): ProductMediaPipelineItem => {
        const hash = String(row.IMAGE_HASH ?? "").toLowerCase();
        const imageId = String(row.IMAGE_ID ?? "") || null;
        const registry = (imageId ? registryById.get(imageId) : undefined) ?? registryByHash.get(hash);
        const intakeStatus = String(row.STATUS ?? "PENDING_AI").toUpperCase();
        const reviewStatus = registry ? String(registry.REVIEW_STATUS ?? "PENDING").toUpperCase() : null;
        const published = Boolean(registry?.PUBLISHED_HASH || registry?.PUBLISHED_AT);
        const active = !["FALSE", "0", "NO", "N"].includes(String(registry?.ACTIVE ?? "FALSE").toUpperCase());
        const error = safePipelineError(row.ERROR);
        const stage: ProductMediaPipelineItem["stage"] = intakeStatus === "ERROR" ? "ERROR"
          : published ? "QDRANT"
            : reviewStatus === "REJECTED" ? "REJECTED"
              : reviewStatus === "APPROVED" && active ? "ACTIVE"
                : reviewStatus === "APPROVED" ? "APPROVED"
                  : registry ? "PENDING_REVIEW" : "PENDING_AI";
        return {
          intakeId: String(row.INTAKE_ID ?? ""),
          maSp: String(row.MA_SP ?? ""),
          brand: String(row.BRAND ?? ""),
          imageUrl: String(row.IMAGE_URL ?? "").startsWith(publicImagePrefix)
            ? String(row.IMAGE_URL) : "",
          imageHash: hash,
          imageId,
          stage,
          reviewStatus,
          duplicateChecksum: Boolean(hash && (checksumCounts.get(hash) ?? 0) > 1),
          retryable: stage === "ERROR" && RETRYABLE_MEDIA_ERROR.test(String(row.ERROR ?? "")),
          lastAttemptAt: String(row.PROCESSED_AT ?? "") || null,
          error,
        };
      });
    const counts: Record<string, number> = {};
    for (const item of items) counts[item.stage] = (counts[item.stage] ?? 0) + 1;
    return { items, counts };
  }

  async retry(_identity: AdminIdentity, intakeId: string): Promise<ProductMediaRetryResult> {
    if (!/^[a-f0-9]{32}$/u.test(intakeId)) throw new Error("PRODUCT_MEDIA_INTAKE_ID_INVALID");
    return this.withIntakeLock(intakeId, async () => {
      const values = await this.getValues(`${MANUAL_IMAGE_INTAKE_SHEET}!A:P`);
      const rows: Array<Record<string, string | number> & { rowNumber: number }> =
        sheetRows(values).map((row, index) => ({ ...row, rowNumber: index + 2 }));
      const row = rows.find((candidate) => candidate.INTAKE_ID === intakeId);
      if (!row) throw new Error("PRODUCT_MEDIA_INTAKE_NOT_FOUND");
      const status = String(row.STATUS).toUpperCase();
      // Repeating the same retry never creates another intake or Qdrant point.
      // Once the row has already reached PENDING_AI with its error cleared, the
      // operation is an idempotent success.
      if (status === "PENDING_AI" && !String(row.ERROR ?? "").trim()) {
        return {
          intakeId,
          status: "PENDING_AI",
          retriedAt: String(row.PROCESSED_AT ?? "") || this.now().toISOString(),
        };
      }
      if (status !== "ERROR") throw new Error("PRODUCT_MEDIA_RETRY_STATUS_CONFLICT");
      if (!RETRYABLE_MEDIA_ERROR.test(String(row.ERROR ?? ""))) throw new Error("PRODUCT_MEDIA_RETRY_NOT_ALLOWED");
      const hash = String(row.IMAGE_HASH ?? "").toLowerCase();
      if (!hash || rows.some((candidate) => candidate.INTAKE_ID !== intakeId && String(candidate.IMAGE_HASH ?? "").toLowerCase() === hash)) {
        throw new Error("PRODUCT_MEDIA_RETRY_DUPLICATE_CHECKSUM");
      }
      const registry = sheetRows(await this.getValues("image_registry!A:AP").catch(() => []))
        .find((candidate) => String(candidate.IMAGE_HASH ?? "").toLowerCase() === hash);
      if (registry && (String(registry.REVIEW_STATUS).toUpperCase() === "APPROVED" || registry.PUBLISHED_HASH || registry.PUBLISHED_AT)) {
        throw new Error("PRODUCT_MEDIA_RETRY_ALREADY_PUBLISHED");
      }
      await this.putValues(`${MANUAL_IMAGE_INTAKE_SHEET}!H${row.rowNumber}`, [["PENDING_AI"]]);
      await this.putValues(`${MANUAL_IMAGE_INTAKE_SHEET}!M${row.rowNumber}:O${row.rowNumber}`, [[String(row.IMAGE_ID ?? ""), "", ""]]);
      return { intakeId, status: "PENDING_AI", retriedAt: this.now().toISOString() };
    });
  }

  async upload(identity: AdminIdentity, input: ProductMediaUploadInput): Promise<ProductMediaUploadResult> {
    const maSp = input.maSp.trim().toUpperCase();
    const brand = input.brand.trim();
    if (!/^[A-Z0-9][A-Z0-9._-]{1,39}$/u.test(maSp)) throw new Error("PRODUCT_MEDIA_CODE_INVALID");
    if (!brand || brand.length > 80 || !normalizeLookupValue(brand)) throw new Error("PRODUCT_MEDIA_BRAND_INVALID");
    if (!(input.mimeType in MIME_EXTENSIONS)) throw new Error("PRODUCT_MEDIA_MIME_INVALID");
    if (input.originalFileName.length > 180) throw new Error("PRODUCT_MEDIA_TEXT_INVALID");
    if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(input.contentBase64)) throw new Error("PRODUCT_MEDIA_BASE64_INVALID");

    const image = Buffer.from(input.contentBase64, "base64");
    if (!image.length || image.length > this.options.maxBytes) throw new Error("PRODUCT_MEDIA_SIZE_INVALID");
    if (!validImageSignature(image, input.mimeType)) throw new Error("PRODUCT_MEDIA_SIGNATURE_INVALID");

    const matchedProduct = (await this.products()).find((product) =>
      product.maSp === maSp && normalizeLookupValue(product.brand) === normalizeLookupValue(brand)
    );
    if (!matchedProduct) throw new Error("PRODUCT_MEDIA_PRODUCT_NOT_FOUND");
    if (!matchedProduct.active) throw new Error("PRODUCT_MEDIA_PRODUCT_INACTIVE");

    const hash = createHash("sha256").update(image).digest("hex");
    const canonicalBrand = matchedProduct.brand;
    const intakeId = createHash("sha256")
      .update(`${normalizeLookupValue(canonicalBrand)}|${maSp}|${hash}`)
      .digest("hex")
      .slice(0, 32);
    const extension = MIME_EXTENSIONS[input.mimeType];
    if (!extension) throw new Error("PRODUCT_MEDIA_MIME_INVALID");
    const fileName = `${maSp.toLowerCase()}-${hash.slice(0, 24)}.${extension}`;
    const imageUrl = `${this.options.publicBaseUrl.replace(/\/$/u, "")}/${fileName}`;
    const uploadedAtDate = this.now();
    const uploadedAt = uploadedAtDate.toISOString();
    await this.ensureDedupeIndex();

    return this.withIntakeLock(intakeId, async () => {
      let reservationClaimed = false;
      let reservationRevision = 0;
      if (this.dedupeStore) {
        const reservation = await this.dedupeStore.reserve({
          intakeId,
          brand: canonicalBrand,
          brandKey: normalizeLookupValue(canonicalBrand),
          productCode: maSp,
          imageHash: hash,
          imageUrl,
          uploadedAt: uploadedAtDate,
        });
        if (!reservation.claimed) {
          return {
            intakeId: reservation.record.intakeId,
            maSp: reservation.record.productCode,
            brand: reservation.record.brand,
            imageUrl: reservation.record.imageUrl,
            classificationStatus: "PENDING_AI",
            status: "PENDING_AI",
            uploadedAt: reservation.record.uploadedAt.toISOString(),
            duplicate: true,
          };
        }
        reservationClaimed = true;
        reservationRevision = reservation.record.revision;
      }

      try {
        await this.ensureSheet();
        const shouldCheckSheet = !this.dedupeStore || reservationRevision > 0;
        if (shouldCheckSheet) {
          const existing = sheetRows(await this.getValues(`${MANUAL_IMAGE_INTAKE_SHEET}!A:P`))
            .find((row) =>
              row.INTAKE_ID === intakeId
              || (
                String(row.MA_SP ?? "").toUpperCase() === maSp
                && String(row.IMAGE_HASH ?? "").toLowerCase() === hash
                && (!row.BRAND || normalizeLookupValue(row.BRAND) === normalizeLookupValue(canonicalBrand))
              )
            );
          if (existing) {
            if (this.dedupeStore) {
              await this.dedupeStore.markProjected(intakeId, existing.IMAGE_URL || imageUrl);
            }
            return {
              intakeId,
              maSp,
              brand: existing.BRAND || canonicalBrand,
              imageUrl: existing.IMAGE_URL || imageUrl,
              classificationStatus: "PENDING_AI",
              status: "PENDING_AI",
              uploadedAt: existing.UPLOADED_AT || uploadedAt,
              duplicate: true,
            };
          }
        }

        await mkdir(this.options.directory, { recursive: true, mode: 0o755 });
        await chmod(this.options.directory, 0o755);
        await mkdir(this.options.originalDirectory, { recursive: true, mode: 0o750 });
        const originalPath = join(
          this.options.originalDirectory,
          `${intakeId}-${this.now().getTime()}-${randomUUID()}.${extension}`,
        );
        await writeFile(originalPath, image, { flag: "wx", mode: 0o600 });

        const resized = await this.resizeWithLimit(image, input.mimeType, this.options.resizeMaxDimension)
          .catch(async (error: unknown) => {
            await unlink(originalPath).catch(() => undefined);
            throw error;
          });
        if (!resized.length || resized.length > this.options.maxBytes) {
          await unlink(originalPath).catch(() => undefined);
          throw new Error("PRODUCT_MEDIA_RESIZED_SIZE_INVALID");
        }
        if (!validImageSignature(resized, input.mimeType)) {
          await unlink(originalPath).catch(() => undefined);
          throw new Error("PRODUCT_MEDIA_RESIZED_SIGNATURE_INVALID");
        }
        const finalPath = join(this.options.directory, fileName);
        const temporaryPath = `${finalPath}.${randomUUID()}.tmp`;
        const pendingMarkerPath = join(
          this.options.originalDirectory,
          `${PENDING_PUBLIC_PREFIX}${intakeId}.json`,
        );
        try {
          await writeFile(
            pendingMarkerPath,
            JSON.stringify({ intakeId, fileName, createdAt: uploadedAt }),
            { flag: "w", mode: 0o600 },
          );
          await writeFile(temporaryPath, resized, { flag: "wx", mode: 0o644 });
          await rename(temporaryPath, finalPath);
          await chmod(finalPath, 0o644);
        } catch (error) {
          await unlink(temporaryPath).catch(() => undefined);
          await unlink(finalPath).catch(() => undefined);
          await unlink(pendingMarkerPath).catch(() => undefined);
          await unlink(originalPath).catch(() => undefined);
          throw error;
        }

        await this.appendValues(`${MANUAL_IMAGE_INTAKE_SHEET}!A:P`, [[
          intakeId,
          maSp,
          imageUrl,
          "AI_AUTO",
          "",
          "",
          true,
          "PENDING_AI",
          identity.email,
          uploadedAt,
          hash,
          input.originalFileName,
          "",
          "",
          "",
          canonicalBrand,
        ]]);
        await this.dedupeStore?.markProjected(intakeId, imageUrl).catch((error: unknown) => {
          const code = safePipelineError(
            error instanceof Error ? error.message : "PRODUCT_MEDIA_DEDUPE_MARK_FAILED",
          )?.slice(0, 128) ?? "PRODUCT_MEDIA_DEDUPE_MARK_FAILED";
          process.stderr.write(`${JSON.stringify({ level: "error", code, intakeId })}\n`);
        });
        await unlink(pendingMarkerPath).catch(() => undefined);
        return {
          intakeId,
          maSp,
          brand: canonicalBrand,
          imageUrl,
          classificationStatus: "PENDING_AI",
          status: "PENDING_AI",
          uploadedAt,
          duplicate: false,
        };
      } catch (error) {
        if (reservationClaimed) {
          const code = safePipelineError(
            error instanceof Error ? error.message : "PRODUCT_MEDIA_UPLOAD_FAILED",
          )?.slice(0, 128) ?? "PRODUCT_MEDIA_UPLOAD_FAILED";
          await this.dedupeStore?.markFailed(intakeId, code).catch(() => undefined);
        }
        throw error;
      }
    });
  }

  private async ensureDedupeIndex(): Promise<void> {
    if (!this.dedupeStore) return;
    if (!this.dedupeIndexPromise) {
      this.dedupeIndexPromise = (async () => {
        await this.ensureSheet();
        const [values, products] = await Promise.all([
          this.getValues(`${MANUAL_IMAGE_INTAKE_SHEET}!A:P`),
          this.products(),
        ]);
        const brandByProduct = new Map(products.map((product) => [product.maSp, product.brand]));
        const inputs: ProductMediaLegacyIntake[] = [];
        for (const row of sheetRows(values)) {
          const intakeId = String(row.INTAKE_ID ?? "").toLowerCase();
          const productCode = String(row.MA_SP ?? "").toUpperCase();
          const imageHash = String(row.IMAGE_HASH ?? "").toLowerCase();
          const brand = String(row.BRAND ?? "").trim() || brandByProduct.get(productCode) || "";
          if (
            !/^[0-9a-f]{32}$/u.test(intakeId)
            || !/^[0-9a-f]{64}$/u.test(imageHash)
            || !productCode
            || !brand
          ) continue;
          const parsedUploadedAt = new Date(String(row.UPLOADED_AT ?? ""));
          inputs.push({
            intakeId,
            brand,
            brandKey: normalizeLookupValue(brand),
            productCode,
            imageHash,
            imageUrl: String(row.IMAGE_URL ?? ""),
            uploadedAt: Number.isNaN(parsedUploadedAt.getTime()) ? this.now() : parsedUploadedAt,
            projectionStatus: "PROJECTED",
          });
        }
        await this.dedupeStore?.backfill(inputs);
      })().catch((error: unknown) => {
        this.dedupeIndexPromise = null;
        throw error;
      });
    }
    return this.dedupeIndexPromise;
  }

  private async products(): Promise<readonly RegistryProduct[]> {
    const now = Date.now();
    if (this.registryCache && this.registryCache.expiresAt > now) return this.registryCache.products;
    const rows = sheetRows(await this.getValues("product_registry!A:AZ"));
    const products = rows
      .map((row) => ({
        maSp: String(row.MA_SP ?? "").trim().toUpperCase(),
        brand: String(row.BRAND ?? "").trim(),
        active: !["FALSE", "0", "NO", "N"].includes(String(row.ACTIVE ?? "TRUE").trim().toUpperCase()),
      }))
      .filter((product) => product.maSp && product.brand);
    this.registryCache = {
      expiresAt: now + Math.max(30_000, this.options.registryCacheMs ?? 300_000),
      products,
    };
    return products;
  }

  async cleanupExpiredOriginals(): Promise<number> {
    await mkdir(this.options.originalDirectory, { recursive: true, mode: 0o750 });
    const cutoff = this.now().getTime() - this.options.originalTtlMs;
    const entries = await readdir(this.options.originalDirectory, { withFileTypes: true });
    let removed = 0;
    await Promise.all(entries.map(async (entry) => {
      if (!entry.isFile() || entry.name.startsWith(PENDING_PUBLIC_PREFIX)) return;
      const path = join(this.options.originalDirectory, entry.name);
      const fileStat = await stat(path).catch(() => null);
      if (!fileStat || fileStat.mtimeMs > cutoff) return;
      await unlink(path).catch(() => undefined);
      removed += 1;
    }));
    removed += await this.reconcilePendingPublicFiles(entries, cutoff);
    return removed;
  }

  private async reconcilePendingPublicFiles(
    entries: readonly { isFile(): boolean; name: string }[],
    cutoff: number,
  ): Promise<number> {
    const pending = entries.filter((entry) =>
      entry.isFile() && entry.name.startsWith(PENDING_PUBLIC_PREFIX)
    );
    if (pending.length === 0) return 0;
    const eligible: { markerPath: string; intakeId: string; fileName: string }[] = [];
    for (const entry of pending) {
      const markerPath = join(this.options.originalDirectory, entry.name);
      const fileStat = await stat(markerPath).catch(() => null);
      if (!fileStat || fileStat.mtimeMs > cutoff) continue;
      const marker = await readFile(markerPath, "utf8")
        .then((value) => JSON.parse(value) as { intakeId?: unknown; fileName?: unknown })
        .catch(() => null);
      const intakeId = typeof marker?.intakeId === "string" ? marker.intakeId : "";
      const fileName = typeof marker?.fileName === "string" ? marker.fileName : "";
      if (!/^[a-f0-9]{32}$/u.test(intakeId) || !/^[a-z0-9._-]{3,200}$/u.test(fileName)) {
        await unlink(markerPath).catch(() => undefined);
        continue;
      }
      eligible.push({ markerPath, intakeId, fileName });
    }
    if (eligible.length === 0) return 0;

    const values = await this.getValues(`${MANUAL_IMAGE_INTAKE_SHEET}!A:P`)
      .catch(() => null);
    if (values === null) return 0;
    const recorded = new Set(sheetRows(values).map((row) => row.INTAKE_ID).filter(Boolean));
    let removed = 0;
    for (const item of eligible) {
      if (!recorded.has(item.intakeId)) {
        await unlink(join(this.options.directory, item.fileName)).catch(() => undefined);
        removed += 1;
      }
      await unlink(item.markerPath).catch(() => undefined);
    }
    return removed;
  }

  private async resizeWithLimit(
    input: Buffer,
    mimeType: string,
    maxDimension: number,
  ): Promise<Buffer> {
    if (this.activeResizes >= this.resizeConcurrency) {
      await new Promise<void>((resolve) => this.resizeWaiters.push(resolve));
    }
    this.activeResizes += 1;
    try {
      return await this.resizeImpl(input, mimeType, maxDimension);
    } finally {
      this.activeResizes = Math.max(0, this.activeResizes - 1);
      this.resizeWaiters.shift()?.();
    }
  }

  private async withIntakeLock<T>(intakeId: string, operation: () => Promise<T>): Promise<T> {
    const predecessor = this.intakeLocks.get(intakeId) ?? Promise.resolve();
    let release: (() => void) | undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = predecessor.then(() => current);
    this.intakeLocks.set(intakeId, queued);
    await predecessor;
    try {
      return await operation();
    } finally {
      release?.();
      if (this.intakeLocks.get(intakeId) === queued) this.intakeLocks.delete(intakeId);
    }
  }

  private async token(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.accessToken.expiresAt - 60_000 > now) return this.accessToken.value;
    const issuedAt = Math.floor(now / 1_000);
    const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = base64Url(JSON.stringify({
      iss: this.options.serviceAccount.email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: issuedAt,
      exp: issuedAt + 3_600,
    }));
    const unsigned = `${header}.${payload}`;
    const signature = createSign("RSA-SHA256").update(unsigned).end()
      .sign(normalizePrivateKey(this.options.serviceAccount.privateKey));
    const response = await this.fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${unsigned}.${base64Url(signature)}`,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = await response.json().catch(() => null) as { access_token?: string; expires_in?: number } | null;
    if (!response.ok || typeof body?.access_token !== "string") throw new Error("PRODUCT_MEDIA_SHEETS_AUTH_FAILED");
    this.accessToken = { value: body.access_token, expiresAt: now + Math.max(60, Number(body.expires_in ?? 3_600)) * 1_000 };
    return body.access_token;
  }

  private async sheetsRequest(url: string, init: RequestInit): Promise<unknown> {
    const token = await this.token();
    const response = await this.fetchImpl(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`PRODUCT_MEDIA_SHEETS_HTTP_${response.status}`);
    return response.json();
  }

  private async getValues(range: string): Promise<unknown[][]> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(this.options.spreadsheetId)}`
      + `/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;
    const body = await this.sheetsRequest(url, { method: "GET" }) as { values?: unknown[][] };
    return Array.isArray(body.values) ? body.values : [];
  }

  private async ensureSheet(): Promise<void> {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(this.options.spreadsheetId)}`
      + "?fields=sheets.properties.title";
    const meta = await this.sheetsRequest(metaUrl, { method: "GET" }) as { sheets?: { properties?: { title?: string } }[] };
    const exists = (meta.sheets ?? []).some((sheet) => sheet.properties?.title === MANUAL_IMAGE_INTAKE_SHEET);
    if (!exists) {
      await this.sheetsRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(this.options.spreadsheetId)}:batchUpdate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ requests: [{ addSheet: { properties: { title: MANUAL_IMAGE_INTAKE_SHEET, gridProperties: { rowCount: 2_000, columnCount: 16, frozenRowCount: 1 } } } }] }),
        },
      );
    }
    await this.sheetsRequest(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(this.options.spreadsheetId)}/values/${encodeURIComponent(`${MANUAL_IMAGE_INTAKE_SHEET}!A1:P1`)}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ majorDimension: "ROWS", values: [[...MANUAL_IMAGE_INTAKE_HEADERS]] }),
      },
    );
  }

  private async putValues(range: string, values: readonly (readonly (string | boolean)[])[]): Promise<void> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(this.options.spreadsheetId)}`
      + `/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
    await this.sheetsRequest(url, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ majorDimension: "ROWS", values }),
    });
  }

  private async appendValues(range: string, values: readonly (readonly (string | boolean)[])[]): Promise<void> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(this.options.spreadsheetId)}`
      + `/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
    await this.sheetsRequest(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ majorDimension: "ROWS", values }),
    });
  }
}

export function createProductMediaService(
  options: Omit<ProductMediaServiceOptions, "serviceAccount" | "dedupeStore"> & {
    credentialJson: string;
    databaseUrl: string;
  },
): ProductMediaService {
  const { credentialJson, databaseUrl, ...serviceOptions } = options;
  const parsed = JSON.parse(credentialJson) as { email?: unknown; privateKey?: unknown };
  if (typeof parsed.email !== "string" || typeof parsed.privateKey !== "string") {
    throw new Error("PRODUCT_MEDIA_GOOGLE_CREDENTIAL_INVALID");
  }
  return new GoogleSheetsManualImageIntake({
    ...serviceOptions,
    serviceAccount: { email: parsed.email, privateKey: parsed.privateKey },
    dedupeStore: new PostgresProductMediaIntakeStore(databaseUrl),
  });
}

export function parseProductMediaUploadBody(value: unknown): ProductMediaUploadInput {
  const body = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    maSp: String(body.ma_sp ?? ""),
    brand: String(body.brand ?? ""),
    originalFileName: String(body.file_name ?? ""),
    mimeType: String(body.mime_type ?? "").trim().toLowerCase(),
    contentBase64: String(body.content_base64 ?? "").trim(),
  };
}
