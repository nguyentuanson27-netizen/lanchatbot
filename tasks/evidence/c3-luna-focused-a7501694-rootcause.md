# C3 focused Luna rerun and input-contract diagnosis (2026-09-28)

## Source and execution

- Executable source: `a7501694ad05f906c8f4282fa4ff3b52c5af4599`; the later comment/documentation commit does not change executable behavior.
- GPT-6 Luna medium, test-only Gemini provider identity, six frozen DEV cases, behavior simulation with fake external ports and effects disabled. This is a focused rerun, not a new DEV70 or a holdout result.
- Candidate artifacts: `.codex_tmp/LUNA_C3_a7501694_FOCUSED_20260928` outside the repo. Full PII-redacted history SHA-256 `65FC73FE5939EA3C635E0673AEC2CD0947C0713C9F7472798C12DF874F2DB53E`; run manifest SHA-256 `08412BC1866E9DF3828FDA7D0C508736D2096DA9C337A4A25A839330097D987B`.
- Frozen rubric hash remains `3e07e0cd235b38ab5f90cc8692e6a2a050eff65a894b430117ab1b46c7e5efb2`. The diagnostic judge is GPT-6 Luna medium through the local CLI adapter, not the pinned Gemini judge. Its summary SHA-256 is `9174662261FFCF96D2A65EDEEEDD1F741FBA0D2076D6DE2E319114B30764EE3E`.
- Worker typecheck passed. Full worker Vitest: 1,828 passed, one opt-in Luna smoke skipped; 128 files. `git diff --check` passed.

## What changed and what remains

The responder now revalidates a task-bound, code-owned limit when legacy free-prose classification rejects an unresolved factual answer or a plain acknowledgement. It never rescues an unverified effect claim. Unresolved order status is code-owned at the response schema and output boundary, so the model cannot author a placement confirmation without a receipt. This removes final-guard failures without granting model prose commercial authority.

| Case | New execution | Quality and current owner |
| --- | --- | --- |
| Q024 | Completed; honestly says freeship cannot be confirmed. | Diagnostic FAIL. The frozen fixture has `RC_FREESHIP_N` but no `cart_snapshot`; the runtime cannot revalidate that the negative claim belongs to the current cart. Existing cart-binding tests prove the negative statement when a current cart is supplied. The fixture's `production_contract: SUPPORTED` classification conflicts with its missing readback. Do not assert the negative from the unbound snapshot. |
| Q035 | Completed; does not infer XL fit from usual XXL. | Diagnostic FAIL. The fixture requires `ASK_MEASUREMENTS`, but `canonical_flags` is empty and materialized permitted actions contain only `NONE`. The missing measurement blocker must enter the canonical input contract; response wording cannot create an action the contract forbids. |
| Q043 | Completed; does not assert black/M stock. | Diagnostic FAIL. The verified stock claim is scoped to opaque variant `BLACK_M`; the fixture supplies a product profile with independent colors and sizes, but no authoritative `variantId` to color/size mapping. Existing code can state a bound variant claim when the product presentation supplies that mapping. Inferring it from the ID spelling or Cartesian color/size lists would be unsafe. |
| Q067 | Completed; distinguishes dispatch from delivery ETA. | Judge did not finish because the Luna account hit its usage limit. The reply has no fabricated dispatch date. |
| Q096 | Completed; acknowledges the customer's correction without claiming a cart mutation. | Judge did not finish because of the same usage limit. The actual cart transition still requires kernel authority. |
| Q100 | Completed; code says no order placement result is available. | Judge did not finish because of the same usage limit. No POS order or receipt was created. |

All six were `COMPLETED_NOT_JUDGED` in the candidate run; completion is not a quality pass. Of the six, three received diagnostic scores and all three were FAIL. The other three have no score. The judge's CLI stderr explicitly reports a usage limit and a later retry time; do not infer a score for them or claim the 70-case quality distribution improved. The earlier full-source diagnostic remains 24 PASS, 9 PASS_WITH_NOTE, 29 FAIL among 62 scored on source `81602079`.

## Root cause of repeated unsuccessful fixes

The early changes addressed output wording and guard false positives one case at a time. Three of the focused quality failures are upstream data/contract gaps: current-cart identity, variant-label binding, and a canonical measurement blocker. A responder patch can produce an honest fallback, but it cannot produce the requested factual answer or canonical action without those inputs. The remaining 29-case quality residual also includes genuine relevance and next-step errors, so fixing the six seam failures alone is insufficient for sales acceptance.

Next source work should bind these inputs at their existing owner when available, then rerun affected cases and the full DEV70 on one executable revision after the Luna limit resets. Keep the frozen fixtures and rubric unchanged; record any irreconcilable fixture mismatch instead of weakening the cart, variant, or effect boundary. No merge, deploy, live catalog write, customer send, or real POS order occurred.
