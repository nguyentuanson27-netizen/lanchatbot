import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AgentBuyingIntentV1Schema } from "@lana/contracts";

const EVAL_ROOT = new URL("../evals/track-c-c2/v2/", import.meta.url);
const readJson = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(name, EVAL_ROOT), "utf8")) as T;

// Resolved through a non-literal specifier so the fixture contract stays a
// plain eval-owned module instead of being pulled into the worker tsconfig.
const { validateJourneyBundle } = await import(
  new URL("journey-contract.mjs", EVAL_ROOT).href
) as {
  validateJourneyBundle: (
    bundle: unknown,
    deps: Readonly<{
      runtimeClaims: unknown;
      simulationFacts: unknown;
      materialization: unknown;
      allowedActions: ReadonlySet<string>;
    }>,
  ) => { journeys: number; customerTurns: number };
};

type JourneyBundle = {
  journeys: {
    id: string;
    turns: {
      id: string;
      context: {
        product_binding: { status: string; product_ids: string[] };
        runtime_claim_refs: string[];
        simulation_fact_refs: string[];
        buying_intent: {
          decision: string;
          requested_action: string;
          quantity: number | null;
          evidence: string | null;
        };
      };
    }[];
  }[];
};

const facts = readJson<{
  runtime_claim_catalog: Record<string, unknown>;
  simulation_fact_catalog: Record<string, unknown>;
}>("facts.json");
const materialization = readJson<unknown>("runtime-materialization.json");
const allowedActions = new Set(
  Array.from({ length: 10 }, (_, index) =>
    readJson<{ cases: { expected: { next_step: { allowed_actions: string[] } } }[] }>(
      `quality-${String(index + 1).padStart(2, "0")}.json`,
    )
  ).flatMap(({ cases }) => cases)
    .flatMap(({ expected }) => expected.next_step.allowed_actions),
);

function validate(bundle: unknown) {
  return validateJourneyBundle(bundle, {
    runtimeClaims: facts.runtime_claim_catalog,
    simulationFacts: facts.simulation_fact_catalog,
    materialization,
    allowedActions,
  });
}

function authored(): JourneyBundle {
  return readJson<JourneyBundle>("journeys.json");
}

function firstTurnContext(bundle: JourneyBundle) {
  const context = bundle.journeys[0]?.turns[0]?.context;
  if (context === undefined) throw new Error("authored bundle has no first turn");
  return context;
}

type FixtureIntent = JourneyBundle["journeys"][number]["turns"][number]["context"]["buying_intent"];

function bundleWithIntent(intent: FixtureIntent): JourneyBundle {
  const bundle = authored();
  firstTurnContext(bundle).buying_intent = intent;
  return bundle;
}

const canonicalIntent = (intent: FixtureIntent) => ({
  decision: intent.decision,
  requestedAction: intent.requested_action,
  quantity: intent.quantity,
  evidenceText: intent.evidence,
  confidence: 1,
});

const intentCases: readonly (readonly [string, FixtureIntent])[] = [
  ["NONE with a payment action", {
    decision: "NONE",
    requested_action: "PROCEED_TO_PAYMENT",
    quantity: null,
    evidence: null,
  }],
  ["NONE carrying evidence", {
    decision: "NONE",
    requested_action: "NONE",
    quantity: null,
    evidence: "customer said something",
  }],
  ["NONE carrying a quantity", {
    decision: "NONE",
    requested_action: "NONE",
    quantity: 1,
    evidence: null,
  }],
  ["CONSIDERING with a cart action", {
    decision: "CONSIDERING",
    requested_action: "ADD_TO_CART",
    quantity: null,
    evidence: "customer is still comparing",
  }],
  ["CONSIDERING with a quantity", {
    decision: "CONSIDERING",
    requested_action: "NONE",
    quantity: 2,
    evidence: "customer is still comparing",
  }],
  ["CONSIDERING without evidence", {
    decision: "CONSIDERING",
    requested_action: "NONE",
    quantity: null,
    evidence: null,
  }],
  ["NEGATED without evidence", {
    decision: "NEGATED",
    requested_action: "NONE",
    quantity: null,
    evidence: null,
  }],
  ["COMMITTED without a requested action", {
    decision: "COMMITTED",
    requested_action: "NONE",
    quantity: 1,
    evidence: "Chị chốt nhé.",
  }],
  ["COMMITTED with quantity zero", {
    decision: "COMMITTED",
    requested_action: "PROCEED_TO_PAYMENT",
    quantity: 0,
    evidence: "Chị chốt nhé.",
  }],
  ["COMMITTED with quantity above the canonical range", {
    decision: "COMMITTED",
    requested_action: "PROCEED_TO_PAYMENT",
    quantity: 21,
    evidence: "Chị chốt nhé.",
  }],
  ["COMMITTED with blank evidence", {
    decision: "COMMITTED",
    requested_action: "PROCEED_TO_PAYMENT",
    quantity: 1,
    evidence: "   ",
  }],
] as const;

const validIntents: readonly FixtureIntent[] = [
  { decision: "NONE", requested_action: "NONE", quantity: null, evidence: null },
  {
    decision: "CONSIDERING",
    requested_action: "NONE",
    quantity: null,
    evidence: "customer is comparing two products",
  },
  {
    decision: "NEGATED",
    requested_action: "NONE",
    quantity: null,
    evidence: "customer declines",
  },
  {
    decision: "COMMITTED",
    requested_action: "PROCEED_TO_PAYMENT",
    quantity: 1,
    evidence: "Chị chốt nhé.",
  },
];

describe("Track C C2 authored journey contract", () => {
  it("accepts the authored supplemental journeys", () => {
    expect(validate(authored())).toEqual({ journeys: 6, customerTurns: 18 });
  });

  it("rejects product-scoped runtime evidence on an unresolved binding", () => {
    const bundle = authored();
    const context = firstTurnContext(bundle);
    expect(context.runtime_claim_refs.length).toBeGreaterThan(0);
    context.product_binding = { status: "UNRESOLVED", product_ids: [] };

    expect(() => validate(bundle)).toThrow(/runtime product scope/u);
  });

  it("rejects product-scoped simulation evidence on a not-required binding", () => {
    const bundle = authored();
    const context = firstTurnContext(bundle);
    expect(context.simulation_fact_refs.length).toBeGreaterThan(0);
    context.product_binding = { status: "NOT_REQUIRED", product_ids: [] };
    context.runtime_claim_refs = [];

    expect(() => validate(bundle)).toThrow(/sim product scope/u);
  });

  it("rejects evidence for a product outside a resolved binding", () => {
    const runtimeBundle = authored();
    firstTurnContext(runtimeBundle).product_binding = {
      status: "RESOLVED",
      product_ids: ["SV9031"],
    };
    expect(() => validate(runtimeBundle)).toThrow(/runtime product scope/u);

    const simulationBundle = authored();
    const context = firstTurnContext(simulationBundle);
    context.product_binding = { status: "RESOLVED", product_ids: ["SV9031"] };
    context.runtime_claim_refs = [];
    expect(() => validate(simulationBundle)).toThrow(/sim product scope/u);
  });

  it("rejects multi-product simulation evidence that escapes the binding", () => {
    const bundle = authored();
    const context = firstTurnContext(bundle);
    context.runtime_claim_refs = [];
    context.simulation_fact_refs = ["SF_OCCASION"];

    expect(() => validate(bundle)).toThrow(/sim multi-product scope/u);
  });

  it.each(intentCases)("rejects buying intent: %s", (_label, intent) => {
    expect(() => validate(bundleWithIntent(intent))).toThrow();
  });

  it("accepts every canonical-legal buying intent shape", () => {
    for (const intent of validIntents) {
      expect(() => validate(bundleWithIntent(intent))).not.toThrow();
    }
  });

  it("agrees with AgentBuyingIntentV1Schema on every case", () => {
    const cases = [...intentCases.map(([, intent]) => intent), ...validIntents];
    for (const intent of cases) {
      const canonicalAccepts = AgentBuyingIntentV1Schema
        .safeParse(canonicalIntent(intent)).success;
      let fixtureAccepts = true;
      try {
        validate(bundleWithIntent(intent));
      } catch {
        fixtureAccepts = false;
      }
      expect({ intent, fixtureAccepts })
        .toEqual({ intent, fixtureAccepts: canonicalAccepts });
    }
  });
});
