# Owner-authorized replay of seven quota failures

Owner asks to rerun only the seven B1 cases whose verifier returned HTTP429/usage_limit_reached in grounded-state-run-20261017. Intake HEAD `9e40a3ca0be8f9a92a64f37f5cb06cd847f55634`; previous run source `d894eb1afe0c3e1aca3d6599334b734decafc825`. Preserve that run/raw/errors/denominator. No runtime, prompt, model, schema, corpus, threshold or fallback change.

Use the existing runner with --range 18:24, existing full24 corpus and evaluator/runtime separation. New population is exactly7 cases, one new attempt each, at most28 generation invocations (3owner+1verifier per case), retry0. The runner registration still declares the full24 corpus/96 maximum; its dispatch range identifies the requested seven, not a new full24 run. Generate owner replies from current source reads, then mandatory verifier/current gate; do not reuse an expired trusted snapshot or promote an old unverified draft.

Models unchanged: Gemini3.5 Flash Lite High/Vertex global owner, GPT6.1 Sol High/existing Codex-login verifier. Freeze unchanged input/runtime hashes, commit/clean source, capture runtime HEAD in registration, preflight/source readback before generation. No hidden generation health probe, substitution, automatic retry, added repetitions or automatic second batch. Every new error/fallback stays in the seven-attempt denominator.

Save raw before whole-actual-terminal review, then inspect rejected drafts/verdict diagnostics. Supporting scores follow the existing whole-reply rubric and owner-approved advisory boundary; no keyword/ideal-answer judging. Report the new7 separately; any comparison to the earlier31 must label source and attempt identity, never overwrite old failures or claim a single-source31 rerun.

Read-only public PG/Redis/Qdrant; B1 has no writable state/DB or live delivery. Keep source checkout BLOCKED, A OWNER_BYPASS, no A2/A3/Phase C, source publication, merge/deploy/live send/effect. Stop after this7-case report/tasks/PR391 update; no post-result runtime patch.
