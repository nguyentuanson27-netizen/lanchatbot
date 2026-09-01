#!/usr/bin/env node
import { fileURLToPath } from "node:url";

const DELIMITERS = new Set(["{", "}", "(", ")", "[", "]"]);

function tokenizePgNodeTree(source) {
  const tokens = [];
  let offset = 0;
  while (offset < source.length) {
    if (/\s/u.test(source[offset])) {
      offset += 1;
      continue;
    }
    const character = source[offset];
    if (DELIMITERS.has(character)) {
      tokens.push(character);
      offset += 1;
      continue;
    }
    if (character === '"') {
      const start = offset;
      offset += 1;
      let escaped = false;
      while (offset < source.length) {
        const current = source[offset];
        offset += 1;
        if (escaped) {
          escaped = false;
        } else if (current === "\\") {
          escaped = true;
        } else if (current === '"') {
          break;
        }
      }
      if (source[offset - 1] !== '"') throw new Error("unterminated pg_node_tree string");
      tokens.push(source.slice(start, offset));
      continue;
    }
    const start = offset;
    while (
      offset < source.length
      && !/\s/u.test(source[offset])
      && !DELIMITERS.has(source[offset])
    ) {
      offset += 1;
    }
    if (start === offset) throw new Error(`unsupported pg_node_tree token at ${offset}`);
    tokens.push(source.slice(start, offset));
  }
  return tokens;
}

function parsePgNodeTree(source) {
  const tokens = tokenizePgNodeTree(source);
  let position = 0;

  const parseValue = () => {
    const token = tokens[position];
    if (token === undefined) throw new Error("unexpected end of pg_node_tree");
    if (token === "{") return parseNode();
    if (token === "(") return parseSequence("list", ")");
    if (token === "[") return parseSequence("bytes", "]");
    if (token === "}" || token === ")" || token === "]") {
      throw new Error(`unexpected pg_node_tree delimiter ${token}`);
    }
    position += 1;
    return { kind: "atom", value: token };
  };

  const parseSequence = (kind, closingToken) => {
    position += 1;
    const values = [];
    while (tokens[position] !== closingToken) {
      if (tokens[position] === undefined) throw new Error(`unterminated pg_node_tree ${kind}`);
      values.push(parseValue());
    }
    position += 1;
    return { kind, values };
  };

  const parseNode = () => {
    position += 1;
    const type = tokens[position];
    if (type === undefined || type.startsWith(":")) throw new Error("pg_node_tree node type missing");
    position += 1;
    const fields = [];
    while (tokens[position] !== "}") {
      const field = tokens[position];
      if (field === undefined) throw new Error("unterminated pg_node_tree node");
      if (!field.startsWith(":")) throw new Error(`pg_node_tree field missing before ${field}`);
      position += 1;
      const fieldName = field.slice(1);
      const fieldValue = parseValue();
      if (fieldName === "constvalue" && fieldValue.kind === "atom" && tokens[position] === "[") {
        fields.push([fieldName, {
          kind: "constvalue",
          length: fieldValue,
          bytes: parseValue(),
        }]);
      } else {
        fields.push([fieldName, fieldValue]);
      }
    }
    position += 1;
    return { kind: "node", type, fields };
  };

  const root = parseValue();
  if (position !== tokens.length) throw new Error("trailing pg_node_tree tokens");
  if (root.kind !== "node") throw new Error("pg_node_tree root must be a node");
  return root;
}

function normalizePgNode(value) {
  if (value.kind === "atom") return value;
  if (value.kind === "constvalue") {
    return {
      ...value,
      length: normalizePgNode(value.length),
      bytes: normalizePgNode(value.bytes),
    };
  }
  if (value.kind === "list" || value.kind === "bytes") {
    return { ...value, values: value.values.map(normalizePgNode) };
  }

  const fields = value.fields
    .filter(([name]) => name !== "location")
    .map(([name, fieldValue]) => [name, normalizePgNode(fieldValue)]);
  const normalized = { ...value, fields };
  if (value.type !== "BOOLEXPR") return normalized;

  const boolop = fields.find(([name]) => name === "boolop")?.[1];
  const args = fields.find(([name]) => name === "args")?.[1];
  if (
    boolop?.kind !== "atom"
    || !["and", "or"].includes(boolop.value)
    || args?.kind !== "list"
  ) {
    return normalized;
  }

  const flattened = [];
  for (const argument of args.values) {
    if (argument.kind !== "node" || argument.type !== "BOOLEXPR") {
      flattened.push(argument);
      continue;
    }
    const childBoolop = argument.fields.find(([name]) => name === "boolop")?.[1];
    const childArgs = argument.fields.find(([name]) => name === "args")?.[1];
    const childFields = argument.fields.map(([name]) => name);
    if (
      childBoolop?.kind === "atom"
      && childBoolop.value === boolop.value
      && childArgs?.kind === "list"
      && childFields.length === 2
      && childFields.includes("boolop")
      && childFields.includes("args")
    ) {
      flattened.push(...childArgs.values);
    } else {
      flattened.push(argument);
    }
  }
  return {
    ...normalized,
    fields: fields.map(([name, fieldValue]) => (
      name === "args" ? [name, { ...fieldValue, values: flattened }] : [name, fieldValue]
    )),
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const fields = Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`,
    );
    return `{${fields.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function canonicalizePgNodeTree(source) {
  if (typeof source !== "string" || source.length === 0) {
    throw new Error("CHECK pg_node_tree is missing");
  }
  return stableStringify(normalizePgNode(parsePgNodeTree(source)));
}

function canonicalizeCatalogRow(row) {
  if (
    row === null
    || typeof row !== "object"
    || typeof row.objectKind !== "string"
    || typeof row.objectName !== "string"
    || row.identity === null
    || typeof row.identity !== "object"
  ) {
    throw new Error("catalog row is malformed");
  }
  if (row.objectKind !== "CONSTRAINT") return row;

  const identity = { ...row.identity };
  if (identity.type === "c") {
    if (
      typeof identity.definition !== "string"
      || typeof identity.checkNodeTree !== "string"
      || typeof identity.owningSchema !== "string"
      || typeof identity.owningTable !== "string"
      || typeof identity.validated !== "boolean"
      || typeof identity.deferrable !== "boolean"
      || typeof identity.deferred !== "boolean"
    ) {
      throw new Error(`CHECK constraint identity is incomplete: ${row.objectName}`);
    }
    identity.definition = `CHECK_AST_V1:${canonicalizePgNodeTree(identity.checkNodeTree)}`;
    delete identity.checkNodeTree;
  } else if (identity.checkNodeTree !== null) {
    throw new Error(`non-CHECK constraint has a node tree: ${row.objectName}`);
  }
  return { ...row, identity };
}

export function canonicalizeCatalogLines(source) {
  const lines = source.split(/\r?\n/u).filter((line) => line.length > 0);
  if (lines.length === 0) throw new Error("catalog query returned no rows");
  return `${lines.map((line) => stableStringify(canonicalizeCatalogRow(JSON.parse(line)))).join("\n")}\n`;
}

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  process.stdout.write(canonicalizeCatalogLines(Buffer.concat(chunks).toString("utf8")));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
