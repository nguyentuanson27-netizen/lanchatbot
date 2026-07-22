import { createHash } from "node:crypto";

export interface MetaEchoCandidate {
  readonly pageId: string;
  readonly recipientId: string;
  readonly appId: string;
  readonly providerMessageId: string | null;
  readonly payloadFingerprint: string;
  readonly attemptedAt: Date;
}

export interface MetaEchoEvidence {
  readonly pageId: string;
  readonly recipientId: string;
  readonly appId: string | null;
  readonly providerMessageId: string;
  readonly payloadFingerprint: string;
  readonly occurredAt: Date;
}

export type MetaEchoMatchResult =
  | { readonly matched: true; readonly basis: "PROVIDER_MESSAGE_ID" | "PAYLOAD_FINGERPRINT" }
  | { readonly matched: false; readonly reasonCode: string };

export function matchMetaEcho(
  candidate: MetaEchoCandidate,
  evidence: MetaEchoEvidence,
  maxWindowMs: number,
): MetaEchoMatchResult {
  if (candidate.pageId !== evidence.pageId) {
    return { matched: false, reasonCode: "META_ECHO_PAGE_MISMATCH" };
  }
  if (candidate.recipientId !== evidence.recipientId) {
    return { matched: false, reasonCode: "META_ECHO_RECIPIENT_MISMATCH" };
  }
  if (evidence.appId === null || candidate.appId !== evidence.appId) {
    return { matched: false, reasonCode: "META_ECHO_APP_MISMATCH" };
  }
  const elapsed = evidence.occurredAt.getTime() - candidate.attemptedAt.getTime();
  if (!Number.isFinite(maxWindowMs) || maxWindowMs < 0 || elapsed < 0 || elapsed > maxWindowMs) {
    return { matched: false, reasonCode: "META_ECHO_OUTSIDE_WINDOW" };
  }
  if (
    candidate.providerMessageId !== null &&
    candidate.providerMessageId !== "" &&
    candidate.providerMessageId === evidence.providerMessageId
  ) {
    return { matched: true, basis: "PROVIDER_MESSAGE_ID" };
  }
  if (
    candidate.payloadFingerprint !== "" &&
    candidate.payloadFingerprint === evidence.payloadFingerprint &&
    evidence.providerMessageId.trim() !== ""
  ) {
    return { matched: true, basis: "PAYLOAD_FINGERPRINT" };
  }
  return { matched: false, reasonCode: "META_ECHO_PAYLOAD_MISMATCH" };
}

export function fingerprintMetaPayload(
  message: { readonly kind: "TEXT"; readonly text: string } | {
    readonly kind: "IMAGE";
    readonly imageUrl: string;
  },
): string {
  const canonical =
    message.kind === "TEXT"
      ? `v1\u0000text\u0000${message.text.trim().replace(/\s+/g, " ")}`
      : `v1\u0000image\u0000${new URL(message.imageUrl).toString()}`;
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
