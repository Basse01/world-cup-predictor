-- match_events was originally created via the Supabase dashboard, so no
-- migration created it. The CREATE below is a no-op on the live database and
-- makes a fresh install work. player_id is added in 018; RLS and the final
-- grants are set in 025 (the grants below are superseded there).
CREATE TABLE IF NOT EXISTS public.match_events (
  id           bigserial primary key,
  match_id     uuid not null references public.matches(id) on delete cascade,
  elapsed      integer not null,
  extra_time   integer,
  team_name    text not null,
  team_logo    text,
  player_name  text,
  assist_name  text,
  type         text not null,
  detail       text,
  comments     text,
  created_at   timestamptz default now(),
  unique (match_id, elapsed, team_name, type, player_name)
);

CREATE INDEX IF NOT EXISTS match_events_match_id_idx ON public.match_events (match_id);

-- Fix missing grants on match_events table.
-- Table was created via Supabase dashboard without proper role grants,
-- causing service_role (admin client) to get permission denied on INSERT.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE match_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE match_events TO authenticated;
GRANT SELECT ON TABLE match_events TO anon;
GRANT USAGE, SELECT ON SEQUENCE match_events_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE match_events_id_seq TO authenticated;
