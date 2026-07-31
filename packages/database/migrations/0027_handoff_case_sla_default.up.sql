-- The queue case is created atomically with a handoff event. Keep a database
-- default as a fail-safe for any writer that has not yet supplied an SLA.
ALTER TABLE handoff_cases
  ALTER COLUMN sla_due_at SET DEFAULT (now() + interval '30 minutes');
