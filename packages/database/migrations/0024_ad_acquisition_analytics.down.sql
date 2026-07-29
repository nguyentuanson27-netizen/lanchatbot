DROP VIEW IF EXISTS admin_acquisition_sessions_v;
DROP TABLE IF EXISTS acquisition_sessions;
ALTER TABLE message_ad_contexts DROP COLUMN IF EXISTS referral_type;
