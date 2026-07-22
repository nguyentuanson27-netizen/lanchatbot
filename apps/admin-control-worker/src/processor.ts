import {
  CONTROL_TAGS,
  type ClaimedAdminCommand,
  type ControlCommandStore,
  type ControlTag,
  type ControlTagObservation,
  type AdminControlWorkerOptions,
  type PancakeControlPort,
  type StateMutationResult,
} from "./types.js";

export class AdminControlCommandProcessor {
  constructor(
    private readonly store: ControlCommandStore,
    private readonly pancake: PancakeControlPort,
    private readonly workerId: string,
    private readonly leaseMs = 60_000,
    private readonly now: () => Date = () => new Date(),
    private readonly options: AdminControlWorkerOptions = {
      enabled: false,
      allowedPageIds: [],
    },
  ) {}

  async processOne(): Promise<boolean> {
    if (!this.options.enabled) return false;
    if (this.options.allowedPageIds.length === 0) {
      throw new Error("ADMIN_CONTROL_PAGE_ALLOWLIST_REQUIRED");
    }
    const command = await this.store.claim(
      this.workerId,
      this.leaseMs,
      this.options.allowedPageIds,
    );
    if (command === null) return false;
    if (!this.options.allowedPageIds.includes(command.pageId)) {
      await this.store.markFailed(command, "ADMIN_CONTROL_PAGE_FORBIDDEN");
      return true;
    }
    try {
      await this.dispatch(command);
    } catch (error: unknown) {
      const safeError = error as Error & {
        code?: string;
        constraint?: string;
        table?: string;
        routine?: string;
      };
      process.stderr.write(`${JSON.stringify({
        level: "error",
        service: "admin-control-worker",
        command_type: command.commandType,
        error_name: safeError.name,
        database_code: safeError.code?.slice(0, 16) ?? null,
        database_constraint: safeError.constraint?.slice(0, 128) ?? null,
        database_table: safeError.table?.slice(0, 128) ?? null,
        database_routine: safeError.routine?.slice(0, 128) ?? null,
      })}\n`);
      await this.store.markFailed(command, "CONTROL_COMMAND_UNEXPECTED_ERROR");
    }
    return true;
  }

  private async dispatch(command: ClaimedAdminCommand): Promise<void> {
    switch (command.commandType) {
      case "HANDOFF_NHAN_VIEN":
        await this.handoff(command, "NHAN_VIEN");
        return;
      case "HANDOFF_VAN_DON":
        await this.handoff(command, "VAN_DON");
        return;
      case "PAUSE_BOT":
        await this.pause(command);
        return;
      case "ADD_TAG":
        await this.addTag(command);
        return;
      case "REMOVE_TAG":
        await this.removeTag(command);
        return;
      case "RESUME_BOT":
        await this.resume(command);
        return;
      case "SYNC_PANCAKE_TAGS":
        await this.sync(command);
        return;
    }
  }

  private async handoff(
    command: ClaimedAdminCommand,
    tag: "NHAN_VIEN" | "VAN_DON",
  ): Promise<void> {
    const tagId = this.pancake.tagId(command.pageId, tag);
    if (tagId === null) {
      await this.store.markFailed(command, "PANCAKE_TAG_MAPPING_MISSING");
      return;
    }
    const state = await this.store.enqueueTagOperation(
      command,
      "ADD",
      tag,
      tagId,
      this.now(),
    );
    if (!(await this.handleConflict(command, state))) return;
    if (state.status !== "APPLIED") return;
    await this.finishAddOperation(command, tag, state.stateVersion, "HANDOFF_APPLIED");
  }

  private async finishAddOperation(
    command: ClaimedAdminCommand,
    tag: ControlTag,
    stateVersion: number,
    successCode: string,
  ): Promise<void> {
    const status = (await this.store.tagOperationStatuses(command, "ADD")).get(tag);
    if (status === "FAILED_PERMANENT") {
      await this.store.markFailed(command, "PANCAKE_TAG_ADD_FAILED_PERMANENT");
      return;
    }
    if (status !== "APPLIED") {
      await this.store.markWaiting(command, "WAITING_PANCAKE_TAG_ADD", 5);
      return;
    }
    await this.store.markApplied(command, successCode, {
      tag,
      stateVersion,
    });
  }

  private async pause(command: ClaimedAdminCommand): Promise<void> {
    if (command.pauseMinutes !== 15 && command.pauseMinutes !== 60) {
      await this.store.markFailed(command, "PAUSE_MINUTES_INVALID");
      return;
    }
    await this.store.markApplied(command, "BOT_PAUSED", {
      pauseMinutes: command.pauseMinutes,
      stateVersion:
        command.enqueuedStateVersion ?? command.expectedStateVersion,
    });
  }

  private async addTag(command: ClaimedAdminCommand): Promise<void> {
    const tag = await this.requiredTag(command);
    if (tag === null) return;
    const tagId = this.pancake.tagId(command.pageId, tag);
    if (tagId === null) return;
    const queued = await this.store.enqueueTagOperation(
      command,
      "ADD",
      tag,
      tagId,
      this.now(),
    );
    if (!(await this.handleConflict(command, queued))) return;
    if (queued.status !== "APPLIED") return;
    await this.finishAddOperation(command, tag, queued.stateVersion, "TAG_ADDED");
  }

  private async removeTag(command: ClaimedAdminCommand): Promise<void> {
    const tag = await this.requiredTag(command);
    if (tag === null) return;
    const held = await this.store.beginFailSafeHuman(command, this.now());
    if (!(await this.handleConflict(command, held))) return;
    if (held.status !== "APPLIED") return;
    const tagId = this.pancake.tagId(command.pageId, tag);
    if (tagId === null) return;
    const queued = await this.store.enqueueTagOperation(
      command,
      "REMOVE",
      tag,
      tagId,
      this.now(),
      held.stateVersion,
    );
    if (!(await this.handleConflict(command, queued))) return;
    if (queued.status !== "APPLIED") return;
    const status = (await this.store.tagOperationStatuses(command, "REMOVE")).get(tag);
    if (status === "FAILED_PERMANENT") {
      await this.store.markFailed(command, "PANCAKE_TAG_REMOVE_FAILED_PERMANENT");
      return;
    }
    if (status !== "APPLIED") {
      await this.store.markWaiting(command, "WAITING_PANCAKE_TAG_REMOVE", 5);
      return;
    }
    await this.finishRemoval(command, held.stateVersion, tag, "TAG_REMOVED", false);
  }

  private async resume(command: ClaimedAdminCommand): Promise<void> {
    const held = await this.store.beginFailSafeHuman(command, this.now());
    if (!(await this.handleConflict(command, held))) return;
    if (held.status !== "APPLIED") return;
    const before = await this.pancake.observe(
      command.pageId,
      command.pancakeConversationId,
    );
    if (!before.verified) {
      await this.store.markFailed(
        command,
        before.reasonCode ?? "PANCAKE_TAG_READ_UNVERIFIED",
      );
      return;
    }
    let queuedCount = 0;
    for (const tag of CONTROL_TAGS) {
      const tagId = this.pancake.tagId(command.pageId, tag);
      if (tagId === null || !before.observedTagIds.includes(tagId)) continue;
      const queued = await this.store.enqueueTagOperation(
        command,
        "REMOVE",
        tag,
        tagId,
        this.now(),
        held.stateVersion,
      );
      if (!(await this.handleConflict(command, queued))) return;
      if (queued.status !== "APPLIED") return;
      queuedCount += 1;
    }
    if (queuedCount > 0) {
      const statuses = await this.store.tagOperationStatuses(command, "REMOVE");
      if ([...statuses.values()].includes("FAILED_PERMANENT")) {
        await this.store.markFailed(command, "PANCAKE_TAG_REMOVE_FAILED_PERMANENT");
        return;
      }
      if ([...statuses.values()].some((status) => status !== "APPLIED")) {
        await this.store.markWaiting(command, "WAITING_PANCAKE_TAG_REMOVE", 5);
        return;
      }
    }
    await this.finishRemoval(command, held.stateVersion, null, "BOT_RESUMED", true);
  }

  private async finishRemoval(
    command: ClaimedAdminCommand,
    heldStateVersion: number,
    tag: ControlTag | null,
    successCode: string,
    requireAllClear: boolean,
  ): Promise<void> {
    const observation = await this.pancake.observe(
      command.pageId,
      command.pancakeConversationId,
    );
    if (!observation.verified) {
      await this.store.markFailed(
        command,
        observation.reasonCode ?? "PANCAKE_TAG_READ_UNVERIFIED",
      );
      return;
    }
    const configuredBlockingIds = CONTROL_TAGS
      .map((item) => this.pancake.tagId(command.pageId, item))
      .filter((item): item is string => item !== null);
    const selectedTagId = tag === null ? null : this.pancake.tagId(command.pageId, tag);
    const selectedStillPresent =
      selectedTagId !== null && observation.observedTagIds.includes(selectedTagId);
    const anyBlockingStillPresent = observation.observedTagIds.some((id) =>
      configuredBlockingIds.includes(id),
    );
    if (selectedStillPresent || (requireAllClear && anyBlockingStillPresent)) {
      await this.store.markWaiting(command, "WAITING_PANCAKE_TAG_REMOVE_VERIFICATION", 10);
      return;
    }
    const reconciled = await this.store.reconcileVerifiedTags(
      command,
      heldStateVersion,
      observation,
      true,
      this.now(),
    );
    if (!(await this.handleConflict(command, reconciled))) return;
    if (reconciled.status !== "APPLIED") return;
    const botResumed = observation.blockingTag === null;
    await this.store.markApplied(
      command,
      botResumed ? successCode : `${successCode}_HUMAN_RETAINED`,
      {
        tag,
        botResumed,
        remainingBlockingTag: observation.blockingTag,
        stateVersion: reconciled.stateVersion,
      },
    );
  }

  private async sync(command: ClaimedAdminCommand): Promise<void> {
    const observation = await this.pancake.observe(
      command.pageId,
      command.pancakeConversationId,
    );
    if (!observation.verified) {
      await this.store.markFailed(
        command,
        observation.reasonCode ?? "PANCAKE_TAG_READ_UNVERIFIED",
      );
      return;
    }
    const reconciled = await this.store.reconcileVerifiedTags(
      command,
      command.expectedStateVersion,
      observation,
      false,
      this.now(),
    );
    if (!(await this.handleConflict(command, reconciled))) return;
    if (reconciled.status !== "APPLIED") return;
    await this.store.markApplied(command, "PANCAKE_TAGS_SYNCED", {
      blockingTag: observation.blockingTag,
      observedTagCount: observation.observedTagIds.length,
      stateVersion: reconciled.stateVersion,
    });
  }

  private async requiredTag(command: ClaimedAdminCommand): Promise<ControlTag | null> {
    if (command.tag === null || !CONTROL_TAGS.includes(command.tag)) {
      await this.store.markFailed(command, "CONTROL_TAG_INVALID");
      return null;
    }
    if (this.pancake.tagId(command.pageId, command.tag) === null) {
      await this.store.markFailed(command, "PANCAKE_TAG_MAPPING_MISSING");
      return null;
    }
    return command.tag;
  }

  private async handleConflict(
    command: ClaimedAdminCommand,
    result: StateMutationResult,
  ): Promise<boolean> {
    if (result.status === "APPLIED") return true;
    await this.store.markConflict(command, result.errorCode);
    return false;
  }
}
