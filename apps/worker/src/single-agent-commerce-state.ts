import { BodyMeasurementV1Schema, CustomerProfileV1Schema, type MeasurementKind } from "@lana/contracts";
import { buildProtectedClaimsFromVerifiedFactsV1, createVerifiedSizeRecommendationClaim, mergeCustomerProfile,
  recommendSize, type CustomerProfileMergeState, type CustomerProfilePatch, type SizeEngineInput,
  evaluateShopPolicy, type ShopPolicyEvaluationInput } from "@lana/business-tools";
import { buildReadOnlyContext, commerceHash } from "./single-agent-commerce-read-only-context.js";
import { toolArgs, type CommerceScope, type CommerceToolCall, type CommerceToolResult } from "./single-agent-commerce-read-only-tools.js";
import type { CommerceTools } from "./single-agent-commerce-read-only.js";
import type { TrustedContext } from "./single-agent-semantic-verifier-boundary.js";
import type { PostgresRealtimeRuntimeStore, RealtimeInboxBatchGuard } from "@lana/database";
import { createHash } from "node:crypto";

export interface CustomerStatePort {
  read(): Promise<CustomerProfileMergeState>;
  compareAndSwap(expectedRevision: number, next: CustomerProfileMergeState): Promise<boolean>;
}
/** Reuses current table/expiry/CAS implementation; callers supply a scoped initial-profile factory. */
export function createRealtimeCustomerStatePort(store: Pick<PostgresRealtimeRuntimeStore,
  "loadOrCreateCustomerProfile" | "compareAndSwapCustomerProfile">, scope: CommerceScope,
  create: () => CustomerProfileMergeState, clock: () => Date,
  authority?: { read: () => Promise<Pick<CommerceScope, "permission" | "bindingVersion"> & { stateVersion: number }>;
    inboxBatchGuard: RealtimeInboxBatchGuard }): CustomerStatePort {
  return { async read() {
    const row = await store.loadOrCreateCustomerProfile<CustomerProfileMergeState["profile"], CustomerProfileMergeState["fieldEvidence"]>(
      scope.pageId, scope.customerHash, () => { const initial = create(); return { ...initial, revision: initial.profile.revision }; }, clock());
    if (row.pageId !== scope.pageId || row.customerHash !== scope.customerHash) throw new Error("PROFILE_SCOPE");
    return { profile: CustomerProfileV1Schema.parse(row.profile), fieldEvidence: row.fieldEvidence };
  }, async compareAndSwap(expected, next) {
    if (!authority) return store.compareAndSwapCustomerProfile(scope.pageId, scope.customerHash, expected, { ...next, revision: next.profile.revision }, clock());
    const current = await authority.read();
    if (!current.permission || current.bindingVersion !== scope.bindingVersion) return false;
    return store.compareAndSwapCustomerProfile(scope.pageId, scope.customerHash, expected,
      { ...next, revision: next.profile.revision }, clock(), { conversationId: scope.conversationId,
        expectedStateVersion: current.stateVersion, inboxBatchGuard: authority.inboxBatchGuard,
        sourceMessageIdHash: createHash("sha256").update(scope.sourceMessageId, "utf8").digest("hex") });
  } };
}
const measurementKinds = ["HEIGHT_CM", "WEIGHT_KG", "BUST_CM", "WAIST_CM", "HIPS_CM"] as const;
const fitValues = CustomerProfileV1Schema.innerType().shape.fitPreference.unwrap().options;
const preferenceKinds = ["colors", "styles", "materials"] as const;
const measurementReasons: Record<string, string> = {
  MEASUREMENT_SOURCE: "INVALID_QUOTE_OR_SOURCE",
  MEASUREMENT_QUOTE_NOT_FOUND: "QUOTE_NOT_IN_CURRENT_MESSAGE",
  MEASUREMENT_QUOTE_AMBIGUOUS: "QUOTE_NOT_UNIQUE",
  MEASUREMENT_SCALAR: "QUOTE_MUST_CONTAIN_ONE_VALUE",
  MEASUREMENT_TOKEN: "QUOTE_MUST_CONTAIN_COMPLETE_NUMBER",
  MEASUREMENT_UNIT: "UNIT_DOES_NOT_MATCH_FIELD",
  MEASUREMENT_VALUE: "VALUE_DOES_NOT_MATCH_QUOTE",
};
export interface CustomerStateSourceMessage { text: string; sourceMessageId: string; observedAt: string }
/** Numeric copy check only; the owner still interprets field, referent and correction meaning. */
function measurementSource(sources: readonly CustomerStateSourceMessage[], quote: unknown, kind: MeasurementKind,
  value: unknown, scope: CommerceScope, now: Date) {
  if (typeof quote !== "string" || !quote.trim() || quote.length > 160 || typeof value !== "number") throw new Error("MEASUREMENT_SOURCE");
  const matches = sources.flatMap(source => {
    const index = source.text.indexOf(quote);
    return index < 0 ? [] : source.text.indexOf(quote, index + 1) >= 0 ? [{ source, index }, { source, index }] : [{ source, index }];
  });
  if (!matches.length) throw new Error("MEASUREMENT_QUOTE_NOT_FOUND");
  if (matches.length !== 1) throw new Error("MEASUREMENT_QUOTE_AMBIGUOUS");
  const { source, index } = matches[0]!;
  const numbers = [...quote.matchAll(/[+-]?\d+(?:[.,]\d+)?/gu)];
  if (!numbers.length) throw new Error("MEASUREMENT_SCALAR");
  const first = index + numbers[0]!.index!, last = numbers.at(-1)!, lastEnd = index + last.index! + last[0].length;
  if (/[\d+-]/u.test(source.text[first - 1] ?? "") || /\d/u.test(source.text[lastEnd] ?? "") ||
    (/[.,]/u.test(source.text[first - 1] ?? "") && /\d/u.test(source.text[first - 2] ?? "")) ||
    (/[.,]/u.test(source.text[lastEnd] ?? "") && /\d/u.test(source.text[lastEnd + 1] ?? ""))) throw new Error("MEASUREMENT_TOKEN");
  const compact = quote.match(/([12])\s*m\s*(\d{1,2})(?!\d)/iu);
  let scalar: number;
  if (kind === "HEIGHT_CM" && numbers.length === 2 && compact && compact.index === numbers[0]!.index &&
    compact.index! + compact[0].length === numbers[1]!.index! + numbers[1]![0].length) {
    scalar = Number(compact[1]) * 100 + Number(compact[2]!.padEnd(2, "0"));
  } else {
    if (numbers.length !== 1) throw new Error("MEASUREMENT_SCALAR");
    const number = numbers[0]!, start = index + number.index!, end = start + number[0].length;
    const unit = source.text.slice(end).match(/^\s*(cm|kg|m)(?![\p{L}\p{N}])/iu)?.[1]?.toLowerCase();
    scalar = Number(number[0].replace(",", "."));
    if (unit === "m" && kind === "HEIGHT_CM") scalar *= 100;
    else if ((unit === "kg" && kind !== "WEIGHT_KG") || (unit === "cm" && kind === "WEIGHT_KG") || unit === "m") throw new Error("MEASUREMENT_UNIT");
  }
  if (scalar !== value) throw new Error("MEASUREMENT_VALUE");
  if (!source.sourceMessageId || !Number.isFinite(Date.parse(source.observedAt)) ||
    Date.parse(source.observedAt) > now.getTime()) throw new Error("MEASUREMENT_SOURCE");
  return { source: "CUSTOMER_MESSAGE" as const, sourceEventHash: commerceHash({ pageId: scope.pageId,
    conversationId: scope.conversationId, sourceMessageId: source.sourceMessageId }), observedAt: source.observedAt, confidence: 1 };
}

export async function createCustomerStateTools(input: {
  base: CommerceTools; scope: CommerceScope; store: CustomerStatePort; clock: () => Date;
  sizeInput: (subjectRef: string) => Promise<Omit<SizeEngineInput, "profile" | "generatedAt">>;
  quoteInput?: () => Promise<ShopPolicyEvaluationInput>;
  sourceMessages?: readonly CustomerStateSourceMessage[];
}): Promise<CommerceTools> {
  let effective = await input.store.read(), blockedDependencies = false;
  let commitUnconfirmed = false;
  const invalidateCommit = () => { commitUnconfirmed = true; blockedDependencies = true; committedUpdate = undefined; sizes.clear(); cartQuote = undefined; quoteRead = false; };
  const pendingFields = new Set<string>();
  const blocked = () => blockedDependencies || pendingFields.size > 0;
  const sizes = new Map<string, { claims: readonly unknown[]; fingerprint: string | undefined; profileHash: string; sourceHash: string }>();
  let cartQuote: unknown;
  let quoteRead = false;
  let committedUpdate: { hash: string; receipt: TrustedContext["effectReceipts"][number] } | undefined;
  const profileHash = () => commerceHash(effective.profile);
  const snapshot = (): TrustedContext => {
    const base = input.base.snapshot();
    const valid = [...sizes.entries()].filter(([, s]) => !blocked() && s.profileHash === profileHash());
    const update = !blocked() && committedUpdate?.hash === commerceHash(effective) ? committedUpdate.receipt : undefined;
    return buildReadOnlyContext({ ...base, state: { ...base.state,
      customerProfileId: effective.profile.profileId, customerProfileRevision: effective.profile.revision,
      customerMeasurements: effective.profile.measurements.map(m => ({ kind: m.kind, value: m.value })),
      fitPreference: effective.profile.fitPreference, preferences: effective.profile.preferences,
      ...(blocked() ? { customerStateUpdatePending: true } : {}),
      sizeMeasurementFingerprints: Object.fromEntries(valid.filter(([, s]) => s.fingerprint).map(([id, s]) => [id, s.fingerprint])),
      ...(!blocked() && cartQuote ? { cartQuote } : {}) },
      subjects: [...base.boundSubjects, ...(update ? [{ ref: effective.profile.profileId, kind: "CUSTOMER_PROFILE", label: `Thông tin tư vấn, phiên bản ${effective.profile.revision}`, bindingVersion: base.state.bindingVersion }] : [])], products: base.runtimeProducts ?? [], policies: base.policyLiterals,
      receipts: [...base.effectReceipts, ...(update ? [{ ...update, stateRevision: base.state.revision }] : [])], claims: [...base.protectedClaims.filter(c => (c as { type: string }).type !== "SIZE_FIT"), ...valid.flatMap(([, s]) => s.claims)] });
  };
  async function apply(args: unknown): Promise<CommerceToolResult> {
    if (commitUnconfirmed) return { status: "REJECTED", reason: "STATE_COMMIT_UNCONFIRMED" };
    const a = toolArgs(args, ["ops"]);
    if (!a || !Array.isArray(a.ops) || !a.ops.length || a.ops.length > 8) return { status: "REJECTED", reason: "STATE_ARGUMENTS" };
    const observedAt = input.scope.sourceObservedAt;
    if (!observedAt || !Number.isFinite(Date.parse(observedAt)) || Date.parse(observedAt) > input.clock().getTime()) return { status: "REJECTED", reason: "SOURCE_TIME" };
    let current: CustomerProfileMergeState;
    try { current = await input.store.read(); } catch { return {status:"UNAVAILABLE",reason:"STATE_SOURCE_UNAVAILABLE"}; }
    if (commerceHash(current) !== commerceHash(effective)) { blockedDependencies = true; return { status: "REJECTED", reason: "STATE_CONFLICT" }; }
    const evidence = { source: "CUSTOMER_MESSAGE" as const, sourceEventHash: commerceHash({ pageId: input.scope.pageId,
      conversationId: input.scope.conversationId, sourceMessageId: input.scope.sourceMessageId }), observedAt, confidence: 1 };
    const patch: CustomerProfilePatch = { profileId: current.profile.profileId, expectedRevision: current.profile.revision };
    const measurements = [], clears: MeasurementKind[] = [], absentClears: MeasurementKind[] = [], fields = new Set<string>();
    const fieldErrors: { field: string; reason: string; allowedValues?: readonly string[]; hint?: string }[] = [];
    for (const raw of a.ops) {
      const op = toolArgs(raw, ["op", "field", "value", "sourceQuote"]);
      if (!op || !["SET", "REPLACE", "CLEAR"].includes(String(op.op)) || typeof op.field !== "string" ||
        fields.has(op.field) || (op.op === "CLEAR" && Object.hasOwn(op, "value"))) throw new Error("STATE_OPERATION");
      fields.add(op.field);
      if (op.field.startsWith("measurements.")) {
        const kind = op.field.slice("measurements.".length) as MeasurementKind;
        if (!(measurementKinds as readonly string[]).includes(kind)) throw new Error("STATE_FIELD");
        const old = current.profile.measurements.find(m => m.kind === kind);
        if (op.op === "CLEAR") {
          if (old) { clears.push(kind); measurements.push({ ...old, provenance: evidence }); }
          else {
            const previous = current.fieldEvidence[op.field];
            if (!previous || Date.parse(previous.observedAt) < Date.parse(observedAt)) absentClears.push(kind);
            else if (previous.sourceEventHash !== evidence.sourceEventHash) throw new Error("STALE_CLEAR");
          }
        }
        else {
          try {
            const parsed = BodyMeasurementV1Schema.safeParse({ kind, value: op.value,
              provenance: measurementSource(input.sourceMessages ?? [], op.sourceQuote, kind, op.value, input.scope, input.clock()) });
            if (parsed.success) measurements.push(parsed.data);
            else fieldErrors.push({field:op.field,reason:"INVALID_DOMAIN_VALUE",hint:parsed.error.issues[0]!.message.slice(0,160)});
          } catch (error) {
            fieldErrors.push({ field: op.field, reason: error instanceof Error && Object.hasOwn(measurementReasons, error.message) ? measurementReasons[error.message]! : "INVALID_DOMAIN_VALUE" });
          }
        }
      } else if (op.field === "fitPreference") {
        const value = op.op === "CLEAR" ? null : op.value;
        const parsed = CustomerProfileV1Schema.safeParse({ ...current.profile, fitPreference: value });
        if (!parsed.success) fieldErrors.push({ field: op.field, reason: "INVALID_DOMAIN_VALUE", allowedValues: fitValues });
        else if (op.op !== "CLEAR" && (typeof op.sourceQuote !== "string" || !op.sourceQuote.trim() || op.sourceQuote.length > 160 ||
          !(input.sourceMessages ?? []).some(source => source.sourceMessageId === input.scope.sourceMessageId && source.text.includes(op.sourceQuote as string)))) {
          fieldErrors.push({field:op.field,reason:"QUOTE_NOT_IN_CURRENT_MESSAGE"});
        } else Object.assign(patch, { fitPreference: { value: parsed.data.fitPreference, evidence } });
      } else {
        const key = op.field.slice("preferences.".length) as typeof preferenceKinds[number];
        if (!op.field.startsWith("preferences.") || !preferenceKinds.includes(key)) throw new Error("STATE_FIELD");
        const value = op.op === "CLEAR" ? [] : op.value;
        if (!Array.isArray(value) || value.length > 20 || value.some(v => typeof v !== "string" || !v.trim() || v.length > 64)) { fieldErrors.push({field:op.field,reason:"INVALID_DOMAIN_VALUE"}); continue; }
        const list = op.op === "SET" ? [...current.profile.preferences[key], ...value] : value;
        Object.assign(patch, { preferences: { ...patch.preferences, [key]: { value: list, evidence } } });
      }
    }
    if (fieldErrors.length) return { status: "REJECTED", reason: fieldErrors.some(f => !f.field.startsWith("measurements.") || f.reason === "INVALID_DOMAIN_VALUE") ? "STATE_FIELD_INVALID" : "MEASUREMENT_SOURCE_INVALID", data: { fieldErrors } };
    // Only this C3 writer may correct the same grounded event under the current CAS.
    // Never weaken the shared timestamp/confidence/source ordering for other writers.
    const mergeBase = { ...structuredClone(current), fieldEvidence: { ...current.fieldEvidence } };
    const changedMeasurements = measurements.filter(m => {
      if (clears.includes(m.kind)) return true;
      const path = "measurements." + m.kind, old = current.profile.measurements.find(v => v.kind === m.kind);
      if (old?.provenance.source !== "CUSTOMER_MESSAGE" || old.provenance.confidence !== m.provenance.confidence ||
        old.provenance.sourceEventHash !== m.provenance.sourceEventHash || old.provenance.observedAt !== m.provenance.observedAt) return true;
      if (old.value === m.value) return false;
      mergeBase.profile.measurements = mergeBase.profile.measurements.filter(v => v.kind !== m.kind);
      delete mergeBase.fieldEvidence[path]; return true;
    });
    Object.assign(patch, { measurements: changedMeasurements });
    const merged = mergeCustomerProfile(mergeBase, patch);
    if (merged.ignoredFields.length) return { status: "REJECTED", reason: "STALE_CUSTOMER_EVIDENCE" };
    const fieldEvidence = { ...merged.fieldEvidence };
    for (const kind of absentClears) fieldEvidence[`measurements.${kind}`] = evidence;
    const next: CustomerProfileMergeState = { profile: CustomerProfileV1Schema.parse({ ...merged.profile,
      ...(absentClears.length ? { revision: current.profile.revision + 1, updatedAt:
        new Date(Math.max(Date.parse(merged.profile.updatedAt), Date.parse(observedAt))).toISOString() } : {}),
      measurements: merged.profile.measurements.filter(m => !clears.includes(m.kind)) }), fieldEvidence };
    let readback: CustomerProfileMergeState;
    try {
      if (next.profile.revision !== current.profile.revision && !await input.store.compareAndSwap(current.profile.revision, next)) {
        blockedDependencies = true; return { status: "REJECTED", reason: "STATE_CONFLICT" };
      }
      readback = await input.store.read();
    } catch {
      invalidateCommit(); return { status: "REJECTED", reason: "STATE_COMMIT_UNCONFIRMED" };
    }
    if (commerceHash(readback) !== commerceHash(next)) { invalidateCommit(); return { status: "REJECTED", reason: "STATE_READBACK_CHANGED" }; }
    const changed = commerceHash(effective) !== commerceHash(readback);
    effective = readback; blockedDependencies = false;
    if (!changed) return { status: "OK", data: { revision: effective.profile.revision, applied: false,
      measurements: effective.profile.measurements.map(m => ({ kind: m.kind, value: m.value })) } };
    sizes.clear(); cartQuote = undefined; quoteRead = false;
    const operationId = commerceHash({ profileId: effective.profile.profileId, revision: effective.profile.revision, source: evidence.sourceEventHash, ops: a.ops });
    committedUpdate = { hash: commerceHash(effective), receipt: { ref: `profile-receipt:${operationId}`, operationId, effect: "CUSTOMER_STATE_UPDATED", status: "SUCCESS",
      subjectRef: effective.profile.profileId, stateRevision: input.base.snapshot().state.revision, recipient: input.scope.recipient,
      observedAt: effective.profile.updatedAt, expiresAt: new Date(Date.parse(effective.profile.updatedAt)+300_000).toISOString() } };
    return { status: "OK", data: { revision: effective.profile.revision, measurements: effective.profile.measurements.map(m => ({ kind: m.kind, value: m.value })) } };
  }
  async function invoke(call: CommerceToolCall): Promise<CommerceToolResult> {
    const state = input.base.snapshot().state;
    if (!state.permission || !state.privacyAllowed || state.conversationOwner !== "BOT") return { status: "REJECTED", reason: "PERMISSION" };
    try {
      if (call.name === "apply_customer_state") {
        const args = toolArgs(call.args, ["ops"]);
        const fields = args && Array.isArray(args.ops) && args.ops.length ? args.ops.map(op =>
          op && typeof op === "object" && typeof op.field === "string" ? op.field as string : "*") : ["*"];
        fields.forEach(field => pendingFields.add(field));
        let result: CommerceToolResult;
        try { result = await apply(call.args); }
        catch { result = { status: "REJECTED", reason: "STATE_OR_DOMAIN_INPUT" }; }
        if (result.status === "OK") fields.forEach(field => pendingFields.delete(field));
        return result.status === "OK" ? result : { ...result, data: { ...result.data as Record<string, unknown>, ...(!commitUnconfirmed ? { applied: false } : {}), unresolvedFields: [...pendingFields] } };
      }
      if (call.name === "recommend_size") {
        const a = toolArgs(call.args, ["subjectRef"]);
        if (blocked() || !a || typeof a.subjectRef !== "string" || !snapshot().boundSubjects.some(s => s.kind === "PRODUCT" && s.ref === a.subjectRef)) return { status: "REJECTED", reason: "STATE_OR_REF" };
        const source = await input.sizeInput(a.subjectRef);
        if (source.target.parentProductId !== a.subjectRef) return { status: "REJECTED", reason: "SIZE_SUBJECT" };
        const decision = recommendSize({ ...source, profile: effective.profile, generatedAt: input.clock().toISOString() });
        const claim = createVerifiedSizeRecommendationClaim({ decision, profile: effective.profile, productId: a.subjectRef });
        sizes.set(a.subjectRef, { claims: buildProtectedClaimsFromVerifiedFactsV1({ facts: null, sizeClaim: claim, expectedProductId: a.subjectRef }).claims,
          fingerprint: claim?.measurementFingerprint, profileHash: profileHash(), sourceHash: commerceHash({ target: source.target, charts: source.charts }) });
        return { status: "OK", data: { status: decision.recommendation.status, action: decision.action,
          missingInputs: decision.missingInputs, recommendedSizes: decision.recommendation.recommendedSizes } };
      }
      if (call.name === "quote_cart") {
        if (blocked() || !toolArgs(call.args, []) || !input.quoteInput) return { status: "REJECTED", reason: "QUOTE_UNAVAILABLE" };
        const source = await input.quoteInput();
        const q = evaluateShopPolicy({ ...source, now: input.clock(), authorizationNow: input.clock() });
        cartQuote = q.status === "AUTHORIZED" ? { result: q, sourceHash: commerceHash({ policy: source.policy, lines: source.lines, closingEvidence: source.closingEvidence }) } : undefined;
        quoteRead = true;
        return { status: q.status === "AUTHORIZED" ? "OK" : "REJECTED", data: q };
      }
      return await input.base.invoke(call);
    } catch { blockedDependencies = true; return { status: "REJECTED", reason: "STATE_OR_DOMAIN_INPUT" }; }
  }
  return { invoke, snapshot, async invokeBatch(calls) {
    const updates = calls.filter(c => c.name === "apply_customer_state");
    if (updates.length > 1) {
      blockedDependencies = true;
      for (const call of updates) {
        const args = toolArgs(call.args, ["ops"]);
        for (const op of args && Array.isArray(args.ops) ? args.ops : [{}]) pendingFields.add(
          op && typeof op === "object" && typeof op.field === "string" ? op.field : "*");
      }
    }
    const updateResults = updates.length > 1 ? updates.map(() => ({ status: "REJECTED" as const, reason: "MULTIPLE_STATE_UPDATES" })) : await Promise.all(updates.map(invoke));
    return Promise.all(calls.map(c => c.name === "apply_customer_state" ? updateResults[updates.indexOf(c)]! : invoke(c)));
  }, async readback() {
    await input.base.readback();
    const current = await input.store.read();
    if (commerceHash(current) !== commerceHash(effective)) { effective = current; committedUpdate = undefined; sizes.clear(); cartQuote = undefined; }
    for (const [id, result] of sizes) {
      const source = await input.sizeInput(id);
      if (result.sourceHash !== commerceHash({ target: source.target, charts: source.charts })) sizes.delete(id);
    }
    if (quoteRead && input.quoteInput) {
      const source = await input.quoteInput();
      const q = evaluateShopPolicy({ ...source, now: input.clock(), authorizationNow: input.clock() });
      cartQuote = q.status === "AUTHORIZED" ? { result: q, sourceHash: commerceHash({ policy: source.policy, lines: source.lines, closingEvidence: source.closingEvidence }) } : undefined;
    }
    return snapshot();
  }, ...(input.base.recover ? { recover: input.base.recover } : {}) };
}
