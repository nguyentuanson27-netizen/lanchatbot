# Dataset Store Boundary C2 Evidence (DB-03–DB-05)

Status: repository-only C2 evidence. No migration, backfill, runtime-mode change,
or production action is part of this change.

## Boundary and consumer inventory (DB-03)

The C1 move makes `@lana/dataset-store` the owner of dataset persistence. This
C2 sweep covers tracked source, tests, package manifests, build scripts, barrels,
release/runtime tooling, and documentation for `PostgresDataset*`,
`@lana/database`, `@lana/dataset-review`, `@lana/dataset-store`, dataset import,
and gold replacement entry points.

| Consumer / surface | Direct owner after C2 | Evidence |
| --- | --- | --- |
| Admin API dataset review service and tests | `@lana/dataset-store` | Review and annotation stores import from the store package; `LocalEnvelopeCipher` stays a generic database primitive. |
| Worker pre-label wiring and tests | `@lana/dataset-store` | The pre-label store type imports directly from the store package. |
| Dataset import and gold-v2 replacement CLIs | `@lana/dataset-store` | Both CLI entry points remain internal to the owner package. |
| Dataset persistence tests | `@lana/dataset-store` | Review, annotation, pre-label, import idempotency, and compatibility suites are co-located with the owner. |
| Database public barrel | none for dataset persistence | `@lana/database/src/index.ts` has no dataset-store/review persistence export or re-export. |

The sweep found no consumer importing a moved `PostgresDataset*` symbol from
`@lana/database`. Generic database imports that remain (cipher, migration, realtime,
outbox, and other non-dataset facilities) are intentionally outside this boundary.

## Dependency cleanup and architecture guard (DB-04)

`@lana/database` no longer declares `@lana/dataset-review` and no database
pretypecheck/pretest/prelint hook builds it. The permitted direction is one-way:
`@lana/dataset-store` may use `@lana/database` and `@lana/dataset-review`; neither
lower-level package may depend on the store, and `@lana/dataset-review` may not
depend on the database.

`deploy/runtime-state/dataset-boundary-guard.mjs` recursively checks every
package-owned JavaScript/TypeScript file (excluding generated/vendor directories)
with the TypeScript AST plus manifests, rather than an allowlist of individual
files. It rejects exact or subpath type-only imports, static imports/re-exports,
dynamic literal imports, and CommonJS imports plus dependency entries or lifecycle
scripts that name a forbidden owner. Its workspace sweep also rejects moved
`PostgresDataset*` imports from `@lana/database` and consumers that import
`@lana/dataset-store` without a direct manifest dependency. It is wired into
`pnpm check:release-integrity`.

The guard's isolated temporary fixtures demonstrate both directions:

- a valid one-way `dataset-store -> database + dataset-review` graph passes;
- database source and outside-`src` subpath reverse imports fail;
- stale consumer imports and missing direct dependencies fail;
- a database manifest dependency and a build hook each fail; and
- a dataset-review re-export of database fails.

## Compatibility evidence (DB-05)

The dataset-store suite includes a fixed, synthetic C1 envelope fixture. Its public
all-zero test key, fixed AAD, and non-customer payload prove unchanged ciphertext
bundle decoding after extraction; a changed AAD is rejected. Existing store suites
cover create/import idempotency, duplicate no-ops, partial-failure isolation, and
redacted-only projections. Admin API and worker suites provide direct consumer
compatibility evidence.

No schema is altered, no historical data is rewritten, and no runtime control-plane
value changes. Rollback is a source-level revert: the package dependency boundary
returns with the commit; data and migration 0030 remain untouched.
