# Lana Chatbot Ops for ChatGPT

This plugin connects to `https://dev.lanadesign.vn/mcp` over Streamable HTTP.
ChatGPT discovers OAuth automatically and sends the user to Authentik.

Credentials are entered only on `auth.lanadesign.vn`. The MCP server receives
an access token, verifies it and restricts access to the approved owner account.

The remote endpoint covers service health, latest chatbot evidence, Qdrant,
Redis and Google Sheets. Source-code writes are intentionally excluded from the
VPS endpoint so fixes continue through GitHub-first workflows.
