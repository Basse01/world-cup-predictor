-- Schema that was originally created via the Supabase dashboard and never
-- captured in a migration. Everything here is idempotent: a no-op on the live
-- database, required for a fresh install to match what the app queries.

-- Live-match metadata written by /api/cron/sync-matches.
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS api_status text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS elapsed_minutes integer;
-- Set once a finished match's events have been stored, so they aren't re-fetched.
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS events_synced_at timestamptz;

-- Realtime: the chat, leaderboard and bracket subscribe to these tables.
DO $$
DECLARE
  t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'publication supabase_realtime not found, skipping realtime setup';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['messages', 'predictions', 'matches'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
