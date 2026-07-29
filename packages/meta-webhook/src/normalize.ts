import { createHash, createHmac, randomUUID } from "node:crypto";
import {
  InboundMessageV1Schema,
  type InboundMessageV1,
} from "@lana/contracts";
import { z } from "zod";

const AttachmentSchema = z.object({
  type: z.string().min(1).max(32),
  payload: z
    .object({
      url: z.string().url().optional(),
    })
    .passthrough()
    .optional(),
});

const AdsContextDataSchema = z
  .object({
    ad_title: z.string().max(500).optional(),
    post_id: z.union([z.string(), z.number()]).optional(),
    ad_id: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

const ReferralSchema = z
  .object({
    source: z.string().max(64).optional(),
    type: z.string().max(64).optional(),
    ref: z.string().max(500).optional(),
    ad_id: z.union([z.string(), z.number()]).optional(),
    ads_context_data: AdsContextDataSchema.optional(),
  })
  .passthrough();

const MessageSchema = z
  .object({
    mid: z.string().min(1).max(256).optional(),
    text: z.string().max(8_000).optional(),
    is_echo: z.boolean().optional(),
    app_id: z.union([z.string(), z.number()]).optional(),
    attachments: z.array(AttachmentSchema).max(10).optional(),
    referral: ReferralSchema.optional(),
  })
  .passthrough();

const MessagingEventSchema = z
  .object({
    sender: z.object({ id: z.string().min(1).max(256) }),
    recipient: z.object({ id: z.string().min(1).max(256) }),
    timestamp: z.number().int().nonnegative(),
    message: MessageSchema.optional(),
  })
  .passthrough();

const EntrySchema = z.object({
  id: z.string().min(1).max(64),
  messaging: z.array(MessagingEventSchema).max(1_000),
});

const MetaPayloadSchema = z.object({
  object: z.literal("page"),
  entry: z.array(EntrySchema).min(1).max(100),
});

export class MetaPayloadError extends Error {
  readonly code = "META_PAYLOAD_INVALID";
}

export class MetaPageNotAllowedError extends Error {
  readonly code = "PAGE_NOT_REGISTERED";
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`)
    .join(",")}}`;
}

function fallbackEventKey(
  pageId: string,
  customerId: string,
  timestamp: number,
  event: unknown,
): string {
  const digest = createHash("sha256")
    .update(
      canonicalize({
        version: 1,
        type: "MESSAGE_WITHOUT_MID",
        pageId,
        customerId,
        timestamp,
        event,
      }),
    )
    .digest("hex");
  return `meta:${pageId}:fallback:v1:${digest}`;
}

function conversationId(
  pageId: string,
  customerId: string,
  identityHashSalt: string,
): string {
  if (identityHashSalt.length < 16) {
    throw new MetaPayloadError("Identity hash salt is not configured safely");
  }
  const digest = createHmac("sha256", identityHashSalt)
    .update(pageId)
    .update("\0")
    .update(customerId)
    .digest("hex");
  return `meta:v1:${digest}`;
}

export function parseMetaPayload(rawBody: Buffer): unknown {
  try {
    return JSON.parse(rawBody.toString("utf8")) as unknown;
  } catch {
    throw new MetaPayloadError("Meta webhook body is not valid JSON");
  }
}

/** Normalize only message events; other Meta callbacks are handled by later adapters. */
export function normalizeMetaMessages(
  payload: unknown,
  allowedPageIds: ReadonlySet<string>,
  identityHashSalt: string,
): InboundMessageV1[] {
  const parsed = MetaPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new MetaPayloadError("Meta webhook body does not match the page event schema");
  }

  const output: InboundMessageV1[] = [];
  for (const entry of parsed.data.entry) {
    if (!allowedPageIds.has(entry.id)) {
      throw new MetaPageNotAllowedError("Meta webhook page is not registered");
    }

    for (const event of entry.messaging) {
      if (!event.message) continue;
      const isEcho = event.message.is_echo === true;
      const customerId = isEcho ? event.recipient.id : event.sender.id;
      const messageId = event.message.mid ?? null;
      const attachments = (event.message.attachments ?? []).map((attachment) => ({
        type: attachment.type,
        ...(attachment.payload?.url ? { url: attachment.payload.url } : {}),
      }));
      const referral = event.message.referral;
      const normalizedReferralSource = referral?.source?.trim().toUpperCase() || null;
      const ads = referral?.ads_context_data;
      const adsContext = referral && (ads || normalizedReferralSource === "ADS" || referral.ad_id)
        ? {
            source: normalizedReferralSource,
            referralType: referral.type?.trim() || null,
            adTitle: ads?.ad_title?.trim() || null,
            postId: ads?.post_id === undefined ? null : String(ads.post_id),
            adId:
              referral.ad_id === undefined && ads?.ad_id === undefined
                ? null
                : String(referral.ad_id ?? ads?.ad_id),
            ref: referral.ref?.trim() || null,
          }
        : null;

      const candidate = {
        schemaVersion: 1 as const,
        traceId: randomUUID(),
        eventKey:
          messageId === null
            ? fallbackEventKey(entry.id, customerId, event.timestamp, event)
            : `meta:${entry.id}:message:${messageId}`,
        pageId: entry.id,
        messageId,
        senderId: customerId,
        conversationId: conversationId(entry.id, customerId, identityHashSalt),
        occurredAt: new Date(event.timestamp).toISOString(),
        isEcho,
        appId:
          event.message.app_id === undefined
            ? null
            : String(event.message.app_id),
        text: event.message.text ?? null,
        attachments,
        adsContext,
      };
      output.push(InboundMessageV1Schema.parse(candidate));
    }
  }
  return output;
}
