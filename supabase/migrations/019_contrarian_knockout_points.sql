-- Contrarian ("mot strömmen") scoring for knockout matches.
--
-- Winner pot = round( 2 + 8 * (share who picked the OTHER team) )  → 2..~10p
--   share is measured among everyone who tipped THIS match. Picks lock 30 min
--   before kickoff, so the distribution is final by the time points are run.
-- Exact full-time result (incl. extra time, excl. penalties): +5p on top.
--   → favourite + exact = 2 + 5 = 7p ; lone-correct + exact ≈ 10 + 5 = 15p.
-- Who advanced: penalty_winner when the match went to a shootout (tied score),
--   otherwise derived from the after-extra-time scoreline.
--
-- Group-stage scoring is unchanged (3p for a correct 1X2 pick).

CREATE OR REPLACE FUNCTION public.calculate_match_points(p_match_id uuid)
RETURNS void AS $$
DECLARE
  v_match public.matches;
  v_actual_result text;
  v_actual_winner text;
  v_total integer;
  v_correct integer;
  v_pot integer;
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
    SET points_awarded = CASE WHEN pick = v_actual_result THEN 3 ELSE 0 END,
        updated_at = now()
    WHERE match_id = p_match_id;

  ELSE
    -- Who advanced (shootout winner if tied, else the after-ET scoreline).
    v_actual_winner := COALESCE(
      v_match.penalty_winner,
      CASE
        WHEN v_match.home_score > v_match.away_score THEN 'home'
        WHEN v_match.home_score < v_match.away_score THEN 'away'
        ELSE NULL
      END
    );

    -- Tied with no shootout result yet → wait for the next sync.
    IF v_actual_winner IS NULL THEN
      RETURN;
    END IF;

    -- Crowd distribution among everyone who tipped this match.
    SELECT
      count(*) FILTER (WHERE winner_pick IS NOT NULL),
      count(*) FILTER (WHERE winner_pick = v_actual_winner)
    INTO v_total, v_correct
    FROM public.predictions
    WHERE match_id = p_match_id;

    -- Contrarian pot: 2 base + up to 8 for how many went the other way.
    IF v_total > 0 THEN
      v_pot := round(2 + 8 * ((v_total - v_correct)::numeric / v_total))::int;
    ELSE
      v_pot := 2;
    END IF;

    UPDATE public.predictions
    SET points_awarded = CASE
        WHEN winner_pick = v_actual_winner
          AND home_score = v_match.home_score
          AND away_score = v_match.away_score
        THEN v_pot + 5
        WHEN winner_pick = v_actual_winner
        THEN v_pot
        ELSE 0
      END,
      updated_at = now()
    WHERE match_id = p_match_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
