# Current Reconciliation Baseline

**Evidence date:** 2026-08-12
**Purpose:** authoritative `POST_BF_V1` comparison checkpoint for the BF-to-DF transition.
It records fresh GitHub and read-only VPS parity plus the owner waiver decision; it is not
a deployment authorization.

## Reconciliation verdict

**GATE_BF_ACCEPTED_WITH_OWNER_WAIVERS** — this checkpoint is `POST_BF_V1` and recorded
the historical DF-A source-work entry decision. This is a governance acceptance of known residuals, not an
unqualified technical pass and not a runtime/deploy authorization.

## Later Gate E governance disposition

This `POST_BF_V1` record remains the immutable runtime comparison baseline and is not
rewritten. The later owner decision `GATE_E_PREPROD_ACCEPTED` records v15 Gate E
technical acceptance and advances source work to DF-C / DF11. Its exact scored-main,
candidate, manifest, evidence BODY, FINALIZATION, and admissibility bindings are in
`GATE_E_PREPROD_ACCEPTANCE_20260821.md`. Runtime remains
`salesAuthorityMode=LEGACY` and `stateReadMode=LEGACY`; this later governance decision
does not authorize deployment, canary, or `COMMERCE` activation.

The accepted residuals are:

1. **BF-04 is PARTIAL / KNOWN_GAP.** The owner record on
   [PR #128](https://github.com/nguyentuanson27-netizen/lanchatbot/pull/128#issuecomment-5177514678)
   preserves P0 bypasses that can allow an undeclared size recommendation. The original
   BF-04 mandatory fail-closed acceptance is therefore not complete. The owner waived it
   only as a DF-progression blocker on 2026-08-13; the finding remains open.
2. **BF-10 lacks a post-cutover natural terminal transition.** The delivery worker is
   deployed on the BF-10 image and source/test evidence is green, but the fresh aggregate
   readback found 0 SENT_ACCEPTED records since its cutover. Historical rows are
   deliberately immutable: 13 old SENT_ACCEPTED rows retain a stale error and 233 retain
   an old retry schedule. They are not evidence that the new transactional path has run,
   and must not be rewritten or silently treated as fixed. The absence of natural traffic
   is a non-blocking evidence residual because it was not part of the original BF-10
   acceptance contract.

BF-10 is not a claim that current delivery is unhealthy:
the active queues are empty, duplicates are zero, and no post-cutover cleanup violation
was observed because no such transition occurred.

## GitHub and immutable release provenance

| Field | Value |
|---|---|
| Reconciled origin/main | 7ffa858911efb583ebf214b163843ac12a11766b — merge of runtime evidence PR #193 |
| Current immutable realtime tag | 20260812-unbounded-text-media-guard-r5.7.1 |
| Tag object / peeled commit | d0afb24333edf21b40fe1da30de02cad759fe931 / 92bc150b452f7ef40e52871f16a444a4979a8d8c |
| Latest realtime evidence | deploy/manifests/20260812-unbounded-text-media-guard-r5.7.1-runtime.json |
| Current delivery tag | 20260812-bf10-delivery-r5.6 |
| Delivery tag object / peeled commit | bcb67ddf9134d65cc05b4dbeb57dd2d7cc9f89d8 / a5d5066660a2c4365657a6ff99276c259848931d |
| Delivery evidence | deploy/manifests/20260812-bf10-delivery-r5.6-runtime.json |

The latest source main is an append-only evidence merge, not the source commit of every
running service. Service identity remains per-service.

## Fresh read-only VPS parity

| Field | Observation |
|---|---|
| Resolved current | /opt/lana-chatbot/releases/20260812-unbounded-text-media-guard-r5.7.1 |
| Runtime-state / immutable history SHA-256 | 3facb2f3b60840c6bc5dd442640207e882ee1fb0f4bde3b631248ecc67f8aa65 / byte-identical |
| Release source-pointer SHA-256 | 3506fc099d043bcc8f1779d4fbe514c65df7938f2bbeefca45da9e5e36c1f4b3 |
| Realtime | lana-chatbot-app:unbounded-text-media-guard-r5.7.1; sha256:cfb2af1c…6daf; revision 92bc150b…; healthy, restart 0, PID 1 UID 1000 |
| Delivery | lana-chatbot-app:bf10-delivery-r5.6; sha256:26ff9ca8…e4f0; revision a5d50666…; healthy, restart 0, PID 1 UID 1000 |
| Admin API | lana-chatbot-app:bf03-wave-c-r5.5; sha256:97b59eb4…951a; healthy, restart 0, PID 1 UID 1000 |
| Migration | 0031_admin_policy_safe_deletion; ledger digest c2f764b8…a4180 |
| Page scope | only 1198992073286645 |
| Realtime status | IDLE / LIVE, send enabled, fresh heartbeat, no current worker error |
| Queues | Inbox active 0, Meta Outbox active 0, Pancake Outbox active 0, duplicates 0 |

The generated runtime-state still labels the physical host inventory as
environment: "production" / lana-chatbot-production-v1. That is a legacy runtime
identifier, not an operating-mode decision. The authoritative project classification is
ENGINEERING_PREPROD; the only connected page is the PREPROD_TEST_PAGE. No public
production-readiness claim is implied.

## Control-plane and behavior readback

- Behavior modes: confirmation V2_ACTIVE; sales authority LEGACY; state read LEGACY;
  Messenger pointer revision 3; content hash
  sha256:72912576e4f64b311280c0455cf3c8ead22dc3723d90fdef4ab593a7f1a2c40e.
- PUBLISHED closing policy: pointer cefcecd6-2619-4ba9-bd54-ac43b25f5abd, revision
  4; version 805931e1-0363-4cb2-a66d-de9058982af5, version/revision 3/4; content
  hash sha256:e151e450efe47cfe9a48b7a55ea714ff2e1413399090fbd45d928816ecd067df.
- Effective policies: BF-01 CLARIFY_RECONCILED_V1; BF-06 PER_ASSET_V1; BF-07
  CLARIFY_V1; BF-08 CLASSIFIED_ALLOWLIST_V1.
- No correctionDialoguePolicy field is published or accepted. BF-03 remains
  foundation-only and non-activatable by design.
- Runtime exposes model/prompt configuration only through protected configuration.
  The fresh capture recorded the following value hashes, not values or prompt text:
  VERTEX_MODEL_NAME sha256:37a58c167b3b8f674049d3c259bacf074a8d47c406de12f2ca2ece97e0cf658a;
  REALTIME_PROMPT_VERSION sha256:e4bd88afa6988ebafc9c8911c82268812f2205b2f5b3abf98c2bd4f637ee0d1c;
  REALTIME_MEDIA_AI_PROMPT_VERSION sha256:adb3f24fcb6ea47acad022b7d1c24c7e4c4c42482ee30c23967ffa482b387e73.
  This `POST_BF_V1` baseline records their approved, PII/secret-safe hashes under the
  release-integrity contract.

## Rollback and preserved boundaries

- Realtime rollback: immutable BF-03/Wave-C image
  sha256:97b59eb4c7fbf03be8c4efd292af06fcfafa0068dbaeb2be9d6aa8385eea951a,
  revision 31d74695a794a28d6f93427416593b2a414270d6.
- Delivery rollback: compatibility image
  sha256:44ecb2fd9f7d6a5aa769938f738a3c6ba42b470db5a9bce3d30fdc364de2a0b7,
  revision 1c004eacca7cce309a0a05643d1aa751b897d41c.
- No migration, backfill, data deletion, routing change, allowlist change, synthetic
  Messenger action, n8n action, or direct VPS source edit occurred in the two latest
  releases.

## Continuing residuals and hard stops

1. BF-04 remains `PARTIAL / KNOWN_GAP`. Any remediation requires a separately reviewed
   fail-closed design; do not revive a broad text heuristic as a substitute for verified claims.
2. Keep BF-10 historical records immutable. Future evidence must distinguish their old
   terminal state from a new natural accepted-after-retry transition; pending evidence is
   non-blocking under the owner waiver.
3. Do not recreate admin-web or admin-simulation-worker without reviewed per-service
   image selection.
4. Host-only deployment scripts require a reviewed repository artifact or fresh hash
   verification before reuse.
5. Do not expand the one-page allowlist or infer PRODUCTION_HARDENING.
