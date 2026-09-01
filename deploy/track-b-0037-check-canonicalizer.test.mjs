import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeCatalogLines,
  canonicalizePgNodeTree,
} from "./track-b-0037-check-canonicalizer.mjs";

const operand = (name, value = "1", operator = "96", type = "23") =>
  `{OPEXPR :opno ${operator} :opfuncid 65 :opresulttype 16 :opretset false :opcollid 0 :inputcollid 0 :args ({VAR :varno 1 :varattno ${name} :vartype ${type} :vartypmod -1 :varcollid 0 :varlevelsup 0 :varnosyn 1 :varattnosyn ${name} :location 12} {CONST :consttype ${type} :consttypmod -1 :constcollid 0 :constlen 4 :constbyval true :constisnull false :location 20 :constvalue 4 [ ${value} 0 0 0 0 0 0 0 ]}) :location 18}`;

const bool = (kind, args, location = 1) =>
  `{BOOLEXPR :boolop ${kind} :args (${args.join(" ")}) :location ${location}}`;

test("flattens nested associative PostgreSQL AND nodes and ignores parser locations", () => {
  const nested = bool("and", [bool("and", [operand("1"), operand("2", "2")], 41), operand("3", "3")], 7);
  const flat = bool("and", [operand("1"), operand("2", "2"), operand("3", "3")], 99);

  assert.equal(canonicalizePgNodeTree(nested), canonicalizePgNodeTree(flat));
});

test("flattens nested associative PostgreSQL OR nodes without crossing an AND boundary", () => {
  const nested = bool("or", [bool("or", [operand("1"), operand("2", "2")]), operand("3", "3")]);
  const flat = bool("or", [operand("1"), operand("2", "2"), operand("3", "3")]);
  const changedStructure = bool("or", [operand("1"), bool("and", [operand("2", "2"), operand("3", "3")])]);

  assert.equal(canonicalizePgNodeTree(nested), canonicalizePgNodeTree(flat));
  assert.notEqual(canonicalizePgNodeTree(flat), canonicalizePgNodeTree(changedStructure));
});

test("preserves operator, operand, literal, cast/type, null, function, and collation drift", () => {
  const baseline = bool("and", [operand("1"), operand("2", "2")]);
  const drifts = [
    bool("and", [operand("1", "1", "97"), operand("2", "2")]),
    bool("and", [operand("4"), operand("2", "2")]),
    bool("and", [operand("1", "9"), operand("2", "2")]),
    bool("and", [operand("1", "1", "96", "20"), operand("2", "2")]),
    baseline.replace(":constisnull false", ":constisnull true"),
    baseline.replace(":opfuncid 65", ":opfuncid 66"),
    baseline.replace(":inputcollid 0", ":inputcollid 100"),
  ];

  for (const drift of drifts) {
    assert.notEqual(canonicalizePgNodeTree(baseline), canonicalizePgNodeTree(drift));
  }
});

test("catalog canonicalization retains constraint ownership and enforcement metadata", () => {
  const nodeTree = bool("and", [operand("1"), operand("2", "2")]);
  const row = (overrides = {}) => ({
    objectKind: "CONSTRAINT",
    objectName: "public.df13_commerce_cutover_fences.scope_ck",
    identity: {
      checkNodeTree: nodeTree,
      deferred: false,
      deferrable: false,
      definition: "CHECK ((a = 1) AND (b = 2))",
      owningSchema: "public",
      owningTable: "df13_commerce_cutover_fences",
      type: "c",
      validated: true,
      ...overrides,
    },
  });
  const encoded = (value) => `${JSON.stringify(value)}\n`;
  const baseline = canonicalizeCatalogLines(encoded(row()));

  assert.notEqual(baseline, canonicalizeCatalogLines(encoded({ ...row(), objectName: "public.other.scope_ck" })));
  assert.notEqual(baseline, canonicalizeCatalogLines(encoded(row({ validated: false }))));
  assert.notEqual(baseline, canonicalizeCatalogLines(encoded(row({ deferrable: true }))));
  assert.notEqual(baseline, canonicalizeCatalogLines(encoded(row({ deferred: true }))));
  assert.notEqual(baseline, canonicalizeCatalogLines(encoded(row({ type: "u", checkNodeTree: null }))));
});

test("fails closed on malformed node trees and incomplete CHECK identities", () => {
  assert.throws(() => canonicalizePgNodeTree("{BOOLEXPR :boolop and"));
  assert.throws(() => canonicalizePgNodeTree("{UNKNOWN :location 1} trailing"));
  assert.throws(() => canonicalizeCatalogLines(`${JSON.stringify({
    objectKind: "CONSTRAINT",
    objectName: "public.t.c",
    identity: { definition: "CHECK (true)", type: "c", validated: true },
  })}\n`));
});
