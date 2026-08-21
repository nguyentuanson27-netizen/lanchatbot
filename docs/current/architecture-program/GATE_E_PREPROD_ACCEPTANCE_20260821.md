# Gate E-PREPROD Acceptance — v15

**Status:** `GATE_E_PREPROD_ACCEPTED`
**Decision record:** owner decision recorded 2026-08-21
**Scope:** Governance admission of DF-C source work only; no runtime authority, release, deploy, canary, migration, or Messenger action

## Decision

The owner accepted Gate E-PREPROD after the single admissible v15 scored run.
This acceptance advances the active source-work point to `DF-C` / `DF11`. It
does not make a source merge a deployment authorization and does not activate
`COMMERCE` authority.

The previous `POST_BF_V1` runtime reconciliation remains an immutable
historical checkpoint. The accepted BF residuals are unchanged:

- BF-03 remains foundation-only and non-activatable.
- BF-04 remains `PARTIAL / KNOWN_GAP` under the recorded owner waiver.
- BF-10 still lacks natural terminal-transition evidence after cutover.

## Immutable Gate E evidence bindings

| Field | Binding |
|---|---|
| Scored/checkpoint `origin/main` | `608fee97afd24a064ee39d43f81ea5fca214055c` (PR #236 merge) |
| Evaluated candidate source | `e80cd663a9769ad8c0313c3693f37f32138ca52a` |
| Candidate relationship | verified ancestor of scored checkpoint |
| Gate E v15 status | `TECHNICAL_ASSERTIONS_PASS` |
| Frozen population/result | `14/14`; claim safety, Context integrity, and coverage `100%`; side-effect violations `0` |
| Provider execution | exactly one scored v15 run; `51` provider requests; `gemini-3.5-flash-lite`; location `global`; service-account authentication |
| Registered manifest hash | `48ed2d4a38fa2eea9eea7caadc0529862742c60a06b670e6872208e26893962b` |
| Evidence BODY hash | `a01ed890b75b4c0dae5a90efe6f28a0e41f86c0c511162b7973b513d61403db1` |
| FINALIZATION hash | `21d02772417da44bf9a8709cf10e1f196feca5e3175626bdb39ecaa1147b92f8` |
| Evidence admissibility | `FINALIZED_TRUSTED_EXACT_HEAD` |
| Durable-store status | evidence and finalization `APPENDED` |

The recorded manifest, evidence BODY, and FINALIZATION hashes are immutable
bindings. They are Gate E provenance, not a copied-hash substitute for the
required candidate projection/fingerprint re-derivation at any future DF13
activation boundary.

## Active work and hard stops

`DF11` may begin as a focused, default-off, side-effect-free source change.
DF12 and DF13 remain separate focused PR units in dependency order. Each PR
must complete exact-head verification and independent review, then stop for a
fresh owner merge command.

Runtime behavior remains `salesAuthorityMode=LEGACY` and
`stateReadMode=LEGACY`. No DF-C runtime activation has occurred. A future DF13
release/cutover may only occur after separately authorized release/canary work
proves the complete quiescent-boundary, exact-readback, re-derived
candidate-fingerprint, rollback, and critical-journey contracts.

UR work remains blocked: `UR-00` may not start until DF13 is stable and the
owner separately approves it. The independent `DATABASE_URL` remediation is
not part of DF-C.

## Reconciliation notes

The former `DRAFT_UNREGISTERED` wording in the Gate E execution plan and model
evaluation record described the pre-v15 workflow and is historical. Their
current status is reconciled by this record; their durable safety and
provenance requirements remain unchanged. No historical evidence, runtime
state, or acceptance record is rewritten by this governance update.
