import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import {
  BASELINE_MODEL_METHODS,
  baselineModelCapability,
} from "./vertex-baseline.js";

function resolvedLocalDependencyGraph(entryFile: string): readonly string[] {
  const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  };
  const pending = [entryFile];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || visited.has(current)) continue;
    visited.add(current);
    const source = readFileSync(current, "utf8");
    for (const imported of ts.preProcessFile(source).importedFiles) {
      if (!imported.fileName.startsWith(".")) continue;
      const resolved = ts.resolveModuleName(
        imported.fileName,
        current,
        compilerOptions,
        ts.sys,
      ).resolvedModule?.resolvedFileName;
      const normalized = resolved === undefined ? undefined : resolve(resolved);
      if (normalized !== undefined && normalized.startsWith(dirname(entryFile))) {
        pending.push(normalized);
      }
    }
  }
  return [...visited].sort();
}

describe("baseline model capability", () => {
  it("exposes baseline generation without a Context V2 candidate capability", async () => {
    const generated = {
      proposal: { action: "NO_REPLY" },
      modelVersion: "baseline-v1",
      latencyMs: 1,
      tokenUsage: {},
    };
    const generate = vi.fn(async () => generated);
    const capability = baselineModelCapability({ generate } as never);

    await expect(capability.generate([], "lana-realtime-v1")).resolves.toBe(generated);
    expect(generate).toHaveBeenCalledWith([], "lana-realtime-v1");
    expect(Object.keys(capability).sort()).toEqual([...BASELINE_MODEL_METHODS].sort());
  });

  it("resolves no Context V2 module in the complete baseline dependency graph", () => {
    const entryFile = fileURLToPath(new URL("./vertex-baseline.ts", import.meta.url));
    const dependencies = resolvedLocalDependencyGraph(entryFile);

    expect(dependencies.some((file) => file.endsWith("vertex.ts"))).toBe(true);
    expect(dependencies.some((file) => /context-v2/iu.test(file))).toBe(false);
  });
});
