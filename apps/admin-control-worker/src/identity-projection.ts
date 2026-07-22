import { LocalEnvelopeCipher } from "@lana/database";

interface Queryable {
  query(sql: string, values: readonly unknown[]): Promise<{ rowCount: number | null }>;
}

export interface ObservedCustomerIdentity {
  readonly pageId: string;
  readonly conversationId: string;
  readonly customerName: string | null | undefined;
  readonly observedAt: string;
}

/**
 * Persists the customer display name as a short-lived encrypted projection.
 * This function must be called only after an exact, verified Pancake read.
 */
export async function upsertEncryptedCustomerIdentity(
  database: Queryable,
  cipher: LocalEnvelopeCipher,
  observation: ObservedCustomerIdentity,
): Promise<boolean> {
  const customerName = observation.customerName
    ?.trim()
    .replace(/\s+/gu, " ")
    .slice(0, 160);
  if (!customerName) return false;
  const observedAt = new Date(observation.observedAt);
  if (Number.isNaN(observedAt.getTime())) return false;
  const expiresAt = new Date(observedAt.getTime() + 20 * 24 * 60 * 60_000);
  const encrypted = cipher.encryptValue(
    customerName,
    `lana:admin-identity:v1:${observation.pageId}:${observation.conversationId}:PANCAKE`,
  );
  const result = await database.query(
    `INSERT INTO admin_conversation_identities (
       page_id, conversation_id, provider, customer_name_ciphertext,
       customer_name_nonce, customer_name_auth_tag, encryption_key_ref,
       observed_at, expires_at, updated_at
     ) VALUES ($1,$2,'PANCAKE',$3,$4,$5,$6,$7,$8,now())
     ON CONFLICT (page_id, conversation_id, provider) DO UPDATE SET
       customer_name_ciphertext = EXCLUDED.customer_name_ciphertext,
       customer_name_nonce = EXCLUDED.customer_name_nonce,
       customer_name_auth_tag = EXCLUDED.customer_name_auth_tag,
       encryption_key_ref = EXCLUDED.encryption_key_ref,
       observed_at = EXCLUDED.observed_at,
       expires_at = EXCLUDED.expires_at,
       updated_at = now()
     WHERE admin_conversation_identities.observed_at <= EXCLUDED.observed_at`,
    [
      observation.pageId,
      observation.conversationId,
      encrypted.ciphertext,
      encrypted.nonce,
      encrypted.authTag,
      cipher.keyRef,
      observedAt,
      expiresAt,
    ],
  );
  return result.rowCount === 1;
}
