import type { AgentProposalV1 } from "@lana/contracts";

type BusinessFactIntent = AgentProposalV1["businessFactQuery"]["intent"];
type AuthorizedBusinessFactIntent = Exclude<BusinessFactIntent, "NONE">;

const NO_BUSINESS_FACT_QUERY: AgentProposalV1["businessFactQuery"] = {
  intent: "NONE",
  offerType: null,
  color: null,
  size: null,
  deliveryRegion: null,
};

/**
 * Enforces an authorization decision made by a canonical upstream authority.
 * This primitive never derives authorization from customer text or policy.
 */
export function authorizeBusinessFactIntent(
  proposal: AgentProposalV1,
  authorizedIntents: readonly AuthorizedBusinessFactIntent[],
): AgentProposalV1 {
  const proposedIntent = proposal.businessFactQuery.intent;
  if (
    proposedIntent === "NONE" ||
    authorizedIntents.includes(proposedIntent)
  ) {
    return proposal;
  }
  return {
    ...proposal,
    businessFactQuery: { ...NO_BUSINESS_FACT_QUERY },
  };
}
