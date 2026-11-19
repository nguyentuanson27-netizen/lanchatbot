# Independent review — sales completion implementation

Implementation base: `6e97e231f9d299edf80546d2a04fe79a0c2c160c`. Final executable/mechanics source: `9fa7ea5d3dba865ddc7f824e2823194048e706a6`. Same independent reviewer task: `sales_completion_implementation_review`. No reviewer provider campaign, live source writes or deployment.

## Review → fix → approval

1. Partial S2: reviewer found typed SHOP_DATA_MISSING was not propagated to the legacy mandatory handoff signal for SIZE_REQUIRED. Observed negative test failed, propagation fixed; composed with/without-size controls assert silent handoff and no cart effect. Reviewer approved this subset.
2. S3: reviewer requested changes for explicit PRODUCT downgrade; two legacy converters stripping target; stripped component target when PRODUCT fit coexists; BOM expiry after verifier; parent/role-only history reused for a new component; and non-PRODUCT fit-scope bypass.
3. Follow-up review found marked PRODUCT engine-input mismatch, backward source expiry and explicit target-parent mismatch at schema/conversion. Fixes bind explicit engine decisions, claim IDs/hashes, independently resolved targets, source validity and exact schema parent. COMPONENT history remains disallowed without component authority; unmarked legacy PRODUCT behaviour preserved. Consumer dispositions are in the [manifest](c3-phase-c-component-fit-consumers-20261103.md).
4. S2/S4: exact componentRef/role factoring keeps parent/offer/source references separate and round-trips the original values. Owner paragraph replacements stay within task discipline; verifier changes are technical target clarification. Captured S15 replay is explicitly reconstructed rather than the missing historical second wire.
5. S5 diagnostic: reviewer required action-specific state/receipt checks and preview invalidation, beyond merely detecting any mutation. Fixed exact AO replacement, M/L addition, negotiation version/evidence advance, receipt kind, private-field invariance and no confirmation. No private-to-owner bypass or early-intake expansion was enabled.

**APPROVE engineering mechanics of the reviewed diff**, excluding source readiness, S5 public interruption, S6 checkout bridge and the full 34-case/55-turn campaign. Approval does not substitute for checks or quality grading.

## Final report/evidence accuracy review

Reviewer independently matched all 17 readiness artifact hashes to actual files; all 15 S5 rows to PostgreSQL integration evidence; clean executable source identity; provider0 and database cleanup; 53 points/51 approved registry rows; 22 matching/29 mismatching legacy pipeline byte checks plus two absent registry rows; all assets publicationEligible=false/proposedProof=null; full Vitest2607PASS and Node835PASS/2SKIP logs; and S15 raw65229/presented65406.

**APPROVE report/evidence accuracy**, with the documented exclusions. The report retains four failed canonical worker command attempts separately, does not call them PASS, does not claim full plan completion, and keeps source/S5/full campaign BLOCKED. Full general PostgreSQL matrix/seven invariants NOT_RUN for this change. No model quality/GO, source publication or deploy approval.

A reviewer turn briefly failed with workspace credit exhaustion before completing review; a later follow-up returned the approvals recorded above. No approval is attributed to the failed turn.
