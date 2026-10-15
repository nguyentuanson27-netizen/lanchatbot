import { BodyMeasurementV1Schema, CustomerProfileV1Schema, type MeasurementKind } from "@lana/contracts";
import { buildProtectedClaimsFromVerifiedFactsV1, createVerifiedSizeRecommendationClaim, mergeCustomerProfile,
  recommendSize, type CustomerProfileMergeState, type CustomerProfilePatch, type SizeEngineInput,
  evaluateShopPolicy, type ShopPolicyEvaluationInput } from "@lana/business-tools";
import { buildReadOnlyContext, commerceHash } from "./single-agent-commerce-read-only-context.js";
import { toolArgs, type CommerceScope, type CommerceToolCall, type CommerceToolResult } from "./single-agent-commerce-read-only-tools.js";
import type { CommerceTools } from "./single-agent-commerce-read-only.js";
import type { TrustedContext } from "./single-agent-semantic-verifier-boundary.js";
import type { PostgresRealtimeRuntimeStore } from "@lana/database";

export interface CustomerStatePort {
  read(): Promise<CustomerProfileMergeState>;
  compareAndSwap(expectedRevision: number, next: CustomerProfileMergeState): Promise<boolean>;
}
/** Reuses current table/expiry/CAS implementation; callers supply a scoped initial-profile factory. */
export function createRealtimeCustomerStatePort(store: Pick<PostgresRealtimeRuntimeStore,
  "loadOrCreateCustomerProfile" | "compareAndSwapCustomerProfile">, scope: CommerceScope,
  create: () => CustomerProfileMergeState, clock: () => Date): CustomerStatePort {
  return { async read() {
    const row = await store.loadOrCreateCustomerProfile<CustomerProfileMergeState["profile"], CustomerProfileMergeState["fieldEvidence"]>(
      scope.pageId, scope.customerHash, () => { const initial = create(); return { ...initial, revision: initial.profile.revision }; }, clock());
    if (row.pageId !== scope.pageId || row.customerHash !== scope.customerHash) throw new Error("PROFILE_SCOPE");
    return { profile: CustomerProfileV1Schema.parse(row.profile), fieldEvidence: row.fieldEvidence };
  }, compareAndSwap: (expected, next) => store.compareAndSwapCustomerProfile(scope.pageId, scope.customerHash, expected,
    { ...next, revision: next.profile.revision }, clock()) };
}
const measurementKinds = ["HEIGHT_CM", "WEIGHT_KG", "BUST_CM", "WAIST_CM", "HIPS_CM"] as const;
const preferenceKinds = ["colors", "styles", "materials"] as const;

export async function createCustomerStateTools(input: {
  base: CommerceTools; scope: CommerceScope; store: CustomerStatePort; clock: () => Date;
  sizeInput: (subjectRef: string) => Promise<Omit<SizeEngineInput, "profile" | "generatedAt">>;
  quoteInput?: () => Promise<ShopPolicyEvaluationInput>;
}): Promise<CommerceTools> {
  let effective = await input.store.read(), blockedDependencies = false;
  const sizes = new Map<string, { claims: readonly unknown[]; fingerprint: string | undefined; profileHash: string; sourceHash: string }>();
  let cartQuote: unknown;
  let quoteRead = false;
  let committedUpdate: { hash: string; receipt: TrustedContext["effectReceipts"][number] } | undefined;
  const profileHash = () => commerceHash(effective.profile);
  const snapshot = (): TrustedContext => {
    const base = input.base.snapshot();
    const valid = [...sizes.entries()].filter(([, s]) => !blockedDependencies && s.profileHash === profileHash());
    const update = !blockedDependencies && committedUpdate?.hash === commerceHash(effective) ? committedUpdate.receipt : undefined;
    return buildReadOnlyContext({ ...base, state: { ...base.state,
      customerProfileId: effective.profile.profileId, customerProfileRevision: effective.profile.revision,
      customerMeasurements: effective.profile.measurements.map(m => ({ kind: m.kind, value: m.value })),
      fitPreference: effective.profile.fitPreference, preferences: effective.profile.preferences,
      sizeMeasurementFingerprints: Object.fromEntries(valid.filter(([, s]) => s.fingerprint).map(([id, s]) => [id, s.fingerprint])),
      ...(!blockedDependencies && cartQuote ? { cartQuote } : {}) },
      subjects: [...base.boundSubjects, ...(update ? [{ ref: effective.profile.profileId, kind: "CUSTOMER_PROFILE", label: `Thông tin tư vấn, phiên bản ${effective.profile.revision}`, bindingVersion: base.state.bindingVersion }] : [])], products: base.runtimeProducts ?? [], policies: base.policyLiterals,
      receipts: [...base.effectReceipts, ...(update ? [{ ...update, stateRevision: base.state.revision }] : [])], claims: [...base.protectedClaims.filter(c => (c as { type: string }).type !== "SIZE_FIT"), ...valid.flatMap(([, s]) => s.claims)] });
  };
  async function apply(args: unknown): Promise<CommerceToolResult> {
    const a = toolArgs(args, ["ops"]);
    if (!a || !Array.isArray(a.ops) || !a.ops.length || a.ops.length > 8) return { status: "REJECTED", reason: "STATE_ARGUMENTS" };
    const observedAt = input.scope.sourceObservedAt;
    if (!observedAt || !Number.isFinite(Date.parse(observedAt)) || Date.parse(observedAt) > input.clock().getTime()) return { status: "REJECTED", reason: "SOURCE_TIME" };
    const current = await input.store.read();
    if (commerceHash(current) !== commerceHash(effective)) { blockedDependencies = true; return { status: "REJECTED", reason: "STATE_CONFLICT" }; }
    const evidence = { source: "CUSTOMER_MESSAGE" as const, sourceEventHash: commerceHash({ pageId: input.scope.pageId,
      conversationId: input.scope.conversationId, sourceMessageId: input.scope.sourceMessageId }), observedAt, confidence: 1 };
    const patch: CustomerProfilePatch = { profileId: current.profile.profileId, expectedRevision: current.profile.revision };
    const measurements = [], clears: MeasurementKind[] = [], absentClears: MeasurementKind[] = [], fields = new Set<string>();
    for (const raw of a.ops) {
      const op = toolArgs(raw, ["op", "field", "value"]);
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
        else measurements.push(BodyMeasurementV1Schema.parse({ kind, value: op.value, provenance: evidence }));
      } else if (op.field === "fitPreference") {
        const value = op.op === "CLEAR" ? null : op.value;
        const parsed = CustomerProfileV1Schema.parse({ ...current.profile, fitPreference: value });
        Object.assign(patch, { fitPreference: { value: parsed.fitPreference, evidence } });
      } else {
        const key = op.field.slice("preferences.".length) as typeof preferenceKinds[number];
        if (!op.field.startsWith("preferences.") || !preferenceKinds.includes(key)) throw new Error("STATE_FIELD");
        const value = op.op === "CLEAR" ? [] : op.value;
        if (!Array.isArray(value) || value.length > 20 || value.some(v => typeof v !== "string" || !v.trim() || v.length > 64)) throw new Error("STATE_VALUE");
        const list = op.op === "SET" ? [...current.profile.preferences[key], ...value] : value;
        Object.assign(patch, { preferences: { ...patch.preferences, [key]: { value: list, evidence } } });
      }
    }
    Object.assign(patch, { measurements });
    const merged = mergeCustomerProfile(current, patch);
    if (merged.ignoredFields.length) return { status: "REJECTED", reason: "STALE_CUSTOMER_EVIDENCE" };
    const fieldEvidence = { ...merged.fieldEvidence };
    for (const kind of absentClears) fieldEvidence[`measurements.${kind}`] = evidence;
    const next: CustomerProfileMergeState = { profile: CustomerProfileV1Schema.parse({ ...merged.profile,
      ...(absentClears.length ? { revision: current.profile.revision + 1, updatedAt:
        new Date(Math.max(Date.parse(merged.profile.updatedAt), Date.parse(observedAt))).toISOString() } : {}),
      measurements: merged.profile.measurements.filter(m => !clears.includes(m.kind)) }), fieldEvidence };
    if (next.profile.revision !== current.profile.revision && !await input.store.compareAndSwap(current.profile.revision, next)) {
      blockedDependencies = true; return { status: "REJECTED", reason: "STATE_CONFLICT" };
    }
    const readback = await input.store.read();
    if (commerceHash(readback) !== commerceHash(next)) { blockedDependencies = true; committedUpdate = undefined; return { status: "REJECTED", reason: "STATE_READBACK_CHANGED" }; }
    effective = readback; blockedDependencies = false; sizes.clear(); cartQuote = undefined; quoteRead = false;
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
      if (call.name === "apply_customer_state") return await apply(call.args);
      if (call.name === "recommend_size") {
        const a = toolArgs(call.args, ["subjectRef"]);
        if (blockedDependencies || !a || typeof a.subjectRef !== "string" || !snapshot().boundSubjects.some(s => s.kind === "PRODUCT" && s.ref === a.subjectRef)) return { status: "REJECTED", reason: "STATE_OR_REF" };
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
        if (blockedDependencies || !toolArgs(call.args, []) || !input.quoteInput) return { status: "REJECTED", reason: "QUOTE_UNAVAILABLE" };
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
    if (updates.length > 1) blockedDependencies = true;
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
