import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL(".", import.meta.url));
const read = (name) => JSON.parse(readFileSync(join(root, name), "utf8"));
const ok = (value, message) => { if (!value) throw new Error(message); };

const bundle = read("journeys.json");
const facts = read("facts.json");
const runtimeRefs = new Set(Object.keys(facts.runtime_claim_catalog));
const simulationRefs = new Set(Object.keys(facts.simulation_fact_catalog));
const themes = new Set([
  "AD_LEAD_QUALIFICATION_COMMITMENT",
  "PRICE_OBJECTION_VALUE_COMMITMENT",
  "OUT_OF_STOCK_ALTERNATIVE_DISCOVERY",
  "COMPARE_SELECT_PRESERVE_REFERENT",
  "DELIVERY_DEADLINE_FEASIBILITY_DECISION",
  "CHECKOUT_CORRECTION_STOP",
]);
const checkoutFields = new Set(["FULL_NAME", "PHONE", "ADDRESS"]);
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

function validateCheckout(journeyId, turnId, checkout) {
  if (checkout === undefined) return;
  ok(checkout && typeof checkout === "object", `${journeyId}/${turnId}: checkout completeness`);
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

ok(bundle.schema === "TRACK_C_C2_SUPPLEMENTAL_JOURNEYS_V1", "journey schema");
ok(bundle.supplemental === true, "journeys must be supplemental");
ok(bundle.quality_population_delta === 0, "journeys must not change quality population");
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

  for (const turn of journey.turns) {
    ok(typeof turn.id === "string" && turn.id.length > 0, `${journey.id}: turn id`);
    ok(!turnIds.has(turn.id), `${journey.id}: duplicate turn id ${turn.id}`);
    turnIds.add(turn.id);
    ok(typeof turn.customer_message === "string" && turn.customer_message.trim().length > 0,
      `${journey.id}/${turn.id}: customer message`);
    const context = turn.context;
    ok(context && typeof context === "object", `${journey.id}/${turn.id}: context`);
    ok(context.origin === "ADVERTISEMENT" || context.origin === "ORGANIC",
      `${journey.id}/${turn.id}: origin`);
    ok(typeof context.first_meaningful_inbound === "boolean",
      `${journey.id}/${turn.id}: first meaningful inbound`);
    validateBinding(journey.id, turn.id, context.product_binding);
    ok(Array.isArray(context.canonical_flags), `${journey.id}/${turn.id}: canonical flags`);
    ok(Array.isArray(context.runtime_claim_refs), `${journey.id}/${turn.id}: runtime refs`);
    ok(Array.isArray(context.simulation_fact_refs), `${journey.id}/${turn.id}: simulation refs`);
    for (const ref of context.runtime_claim_refs) {
      ok(runtimeRefs.has(ref), `${journey.id}/${turn.id}: unknown runtime ref ${ref}`);
    }
    for (const ref of context.simulation_fact_refs) {
      ok(simulationRefs.has(ref), `${journey.id}/${turn.id}: unknown simulation ref ${ref}`);
    }
    validateCheckout(journey.id, turn.id, context.checkout_completeness);

    const expected = turn.expected;
    ok(expected && typeof expected === "object", `${journey.id}/${turn.id}: expected`);
    ok(Array.isArray(expected.required_behaviors) && expected.required_behaviors.length > 0,
      `${journey.id}/${turn.id}: required behaviors`);
    ok(Array.isArray(expected.forbidden_behaviors) && expected.forbidden_behaviors.length > 0,
      `${journey.id}/${turn.id}: forbidden behaviors`);
    ok(expected.next_move && typeof expected.next_move === "object",
      `${journey.id}/${turn.id}: next move`);
  }
}

console.log(JSON.stringify({
  ok: true,
  supplemental: true,
  qualityPopulationDelta: 0,
  journeys: bundle.journeys.length,
  customerTurns: bundle.journeys.reduce((sum, journey) => sum + journey.turns.length, 0),
  themes: [...themes],
}, null, 2));
