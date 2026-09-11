import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL(".", import.meta.url));
const read = (name) => JSON.parse(readFileSync(join(root, name), "utf8"));
const ok = (value, message) => { if (!value) throw new Error(message); };

const bundle = read("journeys.json");
const facts = read("facts.json");
const materialization = read("runtime-materialization.json");
const runtimeClaims = facts.runtime_claim_catalog;
const simulationFacts = facts.simulation_fact_catalog;
const runtimeRefs = new Set(Object.keys(runtimeClaims));
const simulationRefs = new Set(Object.keys(simulationFacts));

// The authored next-move vocabulary is owned by the frozen 100-case corpus;
// journeys reuse it instead of inventing a parallel action namespace.
const corpusCases = Array.from({ length: 10 }, (_, index) =>
  read(`quality-${String(index + 1).padStart(2, "0")}.json`)
).flatMap((chunk) => chunk.cases);
const allowedActions = new Set(
  corpusCases.flatMap(({ expected }) => expected.next_step.allowed_actions),
);

const themes = new Set([
  "AD_LEAD_QUALIFICATION_COMMITMENT",
  "PRICE_OBJECTION_VALUE_COMMITMENT",
  "OUT_OF_STOCK_ALTERNATIVE_DISCOVERY",
  "COMPARE_SELECT_PRESERVE_REFERENT",
  "DELIVERY_DEADLINE_FEASIBILITY_DECISION",
  "CHECKOUT_CORRECTION_STOP",
]);
const requirements = new Set(["REQUIRED", "OPTIONAL", "NONE"]);
const decisions = new Set(["NONE", "CONSIDERING", "COMMITTED", "NEGATED"]);
const requestedActions = new Set([
  "NONE",
  "OPEN_CART",
  "ADD_TO_CART",
  "SET_QUANTITY",
  "PROCEED_TO_PAYMENT",
]);
const canonicalFlags = new Set([
  "PRODUCT_CONTEXT_UNREADY",
  "VERIFIED_CLAIMS_UNREADY",
  "MEASUREMENTS_REQUIRED",
  "CART_STATE_UNREADY",
  "CHECKOUT_DETAILS_REQUIRED",
  "EFFECT_READINESS_BLOCKED",
]);
const checkoutFields = new Set(["FULL_NAME", "PHONE", "ADDRESS"]);
const checkoutKeys = ["missing_fields", "state"];
const implementationKeys = new Set([
  "strategist",
  "responder",
  "prompt",
  "internal_strategy",
  "model",
]);

function hasImplementationKey(value) {
  if (Array.isArray(value)) return value.some(hasImplementationKey);
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) =>
    implementationKeys.has(key) || hasImplementationKey(child)
  );
}

function validateBinding(journeyId, turnId, binding) {
  ok(binding && typeof binding === "object", `${journeyId}/${turnId}: binding`);
  ok(Array.isArray(binding.product_ids), `${journeyId}/${turnId}: product ids`);
  ok(new Set(binding.product_ids).size === binding.product_ids.length,
    `${journeyId}/${turnId}: duplicate product ids`);
  ok(JSON.stringify([...binding.product_ids].sort()) ===
    JSON.stringify(binding.product_ids), `${journeyId}/${turnId}: product ids not canonical`);
  const count = binding.product_ids.length;
  const valid = binding.status === "RESOLVED"
    ? count > 0
    : binding.status === "AMBIGUOUS"
      ? count > 1
      : binding.status === "STALE"
        ? count > 0
        : ["UNRESOLVED", "NOT_REQUIRED"].includes(binding.status)
          ? count === 0
          : false;
  ok(valid, `${journeyId}/${turnId}: binding status/id cardinality`);
}

/**
 * Same evidence-scope invariant the 100-case validator enforces: authored
 * evidence never reaches the model for a product outside the turn's binding.
 */
function validateEvidenceScope(journeyId, turnId, context) {
  const bound = new Set(context.product_binding.product_ids);
  if (bound.size === 0) return;
  for (const ref of context.runtime_claim_refs) {
    const claim = runtimeClaims[ref];
    if (claim.scope.kind === "PRODUCT") {
      ok(bound.has(claim.scope.productId),
        `${journeyId}/${turnId}: runtime product scope ${ref}`);
    }
  }
  for (const ref of context.simulation_fact_refs) {
    const fact = simulationFacts[ref];
    if (fact.productId) {
      ok(bound.has(fact.productId), `${journeyId}/${turnId}: sim product scope ${ref}`);
    }
    if (fact.products) {
      ok(fact.products.every((id) => bound.has(id)),
        `${journeyId}/${turnId}: sim multi-product scope ${ref}`);
    }
  }
}

function validatePhaseProjection(journeyId, turnId, context) {
  const projection = materialization.context_projection;
  if (context.source_stage !== null) {
    const explicit = projection.explicit_source_stage[context.source_stage];
    ok(explicit, `${journeyId}/${turnId}: unsupported source_stage ${context.source_stage}`);
    ok(context.phase === explicit.phase,
      `${journeyId}/${turnId}: phase ${context.phase} disagrees with source_stage ${context.source_stage}`);
    return;
  }
  if (context.canonical_flags.includes("MEASUREMENTS_REQUIRED")) return;
  ok(context.phase === "BROWSING",
    `${journeyId}/${turnId}: abstract phase ${context.phase} needs explicit rule`);
}

function validateBuyingIntent(journeyId, turnId, intent) {
  ok(intent && typeof intent === "object", `${journeyId}/${turnId}: buying intent`);
  ok(decisions.has(intent.decision), `${journeyId}/${turnId}: buying decision`);
  ok(requestedActions.has(intent.requested_action),
    `${journeyId}/${turnId}: requested action`);
  ok(intent.quantity === null || Number.isInteger(intent.quantity),
    `${journeyId}/${turnId}: buying quantity`);
  ok(intent.evidence === null || typeof intent.evidence === "string",
    `${journeyId}/${turnId}: buying evidence`);
  ok(intent.decision === "COMMITTED" || intent.quantity === null,
    `${journeyId}/${turnId}: quantity without commitment`);
}

function validateCheckout(journeyId, turnId, checkout, sourceStage) {
  if (checkout === undefined) return;
  ok(sourceStage === "ORDER_PREVIEW",
    `${journeyId}/${turnId}: checkout completeness requires ORDER_PREVIEW`);
  ok(checkout && typeof checkout === "object", `${journeyId}/${turnId}: checkout completeness`);
  ok(JSON.stringify(Object.keys(checkout).sort()) === JSON.stringify([...checkoutKeys].sort()),
    `${journeyId}/${turnId}: checkout completeness fields`);
  ok(checkout.state === "REQUIRED" || checkout.state === "COMPLETE",
    `${journeyId}/${turnId}: checkout state`);
  ok(Array.isArray(checkout.missing_fields), `${journeyId}/${turnId}: missing checkout fields`);
  ok(new Set(checkout.missing_fields).size === checkout.missing_fields.length,
    `${journeyId}/${turnId}: duplicate checkout fields`);
  ok(checkout.missing_fields.every((field) => checkoutFields.has(field)),
    `${journeyId}/${turnId}: unknown checkout field`);
  ok(checkout.state === "COMPLETE"
    ? checkout.missing_fields.length === 0
    : checkout.missing_fields.length > 0,
  `${journeyId}/${turnId}: checkout state/field mismatch`);
}

/**
 * The authored next move is a behavioral contract, so a malformed expectation
 * fails at fixture-validation time instead of silently weakening review.
 */
function validateNextMove(journeyId, turnId, nextMove) {
  ok(nextMove && typeof nextMove === "object", `${journeyId}/${turnId}: next move`);
  ok(JSON.stringify(Object.keys(nextMove).sort()) ===
    JSON.stringify(["allowed_actions", "requirement"]),
  `${journeyId}/${turnId}: next move fields`);
  ok(requirements.has(nextMove.requirement), `${journeyId}/${turnId}: next move requirement`);
  const actions = nextMove.allowed_actions;
  ok(Array.isArray(actions) && actions.length > 0,
    `${journeyId}/${turnId}: next move actions`);
  ok(new Set(actions).size === actions.length,
    `${journeyId}/${turnId}: duplicate next move actions`);
  for (const action of actions) {
    ok(allowedActions.has(action),
      `${journeyId}/${turnId}: next move action ${action} outside corpus vocabulary`);
  }
  if (nextMove.requirement === "NONE") {
    ok(actions.length === 1 && actions[0] === "NONE",
      `${journeyId}/${turnId}: NONE requirement must allow only NONE`);
  }
  if (nextMove.requirement === "OPTIONAL") {
    ok(actions.includes("NONE") && actions.length > 1,
      `${journeyId}/${turnId}: OPTIONAL requirement needs NONE plus an action`);
  }
  if (nextMove.requirement === "REQUIRED") {
    ok(!actions.includes("NONE"),
      `${journeyId}/${turnId}: REQUIRED requirement must not allow NONE`);
  }
}

ok(bundle.schema === "TRACK_C_C2_SUPPLEMENTAL_JOURNEYS_V1", "journey schema");
ok(bundle.supplemental === true, "journeys must be supplemental");
ok(bundle.quality_population_delta === 0, "journeys must not change quality population");
// No executable per-turn evaluator consumes these expectations yet, so the
// bundle declares itself review material rather than regression evidence.
ok(bundle.evidence_class === "MANUAL_REVIEW_ONLY", "journeys must declare manual-review evidence class");
ok(Array.isArray(bundle.journeys) && bundle.journeys.length === 6, "journey count");
ok(new Set(bundle.journeys.map(({ id }) => id)).size === bundle.journeys.length,
  "duplicate journey ids");
ok(new Set(bundle.journeys.map(({ theme }) => theme)).size === themes.size,
  "duplicate journey themes");
for (const theme of themes) {
  ok(bundle.journeys.some((journey) => journey.theme === theme), `missing journey theme ${theme}`);
}

const turnIds = new Set();
for (const journey of bundle.journeys) {
  ok(themes.has(journey.theme), `${journey.id}: unknown theme`);
  ok(journey.execution?.behavior_simulation === "SUPPORTED",
    `${journey.id}: simulation-only execution`);
  ok(Array.isArray(journey.turns) && journey.turns.length >= 3 && journey.turns.length <= 8,
    `${journey.id}: turn count`);
  ok(!hasImplementationKey(journey), `${journey.id}: candidate implementation detail leaked into fixture`);

  const journeyOrigin = journey.turns[0]?.context?.origin;
  for (const [index, turn] of journey.turns.entries()) {
    ok(typeof turn.id === "string" && turn.id.length > 0, `${journey.id}: turn id`);
    ok(!turnIds.has(turn.id), `${journey.id}: duplicate turn id ${turn.id}`);
    turnIds.add(turn.id);
    ok(typeof turn.customer_message === "string" && turn.customer_message.trim().length > 0,
      `${journey.id}/${turn.id}: customer message`);
    const context = turn.context;
    ok(context && typeof context === "object", `${journey.id}/${turn.id}: context`);
    ok(context.origin === "ADVERTISEMENT" || context.origin === "ORGANIC",
      `${journey.id}/${turn.id}: origin`);
    // Acquisition origin is a conversation-level trusted signal: it cannot
    // change mid-journey, and only the opening turn can be first contact.
    ok(context.origin === journeyOrigin, `${journey.id}/${turn.id}: origin changes mid-journey`);
    ok(typeof context.first_meaningful_inbound === "boolean",
      `${journey.id}/${turn.id}: first meaningful inbound`);
    ok(index === 0 || context.first_meaningful_inbound === false,
      `${journey.id}/${turn.id}: first meaningful inbound after the opening turn`);
    validateBinding(journey.id, turn.id, context.product_binding);
    ok(Array.isArray(context.canonical_flags), `${journey.id}/${turn.id}: canonical flags`);
    for (const flag of context.canonical_flags) {
      ok(canonicalFlags.has(flag), `${journey.id}/${turn.id}: unknown canonical flag ${flag}`);
    }
    ok(Array.isArray(context.runtime_claim_refs), `${journey.id}/${turn.id}: runtime refs`);
    ok(Array.isArray(context.simulation_fact_refs), `${journey.id}/${turn.id}: simulation refs`);
    for (const ref of context.runtime_claim_refs) {
      ok(runtimeRefs.has(ref), `${journey.id}/${turn.id}: unknown runtime ref ${ref}`);
    }
    for (const ref of context.simulation_fact_refs) {
      ok(simulationRefs.has(ref), `${journey.id}/${turn.id}: unknown simulation ref ${ref}`);
    }
    validateEvidenceScope(journey.id, turn.id, context);
    validateBuyingIntent(journey.id, turn.id, context.buying_intent);
    validatePhaseProjection(journey.id, turn.id, context);
    validateCheckout(
      journey.id,
      turn.id,
      context.checkout_completeness,
      context.source_stage,
    );

    const expected = turn.expected;
    ok(expected && typeof expected === "object", `${journey.id}/${turn.id}: expected`);
    ok(Array.isArray(expected.required_behaviors) && expected.required_behaviors.length > 0,
      `${journey.id}/${turn.id}: required behaviors`);
    ok(Array.isArray(expected.forbidden_behaviors) && expected.forbidden_behaviors.length > 0,
      `${journey.id}/${turn.id}: forbidden behaviors`);
    validateNextMove(journey.id, turn.id, expected.next_move);
  }
}

console.log(JSON.stringify({
  ok: true,
  supplemental: true,
  evidenceClass: bundle.evidence_class,
  qualityPopulationDelta: 0,
  journeys: bundle.journeys.length,
  customerTurns: bundle.journeys.reduce((sum, journey) => sum + journey.turns.length, 0),
  themes: [...themes],
}, null, 2));
