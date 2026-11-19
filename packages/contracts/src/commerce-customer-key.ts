import { z } from "zod";

// Preserve the exact stored key for Inbox, Outbox and state comparisons.
export const CommerceCustomerHashV1Schema = z.string().regex(/^(?:meta:v1:)?[a-f0-9]{64}$/u);
