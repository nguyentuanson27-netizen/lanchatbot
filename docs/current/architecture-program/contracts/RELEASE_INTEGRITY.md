# Durable Contract — Release Integrity

This contract defines release-integrity requirements for both the current `ENGINEERING_PREPROD` / `SOLO_PREPROD_MINIMAL` profile and any explicitly selected Release Train / future production-hardening flow. `SOLO_PREPROD_MINIMAL` remains active until an explicit owner instruction changes the process profile or operating mode.

## 1. SOLO PREPROD minimum

For ordinary PREPROD deploys while `SOLO_PREPROD_MINIMAL` is active, preserve only the identity needed to know **what is running**, **what changed**, and **how to go back**:

1. GitHub `main` and the exact selected merged commit are the source-code authority.
2. Never edit application source in `/opt/lana-chatbot/current` or an existing VPS release directory.
3. Every deploy starts from a clean GitHub commit and uses a new release directory/build identity.
4. Record the exact previous release/build/commit for **each affected service** before activation so rollback restores every changed service to its own known-good identity.
5. Persist that minimum identity in one release-local machine-readable record before activation. Reuse `.release-source.json` if it can represent the required fields; otherwise use a small adjacent `.rollback-targets.json`. The record needs only the selected source commit plus, for each affected service, the new release/build identity and exact previous release/build/commit; when an authority/config boundary changes, the same record must also contain the exact previous authority/config identity needed for rollback. Do not create a second full manifest when equivalent data already exists.
6. If a migration is involved, record its identifier/checksum and take the required backup before a risky mutation.
7. If behavior authority/configuration changes, verify the exact active readback after startup and retain the exact previous authority/config identity needed for rollback.
8. Unknown, mixed, partial or mismatched running source/rollback identity blocks further mutation and requires diagnosis/rollback.
9. Production secrets stay outside repository evidence, logs, and prompts.

For a normal solo PREPROD deploy, the following are **not mandatory by themselves** unless a concrete current risk or hard stop requires them:

- annotated release tags or tag/tree attestation;
- full release manifests beyond the minimum identity above;
- append-only runtime-state promotion/reconciliation ceremony;
- exhaustive per-service provenance capture when the service was not changed;
- per-file Git blob/mode attestation;
- independent approval records after the owner has explicitly authorized the scoped PREPROD deploy.

Existing evidence/runtime-state tooling may still be used for diagnosis or when it directly proves a changed risk boundary. Its existence does not make it a default gate for every future PREPROD deploy. Completing a roadmap Track or Gate does not change this profile automatically; only an explicit owner instruction does.

## 2. Explicit Release Train / production-hardening profile

When a Release Train is explicitly selected, or a later production-hardening decision requires stronger release provenance, the stricter rules below apply to that train without relaxation:

1. GitHub `main` and immutable fetched tags are the only source-code authority.
2. Never edit application source in `/opt/lana-chatbot/current` or a VPS release directory.
3. Every release starts from a clean GitHub commit and uses a new immutable release directory.
4. Candidate runtime-state must pass schema and live parity before current-state/symlink promotion when runtime-state promotion is part of the selected release protocol.
5. Runtime evidence records the source commit and every service/config/migration/authority identity required by the changed risk boundary.
6. Unknown, partial, mixed, stale, or mismatched attestation blocks promotion.
7. Runtime-state and append-only evidence may record observations; they must not invent missing historical evidence.
8. README prose is not a live runtime manifest.
9. Rollback identity is per service when multiple services are included in the selected train. A shared image variable is not proof that every service currently runs the same image.
10. Production secrets stay outside repository evidence, logs, and prompts.

## 3. Current residual enforcement — mandatory in every profile

- Do not recreate `admin-web` or `admin-simulation-worker` while the shared `ADMIN_IMAGE` can select an unintended image.
- Host-only release scripts require a reviewed repository artifact or fresh hash verification before every use.
- Merge/evidence recording does not imply deployment; deployment does not imply a new authority-mode mutation unless that mutation was explicitly authorized.
- No direct VPS source edit, silent source substitution, mixed release identity, or unknown rollback target is allowed.

These are current technical hard stops, not team ceremony, and are not waived by `SOLO_PREPROD_MINIMAL`.
