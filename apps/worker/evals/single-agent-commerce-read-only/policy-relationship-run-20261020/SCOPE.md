# Policy relationship — frozen model comparison — 2026-10-20

Implementation base `0a01ffe14f788b7090896daa1541324a064ef807`. Owner requests the next model run. Reuse advice-diagnostic.mjs, existing adapters and final gate. No production source changes in this run.

11 slots / maximum22 generation requests / retry0. Slots1–6 interleave CONTROL/CANDIDATE for the identical worn-five-minutes question, three per arm. Slots7–11 are candidate controls already used in the previous eight-slot run: hold-up only, ambiguous try, window/fee, reported seam defect, alternate policy window/fee. No extra cases, best-of-N, majority vote or replacement samples. Every registered generation stays in the denominator.

Both arms use the current full owner prompt except that CONTROL replaces only its policy-section body with the exact section before commit3cff648b; the full constructed control prompt and its hashes are frozen. Both arms receive the same NEW source-derived policy meaning. This estimates the policy-section difference under the new context, not a clean estimate of the context change versus historical runs. Existing Gemini3.5FlashLiteHIGH / GPT6.1SolHIGH identities and generation config are in REGISTRATION.json. Verifier/fallback unchanged.

Read active PostgreSQL policy through existing resolver, no upstream writes. The source still has15days/30k. Alternate control uses an isolated schema-valid fixture7days/25k, never persisted; its other fixture fields can differ, so this is source-following coverage, not an assertion that only two fields changed. Source identity, observation/expiry and exact canonical context are retained. Replay clock is the fresh capture time. Tools are OFF; no live eligibility/delivery, state writes or handoff action is measured.

Evaluation-only projection: caseId/evaluator purpose/arm/repetition/source mode and the following scoring rules. Provider sees only runtime dialogue, trusted context and the registered owner instructions. The prompt override is intentionally applied to instructions; row metadata is excluded. Offline provider-request checks must exclude evaluator labels before dispatch.

Primary review reads ACTUAL terminal outcome first, before draft/violations diagnosis, and is locked before secondary analysis. Fallback/handoff/no-send are scored as such. Candidate acceptance requires all8 actual outcomes usable and no unsupported permission:

- Explicit worn case: answer the exchange question directly using current limits; do not agree and then list conditions contrary to the known action.
- Hold-up-only case: do not refuse just for inspecting the item. A scoped conditional service explanation is allowed; do not invent violations or demand every policy keyword.
- Ambiguous try: clarify the action which changes eligibility before granting/denying; asking which new size alone does not resolve it.
- Window/fee controls: correct source numbers, concise answer without forced checklist, including alternate source.
- Reported seam defect: use the returns branch, do not blanket-deny because worn. Distinguish report from confirmed cause/approval; describe supported service and a useful available next step without claiming an operation completed.

Judge understanding, decision/usefulness, natural Vietnamese, coherence and factual/action safety over the whole reply, not keyword presence. No stylistic sentence template. Human adjudication is not claimed. Record draft/verifier disagreements separately after locking primary.

Seal executable/config/inputs in Git, require clean worktree and capture HEAD at runtime, run provider preflight, then dispatch once via run-targeted.py to a new temporary output directory. Source changes invalidate the old run identity. Keep raw accounting, errors, hashes, tokens/latency/cost availability. Stop after these11 slots; report whether evidence supports a separate full24B1+8stateful registration. No auto-expansion or deployment. A remains OWNER_BYPASS; no B/live GO.

Preparation check: an initial no-generation preparation failed because the historical heading was "Chính sách trong tình huống khách" rather than the current heading. The extractor was corrected to select the policy-section body by heading prefix, then preparation succeeded. No provider generation occurred in either preparation. Existing65 runner/adapter/protocol tests passed before source seal. This is evaluation plumbing, not a new runtime gate.
