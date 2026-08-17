import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import {
  BASELINE_MODEL_METHODS,
  baselineModelCapability,
} from "./vertex-baseline.js";

function workspaceSourceEntries(repoRoot: string): ReadonlyMap<string, string> {
  const entries = new Map<string, string>();
  for (const workspaceGroup of ["apps", "packages"] as const) {
    const groupRoot = resolve(repoRoot, workspaceGroup);
    for (const directory of readdirSync(groupRoot, { withFileTypes: true })) {
      if (!directory.isDirectory()) continue;
      const packageRoot = resolve(groupRoot, directory.name);
      const packageJsonPath = resolve(packageRoot, "package.json");
      const sourceEntry = resolve(packageRoot, "src/index.ts");
      if (!existsSync(packageJsonPath) || !existsSync(sourceEntry)) continue;
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
        name?: unknown;
      };
      if (typeof packageJson.name === "string") {
        entries.set(packageJson.name, sourceEntry);
      }
    }
  }
  return entries;
}

function importedContextV2Symbols(source: string): readonly string[] {
  const sourceFile = ts.createSourceFile(
    "baseline-boundary.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const violations: string[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || statement.importClause === undefined) {
      continue;
    }
    const bindings = statement.importClause.namedBindings;
    if (bindings === undefined) continue;
    if (ts.isNamespaceImport(bindings)) {
      if (
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text === "@lana/contracts"
      ) {
        violations.push(`namespace:${bindings.name.text}`);
      }
      continue;
    }
    for (const binding of bindings.elements) {
      const exportedName = binding.propertyName?.text ?? binding.name.text;
      if (/^ContextV2/u.test(exportedName)) violations.push(exportedName);
    }
  }
  return violations;
}

function resolvedLocalDependencyGraph(entryFile: string): readonly string[] {
  const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  };
  const repoRoot = resolve(dirname(entryFile), "../../..");
  const workspaceEntries = workspaceSourceEntries(repoRoot);
  const pending = [entryFile];
  const visited = new Set<string>();
  const workspaceBoundaries = new Set(workspaceEntries.values());
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || visited.has(current)) continue;
    visited.add(current);
    // A workspace package entry proves the package edge was resolved. Do not
    // expand its barrel: baseline imports are checked by symbol below, while
    // expanding unrelated re-exports would turn package capability into use.
    if (workspaceBoundaries.has(current)) continue;
    const source = readFileSync(current, "utf8");
    for (const imported of ts.preProcessFile(source).importedFiles) {
      const workspaceEntry = workspaceEntries.get(imported.fileName);
      if (workspaceEntry !== undefined) {
        pending.push(workspaceEntry);
        continue;
      }
      if (!imported.fileName.startsWith(".")) continue;
      const resolved = ts.resolveModuleName(
        imported.fileName,
        current,
        compilerOptions,
        ts.sys,
      ).resolvedModule?.resolvedFileName;
      const normalized = resolved === undefined ? undefined : resolve(resolved);
      if (normalized !== undefined && normalized.startsWith(repoRoot)) {
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

  it("resolves workspace edges without admitting a Context V2 module", () => {
    const entryFile = fileURLToPath(new URL("./vertex-baseline.ts", import.meta.url));
    const dependencies = resolvedLocalDependencyGraph(entryFile);

    expect(dependencies.some((file) => file.endsWith("vertex.ts"))).toBe(true);
    expect(dependencies.some((file) =>
      file.replaceAll("\\", "/").endsWith("packages/database/src/index.ts"),
    )).toBe(true);
    expect(dependencies.some((file) => /context-v2/iu.test(file))).toBe(false);
  });

  it("rejects Context V2 symbols even when imported through a workspace barrel", () => {
    expect(importedContextV2Symbols(
      'import type { ContextV2 as CandidateContext } from "@lana/contracts";',
    )).toEqual(["ContextV2"]);

    const entryFile = fileURLToPath(new URL("./vertex-baseline.ts", import.meta.url));
    const workerSourceRoot = dirname(entryFile);
    for (const dependency of resolvedLocalDependencyGraph(entryFile)) {
      if (!dependency.startsWith(workerSourceRoot)) continue;
      expect(importedContextV2Symbols(readFileSync(dependency, "utf8"))).toEqual([]);
    }
  });
});
