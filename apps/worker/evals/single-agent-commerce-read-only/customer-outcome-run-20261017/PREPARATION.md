# Preparation before the new model run

Intake `5a158cdf0e559c00e6c7cb69bd2180a03e306cd3`; refreshed main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. [Scope](SCOPE.md). No runtime/prompt/corpus/model/API change in this request. Existing [implementation verification](../customer-outcome-fix-20261017/IMPLEMENTATION.md) applies to unchanged runtime blobs: worker1,816/contracts223/Node491PASS+2existing optionalSKIP, build/typecheck/lint exit0; controlled COD25/25+bank25/25 at clean `332ce149`, zero generations, both DBs dropped. These are prior code checks, not rerun model results.

Current source-check rebuilt the worker through the existing runner, then read current PG/Redis/Qdrant/policy and the existing embedding/search probe. [Source readback](source-readback.json) PASS, hard precheck null, zero owner/verifier generations, one embedding call. [Complete selection readback](source-selection.json) PASS for AO/be/M×1 and AO/be/L×2; both PRE_ORDER. Sources are live per read and can change later; do not require a historical quote total or label this a paired experiment. No province-region map is supplied or published.

Config [preflight](config-preflight.json): 24 cases, Codex0.159.2 and current approved binary identity, zero generations. The initial direct local command did not inherit temporary source credentials and returned missing environment names; [retained output](local-env-preflight.json). Corrected by using the existing approved credential/source-session launcher, without changing config, substituting a provider or issuing any generation request.

Freeze current owner/verifier prompts, exact models/config/schema, terminal map/fallback, native declaration sets, both corpora/priority order and runner/source hashes in FROZEN_INPUTS before provider results. Commit the run scope and frozen inputs, require clean executable/config, then let existing runners capture current HEAD without self-referencing the frozen source. Stateful preflight at that clean head precedes generation. No new freeze gate/operator/runtime abstraction is introduced.

Commands actually run before freeze:

```text
git fetch origin main
node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --source-check --out C:/Users/nguye/AppData/Local/Temp/c3-customer-outcome-source-check-20261017
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --preflight
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node C:/Users/nguye/AppData/Local/Temp/c3-fact-locality-selection-20261017.mjs C:/Users/nguye/AppData/Local/Temp/c3-customer-outcome-selection-20261017.json
```

Use the existing owner-authorized [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md) and exact serving-credential launcher. Temporary credentials are removed on exit, secrets are not printed/committed, source PG is read-only, and only the existing isolated integration child receives the disposable-test admin route. No actual Meta/Pancake/POS delivery or employee notification. Source checkout is still blocked on address-region authority; old NONE cause and32KB signature limit remain. Provider results NOT_RUN at this savepoint.
