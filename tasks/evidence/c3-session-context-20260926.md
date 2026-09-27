# Bounded session context and long dialogue — 2026-09-26

Starting from `ce4a61555bf66a7e06adddfafd7b6ec730137ed6`, a stateful `RealtimeRunner` test loaded 30 prior messages. Before the change, C3 made zero provider calls and fell back with `TRACK_C_OFFLINE_CANDIDATE_DIALOGUE_INVALID` because the shared contract accepts at most 15 messages. The runtime now sends the newest 15; when a customer-reported session note exists, it sends that typed note and the newest 14. The current inbound remains last.

The existing conversation-state commit retains only explicit customer-reported budget, occasion and rejected product codes. The test starts with a previously retained 600k budget, work occasion and rejected SV9031, then receives a correction to 700k. The C3 request contains the corrected 700k as a PII-safe `700k` value, the prior occasion and rejected code; the committed state contains 700,000 VND. No shop fact or effect permission is derived from this note. The session fields are not written to the durable customer profile. Separate parser tests check correction, clearing, rejection and re-selection.

Verification: worker focused C3/realtime/sales tests **225/225**; worker TypeScript and conversation-engine TypeScript pass. Full worker `pnpm --filter @lana/worker test` passed **127 files / 1,784 tests**, with one opt-in Luna smoke test skipped. Its benchmark validation retained the frozen 70 DEV / 30 HOLDOUT split and dataset hash `9256db31a3155e642afe9f9dbaeef7cf7f5818c764dbdc5933cb31dff231f643` for DEV70.

Limits: parser recognizes explicit phrases only; it does not resolve an open question or infer an unstated preference. The test uses fake history/commit/model ports, not a live customer delivery. No fresh Luna DEV70 quality result is claimed.
