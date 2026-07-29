import { createRequire } from "node:module";
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";

const input = JSON.parse(
  Buffer.from(process.env.LANA_MCP_INPUT_B64 || "", "base64").toString("utf8") || "{}",
);
const op = String(input.op || "");

function secret(directName, fileName) {
  const direct = String(process.env[directName] || "").trim();
  if (direct) return direct;
  const file = String(process.env[fileName] || "").trim();
  if (!file) throw new Error(`${directName}_REQUIRED`);
  return readFileSync(file, "utf8").trim();
}

function emit(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function safeLimit(value, fallback = 20, max = 500) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(1, Math.min(max, Math.trunc(number)))
    : fallback;
}

function pnpmRequire(packageName) {
  const store = "/app/node_modules/.pnpm";
  const prefix = `${packageName}@`;
  const folder = readdirSync(store).find((name) => {
    const packageJson = join(
      store,
      name,
      "node_modules",
      packageName,
      "package.json",
    );
    return name.startsWith(prefix) && existsSync(packageJson);
  });
  if (!folder) throw new Error(`PNPM_PACKAGE_NOT_FOUND:${packageName}`);
  const packageJson = join(
    store,
    folder,
    "node_modules",
    packageName,
    "package.json",
  );
  return createRequire(packageJson)(packageName);
}

function redactUrls(value) {
  if (Array.isArray(value)) return value.map(redactUrls);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      /url|image|attachment/i.test(key) && typeof item === "string"
        ? "[REDACTED_URL]"
        : redactUrls(item),
    ]),
  );
}

async function redisClient() {
  const { createClient } = pnpmRequire("redis");
  const client = createClient({
    url: secret("REDIS_URL", "REDIS_URL_FILE"),
  });
  await client.connect();
  return client;
}

async function redisValue(client, key, type) {
  if (type === "string") return client.get(key);
  if (type === "hash") return client.hGetAll(key);
  if (type === "list") return client.lRange(key, 0, -1);
  if (type === "set") return client.sMembers(key);
  if (type === "zset") return client.zRangeWithScores(key, 0, -1);
  if (type === "stream") {
    return client.xRange(key, "-", "+", { COUNT: 10000 });
  }
  return { unsupported_type: type };
}

function scanBatch(batch) {
  return Array.isArray(batch) ? batch.map(String) : [String(batch)];
}

async function runRedis() {
  const client = await redisClient();
  try {
    if (op === "redis_list") {
      const pattern = String(input.pattern || "*");
      const limit = safeLimit(input.limit, 200, 5000);
      const keys = [];
      for await (const batch of client.scanIterator({
        MATCH: pattern,
        COUNT: 250,
      })) {
        for (const key of scanBatch(batch)) {
          keys.push(key);
          if (keys.length >= limit) break;
        }
        if (keys.length >= limit) break;
      }
      emit({
        pattern,
        count: keys.length,
        truncated: keys.length >= limit,
        keys,
      });
      return;
    }
    if (op === "redis_read") {
      const key = String(input.key || "");
      if (!key) throw new Error("REDIS_KEY_REQUIRED");
      const type = await client.type(key);
      emit({
        key,
        type,
        ttl_seconds: await client.ttl(key),
        value: await redisValue(client, key, type),
      });
      return;
    }
    if (op === "redis_export") {
      let count = 0;
      for await (const batch of client.scanIterator({
        MATCH: "*",
        COUNT: 250,
      })) {
        for (const key of scanBatch(batch)) {
          const type = await client.type(key);
          emit({
            key,
            type,
            ttl_seconds: await client.ttl(key),
            value: await redisValue(client, key, type),
          });
          count += 1;
        }
      }
      process.stderr.write(`${JSON.stringify({ exported_keys: count })}\n`);
      return;
    }
    throw new Error("REDIS_OPERATION_UNSUPPORTED");
  } finally {
    await client.quit();
  }
}

async function sheetsClient() {
  const { GoogleSheetsClient } = await import(
    "file:///app/apps/worker/dist/google-sheets-client.js"
  );
  const credential = JSON.parse(
    secret("GOOGLE_SHEETS_CREDENTIAL", "GOOGLE_SHEETS_CREDENTIAL_FILE"),
  );
  const email = credential.email || credential.client_email;
  const privateKey = credential.privateKey || credential.private_key;
  if (!email || !privateKey) {
    throw new Error("GOOGLE_SHEETS_CREDENTIAL_INVALID");
  }
  return {
    client: new GoogleSheetsClient({
      serviceAccount: { email, privateKey },
    }),
    spreadsheetId: String(
      input.spreadsheet_id ||
        process.env.DATA_INGESTION_V2_SHEET_ID ||
        "",
    ).trim(),
  };
}

function columnIndex(letters) {
  let value = 0;
  for (const letter of letters.toUpperCase()) {
    value = value * 26 + letter.charCodeAt(0) - 64;
  }
  return value - 1;
}

function parseCell(a1) {
  const match = String(a1).match(/^'?(.*?)'?!([A-Z]+)([1-9][0-9]*)$/i);
  if (!match) throw new Error(`SHEET_CELL_A1_INVALID:${a1}`);
  return {
    title: match[1].replace(/''/g, "'"),
    rowIndex: Number(match[3]) - 1,
    columnIndex: columnIndex(match[2]),
  };
}

function userValue(value) {
  if (value === null || value === undefined) return {};
  if (typeof value === "boolean") return { boolValue: value };
  if (typeof value === "number") return { numberValue: value };
  return { stringValue: String(value) };
}

async function sheetMetadata(client, spreadsheetId) {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
    "?fields=sheets.properties";
  const body = await client.request(url, { method: "GET" });
  return new Map(
    (body.sheets || []).map((sheet) => [
      String(sheet.properties.title),
      Number(sheet.properties.sheetId),
    ]),
  );
}

async function updateCells(client, spreadsheetId, cells, note) {
  if (!spreadsheetId) throw new Error("SHEET_ID_REQUIRED");
  if (!cells.length) throw new Error("SHEET_CELLS_REQUIRED");
  const sheets = await sheetMetadata(client, spreadsheetId);
  const requests = cells.map((cell) => {
    const parsed = parseCell(cell.a1);
    const sheetId = sheets.get(parsed.title);
    if (!Number.isInteger(sheetId)) {
      throw new Error(`SHEET_TAB_NOT_FOUND:${parsed.title}`);
    }
    return {
      updateCells: {
        range: {
          sheetId,
          startRowIndex: parsed.rowIndex,
          endRowIndex: parsed.rowIndex + 1,
          startColumnIndex: parsed.columnIndex,
          endColumnIndex: parsed.columnIndex + 1,
        },
        rows: [
          {
            values: [
              {
                userEnteredValue: userValue(cell.value),
                note,
              },
            ],
          },
        ],
        fields: "userEnteredValue,note",
      },
    };
  });
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
    ":batchUpdate";
  await client.request(
    url,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requests,
        includeSpreadsheetInResponse: false,
      }),
    },
    false,
  );
}

function letters(index) {
  let result = "";
  for (
    let value = index + 1;
    value > 0;
    value = Math.floor((value - 1) / 26)
  ) {
    result = String.fromCharCode(65 + ((value - 1) % 26)) + result;
  }
  return result;
}

async function runSheets() {
  const { client, spreadsheetId } = await sheetsClient();
  if (op === "sheet_read") {
    const range = String(input.range || "");
    const values = await client.batchGetValues(
      spreadsheetId,
      [range],
      "UNFORMATTED_VALUE",
    );
    emit({
      spreadsheet_id: spreadsheetId,
      range,
      values: values[0]?.values || [],
    });
    return;
  }

  const note = String(input.note || "");
  if (!note.startsWith("BY_CHATGPT:")) {
    throw new Error("BY_CHATGPT_NOTE_REQUIRED");
  }

  if (op === "sheet_update_cells") {
    const cells = Array.isArray(input.cells) ? input.cells : [];
    const before = [];
    for (const cell of cells) {
      const read = await client.batchGetValues(
        spreadsheetId,
        [String(cell.a1)],
        "UNFORMATTED_VALUE",
      );
      before.push({
        a1: cell.a1,
        value: read[0]?.values?.[0]?.[0] ?? null,
      });
    }
    await updateCells(client, spreadsheetId, cells, note);
    const after = [];
    for (const cell of cells) {
      const read = await client.batchGetValues(
        spreadsheetId,
        [String(cell.a1)],
        "UNFORMATTED_VALUE",
      );
      after.push({
        a1: cell.a1,
        value: read[0]?.values?.[0]?.[0] ?? null,
      });
    }
    emit({ changed: cells.length, note, before, after });
    return;
  }

  if (op === "sheet_update_row" || op === "sheet_approve_image") {
    const tab = String(input.tab || "image_registry");
    const keyColumn = String(input.key_column || "IMAGE_ID");
    const keyValue = String(input.key_value || "");
    const range = `'${tab.replace(/'/g, "''")}'!A:ZZ`;
    const table =
      (
        await client.batchGetValues(
          spreadsheetId,
          [range],
          "UNFORMATTED_VALUE",
        )
      )[0]?.values || [];
    const headers = (table[0] || []).map((value) => String(value).trim());
    const keyIndex = headers.indexOf(keyColumn);
    if (keyIndex < 0) {
      throw new Error(`SHEET_KEY_COLUMN_NOT_FOUND:${keyColumn}`);
    }
    const rowIndex = table.findIndex(
      (row, index) =>
        index > 0 && String(row[keyIndex] ?? "").trim() === keyValue,
    );
    if (rowIndex < 1) throw new Error("SHEET_ROW_NOT_FOUND");

    const updates =
      op === "sheet_approve_image"
        ? {
            VERIFIED: true,
            REVIEW_STATUS: "APPROVED",
            MANUAL_OVERRIDE: true,
            ACTIVE: true,
            APPROVED_BY: "CHATGPT",
            APPROVED_AT: new Date().toISOString(),
            ...(input.updates || {}),
          }
        : input.updates || {};
    const cells = Object.entries(updates).map(([header, value]) => {
      const index = headers.indexOf(header);
      if (index < 0) {
        throw new Error(`SHEET_UPDATE_COLUMN_NOT_FOUND:${header}`);
      }
      return {
        a1: `'${tab.replace(/'/g, "''")}'!${letters(index)}${rowIndex + 1}`,
        value,
      };
    });
    const before = Object.fromEntries(
      Object.keys(updates).map((header) => [
        header,
        table[rowIndex][headers.indexOf(header)] ?? null,
      ]),
    );
    await updateCells(client, spreadsheetId, cells, note);
    const verify =
      (
        await client.batchGetValues(
          spreadsheetId,
          [range],
          "UNFORMATTED_VALUE",
        )
      )[0]?.values || [];
    const after = Object.fromEntries(
      Object.keys(updates).map((header) => [
        header,
        verify[rowIndex]?.[headers.indexOf(header)] ?? null,
      ]),
    );
    emit({
      tab,
      row: rowIndex + 1,
      key_column: keyColumn,
      key_value: keyValue,
      note,
      before,
      after,
    });
    return;
  }
  throw new Error("SHEETS_OPERATION_UNSUPPORTED");
}

async function runLatest() {
  const { Pool } = pnpmRequire("pg");
  const databaseUrl = secret("DATABASE_URL", "REALTIME_DATABASE_URL_FILE");
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const pageId = String(input.page_id || "1198992073286645");
  const limit = safeLimit(input.limit, 10, 50);
  try {
    const inbox = await pool.query(
      `SELECT inbox_id, page_id, event_key, conversation_hash, event_kind, status,
              receive_sequence, provider_occurred_at, received_at, processed_at,
              last_error_code, payload_ciphertext, payload_nonce, payload_auth_tag,
              payload_encrypted_dek, payload_key_ref, payload_expires_at
       FROM webhook_inbox WHERE page_id = $1
       ORDER BY receive_sequence DESC LIMIT $2`,
      [pageId, limit],
    );
    const events = await pool.query(
      `SELECT event_id, conversation_id, customer_hash, event_type, intent, stage,
              action, product_id, prompt_version, model_version, policy_version,
              catalog_version, event_metadata, occurred_at
       FROM conversation_events WHERE page_id = $1
       ORDER BY occurred_at DESC LIMIT $2`,
      [pageId, limit * 4],
    );
    const outbox = await pool.query(
      `SELECT outbox_id, conversation_id, customer_hash, response_group_id,
              sequence_no, status, attempt_count, meta_message_id, accepted_at,
              delivered_at, last_error_code, created_at, updated_at
       FROM meta_outbox WHERE page_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [pageId, limit * 4],
    );
    const rows = inbox.rows.map((row) => ({
      safe: {
        inbox_id: row.inbox_id,
        page_id: row.page_id,
        event_key: row.event_key,
        conversation_hash: row.conversation_hash,
        event_kind: row.event_kind,
        status: row.status,
        receive_sequence: Number(row.receive_sequence),
        provider_occurred_at: row.provider_occurred_at,
        received_at: row.received_at,
        processed_at: row.processed_at,
        last_error_code: row.last_error_code,
      },
      encrypted: row,
    }));
    if (input.include_sensitive) {
      const { LocalEnvelopeCipher } = await import(
        "file:///app/packages/database/dist/envelope-cipher.js"
      );
      const cipher = new LocalEnvelopeCipher(
        secret("REALTIME_DATA_KEY", "REALTIME_DATA_KEY_FILE"),
        String(process.env.REALTIME_DATA_KEY_REF || "local-kek-v1").trim(),
      );
      for (const entry of rows) {
        const row = entry.encrypted;
        entry.safe.payload = cipher.decryptJson(
          {
            ciphertext: row.payload_ciphertext,
            nonce: row.payload_nonce,
            authTag: row.payload_auth_tag,
            encryptedDek: row.payload_encrypted_dek,
            keyRef: row.payload_key_ref,
            expiresAt: row.payload_expires_at,
          },
          `lana:realtime-inbox:v1:${row.page_id}:${row.event_key}`,
        );
      }
    }
    emit({
      page_id: pageId,
      inbox: rows.map((entry) => entry.safe),
      decision_events: events.rows,
      outbox: outbox.rows,
    });
  } finally {
    await pool.end();
  }
}

function payloadMatchesProduct(payload, productId) {
  const wanted = productId.trim().toUpperCase();
  const keys = new Set([
    "PRODUCT_ID",
    "PRODUCTID",
    "MA_SP",
    "MASP",
    "SKU",
    "CODE",
  ]);
  function walk(value, key = "") {
    if (Array.isArray(value)) return value.some((item) => walk(item, key));
    if (!value || typeof value !== "object") {
      return keys.has(key.toUpperCase()) &&
        String(value ?? "").trim().toUpperCase() === wanted;
    }
    return Object.entries(value).some(([childKey, child]) =>
      walk(child, childKey)
    );
  }
  return walk(payload);
}

async function runQdrant() {
  const baseUrl = String(process.env.QDRANT_BASE_URL || "").replace(/\/+$/, "");
  const collection = String(
    input.collection || process.env.QDRANT_COLLECTION || "catalog-v2",
  );
  const apiKey = secret("QDRANT_API_KEY", "QDRANT_API_KEY_FILE");
  const productId = String(input.product_id || "").trim();
  if (!productId) throw new Error("PRODUCT_ID_REQUIRED");

  const requested = safeLimit(input.limit, 20, 100);
  const matches = [];
  let offset = null;
  let scanned = 0;
  do {
    const response = await fetch(
      `${baseUrl}/collections/${encodeURIComponent(collection)}/points/scroll`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          limit: 100,
          ...(offset === null ? {} : { offset }),
          with_payload: true,
          with_vector: false,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const body = await response.json();
    if (!response.ok) throw new Error(`QDRANT_HTTP_${response.status}`);
    const points = body?.result?.points || [];
    scanned += points.length;
    for (const point of points) {
      if (payloadMatchesProduct(point.payload, productId)) {
        matches.push(point);
        if (matches.length >= requested) break;
      }
    }
    offset = body?.result?.next_page_offset ?? null;
    if (!points.length || scanned >= 5000) offset = null;
  } while (offset !== null && matches.length < requested);

  const result = {
    status: "ok",
    collection,
    product_id: productId,
    scanned,
    points: matches,
  };
  emit(input.include_sensitive ? result : redactUrls(result));
}

if (op.startsWith("redis_")) await runRedis();
else if (op.startsWith("sheet_")) await runSheets();
else if (op === "latest") await runLatest();
else if (op === "qdrant_product") await runQdrant();
else throw new Error("REMOTE_OPERATION_UNSUPPORTED");
