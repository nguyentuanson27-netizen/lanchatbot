# Phase B — owner-approved same-name size sharing

Owner decision 2026-10-24: **“dùng chung nếu có cùng tên”**, answering the explicit question about SV2447 “Set váy Thạch Thảo”, SQ2447 “Set quần Thạch Thảo” and the missing SV2447 chart.

This authorizes chart applicability for these same-name products in the candidate. It does not merge prices, stock, offers, media or effect subjects. The configured group is data in `source-config.b1.json`, not a prompt rule, inferred title parser or benchmark exception. New groups require explicit membership/source mapping. The shortened customer name “set Thạch Thảo” resolves only when a unique loaded product has its registered ID and full source title. Multiple candidates remain ambiguous.

## Source and delegation

Fresh read-only audit: `c3-acceptance-chart-audit-20261024.json` outside the repository workspace root; no generation, embeddings or source writes. Both catalog titles and IDs above exist. Published policy contains seven charts and no direct SV2447 chart. The approved BODY chart is:

- Artifact `size-chart:SQ2447`; chart `image_registry:42e42d5a-c407-5927-af69-0fe8ab21a8e4:SQ2447`.
- Version `size-chart-v1.0.0-1395f0b5e842`, content SHA256 `6af482330db999b995608d26965fdb8eea8107f2197c3b0f337f7a7a938555f7`.
- Brand `La.na Design`, category `SET`, component role `OTHER`; source scope includes SQ2447. BODY, VERIFIED, published.

`commerceSizeSource` keeps the chart/reference immutable and delegates applicability to the registered group members. It verifies the configured source chart itself, publication, policy integrity/freshness, BODY basis, brand/category/role and original source scope. Another eligible chart cannot authorize an unrelated configured chart. The requested product remains the recommendation/claim subject. Existing profile fingerprints and source readback still invalidate changed recommendations. Missing body inputs remain missing: this decision does not authorize size guessing or a fit claim from height/weight alone when the chart needs other fields.

The delegation stays inside code. The existing `recommend_size` tool consumes the chart and returns the fit decision or missing inputs; both models use the resulting subject-bound SIZE_FIT claim. They do not need to authorize the group or independently calculate fit from a duplicated chart. Existing original-source chart projections remain unchanged. This is an authority change with explicit owner provenance, not a new model role or a change to owner/verifier prompts, protected-language semantics or scoring.

Initial zero-generation preflight on579917c1 failed VERIFIER_INPUT_BOUND: newly projected mapping624bytes and delegated chart1996bytes exceeded the frozen32768-byte verifier envelope for scoped controls. Preserve that failure; do not enlarge the bound or truncate source facts. Removing only these newly introduced, code-internal projections restores the existing surface while retaining chart delegation and its recommendation provenance. Observed RED→GREEN consumer test verifies the mapping/chart are not appended to model context, while the same chart still yields a requested-member SIZE_FIT and changed chart evidence revokes it. This is not a reduction of pre-existing advice facts or an edit to frozen historical inputs.

## Acceptance for this decision

Approved member gets the original chart with its provenance; unmatched IDs/titles, ambiguous groups, invalid chart/policy/basis/scope do not borrow it. Prices, stock, images and cart component identities remain per product. Shortened-name recovery sends only verified selected assets for the uniquely resolved requested product. Real model outcomes are reported separately from deterministic checks; chart availability does not prove successful sales advice.
