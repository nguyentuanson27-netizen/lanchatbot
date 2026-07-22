/**
 * Parity check: chạy PosSnapshotRunner của app trên dữ liệu thật (Google Sheets + Pancake POS),
 * ghi vào Redis giả trong bộ nhớ, rồi so sánh với snapshot n8n hiện có trong Redis n8n.
 * Không ghi bất kỳ dữ liệu nào vào Redis thật.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { GoogleSheetsClient } from "../apps/worker/dist/google-sheets-client.js";
import { PancakePosClient } from "../apps/worker/dist/pancake-pos-client.js";
import { PosSnapshotRunner } from "../apps/worker/dist/pos-snapshot-runner.js";

class MemoryRedis {
  store = new Map();
  async set(key, value, options) {
    if (options?.NX && this.store.has(key)) return null;
    this.store.set(key, value);
    return "OK";
  }
  async get(key) { return this.store.get(key) ?? null; }
  async eval() { return 1; }
}

const n8nEnv = (name) =>
  execFileSync("docker", ["exec", "n8n-docker-n8n-1", "sh", "-c", `printf %s "$${name}"`], {
    encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
  });

const n8nRedis = (args) =>
  execFileSync("docker", ["exec", "n8n-docker-redis-1", "redis-cli", ...args], {
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });

const credential = JSON.parse(readFileSync("/opt/lana-chatbot/shared/secrets/vertex_google_api", "utf8"));
const sheetId = n8nEnv("DATA_INGESTION_V2_SHEET_ID");
const shopsSecret = JSON.parse(n8nEnv("PANCAKE_POS_SHOPS_JSON"));
const posBaseUrl = n8nEnv("PANCAKE_POS_BASE_URL") || "https://pos.pages.fm/api/v1";

const redis = new MemoryRedis();
const runner = new PosSnapshotRunner({
  redis,
  sheets: new GoogleSheetsClient({
    serviceAccount: { email: credential.email, privateKey: credential.privateKey },
  }),
  pos: new PancakePosClient({ baseUrl: posBaseUrl }),
  sheetId,
  shopsSecret,
  snapshotTtlSeconds: 172800,
  sheetsWritebackEnabled: false,
  notifier: null,
  runId: "parity-check",
  logger: {
    info: (ctx, msg) => console.log("[info]", msg, JSON.stringify(ctx).slice(0, 400)),
    error: (ctx, msg) => console.log("[error]", msg, JSON.stringify(ctx).slice(0, 400)),
  },
});

console.log("Đang chạy POS snapshot của app trên dữ liệu thật...");
const started = Date.now();
const summary = await runner.run();
console.log("Thời gian chạy:", ((Date.now() - started) / 1000).toFixed(1), "giây");
console.log("Tóm tắt:", JSON.stringify(summary, null, 2));

// --- So sánh với snapshot n8n ---
const appKeys = [...redis.store.keys()].filter((k) => k.startsWith("catalog:offer:"));
const n8nKeys = n8nRedis(["--scan", "--pattern", "catalog:offer:*"]).split("\n").map((s) => s.trim()).filter(Boolean);

console.log(`\nSố snapshot: app=${appKeys.length} n8n=${n8nKeys.length}`);
const onlyApp = appKeys.filter((k) => !n8nKeys.includes(k));
const onlyN8n = n8nKeys.filter((k) => !appKeys.includes(k));
if (onlyApp.length) console.log("Chỉ app có:", onlyApp.slice(0, 10).join(", "), onlyApp.length > 10 ? `(+${onlyApp.length - 10})` : "");
if (onlyN8n.length) console.log("Chỉ n8n có:", onlyN8n.slice(0, 10).join(", "), onlyN8n.length > 10 ? `(+${onlyN8n.length - 10})` : "");

// Bỏ các trường biến động theo thời điểm chạy khỏi phép so sánh cấu trúc.
const VOLATILE_ROW = new Set(["stock_quantity", "pos_updated_at"]);
const stripVolatile = (snapshot) => {
  const clone = JSON.parse(JSON.stringify(snapshot));
  delete clone.synced_at;
  for (const offer of Object.values(clone.offers ?? {})) {
    offer.rows = (offer.rows ?? [])
      .map((row) => {
        const copy = { ...row };
        for (const field of VOLATILE_ROW) delete copy[field];
        copy.components = (copy.components ?? []).slice().sort((a, b) =>
          String(a.component_id).localeCompare(String(b.component_id)));
        return copy;
      })
      .sort((a, b) => `${a.color}|${a.size}`.localeCompare(`${b.color}|${b.size}`));
  }
  return clone;
};

const shared = appKeys.filter((k) => n8nKeys.includes(k));
let identical = 0;
const diffs = [];
const stockDiffs = [];

for (const key of shared) {
  const appSnapshot = JSON.parse(redis.store.get(key));
  const n8nRaw = n8nRedis(["GET", key]);
  if (!n8nRaw.trim()) continue;
  const n8nSnapshot = JSON.parse(n8nRaw);

  if (JSON.stringify(stripVolatile(appSnapshot)) === JSON.stringify(stripVolatile(n8nSnapshot))) {
    identical += 1;
  } else {
    diffs.push({ key, app: appSnapshot, n8n: n8nSnapshot });
  }

  // Theo dõi riêng chênh lệch tồn kho (có thể do thời điểm chụp khác nhau).
  for (const [offerType, offer] of Object.entries(appSnapshot.offers ?? {})) {
    const other = n8nSnapshot.offers?.[offerType];
    if (!other) continue;
    for (const row of offer.rows ?? []) {
      const match = (other.rows ?? []).find((r) => r.color === row.color && r.size === row.size);
      if (match && match.stock_quantity !== row.stock_quantity) {
        stockDiffs.push(`${key} ${offerType} ${row.color}/${row.size}: app=${row.stock_quantity} n8n=${match.stock_quantity}`);
      }
    }
  }
}

console.log(`\n=== KẾT QUẢ PARITY (bỏ qua synced_at, stock_quantity, pos_updated_at) ===`);
console.log(`Giống hệt: ${identical}/${shared.length}`);
console.log(`Khác cấu trúc: ${diffs.length}`);
console.log(`Chênh lệch tồn kho (thời điểm chụp khác nhau): ${stockDiffs.length}`);
if (stockDiffs.length) console.log(stockDiffs.slice(0, 8).join("\n"));

for (const diff of diffs.slice(0, 3)) {
  console.log(`\n--- DIFF ${diff.key} ---`);
  const a = stripVolatile(diff.app);
  const b = stripVolatile(diff.n8n);
  for (const field of ["data_status", "brand", "release_id", "catalog_version", "policy_version"]) {
    if (JSON.stringify(a[field]) !== JSON.stringify(b[field])) {
      console.log(`  ${field}: app=${JSON.stringify(a[field])} n8n=${JSON.stringify(b[field])}`);
    }
  }
  if (JSON.stringify(a.fulfillment_policy) !== JSON.stringify(b.fulfillment_policy)) {
    console.log(`  fulfillment_policy khác:\n    app=${JSON.stringify(a.fulfillment_policy)}\n    n8n=${JSON.stringify(b.fulfillment_policy)}`);
  }
  const aOffers = Object.keys(a.offers ?? {}).sort();
  const bOffers = Object.keys(b.offers ?? {}).sort();
  if (JSON.stringify(aOffers) !== JSON.stringify(bOffers)) {
    console.log(`  offer types: app=${aOffers.join(",")} n8n=${bOffers.join(",")}`);
  }
  for (const offerType of aOffers.filter((t) => bOffers.includes(t))) {
    const ao = a.offers[offerType];
    const bo = b.offers[offerType];
    for (const field of ["sale_price", "list_price", "price_status", "inventory_source"]) {
      if (JSON.stringify(ao[field]) !== JSON.stringify(bo[field])) {
        console.log(`  offers.${offerType}.${field}: app=${JSON.stringify(ao[field])} n8n=${JSON.stringify(bo[field])}`);
      }
    }
    if (ao.rows.length !== bo.rows.length) {
      console.log(`  offers.${offerType}.rows: app=${ao.rows.length} dòng, n8n=${bo.rows.length} dòng`);
    }
    for (let i = 0; i < Math.min(ao.rows.length, bo.rows.length); i += 1) {
      const ar = ao.rows[i];
      const br = bo.rows[i];
      for (const field of Object.keys(ar)) {
        if (JSON.stringify(ar[field]) !== JSON.stringify(br[field])) {
          console.log(`  offers.${offerType}.rows[${i}].${field}: app=${JSON.stringify(ar[field])?.slice(0, 120)} n8n=${JSON.stringify(br[field])?.slice(0, 120)}`);
        }
      }
    }
  }
}

console.log(`\nParity ${diffs.length === 0 && onlyApp.length === 0 && onlyN8n.length === 0 ? "ĐẠT" : "CHƯA ĐẠT"}`);
