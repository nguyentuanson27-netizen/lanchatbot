# Track B PREPROD Acceptance — 2026-09-05

## Verdict

`TRACK_B_COMPLETE` for `ENGINEERING_PREPROD` and `PREPROD_TEST_PAGE`
`1198992073286645` / `MESSENGER` only.

This is an engineering PREPROD acceptance. It is not public-production readiness,
multi-page approval, State V2 approval or permission to remove V1/LEGACY code.

The owner correction on 2026-09-05 returns closure to
`SOLO_PREPROD_MINIMAL`. It replaces the stricter operational proof ceremony for
this closure with three gates: source, pre-activation and post-activation. PR
#321 was closed unmerged because it changed only invocation-time audit freshness
to process-start audit freshness; periodic runtime audit production is not a
current Track B risk or acceptance requirement.

## Source gate

- Canonical source before this append-only acceptance record is
  `e31a80da29ca1b37a246dcbc5b8e113a6b8d5d80`, tree
  `077fee6d6ceba524449f8977de895af7fe8acec0`, the merge of PR #320.
- PR #320 reviewed head
  `a96a1e425c9e6254741f58588ab2922a84c1ac29` received independent
  `NO BLOCKERS` with `Required/P0/P1/P2 = 0/0/0/0`. Canonical CI run
  `33947725556`, job `101256741899`, passed real repository and PostgreSQL
  steps before merge.
- The exact-main release-evidence smoke returned
  `SOURCE_READY_NO_ACTIVATION` / `MATCHED`. All 66
  `GATE_E_CANDIDATE_SOURCE_PATHS_V1` blobs remain byte-identical to the v22
  accepted candidate projection, so accepted Gate E v22 and Gate F evidence are
  reused rather than rerun or relabelled.
- Track B focused implementation, differential/replay and exact-head CI evidence
  remains owned by the reviewed B2/B3 source PRs. This acceptance record does not
  weaken their claim/effect, provenance, whole-group, security, idempotency,
  fence or no-third-authority contracts.

## PRE-activation gate

- PREPROD repository checkout was exact at the source commit above and clean.
- Applied database ledger entries 0036 through 0040 matched their reviewed
  checksums. Migration 0040's dedicated least-privilege operator role, scoped
  RLS policies and root-owned mode-`0400` secret were present; the role and
  secret were not mounted or referenced by realtime.
- Database authority readback was exactly pointer revision `11`, version
  `ccd021a6-24e3-4a46-87a0-6d63f506cb86`, `V2_ACTIVE / COMMERCE / LEGACY`,
  bundle `56b94f7a2e07e80fe8b2983a75b46caa78c2d48f3bd4081d4a88d8f40d2325b8`
  and content
  `sha256:95ead755ea456c1e01c215d2421c2cf23f64fb536168ed49d5729bc4ec91f394`.
- There were zero unreleased Track B fences and zero `PROCESSING`, `SENDING`
  or `APPLYING` authority-dependent claims for the approved page.
- No affected runtime boundary changed after the already accepted v22 activation.
  PR #320 changes only the release-evidence reader/operator boundary, so no
  service deploy, restart, fence or pointer CAS was necessary or performed.

## Initial last-known-good V2

The current exact healthy v22 service is the initial compatible Track B LKG V2.
Its canonical structured binding is
`evidence/TRACK_B_INITIAL_LKG_V2_20260905.json`. That record binds the exact
service source/tree, image/tag/build/config, read-only mounted startup artifact,
pointer/version/bundle/content, durable Gate E v22 certification, migrations
through 0040, operator separation and zero-fence/zero-in-flight state.
Its canonical body SHA-256 (excluding the `bindingSha256` field itself) is
`8808956f224aee094c3fa701f595eb6a8cb8c38e18df13d1b6a6dbfa18365217`.

An arbitrary newer runtime-resolution audit is not required when those owning
identities exactly match without ambiguity. V1 is not a Track B rollback target.
The owner deferred the first live V2-to-distinct-LKG-V2 exercise until Track
C/C4, when two distinct compatible V2 releases exist; the merged fence,
admission and symmetric-recovery implementation and tests remain intact.

## Post-activation gate

- The current realtime container was `running / healthy`, restart count `0`, on
  image `lana-chatbot-app:track-b-b0aeb8907` with its exact immutable image,
  build and runtime-config identities.
- The read-only mounted startup artifact's expected DATABASE authority matched
  the exact live pointer field-for-field.
- The container process smoke and health readback passed. Because closure made
  no runtime or authority mutation, no duplicate activation or Messenger send
  was performed merely to manufacture evidence.
- Terminal state remains the accepted healthy V2, pointer revision `11`, zero
  live fences and zero active authority-dependent claims.

## Residuals and boundaries

- `OWNER_ACCEPTED_SECRET_EXPOSURE_RESIDUAL` remains recorded. No credential is
  repeated here and no rotation is claimed.
- State reads remain `LEGACY`; Context V2 remains offline/evaluation-only.
- Dormant V1/LEGACY implementation is not deleted. Track B rollback selection
  forbids V1 and any third authority.
- The first meaningful distinct-V2 rollback exercise belongs to Track C/C4 and
  is not evidence missing from this single-V2 PREPROD closure.
- Track C is not authorized by this record. The administration task owns its
  separate start after validating this handoff.

## Track C handoff data only

Execution routing: C0/C1.1/C2/C3 use Terra High; C1 MUST_PASS and C4 use Sol
High; normal tuning failures remain in the Terra High loop; hard bugs or
semantic drift escalate to Sol High. Every source PR keeps one fixed independent
Sol High reviewer. Each actionable review finding must include severity and
invariant, reachable evidence, root cause, smallest contract-correct direction,
non-weakened boundaries, proving tests and compatibility/owner-decision impact.
Final approval must explicitly confirm that prior root causes are closed on the
exact reviewed head.
