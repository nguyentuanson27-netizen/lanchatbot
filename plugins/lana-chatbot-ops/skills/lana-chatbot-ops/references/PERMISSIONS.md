# Lana Chatbot Ops permissions

## Read capabilities

- GitHub/repository: README, AGENTS, baseline/release documents, branches, commits, diffs, checks, logs, and current worktree state.
- VPS: container/image/health status, runtime flags, selected logs, queues, PostgreSQL operational metadata, Qdrant payloads, and Messenger processing evidence.
- Redis: list all keys, read any key including session, credential, or customer-data keys, and export the whole logical database.
- Google Sheets: read catalog, image registry, review, price, and product-status data.

Sensitive reads require `confirm_sensitive_read=true` plus a reason. Prefer masked output. Full Redis exports are written to the local MCP data directory and the tool returns a path, SHA-256, and row count instead of printing the export.

## Write capabilities

- Git: create or use a non-protected branch, apply a patch, run approved tests, commit, and push.
- Google Sheets: update cells or rows, approve an image, set `MANUAL_OVERRIDE`, and change product code, price, or status.

Every changed Google Sheets cell must receive a note whose first text is:

`BY_CHATGPT:`

Every write requires `confirm_write=true` and a specific `change_note`. The MCP audit record contains the tool, timestamp, result, reason, and hashes; it never contains the new secret or full customer payload.

## Separate confirmation

These actions require a fresh, explicit confirmation for the exact target:

- Merge a pull request.
- Deploy or recreate a VPS service.
- Change a production routing owner, kill switch, or live page scope.
- Send a customer-facing message or mutate Meta/Pancake/POS.
- Delete Redis keys, flush Redis, delete Sheet rows, delete Qdrant points, or destroy data.

The initial MCP release intentionally exposes no delete/flush tool and no direct VPS source editor.

## Domain and authentication

The intended remote endpoint is `https://dev.lanadesign.vn/mcp`. Do not expose it until TLS and authentication are working. The local STDIO MCP remains the default for Codex Desktop.
