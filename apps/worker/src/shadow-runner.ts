import {
  ProductSearchService,
  guardAgentProposal,
  verifiedImageUrls,
  type CatalogFactQuery,
  type StableProductDocument,
} from "@lana/business-tools";
import { BusinessFactEnvelopeV1Schema, type AgentProposalV1, type BusinessFactEnvelopeV1 } from "@lana/contracts";
import { redactAnalyticsMessage, type ShadowContextMessage, type ShadowEvaluationStore } from "@lana/database";
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
    this.store = store;
    this.model = model;
    this.options = {
      maxAttempts: options.maxAttempts ?? 3,
      modelProvider: options.modelProvider ?? "VERTEX_AI",
      modelName: options.modelName,
      shopAlias: options.shopAlias ?? "LANA",
    };
    this.businessFactsReader = businessFactsReader ?? null;
    this.productSearch = productSearch ?? null;
  }

  private latestCustomerText(context: readonly ShadowContextMessage[]): string {
    return [...context].reverse().find((message) => message.direction === "INBOUND" && message.text.trim())?.text.trim() ?? "";
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
    const queries = [
      proposal.productId,
      ...this.productCodes(latest),
      latest,
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
      const initial = await this.model.generate(job.context, job.promptVersion);
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
          const grounded = await this.model.groundWithFacts(
            job.context,
            initialProposal,
            facts,
            job.promptVersion,
          );
          const tokenUsage: Record<string, number> = {};
          for (const key of new Set([...Object.keys(initial.tokenUsage), ...Object.keys(grounded.tokenUsage)])) {
            tokenUsage[key] = (initial.tokenUsage[key] ?? 0) + (grounded.tokenUsage[key] ?? 0);
          }
          generated = {
            ...grounded,
            latencyMs: initial.latencyMs + grounded.latencyMs,
            tokenUsage,
          };
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
      const assessment = await this.model.judgeSalesReply(job.context, job.actualOutboundText);
      const safeAssessment = {
        ...assessment,
        strengths: assessment.strengths.map((value) => redactAnalyticsMessage(value).text),
        weaknesses: assessment.weaknesses.map((value) => redactAnalyticsMessage(value).text),
        improvedReply: redactAnalyticsMessage(assessment.improvedReply).text,
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
