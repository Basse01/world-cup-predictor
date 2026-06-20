-- Fix 1: Stage constraint was missing round_of_32 and third_place.
-- Without this, the cron upsert fails entirely once Round of 32 fixtures appear.
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_stage_check;
ALTER TABLE matches ADD CONSTRAINT matches_stage_check
  CHECK (stage IN ('group','round_of_32','round_of_16','quarter_final','semi_final','third_place','final'));

-- Fix 2: Track when points have been calculated to avoid re-running for all
-- finished matches on every cron execution.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS points_calculated_at timestamptz;

-- Fix 3: Store the actual winner for penalty-shootout knockout matches.
-- When the fulltime score is tied, the API doesn't tell us who won — this
-- column is populated from score.penalty in the sync cron.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_winner text
  CHECK (penalty_winner IN ('home', 'away'));

-- Fix 4: Update calculate_match_points to handle tied fulltime scores
-- (penalty shootouts) using penalty_winner. If tied and penalty_winner is
-- not yet set, the function returns early and waits for the next sync.
CREATE OR REPLACE FUNCTION public.calculate_match_points(p_match_id uuid)
RETURNS void AS $$
DECLARE
  v_match public.matches;
  v_actual_result text;
  v_actual_winner text;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;

  IF v_match.status != 'finished' OR v_match.home_score IS NULL THEN
    RETURN;
  END IF;

  IF v_match.stage = 'group' THEN
    v_actual_result := CASE
      WHEN v_match.home_score > v_match.away_score THEN '1'
      WHEN v_match.home_score = v_match.away_score THEN 'X'
      ELSE '2'
    END;

    UPDATE public.predictions
    SET
      points_awarded = CASE WHEN pick = v_actual_result THEN 3 ELSE 0 END,
      updated_at = now()
    WHERE match_id = p_match_id;

  ELSE
    -- For knockout: use penalty_winner when scores are tied (went to shootout),
    -- fall back to score-derived winner when one team scored more.
    v_actual_winner := COALESCE(
      v_match.penalty_winner,
      CASE
        WHEN v_match.home_score > v_match.away_score THEN 'home'
        WHEN v_match.home_score < v_match.away_score THEN 'away'
        ELSE NULL
      END
    );

    -- If still NULL (tied, no penalty_winner yet) wait for next cron sync.
    IF v_actual_winner IS NULL THEN
      RETURN;
    END IF;

    UPDATE public.predictions
    SET
      points_awarded = CASE
        WHEN winner_pick = v_actual_winner
          AND home_score = v_match.home_score
          AND away_score = v_match.away_score
        THEN 5
        WHEN winner_pick = v_actual_winner
        THEN 2
        ELSE 0
      END,
      updated_at = now()
    WHERE match_id = p_match_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
