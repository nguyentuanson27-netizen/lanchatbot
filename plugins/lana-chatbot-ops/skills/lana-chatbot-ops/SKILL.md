---
name: lana-chatbot-ops
description: Diagnose, audit, and fix the La.na Design chatbot using the Lana Chatbot Ops MCP. Use when checking the latest Messenger event, missing or wrong product images, Qdrant matches, Redis state, VPS health, Google Sheets catalog or image review data, or when preparing a GitHub-first repair and controlled deployment.
---

# Lana Chatbot Ops

Use the `lana_chatbot_ops` MCP tools as the operational interface. Treat production data as sensitive even though the owner has granted access.

## Operating workflow

1. Use `repository_list_files`, `repository_read_file`, and `repository_search_text` to read `README.md`, `AGENTS.md`, and the newest baseline/release document from the immutable release snapshot before diagnosing code.
   Report `source_commit` and `source_ref` when the diagnosed source version matters.
2. Inspect Git/GitHub and VPS state before proposing or applying a repair.
3. Start read-only: page status, latest event, decision events, outbox, worker logs, Redis state, and Qdrant payload.
4. State the evidence, root cause, affected scope, proposed change, test plan, and rollback.
5. Apply source changes only on a non-protected Git branch. Never edit source directly on the VPS.
6. Run focused tests, then repository checks. Push a branch or create a PR only when requested.
7. Deploy only after explicit confirmation of release name, commit, target service, and rollback image.

## Sensitive access

- Redis key reads and exports may contain sessions, credentials, and customer data. Pass `confirm_sensitive_read=true` and a specific `reason`. Do not paste raw secrets or customer data back into chat when a summary, count, hash, or local export path is sufficient.
- Qdrant URLs and payloads require the same confirmation when `include_sensitive=true`.
- Reading decrypted Messenger payloads requires the same confirmation.
- Never put credentials in source, Git, audit logs, or tool arguments that may be retained unnecessarily.

## Google Sheets writes

For every Sheet mutation:

- Pass `confirm_write=true`.
- Pass a concrete `change_note`.
- The server must write a cell note beginning `BY_CHATGPT:` on every changed cell.
- Read the row immediately before and after the write and report the changed cells.
- For image approval, use the exact `IMAGE_ID`; do not approve from visual inference alone unless the user explicitly asks ChatGPT to act as reviewer.
- `MANUAL_OVERRIDE`, product code, price, and status changes are allowed only through the audited Sheet tools.

## Repair boundaries

- Preserve the GitHub-to-VPS path.
- Do not enable n8n as an additional owner.
- Scope live tests and rollout to the requested page or service.
- A diagnostic request does not authorize a write.
- A code-fix request authorizes branch changes and tests, not merge or deploy unless requested.
- Keep the app as the sole realtime owner unless the user explicitly changes that architecture.

Read [permissions](references/PERMISSIONS.md) before using a write, export, decrypted-payload, credential, or deployment capability.
