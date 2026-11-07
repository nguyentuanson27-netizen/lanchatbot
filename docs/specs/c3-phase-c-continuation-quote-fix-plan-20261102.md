# Phase C — close continuation and opening-quote gates

Base `43211d7d97097a52901316f550871b4b90b31fee`, 02/11/2026. Owner requested fixing both remaining gates. Existing approved task-completion implementation and historical outcomes stay intact. No model run/deploy/live send is included.

## P1: lossless structural request projection

Observed current s08 raw text frame67436 bytes; isolated diagnostic (outside source, no provider) measures presented CompactV2 frame67613. Moving the raw check alone does not solve this. Preserve both65536 guards, current image caps,14 callable tools, prompts, all admitted evidence, original native content and11024-character signature.

Apply only to existing VI_DATA_BLOCKS_COMPACT_V2 presentation:

1. Factor redundant state-operation schema envelope. Existing anyOf branches each specify full permitted properties/required values. Close each branch with additionalProperties:false and omit the duplicated outer item properties/required envelope. Preserve all four branch constraints, descriptions, ops limits and decoder/domain validation. Use AJV to compare accepted/rejected instances against the unchanged exported legacy schema, including every field, operation and value/extra/null case. Unknown/custom schema is not rewritten by guesswork.
2. Extend existing exact default-vs-sellingOption deduplication to a single explicit option. Only remove mirrored fields if the same offer/variant/facts/availability/source metadata and sizeAvailability are present in that exact option. Partial/conflicting/changed evidence remains literal; original tool responses and model native parts remain unchanged in captured storage.
3. If configured and callable names are exactly the actual native function declaration names, use a bounded reference toolNamesFrom:DECLARED_TOOL_SCHEMAS instead of sending the same two name arrays again. Expansion from actual declarations must reconstruct the exact old execution manifest. When any list differs, keep explicit arrays. Runtime callable/admission logic is unchanged.

Pure prototype gives65099 bytes (437 headroom) on the constructed s08 continuation. This is a prototype measurement, not production GREEN. Actual combined implementation must replay the same frozen world/clock/content/results, report raw/presented/final bytes and full signatures/tool names. Worst tested envelopes and limit-1/limit/limit+1 controls remain fail closed before auth/HTTP. No claim every theoretical valid input fits.

TDD: observe structural projection assertions and boundary regression RED before implementation. GREEN minimum, then native adapter/wire/firewall, existing callable/batch/state/effect controls, worker focused/build/typecheck/lint and Node checks appropriate to changed files. No shared persistence implementation is intended.

## P2a: exact outbound-price semantics and code-owned image requirement

Upstream audit confirms no current trusted task producer: message normalization retains ad metadata but no authenticated quote intent; ingress binds product only. Optional read/quote tool is bypassable, and legacy prose intent regex is outside this architecture.

Material boundary decision is pending owner's asynchronous answer. Proposed option: existing semantic verifier additionally reports bounded PRICE assertions of the exact final draft (PRESENT/ABSENT/UNCERTAIN and existing claim/subject refs). This is protected-language semantics only; code applies the opening quote/image rule and current receipt/source/colour/group checks. Missing coverage is malformed; uncertain/missing image proof causes silent handoff. ETA/ACK with no price remains unforced. An incorrect semantic ABSENT is still a verifier risk and needs focused safety coverage; this cannot be described as deterministic semantic proof.

Alternative offered to owner: attach an image to every first-contact response for a bound product, accepting ETA/ACK images. Do not implement either dependent behavior until the required choice arrives. Do not claim a new structured postback alone closes unchanged free-textP02.

The chosen design must close actual early FINAL/read_product/quote_product bypasses in the same final egress boundary, before any message unit. It must preserve final draft/snapshot/revision/recipient/permission/privacy/freshness binding, limits, silent handoff and no retry/reverify. Never select new facts after verifier PASS without the original snapshot binding accounting for them. Focused A2 schema/semantic coverage must be revised/reviewed before any future provider safety claim; unit tests are not model results.

## Completion and review

Use the same independent reviewer for design and implementation; fix findings until approved. Keep incremental commits, update tasks and evidence with actual commands/source hashes, preserve prior failures. No claim of new model quality, Phase C GO or C3 replacement from structural tests. If a necessary contract choice remains unanswered, finish independent P1 work and report P2a's precise pending decision.
