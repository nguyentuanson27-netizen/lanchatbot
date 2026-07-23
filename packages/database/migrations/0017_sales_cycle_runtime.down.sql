DROP TRIGGER IF EXISTS sales_cycle_events_no_mutation ON sales_cycle_events;
DROP FUNCTION IF EXISTS prevent_sales_cycle_event_mutation();
DROP TABLE IF EXISTS sales_cycle_events;
DROP TABLE IF EXISTS sales_cycle_states;
