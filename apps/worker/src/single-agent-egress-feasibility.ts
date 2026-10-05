import { BusinessFactEnvelopeV1Schema, type BusinessFactEnvelopeV1, type ProtectedClaimV1 } from "@lana/contracts";
import { buildProtectedClaimsFromVerifiedFactsV1, buildVerifiedFactBlocks, guardAgentProposal, type StableProductDocument } from "@lana/business-tools";
import { redactAnalyticsMessage } from "@lana/database";
import { authorizeRealtimeProtectedClaimProposal, detectRealtimeUndeclaredProtectedClaimTypes } from "./realtime-protected-claim-boundary.js";

/** Code-issued offline literals only. No tool/API/model payload may issue one.
 * Policy uses its existing code-owned literal, not a new protected-claim type.
 * This experiment has no effect-receipt surface and grants no send authority.
 */
export interface SingleAgentFeasibilitySurface {
  readonly ref: string;
  readonly text: string;
  readonly observedAt: string;
  readonly expiresAt: string;
  readonly sourceVersion: string;
  readonly claim?: ProtectedClaimV1;
}

export function buildSingleAgentFactSurfaces(
  input: BusinessFactEnvelopeV1,
  product: StableProductDocument,
): readonly SingleAgentFeasibilitySurface[] {
  const facts = BusinessFactEnvelopeV1Schema.parse(input);
  const built = buildProtectedClaimsFromVerifiedFactsV1({ facts, sizeClaim: null, expectedProductId: product.productId });
  if (built.reasonCodes.length) throw Error("FEASIBILITY_FACTS_INVALID");
  return built.claims.flatMap(claim => {
    if (claim.type !== "PRICE" && claim.type !== "STOCK" && claim.type !== "ETA") return [];
    const blocks = buildVerifiedFactBlocks(facts, claim.type, product);
    if (blocks.reasonCodes.length) throw Error("FEASIBILITY_REALIZATION_UNAVAILABLE");
    return [{ ref: claim.claimId, text: blocks.blocks.map(b => b.text).join("\n"), claim, ...claim.provenance }];
  });
}

type Segment = { readonly text: string } | { readonly ref: string };
function parseSegments(output: unknown): readonly Segment[] | null {
  if (typeof output !== "object" || output === null || Array.isArray(output) || Object.keys(output).join() !== "segments") return null;
  const segments = (output as { segments?: unknown }).segments;
  if (!Array.isArray(segments) || !segments.length || segments.length > 12) return null;
  const parsed: Segment[] = [];
  for (const segment of segments) {
    if (typeof segment !== "object" || segment === null || Array.isArray(segment)) return null;
    const keys = Object.keys(segment);
    if (keys.length !== 1 || (keys[0] !== "text" && keys[0] !== "ref")) return null;
    const value: unknown = segment[keys[0]];
    if (typeof value !== "string" || !value.trim() || value.length > (keys[0] === "text" ? 2_000 : 128)) return null;
    parsed.push(keys[0] === "text" ? { text: value } : { ref: value });
  }
  return parsed;
}

/** Evaluation-only probe of the intended minimal egress shape.
 * ACCEPT means only that reused mechanical boundaries accepted the draft.
 * It is explicitly NOT a safety verdict or a customer-delivery capability.
 * No entrypoint imports this module; there are no model/tool/state/send ports.
 */
export function probeSingleAgentEgress(input: Readonly<{
  output: unknown;
  surfaces: readonly SingleAgentFeasibilitySurface[];
  productId: string;
  now: Date;
}>): Readonly<{ boundaryOutcome: "ACCEPT" | "REJECT"; finalReply: string; reasonCodes: readonly string[]; sendAuthorized: false }> {
  const reasons = new Set<string>();
  const segments = parseSegments(input.output);
  if (!segments) reasons.add("FEASIBILITY_OUTPUT_SCHEMA_INVALID");
  if (!Number.isFinite(input.now.getTime())) reasons.add("FEASIBILITY_CLOCK_INVALID");
  const pool = new Map(input.surfaces.map(s => [s.ref, s]));
  if (pool.size !== input.surfaces.length) reasons.add("FEASIBILITY_AMBIGUOUS_REFERENCE");
  const used = new Set<string>(), text: string[] = [];
  for (const segment of segments ?? []) {
    if ("ref" in segment) {
      const surface = pool.get(segment.ref);
      if (!surface || used.has(segment.ref)) { reasons.add("FEASIBILITY_REFERENCE_INVALID"); continue; }
      used.add(segment.ref);
      if (!surface.sourceVersion || !Number.isFinite(Date.parse(surface.observedAt)) || !Number.isFinite(Date.parse(surface.expiresAt)) || Date.parse(surface.observedAt) > input.now.getTime() || Date.parse(surface.expiresAt) <= input.now.getTime()) reasons.add("FEASIBILITY_LITERAL_STALE_OR_INVALID");
      if (surface.claim) {
        const authorization = authorizeRealtimeProtectedClaimProposal({
          declaredClaimIds: [surface.claim.claimId], observedClaimTypes: [surface.claim.type],
          availableClaims: [surface.claim], expectedProductIds: [input.productId],
          expectedProductScopes: [{ productId: input.productId, variantId: null }], now: input.now,
        });
        authorization.reasonCodes.forEach(reason => reasons.add(reason));
      }
      text.push(surface.text);
    } else {
      const dlp = redactAnalyticsMessage(segment.text);
      if (dlp.dlpStatus !== "PASSED" || dlp.text !== segment.text) reasons.add("FEASIBILITY_PROSE_NOT_PII_SAFE");
      // Same reject-only prose boundary as the C3 PRODUCTION_CONTRACT GENERAL
      // segment: no facts/effects can be authorized from a text segment.
      const guard = guardAgentProposal({
        proposal: { schemaVersion: 1, intent: "OFFLINE_FEASIBILITY", conversationStage: "BROWSING", productId: null, action: "REPLY", reply: segment.text, attachments: [], handoffReason: null, protectedClaimIds: [] },
        facts: null, verifiedProductIds: new Set([input.productId]), buyingSignal: false,
        sizeClaimTextMode: "STRUCTURED_REJECT_ONLY", now: input.now,
      });
      guard.blockedReasonCodes.forEach(reason => reasons.add(reason));
      detectRealtimeUndeclaredProtectedClaimTypes(segment.text).forEach(type => reasons.add(`PROTECTED_CLAIM_UNDECLARED:${type}`));
      text.push(segment.text);
    }
  }
  return { boundaryOutcome: reasons.size ? "REJECT" : "ACCEPT", finalReply: reasons.size ? "" : text.join("\n"), reasonCodes: [...reasons].sort(), sendAuthorized: false };
}
