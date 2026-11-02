# Independent review — source-bound opening checkout fix

**APPROVE IMPLEMENTATION** at exact executable `b6676b681acf25c027decea4434f96a0f3ede433`.

Reviewer: `/root/phase_c_task_completion_implementation_review`, the same independent reviewer throughout this fix loop. Implementation base: `d4172797d5eeeca921f2c068ac9bd1ca5beb49d3`; first implementation savepoint: `c9f2c7cb9c51efa35d793b73a7895704e9f8d7d4`.

Scope: [implementation](c3-phase-c-opening-checkout-source-bound-fix-20261102.md) and [sealed verification packet](c3-phase-c-opening-checkout-source-bound-verification-20261102.json), SHA256 `80e9b91ae8edc712c14f89504ace76162b0fd0cd15692ca3ca879669c071b892`. The packet was sealed before the final reviewer decision and retains its pending-review creation status; this record contains the subsequent final decision. The packet bytes have not been changed after review.

## Review loop

1. R1: raw cart sentinel alone was insufficient; normalized matching could accept source sentinel lookalikes. Fixed by requiring exact canonical raw source components in both public/private proofs. Public/private RED controls observed, then GREEN.
2. R2: prospective readiness enforced only at CLI sealing could be bypassed by the actual diagnostic/provider path. Fixed at diagnostic preflight/registration, candidate preflight and each actual positive-generation boundary. Legacy v2 remains audit-replayable; new v2 dispatch is blocked with zero HTTP.
3. R3: mandatory execution paths would invent product dependencies for productless acknowledgement/policy/order tasks. Empty v3 paths now require explicit no-product scope, policy-only checks and no initial/task/judge product refs; discovery or selection cannot use the exemption.
4. R4: private preparation could retain unchanged but expired READY evidence, and cart expiry could cross during awaited source reads. Final cart/source time checks now run after the last awaited policy/authority/source reads and before transaction dispatch. Expiry, revision and authority negative controls pass.
5. R5: unknown/null/missing cart component colours could borrow the no-selection generic-photo path. Observed public/private RED2, then fixed. Reviewer independently reproduced no-cart READY versus unknown/missing/empty/unproved-sentinel cart UNAVAILABLE with zero media I/O.
6. PostgreSQL fixture follow-up: first full matrix stopped at54 PASS/1 FAIL because the new synthetic preview fixture lacked regional transit data. Only the disposable `!live` checkout fixture gained an explicit regional ETA input. No runtime ETA guard was relaxed. A new clean source seal and full matrix were run.
7. Offline P2 packet: reviewer caught a non-price advice surface mislabeled as the direct-price control. Corrected to actual p01 direct-price, j3t1 existing-garment advice and j3t2 contextual upsell. Reviewer independently matched6/6 raw/snapshot source bindings; arithmetic149k saving/300k increment is checked, contextual semantic judgment remains NOT_RUN and original verifier FAIL is retained.

## Final independent evidence audit

- 24/24 source byte SHA256 and Git blobs match exact clean `b6676b68`.
- 56/56 retained artifact byte hashes match;32 command records and intermediate failures are consistent.
- Worker:153 files,2566 PASS. Node:827 PASS,0 FAIL,2 existing SKIP. Protected-claim/reply assembly:21 PASS.
- Worker canonical build, lint and TypeScript checks completed with exit0, including explicit durable exit records.
- Actual disposable PostgreSQL:122/122 PASS,7/7 invariants PASS, source clean, database dropped, provider generations0 and send disabled. Includes unlabelled public confirmation, private partial intake, full preview, revoked-media restart, and retained add-confirm controls.
- R1–R5 and the P2 packet binding issue are closed. No remaining blocking implementation/evidence finding in this bounded scope.

## Limits retained

The s13 continuation is a frozen-source reconstruction, with only67 bytes of headroom at65,469/65,536 presented bytes. The historical failed second body was not retained. s11 has only its bounded malformed diagnostic and representative decoder controls. Frozen cart helper/readback replay and synthetic persisted PostgreSQL acceptance are distinct evidence. Readiness paths are declared unit-quantity prerequisites at the supplied clock, not a sales-completion guarantee.

All-admitted opening-product photos and unknown/conflicting-colour fail-closed behavior remain. Owner/verifier prompts, model identities/efforts and quality thresholds are unchanged. This approval does **not** establish model-quality acceptance, contextual P2 judgment, Phase C qualification GO, C3 parity, provider dispatch, merge or deployment approval. No provider/model campaign or live customer send was performed.
