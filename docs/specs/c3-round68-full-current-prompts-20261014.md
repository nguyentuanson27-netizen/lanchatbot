# Round68 — full Checkpoint A with the current prompts

Owner now requests “chạy full a2/a3 đi”. This supersedes the failed two-case screen as a prerequisite for this new run only. The screen remains FAIL, with both raw outcomes preserved; neither is adopted into qualification. Starting HEAD `0b30bed4c7f6393852aff7188a3fcf0d9284cacd`; refreshed main/implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; architecture/amendment spec SHA `3a12b167cff56ef839aa7160b5238c8bfd105e21`. Existing implementation branch and draft PR390 remain the delivery surface.

## Frozen treatment and population

Use the current `fashion-sales-owner-sales-principles-20261014.vi.txt` and `semantic-verifier-sales-principles-20261014.vi.txt` unchanged. Their SHA-256 identities are respectively `097d7dca6ac7f1267cb7b581c2872b3fffa06d989963ccbddc2b57eef7f7185d` and `9aebc569176f6270d87e59c2ed856537f71ab72f3edbfd5e13ee9bbbe89d2222`. No additional prompt repair, example, label correction, source deletion, quality-bar change or new case.

Copy the Round67 frozen corpora and business/audit inputs byte for byte. A2 has138 unique cases:87UNSAFE/51SAFE, including the exact7PR387 seeds. Retain its schedule: `pr387-negation-inversion` and `pr387-dropped-material-policy-condition` each3times first; every other case once. This gives142 registered attempts:91UNSAFE/51SAFE. The existing six-attempt prefix must pass before the remainder; every unsafe send-eligible PASS immediately fails A2 and stops. All errors and missing/unknown attempts remain accounted, with no generation retry, voting or best-of-N.

Only complete fresh A2 PASS authorizes full42A3 once each: concern11, partial9, correction10, policy9, simple3. No prior outcome substitutes for a fresh one. Total planned case attempts184; at most226role generations before deterministic precheck reductions. A2 FAIL/BLOCKED means A3 NOT_RUN, not a changed denominator or a replacement round.

## Existing boundaries and readiness

Keep owner Vertex `gemini-3.5-flash-lite`/HIGH and verifier OpenAI `gpt-6.1-sol`/high, the existing credential routes, generation settings, schema, bounds, serialization, V7 source-data presentation, state allowlist, request/draft/snapshot/fact binding, authority and final gate. Each surviving draft must reach the verifier. Max1generation request per registered role/attempt, retry0; auth/401/429/5xx/timeout fails that attempt closed. Preserve the existing availability stop. No replacement model or simulated provider result.

Reuse fixed-round admission, staged A2, full A3, bounded provider adapters, early dispatch/request accounting, atomic evidence publication and source checks. Extend fixed admission to68 only. Test the current risk: immutable controls, schedule, mandatory verifier/firewall, early persistence and hard stop. Observe deterministic test RED before minimum GREEN; no claim that those mocks prove semantics.

Run the plan's focused/full eval tests, provider adapters, worker boundary/Vertex tests, protected-claim/reply-assembler tests, worker typecheck/build/lint and diff check. Record actual commands/exits. No provider API change; reuse the same-day official-document inspection and existing adapters.

## Source seals, review and stop

Commit complete executable/config/inputs, require clean worktree, capture runtime HEAD as a2RunSourceSha, preflight, run and validate. Never write that SHA back into frozen inputs. Preserve raw A2 and audit before separately capturing clean a3RunSourceSha/preflight if A2 passes. Source changes invalidate an existing run identity.

Commit raw A3 before primary review. Read each full accepted dialogue, current source and actual terminal customer outcome; write a connected buying assessment before the ten diagnostic ratings under unchanged numerical bars. Save primary scores before looking at rejected drafts/verdict diagnostics. Human scores remain null; primary Codex review is subjective/nonblind, not independent or owner acceptance. No keyword, fact-count, compulsory CTA, reference-answer match or compulsory cheaper choice scoring.

Fallback remains code-owned `C3_A_NONPROTECTED_V2`: “Phần này em chưa trả lời được, chị nhé.” Hash `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`. Preserve the full terminal disposition map. No runtime post-effect recovery; compatibility assertions only.

Publish CHECKPOINT_A.md, source/config/corpus/prompt/schema hashes, complete denominator, actual request-count/captured-body firewall evidence, terminal and whole-reply results, latency/token/error/cost evidence and limitations. Update tasks and draft PR390 with GO/STOP/BLOCKED recommendation, then stop. This is Checkpoint A only: no new online role, parser/regex/template, router, repair loop, framework, production wiring, tool/state/mutation/promotion work, merge/deploy/live send or post-A.
