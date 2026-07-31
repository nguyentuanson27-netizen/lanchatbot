# Realtime audit r32.1 -- production evidence

Status: `DEPLOYED_VERIFIED_R32_1`
Captured: `2026-07-31T09:22:28Z`
Production page: `1198992073286645`

## Source and runtime

- r32 source tag: `20260731-realtime-audit-safety-r32`, commit `8ce8ee22c7c575a23bf123e7d335050952cbd9e3` (PR #94).
- Live source tag: `20260731-realtime-audit-safety-r32.1`, commit `90760d2cf43c160d58470b0c9907f30032774140` (PR #95).
- Live release path: `/opt/lana-chatbot/releases/20260731-realtime-audit-safety-r32.1`.
- Runtime image: `lana-chatbot-app:realtime-audit-safety-r32.1`, digest `sha256:3695a4f85efbb2418cae065ebdc6f6a2f9c5714b27f68cd30c23841dbb8f787e`.
- Recreated services: Realtime Worker and Admin API only. Both are healthy with restart count `0`; other services were not recreated.

## Delivered safeguards

1. Handoff cases receive an explicit 30-minute `sla_due_at`; migration `0027_handoff_case_sla_default` provides a database default.
2. Every exception in the grounded Vertex draft path falls back to a deterministic reply assembled from verified facts.
3. Size Engine advice is appended to, rather than replacing, the verified price/stock/ETA reply and its eligible attachments.
4. Hotfix r32.1 casts the shared handoff timestamp as `timestamptz` in every SQL use, eliminating PostgreSQL's incompatible parameter inference.

## Verification and recovery

- Local database suite: `104` tests passed; full typecheck passed.
- Docker image build executed full `pnpm check` successfully.
- PostgreSQL parse check for the r32.1 handoff insert passed in a rolled-back transaction.
- Schema verification: migration `0027_handoff_case_sla_default` present; SLA column is NOT NULL and has a default.
- Recovery was deliberately delayed until the relevant hotfix was deployed and verified. The two audited Vertex failures completed after r32. The five handoff records exposed the r32 timestamp-inference error, remained stopped, then completed after r32.1.
- Final aggregate check: active Inbox `0`; recovery terminal failures `0`; worker `IDLE/LIVE`; open cases with NULL SLA `0`; 48-hour BOT_TO_HUMAN events without a case `0`.

## Rollback

Rollback is application-only: restore the saved r32 image variables, recreate only Realtime Worker and Admin API, and repoint `current` to `/opt/lana-chatbot/releases/20260731-realtime-audit-safety-r32`. Migration `0027` remains additive; no Inbox, Outbox, Redis, PostgreSQL, or Qdrant data is deleted.