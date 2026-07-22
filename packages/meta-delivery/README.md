# `@lana/meta-delivery`

Direct Meta Send API boundary for customer messages.

- `sendEnabled` is `false` unless explicitly enabled by the composition root.
- No global HTTP client is used; callers must inject an `HttpTransport`.
- A response is accepted only when both `recipient_id` and `message_id` are valid.
- A timeout/reset after dispatch is `AMBIGUOUS` and is never blindly retried.
- Errors returned to callers are stable redacted reason codes only.
- Echo evidence is matched by Page, recipient, configured App, time window and
  provider message ID or payload fingerprint.

This package does not read or write Pancake data.
