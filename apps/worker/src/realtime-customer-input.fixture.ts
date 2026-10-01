export function noCustomerSelection() {
  const empty = { value: null, evidenceText: null, confidence: 0 };
  return {
    factQuery: { intent: "NONE", offerType: null, color: null, size: null, deliveryRegion: null },
    policyQuestion: null,
    route: "PRE_SALE", routeEvidence: null,
    product: { operation: "CURRENT", productId: null, evidenceText: null },
    variant: { operation: "NONE", productId: null, size: null, color: null, evidenceText: null },
    budget: { operation: "KEEP", value: null, evidenceText: null },
    occasion: { operation: "KEEP", value: null, evidenceText: null },
    obligations: [],
    salesSignals: {
      buyingIntent: { decision: "NONE", requestedAction: "NONE", quantity: null, evidenceText: null, confidence: 0 },
      checkoutExtraction: { fullName: empty, phone: empty, address: empty, paymentMethod: empty },
      purchaseConfirmation: { decision: "UNCLEAR", evidenceText: null, confidence: 0 },
    },
  };
}
