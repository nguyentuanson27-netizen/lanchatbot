# PR377 semantic conservation: owning-layer follow-up

This follow-up repairs the contracts and boundaries exposed by DEV70 on
`626db43679b83424b646eb48ef2646174f509f0d`. It does not retune replies to DEV case
strings or add an online correction/reviewer model.

## Source and evaluation boundary

- PR377 remains DRAFT; base `7c1f10f2a27db2b6258581f21955d1bc62681821`.
- Remote head was read back as `626db43679b83424b646eb48ef2646174f509f0d`
  before implementation and again before recording the follow-up.
- Privacy slice: `0180532a74fc078adee28b99c2215e2c6ff276e4`.
- Semantic implementation: `90dcc1bf55f27c4e99982e71be89789d695a0e40`.
- This subsequent evidence file changes no executable source. Final pushed
  head and exact-head CI are recorded in the external verification readback.
- Historical DEV70: 70 snapshots; 37 guard accepted, 28 candidate rejected,
  3 Producer rejected, 2 pre-model rejected; GPT-6.1 Sol / low; judge disabled.
  Those counts apply only to the historical source, not this candidate.
- New-candidate real-model acceptance / DEV70: NOT RUN. P11 OPEN; P12 BLOCKED.

## Root causes and owning changes

| Boundary | Cause | Repair and preserved constraint |
|---|---|---|
| Customer input | Producer could not express evidence families such as shipping fee, freeship, location and lifecycle. | Share the existing factual vocabulary between Producer and Strategist/evidence; no capability substitution into PRICE/POLICY. |
| Customer input subject | Current product reference was treated as the subject of general shop policy. | Typed PRODUCT/CART/SHOP subject scope; shared mapper resolves scope before planning and preserves source IDs. Explicit product-dependent policy cannot use shop evidence. |
| Nonfact input | Current decision concerns had no typed representation and reached an empty task. | Source-bound CONSULTATION kind with no shop fact capability; its safe current-message span travels under the same code-owned ID. Unsafe source surface remains an explicit failed outcome, preserving fact siblings. |
| Evidence projection | Material/care/composition sources used different field names and categories from canonical obligations. | Normalize trusted fields into materials/careInstructions and separately scoped configuration PRICE projections; retain authority, subject and distinct provenance. |
| Fit evidence | A requested fit size was compared against a stock variant label. | Match verified recommended/alternative fit sizes; stock and customer size selection still cannot supply fit authority. |
| Selling configuration | Component FULL_SET could collapse two-piece and three-piece prices. | Preserve exact offerScope separately from component; ambiguous complete-set price remains bounded and retail never proves set stock. |
| Compiler and realization | Generic prose/null slots could not attest independent consultations. | Existing resolution compiler keeps each ID/outcome; consultation tasks alone require one obligationTexts entry per ID. Final GENERAL segments retain those IDs; legacy three-field Responder drafts remain unchanged otherwise. |
| Recovery | Failed or unsafe prose could remove independent supported facts. | Reuse code-owned FAILED -> BOUNDED_UNAVAILABLE, preserve other facts/limits and derived task fields, and retain failure diagnostics. No missing concern is declared answered. |
| Final guard | Simulation claims were filtered out before coverage checked their presence. | Check coverage once on the complete admitted reply, then use the existing filtered runtime projection for production authority checks. |
| Privacy | Field discussion and generic location terms were mistaken for disclosed addresses. | Existing privacy owner uses a bounded field-role grammar that must consume the whole payload; explicit declarations, unknown values and mixed address suffixes still redact. This is not semantic extraction. |

## RED and GREEN evidence

Every main owning change was preceded by a failing regression. Initial customer
contract/subject/fit controls had 14 failures; normalization had 4 failures;
composition refinements had 3 failures; valid simulated policy replies failed
the coverage guard; consultation controls initially failed because the kind
was unsupported. Privacy controls reproduced 8 false positives and then 3
mixed-suffix leaks during the first attempted repair. The unsafe consultation
source control separately failed when the mapper discarded the entire turn.

| Deterministic control | Obligations | Outcomes | Evidence |
|---|---:|---:|---|
| Price plus unsupported wrinkle through RealtimeRunner | 2 | 2 | ANSWERED + BOUNDED_UNAVAILABLE, original IDs retained. |
| Shop policy versus explicit product-specific policy | 1 | 1 | Exact owning subject maps; unrelated subject is rejected/bounded. |
| Fit size in verified alternatives versus absent size/stock | 1 | 1 | Actual recommendation data maps; absent fit and stock substitution do not. |
| Three-piece configuration plus exact configured price | 2 | 2 | Separate source refs/hashes; two-piece price and duplicate configuration hash cannot cover the price. |
| Split policy/component stock/retail/full-set stock | 6 | 6 | Existing family controls retain independent outcomes; retail cannot prove whole-set stock. |
| Two independent consultations | 2 | 2 | One labeled safe final segment per source ID. Missing/duplicate/unknown IDs reject. |
| Two consultations plus price on prose failure | 3 | 3 | Both concerns bounded; independent verified price retained; unsafe prose removed. |
| Unsafe concern span plus price | 2 | 2 | Concern bounded without exposing PII; price remains supported. |
| Simulated policy plus runtime price | 2 | 2 | Full-output coverage passes; missing/fabricated hashes, fabricated text and runtime price mismatch reject. |

For accepted deterministic controls: silent drops 0, wrong tested mappings 0,
unsupported promotions 0. These are scripted/source-bound regressions, not a
claim of complete natural-language Producer recall or response quality.

## Commands actually run

| Command | Exit | Result |
|---|---:|---|
| `pnpm exec vitest run` on six changed/core semantic suites in apps/worker | 0 | 86 tests passed. |
| `pnpm --filter @lana/database test` | 0 | 262 passed; 31 existing PostgreSQL skips. |
| `pnpm --filter @lana/contracts build` | 0 | Contract build passed. |
| `pnpm exec tsc -p tsconfig.json --noEmit` in apps/worker | 0 | Worker typecheck passed after two parent-owned fixture/type corrections. |
| `pnpm --config.enable-pre-post-scripts=false -r build` | 0 | Workspace build; TypeScript package checks passed. |
| `pnpm --config.enable-pre-post-scripts=false --filter @lana/admin-web typecheck` | 0 | Frontend typecheck passed. |
| `pnpm --config.enable-pre-post-scripts=false -r test` | 0 | 3,474 Vitest + 88 Node tests passed; 35 existing skips. |
| `git diff --check` | 0 | No whitespace errors. |

External logs/readbacks live in sibling directory
`pr377-semantic-root-causes-20261003`. Exact-head remote CI is recorded there
after push; a local workspace pass is not a remote CI pass.

## Complexity and remaining authority gaps

No extra online role, model call, persistent store, effect permission or
operational gate was introduced. The shared vocabulary removes one duplicate
contract. Subject/configuration qualifiers protect actual mapping ambiguities;
consultation IDs and its conditional realization slot protect previously
unrepresented customer concerns. Computation remains bounded by the current
obligation/evidence collections. Coverage validation is moved, not duplicated.

The runtime product PRICE claim currently lacks verified offer composition;
it is not relabeled FULL_SET from context alone. An opaque stock variant still
requires authoritative presentation labels. Such evidence gaps must reach a
bounded outcome/recovery, or explicit rejection where recovery is unavailable.
Qualitative comparison/use-case claims still require their own evidence.

The current historical DEV70 simulation adapter freezes full Producer output
but is not a durable realtime replay. Next real-model evaluation must freeze
the full typed Producer/state/lookup snapshot, pin exact source/corpus/model,
use the same owning compiler/realization/guard, and report this adapter boundary.
No expected DEV answer enters generation context. Judge remains disabled per
the owner instruction; guard acceptance must not be called quality PASS.

No merge, deployment or live traffic is authorized by this follow-up.
