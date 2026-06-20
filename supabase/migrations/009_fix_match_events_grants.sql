-- Fix missing grants on match_events table.
-- Table was created via Supabase dashboard without proper role grants,
-- causing service_role (admin client) to get permission denied on INSERT.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE match_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE match_events TO authenticated;
GRANT SELECT ON TABLE match_events TO anon;
GRANT USAGE, SELECT ON SEQUENCE match_events_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE match_events_id_seq TO authenticated;
