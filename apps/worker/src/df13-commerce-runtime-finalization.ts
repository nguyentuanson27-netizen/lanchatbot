import type {
  Df13CommerceFenceCommitResult,
  RealtimeCommitInput,
} from "@lana/database";
import type {
  Df13CommerceRuntimeAcquireResult,
  Df13CommerceRuntimeExecutorPort,
} from "./df13-commerce-runtime-executor.js";
import type {
  RealtimeRuntimePort,
} from "./realtime-runner.js";

const DF13_COMMERCE_FINALIZATION_CAPABILITY = Symbol("df13-commerce-finalization");
const DF13_COMMERCE_FINALIZATION_ROUTER = Symbol("df13-commerce-finalization-router");

interface CommerceFinalizationCapability<TState, TSalesState> {
  readonly adapter: Df13CommerceRuntimeFinalizationAdapter<TState, TSalesState>;
  readonly acquired: Extract<Df13CommerceRuntimeAcquireResult, { status: "HELD" }>;
}

type DecoratedRealtimeCommit<TState, TSalesState> = RealtimeCommitInput<TState, TSalesState> & {
  [DF13_COMMERCE_FINALIZATION_CAPABILITY]?: CommerceFinalizationCapability<TState, TSalesState>;
};

/**
 * The only COMMERCE runner port. It has no direct commit method: final input
 * must travel through the existing BF01/BF02 runtime commit proxies before
 * the lower runtime adapter invokes the durable fence transaction.
 */
export interface Df13CommerceFinalizingExecutorPort<TState = unknown, TSalesState = unknown> {
  acquire: Df13CommerceRuntimeExecutorPort<TState, TSalesState>["acquire"];
  commitThroughFinalizers(input: Readonly<{
    runtime: RealtimeRuntimePort;
    acquired: Extract<Df13CommerceRuntimeAcquireResult, { status: "HELD" }>;
    runtimeCommit: RealtimeCommitInput<TState, TSalesState>;
    now: Date;
  }>): Promise<Df13CommerceFenceCommitResult>;
}

/**
 * A narrow one-way adapter for the dormant COMMERCE path. The capability is
 * private to this module and is consumed only by the runtime port supplied to
 * the real composition root; losing that port fails closed before any legacy
 * commit can become a COMMERCE completion.
 */
export class Df13CommerceRuntimeFinalizationAdapter<TState = unknown, TSalesState = unknown>
implements Df13CommerceFinalizingExecutorPort<TState, TSalesState> {
  private readonly pendingCapabilities = new Set<object>();

  constructor(private readonly executor: Df13CommerceRuntimeExecutorPort<TState, TSalesState>) {}

  acquire: Df13CommerceRuntimeExecutorPort<TState, TSalesState>["acquire"] = (input) =>
    this.executor.acquire(input);

  wrapRuntime(runtime: RealtimeRuntimePort): RealtimeRuntimePort {
    const adapter = this;
    return new Proxy(runtime, {
      get(target, property) {
        if (property === DF13_COMMERCE_FINALIZATION_ROUTER) return adapter;
        if (property !== "commit") {
          const value = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        }
        return async (
          input: RealtimeCommitInput<TState, TSalesState>,
          now?: Date,
        ) => {
          const decorated = input as DecoratedRealtimeCommit<TState, TSalesState>;
          const capability = decorated[DF13_COMMERCE_FINALIZATION_CAPABILITY];
          if (capability === undefined) {
            return target.commit(
              input as unknown as Parameters<RealtimeRuntimePort["commit"]>[0],
              now,
            );
          }
          return adapter.commitFinalizedRuntimeInput(capability, decorated);
        };
      },
    }) as RealtimeRuntimePort;
  }

  async commitThroughFinalizers(input: Readonly<{
    runtime: RealtimeRuntimePort;
    acquired: Extract<Df13CommerceRuntimeAcquireResult, { status: "HELD" }>;
    runtimeCommit: RealtimeCommitInput<TState, TSalesState>;
    now: Date;
  }>): Promise<Df13CommerceFenceCommitResult> {
    if (Reflect.get(input.runtime, DF13_COMMERCE_FINALIZATION_ROUTER) !== this) {
      throw new Error("DF13_COMMERCE_FINALIZATION_ROUTER_UNAVAILABLE");
    }
    const capability: CommerceFinalizationCapability<TState, TSalesState> = Object.freeze({
      adapter: this,
      acquired: input.acquired,
    });
    this.pendingCapabilities.add(capability);
    const decorated = Object.freeze({
      ...input.runtimeCommit,
      [DF13_COMMERCE_FINALIZATION_CAPABILITY]: capability,
    }) as DecoratedRealtimeCommit<TState, TSalesState>;
    try {
      const result = await input.runtime.commit(
        decorated as unknown as Parameters<RealtimeRuntimePort["commit"]>[0],
        input.now,
      );
      if (this.pendingCapabilities.has(capability)) {
        throw new Error("DF13_COMMERCE_FINALIZATION_ROUTER_UNAVAILABLE");
      }
      return result as unknown as Df13CommerceFenceCommitResult;
    } finally {
      this.pendingCapabilities.delete(capability);
    }
  }

  private async commitFinalizedRuntimeInput(
    capability: CommerceFinalizationCapability<TState, TSalesState>,
    input: DecoratedRealtimeCommit<TState, TSalesState>,
  ): Promise<Df13CommerceFenceCommitResult> {
    if (capability.adapter !== this || !this.pendingCapabilities.delete(capability)) {
      throw new Error("DF13_COMMERCE_FINALIZATION_CAPABILITY_INVALID");
    }
    const runtimeCommit = { ...input } as DecoratedRealtimeCommit<TState, TSalesState>;
    Reflect.deleteProperty(runtimeCommit, DF13_COMMERCE_FINALIZATION_CAPABILITY);
    return this.executor.commit({
      acquired: capability.acquired,
      runtimeCommit,
    });
  }
}
