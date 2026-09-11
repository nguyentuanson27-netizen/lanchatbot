import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const text = (name) => readFileSync(join(root, name), 'utf8');
const read = (name) => JSON.parse(text(name));
const ok = (value, message) => { if (!value) throw new Error(message); };
const stable = (value) => Array.isArray(value)
  ? `[${value.map(stable).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const hash = (value) => sha256(stable(value));
const gitBlobSha1 = (name) => {
  const bytes = Buffer.from(text(name), 'utf8');
  return createHash('sha1')
    .update(`blob ${bytes.length}\0`, 'utf8')
    .update(bytes)
    .digest('hex');
};

const manifest = read('manifest.json');
const facts = read('facts.json');
const gaps = read('contract-gaps.json');
const reachability = read('contract-reachability.json');
const holdoutPolicy = read('holdout-policy.json');
const owner = read('owner-safety.json');
const ownerRouteMap = read('owner-safety-route-map.json');
const capabilityMatrix = read('owner-safety-capability-matrix.json');
const rubric = read('rubric.json');
const materialization = read('runtime-materialization.json');

const cases = Array.from({ length: 10 }, (_, index) =>
  read(`quality-${String(index + 1).padStart(2, '0')}.json`)
).flatMap((chunk, index) => {
  ok(chunk.schema === 'V5_BENCHMARK_CASE_CHUNK_V4', `chunk ${index + 1}: schema`);
  ok(chunk.chunk === index + 1, `chunk ${index + 1}: number`);
  ok(chunk.cases.length === 10, `chunk ${index + 1}: count`);
  return chunk.cases;
});

ok(cases.length === 100, 'quality count');
ok(owner.cases.length === 15, 'owner count');
ok(cases.filter(({ split }) => split === 'DEV').length === 70, 'DEV count');
ok(cases.filter(({ split }) => split === 'HOLDOUT').length === 30, 'HOLDOUT count');
for (let index = 0; index < cases.length; index += 1) {
  ok(cases[index].id === `V5V4Q${String(index + 1).padStart(3, '0')}`, `case order ${index + 1}`);
}

const runtime = facts.runtime_claim_catalog;
const sim = facts.simulation_fact_catalog;
const gapcat = gaps.gaps;
const cartScopedTypes = new Set(['SHIPPING_FEE', 'FREESHIP', 'PROMOTION_OFFER']);
const expectedAuthorities = {
  PRICE: new Set(['POS_LIVE', 'POS_SNAPSHOT']),
  STOCK: new Set(['POS_LIVE', 'POS_SNAPSHOT']),
  SIZE_FIT: new Set(['VERIFIED_SIZE_ENGINE_V1']),
  ETA: new Set(['POS_LIVE', 'POS_SNAPSHOT', 'FULFILLMENT_POLICY_V1']),
  SHIPPING_FEE: new Set(['CART_POLICY_V1']),
  FREESHIP: new Set(['CART_POLICY_V1']),
  PROMOTION_OFFER: new Set(['CART_POLICY_V1']),
  PRODUCT_MEDIA: new Set(['MEDIA_SELECTOR_V2']),
};
const dialogueScopeExceptions = new Set(['V5V4Q082', 'V5V4Q083']);
const productCodeRe = /\b(?:SQ|SV|SD|CB|V)\d{4}\b/gu;
const productNames = new Map(
  Object.values(sim)
    .filter((fact) => fact.kind === 'PRODUCT_PROFILE' &&
      typeof fact.productId === 'string' && typeof fact.displayName === 'string')
    .map((fact) => [fact.displayName.toLocaleLowerCase('vi-VN'), fact.productId]),
);

function validateBinding(caseId, binding) {
  const ids = binding.product_ids;
  ok(Array.isArray(ids), `${caseId}: product ids`);
  ok(new Set(ids).size === ids.length, `${caseId}: duplicate product ids`);
  ok(JSON.stringify([...ids].sort()) === JSON.stringify(ids), `${caseId}: product ids not canonical`);
  const valid = binding.status === 'RESOLVED'
    ? ids.length > 0
    : binding.status === 'AMBIGUOUS'
      ? ids.length > 1
      : binding.status === 'STALE'
        ? ids.length > 0
        : binding.status === 'UNRESOLVED' || binding.status === 'NOT_REQUIRED'
          ? ids.length === 0
          : false;
  ok(valid, `${caseId}: binding status/id cardinality`);
}

function projectPhase(ctx) {
  if (ctx.source_stage !== null) {
    const explicit = materialization.context_projection.explicit_source_stage[ctx.source_stage];
    ok(explicit, `materialization: unsupported source_stage ${ctx.source_stage}`);
    return explicit;
  }
  if (ctx.canonical_flags.includes('MEASUREMENTS_REQUIRED')) {
    return materialization.context_projection.measurement_required;
  }
  ok(ctx.phase === 'BROWSING', `materialization: abstract phase ${ctx.phase} needs explicit rule`);
  return materialization.context_projection.browsing_default;
}

function deterministicUuid(ref) {
  const hex = sha256(`V5_BENCHMARK_CLAIM_ID_V1\n${ref}`).slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function materializeRuntimeClaim(ref, compact) {
  const recipe = materialization.claim_projection;
  const authority = recipe.authority_by_type[compact.type]?.[compact.source];
  ok(authority, `${ref}: no authority mapping for ${compact.type}/${compact.source}`);
  const timing = recipe.freshness[compact.freshness];
  ok(timing, `${ref}: no freshness mapping for ${compact.freshness}`);
  const scope = compact.scope.kind === 'PRODUCT'
    ? { kind: 'PRODUCT', productId: compact.scope.productId, variantId: compact.scope.variantId ?? null }
    : { kind: 'CART', cartId: `eval-cart-v${compact.scope.cartVersion}`, cartVersion: compact.scope.cartVersion };
  const value = compact.type === 'SIZE_FIT'
    ? {
        ...compact.value,
        customerProfileId: recipe.size_fit_defaults.customerProfileId,
        customerProfileRevision: recipe.size_fit_defaults.customerProfileRevision,
        measurementFingerprint: recipe.size_fit_defaults.measurementFingerprint,
        evidenceBasis: recipe.size_fit_defaults.evidenceBasisMap[compact.value.evidenceBasis],
      }
    : compact.value;
  const evidenceTemplate = compact.type === 'SIZE_FIT'
    ? recipe.evidenceRef.SIZE_FIT
    : recipe.evidenceRef.default;
  return {
    schemaVersion: recipe.schemaVersion,
    claimId: deterministicUuid(ref),
    type: compact.type,
    scope,
    value,
    provenance: {
      authority,
      sourceVersion: recipe.sourceVersion,
      evidenceRef: evidenceTemplate
        .replace('{runtime_claim_ref}', ref)
        .replace('{measurementFingerprint}', recipe.size_fit_defaults.measurementFingerprint),
      contentHash: sha256(`V5_BENCHMARK_RUNTIME_CLAIM_V1\n${stable(compact)}`),
      observedAt: timing.observedAt,
      expiresAt: timing.expiresAt,
    },
    authorization: recipe.authorization,
  };
}

function validateMaterializedClaim(ref, compact, claim) {
  ok(claim.schemaVersion === 1 && claim.authorization === 'NONE', `${ref}: protected claim envelope`);
  ok(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(claim.claimId), `${ref}: deterministic claim UUID`);
  ok(expectedAuthorities[claim.type]?.has(claim.provenance.authority), `${ref}: protected claim authority`);
  ok(/^[a-f0-9]{64}$/u.test(claim.provenance.contentHash), `${ref}: protected claim content hash`);
  ok(Date.parse(claim.provenance.expiresAt) > Date.parse(claim.provenance.observedAt), `${ref}: provenance interval`);
  const evalMs = Date.parse(materialization.evaluation_at);
  if (compact.freshness === 'FRESH') {
    ok(Date.parse(claim.provenance.observedAt) <= evalMs + 5 * 60_000, `${ref}: fresh observedAt`);
    ok(Date.parse(claim.provenance.expiresAt) > evalMs, `${ref}: fresh expiresAt`);
  } else {
    ok(compact.freshness === 'EXPIRED', `${ref}: freshness enum`);
    ok(Date.parse(claim.provenance.expiresAt) <= evalMs, `${ref}: expired expiresAt`);
  }
  if (cartScopedTypes.has(claim.type)) {
    ok(claim.scope.kind === 'CART' && Number.isInteger(claim.scope.cartVersion), `${ref}: cart claim scope`);
  } else {
    ok(claim.scope.kind === 'PRODUCT' && Object.hasOwn(claim.scope, 'variantId'), `${ref}: product claim scope`);
  }
  if (claim.type === 'SIZE_FIT') {
    ok(claim.value.evidenceBasis === 'MEASUREMENTS', `${ref}: size-fit evidence basis`);
    ok(claim.provenance.evidenceRef.includes(`measurements:${claim.value.measurementFingerprint}`), `${ref}: size-fit evidence ref`);
  }
}

function derivedReachability(caseItem) {
  for (const rule of reachability.derived_rules ?? []) {
    if (rule.id !== 'CART_SCOPED_CLAIM_REQUIRES_CANONICAL_CART') {
      throw new Error(`unknown reachability rule ${rule.id}`);
    }
    const hasCartClaim = caseItem.context.runtime_claim_refs.some((ref) =>
      cartScopedTypes.has(runtime[ref]?.type)
    );
    if (hasCartClaim && caseItem.context.phase === rule.when.fixture_phase) return rule;
  }
  return null;
}

function effectiveExecution(caseItem) {
  const override = reachability.overrides?.[caseItem.id];
  if (override) return override;
  const derived = derivedReachability(caseItem);
  if (derived) return derived;
  return caseItem.execution;
}

ok(materialization.schema === 'V5_BENCHMARK_RUNTIME_MATERIALIZATION_V2', 'materialization schema');
ok(Number.isFinite(Date.parse(materialization.evaluation_at)), 'materialization evaluation time');
ok(new Date(manifest.evaluation_at).toISOString() === materialization.evaluation_at, 'manifest/materialization evaluation instant');
ok(gaps.schema === 'V5_BENCHMARK_CONTRACT_GAPS_V2', 'contract gaps schema');
ok(reachability.schema === 'V5_PRODUCTION_CONTRACT_REACHABILITY_V2', 'reachability schema');
ok(reachability.evaluation_at === materialization.evaluation_at, 'reachability evaluation time');
ok(rubric.schema === 'V5_BENCHMARK_RUBRIC_V5', 'rubric schema');
ok(rubric.judge_input_policy.judge_sees_case_id === false, 'judge must not see case id');
ok(rubric.judge_input_policy.judge_sees_split === false, 'judge must not see split');
ok(ownerRouteMap.schema === 'V5_OWNER_SAFETY_ROUTE_MAP_V1', 'owner route map schema');
ok(capabilityMatrix.schema === 'V5_OWNER_SAFETY_CAPABILITY_MATRIX_V1', 'owner capability matrix schema');
ok(capabilityMatrix.side_effects === 'DISABLED', 'owner capability probes effects disabled');
ok(holdoutPolicy.schema === 'V5_HOLDOUT_POLICY_V1', 'holdout policy schema');
ok(holdoutPolicy.current_embedded_holdout.blind_eligible === false, 'embedded holdout must remain exposed/non-blind');
ok(rubric.owner_safety_scoring.route_map === 'owner-safety-route-map.json', 'owner route-map registration');
ok(rubric.owner_safety_scoring.capability_matrix === 'owner-safety-capability-matrix.json', 'owner capability-matrix registration');
const weightTotal = rubric.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
ok(Math.abs(weightTotal - 1) < 1e-12, 'rubric weights must sum to 1');
ok(rubric.weighted_score.base_pass_threshold.PRODUCTION_CONTRACT >
  rubric.weighted_score.base_pass_threshold.BEHAVIOR_SIMULATION, 'production threshold must be stricter');

for (const [ref, compact] of Object.entries(runtime)) {
  validateMaterializedClaim(ref, compact, materializeRuntimeClaim(ref, compact));
}

const effective = new Map();
for (const caseItem of cases) {
  const ctx = caseItem.context;
  validateBinding(caseItem.id, ctx.product_binding);
  ok(caseItem.execution.behavior_simulation === 'SUPPORTED', `${caseItem.id}: simulation lane`);
  const declaredBlocked = caseItem.execution.production_contract === 'BLOCKED_BY_CONTRACT';
  ok(declaredBlocked === (caseItem.execution.contract_gaps.length > 0), `${caseItem.id}: declared gap lane`);
  for (const gap of caseItem.execution.contract_gaps) ok(gapcat[gap], `${caseItem.id}: declared gap ${gap}`);
  ok(caseItem.history.length <= 10, `${caseItem.id}: history length`);

  const bound = new Set(ctx.product_binding.product_ids);
  const cartVersions = new Set();
  for (const ref of ctx.runtime_claim_refs) {
    const claim = runtime[ref];
    ok(claim, `${caseItem.id}: runtime ${ref}`);
    if (claim.scope.kind === 'CART') cartVersions.add(claim.scope.cartVersion);
    if (claim.scope.kind === 'PRODUCT' && bound.size > 0) {
      ok(bound.has(claim.scope.productId), `${caseItem.id}: runtime product scope`);
    }
  }
  ok(cartVersions.size <= 1, `${caseItem.id}: mixed cart versions`);

  for (const ref of ctx.simulation_fact_refs) {
    const fact = sim[ref];
    ok(fact, `${caseItem.id}: sim ${ref}`);
    if (bound.size > 0) {
      if (fact.productId) ok(bound.has(fact.productId), `${caseItem.id}: sim product scope`);
      if (fact.products) ok(fact.products.every((id) => bound.has(id)), `${caseItem.id}: sim multi-product scope`);
    }
  }

  const lane = effectiveExecution(caseItem);
  effective.set(caseItem.id, lane);
  const blocked = lane.production_contract === 'BLOCKED_BY_CONTRACT';
  ok(blocked === (lane.contract_gaps.length > 0), `${caseItem.id}: effective gap lane`);
  for (const gap of lane.contract_gaps) ok(gapcat[gap], `${caseItem.id}: effective gap ${gap}`);
  if (lane.production_contract === 'SUPPORTED') {
    ok(ctx.simulation_fact_refs.length === 0, `${caseItem.id}: production lane uses simulation fact`);
    ok(!ctx.canonical_flags.includes('CHECKOUT_DETAILS_PRESENT'), `${caseItem.id}: production lane uses non-ContextV2 checkout flag`);
    const hasCartClaimWithoutCart = ctx.runtime_claim_refs.some((ref) =>
      cartScopedTypes.has(runtime[ref]?.type)
    ) && ctx.source_stage === null;
    ok(!hasCartClaimWithoutCart, `${caseItem.id}: production cart claim without canonical cart`);
  }

  const projected = projectPhase(ctx);
  if (ctx.source_stage !== null) ok(projected.sourceStage === ctx.source_stage, `${caseItem.id}: source stage projection`);

  if (bound.size > 0 && !dialogueScopeExceptions.has(caseItem.id)) {
    const dialogue = [...caseItem.history.map(([, message]) => message), caseItem.latest_customer_message].join(' ');
    for (const code of new Set(dialogue.match(productCodeRe) ?? [])) {
      ok(bound.has(code), `${caseItem.id}: dialogue ${code} outside binding`);
    }
    const lowered = dialogue.toLocaleLowerCase('vi-VN');
    for (const [name, productId] of productNames) {
      if (lowered.includes(name)) ok(bound.has(productId), `${caseItem.id}: dialogue product name ${name} outside binding`);
    }
  }
}

for (const [caseId, override] of Object.entries(reachability.overrides)) {
  ok(cases.some(({ id }) => id === caseId), `reachability override unknown case ${caseId}`);
  for (const gap of override.contract_gaps) ok(gapcat[gap], `${caseId}: override gap ${gap}`);
}
ok(effective.get('V5V4Q009')?.production_contract === 'SUPPORTED', 'Q009 reachability reopen');
ok(effective.get('V5V4Q024')?.production_contract === 'BLOCKED_BY_CONTRACT', 'Q024 negative freeship blocked');
ok(effective.get('V5V4Q093')?.production_contract === 'BLOCKED_BY_CONTRACT', 'Q093 unresolved preview blocked');
ok(effective.get('V5V4Q100')?.production_contract === 'BLOCKED_BY_CONTRACT', 'Q100 checkout completeness blocked');

let expandedOwnerProbeCount = 0;
for (const caseItem of owner.cases) {
  const route = ownerRouteMap.routes[caseItem.expected.route];
  ok(route && Array.isArray(route.allowed) && route.allowed.length > 0, `${caseItem.id}: owner route mapping`);
  ok(caseItem.expected.model_should_claim_effect === false, `${caseItem.id}: owner effect-claim expectation`);
  const capability = capabilityMatrix.route_capabilities[caseItem.expected.route] ?? null;
  if (caseItem.expected.route === 'HUMAN') {
    expandedOwnerProbeCount += capabilityMatrix.probe_expansion.HUMAN.length;
    ok(capability === null, `${caseItem.id}: HUMAN route cannot register capability`);
    ok(route.allowed.length === 1 && route.allowed[0].mode === 'HUMAN', `${caseItem.id}: HUMAN route mapping`);
  } else {
    expandedOwnerProbeCount += capabilityMatrix.probe_expansion.CAPABILITY_ROUTE.length;
    ok(typeof capability === 'string' && capability.length > 0, `${caseItem.id}: capability route registration`);
    ok(route.allowed.some((value) => value.mode === 'AUTHORIZED_CAPABILITY' && value.capability === capability), `${caseItem.id}: positive capability route`);
    ok(route.allowed.some((value) => value.mode === 'HUMAN' && value.capability === null), `${caseItem.id}: negative capability route`);
  }
}
ok(expandedOwnerProbeCount > owner.cases.length, 'owner capability matrix must expand positive/negative probes');

const expand = (caseItem) => {
  const expanded = structuredClone(caseItem);
  expanded.context.runtime_claims = expanded.context.runtime_claim_refs.map((ref) => runtime[ref]);
  expanded.context.simulation_facts = expanded.context.simulation_fact_refs.map((ref) => sim[ref]);
  delete expanded.context.runtime_claim_refs;
  delete expanded.context.simulation_fact_refs;
  return expanded;
};
const qualityContent = {
  dev_70_expanded_sha256: hash(cases.filter(({ split }) => split === 'DEV').map(expand)),
  holdout_30_expanded_sha256: hash(cases.filter(({ split }) => split === 'HOLDOUT').map(expand)),
  owner_safety_15_sha256: hash(owner.cases),
};
for (const [key, value] of Object.entries(qualityContent)) {
  ok(value === manifest.content_hashes[key], `${key}: hash mismatch`);
}

const production = [...effective.values()].reduce((acc, lane) => {
  acc[lane.production_contract] = (acc[lane.production_contract] ?? 0) + 1;
  return acc;
}, {});
ok(production.SUPPORTED === manifest.quality.production_contract_supported, `supported count: actual=${production.SUPPORTED}`);
ok(production.BLOCKED_BY_CONTRACT === manifest.quality.production_contract_blocked, `blocked count: actual=${production.BLOCKED_BY_CONTRACT}`);

const domains = cases.reduce((acc, caseItem) => {
  ok(typeof caseItem.domain === 'string' && caseItem.domain.length > 0, `${caseItem.id}: domain`);
  ok(rubric.domain_thresholds[caseItem.domain], `${caseItem.id}: rubric missing domain threshold ${caseItem.domain}`);
  acc[caseItem.domain] = (acc[caseItem.domain] ?? 0) + 1;
  return acc;
}, {});
ok(stable(domains) === stable(manifest.domain_distribution), 'domain distribution');
const holdoutDomains = [...holdoutPolicy.blind_holdout_registration.minimum_coverage.domains].sort();
ok(stable(holdoutDomains) === stable(Object.keys(domains).sort()), 'holdout/domain vocabulary mismatch');

const nextSteps = cases.reduce((acc, caseItem) => {
  const requirement = caseItem.expected.next_step.requirement;
  acc[requirement] = (acc[requirement] ?? 0) + 1;
  return acc;
}, {});
for (const requirement of ['OPTIONAL', 'REQUIRED', 'NONE']) {
  ok(nextSteps[requirement] === manifest.next_step_distribution[requirement], `next-step count ${requirement}`);
}

const componentPaths = [
  'facts.json',
  'rubric.json',
  'contract-gaps.json',
  'contract-reachability.json',
  'runtime-materialization.json',
  'owner-safety.json',
  'owner-safety-route-map.json',
  'owner-safety-capability-matrix.json',
  'holdout-policy.json',
  '../../../src/track-c-c3-v5-benchmark-materialization.ts',
  '../../../src/track-c-c3-v5-benchmark-runner.ts',
];
const componentsGitSha1 = Object.fromEntries(
  componentPaths.map((path) => [path, gitBlobSha1(path)]),
);
ok(stable(componentsGitSha1) === stable(manifest.bundle_components_git_sha1), 'bundle component Git SHA mismatch');
const bundleFingerprint = hash({
  benchmarkId: manifest.benchmark_id,
  benchmarkRevision: manifest.benchmark_revision,
  qualityContent,
  componentsGitSha1,
  production,
});
ok(manifest.content_hashes.bundle_fingerprint_sha256 === bundleFingerprint, `bundle fingerprint mismatch: actual=${bundleFingerprint}`);

console.log(JSON.stringify({
  ok: true,
  cases: cases.length,
  split: { DEV: 70, HOLDOUT: 30 },
  production,
  ownerSafety: { cases: owner.cases.length, expandedProbes: expandedOwnerProbeCount },
  nextSteps,
  domains,
  hashes: { ...qualityContent, bundle_fingerprint_sha256: bundleFingerprint },
}, null, 2));
