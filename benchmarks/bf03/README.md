# BF-03 research corpus

Status: `INACTIVE_RESEARCH_ONLY`

Runtime authority: `NO_RUNTIME_AUTHORITY`

Activation path: `NO_ACTIVATION_PATH`

`correction-containment-v1.json` is a synthetic, reviewable research corpus.
It contains no production conversation, customer identifier, secret, or PII.
Its historical `CONTAIN` and `PASS_THROUGH` labels preserve examples for a
future offline evaluator; neither a label nor the zero-error target authorizes
or suppresses production behavior.

The foundation build deliberately has no BF-03 analyzer, runtime adapter,
policy-schema field, production import/export, or control-plane activation
path. The repository test validates only the corpus schema, provenance,
cardinality, uniqueness, and explicit inactive boundary. It does not claim that
the retired heuristic meets the historical false-positive/false-negative gate.

Any future experiment must remain outside production imports and must undergo a
new design, review, activation, and release decision. Git history retains the
retired implementation for research when needed.
