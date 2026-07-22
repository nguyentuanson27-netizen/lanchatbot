DROP VIEW IF EXISTS admin_handoff_history_v;
DROP VIEW IF EXISTS admin_handoff_queue_v;
DROP TRIGGER IF EXISTS handoff_events_no_mutation ON handoff_events;
DROP FUNCTION IF EXISTS prevent_handoff_event_mutation();
DROP TABLE IF EXISTS handoff_cases;
DROP TABLE IF EXISTS handoff_events;
