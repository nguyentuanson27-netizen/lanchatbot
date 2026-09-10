# Track C C3 V5 conversation benchmark V3

This directory contains the corpus-derived V5 conversation benchmark specification.

## Scope

- **100 model-quality conversation cases**
  - 70 `DEV` cases for prompt development/tuning
  - 30 `HOLDOUT` cases for checkpoint-only evaluation
- **15 OWNER/SAFETY cases** scored separately through ownership/effect gates
- fixed evaluation time: `2026-09-10T09:00:00+07:00`

The benchmark was synthesized and anonymized from 500 historical shop conversations. Historical product facts are **not** treated as factual authority. Controlled facts in `facts.json` are synthetic evaluation inputs.

## Why V3

V3 fixes issues found during self-review of the earlier 50/100-case drafts:

- all 100 main cases are model-quality cases; owner/safety is separate;
- non-first-contact cases use multi-turn histories;
- evaluator jargon was removed from frozen dialogue;
- no golden/reference reply is supplied to the judge;
- expected next steps are structured as `NONE`, `OPTIONAL`, or `REQUIRED` plus allowed action enums;
- coverage is multi-label;
- contrast groups test the same/closely related latest customer turn under different histories;
- source trace examples are only attached where the pattern was explicitly validated in the historical corpus.

## Layout

- `quality-01.json` … `quality-10.json`: 100 compact quality cases, 10 per file.
- `facts.json`: deduplicated controlled fact catalog referenced by case fact IDs.
- `rubric.json`: deduplicated customer-outcome and behavior catalogs.
- `owner-safety.json`: 15 separate handoff/effect/payment/post-sale cases.
- `manifest.json`: split policy, hashes, traceability, and execution blockers.

The compact schema is lossless relative to the V3 benchmark spec: cases reference catalog IDs instead of repeating long fact/rubric strings.

## Holdout

The 30 holdout cases are frozen for checkpoint evaluation and must not be used to tune the prompt.

Expanded HOLDOUT SHA-256: `47fbc53f899a16d54cba927f126a7e9da1f0356029e6c445512effcccd30f150`

Contrast groups are kept within one split:

- `PRICE_HIGH_CONTEXT` → DEV
- `OK_CONTEXT` → DEV
- `REFERENT_RESOLUTION` → HOLDOUT
- `DEADLINE` → HOLDOUT

## Important boundary

This PR intentionally adds **benchmark specifications only**. It does not claim provider execution.

Before provider evaluation, an adapter must:

1. expand fact IDs through `facts.json`;
2. materialize those controlled facts into the actual Context V2 verified-claim format;
3. preserve code-owned `CLAIM_NNN` provenance resolution;
4. wire explicit ad-origin / first-meaningful-inbound metadata;
5. run OWNER/SAFETY cases through the pre-model ownership/effect gate, not the two-pass quality scorer.

This keeps the benchmark honest about what is executable today while making the 100-case suite reviewable and versionable in Git.
