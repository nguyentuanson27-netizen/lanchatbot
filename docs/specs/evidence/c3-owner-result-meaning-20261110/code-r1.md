# Independent implementation review R1

**REQUEST_CHANGES** — working diff against de6579ec; no provider requests. Exact file hashes in JSON.

## IR1_CURRENT_FIT_HISTORY — P1

Every historical recommend_size response is relabeled currentFit and described as hồ sơ hiện tại without current snapshot proof. An earlier same-target result can be stale after later profile/preference/chart change, yet both remain explicitly current in native and final traces.

Independent provider0 repro: oldM/sourceA/inputPreference null followed by currentL/sourceB/RELAXED, trusted sizeFitTargets pointsB. Both native and final output two currentFit groups with current-profile meaning.

Do not certify historical results as current. Either use per-call evaluation name/meaning and keep current trusted claims authoritative, or prove current exact target/source/result/profile against current state/claims and distinguish superseded results. Source hash alone is not a profile fingerprint. Test native+final old/new results; scope UNKNOWN negotiation meaning to that call too.

## IR1_QUOTE_PUBLIC_FIELD — P2

The total-before-cart instruction still names singular offerType for quote_product, while public schema requires offerTypes array and rejects singular field.

Current prompt: dùng quote_product với một offerType và quantity. quoteDeclarations requires subjectRef+offerTypes.

Use offerTypes containing exactly one code for totals; retain singular offerType where cart tools actually require it. Add focused active-prompt/contract assertion without broad style rewrite.

## IR1_UNCERTAIN_HINT — P2

Hint decoration checks returned failure+snapshot but not effects private uncertainty. A known missing-choice result from earlier in a batch can be decorated after a later effect becomes unknown. Outer terminal gate prevents next-owner send, but the stronger preregistered no-hint-on-unknown guarantee is not proved by current checks.

Current wrapper decorates all base.invokeBatch results after completion, relying on status SOURCE/effectCommittedfalse and public snapshot. Effects uncertainty lives separately; existing unknowncommit negative only changes current result reason/effectCommitted.

Use small code-only known-uncommitted-selection proof port patterned after existing negotiation proof, requiring original branded result and no later uncertainty/state-authority change, or explicitly revise guarantee with justified reliance on terminal gate before any owner publication. Do not call terminalOutcome inside decorator if that adds read I/O. Test earlier missing choice then later unknowncommit, forged/cloned result and no hidden I/O.

The target-only quote hint, exact replacement scope and removal of obsolete technical modes are appropriate. Existing code authority, verifier and caps stay. These findings concern new presentation meaning and the stated uncertainty boundary; they do not establish a live send bypass. Exact-head review and completed focused verification still required.
