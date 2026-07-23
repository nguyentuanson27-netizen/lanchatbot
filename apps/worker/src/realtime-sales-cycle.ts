import { createHash } from "node:crypto";
import {
  CheckoutRevalidationV1Schema,
  OrderPreviewV1Schema,
  type CartV1,
  type BankTransferPolicyV1,
  type CheckoutRevalidationV1,
  type RevalidatedFactV1,
} from "@lana/contracts";
import {
  applySalesCycleCommand,
  computeBankTransferPolicyHash,
  computeBusinessContentHash,
  computeOrderPreviewHash,
  createSalesCycleRuntimeState,
  outboundRuntimePolicy,
  runtimePolicyBundleReference,
  type BankTransferPolicyResolver,
  type RuntimePolicyResolution,
  type ResolvedCartDraftV1,
  type ResolvedCartMutationV1,
  type SalesCycleCommand,
  type SalesCycleRuntimeResult,
  type SalesCycleRuntimeState,
  type SalesCycleTrustedPortsV1,
  type VerifiedInboundMessageV1,
} from "@lana/chat-runtime";
import type {
  RealtimeSalesCycleEventPlan,
  RealtimeSalesCyclePlan,
} from "@lana/database";
import type {
  BusinessFactsReader,
} from "./redis-business-facts.js";
import type {
  CartSelectionResult,
} from "./realtime-sales-catalog.js";

const CART_TTL_MS = 48 * 60 * 60 * 1_000;
const PREVIEW_TTL_MS = 30 * 60 * 1_000;

export interface RealtimeSalesCycleInput {
  readonly pageId: string;
  readonly conversationId: string;
  readonly customerHash: string;
  readonly state: SalesCycleRuntimeState;
  readonly stateRevision: number;
  readonly text: string;
  readonly messageId: string;
  readonly eventKey: string;
  readonly senderId: string;
  readonly occurredAt: string;
  readonly attachmentIds: readonly string[];
  readonly productId: string | null;
  readonly offerType: string | null;
  readonly size: string | null;
  readonly color: string | null;
  readonly shopAlias: string;
  readonly policyResolution: RuntimePolicyResolution | null;
  readonly facts: BusinessFactsReader;
  readonly now: Date;
}

export interface RealtimeSalesCycleOutput {
  readonly handled: boolean;
  readonly messages: readonly (
    | { readonly kind: "TEXT"; readonly text: string }
    | { readonly kind: "IMAGE"; readonly imageUrl: string }
  )[];
  readonly plan: RealtimeSalesCyclePlan<SalesCycleRuntimeState> | null;
  readonly transferToHuman: boolean;
  readonly desiredTag: "NHAN_VIEN" | "DA_CHOT_DON" | null;
  readonly reasonCode: string | null;
}

interface CheckoutDetails {
  readonly fullName?: string;
  readonly phone?: string;
  readonly address?: string;
  readonly paymentMethod?: "COD" | "BANK_TRANSFER";
}

interface RevalidationBuild {
  readonly value: CheckoutRevalidationV1;
  readonly eta: { readonly minDays: number; readonly maxDays: number } | null;
}

function asciiFold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/giu, "d")
    .toLowerCase();
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  ).join(",")}}`;
}

function version(group: string, values: readonly string[]): string {
  return `${group}:sha256:${createHash("sha256").update(canonicalJson([...values].sort()), "utf8").digest("hex")}`;
}

function deterministicUuid(seed: string): string {
  const hash = createHash("sha256").update(seed, "utf8").digest("hex");
  const variant = ((Number.parseInt(hash[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function money(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function explicitSize(text: string): string | null {
  return text.toUpperCase().match(/(?:^|[^A-Z])(S|M|L|XL)(?:$|[^A-Z])/u)?.[1] ?? null;
}

function explicitQuantityValue(text: string): number | null {
  const folded = asciiFold(text);
  const match = folded.match(/(?:^|\s)(\d{1,2})\s*(?:set|bo|sp|san pham|mau)(?:\s|$)/u);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) && value >= 1 && value <= 20 ? value : null;
}

function explicitQuantity(text: string): number {
  return explicitQuantityValue(text) ?? 1;
}

function purchaseReady(text: string): boolean {
  return /(?:^|\s)(?:chốt|chot|lấy|lay|đặt|dat|mua)(?:\s|$)/iu.test(text);
}

function confirmation(text: string): boolean {
  return /^(?:dạ\s+)?(?:ok|oke|đồng ý|dong y|xác nhận|xac nhan|chốt|chot|lấy|lay)(?:\s|$)/iu.test(text.trim());
}

function priceObjection(text: string): boolean {
  return /(đắt|dat qua|giá cao|gia cao|bớt giá|bot gia|giảm thêm|giam them|fix giá|fix gia|ưu đãi thêm|uu dai them)/iu.test(text);
}

function removeItem(text: string): boolean {
  return /(bỏ|bo|bớt|bot|không lấy|khong lay)\s+(?:mẫu|mau|sp|sản phẩm|san pham|set|bộ|bo)/iu.test(text);
}

function labeledValue(text: string, labels: readonly string[]): string | undefined {
  const pattern = new RegExp(`^(?:${labels.join("|")})\\s*[:\\-]\\s*(.+)$`, "imu");
  const value = text.match(pattern)?.[1]?.trim();
  return value || undefined;
}

function checkoutDetails(text: string): CheckoutDetails {
  const phone = labeledValue(text, ["sđt", "sdt", "điện thoại", "dien thoai", "phone"]) ??
    text.match(/(?:^|[^\d])((?:\+?84|0)\d{8,10})(?:[^\d]|$)/u)?.[1];
  const paymentMethod = /(chuyển khoản|chuyen khoan|\bck\b|bank)/iu.test(text)
    ? "BANK_TRANSFER" as const
    : /(?:^|\s)(?:cod|tiền mặt|tien mat|nhận hàng trả|nhan hang tra)(?:\s|$)/iu.test(text)
      ? "COD" as const
      : undefined;
  const fullName = labeledValue(text, ["tên", "ten", "họ tên", "ho ten", "người nhận", "nguoi nhan"]);
  const address = labeledValue(text, ["địa chỉ", "dia chi", "đ/c", "dc"]);
  return {
    ...(fullName ? { fullName } : {}),
    ...(phone ? { phone } : {}),
    ...(address ? { address } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
  };
}

function missingCheckout(
  state: SalesCycleRuntimeState,
): readonly string[] {
  const draft = state.checkoutDraft;
  return [
    ...(draft?.fullName ? [] : ["tên người nhận"]),
    ...(draft?.phone ? [] : ["số điện thoại"]),
    ...(draft?.address ? [] : ["địa chỉ"]),
    ...(draft?.paymentMethod ? [] : ["COD hoặc chuyển khoản"]),
  ];
}

function cartSummary(cart: CartV1): string {
  const hasFreeShipping = cart.adjustments.some(({ kind }) => kind === "FREE_SHIPPING");
  const lines = cart.lines.map((line) => {
    const sizes = [...new Set(line.components.map(({ size }) => size).filter(Boolean))].join("/");
    return `${line.parentProductId}${sizes ? ` size ${sizes}` : ""} ×${line.quantity}: ${money(line.lineTotalVnd ?? 0)}`;
  });
  return [
    ...lines,
    `Tạm tính: ${money(cart.subtotalVnd ?? 0)}`,
    ...(cart.discountTotalVnd ? [`Ưu đãi: -${money(cart.discountTotalVnd)}`] : []),
    `Phí ship: ${hasFreeShipping || cart.shippingFeeVnd === 0 ? "Freeship" : money(cart.shippingFeeVnd ?? 0)}`,
    `Tổng: ${money(cart.grandTotalVnd ?? 0)}`,
  ].join("\n");
}

function checkoutTemplate(cart: CartV1): string {
  return `${cartSummary(cart)}\nC gửi giúp em:\nTên:\nSĐT:\nĐịa chỉ:\nThanh toán: COD hoặc chuyển khoản nha.`;
}

function trustedInbound(input: RealtimeSalesCycleInput): VerifiedInboundMessageV1 {
  return {
    messageId: input.messageId,
    pageId: input.pageId,
    conversationId: input.conversationId,
    senderType: "CUSTOMER",
    observedAt: input.occurredAt,
    attachments: input.attachmentIds.map((attachmentId) => ({
      attachmentId,
      kind: "IMAGE" as const,
    })),
  };
}

function failedOutput(
  reasonCode: string,
  plan: RealtimeSalesCyclePlan<SalesCycleRuntimeState> | null = null,
): RealtimeSalesCycleOutput {
  return {
    handled: true,
    messages: [],
    plan,
    transferToHuman: true,
    desiredTag: "NHAN_VIEN",
    reasonCode,
  };
}

function paymentPolicy(
  resolution: RuntimePolicyResolution | null,
): {
  readonly policy: BankTransferPolicyV1;
  readonly reference: {
    readonly policyId: string;
    readonly version: string;
    readonly contentHash: `sha256:${string}`;
  };
} | null {
  const bundle = outboundRuntimePolicy(resolution);
  const artifact = bundle?.artifacts.paymentPolicy;
  if (!bundle || !artifact?.bankTransfer) return null;
  const ref = bundle.versionReferences.find(({ artifactKind }) =>
    artifact.kind === "PAYMENT_POLICY" && artifactKind === "PAYMENT_POLICY"
  );
  if (!ref) return null;
  const policy = {
    policyId: ref.artifactKey,
    version: String(ref.versionNumber),
    bankName: artifact.bankTransfer.bankName,
    accountNumber: artifact.bankTransfer.accountNumber,
    accountHolder: artifact.bankTransfer.accountHolder,
    qrImageUrl: artifact.bankTransfer.qrAssetUrl,
    customerInstruction: artifact.bankTransfer.receiptInstruction,
    effectiveAt: bundle.policy.effectiveAt,
    effectiveUntil: bundle.policy.effectiveUntil,
  };
  return {
    policy,
    reference: {
      policyId: policy.policyId,
      version: policy.version,
      contentHash: computeBankTransferPolicyHash(policy),
    },
  };
}

async function currentSelections(
  input: RealtimeSalesCycleInput,
  cart: CartV1,
  address: string,
): Promise<readonly CartSelectionResult[]> {
  if (!input.facts.resolveCartSelection) return [];
  return Promise.all(cart.lines.map((line) => {
    const sizes = [...new Set(line.components.map(({ size }) => size).filter((value): value is string => value !== null))];
    const colors = [...new Set(line.components.map(({ color }) => color).filter((value): value is string => value !== null))];
    return input.facts.resolveCartSelection!({
      shopAlias: input.shopAlias,
      productId: line.parentProductId,
      offerType: line.offerId,
      size: sizes.length === 1 ? sizes[0]! : null,
      color: colors.length === 1 ? colors[0]! : null,
      quantity: line.quantity,
      lineId: line.lineId,
      deliveryAddress: address,
    }, input.now);
  }));
}

function fact(
  before: string | null,
  after: string | null,
  checkedAt: string,
  missing: boolean,
): RevalidatedFactV1 {
  const status = missing ? "MISSING" : before === after ? "MATCHED" : "CHANGED";
  return {
    status,
    sourceVersionBefore: before,
    sourceVersionAfter: after,
    checkedAt,
  };
}

function revalidation(
  cart: CartV1,
  selections: readonly CartSelectionResult[],
  now: Date,
  baseline?: CheckoutRevalidationV1,
): RevalidationBuild {
  const ready = selections.filter((value): value is Extract<CartSelectionResult, { status: "READY" }> =>
    value.status === "READY"
  );
  const checkedAt = now.toISOString();
  const current = ready.length === cart.lines.length
    ? {
        price: version("price", ready.map(({ versions }) => versions.price)),
        inventory: version("inventory", ready.map(({ versions }) => versions.inventory)),
        size: version("size", ready.map(({ versions }) => versions.size)),
        eta: ready.every(({ versions }) => versions.eta !== null)
          ? version("eta", ready.map(({ versions }) => versions.eta!))
          : null,
      }
    : { price: null, inventory: null, size: null, eta: null };
  const initial = baseline ?? {
    price: { sourceVersionAfter: current.price },
    inventory: { sourceVersionAfter: current.inventory },
    size: { sourceVersionAfter: current.size },
    eta: { sourceVersionAfter: current.eta },
  };
  const value = CheckoutRevalidationV1Schema.parse({
    cartId: cart.cartId,
    cartVersion: cart.revision,
    price: fact(initial.price.sourceVersionAfter, current.price, checkedAt, current.price === null),
    inventory: fact(initial.inventory.sourceVersionAfter, current.inventory, checkedAt, current.inventory === null),
    size: fact(initial.size.sourceVersionAfter, current.size, checkedAt, current.size === null),
    eta: fact(initial.eta.sourceVersionAfter, current.eta, checkedAt, current.eta === null),
    eligible: current.price !== null && current.inventory !== null &&
      current.size !== null && current.eta !== null &&
      initial.price.sourceVersionAfter === current.price &&
      initial.inventory.sourceVersionAfter === current.inventory &&
      initial.size.sourceVersionAfter === current.size &&
      initial.eta.sourceVersionAfter === current.eta,
    checkedAt,
  });
  const etaValues = ready.map(({ eta }) => eta).filter((value): value is NonNullable<typeof value> => value !== null);
  return {
    value,
    eta: etaValues.length === ready.length && etaValues.length > 0
      ? {
          minDays: Math.max(...etaValues.map(({ minDays }) => minDays)),
          maxDays: Math.max(...etaValues.map(({ maxDays }) => maxDays)),
        }
      : null,
  };
}

export function createRealtimeSalesState(
  conversationId: string,
  pageId: string,
  now: Date,
): SalesCycleRuntimeState {
  return createSalesCycleRuntimeState(
    conversationId,
    { pageId, conversationId },
    now,
  );
}

export async function evaluateRealtimeSalesCycle(
  input: RealtimeSalesCycleInput,
): Promise<RealtimeSalesCycleOutput> {
  const initial = input.state;
  if (
    initial.revision !== input.stateRevision ||
    initial.routing.pageId !== input.pageId ||
    initial.routing.conversationId !== input.conversationId
  ) throw new Error("SALES_CYCLE_STATE_INVALID");
  const bundle = outboundRuntimePolicy(input.policyResolution);
  if (!bundle || !input.facts.resolveCartSelection) {
    return {
      handled: false, messages: [], plan: null, transferToHuman: false,
      desiredTag: null, reasonCode: null,
    };
  }
  let state = initial;
  const events: RealtimeSalesCycleEventPlan[] = [];
  const references = new Map<string, unknown>();
  const inbound = trustedInbound(input);
  let checkoutValidation: CheckoutRevalidationV1 | null = null;
  const bank = paymentPolicy(input.policyResolution);
  const policyReference = runtimePolicyBundleReference(bundle);
  references.set(canonicalJson(policyReference), bundle.policy);
  const ports: SalesCycleTrustedPortsV1 = {
    resolveCartDraft: (reference) =>
      (references.get(canonicalJson(reference)) as ResolvedCartDraftV1 | undefined) ?? null,
    resolveCartMutation: (reference) =>
      (references.get(canonicalJson(reference)) as ResolvedCartMutationV1 | undefined) ?? null,
    resolveShopPolicy: (reference) =>
      (references.get(canonicalJson(reference)) as ReturnType<SalesCycleTrustedPortsV1["resolveShopPolicy"]> | undefined) ?? null,
    resolveInboundMessage: (sourceMessageId) => sourceMessageId === input.messageId ? inbound : null,
    revalidateCheckout: () => checkoutValidation,
  };
  const bankResolver: BankTransferPolicyResolver = (reference) =>
    bank && canonicalJson(reference) === canonicalJson(bank.reference) ? bank.policy : null;

  const apply = (command: SalesCycleCommand): SalesCycleRuntimeResult => {
    const before = state;
    const result = applySalesCycleCommand({
      state,
      expectedRevision: state.revision,
      command,
      now: input.now,
      trustedPorts: ports,
      resolveBankTransferPolicy: bankResolver,
    });
    if (result.status === "APPLIED" || result.status === "HANDOFF") {
      state = result.state;
      events.push({
        commandId: command.commandId,
        commandKind: command.kind,
        outcome: result.status,
        stateRevisionBefore: before.revision,
        stateRevisionAfter: state.revision,
        stageBefore: before.stage,
        stageAfter: state.stage,
        cartId: state.cart?.value.cartId ?? null,
        cartVersion: state.cart?.value.revision ?? null,
        reasonCode: result.status === "HANDOFF" ? result.reasonCode : null,
        occurredAt: input.now,
      });
    }
    return result;
  };

  const commandId = (suffix: string) => `sales:${input.eventKey}:${suffix}`;
  const plan = (): RealtimeSalesCyclePlan<SalesCycleRuntimeState> | null => {
    if (events.length === 0) return null;
    const cartExpiry = state.cart ? new Date(state.cart.expiresAt) : null;
    const expiresAt = cartExpiry ?? new Date(input.now.getTime() + CART_TTL_MS);
    return {
      expectedRevision: initial.revision,
      state,
      cartExpiresAt: cartExpiry,
      expiresAt,
      events,
    };
  };

  if (
    state.stage === "PURCHASE_CONFIRMED" &&
    input.attachmentIds.length > 0
  ) {
    const result = apply({
      kind: "PAYMENT_RECEIPT_RECEIVED",
      commandId: commandId("payment-receipt"),
      sourceMessageId: input.messageId,
      attachmentId: input.attachmentIds[0]!,
    });
    return result.status === "HANDOFF"
      ? failedOutput(result.reasonCode, plan())
      : { handled: false, messages: [], plan: plan(), transferToHuman: false, desiredTag: null, reasonCode: null };
  }

  if (state.stage === "ORDER_PREVIEW" && confirmation(input.text)) {
    if (!state.cart || !state.preview || !state.checkoutDraft?.address) {
      return failedOutput("ORDER_PREVIEW_STATE_INVALID", plan());
    }
    const selections = await currentSelections(input, state.cart.value, state.checkoutDraft.address);
    checkoutValidation = revalidation(
      state.cart.value,
      selections,
      input.now,
      state.preview.revalidation,
    ).value;
    const result = apply({
      kind: "CONFIRM_PURCHASE",
      commandId: commandId("confirm"),
      intent: {
        source: "MODEL_STRUCTURED_OUTPUT",
        intent: "PURCHASE_CONFIRMATION",
        sourceMessageId: input.messageId,
      },
    });
    if (result.status === "HANDOFF") return failedOutput(result.reasonCode, plan());
    if (result.status !== "APPLIED" || !result.confirmation) {
      return failedOutput("PURCHASE_CONFIRMATION_REJECTED", plan());
    }
    const messages: RealtimeSalesCycleOutput["messages"] = [
      {
        kind: "TEXT",
        text: "Em đã ghi nhận xác nhận mua hàng. Nhân viên sẽ kiểm tra và lên đơn cho c ngay ạ.",
      },
      ...(result.paymentInstruction
        ? [
            { kind: "TEXT" as const, text: result.paymentInstruction.text },
            { kind: "IMAGE" as const, imageUrl: result.paymentInstruction.qrImageUrl },
          ]
        : []),
    ];
    return {
      handled: true,
      messages,
      plan: plan(),
      transferToHuman: true,
      desiredTag: "DA_CHOT_DON",
      reasonCode: "PURCHASE_CONFIRMED",
    };
  }

  if (state.cart && (state.stage === "CART_OPEN" || state.stage === "ORDER_PREVIEW")) {
    if (removeItem(input.text)) {
      const productId = input.productId ?? state.cart.value.lines.at(-1)?.parentProductId ?? null;
      const line = state.cart.value.lines.find(({ parentProductId }) => parentProductId === productId);
      if (!line || state.cart.value.lines.length <= 1) {
        return {
          handled: true,
          messages: [{ kind: "TEXT", text: "Giỏ chỉ còn một mẫu; c muốn đổi sang mã nào gửi em mã sp nhé." }],
          plan: null,
          transferToHuman: false,
          desiredTag: null,
          reasonCode: null,
        };
      }
      const resolved = { mutation: { kind: "REMOVE_LINE" as const, lineId: line.lineId } };
      const reference = {
        id: `cart-mutation:${state.cart.value.cartId}`,
        version: `${state.cart.value.revision + 1}`,
        contentHash: computeBusinessContentHash(resolved),
      };
      references.set(canonicalJson(reference), resolved);
      const result = apply({
        kind: "CART_MUTATED",
        commandId: commandId("remove-line"),
        expectedCartVersion: state.cart.value.revision,
        mutationRef: reference,
        mutationReasonCode: "LINE_REMOVED",
      });
      if (result.status !== "APPLIED" || !state.cart) return failedOutput("CART_REMOVE_FAILED", plan());
      return {
        handled: true,
        messages: [{ kind: "TEXT", text: `${cartSummary(state.cart.value)}\nEm đã tính lại ưu đãi theo giỏ mới ạ.` }],
        plan: plan(),
        transferToHuman: false,
        desiredTag: null,
        reasonCode: null,
      };
    }

    if (priceObjection(input.text)) {
      if (!state.negotiation) return failedOutput("NEGOTIATION_STATE_MISSING", plan());
      const result = apply({
        kind: "NEGOTIATION_EVENT",
        commandId: commandId("price-objection"),
        expectedNegotiationVersion: state.negotiation.stateVersion,
        sourceMessageId: input.messageId,
        intent: "PRICE_OBJECTION",
        reasonCode: "PRICE_TOO_HIGH",
      });
      if (
        result.status === "DUPLICATE" ||
        (result.status === "REJECTED" &&
          result.reasonCode === "NEGOTIATION_EVENT_ID_COLLISION")
      ) {
        return {
          handled: true,
          messages: [],
          plan: plan(),
          transferToHuman: false,
          desiredTag: null,
          reasonCode: "NEGOTIATION_REPLAY_IGNORED",
        };
      }
      if (result.status !== "APPLIED" || !state.cart || !state.negotiation) {
        return failedOutput("NEGOTIATION_FAILED", plan());
      }
      const intro = state.negotiation.customerState === "HESITANT"
        ? "Em hỗ trợ freeship cho giỏ này."
        : "Mức cuối em hỗ trợ thêm 20k và freeship.";
      return {
        handled: true,
        messages: [{ kind: "TEXT", text: `${intro}\n${cartSummary(state.cart.value)}` }],
        plan: plan(),
        transferToHuman: false,
        desiredTag: null,
        reasonCode: null,
      };
    }

    const details = checkoutDetails(input.text);
    const hasDetails = Object.keys(details).length > 0;
    if (hasDetails) {
      const captured = apply({
        kind: "CHECKOUT_DETAILS_CAPTURED",
        commandId: commandId("checkout-details"),
        details,
      });
      if (captured.status !== "APPLIED") return failedOutput("CHECKOUT_DETAILS_REJECTED", plan());
      const missing = missingCheckout(state);
      if (missing.length > 0) {
        return {
          handled: true,
          messages: [{ kind: "TEXT", text: `C gửi thêm ${missing.join(", ")} giúp em nha.` }],
          plan: plan(),
          transferToHuman: false,
          desiredTag: null,
          reasonCode: null,
        };
      }
      if (!state.cart || !state.checkoutDraft?.fullName || !state.checkoutDraft.phone ||
          !state.checkoutDraft.address || !state.checkoutDraft.paymentMethod) {
        return failedOutput("CHECKOUT_DRAFT_INCOMPLETE", plan());
      }
      if (state.checkoutDraft.paymentMethod === "BANK_TRANSFER" && !bank) {
        return failedOutput("BANK_TRANSFER_POLICY_UNAVAILABLE", plan());
      }
      const ready = apply({
        kind: "CART_READY",
        commandId: commandId("cart-ready"),
        expectedCartVersion: state.cart.value.revision,
      });
      if (ready.status !== "APPLIED" || !state.cart) return failedOutput("CART_READY_REJECTED", plan());
      const selections = await currentSelections(input, state.cart.value, state.checkoutDraft.address);
      const checked = revalidation(state.cart.value, selections, input.now);
      if (!checked.value.eligible || !checked.eta) {
        return failedOutput("CHECKOUT_REVALIDATION_UNAVAILABLE", plan());
      }
      const previewPayload = {
        schemaVersion: 1 as const,
        previewId: deterministicUuid(`${state.cart.value.cartId}:${state.cart.value.revision}:preview`),
        cartId: state.cart.value.cartId,
        cartVersion: state.cart.value.revision,
        stage: "ORDER_PREVIEW" as const,
        recipient: {
          fullName: state.checkoutDraft.fullName,
          phone: state.checkoutDraft.phone,
          address: state.checkoutDraft.address,
          retentionClass: "CART_48H_OPERATIONAL" as const,
        },
        payment: state.checkoutDraft.paymentMethod === "COD"
          ? { method: "COD" as const, bankTransferPolicyRef: null }
          : { method: "BANK_TRANSFER" as const, bankTransferPolicyRef: bank!.reference },
        revalidation: checked.value,
        createdAt: input.now.toISOString(),
        expiresAt: new Date(Math.min(
          Date.parse(state.cart.expiresAt),
          input.now.getTime() + PREVIEW_TTL_MS,
        )).toISOString(),
      };
      const preview = OrderPreviewV1Schema.parse({
        ...previewPayload,
        previewHash: computeOrderPreviewHash(previewPayload),
      });
      const previewed = apply({
        kind: "PREVIEW_CREATED",
        commandId: commandId("preview"),
        preview,
      });
      if (previewed.status !== "APPLIED" || !state.cart) return failedOutput("ORDER_PREVIEW_REJECTED", plan());
      return {
        handled: true,
        messages: [{
          kind: "TEXT",
          text: `${cartSummary(state.cart.value)}\nNgười nhận: ${preview.recipient.fullName} - ${preview.recipient.phone}\nĐịa chỉ: ${preview.recipient.address}\nThanh toán: ${preview.payment.method === "COD" ? "COD" : "Chuyển khoản"}\nDự kiến nhận hàng: ${checked.eta.minDays}-${checked.eta.maxDays} ngày.\nC xác nhận chốt đơn giúp em nhé.`,
        }],
        plan: plan(),
        transferToHuman: false,
        desiredTag: null,
        reasonCode: null,
      };
    }

    if (
      purchaseReady(input.text) &&
      input.productId &&
      state.cart.value.lines.some(({ parentProductId }) => parentProductId === input.productId) &&
      explicitQuantityValue(input.text) !== null
    ) {
      const existing = state.cart.value.lines.find(({ parentProductId }) =>
        parentProductId === input.productId
      )!;
      const quantity = explicitQuantityValue(input.text)!;
      if (quantity === existing.quantity) {
        return {
          handled: true,
          messages: [],
          plan: null,
          transferToHuman: false,
          desiredTag: null,
          reasonCode: "CART_QUANTITY_UNCHANGED",
        };
      }
      const sizes = [...new Set(existing.components
        .map(({ size }) => size)
        .filter((value): value is string => value !== null))];
      const colors = [...new Set(existing.components
        .map(({ color }) => color)
        .filter((value): value is string => value !== null))];
      const verified = await input.facts.resolveCartSelection({
        shopAlias: input.shopAlias,
        productId: existing.parentProductId,
        offerType: existing.offerId,
        size: sizes.length === 1 ? sizes[0]! : null,
        color: colors.length === 1 ? colors[0]! : null,
        quantity,
        lineId: existing.lineId,
      }, input.now);
      if (verified.status !== "READY") return failedOutput(verified.reasonCode, plan());
      const resolved = {
        mutation: {
          kind: "SET_QUANTITY" as const,
          lineId: existing.lineId,
          quantity,
        },
      };
      const reference = {
        id: `cart-mutation:${state.cart.value.cartId}`,
        version: `${state.cart.value.revision + 1}`,
        contentHash: computeBusinessContentHash(resolved),
      };
      references.set(canonicalJson(reference), resolved);
      const result = apply({
        kind: "CART_MUTATED",
        commandId: commandId("set-quantity"),
        expectedCartVersion: state.cart.value.revision,
        mutationRef: reference,
        mutationReasonCode: "QUANTITY_CHANGED",
      });
      if (result.status !== "APPLIED" || !state.cart) {
        return failedOutput("CART_QUANTITY_CHANGE_FAILED", plan());
      }
      return {
        handled: true,
        messages: [{ kind: "TEXT", text: checkoutTemplate(state.cart.value) }],
        plan: plan(),
        transferToHuman: false,
        desiredTag: null,
        reasonCode: null,
      };
    }

    if (
      purchaseReady(input.text) &&
      input.productId &&
      !state.cart.value.lines.some(({ parentProductId }) => parentProductId === input.productId)
    ) {
      const selected = await input.facts.resolveCartSelection({
        shopAlias: input.shopAlias,
        productId: input.productId,
        offerType: input.offerType,
        size: explicitSize(input.text) ?? input.size,
        color: input.color,
        quantity: explicitQuantity(input.text),
        lineId: deterministicUuid(`${state.cart.value.cartId}:${input.productId}:${input.eventKey}`),
      }, input.now);
      if (selected.status !== "READY") {
        if (selected.status === "SIZE_REQUIRED" || selected.status === "COLOR_REQUIRED") {
          const values = selected.status === "SIZE_REQUIRED" ? selected.availableSizes : selected.availableColors;
          return {
            handled: true,
            messages: [{ kind: "TEXT", text: `C chọn ${selected.status === "SIZE_REQUIRED" ? "size" : "màu"} ${values.join("/")} giúp em nha.` }],
            plan: null,
            transferToHuman: false,
            desiredTag: null,
            reasonCode: null,
          };
        }
        return failedOutput(selected.reasonCode, plan());
      }
      const resolved = { mutation: { kind: "ADD_LINE" as const, line: selected.line } };
      const reference = {
        id: `cart-mutation:${state.cart.value.cartId}`,
        version: `${state.cart.value.revision + 1}`,
        contentHash: computeBusinessContentHash(resolved),
      };
      references.set(canonicalJson(reference), resolved);
      const result = apply({
        kind: "CART_MUTATED",
        commandId: commandId("add-line"),
        expectedCartVersion: state.cart.value.revision,
        mutationRef: reference,
        mutationReasonCode: "LINE_ADDED",
      });
      if (result.status !== "APPLIED" || !state.cart) return failedOutput("CART_ADD_FAILED", plan());
      return {
        handled: true,
        messages: [{ kind: "TEXT", text: checkoutTemplate(state.cart.value) }],
        plan: plan(),
        transferToHuman: false,
        desiredTag: null,
        reasonCode: null,
      };
    }
  }

  if (purchaseReady(input.text) && input.productId) {
    const selected = await input.facts.resolveCartSelection({
      shopAlias: input.shopAlias,
      productId: input.productId,
      offerType: input.offerType,
      size: explicitSize(input.text) ?? input.size,
      color: input.color,
      quantity: explicitQuantity(input.text),
      lineId: deterministicUuid(`${input.conversationId}:${input.productId}:${input.eventKey}`),
    }, input.now);
    if (selected.status !== "READY") {
      if (selected.status === "SIZE_REQUIRED" || selected.status === "COLOR_REQUIRED") {
        if (state.stage === "DISCOVERY") {
          apply({ kind: "FACTS_PRESENTED", commandId: commandId("facts") });
        }
        if (state.stage === "FACTS_PRESENTED") {
          apply({ kind: "MEASUREMENTS_REQUIRED", commandId: commandId("measurements") });
        }
        const values = selected.status === "SIZE_REQUIRED" ? selected.availableSizes : selected.availableColors;
        return {
          handled: true,
          messages: [{ kind: "TEXT", text: `C chọn ${selected.status === "SIZE_REQUIRED" ? "size" : "màu"} ${values.join("/")} giúp em nha.` }],
          plan: plan(),
          transferToHuman: false,
          desiredTag: null,
          reasonCode: null,
        };
      }
      return failedOutput(selected.reasonCode, plan());
    }
    if (state.stage === "DISCOVERY") {
      apply({ kind: "FACTS_PRESENTED", commandId: commandId("facts") });
    }
    if (state.stage === "FACTS_PRESENTED") {
      apply({ kind: "MEASUREMENTS_REQUIRED", commandId: commandId("measurements") });
    }
    if (state.stage === "MEASUREMENTS_REQUIRED") {
      apply({ kind: "SIZE_RECOMMENDED", commandId: commandId("size") });
    }
    if (state.stage !== "SIZE_RECOMMENDED") {
      return failedOutput("SALES_STAGE_NOT_READY_FOR_CART", plan());
    }
    const draft = {
      identity: {
        cartId: deterministicUuid(`${input.conversationId}:${input.eventKey}:cart`),
        salesEpisodeId: deterministicUuid(`${input.conversationId}:sales-episode`),
        customerProfileId: deterministicUuid(`${input.customerHash}:customer-profile`),
      },
      lines: [selected.line],
      shopId: selected.shopId,
      policyRef: policyReference,
    };
    const draftReference = {
      id: `cart-draft:${input.conversationId}`,
      version: input.eventKey.slice(-128),
      contentHash: computeBusinessContentHash(draft),
    };
    references.set(canonicalJson(draftReference), draft);
    const opened = apply({
      kind: "CART_OPENED",
      commandId: commandId("cart-open"),
      cartDraftRef: draftReference,
      expiresAt: new Date(input.now.getTime() + CART_TTL_MS).toISOString(),
    });
    if (opened.status !== "APPLIED" || !state.cart) return failedOutput("CART_OPEN_FAILED", plan());
    return {
      handled: true,
      messages: [{ kind: "TEXT", text: checkoutTemplate(state.cart.value) }],
      plan: plan(),
      transferToHuman: false,
      desiredTag: null,
      reasonCode: null,
    };
  }

  if (
    state.stage === "DISCOVERY" &&
    input.productId &&
    input.offerType
  ) {
    apply({ kind: "FACTS_PRESENTED", commandId: commandId("facts") });
  }
  return {
    handled: false,
    messages: [],
    plan: plan(),
    transferToHuman: false,
    desiredTag: null,
    reasonCode: null,
  };
}
