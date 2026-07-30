# Lana Chatbot Ops MCP

Personal Codex plugin for diagnosing and repairing the La.na Design chatbot.

- Local transport: STDIO.
- Remote transport: `https://dev.lanadesign.vn/mcp` with OAuth and an immutable read-only source snapshot.
- Source workflow: GitHub branch/PR, then controlled VPS deployment.
- Remote repository tools: list files, read line ranges, and search source/README/release text through `mcp:read`.
- Audit directory: `%USERPROFILE%\.lana-mcp` unless `LANA_MCP_DATA_DIR` is set.
- All Google Sheets mutations attach a `BY_CHATGPT:` note to each changed cell.

The remote endpoint must not be published before HTTPS and authentication are enabled. No credential belongs in this directory or in Git.

## Local environment

The server accepts:

- `LANA_REPO_PATH`
- `LANA_SSH_HOST` (default `156.67.214.197`)
- `LANA_SSH_USER` (default `root`)
- `LANA_SSH_PASSWORD_FILE` or `CODEX_SSH_PASSWORD`
- `LANA_MCP_DATA_DIR`

Run `py -3.11 scripts/lana_mcp_server.py --self-test` for the offline protocol and policy checks.
