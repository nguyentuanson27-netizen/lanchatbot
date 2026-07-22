import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";
import {
  createInternalAssertion,
  identityFromAuthentikHeaders,
  loadAdminAuthConfig,
} from "./auth.mjs";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const adminApiOrigin = new URL(process.env.ADMIN_API_ORIGIN ?? "http://admin-api:8081");
const adminAuth = loadAdminAuthConfig();
const distDirectory = resolve(new URL("./dist", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const maxAdminJsonBodyBytes = 16 * 1024;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function applySecurityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'",
  );
}

async function readJsonBody(request) {
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxAdminJsonBodyBytes) {
    const error = new Error("ADMIN_BODY_TOO_LARGE");
    error.statusCode = 413;
    throw error;
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxAdminJsonBodyBytes) {
      const error = new Error("ADMIN_BODY_TOO_LARGE");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(buffer);
  }
  const body = Buffer.concat(chunks);
  if (body.length === 0) return body;
  JSON.parse(body.toString("utf8"));
  return body;
}

async function proxyAdminRequest(request, response, requestUrl) {
  const identity = identityFromAuthentikHeaders(request.headers, adminAuth.ownerEmails);
  if (!identity) {
    response.statusCode = 401;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ code: "ADMIN_AUTH_REQUIRED" }));
    return;
  }
  const target = new URL(`${requestUrl.pathname}${requestUrl.search}`, adminApiOrigin);
  const headers = new Headers();
  for (const name of [
    "accept",
    "content-type",
    "idempotency-key",
    "origin",
    "x-request-id",
    "user-agent",
  ]) {
    const value = request.headers[name];
    if (typeof value === "string") headers.set(name, value);
  }
  headers.set("x-lana-admin-assertion", createInternalAssertion(identity, adminAuth));
  headers.set("x-forwarded-host", request.headers.host ?? "");
  headers.set("x-forwarded-proto", "https");

  const method = request.method ?? "GET";
  const isReadMethod = method === "GET" || method === "HEAD" || method === "OPTIONS";
  const isAdminPost = method === "POST" && requestUrl.pathname.startsWith("/admin/v1/");
  if (!isReadMethod && !isAdminPost) {
    response.statusCode = 405;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({
      code: "ADMIN_METHOD_NOT_ALLOWED",
      message: "Trang quản trị không cho phép phương thức này.",
    }));
    return;
  }

  let body;
  if (isAdminPost) {
    const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
    if (!contentType.startsWith("application/json")) {
      response.statusCode = 415;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(JSON.stringify({
        code: "ADMIN_JSON_REQUIRED",
        message: "Lệnh quản trị chỉ nhận application/json.",
      }));
      return;
    }
    try {
      body = await readJsonBody(request);
    } catch (error) {
      response.statusCode = error?.statusCode === 413 ? 413 : 400;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(JSON.stringify({
        code: error?.statusCode === 413 ? "ADMIN_BODY_TOO_LARGE" : "ADMIN_JSON_INVALID",
        message: error?.statusCode === 413
          ? "Nội dung lệnh quản trị vượt quá 16 KB."
          : "Nội dung JSON không hợp lệ.",
      }));
      return;
    }
  }

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      ...(body ? { body } : {}),
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    response.statusCode = upstream.status;
    for (const name of ["content-type", "cache-control", "etag", "x-request-id"]) {
      const value = upstream.headers.get(name);
      if (value) response.setHeader(name, value);
    }
    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(response);
    } else {
      response.end();
    }
  } catch {
    response.statusCode = 502;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(
      JSON.stringify({
        code: "ADMIN_API_UNAVAILABLE",
        message: "Dịch vụ dữ liệu quản trị đang tạm thời không phản hồi.",
      }),
    );
  }
}

function serveStatic(response, pathname) {
  const rawPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(decodeURIComponent(rawPath)).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(distDirectory, safePath);
  if (!filePath.startsWith(distDirectory)) {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    filePath = join(distDirectory, "index.html");
  }
  const extension = extname(filePath);
  response.statusCode = 200;
  response.setHeader("Content-Type", contentTypes[extension] ?? "application/octet-stream");
  response.setHeader(
    "Cache-Control",
    extension === ".html" ? "no-store" : "public, max-age=31536000, immutable",
  );
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  applySecurityHeaders(response);
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (requestUrl.pathname === "/health") {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ status: "ok", service: "admin-web" }));
    return;
  }

  if (
    requestUrl.pathname.startsWith("/admin/v1/") ||
    requestUrl.pathname === "/admin/v1" ||
    requestUrl.pathname === "/health/admin-api"
  ) {
    await proxyAdminRequest(request, response, requestUrl);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.statusCode = 405;
    response.end("Method not allowed");
    return;
  }
  serveStatic(response, requestUrl.pathname);
});

server.listen(port, host, () => {
  console.log(`admin-web listening on ${host}:${port}`);
});
