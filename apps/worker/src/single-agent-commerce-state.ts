import { BodyMeasurementV1Schema, CustomerProfileV1Schema, SizeFitTargetV1Schema,sizeFitTargetKey,sameSizeFitTarget,type SizeFitTargetV1,type ProductComponentRole, type MeasurementKind } from "@lana/contracts";
import { buildProtectedClaimsFromVerifiedFactsV1, createVerifiedSizeRecommendationClaim, mergeCustomerProfile,
  recommendSize, type CustomerProfileMergeState, type CustomerProfilePatch, type SizeEngineInput,
  evaluateShopPolicy,selectVerifiedSizeChart, type ShopPolicyEvaluationInput } from "@lana/business-tools";
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
/** Structured argument validation only; never interprets a customer's wording. */
export function sizeRequestScope(a:{fitScope?:unknown;componentRole?:unknown}):"PRODUCT"|"COMPONENT"|null {
  const scope=a.fitScope===undefined?"PRODUCT":a.fitScope;
  if(scope==="PRODUCT")return a.componentRole===undefined?"PRODUCT":null;
  return scope==="COMPONENT"&&["TOP","PANTS","SKIRT","DRESS","OTHER"].includes(a.componentRole as string)?"COMPONENT":null;
}
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
  /** Trusted source port resolves BOM identity and chart applicability independently of claims/model fields. */
  componentSizeInput?:(request:{parentProductId:string;componentRole:ProductComponentRole})=>Promise<
    Omit<SizeEngineInput,"profile"|"generatedAt">&{fitTarget:Extract<SizeFitTargetV1,{kind:"COMPONENT"}>;sourceBindingHash:string;sourceExpiresAt:string}>;
  quoteInput?: () => Promise<ShopPolicyEvaluationInput>;
  sourceMessages?: readonly CustomerStateSourceMessage[];
  /** Candidate opt-in. Persist only requested targets, never a verdict or fit claim. */
  retainAdvice?:boolean;
}): Promise<CommerceTools> {
  let effective = await input.store.read(), blockedDependencies = false;
  let commitUnconfirmed = false;
  const invalidateCommit = () => { commitUnconfirmed = true; blockedDependencies = true; committedUpdate = undefined; sizes.clear(); cartQuote = undefined; quoteRead = false; };
  const pendingFields = new Set<string>();
  const blocked = () => blockedDependencies || pendingFields.size > 0;
  let sizeOutcome: { status: string } | null = null;
  const sizes = new Map<string, { claims: readonly unknown[]; fingerprint: string | undefined; profileHash: string; sourceHash: string;
    fitTarget:SizeFitTargetV1;sourceExpiresAt:string|null;request:{parentProductId:string;componentRole:ProductComponentRole}|null }>();
  let cartQuote: unknown;
  let quoteRead = false;
  let committedUpdate: { hash: string; receipt: TrustedContext["effectReceipts"][number] } | undefined;
  let rehydrationTarget:SizeFitTargetV1|undefined;
  const profileHash = () => commerceHash(effective.profile);
  const validateComponent=(s:Awaited<ReturnType<NonNullable<typeof input.componentSizeInput>>>,request:{parentProductId:string;componentRole:ProductComponentRole})=>{
    const t=SizeFitTargetV1Schema.parse(s.fitTarget);
    if(t.kind!=="COMPONENT"||t.parentProductId!==request.parentProductId||t.componentRole!==request.componentRole||
      s.target.parentProductId!==t.parentProductId||s.target.componentProductId!==t.componentProductId||s.target.componentRole!==t.componentRole||
      !/^[a-f0-9]{64}$/.test(s.sourceBindingHash)||!Number.isFinite(Date.parse(s.sourceExpiresAt))||Date.parse(s.sourceExpiresAt)<=input.clock().getTime()||
      !selectVerifiedSizeChart(s.charts,s.target))throw Error("COMPONENT_SOURCE_UNAVAILABLE");
  };
  async function rememberTargets(targets:SizeFitTargetV1[]){
    if(!input.retainAdvice)return;
    const prior=effective,nextTargets=[...(prior.profile.sizeAdviceTargets??[])].filter(t=>snapshot().boundSubjects.some(s=>s.kind==="PRODUCT"&&s.ref===(t.kind==="PRODUCT"?t.productId:t.parentProductId)));
    for(const t of targets)if(!nextTargets.some(v=>sameSizeFitTarget(v,t)))nextTargets.push(t);
    if(commerceHash(nextTargets)===commerceHash(prior.profile.sizeAdviceTargets??[]))return;
    if(nextTargets.length>4)throw Error("SIZE_TARGET_BOUND");
    const next={...prior,profile:CustomerProfileV1Schema.parse({...prior.profile,sizeAdviceTargets:nextTargets,
      revision:prior.profile.revision+1,updatedAt:input.clock().toISOString()})};
    const retainedReceipt=committedUpdate?.hash===commerceHash(prior)?committedUpdate:undefined;
    try{
      if(!await input.store.compareAndSwap(prior.profile.revision,next))throw Error("STATE_CONFLICT");
      const current=await input.store.read();if(commerceHash(current)!==commerceHash(next))throw Error("STATE_READBACK_CHANGED");
      effective=current;sizes.clear();
      // Only advice metadata changed. The actual numeric update receipt remains
      // immutable and still describes the same committed measurement fields.
      committedUpdate=retainedReceipt?{hash:commerceHash(current),receipt:retainedReceipt.receipt}:undefined;
    }catch{invalidateCommit();throw Error("STATE_COMMIT_UNCONFIRMED");}
  }
  const snapshot = (): TrustedContext => {
    const base = input.base.snapshot();
    const valid = [...sizes.entries()].filter(([, s]) => !blocked() && s.profileHash === profileHash());
    const update = !blocked() && committedUpdate?.hash === commerceHash(effective) ? committedUpdate.receipt : undefined;
    return buildReadOnlyContext({ ...base, state: { ...base.state,
      ...(effective.profile.shoppingSelection&&base.boundSubjects.some(s=>s.kind==="PRODUCT"&&s.ref===effective.profile.shoppingSelection!.productId)?{
        currentProductId:effective.profile.shoppingSelection.productId,shoppingSelection:effective.profile.shoppingSelection}:{}),
      customerProfileId: effective.profile.profileId, customerProfileRevision: effective.profile.revision,
      customerMeasurements: effective.profile.measurements.map(m => ({ kind: m.kind, value: m.value })),
      fitPreference: effective.profile.fitPreference, preferences: effective.profile.preferences,
      ...(blocked() ? { customerStateUpdatePending: true } : {}),
      sizeMeasurementFingerprints: Object.fromEntries(valid.filter(([, s]) => s.fingerprint).map(([id, s]) => [id, s.fingerprint])),
      sizeFitTargets:Object.fromEntries(valid.filter(([,s])=>s.claims.length===1).map(([id,s])=>[id,{target:s.fitTarget,sourceHash:s.sourceHash,
        claimId:(s.claims[0] as {claimId:string}).claimId,claimHash:commerceHash(s.claims[0])}])),
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
    sizeOutcome = null; sizes.clear(); cartQuote = undefined; quoteRead = false;
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
      if(call.name==="read_product"&&call.args&&typeof call.args==="object"&&Object.hasOwn(call.args,"customerSelected")){
        const a=call.args as Record<string,unknown>,{customerSelected,...read}=a;
        if(customerSelected!==true||typeof a.subjectRef!=="string"||typeof a.offerType!=="string"||a.offerTypes!==undefined||a.detailsOnly!==undefined)return {status:"REJECTED",reason:"SELECTION_ARGUMENTS"};
        const r=await input.base.invoke({name:"read_product",args:read});if(r.status!=="OK")return r;
        const data=r.data as {subjectRef?:string;requestedOfferType?:string;availableOffers?:string[]};
        if(data.subjectRef!==a.subjectRef||data.requestedOfferType!==a.offerType||!data.availableOffers?.includes(a.offerType))return {status:"REJECTED",reason:"SELECTION_SOURCE"};
        const selection={productId:a.subjectRef,offerType:a.offerType};
        if(commerceHash(effective.profile.shoppingSelection??null)===commerceHash(selection))return r;
        const prior=effective,next={...prior,profile:CustomerProfileV1Schema.parse({...prior.profile,shoppingSelection:selection,
          revision:prior.profile.revision+1,updatedAt:input.clock().toISOString()})};
        const retainedReceipt=committedUpdate?.hash===commerceHash(prior)?committedUpdate:undefined;
        const previousFits=[...sizes.values()].map(s=>s.fitTarget);
        try{if(!await input.store.compareAndSwap(prior.profile.revision,next))throw Error("STATE_CONFLICT");
          const current=await input.store.read();if(commerceHash(current)!==commerceHash(next))throw Error("STATE_READBACK_CHANGED");
          effective=current;sizes.clear();committedUpdate=retainedReceipt?{hash:commerceHash(current),receipt:retainedReceipt.receipt}:undefined;
          for(const t of previousFits)await refreshAdvice(t);
        }catch{invalidateCommit();return {status:"REJECTED",reason:"STATE_COMMIT_UNCONFIRMED"};}
        return {...r,data:{...data,shoppingSelection:selection,selectionStatus:"CUSTOMER_CHOICE_RECORDED_NOT_PURCHASE"}};
      }
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
        const a = toolArgs(call.args, ["subjectRef", "customerStateOps", "fitScope", "componentRole"]);
        if (!a || typeof a.subjectRef !== "string" || !snapshot().boundSubjects.some(s => s.kind === "PRODUCT" && s.ref === a.subjectRef)) return { status: "REJECTED", reason: "STATE_OR_REF" };
        const fitScope=sizeRequestScope(a);
        if (!fitScope) return {status:"REJECTED",reason:"STATE_OR_REF"};
        // The existing port targets a product. Never turn an unsupported component request
        // into a product calculation, nor commit inline inputs as a side effect of that request.
        const request=fitScope==="COMPONENT"?{parentProductId:a.subjectRef,componentRole:a.componentRole as ProductComponentRole}:null;
        let componentSource:Awaited<ReturnType<NonNullable<typeof input.componentSizeInput>>>|undefined;
        if(request){
          try{
            if(!input.componentSizeInput)throw Error("COMPONENT_SOURCE_UNAVAILABLE");
            componentSource=await input.componentSizeInput(request);
            validateComponent(componentSource,request);
          }catch{blockedDependencies=true;sizes.clear();sizeOutcome={status:"NO_VERIFIED_CHART"};return {status:"UNAVAILABLE",reason:"SIZE_SOURCE_UNAVAILABLE"};}
        }
        // A single explicit size request may carry new customer inputs. Reuse the
        // exact writer (validation, CAS, readback, receipt), never calculate on a rejected patch.
        if (a.customerStateOps !== undefined) {
          const updated = await invoke({ name: "apply_customer_state", args: { ops: a.customerStateOps } });
          if (updated.status !== "OK") return updated;
        }
        if (blocked()) return { status: "REJECTED", reason: "STATE_OR_REF" };
        let source: Awaited<ReturnType<typeof input.sizeInput>>;
        try { source = componentSource??await input.sizeInput(a.subjectRef); }
        catch { blockedDependencies=true;return {status:"UNAVAILABLE",reason:"SIZE_SOURCE_UNAVAILABLE"}; }
        if (source.target.parentProductId !== a.subjectRef) return { status: "REJECTED", reason: "SIZE_SUBJECT" };
        const fitTarget:SizeFitTargetV1=componentSource?componentSource.fitTarget:{kind:"PRODUCT",productId:a.subjectRef};
        const calculate=()=>recommendSize({...source,...(componentSource?{fitTarget:componentSource.fitTarget}:{}),
          profile:componentSource?{...effective.profile,sizeHistory:[]}:effective.profile,generatedAt:input.clock().toISOString()});
        let decision=calculate();
        if(rehydrationTarget&&!sameSizeFitTarget(rehydrationTarget,fitTarget))return {status:"UNAVAILABLE",reason:"SIZE_TARGET_CHANGED"};
        if(input.retainAdvice&&!rehydrationTarget&&decision.recommendation.status==="RECOMMENDED"&&!effective.profile.sizeAdviceTargets?.some(t=>sameSizeFitTarget(t,fitTarget))){
          const targets=effective.profile.sizeAdviceTargets??[];
          await rememberTargets([fitTarget]);
          for(const t of targets)if(snapshot().boundSubjects.some(s=>s.kind==="PRODUCT"&&s.ref===(t.kind==="PRODUCT"?t.productId:t.parentProductId)))
            await refreshAdvice(t);
          decision=calculate();
        }
        sizeOutcome = { status: decision.recommendation.status };
        let claim = createVerifiedSizeRecommendationClaim({ decision, profile: effective.profile, productId: a.subjectRef,...(componentSource?{fitTarget}:{}) });
        if(claim&&componentSource)claim={...claim,expiresAt:new Date(Math.min(Date.parse(claim.expiresAt),Date.parse(componentSource.sourceExpiresAt))).toISOString()};
        const sourceHash=commerceHash({target:source.target,charts:source.charts,...(componentSource?{fitTarget,sourceBindingHash:componentSource.sourceBindingHash}:{})});
        if(!sizes.has(sizeFitTargetKey(fitTarget))&&sizes.size>=4)return {status:"REJECTED",reason:"SIZE_TARGET_BOUND"};
        sizes.set(sizeFitTargetKey(fitTarget), { claims: buildProtectedClaimsFromVerifiedFactsV1({ facts: null, sizeClaim: claim, expectedProductId: a.subjectRef,expectedFitTarget:fitTarget }).claims,
          fingerprint: claim?.measurementFingerprint, profileHash: profileHash(), sourceHash,fitTarget,sourceExpiresAt:componentSource?.sourceExpiresAt??null,request });
        return { status: "OK", data: { status: decision.recommendation.status, action: decision.action,
          fitScope:fitTarget,...(componentSource?{}:{unsupportedScopes:["COMPONENT"]}),
          sizeSourceHash:sourceHash,
          missingInputs: decision.missingInputs, recommendedSizes: claim ? decision.recommendation.recommendedSizes : [],
          inputFitPreference:effective.profile.fitPreference, alternativeSizes:claim?.value.alternativeSizes??null } };
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
  async function refreshAdvice(t:SizeFitTargetV1){
    const previousBlocked=blockedDependencies,previousOutcome=sizeOutcome;
    const previousSizes=new Map(sizes);
    rehydrationTarget=t;
    try{
      const outcome=await invoke({name:"recommend_size",args:t.kind==="PRODUCT"?{subjectRef:t.productId}:{subjectRef:t.parentProductId,fitScope:"COMPONENT",componentRole:t.componentRole}});
      if(outcome.status!=="OK"){
        sizes.clear();for(const [key,value]of previousSizes)if(key!==sizeFitTargetKey(t))sizes.set(key,value);
      }
    }finally{rehydrationTarget=undefined;blockedDependencies=previousBlocked;sizeOutcome=previousOutcome;}
  }
  const result:CommerceTools={ invoke, snapshot, sizeOutcome: () => sizeOutcome, async invokeBatch(calls) {
    const writesState = (c: CommerceToolCall) => c.name === "apply_customer_state" ||
      (c.name==="read_product"&&!!c.args&&typeof c.args==="object"&&Object.hasOwn(c.args,"customerSelected"))||
      (c.name === "recommend_size" && !!c.args && typeof c.args === "object" && Object.hasOwn(c.args, "customerStateOps"));
    const updates = calls.filter(writesState);
    if(updates.length>1&&updates.every(c=>c.name==="recommend_size")&&
       updates.every(c=>commerceHash((c.args as Record<string,unknown>).customerStateOps)===commerceHash((updates[0]!.args as Record<string,unknown>).customerStateOps))){
      // Only identical, grounded profile patches may be joined. Resolve every
      // dependent target first; unsupported targets must not partially write.
      const batchTargets:SizeFitTargetV1[]=[];
      try{
        for(const c of updates){const a=toolArgs(c.args,["subjectRef","customerStateOps","fitScope","componentRole"]);
          if(!a||typeof a.subjectRef!=="string"||!snapshot().boundSubjects.some(s=>s.kind==="PRODUCT"&&s.ref===a.subjectRef)||!sizeRequestScope(a))throw Error("STATE_OR_REF");
          if(sizeRequestScope(a)==="COMPONENT"){
            if(!input.componentSizeInput)throw Error("COMPONENT_SOURCE_UNAVAILABLE");
            const s=await input.componentSizeInput({parentProductId:a.subjectRef,componentRole:a.componentRole as ProductComponentRole});
            validateComponent(s,{parentProductId:a.subjectRef,componentRole:a.componentRole as ProductComponentRole});batchTargets.push(s.fitTarget);
          }else{const s=await input.sizeInput(a.subjectRef);if(s.target.parentProductId!==a.subjectRef||!selectVerifiedSizeChart(s.charts,s.target))throw Error("SIZE_SOURCE_UNAVAILABLE");
            batchTargets.push({kind:"PRODUCT",productId:a.subjectRef});}
        }
      }catch{blockedDependencies=true;return calls.map(()=>({status:"REJECTED",reason:"STATE_OR_REF"}));}
      const active=(effective.profile.sizeAdviceTargets??[]).filter(t=>snapshot().boundSubjects.some(s=>s.kind==="PRODUCT"&&s.ref===(t.kind==="PRODUCT"?t.productId:t.parentProductId)));
      const union=new Set([...active,...batchTargets].map(sizeFitTargetKey));
      if(input.retainAdvice&&union.size>4)return calls.map(()=>({status:"REJECTED",reason:"SIZE_TARGET_BOUND"}));
      const written=await invoke({name:"apply_customer_state",args:{ops:(updates[0]!.args as Record<string,unknown>).customerStateOps}});
      if(written.status!=="OK")return calls.map(()=>written);
      try{await rememberTargets(batchTargets);}catch{return calls.map(()=>({status:"REJECTED",reason:"STATE_COMMIT_UNCONFIRMED"}));}
      return result.invokeBatch(calls.map(c=>updates.includes(c)?{...c,args:Object.fromEntries(Object.entries(c.args as Record<string,unknown>).filter(([k])=>k!=="customerStateOps"))}:c));
    }
    if (updates.length > 1) {
      blockedDependencies = true;
      for (const call of updates) {
        const args = call.name === "recommend_size"
          ? { ops: (call.args as Record<string,unknown>).customerStateOps } : toolArgs(call.args, ["ops"]);
        for (const op of args && Array.isArray(args.ops) ? args.ops : [{}]) pendingFields.add(
          op && typeof op === "object" && typeof op.field === "string" ? op.field : "*");
      }
    }
    const updateResults = updates.length > 1 ? updates.map(() => ({ status: "REJECTED" as const, reason: "MULTIPLE_STATE_UPDATES" })) : await Promise.all(updates.map(invoke));
    const local=calls.filter(c=>!writesState(c)&&["recommend_size","quote_cart"].includes(c.name));
    const remote=calls.filter(c=>!writesState(c)&&!local.includes(c));
    const remoteResults=await input.base.invokeBatch(remote);
    const localResults:CommerceToolResult[]=[];
    // Retained target registration uses profile CAS. Keep those registrations
    // ordered; two independent target requests must not race the same revision.
    if(input.retainAdvice){for(const call of local)localResults.push(await invoke(call));}
    else localResults.push(...await Promise.all(local.map(invoke)));
    return calls.map(c=>writesState(c)?updateResults[updates.indexOf(c)]!:local.includes(c)?localResults[local.indexOf(c)]!:remoteResults[remote.indexOf(c)]!);
  }, async readback() {
    await input.base.readback();
    const current = await input.store.read();
    if (commerceHash(current) !== commerceHash(effective)) { effective = current; committedUpdate = undefined; sizes.clear(); cartQuote = undefined; }
    for (const [id, result] of sizes) {
      try{
        if(result.request){
          if(!input.componentSizeInput)throw Error("COMPONENT_SOURCE_UNAVAILABLE");
          const source=await input.componentSizeInput(result.request);
          if(!Number.isFinite(Date.parse(source.sourceExpiresAt))||Date.parse(source.sourceExpiresAt)<Date.parse(result.sourceExpiresAt!)||
            !sameSizeFitTarget(source.fitTarget,result.fitTarget)||result.sourceHash!==commerceHash({target:source.target,charts:source.charts,
            fitTarget:source.fitTarget,sourceBindingHash:source.sourceBindingHash}))sizes.delete(id);
        }else{
          const source = await input.sizeInput(id);
          if (result.sourceHash !== commerceHash({ target: source.target, charts: source.charts })) sizes.delete(id);
        }
      }catch{sizes.delete(id);}
    }
    if (quoteRead && input.quoteInput) {
      const source = await input.quoteInput();
      const q = evaluateShopPolicy({ ...source, now: input.clock(), authorizationNow: input.clock() });
      cartQuote = q.status === "AUTHORIZED" ? { result: q, sourceHash: commerceHash({ policy: source.policy, lines: source.lines, closingEvidence: source.closingEvidence }) } : undefined;
    }
    return snapshot();
  }, ...(input.base.recover ? { recover: input.base.recover } : {}) };
  if(input.retainAdvice)for(const t of effective.profile.sizeAdviceTargets??[]){
    const id=t.kind==="PRODUCT"?t.productId:t.parentProductId;
    if(snapshot().boundSubjects.some(s=>s.kind==="PRODUCT"&&s.ref===id)){
      await refreshAdvice(t);
    }
  }
  return result;
}
