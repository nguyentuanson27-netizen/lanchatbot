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

The remote service exposes diagnostics, Qdrant, Redis, Google Sheets, and the
immutable source tree of the current production release. ChatGPT can list, read,
and search source code, README, AGENTS, baseline, manifest, and related text
documents through the existing `mcp:read` scope.

The updater creates a root-owned, read-only mirror from the verified Git tag in
`/opt/lana-chatbot/mcp-source/releases`. The container mounts only
`/opt/lana-chatbot/mcp-source` read-only. It never mounts production releases,
`/opt/lana-chatbot/shared`, `.git`, the Docker socket, or a writable repository.
Repository tools resolve the pointer for every call and reject absolute paths,
traversal, binary files, generated directories,
and files over 1 MiB.

The service does not expose a source-write tool. Source-code changes remain
GitHub-first and use the local audited Git tools or a separately authorized
GitHub connector.

Every sensitive read still requires an explicit confirmation argument. Every
Sheet mutation requires `confirm_write=true`, a reason, and writes a
`BY_CHATGPT:` cell note.


## Automatic source synchronization

`lana-mcp-source-sync.path` watches `/opt/lana-chatbot/current`. A five-minute
timer is the fallback if an atomic symlink switch is not observed. The oneshot
updater:

1. resolves `current` and rejects targets outside `/opt/lana-chatbot/releases`;
2. validates the release name and required source files;
3. fetches the same-name tag with the read-only `lana-deploy` key;
4. verifies README, AGENTS, MCP server, and compose content against that tag;
5. creates a sanitized, read-only source mirror from `git archive`;
6. writes `release`, `source_commit`, `source_ref`, and `updated_at` to a
   root-owned pointer using an atomic rename.

MCP sees the new release on the next repository tool call. It does not need a
rebuild or restart for later application releases. A bad tag, source mismatch,
or path traversal leaves the previous pointer untouched and the systemd unit
failed for operator visibility.

## Cutover order

1. Create the Authentik application/provider and owner-only policy.
2. Write the two MCP-specific secret files.
3. Build the MCP image from the tagged GitHub release.
4. Run `deploy/lana-mcp/install-source-sync.sh` as root to create the initial
   pointer and enable the path/timer units.
5. Start only `lana-mcp` with the standalone compose file.
6. Create the Nginx Proxy Manager TLS host for `dev.lanadesign.vn`.
7. Add the exact discovery override on `auth.lanadesign.vn`.
8. Verify protected-resource metadata, DCR rejection tests, OAuth login,
   token claims, MCP initialization, tool listing and one read-only call.
9. Add `https://dev.lanadesign.vn/mcp` in ChatGPT developer mode.

Rollback disables `lana-mcp-source-sync.path` and `.timer`, restores the previous
root-owned pointer or recreates only `lana-mcp` with the previous image, and
keeps the prior release directories intact. It does not restart API, realtime,
delivery, Admin, P2.3, POS or n8n.
