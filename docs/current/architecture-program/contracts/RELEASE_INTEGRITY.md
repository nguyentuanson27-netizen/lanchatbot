# Durable Contract — Release Integrity

1. GitHub `main` and immutable fetched tags are the only source-code authority.
2. Never edit application source in `/opt/lana-chatbot/current` or a VPS release directory.
3. Every release starts from a clean GitHub commit and uses a new immutable release directory.
4. Candidate runtime-state must pass schema and live parity before current-state/symlink promotion.
5. Runtime evidence records full source commit, tag provenance, per-service image identity, migration digest, config/routing digests, behavior-mode readback, page allowlist, health/readiness, UID/restarts, and rollback targets.
6. Unknown, partial, mixed, stale, or mismatched attestation blocks promotion.
7. Runtime-state and append-only evidence may record observations; they must not invent missing historical evidence.
8. README prose is not a live runtime manifest.
9. Rollback identity is per service. A shared image variable is not proof that every service currently runs the same image.
10. Production secrets stay outside repository evidence, logs, and prompts.

Current residual enforcement:

- Do not recreate `admin-web` or `admin-simulation-worker` while the shared `ADMIN_IMAGE` can select an unintended image.
- Host-only release scripts require a reviewed repository artifact or fresh hash verification before every use.
- Merge/evidence recording does not imply deployment; deployment does not imply authority-mode promotion.
