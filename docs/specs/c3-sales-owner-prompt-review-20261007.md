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
