import { createHash } from "node:crypto";
import {
  assembleReply,
  buildVerifiedFactBlocks,
  containsBuyingSignal,
  ProductSearchService,
  guardAgentProposal,
  verifiedImageUrls,
  type CatalogFactQuery,
  type StableProductDocument,
} from "@lana/business-tools";
import { BusinessFactEnvelopeV1Schema, type AgentProposalV1, type BusinessFactEnvelopeV1 } from "@lana/contracts";
import { redactAnalyticsMessage, type ShadowContextMessage, type ShadowEvaluationStore } from "@lana/database";
import { redactCustomerUrlsForModel } from "./customer-url-policy.js";
import { VertexShadowError, type VertexShadowModel } from "./vertex.js";
import type { BusinessFactsReader } from "./redis-business-facts.js";

export function textSimilarity(left: string, right: string): number {
  const tokens = (value: string): Set<string> => new Set(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase("vi")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .split(/\s+/u)
      .filter((token) => token.length > 1),
  );
  const a = tokens(left);
  const b = tokens(right);
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export interface Phase4ShadowRunnerOptions {
  readonly maxAttempts?: number;
  readonly modelProvider?: string;
  readonly modelName: string;
  readonly shopAlias?: string;
  readonly groundedDraftEnabled?: boolean;
  readonly verifiedFactAssemblerEnabled?: boolean;
  readonly judgeV2Enabled?: boolean;
  readonly judgeV2SampleRate?: number;
  readonly judgeMode?: "DRY_RUN" | "LIVE";
}

export function shouldJudgeV2(
  evaluationId: string,
  mode: "DRY_RUN" | "LIVE",
  liveSampleRate: number,
): boolean {
  if (mode === "DRY_RUN") return true;
  if (liveSampleRate <= 0) return false;
  if (liveSampleRate >= 1) return true;
  const bucket = Number.parseInt(
    createHash("sha256").update(evaluationId).digest("hex").slice(0, 8),
    16,
  ) / 0xffffffff;
  return bucket < liveSampleRate;
}

export class Phase4ShadowRunner {
  private readonly store: ShadowEvaluationStore;
  private readonly model: VertexShadowModel;
  private readonly options: Required<Phase4ShadowRunnerOptions>;
  private readonly businessFactsReader: BusinessFactsReader | null;
  private readonly productSearch: ProductSearchService | null;

  constructor(
    store: ShadowEvaluationStore,
    model: VertexShadowModel,
    options: Phase4ShadowRunnerOptions,
    businessFactsReader?: BusinessFactsReader,
    productSearch?: ProductSearchService,
  ) {
    const judgeV2SampleRate = options.judgeV2SampleRate ?? 0.1;
    if (
      !Number.isFinite(judgeV2SampleRate) ||
      judgeV2SampleRate < 0 ||
      judgeV2SampleRate > 1
    ) {
      throw new Error("JUDGE_V2_SAMPLE_RATE_INVALID");
    }
    this.store = store;
    this.model = model;
    this.options = {
      maxAttempts: options.maxAttempts ?? 3,
      modelProvider: options.modelProvider ?? "VERTEX_AI",
      modelName: options.modelName,
      shopAlias: options.shopAlias ?? "LANA",
      groundedDraftEnabled: options.groundedDraftEnabled ?? false,
      verifiedFactAssemblerEnabled: options.verifiedFactAssemblerEnabled ?? false,
      judgeV2Enabled: options.judgeV2Enabled ?? false,
      judgeV2SampleRate,
      judgeMode: options.judgeMode ?? "DRY_RUN",
    };
    this.businessFactsReader = businessFactsReader ?? null;
    this.productSearch = productSearch ?? null;
  }

  private latestCustomerText(context: readonly ShadowContextMessage[]): string {
    return [...context].reverse().find((message) => message.direction === "INBOUND" && message.text.trim())?.text.trim() ?? "";
  }

  private modelContext(context: readonly ShadowContextMessage[]): ShadowContextMessage[] {
    return context.map((message) => ({
      ...message,
      text: redactCustomerUrlsForModel(message.text),
    }));
  }

  private modelEvidence(value: unknown): unknown {
    if (typeof value === "string") return redactCustomerUrlsForModel(value);
    if (Array.isArray(value)) return value.map((item) => this.modelEvidence(item));
    if (typeof value !== "object" || value === null) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, this.modelEvidence(item)]),
    );
  }

  private productCodes(text: string): string[] {
    return [...new Set((text.toUpperCase().match(/\b[A-Z]{1,4}\s*[-_]?\s*\d{2,6}\b/gu) ?? [])
      .map((value) => value.replace(/[\s_-]+/gu, ""))
      .filter(Boolean))];
  }

  private async resolveProduct(
    context: readonly ShadowContextMessage[],
    proposal: AgentProposalV1,
  ): Promise<StableProductDocument | null> {
    if (!this.productSearch) return null;
    const latest = this.latestCustomerText(context);
    const safeLatest = redactCustomerUrlsForModel(latest);
    const queries = [
      proposal.productId,
      ...this.productCodes(safeLatest),
      safeLatest.includes("[CUSTOMER_URL]") ? null : safeLatest,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    for (const query of [...new Set(queries)]) {
      const result = await this.productSearch.searchText(query);
      if (result.status === "MATCHED") return result.product;
      if (result.status === "AMBIGUOUS") return null;
    }
    return null;
  }

  private factsWithVerifiedImages(
    facts: BusinessFactEnvelopeV1,
    product: StableProductDocument | null,
  ): BusinessFactEnvelopeV1 {
    if (
      product === null || facts.status !== "OK" || facts.facts === null ||
      facts.productId !== product.productId
    ) return facts;
    // `parse` ném lỗi khi vượt trần 6 URL của `ProductFactsV1`, nên gán cả danh
    // sách ảnh vào đây làm hỏng cả lượt đánh giá với mã nhiều ảnh.
    return BusinessFactEnvelopeV1Schema.parse({
      ...facts,
      facts: { ...facts.facts, imageUrls: verifiedImageUrls(product, "PRICE_CARD") },
    });
  }

  private factQuery(productId: string, proposal: Awaited<ReturnType<VertexShadowModel["generate"]>>["proposal"]): CatalogFactQuery {
    const query = proposal.businessFactQuery;
    return {
      shopAlias: this.options.shopAlias,
      productId,
      intent: query.intent === "NONE" ? "INFO" : query.intent,
      offerType: query.offerType,
      color: query.color,
      size: query.size,
      deliveryRegion: query.deliveryRegion,
    };
  }

  async processOne(): Promise<boolean> {
    const job = await this.store.claimNext();
    if (!job) return false;
    try {
      const modelContext = this.modelContext(job.context);
      const initial = await this.model.generate(modelContext, job.promptVersion);
      const resolvedProduct = await this.resolveProduct(job.context, initial.proposal);
      const initialProposal = this.productSearch
        ? { ...initial.proposal, productId: resolvedProduct?.productId ?? null }
        : initial.proposal;
      let generated = { ...initial, proposal: initialProposal };
      let facts: BusinessFactEnvelopeV1 | null = null;
      const businessIntent = initialProposal.businessFactQuery.intent;
      if (
        this.businessFactsReader &&
        businessIntent !== "NONE" &&
        initialProposal.productId !== null
      ) {
        facts = this.factsWithVerifiedImages(
          await this.businessFactsReader.resolve(
            this.factQuery(initialProposal.productId, initialProposal),
          ),
          resolvedProduct,
        );
        if (facts.status === "OK" || facts.reasonCode === "DELIVERY_REGION_REQUIRED") {
          const useGroundedDraft = facts.status === "OK" &&
            resolvedProduct !== null &&
            this.options.groundedDraftEnabled &&
            this.options.verifiedFactAssemblerEnabled;
          let grounded: Awaited<ReturnType<VertexShadowModel["groundDraftWithFacts"]>> | null = null;
          if (useGroundedDraft && resolvedProduct !== null) {
            try {
              grounded = await this.model.groundDraftWithFacts(
                modelContext,
                initialProposal,
                facts,
                {
                  productId: resolvedProduct.productId,
                  title: resolvedProduct.title,
                  descriptionXml: resolvedProduct.descriptionXml ?? "",
                  materials: resolvedProduct.materials,
                  silhouettes: resolvedProduct.silhouettes,
                  occasions: resolvedProduct.occasions,
                },
                job.promptVersion,
              );
            } catch {
              // Shadow must remain evaluable when Vertex draft generation fails.
            }
          }
          const legacyGrounded = !useGroundedDraft
            ? await this.model.groundWithFacts(
                modelContext,
                initialProposal,
                facts,
                job.promptVersion,
              )
            : null;
          const tokenUsage: Record<string, number> = {};
          const secondUsage = grounded?.tokenUsage ?? legacyGrounded?.tokenUsage ?? {};
          for (const key of new Set([...Object.keys(initial.tokenUsage), ...Object.keys(secondUsage)])) {
            tokenUsage[key] = (initial.tokenUsage[key] ?? 0) + (secondUsage[key] ?? 0);
          }
          if (grounded !== null && resolvedProduct !== null) {
            const factBlocks = buildVerifiedFactBlocks(
              facts,
              initialProposal.businessFactQuery.intent,
              resolvedProduct,
            );
            const assembled = assembleReply(factBlocks, grounded.draft, facts, resolvedProduct);
            generated = {
              proposal: {
                ...initialProposal,
                reply: assembled.text || initialProposal.reply,
                attachments: [...assembled.imageUrls],
              },
              modelVersion: grounded.modelVersion,
              latencyMs: initial.latencyMs + grounded.latencyMs,
              tokenUsage,
            };
          } else if (useGroundedDraft && resolvedProduct !== null) {
            const factBlocks = buildVerifiedFactBlocks(
              facts,
              initialProposal.businessFactQuery.intent,
              resolvedProduct,
            );
            const assembled = assembleReply(
              factBlocks,
              {
                schemaVersion: 1,
                advisoryText: "",
                objectionResponse: "",
                suggestedQuestion: "",
                suggestedNextStep: "",
                attachmentImageIndices: [],
              },
              facts,
              resolvedProduct,
            );
            generated = {
              proposal: {
                ...initialProposal,
                reply: assembled.text || initialProposal.reply,
                attachments: [],
              },
              modelVersion: initial.modelVersion,
              latencyMs: initial.latencyMs,
              tokenUsage,
            };
          } else if (legacyGrounded !== null) {
            generated = {
              ...legacyGrounded,
              latencyMs: initial.latencyMs + legacyGrounded.latencyMs,
              tokenUsage,
            };
          }
        }
      }
      const proposal = {
        ...generated.proposal,
        reply: redactAnalyticsMessage(generated.proposal.reply).text,
      };
      const productVerified = resolvedProduct !== null || (facts !== null && (
        facts.status === "OK" || facts.reasonCode === "DELIVERY_REGION_REQUIRED"
      ));
      const verifiedProductIds = new Set<string>();
      if (productVerified && resolvedProduct !== null) verifiedProductIds.add(resolvedProduct.productId);
      if (productVerified && facts !== null) verifiedProductIds.add(facts.productId);
      const guarded = guardAgentProposal({
        proposal,
        facts,
        verifiedProductIds,
        buyingSignal: containsBuyingSignal(this.latestCustomerText(job.context), {
          hasProductContext: proposal.productId !== null,
        }),
        now: new Date(),
      });
      const similarity = job.actualOutboundText === null
        ? null
        : textSimilarity(proposal.reply, job.actualOutboundText);
      await this.store.complete(job.evaluationId, job.claimToken, {
        proposal,
        guardedPlan: guarded,
        blockedReasonCodes: guarded.blockedReasonCodes,
        modelProvider: this.options.modelProvider,
        modelName: this.options.modelName,
        modelVersion: generated.modelVersion,
        latencyMs: generated.latencyMs,
        tokenUsage: generated.tokenUsage,
        textSimilarity: similarity,
        inputContextHash: job.contextHash,
        actualOutboundText: job.actualOutboundText,
        actualOutboundCount: job.actualOutboundCount,
        businessFactAudit: facts === null ? null : {
          status: facts.status,
          source: facts.source,
          observedAt: facts.observedAt,
          expiresAt: facts.expiresAt,
          productId: facts.productId,
          reasonCode: facts.reasonCode,
        },
        businessFactEnvelope: facts,
      });
      return true;
    } catch (error) {
      const code = error instanceof VertexShadowError ? error.code : "SHADOW_EVALUATION_FAILED";
      const retryable = error instanceof VertexShadowError ? error.retryable : true;
      await this.store.fail(job.evaluationId, job.claimToken, code, retryable, this.options.maxAttempts);
      return true;
    }
  }

  async processComparisonOne(): Promise<boolean> {
    const job = await this.store.claimComparisonNext();
    if (!job) return false;
    const similarity = textSimilarity(job.proposalReply, job.actualOutboundText);
    try {
      if (
        this.options.judgeV2Enabled &&
        !shouldJudgeV2(
          job.evaluationId,
          this.options.judgeMode,
          this.options.judgeV2SampleRate,
        )
      ) {
        await this.store.completeComparison(job, similarity, {
          schemaVersion: 2,
          status: "NOT_SAMPLED",
          sampleMode: this.options.judgeMode,
          sampleRate: this.options.judgeV2SampleRate,
        });
        return true;
      }
      const parsedFacts = BusinessFactEnvelopeV1Schema.safeParse(
        job.businessFactEnvelope,
      );
      const modelContext = this.modelContext(job.context);
      const modelActualOutboundText = redactCustomerUrlsForModel(job.actualOutboundText);
      const assessment = this.options.judgeV2Enabled
        ? await this.model.judgeSalesReplyV2(
            modelContext,
            modelActualOutboundText,
            parsedFacts.success ? parsedFacts.data : null,
            this.modelEvidence(job.proposalSummary),
            this.modelEvidence(job.guardOutcome),
          )
        : await this.model.judgeSalesReply(
            modelContext,
            modelActualOutboundText,
          );
      const improvedReplyGuard = assessment.schemaVersion === 2
        ? guardAgentProposal({
            proposal: {
              schemaVersion: 1,
              intent: assessment.intent,
              conversationStage: assessment.conversationStage,
              productId: parsedFacts.success ? parsedFacts.data.productId : null,
              action: "REPLY",
              reply: assessment.improvedReply || "Không có đề xuất.",
              attachments: [],
              handoffReason: null,
              businessFactQuery: {
                intent: "NONE",
                offerType: null,
                color: null,
                size: null,
                deliveryRegion: null,
              },
            },
            facts: parsedFacts.success ? parsedFacts.data : null,
            verifiedProductIds: new Set(
              parsedFacts.success ? [parsedFacts.data.productId] : [],
            ),
            now: parsedFacts.success
              ? new Date(parsedFacts.data.observedAt)
              : new Date(),
          })
        : null;
      const improvedReplySafe =
        improvedReplyGuard === null ||
          improvedReplyGuard.blockedReasonCodes.length === 0
          ? assessment.improvedReply
          : "";
      const safeAssessment = {
        ...assessment,
        strengths: assessment.strengths.map((value) => redactAnalyticsMessage(value).text),
        weaknesses: [
          ...assessment.weaknesses.map((value) =>
            redactAnalyticsMessage(value).text
          ),
          ...(improvedReplyGuard?.blockedReasonCodes.length
            ? ["IMPROVED_REPLY_UNVERIFIED_FACT"]
            : []),
        ].slice(0, 10),
        improvedReply: redactAnalyticsMessage(improvedReplySafe).text,
      };
      await this.store.completeComparison(job, similarity, safeAssessment);
    } catch (error) {
      const code = error instanceof VertexShadowError ? error.code : "SHADOW_JUDGE_FAILED";
      await this.store.completeComparison(job, similarity, {
        schemaVersion: 1,
        status: "UNAVAILABLE",
        errorCode: code,
      });
    }
    return true;
  }
}
