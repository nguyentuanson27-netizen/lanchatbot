import { redactAnalyticsMessage, type ShadowContextMessage } from "@lana/database";
import type { CustomerProfileV1 } from "@lana/contracts";
import type { SessionDecisionContext } from "@lana/conversation-engine";
import { redactCustomerUrlsForModel } from "./customer-url-policy.js";
import { hasSessionDecisionContext } from "./realtime-session-decision-context.js";

type KnownInputs = {
  measurements?: Readonly<Record<string, number>>;
  preferences?: CustomerProfileV1["preferences"];
  selection?: { productId: string | null; size: string | null; color: string | null };
};
const clean = (text: string) => redactCustomerUrlsForModel(redactAnalyticsMessage(text).text);

/** Reuse the already-loaded accepted history; no new read, model call or durable store. */
export function buildRealtimeC3Dialogue(
  history: readonly ShadowContextMessage[],
  session?: SessionDecisionContext,
  known: KnownInputs = {},
): readonly ShadowContextMessage[] {
  // The canonical reader already caps history at 30; the current inbound adds one.
  const available = history.slice(-31);
  const hasKnown = Object.keys(known.measurements ?? {}).length > 0 ||
    Object.values(known.preferences ?? {}).some((values) => values.length > 0) ||
    known.selection?.size != null || known.selection?.color != null;
  const dialogue = available.map((entry) => ({ ...entry, text: clean(entry.text) }));
  if (!hasKnown && !(session && hasSessionDecisionContext(session))) return dialogue;
  const metadata = {
    type: "CUSTOMER_REPORTED_SESSION_CONTEXT",
    budgetCustomerReported: session?.budgetVnd == null ? null : `${session.budgetVnd / 1_000}k`,
    occasion: session?.occasion ?? null,
    rejectedProductIds: session?.rejectedProductIds ?? [],
    ...(hasKnown ? { knownCustomerInputs: {
      measurements: known.measurements ?? {},
      preferences: Object.fromEntries(Object.entries(known.preferences ?? {})
        .map(([field, values]) => [field, values.slice(-5).map((value) => clean(value).slice(0, 48))])),
      selection: known.selection ?? null,
    } } : {}),
  };
  return [{ direction: "INBOUND", senderType: "SYSTEM", messageType: "EVENT",
    text: clean(JSON.stringify(metadata)), attachmentCount: 0,
    occurredAt: available[0]?.occurredAt ?? new Date(0).toISOString(),
  }, ...dialogue];
}
