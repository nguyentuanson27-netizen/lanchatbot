import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { assertReadableFrontendBundle, resolveStaticFile } from "./static-assets.mjs";

function createBundle() {
  const directory = mkdtempSync(join(tmpdir(), "lana-admin-assets-"));
  mkdirSync(join(directory, "assets"));
  writeFileSync(join(directory, "index.html"), '<script type="module" src="/assets/app.js"></script><link rel="stylesheet" href="/assets/app.css">');
  writeFileSync(join(directory, "assets", "app.js"), "export {};");
  writeFileSync(join(directory, "assets", "app.css"), "body {}");
  return directory;
}

describe("admin web static bundle", () => {
  it("serves real assets and uses index only for extensionless application routes", () => {
    const directory = createBundle();
    assert.equal(resolveStaticFile(directory, "/assets/app.js"), join(directory, "assets", "app.js"));
    assert.equal(resolveStaticFile(directory, "/datasets/review"), join(directory, "index.html"));
    assert.equal(resolveStaticFile(directory, "/assets/missing.js"), null);
    assert.equal(resolveStaticFile(directory, "/favicon.ico"), null);
  });

  it("validates the files referenced by index.html", () => {
    const directory = createBundle();
    assert.doesNotThrow(() => assertReadableFrontendBundle(directory));
    chmodSync(join(directory, "assets", "app.js"), 0o000);
    if (process.platform !== "win32") assert.throws(() => assertReadableFrontendBundle(directory));
  });
});