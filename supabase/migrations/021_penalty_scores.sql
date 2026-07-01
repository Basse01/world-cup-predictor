-- Store the penalty shootout scoreline for knockout matches decided on penalties.
-- We already track penalty_winner (who advanced); these two columns keep the
-- actual shootout result (e.g. 4–3) so the match summary can show it.
-- Both are null for group games and any match not decided on penalties.
-- Populated from score.penalty.{home,away} in the sync cron.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_home smallint;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_away smallint;
