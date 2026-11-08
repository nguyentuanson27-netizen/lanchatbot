# Independent review — tool contract completion plan, revision 2

**REQUEST_CHANGES.** Reviewer: `/root/post_contract_plan_review`. Reviewed entire plan against clean executable base `076d39694d2c068283b28d76a9550d2cb8eaedbb`; exact plan SHA256 `1ad663dea8849a68fd3ae1e701db3478e3387698916ae64d177c9e67a5a3679f`. Review is plan-only, not implementation approval.

R2 closes the prior blockers concerning quote targets in multiple-ref contexts, pre-cart vs concession totals, retained customer selection, known no-commit proof and source/native evidence. Two narrow amendments remain; no new framework or broad refactor is needed.

## R2-F1 — P1: VIEW observation is not an outbound image constraint

Plan lines85/87 group explicit select/view queries as restrictions which a generic opening photo cannot replace after failure. The actual interface says view/select are independent and a view failure does not establish missing deliverable media (`gemini-inference.mjs:113`). Successful VIEW returns `use:APPEARANCE_ONLY` and does not populate outbound selections (`single-agent-commerce-media.ts:158`).

A failed internal view of a beige photo followed by a quote-only generic photo requirement must not be treated as an explicit request to send beige photos. Otherwise the proposed gate recreates incidental-read→handoff through a new route, despite valid generic media. This is a definite contract conflation in the plan; no native regression is claimed observed because the code is not implemented.

**Required revision:** distinguish observation provenance by operation. VIEW only bounds visual reasoning; no positive visual claim comes from a failed view, and no hidden retry is allowed. It does not itself create, widen or prohibit outbound photo obligations. SELECT and physical-cart constraints still control outbound images, including no generic substitute after failed explicit colour/type selection. If the actual customer task needs unavailable visual information, owner still requests silent handoff; code must not infer that relevance from the existence of a view call.

**Acceptance:** failed VIEW/be + valid generic quote photo does not fail solely due to VIEW; failed SELECT/be cannot be substituted; view success never implicitly sends; revoked source/hash/permission still blocks; normal caps and actual-media evidence retained.

## R2-F2 — P2: close the sibling allowlist; size advice may write without ops

Plan line48 says “read-only calls currently supported” but explicitly excludes only recommend_size with ops. `recommend_size` without ops can call `rememberTargets` and CAS when retained advice is active (`single-agent-commerce-state.ts:388–393`,473–475). It cannot safely be assumed read-only. Current quote whitelist (`single-agent-commerce-quote.ts:18`) does not include it. This is an implementation ambiguity, not a claim that R2 executable code already admits it.

**Required revision:** explicitly freeze quote siblings to quote_product, read_product without customerSelected, read_policy, select_product_media and view_product_media. Only the already-listed single first writer is added. Exclude all recommend_size, quote_cart, search and unknown capabilities from this newly opened quote path; retain all their existing non-quote behavior.

**Acceptance:** quote+recommend_size without ops is rejected before any writer/CAS, like the ops variant; keep non-quote P07 patch coalescing and retained-target tests green; unknown/new capability cannot become read-only implicitly.

## Checks and remaining uncertainty

Read AGENTS/governance, complete R2 plan, latest34/55 report and targeted native/quote/media/state/effect code. Verified exact base/hash and read numbered source lines. Reused prior read-only opening-gate probe; R2 addresses that issue with explicit quote-target proofs. No provider/model/PG/broad tests, code/prompt/corpus changes, git mutations or live actions. Only these two review files were written as authorized.

Provider endpoint support for the new schema branches remains an implementation precondition, not a fact proved by this review. Owner semantic performance and network reliability remain unknown. Existing feedback test approval does not establish customer-wearing provenance.

After the two amendments, re-review the exact new plan hash; do not treat this verdict as permission to implement or run providers.
