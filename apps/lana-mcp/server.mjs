import {
  createHash,
  createPublicKey,
  randomUUID,
  verify as verifySignature,
} from "node:crypto";
import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import {
  lstat,
  readFile,
  readdir,
  realpath,
  stat,
} from "node:fs/promises";
import { createServer } from "node:http";
import { basename, extname, isAbsolute, join, relative, resolve } from "node:path";
import { spawn } from "node:child_process";

const VERSION = "0.3.0";
const PORT = Number(process.env.PORT || 8080);
const RESOURCE = trimSlash(
  process.env.LANA_MCP_RESOURCE || "https://dev.lanadesign.vn",
);
const ISSUER = ensureSlash(
  process.env.LANA_MCP_AUTHENTIK_ISSUER ||
    "https://auth.lanadesign.vn/application/o/lana-chatgpt-mcp/",
);
const DISCOVERY_URL =
  process.env.LANA_MCP_AUTHENTIK_DISCOVERY_URL ||
  `${ISSUER}.well-known/openid-configuration`;
const DISCOVERY_HEADERS = forwardedOriginHeaders(ISSUER);
const CLIENT_ID = secretValue(
  "LANA_MCP_AUTHENTIK_CLIENT_ID",
  "LANA_MCP_AUTHENTIK_CLIENT_ID_FILE",
  "",
);
const ALLOWED_USERS = new Set(
  secretValue(
    "LANA_MCP_ALLOWED_USERS",
    "LANA_MCP_ALLOWED_USERS_FILE",
    "",
  )
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const HELPER =
  process.env.LANA_MCP_REMOTE_OPS_PATH ||
  "/app/plugins/lana-chatbot-ops/scripts/remote_ops.mjs";
const DATA_DIR = process.env.LANA_MCP_DATA_DIR || "/data";
const REQUEST_LIMIT = 1_048_576;
const REPOSITORY_ROOT = resolve(
  process.env.LANA_MCP_REPOSITORY_ROOT || "/app/repository",
);
const REPOSITORY_RELEASES_ROOT = String(
  process.env.LANA_MCP_REPOSITORY_RELEASES_ROOT || "",
).trim()
  ? resolve(process.env.LANA_MCP_REPOSITORY_RELEASES_ROOT)
  : "";
const REPOSITORY_POINTER_FILE = String(
  process.env.LANA_MCP_REPOSITORY_POINTER_FILE || "",
).trim();
const REPOSITORY_SOURCE_COMMIT =
  process.env.LANA_MCP_SOURCE_COMMIT || "unknown";
const REPOSITORY_SOURCE_REF = process.env.LANA_MCP_SOURCE_REF || "unknown";
const REPOSITORY_MAX_FILE_BYTES = 1_048_576;
const REPOSITORY_MAX_OUTPUT_CHARS = 200_000;
const REPOSITORY_BLOCKED_SEGMENTS = new Set([
  ".git",
  ".agents",
  ".codex",
  "node_modules",
  "dist",
  "coverage",
]);
const REPOSITORY_TEXT_EXTENSIONS = new Set([
  ".cjs", ".css", ".graphql", ".html", ".ini", ".js", ".json", ".jsonl",
  ".jsx", ".md", ".mjs", ".prisma", ".properties", ".proto", ".py", ".scss",
  ".sh", ".sql", ".toml", ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml",
]);
const REPOSITORY_TEXT_BASENAMES = new Set([
  ".dockerignore", ".gitattributes", ".gitignore", "Dockerfile", "Makefile",
]);
const RATE_LIMIT_PER_MINUTE = Number(
  process.env.LANA_MCP_RATE_LIMIT_PER_MINUTE || 60,
);
const READ_SCOPE = "mcp:read";
const SENSITIVE_SCOPE = "mcp:sensitive";
const WRITE_SCOPE = "mcp:write";
const rateWindows = new Map();
let discoveryCache;
let jwksCache;

export function trimSlash(value) {
  return String(value).replace(/\/+$/, "");
}

export function ensureSlash(value) {
  return `${trimSlash(value)}/`;
}

export function forwardedOriginHeaders(issuer) {
  const origin = new URL(ensureSlash(issuer));
  return {
    host: origin.host,
    "x-forwarded-host": origin.host,
    "x-forwarded-proto": origin.protocol.replace(":", ""),
  };
}

function secretValue(directName, fileName, fallback) {
  const direct = String(process.env[directName] || "").trim();
  if (direct) return direct;
  const path = String(process.env[fileName] || "").trim();
  if (!path) return fallback;
  try {
    return String(requireSecret(path)).trim();
  } catch {
    return fallback;
  }
}

function requireSecret(path) {
  return process.getBuiltinModule("fs").readFileSync(path, "utf8");
}

export function isAllowedRedirect(uri) {
  return (
    /^https:\/\/chatgpt\.com\/connector\/oauth\/[A-Za-z0-9_-]{8,200}$/.test(
      String(uri),
    ) ||
    uri === "https://chatgpt.com/connector_platform_oauth_redirect"
  );
}

export function parseScopes(claims) {
  const values = [];
  if (typeof claims.scope === "string") values.push(...claims.scope.split(/\s+/));
  if (Array.isArray(claims.scp)) values.push(...claims.scp);
  return new Set(values.filter(Boolean));
}

function hasAudience(claims, expected) {
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  return audiences.map(String).includes(expected);
}

function b64urlJson(value) {
  return JSON.parse(
    Buffer.from(String(value), "base64url").toString("utf8"),
  );
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`HTTP_${response.status}:${new URL(url).pathname}`);
  }
  return response.json();
}

async function discovery() {
  const now = Date.now();
  if (discoveryCache?.expiresAt > now) return discoveryCache.value;
  const value = await fetchJson(DISCOVERY_URL, {
    headers: DISCOVERY_HEADERS,
  });
  if (ensureSlash(value.issuer) !== ISSUER) {
    throw new Error("OAUTH_ISSUER_DISCOVERY_MISMATCH");
  }
  discoveryCache = { value, expiresAt: now + 5 * 60_000 };
  return value;
}

async function jwks() {
  const now = Date.now();
  if (jwksCache?.expiresAt > now) return jwksCache.value;
  const metadata = await discovery();
  const value = await fetchJson(metadata.jwks_uri);
  jwksCache = { value, expiresAt: now + 5 * 60_000 };
  return value;
}

export async function verifyAccessToken(token, nowSeconds = Date.now() / 1000) {
  if (!CLIENT_ID) throw new Error("OAUTH_CLIENT_ID_NOT_CONFIGURED");
  const parts = String(token).split(".");
  if (parts.length !== 3) throw new Error("TOKEN_FORMAT_INVALID");
  const header = b64urlJson(parts[0]);
  const claims = b64urlJson(parts[1]);
  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("TOKEN_ALGORITHM_INVALID");
  }
  const keySet = await jwks();
  const jwk = keySet.keys?.find((item) => item.kid === header.kid);
  if (!jwk) {
    jwksCache = undefined;
    throw new Error("TOKEN_SIGNING_KEY_UNKNOWN");
  }
  const verified = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    createPublicKey({ key: jwk, format: "jwk" }),
    Buffer.from(parts[2], "base64url"),
  );
  if (!verified) throw new Error("TOKEN_SIGNATURE_INVALID");
  if (ensureSlash(claims.iss) !== ISSUER) throw new Error("TOKEN_ISSUER_INVALID");
  if (!hasAudience(claims, CLIENT_ID)) throw new Error("TOKEN_AUDIENCE_INVALID");
  if (!Number.isFinite(claims.exp) || claims.exp <= nowSeconds) {
    throw new Error("TOKEN_EXPIRED");
  }
  if (Number.isFinite(claims.nbf) && claims.nbf > nowSeconds + 30) {
    throw new Error("TOKEN_NOT_ACTIVE");
  }
  const username = String(
    claims.preferred_username || claims.email || claims.sub || "",
  ).toLowerCase();
  if (!username || (ALLOWED_USERS.size && !ALLOWED_USERS.has(username))) {
    throw new Error("TOKEN_USER_FORBIDDEN");
  }
  return { claims, username, scopes: parseScopes(claims) };
}

function bearerToken(request) {
  const match = String(request.headers.authorization || "").match(
    /^Bearer\s+(.+)$/i,
  );
  return match?.[1] || "";
}

function oauthChallenge(error = "invalid_token", description = "Login required") {
  return (
    `Bearer resource_metadata="${RESOURCE}/.well-known/oauth-protected-resource", ` +
    `error="${error}", error_description="${description.replace(/"/g, "'")}"`
  );
}

function json(response, status, body, headers = {}) {
  const payload = Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": payload.length,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers,
  });
  response.end(payload);
}

function empty(response, status, headers = {}) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers,
  });
  response.end();
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > REQUEST_LIMIT) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function checkRate(identity) {
  const minute = Math.floor(Date.now() / 60_000);
  const current = rateWindows.get(identity);
  if (!current || current.minute !== minute) {
    rateWindows.set(identity, { minute, count: 1 });
    return;
  }
  current.count += 1;
  if (current.count > RATE_LIMIT_PER_MINUTE) throw new Error("RATE_LIMITED");
}

function confirmation(args, field, reasonField) {
  if (args?.[field] !== true) throw new Error(`${field}=true is required`);
  const reason = String(args?.[reasonField] || "").trim();
  if (reason.length < 5) throw new Error(`${reasonField} must explain the purpose`);
  return reason;
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function normalizeRepositoryPath(value, allowRoot = false) {
  const raw = String(value ?? "").trim().replaceAll("\\", "/");
  if (!raw) {
    if (allowRoot) return "";
    throw new Error("REPOSITORY_PATH_REQUIRED");
  }
  if (raw.includes("\0") || raw.startsWith("/") || /^[A-Za-z]:/.test(raw)) {
    throw new Error("REPOSITORY_PATH_INVALID");
  }
  const segments = raw.split("/").filter((segment) => segment && segment !== ".");
  if (segments.some((segment) => segment === "..")) {
    throw new Error("REPOSITORY_PATH_TRAVERSAL_BLOCKED");
  }
  if (segments.some((segment) => REPOSITORY_BLOCKED_SEGMENTS.has(segment))) {
    throw new Error("REPOSITORY_PATH_BLOCKED");
  }
  return segments.join("/");
}

function isPathInside(root, candidate) {
  const fromRoot = relative(root, candidate);
  return !(
    fromRoot === ".." ||
    fromRoot.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
    isAbsolute(fromRoot)
  );
}

function repositoryProvenance(context) {
  return {
    source_commit: context.source_commit,
    source_ref: context.source_ref,
    source_release: context.source_release,
    source_updated_at: context.source_updated_at,
    source_mode: context.source_mode,
  };
}

export async function repositoryContext() {
  if (!REPOSITORY_POINTER_FILE) {
    return {
      root: await realpath(REPOSITORY_ROOT),
      source_commit: REPOSITORY_SOURCE_COMMIT,
      source_ref: REPOSITORY_SOURCE_REF,
      source_release: REPOSITORY_SOURCE_REF,
      source_updated_at: null,
      source_mode: "embedded_snapshot",
    };
  }
  if (!REPOSITORY_RELEASES_ROOT) {
    throw new Error("REPOSITORY_RELEASES_ROOT_REQUIRED");
  }
  const pointerStat = await stat(REPOSITORY_POINTER_FILE);
  if (!pointerStat.isFile() || pointerStat.size > 4_096) {
    throw new Error("REPOSITORY_POINTER_INVALID");
  }
  let pointer;
  try {
    pointer = JSON.parse(await readFile(REPOSITORY_POINTER_FILE, "utf8"));
  } catch {
    throw new Error("REPOSITORY_POINTER_INVALID");
  }
  const release = String(pointer?.release || "").trim();
  const sourceCommit = String(pointer?.source_commit || "").trim().toLowerCase();
  const sourceRef = String(pointer?.source_ref || release).trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(release)) {
    throw new Error("REPOSITORY_POINTER_RELEASE_INVALID");
  }
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) {
    throw new Error("REPOSITORY_POINTER_COMMIT_INVALID");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(sourceRef)) {
    throw new Error("REPOSITORY_POINTER_REF_INVALID");
  }
  const releasesRoot = await realpath(REPOSITORY_RELEASES_ROOT);
  const root = await realpath(resolve(releasesRoot, release));
  if (!isPathInside(releasesRoot, root)) {
    throw new Error("REPOSITORY_POINTER_TRAVERSAL_BLOCKED");
  }
  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) {
    throw new Error("REPOSITORY_RELEASE_NOT_DIRECTORY");
  }
  return {
    root,
    source_commit: sourceCommit,
    source_ref: sourceRef,
    source_release: release,
    source_updated_at: String(pointer?.updated_at || "").slice(0, 64) || null,
    source_mode: "current_release_pointer",
  };
}

function isRepositoryTextFile(path) {
  const name = basename(path);
  if (name === ".env.example") return true;
  if (name === ".env" || name.startsWith(".env.")) return false;
  return (
    REPOSITORY_TEXT_BASENAMES.has(name) || name.startsWith("Dockerfile.") ||
    REPOSITORY_TEXT_EXTENSIONS.has(extname(name).toLowerCase())
  );
}

async function resolveRepositoryPath(value, allowRoot = false, sourceContext) {
  const normalized = normalizeRepositoryPath(value, allowRoot);
  const context = sourceContext || await repositoryContext();
  const root = context.root;
  const candidate = resolve(root, normalized);
  const resolved = await realpath(candidate);
  if (!isPathInside(root, resolved)) {
    throw new Error("REPOSITORY_PATH_TRAVERSAL_BLOCKED");
  }
  const fromRoot = relative(root, resolved);
  const checked = normalizeRepositoryPath(fromRoot.replaceAll("\\", "/"), true);
  return { normalized: checked, resolved, root, context };
}

async function readRepositoryText(path, sourceContext) {
  const target = await resolveRepositoryPath(path, false, sourceContext);
  if (!isRepositoryTextFile(target.normalized)) {
    throw new Error("REPOSITORY_FILE_TYPE_BLOCKED");
  }
  const details = await stat(target.resolved);
  if (!details.isFile()) throw new Error("REPOSITORY_FILE_REQUIRED");
  if (details.size > REPOSITORY_MAX_FILE_BYTES) {
    throw new Error("REPOSITORY_FILE_TOO_LARGE");
  }
  const buffer = await readFile(target.resolved);
  if (buffer.includes(0)) throw new Error("REPOSITORY_BINARY_FILE_BLOCKED");
  return {
    path: target.normalized.replaceAll("\\", "/"),
    bytes: buffer.length,
    content: buffer.toString("utf8"),
  };
}

export async function repositoryListFiles(args = {}, sourceContext) {
  const limit = boundedInteger(args.limit, 500, 1, 2_000);
  const context = sourceContext || await repositoryContext();
  const start = await resolveRepositoryPath(args.path || "", true, context);
  const startDetails = await lstat(start.resolved);
  const files = [];
  let truncated = false;

  async function walk(directory, directoryRelative) {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const entry of entries) {
      if (files.length >= limit) {
        truncated = true;
        return;
      }
      if (entry.isSymbolicLink()) continue;
      const relativePath = [directoryRelative, entry.name].filter(Boolean).join("/");
      const segments = relativePath.split("/");
      if (segments.some((segment) => REPOSITORY_BLOCKED_SEGMENTS.has(segment))) continue;
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) await walk(fullPath, relativePath);
      else if (entry.isFile() && isRepositoryTextFile(relativePath)) files.push(relativePath);
      if (truncated) return;
    }
  }

  if (startDetails.isSymbolicLink()) throw new Error("REPOSITORY_SYMLINK_BLOCKED");
  if (startDetails.isFile()) {
    if (!isRepositoryTextFile(start.normalized)) {
      throw new Error("REPOSITORY_FILE_TYPE_BLOCKED");
    }
    files.push(start.normalized);
  } else if (startDetails.isDirectory()) {
    await walk(start.resolved, start.normalized);
  } else {
    throw new Error("REPOSITORY_PATH_TYPE_BLOCKED");
  }
  return {
    ...repositoryProvenance(context),
    path: start.normalized,
    files,
    truncated,
  };
}

export async function repositoryReadFile(args = {}, sourceContext) {
  const context = sourceContext || await repositoryContext();
  const file = await readRepositoryText(args.path, context);
  const lines = file.content.split(/\r?\n/);
  const startLine = boundedInteger(args.start_line, 1, 1, Math.max(1, lines.length));
  const maxLines = boundedInteger(args.max_lines, 400, 1, 1_000);
  const selected = lines.slice(startLine - 1, startLine - 1 + maxLines);
  let content = selected.join("\n");
  let outputTruncated = false;
  if (content.length > REPOSITORY_MAX_OUTPUT_CHARS) {
    content = content.slice(0, REPOSITORY_MAX_OUTPUT_CHARS);
    outputTruncated = true;
  }
  return {
    ...repositoryProvenance(context),
    path: file.path,
    bytes: file.bytes,
    start_line: startLine,
    end_line: startLine + Math.max(0, content.split("\n").length - 1),
    total_lines: lines.length,
    truncated: outputTruncated || startLine - 1 + selected.length < lines.length,
    content,
  };
}

export async function repositorySearchText(args = {}) {
  const query = String(args.query || "");
  if (query.length < 2 || query.length > 200) {
    throw new Error("REPOSITORY_QUERY_LENGTH_INVALID");
  }
  const limit = boundedInteger(args.limit, 50, 1, 200);
  const context = await repositoryContext();
  const listing = await repositoryListFiles(
    { path: args.path || "", limit: 2_000 },
    context,
  );
  const needle = args.case_sensitive === true ? query : query.toLocaleLowerCase("en");
  const matches = [];
  for (const path of listing.files) {
    let file;
    try {
      file = await readRepositoryText(path, context);
    } catch (error) {
      if (error.message === "REPOSITORY_FILE_TOO_LARGE") continue;
      throw error;
    }
    const lines = file.content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const haystack = args.case_sensitive === true ? lines[index] : lines[index].toLocaleLowerCase("en");
      if (!haystack.includes(needle)) continue;
      matches.push({ path, line: index + 1, snippet: lines[index].trim().slice(0, 500) });
      if (matches.length >= limit) {
        return {
          ...repositoryProvenance(context),
          query,
          matches,
          truncated: true,
        };
      }
    }
  }
  return {
    ...repositoryProvenance(context),
    query,
    matches,
    truncated: listing.truncated,
  };
}

const confirmSensitive = {
  confirm_sensitive_read: {
    type: "boolean",
    description: "Must be true for sensitive data access.",
  },
  reason: {
    type: "string",
    description: "Specific operational reason for the access.",
  },
};
const confirmWrite = {
  confirm_write: {
    type: "boolean",
    description: "Must be true for this mutation.",
  },
  change_note: {
    type: "string",
    description:
      "Reason recorded in audit and prefixed with BY_CHATGPT for Sheets.",
  },
};

function tool(name, description, properties, scopes, options = {}) {
  return {
    name,
    title: options.title || name,
    description,
    inputSchema: {
      type: "object",
      properties,
      required: options.required || [],
      additionalProperties: false,
    },
    securitySchemes: [{ type: "oauth2", scopes }],
    annotations: {
      readOnlyHint: options.readOnly !== false,
      destructiveHint: false,
      openWorldHint: options.openWorld === true,
      idempotentHint: options.readOnly !== false,
    },
    scopes,
    operation: options.operation,
    sensitive: options.sensitive === true,
    write: options.readOnly === false,
  };
}

const TOOLS = [
  tool(
    "repository_list_files",
    "List readable source code, README, AGENTS, and related text documents from the immutable release snapshot. Runtime secrets and generated directories are excluded.",
    {
      path: { type: "string", description: "Optional repository-relative directory or file." },
      limit: { type: "integer", minimum: 1, maximum: 2000, default: 500 },
    },
    [READ_SCOPE],
    { title: "List repository files" },
  ),
  tool(
    "repository_read_file",
    "Read a line range from one text file in the immutable release snapshot. Absolute paths, traversal, secrets, binary files, and generated directories are blocked.",
    {
      path: { type: "string", description: "Exact repository-relative file path." },
      start_line: { type: "integer", minimum: 1, default: 1 },
      max_lines: { type: "integer", minimum: 1, maximum: 1000, default: 400 },
    },
    [READ_SCOPE],
    {
      title: "Read repository file",
      required: ["path"],
    },
  ),
  tool(
    "repository_search_text",
    "Search for literal text in source code, README, AGENTS, and related documents in the immutable release snapshot.",
    {
      query: { type: "string", minLength: 2, maxLength: 200 },
      path: { type: "string", description: "Optional repository-relative directory or file." },
      case_sensitive: { type: "boolean", default: false },
      limit: { type: "integer", minimum: 1, maximum: 200, default: 50 },
    },
    [READ_SCOPE],
    {
      title: "Search repository text",
      required: ["query"],
    },
  ),
  tool(
    "vps_status",
    "Check the current Lana service health endpoints without changing runtime state.",
    {},
    [READ_SCOPE],
    { title: "Check Lana VPS status" },
  ),
  tool(
    "latest_chatbot_evidence",
    "Read latest Inbox, decision-event, and Outbox evidence for the test page. Decrypted payloads require explicit sensitive confirmation.",
    {
      page_id: { type: "string", default: "1198992073286645" },
      limit: { type: "integer", minimum: 1, maximum: 50 },
      include_sensitive: { type: "boolean", default: false },
      ...confirmSensitive,
    },
    [READ_SCOPE],
    {
      title: "Read latest chatbot evidence",
      operation: "latest",
      sensitive: true,
    },
  ),
  tool(
    "qdrant_product_points",
    "Inspect Qdrant point payloads for an exact product code. URLs remain redacted unless sensitive access is confirmed.",
    {
      product_id: { type: "string" },
      collection: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 100 },
      include_sensitive: { type: "boolean", default: false },
      ...confirmSensitive,
    },
    [READ_SCOPE],
    {
      title: "Inspect Qdrant product points",
      required: ["product_id"],
      operation: "qdrant_product",
      sensitive: true,
    },
  ),
  tool(
    "redis_list_keys",
    "List Redis keys, including sensitive namespaces, after explicit confirmation.",
    {
      pattern: { type: "string", default: "*" },
      limit: { type: "integer", minimum: 1, maximum: 5000 },
      ...confirmSensitive,
    },
    [READ_SCOPE, SENSITIVE_SCOPE],
    {
      title: "List Redis keys",
      required: ["confirm_sensitive_read", "reason"],
      operation: "redis_list",
      sensitive: true,
    },
  ),
  tool(
    "redis_read_key",
    "Read one exact Redis key, including session, credential, or customer data, after explicit confirmation.",
    { key: { type: "string" }, ...confirmSensitive },
    [READ_SCOPE, SENSITIVE_SCOPE],
    {
      title: "Read Redis key",
      required: ["key", "confirm_sensitive_read", "reason"],
      operation: "redis_read",
      sensitive: true,
    },
  ),
  tool(
    "redis_export_all",
    "Export all Redis keys and values to protected MCP storage; returns only file name, SHA-256, and key count.",
    confirmSensitive,
    [READ_SCOPE, SENSITIVE_SCOPE],
    {
      title: "Export Redis",
      required: ["confirm_sensitive_read", "reason"],
      operation: "redis_export",
      sensitive: true,
    },
  ),
  tool(
    "sheet_read_range",
    "Read a Google Sheets A1 range after explicit sensitive-data confirmation.",
    {
      range: { type: "string" },
      spreadsheet_id: { type: "string" },
      ...confirmSensitive,
    },
    [READ_SCOPE, SENSITIVE_SCOPE],
    {
      title: "Read Google Sheet range",
      required: ["range", "confirm_sensitive_read", "reason"],
      operation: "sheet_read",
      sensitive: true,
    },
  ),
  tool(
    "sheet_update_cells",
    "Update exact Google Sheet cells and attach a BY_CHATGPT note to every changed cell.",
    {
      spreadsheet_id: { type: "string" },
      cells: {
        type: "array",
        items: {
          type: "object",
          properties: { a1: { type: "string" }, value: {} },
          required: ["a1", "value"],
          additionalProperties: false,
        },
      },
      ...confirmWrite,
    },
    [READ_SCOPE, WRITE_SCOPE],
    {
      title: "Update Google Sheet cells",
      required: ["cells", "confirm_write", "change_note"],
      operation: "sheet_update_cells",
      readOnly: false,
      openWorld: true,
    },
  ),
  tool(
    "sheet_update_row",
    "Update named columns in a row selected by an exact key, including code, price, status, and MANUAL_OVERRIDE.",
    {
      spreadsheet_id: { type: "string" },
      tab: { type: "string" },
      key_column: { type: "string" },
      key_value: { type: "string" },
      updates: { type: "object" },
      ...confirmWrite,
    },
    [READ_SCOPE, WRITE_SCOPE],
    {
      title: "Update Google Sheet row",
      required: [
        "tab",
        "key_column",
        "key_value",
        "updates",
        "confirm_write",
        "change_note",
      ],
      operation: "sheet_update_row",
      readOnly: false,
      openWorld: true,
    },
  ),
  tool(
    "sheet_approve_image",
    "Approve one image_registry row by exact IMAGE_ID and set VERIFIED, APPROVED, MANUAL_OVERRIDE, ACTIVE, approver, and timestamp.",
    {
      spreadsheet_id: { type: "string" },
      key_value: { type: "string", description: "Exact IMAGE_ID." },
      updates: { type: "object" },
      ...confirmWrite,
    },
    [READ_SCOPE, WRITE_SCOPE],
    {
      title: "Approve product image",
      required: ["key_value", "confirm_write", "change_note"],
      operation: "sheet_approve_image",
      readOnly: false,
      openWorld: true,
    },
  ),
];

const TOOL_MAP = new Map(TOOLS.map((definition) => [definition.name, definition]));

function publicTool(definition) {
  const {
    scopes: _scopes,
    operation: _operation,
    sensitive: _sensitive,
    write: _write,
    ...value
  } = definition;
  return value;
}

function requireScopes(identity, definition) {
  for (const scope of definition.scopes) {
    if (!identity.scopes.has(scope)) throw new Error(`SCOPE_REQUIRED:${scope}`);
  }
}

async function runHelper(operation, args, timeoutMs = 120_000) {
  const input = Buffer.from(
    JSON.stringify({ op: operation, ...args }),
  ).toString("base64");
  const child = spawn(process.execPath, [HELPER], {
    env: { ...process.env, LANA_MCP_INPUT_B64: input },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = [];
  const stderr = [];
  let size = 0;
  child.stdout.on("data", (chunk) => {
    size += chunk.length;
    if (size <= 8 * 1024 * 1024) stdout.push(chunk);
  });
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  clearTimeout(timer);
  if (code !== 0) {
    throw new Error(
      Buffer.concat(stderr).toString("utf8").trim().slice(-4000) ||
        `HELPER_FAILED:${code}`,
    );
  }
  if (size > 8 * 1024 * 1024) throw new Error("HELPER_RESULT_TOO_LARGE");
  const lines = Buffer.concat(stdout).toString("utf8").trim().split(/\r?\n/);
  return JSON.parse(lines.at(-1) || "{}");
}

async function exportRedis(args) {
  confirmation(args, "confirm_sensitive_read", "reason");
  const exportDir = join(DATA_DIR, "exports");
  mkdirSync(exportDir, { recursive: true, mode: 0o700 });
  const fileName = `redis-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`;
  const path = join(exportDir, fileName);
  const input = Buffer.from(
    JSON.stringify({ op: "redis_export" }),
  ).toString("base64");
  const child = spawn(process.execPath, [HELPER], {
    env: { ...process.env, LANA_MCP_INPUT_B64: input },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const digest = createHash("sha256");
  const output = createWriteStream(path, { mode: 0o600 });
  let rows = 0;
  child.stdout.on("data", (chunk) => {
    digest.update(chunk);
    rows += chunk.toString("utf8").split("\n").length - 1;
  });
  child.stdout.pipe(output);
  const stderr = [];
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  if (code !== 0) {
    throw new Error(
      Buffer.concat(stderr).toString("utf8").trim().slice(-4000) ||
        `REDIS_EXPORT_FAILED:${code}`,
    );
  }
  return { file_name: basename(path), sha256: digest.digest("hex"), exported_keys: rows };
}

async function vpsStatus() {
  const targets = String(
    process.env.LANA_MCP_HEALTH_TARGETS ||
      "api=http://lana-chatbot-api:8080/health,realtime=http://lana-chatbot-realtime-worker:8080/health,delivery=http://lana-chatbot-delivery-worker:8080/health,admin-api=http://lana-chatbot-admin-api:8080/health",
  )
    .split(",")
    .map((entry) => entry.split("="))
    .filter(([name, url]) => name && url);
  const services = [];
  for (const [name, url] of targets) {
    const started = Date.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3_000) });
      services.push({
        name,
        status: response.status,
        healthy: response.ok,
        latency_ms: Date.now() - started,
      });
    } catch (error) {
      services.push({
        name,
        healthy: false,
        latency_ms: Date.now() - started,
        error: error.name,
      });
    }
  }
  return { resource: RESOURCE, services };
}

async function repositoryHealth() {
  try {
    const context = await repositoryContext();
    return { healthy: true, ...repositoryProvenance(context) };
  } catch (error) {
    return { healthy: false, error: String(error.message).slice(0, 120) };
  }
}

function audit(identity, toolName, outcome, args, error = "") {
  const record = {
    timestamp: new Date().toISOString(),
    request_id: randomUUID(),
    subject_hash: createHash("sha256").update(identity.username).digest("hex"),
    tool: toolName,
    outcome,
    argument_hash: createHash("sha256")
      .update(JSON.stringify(args, Object.keys(args || {}).sort()))
      .digest("hex"),
    error: String(error).slice(0, 200),
  };
  process.stdout.write(`${JSON.stringify(record)}\n`);
}

async function callTool(identity, name, args) {
  const definition = TOOL_MAP.get(name);
  if (!definition) throw new Error(`UNKNOWN_TOOL:${name}`);
  requireScopes(identity, definition);
  if (definition.sensitive) {
    if (
      name !== "latest_chatbot_evidence" &&
      name !== "qdrant_product_points"
    ) {
      confirmation(args, "confirm_sensitive_read", "reason");
    } else if (args.include_sensitive === true) {
      confirmation(args, "confirm_sensitive_read", "reason");
      if (!identity.scopes.has(SENSITIVE_SCOPE)) {
        throw new Error(`SCOPE_REQUIRED:${SENSITIVE_SCOPE}`);
      }
    }
  }
  if (definition.write) {
    confirmation(args, "confirm_write", "change_note");
  }
  try {
    let result;
    if (name === "vps_status") result = await vpsStatus();
    else if (name === "redis_export_all") result = await exportRedis(args);
    else if (name === "repository_list_files") {
      result = await repositoryListFiles(args);
    } else if (name === "repository_read_file") {
      result = await repositoryReadFile(args);
    } else if (name === "repository_search_text") {
      result = await repositorySearchText(args);
    } else {
      const helperArgs =
        name === "sheet_approve_image"
          ? { ...args, tab: "image_registry", key_column: "IMAGE_ID" }
          : args;
      result = await runHelper(definition.operation, helperArgs);
    }
    audit(identity, name, "success", args);
    return result;
  } catch (error) {
    audit(identity, name, "error", args, error.message);
    throw error;
  }
}

function rpc(id, result, error) {
  return error
    ? { jsonrpc: "2.0", id, error }
    : { jsonrpc: "2.0", id, result };
}

function authErrorResult(id, scope, description) {
  return rpc(id, {
    content: [{ type: "text", text: `Authentication required: ${description}` }],
    isError: true,
    _meta: {
      "mcp/www_authenticate": [
        oauthChallenge("insufficient_scope", description),
      ],
    },
  });
}

async function dispatch(identity, message) {
  const id = message.id;
  if (message.method === "initialize") {
    return rpc(id, {
      protocolVersion: message.params?.protocolVersion || "2025-06-18",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "lana-chatbot-ops", version: VERSION },
      instructions:
        "Read README, AGENTS, the current baseline, and release documents from the automatically synchronized current production release before diagnosing. Inspect runtime evidence before proposing a fix. Sensitive Redis, chat, and Sheet reads require explicit confirmation. Every Sheet mutation requires confirm_write and a change_note; the server records BY_CHATGPT notes. Repository writes are not exposed and remain GitHub-first.",
    });
  }
  if (message.method === "notifications/initialized") return null;
  if (message.method === "ping") return rpc(id, {});
  if (message.method === "tools/list") {
    return rpc(id, { tools: TOOLS.map(publicTool) });
  }
  if (message.method === "tools/call") {
    const name = String(message.params?.name || "");
    const args = message.params?.arguments || {};
    const definition = TOOL_MAP.get(name);
    if (!definition) {
      return rpc(id, undefined, { code: -32602, message: `Unknown tool: ${name}` });
    }
    try {
      const result = await callTool(identity, name, args);
      return rpc(id, {
        structuredContent: result,
        content: [{ type: "text", text: JSON.stringify(result) }],
      });
    } catch (error) {
      if (String(error.message).startsWith("SCOPE_REQUIRED:")) {
        return authErrorResult(
          id,
          String(error.message).split(":")[1],
          error.message,
        );
      }
      return rpc(id, {
        content: [{ type: "text", text: JSON.stringify({ error: error.message }) }],
        isError: true,
      });
    }
  }
  return rpc(id, undefined, {
    code: -32601,
    message: `Method not found: ${message.method}`,
  });
}

async function handleRegistration(request, response) {
  if (!CLIENT_ID) {
    return json(response, 503, { error: "server_not_configured" });
  }
  const payload = await readJson(request);
  const redirectUris = Array.isArray(payload.redirect_uris)
    ? payload.redirect_uris.map(String)
    : [];
  if (!redirectUris.length || redirectUris.some((uri) => !isAllowedRedirect(uri))) {
    return json(response, 400, {
      error: "invalid_redirect_uri",
      error_description: "Only ChatGPT connector callback URLs are allowed.",
    });
  }
  const authMethod = String(payload.token_endpoint_auth_method || "none");
  if (authMethod !== "none") {
    return json(response, 400, {
      error: "invalid_client_metadata",
      error_description: "This public PKCE client only supports token auth method none.",
    });
  }
  return json(response, 201, {
    client_id: CLIENT_ID,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: "ChatGPT Lana MCP",
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    scope: [READ_SCOPE, SENSITIVE_SCOPE, WRITE_SCOPE, "openid", "profile"].join(
      " ",
    ),
  });
}

async function handleDiscoveryProxy(_request, response) {
  const metadata = await discovery();
  return json(response, 200, {
    ...metadata,
    registration_endpoint: `${RESOURCE}/oauth/register`,
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: Array.from(
      new Set([
        ...(metadata.scopes_supported || []),
        READ_SCOPE,
        SENSITIVE_SCOPE,
        WRITE_SCOPE,
      ]),
    ),
  });
}

async function handler(request, response) {
  try {
    const url = new URL(request.url, RESOURCE);
    if (request.method === "GET" && url.pathname === "/health") {
      const repository = await repositoryHealth();
      return json(response, 200, {
        status: "healthy",
        version: VERSION,
        oauth_configured: Boolean(CLIENT_ID && ALLOWED_USERS.size),
        repository,
      });
    }
    if (
      request.method === "GET" &&
      url.pathname === "/.well-known/oauth-protected-resource"
    ) {
      return json(
        response,
        200,
        {
          resource: RESOURCE,
          authorization_servers: [ISSUER],
          scopes_supported: [READ_SCOPE, SENSITIVE_SCOPE, WRITE_SCOPE],
          resource_documentation: `${RESOURCE}/docs`,
        },
        { "access-control-allow-origin": "*" },
      );
    }
    if (request.method === "POST" && url.pathname === "/oauth/register") {
      return await handleRegistration(request, response);
    }
    if (
      request.method === "GET" &&
      url.pathname === "/oauth/authentik-discovery"
    ) {
      return await handleDiscoveryProxy(request, response);
    }
    if (request.method === "GET" && url.pathname === "/docs") {
      return json(response, 200, {
        name: "Lana Chatbot Ops MCP",
        endpoint: `${RESOURCE}/mcp`,
        authentication: "OAuth 2.1 Authorization Code with PKCE via Authentik",
        scopes: [READ_SCOPE, SENSITIVE_SCOPE, WRITE_SCOPE],
        repository_source_mode: REPOSITORY_POINTER_FILE
          ? "current_release_pointer"
          : "embedded_snapshot",
      });
    }
    if (url.pathname !== "/mcp") return json(response, 404, { error: "not_found" });
    if (request.method === "GET") {
      return empty(response, 405, { allow: "POST" });
    }
    if (request.method !== "POST") {
      return empty(response, 405, { allow: "POST" });
    }
    const token = bearerToken(request);
    if (!token) {
      return json(
        response,
        401,
        { error: "unauthorized" },
        { "www-authenticate": oauthChallenge() },
      );
    }
    let identity;
    try {
      identity = await verifyAccessToken(token);
      checkRate(identity.username);
    } catch (error) {
      return json(
        response,
        error.message === "RATE_LIMITED" ? 429 : 401,
        { error: error.message },
        error.message === "RATE_LIMITED"
          ? { "retry-after": "60" }
          : {
              "www-authenticate": oauthChallenge(
                "invalid_token",
                error.message,
              ),
            },
      );
    }
    const message = await readJson(request);
    if (Array.isArray(message)) {
      const results = (
        await Promise.all(message.map((item) => dispatch(identity, item)))
      ).filter(Boolean);
      return results.length ? json(response, 200, results) : empty(response, 202);
    }
    const result = await dispatch(identity, message);
    return result ? json(response, 200, result) : empty(response, 202);
  } catch (error) {
    return json(response, 400, { error: error.message });
  }
}

if (process.env.NODE_ENV !== "test") {
  createServer(handler).listen(PORT, "0.0.0.0", () => {
    process.stdout.write(
      `${JSON.stringify({
        event: "lana_mcp_started",
        version: VERSION,
        port: PORT,
        resource: RESOURCE,
      })}\n`,
    );
  });
}

export { handler, publicTool, TOOLS };
