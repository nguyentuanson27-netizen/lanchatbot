# Commands actually run

Approved existing Vertex credential route was supplied only in the process. Its file contents and path are not retained in this report. `source-session.py` reused the established SSH route, kept PostgreSQL reads transaction-read-only, and did not pass a test/admin database route to the provider run.

```powershell
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
# 33/33 PASS before the source seal

py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json
# CONFIG_READY_CONNECTIONS_UNVERIFIED, cases24, generations0, Codex CLI0.159.2

py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json --out C:/Users/nguye/Documents/Sản phẩm AI/c3-b1-24-sourcecheck-fec9c51c
# PASS, generations0, sourceSha fec9c51c...

py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json --out C:/Users/nguye/Documents/Sản phẩm AI/c3-b1-24-run-fec9c51c
# 24/24 recorded, AWAITING_WHOLE_REPLY_REVIEW, sendEnabled=false
```

The first local preflight wrapper invocation omitted `C3_VERTEX_CREDENTIAL_FILE` and stopped before the source bridge/provider with `C3_VERTEX_CREDENTIAL_FILE_MISSING`. The approved existing route was then supplied; this was not a provider attempt, retry, model substitution or generated result.

Post-run offline commands parsed all24attempt files and80captured request/result pairs, sealed raw commit `6110fb7f`, wrote primary review commit `2d893499`, then generated conversations/metrics/audit and ran JSON/count/binding/firewall/secret/diff checks. No provider generation was made after the single batch.
