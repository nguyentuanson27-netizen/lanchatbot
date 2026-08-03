# Durable Contract — Dataset Dependency Boundary

Gate D has passed; the following invariants remain binding:

- `@lana/database` must not depend on dataset-review, dataset-store, or business-tools.
- `@lana/dataset-review` must not depend on database or dataset-store.
- Dataset persistence belongs to `@lana/dataset-store`.
- `@lana/database` must not re-export dataset-store types or implementations.
- Workspace consumers declare direct dependencies and import from the owning package.
- Architecture guards scan package-owned JavaScript/TypeScript outside generated/vendor content, including subpaths, re-exports, namespace imports, type imports, literal dynamic imports, and `require()`.
- Existing SQL, tables, AAD, ciphertext, retention, idempotency, and error behavior remain compatible.
- Boundary changes require consumer sweep, positive/negative guard fixtures, integration compatibility evidence, frozen install, and full regression tests.
- No migration or backfill is implied by package ownership changes.
