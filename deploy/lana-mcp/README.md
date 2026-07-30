# ChatGPT MCP OAuth deployment

This service exposes the audited Lana operations tools at
`https://dev.lanadesign.vn/mcp`.

Authentication uses OAuth 2.1 Authorization Code with PKCE. Authentik remains
the user-facing identity provider, so credentials are entered only on
`auth.lanadesign.vn`. The MCP service never receives or stores the user's
password.

## Compatibility bridge

ChatGPT discovers OAuth dynamically. Authentik supports OIDC and PKCE but does
not advertise ChatGPT-compatible DCR/CIMD. The MCP service therefore exposes a
restricted DCR endpoint that:

- accepts only `https://chatgpt.com/connector/oauth/<id>` and the documented
  legacy callback;
- returns one pre-created Authentik public client;
- requires PKCE S256 and token endpoint auth method `none`;
- never creates arbitrary Authentik clients and never returns a client secret.

Nginx must route the Authentik provider discovery path
`/application/o/lana-chatgpt-mcp/.well-known/openid-configuration` to
`http://lana-chatbot-mcp:8080/oauth/authentik-discovery`. All other
`/application/o/lana-chatgpt-mcp/*` requests continue to Authentik.

## Required Authentik provider

- Application slug: `lana-chatgpt-mcp`
- Provider: OAuth2/OIDC
- Client type: public
- Grant types: authorization code and refresh token
- PKCE: S256
- Strict/regex redirect allowlist limited to ChatGPT connector callback URLs
- Scopes: `openid`, `profile`, `mcp:read`, `mcp:sensitive`, `mcp:write`
- Access policy: owner account only
- Access token lifetime: 15 minutes
- Refresh token rotation: enabled

The exact client ID and allowed Authentik username are stored in root-readable
files under `/opt/lana-chatbot/shared/secrets`; they are not committed.

## Service boundary

The remote service exposes diagnostics, Qdrant, Redis, Google Sheets, and an
immutable repository snapshot built from the tagged GitHub release. ChatGPT can
list, read, and search source code, README, AGENTS, baseline, manifest, and other
text documents through the existing `mcp:read` scope.

The snapshot is owned by root and stored inside the read-only container. Build
context rules exclude `.git`, runtime `.env` files, private keys, generated
directories, and dependencies. Repository tools also reject absolute paths,
path traversal, symlinks outside the snapshot, binary files, and files over 1
MiB.

The service does not mount the Docker socket or a writable VPS repository and
does not expose a source-write tool. Source-code changes remain GitHub-first and
use the local audited Git tools or a separately authorized GitHub connector.

Every sensitive read still requires an explicit confirmation argument. Every
Sheet mutation requires `confirm_write=true`, a reason, and writes a
`BY_CHATGPT:` cell note.

## Cutover order

1. Create the Authentik application/provider and owner-only policy.
2. Write the two MCP-specific secret files.
3. Build the MCP image from the tagged GitHub release with
   `LANA_MCP_SOURCE_COMMIT` and `LANA_MCP_SOURCE_REF` set to that exact source.
4. Start only `lana-mcp` with the standalone compose file.
5. Create the Nginx Proxy Manager TLS host for `dev.lanadesign.vn`.
6. Add the exact discovery override on `auth.lanadesign.vn`.
7. Verify protected-resource metadata, DCR rejection tests, OAuth login,
   token claims, MCP initialization, tool listing and one read-only call.
8. Add `https://dev.lanadesign.vn/mcp` in ChatGPT developer mode.

Rollback removes only the `lana-mcp` container and the two new Nginx routes.
It does not restart API, realtime, delivery, Admin, P2.3, POS or n8n.
