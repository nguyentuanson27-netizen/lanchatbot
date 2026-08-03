import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const MANIFEST_DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];
const OWNER_RULES = [
  {
    owner: "packages/database",
    forbidden: ["@lana/dataset-review", "@lana/dataset-store", "@lana/business-tools"],
  },
  {
    owner: "packages/dataset-review",
    forbidden: ["@lana/database", "@lana/dataset-store"],
  },
];

function toRepositoryPath(repositoryRoot, filePath) {
  return relative(repositoryRoot, filePath).split("\\").join("/");
}

function sourceFiles(packageRoot) {
  if (!existsSync(packageRoot)) return [];
  const found = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
      const candidate = join(directory, entry.name);
      if (entry.isDirectory()) visit(candidate);
      else if (SOURCE_EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf(".")))) found.push(candidate);
    }
  };
  visit(packageRoot);
  return found;
}

function sourceReferencesPackage(filePath, packageName) {
  const parsed = ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  let referenced = false;
  const isTarget = (value) =>
    ts.isStringLiteral(value) &&
    (value.text === packageName || value.text.startsWith(`${packageName}/`));
  const visit = (node) => {
    if (referenced) return;
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      isTarget(node.moduleSpecifier)
    ) {
      referenced = true;
      return;
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      isTarget(node.moduleReference.expression)
    ) {
      referenced = true;
      return;
    }
    if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      isTarget(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      referenced = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return referenced;
}

function movedDatasetDatabaseImports(filePath) {
  const parsed = ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const moved = new Set();
  const databaseNamespaces = new Set();
  const isDatabase = (value) =>
    ts.isStringLiteral(value) &&
    (value.text === "@lana/database" || value.text.startsWith("@lana/database/"));
  const recordNamedBindings = (bindings) => {
    if (!bindings || !ts.isNamedImports(bindings)) return;
    for (const element of bindings.elements) {
      const importedName = (element.propertyName ?? element.name).text;
      if (importedName.startsWith("PostgresDataset")) moved.add(importedName);
    }
  };
  const collectImports = (node) => {
    if (ts.isImportDeclaration(node) && isDatabase(node.moduleSpecifier)) {
      const bindings = node.importClause?.namedBindings;
      recordNamedBindings(bindings);
      if (bindings && ts.isNamespaceImport(bindings)) databaseNamespaces.add(bindings.name.text);
    }
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      isDatabase(node.moduleSpecifier) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const element of node.exportClause.elements) {
        const importedName = (element.propertyName ?? element.name).text;
        if (importedName.startsWith("PostgresDataset")) moved.add(importedName);
      }
    }
    ts.forEachChild(node, collectImports);
  };
  collectImports(parsed);
  const collectNamespaceUses = (node) => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      databaseNamespaces.has(node.expression.text) &&
      node.name.text.startsWith("PostgresDataset")
    ) {
      moved.add(node.name.text);
    }
    if (
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      databaseNamespaces.has(node.expression.text) &&
      node.argumentExpression &&
      ts.isStringLiteral(node.argumentExpression) &&
      node.argumentExpression.text.startsWith("PostgresDataset")
    ) {
      moved.add(node.argumentExpression.text);
    }
    ts.forEachChild(node, collectNamespaceUses);
  };
  collectNamespaceUses(parsed);
  return [...moved].sort();
}

function workspacePackageRoots(repositoryRoot) {
  const found = [];
  const visit = (directory) => {
    if (!existsSync(directory)) return;
    if (existsSync(join(directory, "package.json"))) found.push(directory);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || ["node_modules", "dist", ".git"].includes(entry.name)) continue;
      visit(join(directory, entry.name));
    }
  };
  visit(join(repositoryRoot, "apps"));
  visit(join(repositoryRoot, "packages"));
  return found;
}

function workspaceConsumerErrors(repositoryRoot) {
  const errors = [];
  for (const packageRoot of workspacePackageRoots(repositoryRoot)) {
    const manifestPath = join(packageRoot, "package.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const declaresDatasetStore = MANIFEST_DEPENDENCY_FIELDS.some((field) =>
      Object.prototype.hasOwnProperty.call(manifest[field] ?? {}, "@lana/dataset-store"),
    );
    for (const filePath of sourceFiles(packageRoot)) {
      for (const symbol of movedDatasetDatabaseImports(filePath)) {
        errors.push(
          `${toRepositoryPath(repositoryRoot, filePath)}: moved ${symbol} must import from @lana/dataset-store, not @lana/database`,
        );
      }
      if (
        manifest.name !== "@lana/dataset-store" &&
        sourceReferencesPackage(filePath, "@lana/dataset-store") &&
        !declaresDatasetStore
      ) {
        errors.push(
          `${toRepositoryPath(repositoryRoot, manifestPath)}: ${toRepositoryPath(repositoryRoot, filePath)} imports @lana/dataset-store without a direct dependency`,
        );
      }
    }
  }
  return errors;
}

function packageManifestErrors(repositoryRoot, owner, forbidden) {
  const manifestPath = join(repositoryRoot, owner, "package.json");
  if (!existsSync(manifestPath)) return [`${owner}/package.json: missing manifest`];
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const errors = [];
  for (const field of MANIFEST_DEPENDENCY_FIELDS) {
    const dependencies = manifest[field] ?? {};
    for (const packageName of forbidden) {
      if (Object.prototype.hasOwnProperty.call(dependencies, packageName)) {
        errors.push(`${owner}/package.json: forbidden ${field} entry ${packageName}`);
      }
    }
  }
  for (const [scriptName, script] of Object.entries(manifest.scripts ?? {})) {
    for (const packageName of forbidden) {
      if (typeof script === "string" && script.includes(packageName)) {
        errors.push(`${owner}/package.json: script ${scriptName} references forbidden ${packageName}`);
      }
    }
  }
  return errors;
}

export function validateDatasetBoundary(repositoryRoot) {
  const errors = workspaceConsumerErrors(repositoryRoot);
  for (const { owner, forbidden } of OWNER_RULES) {
    errors.push(...packageManifestErrors(repositoryRoot, owner, forbidden));
    for (const filePath of sourceFiles(join(repositoryRoot, owner))) {
      for (const packageName of forbidden) {
        if (sourceReferencesPackage(filePath, packageName)) {
          errors.push(`${toRepositoryPath(repositoryRoot, filePath)}: forbidden import or re-export of ${packageName}`);
        }
      }
    }
  }
  return errors;
}

function requireClean(repositoryRoot, description) {
  const errors = validateDatasetBoundary(repositoryRoot);
  if (errors.length > 0) throw new Error(`${description}: ${errors.join("; ")}`);
}

function requireViolation(repositoryRoot, expected, description) {
  const errors = validateDatasetBoundary(repositoryRoot);
  if (!errors.some((entry) => entry.includes(expected))) {
    throw new Error(`${description}: expected ${expected}, got ${errors.join("; ") || "no violations"}`);
  }
}

export function runSelfTest() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "lana-dataset-boundary-"));
  const write = (path, content) => {
    const fullPath = join(fixtureRoot, path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, "utf8");
  };
  const manifest = (name, dependencies = {}, scripts = {}) =>
    JSON.stringify({ name, dependencies, scripts }, null, 2);
  try {
    write("packages/database/package.json", manifest("@lana/database", { "@lana/contracts": "workspace:*" }));
    write("packages/database/src/index.ts", 'export type DatabaseHealth = "READY";\n');
    write("packages/dataset-review/package.json", manifest("@lana/dataset-review", { "@lana/contracts": "workspace:*" }));
    write("packages/dataset-review/src/index.ts", 'export type ReviewState = "DRAFT";\n');
    write("packages/dataset-store/package.json", manifest("@lana/dataset-store", { "@lana/database": "workspace:*", "@lana/dataset-review": "workspace:*" }));
    write("packages/dataset-store/src/index.ts", 'import type { DatabaseHealth } from "@lana/database";\nimport type { ReviewState } from "@lana/dataset-review";\nexport type StoreState = DatabaseHealth | ReviewState;\n');
    requireClean(fixtureRoot, "valid one-way fixture rejected");

    write("apps/consumer/package.json", manifest("@lana/consumer", { "@lana/database": "workspace:*" }));
    write("apps/consumer/src/index.ts", 'import { PostgresDatasetReviewStore } from "@lana/database";\nexport type Store = PostgresDatasetReviewStore;\n');
    requireViolation(fixtureRoot, "apps/consumer/src/index.ts: moved PostgresDatasetReviewStore must import from @lana/dataset-store", "moved consumer import fixture was accepted");
    write("apps/consumer/src/index.ts", 'import type { PostgresDatasetReviewStore } from "@lana/dataset-store";\nexport type Store = PostgresDatasetReviewStore;\n');
    requireViolation(fixtureRoot, "apps/consumer/package.json: apps/consumer/src/index.ts imports @lana/dataset-store without a direct dependency", "missing consumer dependency fixture was accepted");
    write("apps/consumer/package.json", manifest("@lana/consumer", { "@lana/dataset-store": "workspace:*" }));
    requireClean(fixtureRoot, "valid direct consumer dependency rejected");

    write("packages/database/src/index.ts", 'export * from "@lana/dataset-review";\n');
    requireViolation(fixtureRoot, "packages/database/src/index.ts: forbidden import or re-export of @lana/dataset-review", "database reverse-import fixture was accepted");
    write("packages/database/src/index.ts", 'export type DatabaseHealth = "READY";\n');

    write("packages/database/tools/illegal.mjs", 'await import("@lana/dataset-store/internal");\n');
    requireViolation(fixtureRoot, "packages/database/tools/illegal.mjs: forbidden import or re-export of @lana/dataset-store", "database package-wide subpath fixture was accepted");
    rmSync(join(fixtureRoot, "packages/database/tools/illegal.mjs"));

    write("packages/database/package.json", manifest("@lana/database", { "@lana/contracts": "workspace:*", "@lana/dataset-review": "workspace:*" }));
    requireViolation(fixtureRoot, "packages/database/package.json: forbidden dependencies entry @lana/dataset-review", "database manifest dependency fixture was accepted");
    write("packages/database/package.json", manifest("@lana/database", { "@lana/contracts": "workspace:*" }, { prebuild: "pnpm --filter @lana/dataset-review build" }));
    requireViolation(fixtureRoot, "packages/database/package.json: script prebuild references forbidden @lana/dataset-review", "database manifest hook fixture was accepted");
    write("packages/database/package.json", manifest("@lana/database", { "@lana/contracts": "workspace:*" }));

    write("packages/dataset-review/src/index.ts", 'export * from "@lana/database";\n');
    requireViolation(fixtureRoot, "packages/dataset-review/src/index.ts: forbidden import or re-export of @lana/database", "dataset-review reverse-import fixture was accepted");
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

const thisFile = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(thisFile), "../..");
if (process.argv.includes("--self-test")) {
  runSelfTest();
  console.log("DATASET_BOUNDARY_GUARD_SELF_TEST_PASS");
}
const errors = validateDatasetBoundary(repositoryRoot);
if (errors.length > 0) {
  console.error("DATASET_BOUNDARY_GUARD_FAIL");
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`DATASET_BOUNDARY_GUARD_PASS ${basename(repositoryRoot)}`);
}
