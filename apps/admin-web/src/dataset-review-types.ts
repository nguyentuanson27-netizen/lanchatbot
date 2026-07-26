// View-model types for the Dataset Review Queue UI. These mirror the redacted
// projections the admin-api serves (Batch 6 wires the endpoints); the UI never
// receives raw PII.

export type ReviewMode = "AI_ASSISTED" | "BLIND" | "DOUBLE_BLIND";
export type AnnotationSource = "HEURISTIC" | "AI" | "HUMAN" | "ADJUDICATOR";
export type AnnotationStatus = "PROPOSED" | "ACCEPTED" | "REJECTED" | "EDITED" | "ADJUDICATED";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type MessageRole = "CUSTOMER" | "SHOP" | "UNKNOWN";
export type AnnotationScope = "CUSTOMER_MESSAGE" | "SHOP_MESSAGE" | "CONVERSATION" | "SEQUENCE";
export type Split = "DEVELOPMENT" | "VALIDATION" | "HOLDOUT" | "RARE_SAFETY";

export type ReviewAction =
  | "ACCEPT"
  | "REJECT"
  | "EDIT"
  | "SAVE_NEXT"
  | "PREVIOUS"
  | "ACCEPT_ALL"
  | "SKIP";

export interface ReviewMessage {
  turnIndex: number;
  role: MessageRole;
  redactedText: string;
}

export interface ReviewAnnotation {
  id: string;
  labelCode: string;
  scope: AnnotationScope;
  turnIndex: number | null;
  secondTurnIndex: number | null;
  evidenceText: string | null;
  evidenceStart: number | null;
  evidenceEnd: number | null;
  confidence: Confidence;
  source: AnnotationSource;
  status: AnnotationStatus;
}

export interface LabelOption {
  code: string;
  name: string;
  scope: AnnotationScope;
  evidenceRequired: boolean;
  confidenceRequired: boolean;
  mutuallyExclusiveGroup: string | null;
  isSafetyCritical: boolean;
}

export interface ReviewLease {
  ownerSubject: string | null;
  ownedByCurrent?: boolean;
  until: string | null;
}

export interface ReviewQueueItem {
  projectItemId: string;
  conversationId: string;
  split: Split;
  assignmentStatus: string;
  qualityFlags: string[];
  messages: ReviewMessage[];
  annotations: ReviewAnnotation[];
  lease: ReviewLease;
  revision: number;
}

export interface ReviewQueueProgress {
  reviewed: number;
  total: number;
}

export interface DatasetSummary {
  datasetId: string;
  name: string;
  sourceType: string;
  status: string;
  totalItems: number;
  importedItems: number;
  failedItems: number;
}

export interface DatasetProjectSummary {
  projectId: string;
  name: string;
  status: string;
  reviewMode: string;
  annotationMode: string;
}

export interface DatasetIndexEntry {
  dataset: DatasetSummary;
  projects: DatasetProjectSummary[];
}

export interface ReviewQueueData {
  projectId: string;
  projectName: string;
  reviewMode: ReviewMode;
  split: Split;
  progress: ReviewQueueProgress;
  labels: LabelOption[];
  item: ReviewQueueItem | null;
  // Blind review: AI proposals stay hidden until the reviewer submits their own
  // pass and the server reveals them.
  revealed?: boolean;
}
