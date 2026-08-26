# DF13 PREPROD Fresh-Process Replacement Decision

**Status:** Proposed on this branch; authoritative only when merged to `main`

**Decision authority:** Owner direction in the DF-C administration task on
2026-08-25: use the first, simple PREPROD path rather than build a large
zero-downtime DF13 control plane.

**Scope:** The first controlled `LEGACY -> COMMERCE` exercise on the one
`PREPROD_TEST_PAGE` only. This is a source-governance decision; it does not
authorize a merge, tag, deployment, migration, COMMERCE activation, Messenger
test, routing change, or any production action.

## Decision

For the first DF13 PREPROD exercise, authority replacement is an **isolated
fresh-process replacement**, not an in-process hot cutover:

```text
seal admission -> gracefully drain/reconcile eligible queued and in-flight work to zero
-> stop the finite authority-consuming service set -> re-prove zero eligible work
-> record the reviewed COMMERCE identity -> start its build as the only authority -> test
-> on failure, seal/drain/stop/re-prove zero -> restore captured exact LEGACY pointer -> restart LEGACY
```

The sealed, drained, and stopped process set is the quiescence boundary. No old
and new authority-consuming process may run together. `Stop` means a graceful
stop only after all eligible work reaches zero: an in-flight turn must complete
under LEGACY or abort/reconcile cleanly, and a queued turn must reach an audited
completed or reconciled failure disposition without deleting state or audit. This
first exercise has no held
authority-dependent work class. This removes the need to invent a large runtime
fence/CAS/readback controller solely to provide zero-downtime behavior in an
engineering test page with no such requirement.

The process restart is not permission to invent facts or side effects. The
model-semantics/code-verification boundary, verified-claim/provenance checks,
SSRF and PII/secret protections, auth, database safety, Inbox/Outbox rules, and
single final sales authority remain unchanged.

## Required future Release Train protocol

An owner-authorized future train must still fail closed before every mutating
step:

1. Re-derive the immutable candidate manifest/content fingerprint and verify
   the exact reviewed source, build, release identity, page and channel.
2. Capture the exact known-good LEGACY release/configuration, behavior pointer,
   migration ledger, routing/allowlist and rollback inputs. Do not delete state,
   audit, Inbox/Outbox, or migration history.
   If `current` is stale while the running Realtime worker is already bound to
   a known immutable LEGACY release, the only reconciliation path is
   `deploy/df13-first-preprod-release-reconcile.sh`. It verifies the annotated
   tag/commit/tree, release-source pointer, worker Compose provenance and image
   revision, then atomically aligns `current` and captures/verifies/promotes
   runtime-state. It has no deploy, migration, database-write, or authority-change
   capability. The reviewed runtime-state capture makes read-only ledger and
   routing queries to attest the host state; it accepts no caller-supplied
   database identity. Its fixed command path and private durable journal bind the
   exact prior pointers, candidate, immutable evidence snapshot, host boot and
   isolated-helper identity. An interrupt, crash/restart, verification or
   concurrency failure terminates only the exact recorded helper, restores the
   prior `current` and runtime-state pointers, and blocks the Release Train.
   The adjacent `.body.sh` file is a non-executable internal implementation
   artifact; it is never an operator entrypoint. Operators invoke only the
   reviewed wrapper above, which starts the body in its explicit clean
   environment.
3. Seal the target page from new authority-dependent work, gracefully drain and
   reconcile every eligible queued/in-flight item to zero using the current
   LEGACY service set, then stop that finite set and re-prove zero eligible work.
   Unknown, non-zero, or stranded work aborts the replacement; the first
   exercise has no held authority-dependent work class.
4. Apply only separately approved, additive, checksum-verified migrations. The
   pending DF13 artifacts remain outside automatic discovery; this decision
   neither promotes nor applies them.
5. After the stopped zero-work proof, use only
   `df13-first-preprod-commerce-version-preparer-cli prepare-commerce` with
   its exact candidate evidence, release-source identity and captured LEGACY
   pointer. It creates or reconciles one immutable canonical COMMERCE version
   and one create-once startup package, but does **not** move a pointer. The
   generic behavior-mode operator and manual SQL remain prohibited.
   The invocation must also provide the create-once `.release-source.json`, a
   local immutable release Git directory, and a non-symlink evidence directory:
   it re-checks the annotated tag's exact commit and tree before preparation and
   writes only canonical redacted evidence inside that directory.
6. Use the narrow behavior writer to make the one exact pointer transition to
   that prepared version. After its exact durable readback, start only the
   reviewed finite service set from an immutable fresh release with the
   corresponding startup package.
   A mismatch, stale proof, existing target from a different operation, or
   package-write collision aborts before COMMERCE starts.
7. All eight authority-dependent consumers start from that one fresh build;
   no LEGACY/COMMERCE co-authority, regex writer, or partial
   Context V2/phase/reconciliation consumer is permitted.
8. Run the pre-registered smoke and integration journeys, including response,
   state/context, reconciliation, commit/effect guards, restart/crash behavior,
   and candidate/fingerprint evidence guards. Controlled human journeys still
   require their own authorization.
9. On any failed or unknown gate, seal and drain/reconcile COMMERCE work to zero,
   stop the COMMERCE release, re-prove zero eligible work, and use the narrow writer to restore the exact captured
   LEGACY behavior version/content identity at the next revision. Reconcile a
   lost acknowledgement only by durable `DATABASE` readback, then start the
   exact captured LEGACY release/configuration and re-verify health, zero
   work, routing/allowlist, behavior identity, and no duplicate effects. Schema
   rollback is not implied by authority rollback.

The dedicated behavior-mode writer remains non-generic and can only set the
reviewed exact identity while the process boundary above is proven. It accepts
only the fixed fresh-start/rollback operation document, re-reads both exact
database identities inside its pointer transaction, and cannot re-open a
generic COMMERCE operator or environment-only authority switch.

The preparer is deliberately separate from that writer: preparation creates an
immutable target under the same exact LEGACY read and zero-work proof while
leaving the active pointer unchanged. Its create-once startup package binds the
validated source evidence, release source and post-activation identity. This
separation gives an interrupted operation a durable reconciliation point without
creating a second authority path.

## Consequences and boundaries

- The rejected Draft PR #252 operational-entrypoint design is not an accepted
  release path and must not be merged merely to claim operational readiness.
  Its unmerged source remains traceable; no merged DF11--DF13 source work is
  discarded or reclassified.
- The merged default-off source contracts, Gate E v15 binding, missing-commerce
  signal, Context V2/phase/reconciliation contracts, and pending-migration
  safeguards remain the foundation for the fresh build.
- LEGACY remains the exact rollback build/configuration. This decision does not
  retire, delete, or demote it outside the isolated PREPROD exercise.
- This exception is limited to the first stopped-process DF13 PREPROD exercise.
  A future zero-downtime, page-expanded, public-production, or State V2
  transition must receive its own decision and may require the full durable
  quiescent cutover contract.
- Gate F remains pending until the future authorized replacement, verification,
  and exact rollback evidence exist. UR remains blocked; BF-03, BF-04, BF-10,
  and the separate `DATABASE_URL` remediation remain unchanged.
