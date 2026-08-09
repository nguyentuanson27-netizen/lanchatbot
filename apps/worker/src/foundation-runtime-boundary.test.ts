import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function source(relativePath: string): Buffer {
  return readFileSync(new URL(relativePath, import.meta.url));
}

function gitBlobSha1(value: Buffer): string {
  return createHash("sha1")
    .update(`blob ${value.byteLength}\0`)
    .update(value)
    .digest("hex");
}

function productionLocalImportGraph(entry: URL): readonly string[] {
  const pending = [fileURLToPath(entry)];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    const currentSource = readFileSync(current, "utf8");
    for (const match of currentSource.matchAll(
      /(?:from\s+|import\s*(?:\(\s*)?)["'](\.[^"']+)["']/gu,
    )) {
      const specifier = match[1];
      if (!specifier) continue;
      const candidate = resolve(
        dirname(current),
        specifier.replace(/\.js$/u, ".ts"),
      );
      if (existsSync(candidate)) pending.push(candidate);
    }
  }
  return [...visited];
}

describe("foundation-safe realtime entry", () => {
  it("keeps the accepted BF-07 production wrapper byte-identical", () => {
    expect(gitBlobSha1(source("./bf02-realtime-runner.ts")))
      .toBe("296c6cb3c251cb16504c07068d42df1d4db137f2");
  });

  it("has no production import or runtime adapter for BF-03", () => {
    const server = source("./realtime-server.ts").toString("utf8");
    const runner = source("./bf02-realtime-runner.ts").toString("utf8");

    expect(server).toContain('from "./bf02-realtime-runner.js"');
    expect(server).not.toMatch(/bf03/iu);
    expect(runner).not.toMatch(/bf03/iu);
    expect(existsSync(new URL("./bf03-realtime-runner.ts", import.meta.url)))
      .toBe(false);

    const graph = productionLocalImportGraph(
      new URL("./realtime-server.ts", import.meta.url),
    );
    expect(graph.map((path) => path.replaceAll("\\", "/")))
      .not.toEqual(expect.arrayContaining([
        expect.stringMatching(/(?:bf03|benchmarks\/bf03)/iu),
      ]));
  });
});
