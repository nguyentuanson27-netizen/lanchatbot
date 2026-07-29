# Lana MCP edge deployment

The exact Authentik client ID and allowed username are stored outside Git in
`/opt/lana-chatbot/shared/secrets`. Both files must use mode `0640`, be owned
by `root`, and have group ID `1000`, the unprivileged `node` group inside the
MCP container.

Run the source-controlled edge installer from an immutable release:

```sh
deploy/lana-mcp/install-edge.sh /opt/lana-chatbot/releases/<release>
```

The installer preserves existing Nginx Proxy Manager custom configuration,
stores a timestamped backup, validates DNS and MCP OAuth health, obtains an
ECDSA Let's Encrypt certificate using the existing NPM webroot, installs the
exact Authentik discovery override, validates Nginx before each reload, and
verifies both public endpoints.

To remove only these routes:

```sh
deploy/lana-mcp/rollback-edge.sh
```

Rollback keeps the TLS certificate for recovery and does not restart API,
realtime, delivery, Admin, P2.3, POS, or n8n.
