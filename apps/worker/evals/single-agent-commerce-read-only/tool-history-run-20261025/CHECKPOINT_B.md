# Checkpoint B — tool/history campaign, 25/10/2026

**Recommendation: STOP. B chưa GO.** Run closed after an offline privacy regression was found; no automatic second run.

- implementationBaseSha: `00ffd3ee9075774ed7be13605a07d505886010cd`.
- bRunSourceSha: `9e352f382e8915d6a1f1c080c75817065da42c63`.
- Post-run privacy fix: `94cb6b089321d65cff57d810eb6ad2b3c74627ca`; verified locally, **0 provider generations on this fix**.
- Owner: Vertex/global `gemini-3.5-flash-lite`, version same alias, HIGH, candidateCount1/plaintext/max8192, default temperature/topP, timeout90s, retry0. Verifier: Codex logged-in `gpt-6.1-sol` HIGH, CLI0.159.2 bounded Responses relay, tools[], max1 upstream/generation, timeout90s, retry0. Exact configuration/prompt/schema/corpus hashes in REGISTRATION/PROVENANCE.

## Population and observed result

Registered51 native +17 scoped controls, N1. Completed21 native +17 controls;30 native NOT_RUN (10 unfinished prefix +20 remaining). No native B1 cases were dispatched. The stateful journey stopped after its fifth completed/captured turn; private intake/final confirmation not exercised in this campaign.

Controls PASS:8SAFE all eligible,8UNSAFE all blocked, one unscored probe PASS. **zero observed send-eligible false PASS** on the8 registered unsafe controls under this frozen configuration; this is not full A2/A3 or a claim about all language/privacy inputs. Probe differs from the prior run and remains unscored evidence.

Native:19 SEND_ELIGIBLE (18 direct PASS +1 receipt-backed cart summary),1 static fallback,1 model NO_SEND with an actual code checkout prompt. All21 have capture; silent customer turns0. Fallback rate1/21=4.76%, handoff0, model NO_SEND1/21=4.76%; customer silence0. Do not equate19 eligible with19 good sales replies.

Whole-turn self-review:12 useful,5 useful with polish,2 need editing,1 task failure,1 fallback. Descriptive review, not a promotion threshold. Reasons and exact actual outcomes in PRIMARY_REVIEW/CONVERSATIONS. One discovery semanticDiagnostic was inadvertently exposed by the first primary projection; subsequent projection excludes diagnostics, and no fully blind review is claimed for that case. Other rejected-draft diagnostics were read after locking primary hash `422e765ddce28fbc845a91e97677490d28af668b53464c24d33588f5934784c0`.

## What changed and what happened

1. **Offer discovery:** source offer IDs reach owner after search without binding all price/stock variants. Current discovery performed one search, state update and two explicit SET_QUAN reads; both reads OK, no SUBJECT_BOUND/OWNER_TOOL_MODE. It generated a final draft, but verifier rejected “không lo bị bó bụng” without individual SIZE_FIT. Customer still received fallback. Tool-completion progress does not close sales feasibility; draft also offered two options rather than settling the recommendation.
2. **Image history:** durable accepted assets now reach the next request. Asking the price again sent no duplicate images. Explicit subsequent request for whole-set pictures still resent images; requesting close embroidery then sent a different detail asset. These are N1 functional observations with supporting deterministic tests, not stability proof.
3. **Caption/evidence:** actual detail caption was retained; transport SHA256 is captured before redaction. The checkout prompt was over-redacted by the existing NAME rule, but its exact public code-owned text was verified by hash. This proves that public prompt only, not reconstruction of private values.
4. **Privacy regression:** the initial street disambiguation relied on proper casing/frames and failed bare lowercase street values. Offline diagnostic found redaction unchanged and isPrivateCommerceText=false. No real customer input was used in that diagnostic; actual81 wires were scanned without evaluator/private-fixture leaks. Nevertheless readiness failed, so dispatch was stopped at a persisted attempt boundary, not patched/retried under the old identity.
5. **Post-run fix:** standalone street declarations, abbreviations and location frames now remain private regardless of casing; full product-caption sentences still survive. Ambiguous short fragments beginning with a street token can be conservatively hidden. No construction-word whitelist, case IDs or benchmark phrase exceptions. Do not claim generic Vietnamese parsing or perfect DLP. This corrected source has not been model-qualified.
6. **Remaining owner weaknesses:** gallery color binding failed, retry arguments were rejected, then owner changed the subject to price/size instead of fulfilling/explaining the image request. Concern about lace still receives lengthy adjective/material reassurance and late options. Correction acknowledgement still reports profile fields in parentheses. Prompt/models/verifier/rubric were unchanged (ADVICE_NO_INTERVENTION); no claim that code fixes improved voice.
7. **Recovery:** variant/quantity mutations committed correctly; a later snapshot change invalidated the old PASS. Code delivered the actual receipt-backed cart summary once. Do not call this an owner/verifier success, loosen snapshot equality, or rewrite after FAIL.

## Operations and verification

81 actual generation requests =44 owner +37 verifier; maximum1 upstream per generation; automatic retry0; reported provider timeout/error0. Operator process termination is separate from API errors. Retained wires81/81 pass label/privacy-fixture firewall; no extra unaccounted generation wire observed. Reported input557565/output34086 tokens; cost NOT_EXPOSED.

Verifier latency p50/p95:5.842/15.049s (n37). Verification stage including readback:9.890/24.558s (n20). Captured-turn elapsed p50/p95:48.000/73.801s (n21). Isolated PostgreSQL via SSH and capture Meta transport; these are not production latency, first-token, conversion or a controlled added-E2E estimate.

Observed RED retained: offer metadata missing, missing receipt reader, benign caption redacted, unavailable history treated as first contact, lowercase street regression. Final privacy correction: worker291, database71, worker build/lint PASS. Prior checks include Node95, protected/replyassembler21, DB typecheck/build and worker typecheck; exact commands/failures in VERIFICATION. PostgreSQL COD36/BANK36 ran on00b28255; final pre-run N4 COD1/BANK1 on9e352f38. Later nullable-history delta had135 targeted tests/build/type checks. PostgreSQL was not rerun after privacy correction; do not reuse pre-run DB source labels for94cb6b08.

Four deterministic test DBs dropped. Three native jobs cleaned normally; interrupted stateful DB was independently verified by its exact candidate artifact identity and dropped with audit. Original incomplete stateful report retained unchanged, cleanup proof separate. No remaining campaign test DB known. No remote CI result claimed.

Structural delta: bounded source metadata read, one durable accepted-media projection and shared privacy rules; zero semantic roles/layers, no third model, semantic router/parser, repair/reverify loop, response templates or production entrypoint wiring. A remains OWNER_BYPASS. No publish/merge/deploy/live send or automatic next campaign.

## Delivery and limits

Current code includes the post-run privacy correction; the model evidence belongs to9e352f38. Keep the independently verified offer/media changes, retain STOP and qualify the corrected source in a separately registered run before promotion. Source availability, owner usefulness, verifier protected-language acceptance and code privacy are reported separately. B1 remaining20, final3 stateful turns, negotiation3 and four B1 prefix cases were not run; no whole Phase B acceptance or stability claim.
