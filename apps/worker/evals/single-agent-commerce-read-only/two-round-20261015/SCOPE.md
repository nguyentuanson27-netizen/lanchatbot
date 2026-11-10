# Two owner-authorized B1 correction rounds — 2026-10-15

Owner: “fix và chạy lại đi, thực hiện 2 vòng”. Start at bf586d5669f0c5d9459123b02ae14c40d35ab95b on the existing Phase B branch/PR391. Refreshed origin/main and implementationBaseSha remain 296cdcfbf5759f5bf9cbb24acf3dc63005589361.

## Changes and boundaries

1. Reuse the static product document already returned by search: return its verified attributes/source content to the owner and the same evidence to the verifier. No inferred opacity, fit, price or stock; no hidden read/generation or larger budget. Current readback covers this newly used source evidence.
2. read_policy explicitly supplies shop rules with orderEligibility=null: no order was read or approved. Distinguish the rules from the customer's established situation; answer the known timeframe/fee and clarify only unresolved decision-relevant conditions. Keep current policy dynamic, without hardcoded shop values/checklists or an exchange eligibility engine.
3. Keep raw per-field source statuses/reasons in evaluator-side tool accounting. Owner function responses expose the statuses without internal price/stock reason codes; unavailable data establishes no operational cause. Preserve independently sourced product information.
4. Replace the corresponding owner guidance; no case-specific examples or production templates. Keep verifier prompt/schema/config, models, fallback, mechanical authority/state/effect/privacy/final gates unchanged.

Observed RED before minimal GREEN; focused regressions, full worker test, worker typecheck/build/lint and self-review. No shared-package or production entrypoint change, live write/send, B2/B3 repeat, Phase C, parser/regex/router, extra model, repair/reverify or automatic generation retry.

## Exactly two bounded rounds

Same eight case objects/history/messages/evaluator expectations/source modes as the previous run; order only: changed occasion, current policy, partial source, then the five remaining cases. N1 per case per round, max32generations/round, max64 across both. No extra provider probes/repetitions. Round2 may contain a justified minimal fix after reviewing round1; freeze its exact source again. If round1 succeeds, round2 repeats the same treatment as a new registered run. All attempts/errors/fallbacks retained; no majority/best-of/adoption.

Each round registers all eight slots. Explicit dispatch ranges1:3 then4:8 permit human whole-terminal triage of the three prior failures before spending on the rest, without a new progress store or automatic judge. Five remaining slots stay NOT_RUN unless all three prefix outcomes are safe, send-eligible and useful for the actual questions. A confirmed unsafe eligible reply stops the current round; round2 may start only after review/fix. No automatic third round.

Complete executable/config/prompt/cases -> commit/clean -> runtime bRunSourceSha -> preflight/source readback -> prefix three -> seal external raw hashes before triage -> conditional remaining five at the same unchanged source -> commit raw -> full primary whole-terminal review -> rejected-draft diagnosis/report. Prefix triage is retained separately from final subjective scoring; it does not discard an attempt. Evidence remains external until dispatch ends to preserve the sealed HEAD. Each segment records the complete registration and its exact dispatch range; aggregate only disjoint ranges with identical source/config/input/prompt/schema identity.

Use existing Vertex gemini-3.5-flash-lite/high and Codex-login gpt-6.1-sol/high, one generation request per invocation/retry0. Record real source values, captured-request label firewall, bindings, tokens/cost/latency, terminal outcomes and source/tool/request counts. Human ratings remain null absent human scoring. Source or credentials unavailable means BLOCKED, without substitute/simulation.

Preserve all earlier A/B evidence and OWNER_BYPASS. Update tasks and the existing draft PR391; stop after the two rounds and report limitations, without declaring sales readiness from these small samples.
