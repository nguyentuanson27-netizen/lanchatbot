# Context presentation — preparation, 2026-10-09

Owner authorization: “thực hiện cách trình bày context trước đi”. Implement only the readable conversation-context treatment and local verification. No new provider round is registered by this preparation. The completed rounds27–29 batch remains STOP, and round29 A3 remains NOT RUN.

Current main was refreshed before work: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; implementationBaseSha remains that exact SHA. Preparation starting HEAD: `a83c85a68c0c2310c6bb62f9e67b65bff5c6634d`, on the existing isolated implementation branch/draft PR390.

## One variable

Use round28, the latest completed A3, as the control. Keep its conversation/verifier prompts, models, generation configuration, all120A2/42A3 inputs, history, scoring bars, bounds, fallback and deterministic boundary unchanged. Round29's owner prompt has no A3 evidence and is not mixed into this treatment.

The sole change is the presentation of the existing allowlisted conversation projection in the provider request. It must not choose a product, interpret the customer's language, write a consultation plan, generate selling points or add product facts. The owner continues to make the sales decision and produce only the exact final reply.

## Readable facts layout

The opt-in request setting is `conversationContextFormat: READABLE_FACTS_V1`; the existing default remains the exact historical JSON serialization. The readable serializer receives only `projectRuntime` output, never the original fixture/evaluator.

1. TRUSTED product profiles: show silhouette, material, colors, size chart/input status, care and limitations as separately labelled data. Keep the profile's complete source metadata attached after those fields.
2. TRUSTED protected facts: show type, exact scope and value before the complete claim identity/authorization/provenance. Keep every claim, including unrelated claims; no semantic selector or router.
3. TRUSTED bound subjects, policy literals, allowlisted state and effect receipts remain complete. All policy conditions, size bindings and measured-data limitations stay verbatim.
4. REQUEST_IDENTITY retains requestId, trustedSnapshotId, evaluationAt and all other existing bindings. Snapshot/hash construction still uses the original canonical projection, not rendered prose.
5. UNTRUSTED retrieved text, accepted dialogue and latest customer message remain verbatim data, with the latest message last. JSON-encode every data value so customer/profile/policy text cannot manufacture a new section by inserting a newline.

The verifier request remains the exact original JSON request, even when the conversation presentation is opted in. The deterministic final gate still binds the exact draft and original trusted world. No rewrite, repair/reverify, new model role, state/effect, production wiring or post-A work.

This format intentionally retains source metadata rather than dropping it for a smaller request. The hypothesis is improved visibility/order of business values and the current conversation, not lower token usage. Measure actual request bytes; oversized requests must reject rather than truncate data.

## Local evidence required

- Observe a RED showing that the current request ignores the readable presentation, then implement the minimum GREEN.
- Reconstruct the canonical projection from the readable records in tests and compare every field/value with the original, across all42 round28 A3 cases.
- Capture local provider-adapter inputs to prove evaluator/private labels stay excluded and both roles retain their respective request identity/bounds; no live provider call.
- Check instruction-like data/newlines, complete conditions/bindings/receipts, missing and recommended size inputs, original input immutability and actual encoded request bounds.
- Verify default requests and all round28 verifier requests remain byte-equivalent to their captured historical envelopes.
- Existing frozen protocol validation must reject applying the unregistered treatment to a historical run. A later provider run requires its own manifest/serialization identity and clean source seal under the existing plan.
- Run the existing focused protocol/boundary/protected-claims/reply-assembly/provider tests and worker typecheck/build/lint. Do not claim model-quality improvement from local tests.

Prepare a before/after request preview and byte measurements from the existing synthetic corpus. Preview generation is deterministic and makes zero provider requests. No fourth run of the completed bounded batch, no A3 score, no new CHECKPOINT_A qualification and no live customer send.

## Delivery

Incremental commits on the existing implementation branch and update draft PR390. Preserve every historical frozen input/raw request/outcome/score. Local evidence and limitations will be appended after the commands actually run.
