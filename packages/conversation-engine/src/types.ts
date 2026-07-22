import type {
  ConversationOwner,
  RoutingOwner,
  SenderType,
} from "@lana/contracts";

export type SalesStage =
  | "DISCOVERY"
  | "PRODUCT_MATCHED"
  | "FIT_CONSULTING"
  | "OBJECTION_HANDLING"
  | "READY_TO_BUY"
  | "ORDER_REVIEW"
  | "POST_SALE";

export type ObjectionType =
  | "NONE"
  | "PRICE"
  | "SIZE_FIT"
  | "MATERIAL"
  | "COLOR"
  | "DELIVERY"
  | "TRUST_POLICY"
  | "NEED_COMPARE"
  | "NOT_READY"
  | "PRODUCT_UNCLEAR";

export type OwnerReason =
  | "DEFAULT"
  | "HUMAN_ECHO"
  | "PANCAKE_TAG"
  | "POST_SALE"
  | "AGENT_HANDOFF"
  | "MANUAL"
  | "UNVERIFIED";

export type TagGateStatus = "UNVERIFIED" | "VERIFIED_ABSENT" | "BLOCKING";
export type HandoffTag = "NHAN_VIEN" | "VAN_DON";
export type BlockingTag =
  | HandoffTag
  | "DA_CHOT_DON"
  | "KHONG_UP_SALE";

/** Structural Phase-0 contract produced by the Pancake read/reconcile adapter. */
export interface PancakeTagObservation {
  readonly schemaVersion: 1;
  readonly verified: boolean;
  readonly blockingTag: BlockingTag | null;
  readonly observedTagIds: readonly string[];
  readonly observedAt: string;
  readonly reasonCode: string | null;
  /** Display name from the same exact Pancake conversation read. */
  readonly customerName?: string | null | undefined;
}

export interface EventCursor {
  readonly eventKey: string;
  readonly occurredAt: string;
  readonly receiveSequence: number;
}

export interface ConsideredVariant {
  readonly offerType: string | null;
  readonly color: string | null;
  readonly size: string | null;
}

export interface OrderDraft {
  readonly productId: string;
  readonly offerType: string | null;
  readonly color: string | null;
  readonly size: string | null;
  readonly quantity: number;
}

export interface ConversationState {
  readonly schemaVersion: 1;
  readonly conversationId: string;
  readonly routingOwner: RoutingOwner;
  readonly conversationOwner: ConversationOwner;
  readonly ownerReason: OwnerReason;
  readonly ownerLeaseUntil: string | null;
  readonly tagGateStatus: TagGateStatus;
  readonly blockingTag: BlockingTag | null;
  readonly blockingTagVerifiedAt: string | null;
  readonly revision: number;
  readonly lastFence: number;
  readonly lastEvent: EventCursor | null;
  readonly currentProductId: string | null;
  /** Ordered, short-lived product labels from the latest multi-image message. */
  readonly productSelections?: readonly {
    readonly label: string;
    readonly productId: string;
  }[];
  readonly consideredVariant: ConsideredVariant;
  readonly orderDraft: OrderDraft | null;
  readonly salesStage: SalesStage;
  readonly objectionType: ObjectionType;
  readonly updatedAt: string;
}

export type PostSaleHandoffReason =
  | "POST_SALE"
  | "ORDER_STATUS"
  | "DELIVERY_TRACKING"
  | "DELIVERY_DELAY"
  | "CHANGE_DELIVERY_INFO"
  | "CANCEL_ORDER"
  | "PAYMENT_AFTER_ORDER"
  | "EXCHANGE"
  | "RETURN"
  | "REFUND"
  | "DEFECT"
  | "WARRANTY"
  | "WRONG_OR_MISSING_ITEM";

export type GeneralHandoffReason =
  | "AGENT_REQUEST"
  | "CUSTOMER_REQUESTED_HUMAN"
  | "INVALID_AGENT_SCHEMA"
  | "NO_REPLY_REQUIRES_REVIEW"
  | "EMPTY_REPLY"
  | "UNVERIFIED_PRODUCT_ID"
  | "UNVERIFIED_BUSINESS_FACT"
  | "PRODUCT_AMBIGUOUS"
  | "PRODUCT_TOOL_ERROR"
  | "POLICY_TOOL_ERROR"
  | "SENSITIVE_CASE"
  | "MANUAL";

export type HandoffReason = PostSaleHandoffReason | GeneralHandoffReason;

export interface HandoffDirective {
  readonly reason: HandoffReason;
  readonly category: "POST_SALE" | "GENERAL";
  readonly desiredTag: HandoffTag;
  readonly silent: true;
}

export type SalesStageTrigger = "NORMAL" | "PRODUCT_SWITCHED" | "NEW_OBJECTION";

export interface InboundConversationEvent {
  readonly eventKey: string;
  readonly messageId: string | null;
  readonly occurredAt: string;
  readonly receiveSequence: number;
  readonly actor: SenderType;
  readonly journey: "PRE_SALE" | "POST_SALE";
  readonly requestedHandoffReason: HandoffReason | null;
  readonly requestedSalesStage: SalesStage | null;
  readonly salesStageTrigger: SalesStageTrigger;
  readonly productId: string | null;
  readonly objectionType: ObjectionType;
}

export interface DecisionAuthorization {
  readonly allowEvaluate: boolean;
  readonly allowCreateMetaOutbox: false;
  readonly allowTagCommand: boolean;
  readonly metaOutboxEligibleAfterPhase2: boolean;
  readonly reasonCodes: readonly string[];
}

export type EventApplicationStatus = "APPLIED" | "STALE" | "DUPLICATE";

export interface ApplyInboundInput {
  readonly state: ConversationState;
  readonly expectedRevision: number;
  readonly fence: number;
  readonly event: InboundConversationEvent;
  readonly tagObservation: PancakeTagObservation;
  readonly now: Date;
}

export interface ApplyInboundResult {
  readonly status: EventApplicationStatus;
  readonly state: ConversationState;
  readonly authorization: DecisionAuthorization;
  readonly handoff: HandoffDirective | null;
  readonly stageTransitionCode: string | null;
}

export interface CreateConversationStateInput {
  readonly conversationId: string;
  readonly routingOwner: RoutingOwner;
  readonly now: Date;
}
