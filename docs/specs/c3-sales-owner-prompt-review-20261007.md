# Sales-owner prompt revision for review — 2026-10-07

**Status:** Candidate prompt saved for owner review before rerun. Not active in any manifest or runtime. Checkpoint A remains STOP; no provider generation performed for this revision.

Owner request: “Prompt tư vấn bán hàng đơn giản quá, tham khảo C3 (2 model), rút kinh nghiệm và thực hiện thay đổi, gửi tôi bản chỉnh sửa trc khi chạy lại”. This authorizes preparing the revised prompt, with provider execution held until after owner review. It does not authorize post-A work.

Candidate: [fashion-sales-owner-review-20261007.vi.txt](../../apps/worker/evals/single-agent-semantic-verifier/prompts/fashion-sales-owner-review-20261007.vi.txt). The file contains only model instructions, without evaluator case IDs, scores, reference replies or experiment annotations. It is not loaded by existing runners; review and acceptance of this candidate do not retroactively change frozen inputs/results.

Owner follow-up: “đã tối ưu cách viết cho agent chưa, tôi thấy đang là 1 đoạn văn xuôi”. The first review draft at `e8ec1b13a0ab069f9c599b5e585b265be8e99b7a` expanded responsibilities but left them in long paragraphs. The current draft uses eight labeled sections, individual rules and explicit conflict priorities. Product truth/permission/privacy precede the customer need, useful sales progress and tone; sufficient verified facts still call for confident advice. Input authority, conversational strategy, fact-scope constraints and output/action restrictions are separate. These are instructions for the owner, not mandatory stages or sections of the customer reply. Reduced duplicated prose without adding a role, router, response schema or self-review loop. Formatting and prioritization are design changes, not evidence of improved model performance.

## Sources and lessons

- [Parent spec §1.1](c3-single-agent-commerce-architecture-20261004.md#11-owner-approved-fashion-sales-product-direction-2026-10-06): help choose and buy shop products, complete product data, confident grounded advice, natural language and feasible progress.
- [Semantic-verifier amendment](c3-semantic-verifier-boundary-amendment-20261005.md): one conversational owner, at most one protected-language verifier, code authority and exact final customer-text surface.
- [Actual C3 two-pass prompts](../../apps/worker/src/track-c-c3-two-pass-candidate.ts): currentNeed / mustResolve / conversationRead / nextMove / avoid made conversational responsibilities explicit. The new owner performs those responsibilities within its own generation, without emitting a plan or adding another role.
- [Actual C3 sales-quality prompt](../../apps/worker/src/track-c-c3-sales-quality-candidate.ts): full dialogue, answer explicit needs, preserve address terms, avoid repeated questions, resolve objections and stop discovery after purchase commitment. Its canonical JSON segments, first-matching wording rules and compulsory-style bridging are not imported.
- [C3 strategy contract](track-c-c3-strategy-contract.md#2-follow-up-adaptive-sales-strategy): current decision and actual blocker first, smallest relevant evidence, useful missing input, no fixed funnel, missing evidence is not negative evidence. This document is a design source, not evidence that its full proposed contract is implemented or successful.
- [Round5 individual review](../../apps/worker/evals/single-agent-semantic-verifier/round-5/one-pass/A3_CODEX_REVIEW.md): every actual reply/history was previously reviewed; 10/20 quality PASS, nine naturalness failures, weak price-objection resolution and one unsupported checkout request. These are diagnostic observations, not prompt examples or instructions tied to individual evaluation cases.

## Changes and intended behavior

| Observed weakness | Prompt responsibility added or clarified |
| --- | --- |
| Correct facts without sufficiently useful selling advice | Select a concrete shop option, explain its relevance to the buyer's priorities and resolve the actual obstacle. |
| Price objection answered with specifications or vague value language | Distinguish budget, value, actual use and selection risk; choose relevant available evidence or a better budget option. No compulsory policy pitch or competitor speculation. |
| Long catalog answers and unnecessary repeat explanations | Include each detail for a current customer need or decision; keep correction/lookup replies proportional to the request. |
| Defensive voice despite sufficient facts | State the recommendation clearly; retain material conditions without adding generic doubt or redundant warnings. |
| Buying intent treated as checkout permission | Acknowledge the choice; no contact/payment collection or invented workflow in this consultation-only turn. |
| Mechanical closing questions | Ask only for missing information that changes the recommendation; a complete answer or defer can end naturally. |

There are no fixed reply templates, product-specific branches, copied reference answers, word blacklist, rigid sentence count or additional semantic state. Recommendations remain constrained by code-bound SIZE_FIT, variant-specific facts, quote scope and material policy conditions.

## Code and activation boundary

Existing `protocol.mjs` supplies the bounded runtime projection: recent accepted dialogue, latest message, retrieved text and allowlisted trusted facts/profiles/policies/state/receipts. The owner selects relevant information inside that projection; this revision adds no retrieval, context router or evidence selector. Product-data completeness remains a preparation responsibility and is not solved by prompt text.

The verifier prompt/schema/provider adapter and deterministic boundary are unchanged. A surviving draft still requires the semantic verifier followed by the deterministic final gate; a confident tone never creates authority. No prompt/runtime wiring, new provider request, retry, repair, durable state, mutation or live send is part of this change.

When an actual new round is authorized, copy the accepted prompt into new frozen inputs with its hash, preregister the population/configuration and source identity, and follow the existing readiness → A2 → A3 sequence. Never edit historical manifests to activate the new prompt. The user's latest execution preference remains one attempt per case; this revision does not start or register a new run.

## Verification and limits

Local checks actually performed:

- `node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-5.test.mjs`: 16/16 PASS, including existing captured-stub request firewall tests; no real provider generation.
- One-off local `node` stdin check repeated for the structured revision: read the candidate and the unchanged Round5 one-pass manifest/corpus, replace only `prompts.conversation` in memory, then call existing `projectRuntime` and `buildRequest` for all20 A3 cases. 20/20 envelopes within current bounds; maximum serialized request25,458 UTF-8 bytes /32,768. This is a request-envelope check, not a provider result or semantic-quality evaluation.
- Before/after SHA-256 inventory of all82 tracked JSON/Markdown evaluation artifacts: identical aggregate `1caa39840397b22444c38ae23f49f1c696f14e65cde9a7fbbfcb0689772b4d55`. Frozen prompts, manifests, corpora, evidence and historical reviews are byte-identical.
- `git diff --check`: PASS. Self-review limited to the new prompt/rationale and plan/todo additions; no executable change.

Candidate UTF-8 bytes including final newline:9,797 (first prose draft10,308). Current candidate SHA-256: `8ee7e0cdd712ad8dcfefb0649726ba3a229b654d3e56df30e3ba11af95a74f43`. This identifies the review draft, not a frozen provider run. Focused tests16/16PASS and diff checkPASS were repeated after restructuring. Provider generations for this revision:0; roles/layers/executable lines added:0. Worker typecheck/build/lint were not rerun for these inactive text/document edits; previous run results are not transferred to a new round.

No conversational-quality improvement or Checkpoint A PASS is claimed before execution and assessment. This is a prompt hypothesis; it cannot establish provider reliability, conversion, complete product data or real checkout capability. Recommendation remains STOP pending owner review; no rerun started.

## Owner-approved confidence and short policy replies after Round8 Gemini

The owner approves confident recommendations from code-confirmed size results, relevant sales reasoning within supplied evidence, and whole-conversation interpretation of policy conditions. The owner explicitly accepts “đổi trong 7 ngày” as seven days from receipt without listing all conditions unless asked or relevant to the customer's situation. This approval supersedes requiring the explicit time-origin phrase in every short exchange-policy reply; it does not change the recorded Round8 provider verdicts or terminal outcomes.

Prepared on existing implementation branch at HEAD `48ada90e3d540191a8da8da05440515a669cf5c3`; refreshed `origin/main` remains `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. The earlier frozen runs and their implementationBaseSha are unchanged.

| Inactive preparation asset | Purpose | SHA-256 |
| --- | --- | --- |
| [Owner prompt](../../apps/worker/evals/single-agent-semantic-verifier/prompts/fashion-sales-owner-confidence-review-20261007.vi.txt) | Keep the reviewed natural voice; make code-grounded size recommendations confident, constrain added benefits to available evidence, and allow relevant concise policy replies. | `7a7802579ecc731d33e30e5935d0ade209811e87256fc708e51c22d48786dabc` |
| [Verifier prompt](../../apps/worker/evals/single-agent-semantic-verifier/prompts/semantic-verifier-sales-confidence-review-20261007.vi.txt) | Judge meaning in the full conversation; confidence and approved shorthand alone are not violations. Keep actual unsupported benefits, contradictory eligibility and receipt failures blocked. | `f4ee27c7b97deaa0954b1c60fce3f3455eddb1bf027fad1fe7b19c1c563ddf2d` |
| [Context preparation](../../apps/worker/evals/single-agent-semantic-verifier/prompts/sales-confidence-context-review-20261007.json) | Shop-confirmed exchange shorthand plus explicit scope/unknowns of existing authored product data. No new benefit, measurement or eligibility is invented. | `fcc01e5024249864836960b5f3e811a0f92eab241880abbb7fa7c509a548ba42` |

The context JSON is an authored synthetic evaluation preparation asset, not real shop data or a new runtime schema. A later freeze copies the text into existing `policyLiterals.text` / `productProfiles.details.limitations`, records the new source version, computes profile content hashes and binds the resulting trusted snapshot. Existing `projectRuntime` carries these allowlisted fields to both roles. Protected claims, their provenance and exact SIZE_FIT/customer binding are retained. No new selector, state field, parser, prompt-example corpus, role or provider framework is needed. The prompt and the product facts/limits work together; a prompt does not fill missing measurements or manufacture proof of all-day comfort/durability.

Local verification actually performed:

```powershell
$env:C3_CHECKPOINT_A_ROUND='8-gemini'
node --test apps/worker/evals/single-agent-semantic-verifier/sales-confidence-review.test.mjs apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-8-gemini.test.mjs
```

14/14 PASS, zero skips. New checks prepare all24 histories locally, retain every protected claim/provenance and verify existing hardPrecheck accepts the clarified context, then capture both request envelopes with evaluator/private annotations excluded. All48 requests fit the32,768-byte bound even with a4,096-byte verifier draft; one-off Node envelope readback measures maxima27,382 bytes owner /26,226 verifier. A one-off Node/Git byte comparison confirms all169 previously tracked evaluation files (28,274,944 bytes) identical to preparation HEAD. Candidate sizes: owner10,841bytes, verifier4,878bytes, context1,888bytes. These are structural checks, not semantic model judgments; no semantic RED→GREEN or model-quality result is claimed. No worker/shared executable or API implementation changed, so worker typecheck/build/lint were not rerun for this preparation. Formatting verification is recorded in tasks/todo.md.

Provider generations0, new attempts0, new run/source seal0; no manifest/runner selects these assets. This instruction authorizes prompt/context preparation, and no provider rerun was requested in it. Models, one-attempt preference,10% terminal-failure bar, mandatory verifier/final gate and static fallback remain unchanged. Before a later authorized run, review A2 labels/conditions against the approved contract before freezing, preserve the exact7 PR387 attacks and all previous observations, seal new inputs/source and rerun A2 before A3. A result-driven relabel, a repair loop or a repeat attempt is not a remedy. Gemini's recorded incomplete-response issue remains outside this prompt preparation. Checkpoint A remains STOP with historical evidence intact.

## Policy-scope v2 correction and authorized next run

After Round9 owner requests “sửa đi” and then a new round. New separate policy-scope-v2 owner/verifier/context assets distinguish policy introductions from affirming eligibility. Missing evidence of a violation is not proof of eligibility; dissatisfaction alone does not establish an entitlement limited by time/item condition. Established conditions need not repeat. Code-grounded size confidence, natural voice and seven-day receipt-origin shorthand remain unchanged. This is a semantic scope rule, not keywords/templates or a requirement to enumerate every policy. Round9 original outputs/labels/STOP stay intact. Round10 preregisters the v2 assets; local protocol checks cannot prove the corrected model behavior. No extra runtime schema/gate/role or production wiring.

Round10 actual evidence: v2verifierhash5b0ab151194117f3266d1c89022b2b522dd75acbe57be058d795d25ddb38c6bd; owner0cf3d3ee0d4120dec5421501ee1ecfcb0e0e65cf4ebb9fb8cb91f18e020cfe92; contextf31c4fcf74fea14ddfd65e8c0f089bff8ab6bf848c99e48be953e6396292ab93. A2sourcef311a570efcd27efd6df86b1c7ebe4705cf154af: PASS66/66,48unsafe blocked/18safe eligible,zero observed send-eligible false PASS on frozen A2population/configuration. A3source7572909d4f5730c9faaf9fecc96d2c88c5f933e9: all24executed,19eligible/5fallback; primary whole-conversation assessment14PASS/10FAIL, recommendationSTOP. Concrete wearer guarantees still exceed profile test evidence; qualified size confidence and short policy canPASS. No result-driven patch/extra generation. See round-10/CHECKPOINT_A.md, all conversations/reviews and separate candidate failure diagnosis. Reviewer is primary offline, not independent/human/owner quality acceptance.
