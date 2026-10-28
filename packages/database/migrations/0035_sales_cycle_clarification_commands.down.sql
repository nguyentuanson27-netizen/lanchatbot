-- Preserve append-only history. Rollback may restore the old schema only before
-- a clarification event has been persisted; never delete or relabel events.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM sales_cycle_events
    WHERE command_kind IN ('CLARIFICATION_REQUESTED', 'CLARIFICATION_RESOLVED')
  ) THEN
    RAISE EXCEPTION 'SALES_CLARIFICATION_EVENTS_REQUIRE_COMPATIBLE_SCHEMA';
  END IF;
END $$;

ALTER TABLE sales_cycle_events
  DROP CONSTRAINT sales_cycle_events_command_kind_check,
  ADD CONSTRAINT sales_cycle_events_command_kind_check CHECK (
    command_kind IN (
      'FACTS_PRESENTED', 'MEASUREMENTS_REQUIRED', 'SIZE_RECOMMENDED',
      'CART_OPENED', 'CART_MUTATED', 'NEGOTIATION_EVENT', 'CART_READY',
      'CHECKOUT_DETAILS_CAPTURED', 'PREVIEW_CREATED', 'CONFIRM_PURCHASE',
      'PAYMENT_RECEIPT_RECEIVED'
    )
  );
