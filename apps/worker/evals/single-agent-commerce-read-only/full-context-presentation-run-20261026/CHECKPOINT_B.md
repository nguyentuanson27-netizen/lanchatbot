# Whole-context presentation — completed, no overall positive signal

**17 controls +16 paired outcomes complete; B NOT GO.** One localized usefulness improvement; no clear improvement across the three concern pairs. Stop this experiment without promoting the renderer or running full B.

Base `5e75d9ee`; exact clean run source `0fd1893d8ce4768c791a2015745e38c00f735822`. Same reviewer approved plan and executable on this source; independently10focused tests PASS. Source/worktree unchanged during registered generation. [Plan](../../../../../docs/specs/c3-phase-b-full-context-presentation-experiment-20261026.md), [input preview](INPUT_PREVIEW.md), [exact identity/config](REGISTRATION.json), [actual commands](COMMANDS.json).

## What was tested

Eight unchanged frozen inputs from historical source `468d85ea6577c428cf2f6f155c9774926537364b`; payload hash `7c5d962a6fccc9cbc82cfe5e17a35d629a3df50c10bf4f8093e68eea97557458`. A and B were both newly generated, N1 per arm/case. Old outputs were not adopted as baseline.

- A: current compact JSON owner view with completed tool data after the latest message, normalized forced-final mode.
- B: all owner data split into Vietnamese-labelled, pretty-printed JSON blocks: products, verified facts, policy, state, receipts, subjects, execution and time. Completed tool trace moved before the original conversation; exact customer latest remains last. All fields/values/types and array order preserved. OpeningQuote retained in both arms.

Prompt/model/config, shop data, customer history/text, canonical verifier context and gates unchanged. No invented benefit, case-specific example, rubric or correct-answer hint entered the requests. This tests formatting plus ordering together; it does not isolate individual heading/position effects. It does not test native tool choice, persisted state, actual handoff/delivery or current freshness. All outcomes are **captured-world final-reply diagnostics**, with each original snapshot and historical clock.

## Blind whole-turn findings

Same reviewer read only paired terminal texts and common source, without mapping/attempts/registration. [Frozen review](BLIND_REVIEW_RESULT.md) SHA256 `2e092f6f9816a543b982ed28d6d2e6ee6b4d3bcd29c8013070896e0002da81f4` verified before unmasking. [Sixteen exact replies](CONVERSATIONS_XY.md), [mapping](UNMASKED_MAPPING.json).

| Pair / case | Frozen blind result | Result after unmasking |
| --- | --- | --- |
|1 concern-v2: usually plain clothes, worried the set is too decorative | NEITHER | B immediately denies the concern; A acknowledges it better but then repeats reassuring adjectives. Neither clearly resolves the need and usefulness. |
|2 price by product code | TIE | Both keep799k, components/materials/form and S/M/L/XL. |
|3 complete-set price | TIE | Same essential quote, no meaningful benefit or loss. |
|4 concern: too much lace at daytime event | NEITHER | Both use soft fabric/drape to reassure instead of giving useful styling advice. B adds a size-preparation next step beyond this read-only probe's capability. This is not a fabricated completed effect or fit claim. |
|5 concern-v3: separate top versus whole set, existing black skirt | TIE | A recommends499k top, B799k set. Both give defensible wardrobe/repeated-use reasons. Higher-priced upsell is not automatically a failure; neither is clearly better overall. |
|6 repeat referent, asking full-set price | TIE | Both answer correctly with necessary form data. |
|7 current exchange window and fee versus old history | TIE | Both use15days/30k rather than old7days. |
|8 changed occasion: evening party→morning customer meeting | X=B wins | Both switch to separate top. B also suggests tailored trousers/structured skirt, giving a practical way to look simpler. A relies more on abstract adjectives. |

Totals: B clear wins1/8, ties5/8, neither2/8; no clear A overall wins. Three concern pairs have **0 clear B wins**, below preregistered>=2/3. Pair5 remains a valid sales-route tie, not a failure for preferring a more expensive set. Partial advantages in understanding or a short closing sentence are not promoted to wins after unmasking.

**Decision: no overall positive signal.** The presentation can help one practical outfit recommendation in this sample, but it does not resolve the repeated reassurance/adjective pattern in the concern cases. Lossless data formatting alone has not shown the required improvement. That does not establish model priors, prompt content or missing shop data as the unique root cause, and does not show all possible context representations would fail.

No change to the default runtime or prompt follows this experiment; renderer remains opt-in/evaluation-only. No automatic prompt patch, rerun, corpus/rubric change, full B or GO. Future advice work requires a separate hypothesis and qualification; N1 is not stability evidence. Old form-only negative result remains unchanged.

## Operational results

[Operational totals/raw artifact hashes](OPERATIONAL.json), [per-arm usage](ARM_USAGE.json), [controls](CONTROLS.json). Raw evidence: `C:/Users/nguye/Documents/Sản phẩm AI/c3-b-full-context-presentation-model-20261026`.

- Complete denominator33outcomes:17fresh controls +16paired owner outcomes. Actual49/max49 generation requests:17control verifiers +16owners +16diagnostic verifiers. Every generation has1provider request; retry0.0errors/timeouts,0missing outcomes. No old error excluded or regenerated.
- Controls PASS:8unsafe FALLBACK,8safe SEND_ELIGIBLE,1unlabelled probe SEND_ELIGIBLE. This is scoped controls evidence, not full A2. All16drafts survived hard precheck, got mandatory verifier and historical SEND_ELIGIBLE. Fallback/handoff/no-send0/16. Eligibility is not sales-quality PASS or current permission to send.
-16/16 actual owner request hashes match;33/33 actual forwarded verifier bodies match logged/frozen requests.49wire captures,0 evaluator/secret-key or caseId-string matches. Mock HTTP tests also prove injected evaluator labels stay out. These are bounded captured-wire checks, not universal privacy or semantic guarantees.
- Owner Vertex `gemini-3.5-flash-lite`, version same, HIGH/global; verifier `gpt-6.1-sol`, version same, high through existing Codex-login bounded relay. Config unchanged: owner8192maxoutput/text/plain/candidateCount1/thinkingHIGH; temperatures/topP omitted; both retry0/90s. Exact config/hashes in REGISTRATION. Owner prompt `71292eea99022f78c3ba5264eb4de6c8394dd2f345eb80bacb10a933c4e8e8db`; verifier `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`.
- Total298,677input/25,808output tokens.22,908 combined thinking/reasoning already included:21,114Gemini +1,794verifier (1,023controls/771diagnostic). Cost not exposed, null.
- Owner input A41,827/B50,066: B **+19.7%**. Owner output A11,790/B10,574 includes thinking A11,152/B9,962; do not equate output-token decrease with better customer text. Aggregate owner wire bytes A198,910/B235,886. Individual wires all below65,536.
- Total slot median elapsed A17.274s/B18.571s; different N1 stochastic outputs and sequential order prevent attributing latency changes solely to format. Verifier telemetry p50/p95 over33samples12.237s/26.795s. Added verification duration over16paired outcomes12.241s/26.796s. No live SLA claim.

## Checks actually run

- RED observed missing renderer module, followed by minimum implementation GREEN. Full lossless reconstruction independently checks every original owner-view field/type and array order, not only generated labels. Fenced/instruction-like data stays exact; unknown presentation rejected; captured HTTP equals constructed request and hides evaluator wrappers.
- `node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"`:200PASS,0FAIL. Focused renderer/quote/Gemini suite78PASS before final fourth test added; final full200 includes it.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts`:75PASS.
- `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts`:21PASS.
- `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit` and `pnpm --filter @lana/worker lint`:both exit0. Python driver AST/diff check PASS. No shared package or worker TypeScript source changed; no new worker build/DB/native/full semantic-A2 suite is claimed for this pure evaluation renderer.
- Same reviewer independently10focused tests PASS and APPROVE clean exact0fd1893d before provider. Serialized input previews/preflight completed with0provider calls.
- Committed DISPATCH_DRIVER.py command with the external raw directory above:exit0. Ordered offline preflight→fresh source capture→controls preflight→17controls→diagnostic preflight→16slots, six child commands all exit0. Original chat interruption did not cause replay/retry; the same background process completed and retained all outcomes.

Structural delta: one bounded lossless evaluation serializer/opt-in flag, one fixed experiment runner/driver and tests;0production entrypoint changes,0new semantic roles,0model calls beyond preregistered slots,0production regex/template patches or repair loops. No source-store writes, merge, deployment or live send. Final evidence review is recorded separately; do not infer final report approval from executable approval.

Final evidence/report review completed: **same reviewer APPROVE, no remaining finding** after raw/hash/mapping/counts/usage/command checks. [Review trail](INDEPENDENT_REVIEW.md). Approval supports the scoped STOP/no-positive conclusion, not B GO.
