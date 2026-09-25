-- locked_points (the points a pick was worth when it was made) was originally
-- added via the dashboard. No-op on the live database; needed on a fresh install.
ALTER TABLE public.bonus_predictions ADD COLUMN IF NOT EXISTS locked_points integer;

-- Update world_cup_winner bonus_options with points derived from actual pre-tournament odds
-- Formula: round(log10(american_odds / 100) * 30)
-- Source: BetMGM opening odds via Yahoo Sports (pre-tournament, before 2026-06-11)
--
-- +450  → 20p   +700  → 25p   +900  → 29p   +1400 → 34p   +1800 → 38p
-- +3300 → 46p   +4000 → 48p   +5000 → 51p   +6600 → 55p   +8000 → 57p
-- +10k  → 60p   +12.5k→ 63p   +15k  → 65p   +20k  → 69p   +25k  → 72p
-- +30k  → 74p   +50k  → 81p   +75k  → 86p   +100k → 90p   +250k → 102p

UPDATE public.bonus_options SET points = 20  WHERE type = 'world_cup_winner' AND value IN ('Frankrike', 'Spanien');
UPDATE public.bonus_options SET points = 25  WHERE type = 'world_cup_winner' AND value IN ('England', 'Portugal');
UPDATE public.bonus_options SET points = 29  WHERE type = 'world_cup_winner' AND value IN ('Argentina', 'Brasilien');
UPDATE public.bonus_options SET points = 34  WHERE type = 'world_cup_winner' AND value = 'Tyskland';
UPDATE public.bonus_options SET points = 38  WHERE type = 'world_cup_winner' AND value = 'Nederländerna';
UPDATE public.bonus_options SET points = 46  WHERE type = 'world_cup_winner' AND value IN ('Belgien', 'Norge', 'USA');
UPDATE public.bonus_options SET points = 48  WHERE type = 'world_cup_winner' AND value IN ('Colombia', 'Marocko');
UPDATE public.bonus_options SET points = 51  WHERE type = 'world_cup_winner' AND value IN ('Mexiko', 'Mexico', 'Japan');
UPDATE public.bonus_options SET points = 55  WHERE type = 'world_cup_winner' AND value IN ('Schweiz', 'Uruguay');
UPDATE public.bonus_options SET points = 57  WHERE type = 'world_cup_winner' AND value IN ('Kroatien', 'Senegal', 'Sverige');
UPDATE public.bonus_options SET points = 60  WHERE type = 'world_cup_winner' AND value IN ('Australien', 'Ecuador', 'Elfenbenskusten');
UPDATE public.bonus_options SET points = 63  WHERE type = 'world_cup_winner' AND value = 'Turkiet';
UPDATE public.bonus_options SET points = 65  WHERE type = 'world_cup_winner' AND value IN ('Österrike', 'Kanada', 'Skottland');
UPDATE public.bonus_options SET points = 69  WHERE type = 'world_cup_winner' AND value = 'Sydkorea';
UPDATE public.bonus_options SET points = 72  WHERE type = 'world_cup_winner' AND value IN ('Algeriet', 'Bosnien & Hercegovina', 'Egypten');
UPDATE public.bonus_options SET points = 74  WHERE type = 'world_cup_winner' AND value IN ('Tjeckien', 'Paraguay');
UPDATE public.bonus_options SET points = 81  WHERE type = 'world_cup_winner' AND value IN ('Ghana', 'Iran');
UPDATE public.bonus_options SET points = 86  WHERE type = 'world_cup_winner' AND value IN ('Kongo DR', 'Tunisien');
UPDATE public.bonus_options SET points = 90  WHERE type = 'world_cup_winner' AND value IN ('Saudiarabien', 'Sydafrika', 'Panama', 'Nya Zeeland', 'Irak', 'Jordanien', 'Uzbekistan', 'Kap Verde', 'Katar');
UPDATE public.bonus_options SET points = 102 WHERE type = 'world_cup_winner' AND value IN ('Curaçao', 'Haiti');

-- Sync locked_points in existing bonus_predictions to new odds-based values
-- (so users who already submitted see updated expected points on their profile)
UPDATE public.bonus_predictions bp
SET locked_points = bo.points
FROM public.bonus_options bo
WHERE bp.type = 'world_cup_winner'
  AND bo.type = bp.type
  AND lower(trim(bo.value)) = lower(trim(bp.value));
