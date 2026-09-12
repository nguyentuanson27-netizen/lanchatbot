import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { JOURNEY_THEMES, validateJourneyBundle } from "./journey-contract.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const read = (name) => JSON.parse(readFileSync(join(root, name), "utf8"));

const bundle = read("journeys.json");
const facts = read("facts.json");
const materialization = read("runtime-materialization.json");

// The authored next-move vocabulary is owned by the frozen 100-case corpus;
// journeys reuse it instead of inventing a parallel action namespace.
const corpusCases = Array.from({ length: 10 }, (_, index) =>
  read(`quality-${String(index + 1).padStart(2, "0")}.json`)
).flatMap((chunk) => chunk.cases);

const summary = validateJourneyBundle(bundle, {
  runtimeClaims: facts.runtime_claim_catalog,
  simulationFacts: facts.simulation_fact_catalog,
  materialization,
  allowedActions: new Set(
    corpusCases.flatMap(({ expected }) => expected.next_step.allowed_actions),
  ),
});

console.log(JSON.stringify({
  ok: true,
  supplemental: true,
  evidenceClass: bundle.evidence_class,
  qualityPopulationDelta: 0,
  ...summary,
  themes: [...JOURNEY_THEMES],
}, null, 2));
