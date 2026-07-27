import { accessSync, constants, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

export function resolveStaticFile(distDirectory, pathname) {
  const rawPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(decodeURIComponent(rawPath)).replace(/^(\.\.[/\\])+/, "");
  const requestedPath = join(distDirectory, safePath);
  if (!requestedPath.startsWith(distDirectory)) return null;
  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) return requestedPath;
  if (extname(safePath) || safePath.startsWith(normalize("/assets/"))) return null;
  return join(distDirectory, "index.html");
}

export function assertReadableFrontendBundle(distDirectory) {
  const indexPath = join(distDirectory, "index.html");
  accessSync(indexPath, constants.R_OK);
  const indexHtml = readFileSync(indexPath, "utf8");
  const assetPaths = [...indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)]
    .map((match) => match[1]);
  if (assetPaths.length === 0) throw new Error("ADMIN_WEB_BUNDLE_HAS_NO_ASSETS");
  for (const assetPath of assetPaths) {
    const filePath = join(distDirectory, assetPath);
    accessSync(filePath, constants.R_OK);
    if (!statSync(filePath).isFile()) throw new Error(`ADMIN_WEB_ASSET_NOT_FILE:${assetPath}`);
  }
}