# Lana Chatbot Ops for ChatGPT

This plugin connects to `https://dev.lanadesign.vn/mcp` over Streamable HTTP.
ChatGPT discovers OAuth automatically and sends the user to Authentik.

Credentials are entered only on `auth.lanadesign.vn`. The MCP server receives
an access token, verifies it and restricts access to the approved owner account.

The remote endpoint covers service health, latest chatbot evidence, Qdrant,
Redis, Google Sheets, and a read-only snapshot of the current production
release. A root-owned atomic pointer follows `/opt/lana-chatbot/current`, so the
existing `mcp:read` scope can list, read, and search the matching README, AGENTS,
source code, baseline/release documents, manifests, and related text files
without recreating MCP for every later release.

Runtime secrets, `.git`, dependencies, generated files, binary files, and source
writes are intentionally excluded. Fixes continue through GitHub-first workflows.
