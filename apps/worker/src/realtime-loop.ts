export type RealtimeLoopStatus = "STARTING" | "IDLE" | "PROCESSING" | "ERROR" | "STOPPING";

export interface RealtimeLoopRunner {
  processOne(): Promise<boolean>;
}

export interface RealtimeLoopInbox {
  heartbeat(
    workerId: string,
    status: RealtimeLoopStatus,
    mode: "DRY_RUN" | "LIVE",
    sendEnabled: boolean,
    errorCode?: string,
  ): Promise<void>;
  waitForWork?(timeoutMs: number, signal?: AbortSignal): Promise<void>;
}

export interface RealtimeLoopOptions {
  readonly runner: RealtimeLoopRunner;
  readonly inbox: RealtimeLoopInbox;
  readonly workerId: string;
  readonly mode: "DRY_RUN" | "LIVE";
  readonly sendEnabled: boolean;
  readonly concurrency: number;
  readonly fallbackPollMs: number;
  readonly heartbeatMs: number;
  readonly signal: AbortSignal;
  readonly logError?: (code: string) => void;
}

function delay(timeoutMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(finish, timeoutMs);
    function finish(): void {
      signal?.removeEventListener("abort", finish);
      clearTimeout(timer);
      resolve();
    }
    signal?.addEventListener("abort", finish, { once: true });
  });
}

export async function runRealtimeLoop(options: RealtimeLoopOptions): Promise<void> {
  const concurrency = Math.max(1, Math.min(8, Math.trunc(options.concurrency)));
  const idleSlots = new Set<number>();
  let desiredStatus: RealtimeLoopStatus = "STARTING";
  let desiredError: string | undefined;
  let lastStatus: RealtimeLoopStatus | undefined;
  let lastError: string | undefined;
  let heartbeatTail: Promise<void> = Promise.resolve();
  let wakePromise: Promise<void> | null = null;

  const report = (
    status: RealtimeLoopStatus,
    errorCode?: string,
    force = false,
  ): Promise<void> => {
    desiredStatus = status;
    desiredError = errorCode;
    heartbeatTail = heartbeatTail.then(async () => {
      if (!force && status === lastStatus && errorCode === lastError) return;
      try {
        await options.inbox.heartbeat(
          options.workerId,
          status,
          options.mode,
          options.sendEnabled,
          errorCode,
        );
        lastStatus = status;
        lastError = errorCode;
      } catch (error) {
        options.logError?.(
          error instanceof Error ? error.message.slice(0, 128) : "REALTIME_HEARTBEAT_FAILED",
        );
      }
    });
    return heartbeatTail;
  };

  const waitForWake = (): Promise<void> => {
    if (!wakePromise) {
      const wait = options.inbox.waitForWork
        ? options.inbox.waitForWork(options.fallbackPollMs, options.signal)
        : delay(options.fallbackPollMs, options.signal);
      wakePromise = wait
        .catch((error: unknown) => {
          options.logError?.(
            error instanceof Error ? error.message.slice(0, 128) : "REALTIME_WAIT_FAILED",
          );
          return delay(options.fallbackPollMs, options.signal);
        })
        .finally(() => {
          wakePromise = null;
        });
    }
    return wakePromise;
  };

  await report("STARTING", undefined, true);
  const heartbeatTimer = setInterval(() => {
    void report(desiredStatus, desiredError, true);
  }, options.heartbeatMs);
  heartbeatTimer.unref();

  const runSlot = async (slot: number): Promise<void> => {
    while (!options.signal.aborted) {
      try {
        const processed = await options.runner.processOne();
        if (options.signal.aborted) break;
        if (processed) {
          idleSlots.delete(slot);
          await report("PROCESSING");
          continue;
        }
        idleSlots.add(slot);
        if (idleSlots.size === concurrency) await report("IDLE");
        await waitForWake();
        idleSlots.delete(slot);
      } catch (error) {
        idleSlots.delete(slot);
        const code = error instanceof Error && error.message
          ? error.message.slice(0, 128)
          : "REALTIME_WORKER_LOOP_FAILED";
        await report("ERROR", code);
        options.logError?.(code);
        await waitForWake();
      }
    }
  };

  try {
    await Promise.all(Array.from({ length: concurrency }, (_, slot) => runSlot(slot)));
  } finally {
    clearInterval(heartbeatTimer);
    await heartbeatTail;
    await report("STOPPING", undefined, true);
  }
}
