/**
 * Worker compatibility surface for the one canonical producer at the database
 * authority boundary. Keeping this a re-export prevents a copied bundle hash
 * from diverging between the pointer writer and the runtime consumer.
 */
export {
  DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V1,
  DF13_COMMERCE_AUTHORITY_BUNDLE_PAYLOAD_V2,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_BUNDLE_V2,
  DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
  type CommerceAuthorityConsumer,
} from "@lana/database";
