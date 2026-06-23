-- Add stable api-football player id to match_events.
-- Player NAMES vary between fixtures ("Kylian Mbappé" vs "K. Mbappe"), which split
-- the same scorer across rows and broke the skytteliga aggregation on /stats.
-- player.id is stable across fixtures, so we store it and aggregate on it instead.
-- Nullable: legacy rows are backfilled separately; some events have no player.

alter table public.match_events
  add column if not exists player_id bigint;

create index if not exists match_events_player_id_idx
  on public.match_events (player_id);
