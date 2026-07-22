# @lana/secrets

Versioned envelope encryption for page/provider credentials.

- Secret plaintext is encrypted with a random 256-bit DEK using AES-256-GCM.
- The DEK is wrapped through the `KeyProvider` interface.
- AAD binds ciphertext to `environment`, `provider`, `pageId`, `secretType`, `secretVersion` and `rowId`.
- Decryption fails if ciphertext, authentication tag, wrapped key or AAD is changed.
- The persisted envelope contains ciphertext and key metadata only.

`MemoryKeyProvider` exists only for tests/local development. Production must implement `KeyProvider` with KMS, Vault or HSM, use service-scoped decrypt permissions, and keep the KEK outside PostgreSQL, Redis, Git and application environment files.

Callers should pass plaintext as a `Buffer`, avoid converting it to a JavaScript string, clear their own input buffer after encryption, decrypt just-in-time and clear the returned buffer immediately after provider use. Plaintext secrets must never be logged, included in errors, metrics, traces, audit metadata or Telegram alerts.

Rotation flow:

1. create and validate a new secret version;
2. activate the new KEK/secret version atomically;
3. keep the previous version only for a short audited grace window;
4. revoke at the provider;
5. revoke/destroy the local version and clear process memory caches.

