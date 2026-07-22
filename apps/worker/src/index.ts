import {
  SendDisabledConversationWorker,
  type ConversationJobHandler,
  type ConversationLock,
  type ConversationWorkerOptions,
  type WebhookInboxRepository,
} from "@lana/durable-messaging";

export const PHASE1_SEND_ENABLED = false as const;

export interface Phase1WorkerDependencies {
  readonly inbox: WebhookInboxRepository;
  readonly conversationLock: ConversationLock;
  readonly handler: ConversationJobHandler;
}

export interface Phase1WorkerConfig extends ConversationWorkerOptions {
  readonly sendEnabled?: false;
}

export function createPhase1Worker(
  dependencies: Phase1WorkerDependencies,
  config: Phase1WorkerConfig,
): SendDisabledConversationWorker {
  if (config.sendEnabled !== undefined && config.sendEnabled !== false) {
    throw new Error("PHASE1_LIVE_SEND_FORBIDDEN");
  }
  return new SendDisabledConversationWorker(
    dependencies.inbox,
    dependencies.conversationLock,
    dependencies.handler,
    config,
  );
}

export function assertPhase1EnvironmentSendDisabled(
  environment: Readonly<Record<string, string | undefined>>,
): void {
  const configured = environment["CHATBOT_SEND_ENABLED"]?.trim().toLowerCase();
  if (configured !== undefined && configured !== "" && configured !== "false" && configured !== "0") {
    throw new Error("PHASE1_LIVE_SEND_FORBIDDEN");
  }
}
