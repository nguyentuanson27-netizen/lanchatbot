/** Bounded stages only. Exception text, selectors and private input are never retained. */
export type CommerceEffectFailureStage = "VALIDATION" | "AUTHORITY" | "SOURCE" | "DOMAIN" | "CAS" | "COMMIT_UNKNOWN" | "READBACK";
/** Only the transaction owner may distinguish its commit/readback phase. */
export class CommerceEffectCommitError extends Error {
  constructor(readonly stage:"COMMIT_UNKNOWN"|"READBACK") { super("COMMERCE_COMMIT_UNCONFIRMED"); }
}
