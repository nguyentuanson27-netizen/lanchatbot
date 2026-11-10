-- The existing runtime already emits these two bounded checkout-clarification commands.
-- Keep the event allowlist aligned; no table, column, role or data rewrite.
ALTER TABLE sales_cycle_events
  DROP CONSTRAINT sales_cycle_events_command_kind_check,
  ADD CONSTRAINT sales_cycle_events_command_kind_check CHECK (
    command_kind IN (
      'FACTS_PRESENTED', 'MEASUREMENTS_REQUIRED', 'SIZE_RECOMMENDED',
      'CART_OPENED', 'CART_MUTATED', 'NEGOTIATION_EVENT', 'CART_READY',
      'CHECKOUT_DETAILS_CAPTURED', 'PREVIEW_CREATED', 'CONFIRM_PURCHASE',
      'PAYMENT_RECEIPT_RECEIVED', 'CLARIFICATION_REQUESTED', 'CLARIFICATION_RESOLVED'
    )
  );
