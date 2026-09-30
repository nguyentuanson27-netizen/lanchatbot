import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  buildCanonicalDecisionEvidenceV1,
  QdrantStableCatalogSearchAdapter,
  type CatalogSnapshotV3,
} from "@lana/business-tools";
import { buildApprovedQdrantJobs, buildRegistryMap } from "./p23c-jobs.js";
import { buildXmlProfiles, groupXmlItems, normalizeStructuredExtraction } from "./p23c-profiles.js";
import { buildRealtimeC3Input } from "./realtime-c3-input.js";
import { buildRealtimeProductFactsV2 } from "./realtime-product-facts-v2.js";
import { createRealtimeSalesState } from "./realtime-sales-cycle.js";
import { buildTrackCSelectableEvidence } from "./track-c-c3-selectable-evidence.js";

type ComponentRole = "TOP" | "SKIRT" | "PANTS";

const roleSuffix: Readonly<Record<ComponentRole, string>> = {
  TOP: "AO",
  SKIRT: "CV",
  PANTS: "QUAN",
};

function mediaSnapshot(
  productId: string,
  roles: readonly ComponentRole[],
  observedAt: string,
): CatalogSnapshotV3 {
  const components = roles.map((role, index) => ({
    component_id: `${index + 1}`,
    product_sku: `${productId}-${roleSuffix[role]}`,
    variation_sku: "",
    quantity: 1,
  }));
  return {
    schema_version: 3,
    release_id: "p02-pos-r1",
    catalog_version: "p02-catalog-v1",
    policy_version: "p02-policy-v1",
    shop_alias: "LANA",
    brand: "LANA",
    product_id: productId,
    synced_at: observedAt,
    data_status: "OK",
    fulfillment_policy: {
      tinh_trang: "READY_STOCK",
      can_order_when_zero: false,
      prep_min_days: null,
      prep_max_days: null,
      zero_stock_policy: "",
      zero_stock_prep_min_days: null,
      zero_stock_prep_max_days: null,
      eta_valid_until: "",
    },
    selling_rules: {
      allow_mixed_sizes: false,
      allow_component_sale: false,
      source_version: "p02-selling-rules-v1",
    },
    shipping_eta: {},
    offers: {
      SET: {
        list_price: null,
        sale_price: 1_199_000,
        price_status: "OK",
        rows: [{
          offer_type: "SET",
          price_sku: `${productId}-SET`,
          color: "BE",
          size: "M",
          stock_quantity: 2,
          list_price: null,
          sale_price: 1_199_000,
          stock_status: "OK",
          bom_status: "OK",
          parent_variation_id: `${productId}-SET-M`,
          parent_variation_sku: `${productId}-SET-M`,
          components,
        }],
      },
    },
  };
}

const binary = process.env.QDRANT_TEST_BINARY;
const now = new Date("2026-09-30T00:00:00.000Z");
const collection = "c3_p02_isolated";
let processHandle: ChildProcess | undefined;
let directory = "";
let base = "";
let logs = "";

async function qdrantPut(path: string, body: unknown): Promise<void> {
  const response = await fetch(`${base}${path}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3_000),
  });
  if (!response.ok) {
    throw new Error(`QDRANT_TEST_HTTP_${response.status}: ${await response.text()}`);
  }
}

function adapter(): QdrantStableCatalogSearchAdapter {
  return new QdrantStableCatalogSearchAdapter({
    baseUrl: "https://c3-isolated.invalid",
    apiKey: "test-only",
    collection,
    expectedDimension: 3,
    embedding: {
      embedText: async () => [0, 0, 1],
      embedImageUrl: async () => [0, 0, 1],
    },
    fetchImpl: (url, init) => {
      const target = new URL(String(url));
      if (target.origin !== "https://c3-isolated.invalid") {
        throw new Error("TEST_ORIGIN_INVALID");
      }
      return fetch(`${base}${target.pathname}${target.search}`, init);
    },
  });
}

function producerJobs(
  productId: string,
  reviewStatus: string,
  material: string,
) {
  const profiles = normalizeStructuredExtraction(buildXmlProfiles(
    buildRegistryMap([{
      MA_SP: productId,
      ACTIVE: "TRUE",
      MATERIAL_OVERRIDE: material,
    }]).registry,
    groupXmlItems([{
      "g:item_group_id": productId,
      "g:title": `Mẫu ${productId}`,
      "g:description": "XML gọi vải chống nhăn, thoáng mát; không phải thuộc tính đã duyệt.",
      "g:image_link": `https://cdn.example/${productId}.jpg`,
    }]),
    now.toISOString(),
  ));
  return buildApprovedQdrantJobs(
    profiles,
    [{
      MA_SP: productId,
      ACTIVE: "TRUE",
      REVIEW_STATUS: reviewStatus,
      IMAGE_ID: ({
        SD375: "11111111-1111-4111-8111-111111111111",
        SD376: "22222222-2222-4222-8222-222222222222",
        SD377: "33333333-3333-4333-8333-333333333337",
      } as const)[productId as "SD375" | "SD376" | "SD377"],
      IMAGE_URL: `https://cdn.example/${productId}.jpg`,
    }],
    {
      run_id: "p02-isolated",
      started_at: now.toISOString(),
      shard_count: 1,
      shard_index: 0,
      shard_label: "1/1",
    },
  ).filter(({ publish_action }) => publish_action === "UPSERT");
}

async function selectableEvidence(productId: string) {
  const product = await adapter().findByExactCode(productId);
  if (product === null) return null;
  const productFacts = buildRealtimeProductFactsV2({
    product,
    snapshot: mediaSnapshot(productId, ["TOP", "SKIRT"], now.toISOString()),
    policy: null,
    now,
  });
  expect(productFacts).not.toBeNull();
  expect(productFacts!.sizeChart).toBeNull();
  expect(productFacts!.fulfillment.etaToCustomer).toBeNull();

  const c3 = buildRealtimeC3Input({
    sourceMessagePk: "00000000-0000-4000-8000-000000000098",
    canonicalEvidence: buildCanonicalDecisionEvidenceV1({
      text: "Chất liệu gì?",
      sourceMessageId: `p02-${productId}`,
      productId,
      modelBuyingIntent: null,
      evaluatedAt: now,
    }),
    preConversationRevision: 0,
    finalConversationRevision: 1,
    preSalesRevision: 0,
    commerceState: createRealtimeSalesState(
      "33333333-3333-4333-8333-333333333333",
      "page-test",
      now,
    ),
    productId,
    catalogVersion: product.catalogVersion,
    facts: [],
    productFacts,
    policyResolution: null,
    cartReadiness: [],
    now,
  });
  return buildTrackCSelectableEvidence({
    context: c3.context,
    simulationFacts: [],
    executionLane: "PRODUCTION_CONTRACT",
    currentCart: null,
    evaluationAt: now,
  });
}

describe.skipIf(!binary)("P02 real isolated catalog round-trip", () => {
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "lana-c3-p02-"));
    const reservation = createServer();
    await new Promise<void>((resolveListen, rejectListen) => {
      reservation.once("error", rejectListen);
      reservation.listen(0, "127.0.0.1", resolveListen);
    });
    const address = reservation.address();
    if (!address || typeof address === "string") throw new Error("TEST_PORT_UNAVAILABLE");
    const port = address.port;
    await new Promise<void>((resolveClose, rejectClose) => {
      reservation.close((error) => error ? rejectClose(error) : resolveClose());
    });
    base = `http://127.0.0.1:${port}`;

    const config = join(directory, "config.yaml");
    await writeFile(config, [
      "log_level: WARN",
      "telemetry_disabled: true",
      "cluster:",
      "  enabled: false",
      "storage:",
      `  storage_path: ${join(directory, "storage")}`,
      `  snapshots_path: ${join(directory, "snapshots")}`,
      "service:",
      "  host: 127.0.0.1",
      `  http_port: ${port}`,
      "  grpc_port: null",
      "  max_workers: 1",
      "",
    ].join("\n"));

    processHandle = spawn(resolve(binary!), [
      "--config-path", config,
      "--disable-telemetry",
    ], {
      cwd: directory,
      env: { PATH: process.env.PATH ?? "" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let spawnError: Error | undefined;
    processHandle.on("error", (error) => { spawnError = error; });
    for (const stream of [processHandle.stdout, processHandle.stderr]) {
      stream?.on("data", (chunk) => { logs = (logs + String(chunk)).slice(-4_000); });
    }

    let ready = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (spawnError || processHandle.exitCode !== null) {
        throw spawnError ?? new Error(`QDRANT_TEST_EXITED: ${logs}`);
      }
      ready = await fetch(`${base}/readyz`, { signal: AbortSignal.timeout(300) })
        .then((response) => response.ok, () => false);
      if (ready) break;
      await delay(100);
    }
    if (!ready) throw new Error(`QDRANT_TEST_START_TIMEOUT: ${logs}`);

    await qdrantPut(`/collections/${collection}`, {
      vectors: { size: 3, distance: "Cosine" },
    });
  }, 15_000);

  afterAll(async () => {
    if (processHandle?.pid !== undefined && processHandle.exitCode === null &&
        processHandle.signalCode === null) {
      const stopped = new Promise<void>((resolveExit) => {
        processHandle!.once("exit", () => resolveExit());
      });
      processHandle.kill("SIGTERM");
      const timeout = setTimeout(() => processHandle?.kill("SIGKILL"), 3_000);
      try { await stopped; } finally { clearTimeout(timeout); }
    }
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it.each([
    ["SD375", "APPROVED", "LỤA", true],
    ["SD376", "APPROVED", "UNKNOWN", false],
    ["SD377", "NEED_REVIEW", "LỤA", false],
  ] as const)(
    "round-trips source authority for %s (%s/%s)",
    async (productId, reviewStatus, material, hasMaterial) => {
      const jobs = producerJobs(productId, reviewStatus, material);
      if (jobs.length > 0) {
        await qdrantPut(`/collections/${collection}/points?wait=true`, {
          points: jobs.map((job) => ({
            id: job.point_id,
            payload: job.payload,
            vector: [0, 0, 1],
          })),
        });
      }

      const evidence = await selectableEvidence(productId);
      if (reviewStatus !== "APPROVED") {
        expect(evidence).toBeNull();
        return;
      }
      expect(evidence).not.toBeNull();
      expect(evidence!.some(({ ref }) => ref.endsWith("MATERIALS"))).toBe(hasMaterial);
      expect(JSON.stringify(evidence)).not.toMatch(/chống nhăn|thoáng mát/u);
      expect(evidence!.some(({ capability }) => ["SIZE_FIT", "ETA", "POLICY"].includes(capability)))
        .toBe(false);
    },
  );
});
