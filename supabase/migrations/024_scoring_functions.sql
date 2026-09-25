-- Scoring functions: report whether scoring ran, reset stale points, and are
-- callable by the server (service_role) only.
--
-- calculate_match_points now returns boolean:
--   true  → points were written for every prediction on the match
--   false → nothing to score yet (not finished, no score, or a tied knockout
--           still waiting for the shootout winner). The caller must NOT mark
--           the match as processed, so the next cron run tries again.
-- In the waiting-for-shootout case the match's points are reset to 0, so a
-- corrected result never leaves points from an earlier calculation behind.
--
-- award_bonus_points now returns the number of winners and resets everyone
-- else on that bonus to 0, so changing the answer removes points that were
-- awarded for the previous answer. It raises on an unknown bonus type.
--
-- Both functions are SECURITY DEFINER with an empty search_path (all names are
-- schema-qualified) and EXECUTE is revoked from anon/authenticated.
-- Changing the return type requires dropping the old definitions.

DROP FUNCTION IF EXISTS public.calculate_match_points(uuid);
DROP FUNCTION IF EXISTS public.award_bonus_points(text, text);

CREATE FUNCTION public.calculate_match_points(p_match_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_match public.matches;
  v_actual_result text;
  v_actual_winner text;
  v_total integer;
  v_correct integer;
  v_pot integer;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;

  IF NOT FOUND OR v_match.status <> 'finished'
     OR v_match.home_score IS NULL OR v_match.away_score IS NULL THEN
    RETURN false;
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

    RETURN true;
  END IF;

  -- Knockout. Who advanced: shootout winner if tied, else the after-ET score.
  v_actual_winner := COALESCE(
    v_match.penalty_winner,
    CASE
      WHEN v_match.home_score > v_match.away_score THEN 'home'
      WHEN v_match.home_score < v_match.away_score THEN 'away'
      ELSE NULL
    END
  );

  -- Tied with no shootout result yet → clear any stale points and wait.
  IF v_actual_winner IS NULL THEN
    UPDATE public.predictions
    SET points_awarded = 0, updated_at = now()
    WHERE match_id = p_match_id AND points_awarded <> 0;
    RETURN false;
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
      WHEN home_score = v_match.home_score
        AND away_score = v_match.away_score
      THEN 5
      ELSE 0
    END,
    updated_at = now()
  WHERE match_id = p_match_id;

  RETURN true;
END;
$$;

CREATE FUNCTION public.award_bonus_points(p_type text, p_answer text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_type_points integer;
  v_winners integer;
BEGIN
  SELECT points INTO v_type_points FROM public.bonus_types WHERE type = p_type;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown bonus type: %', p_type USING ERRCODE = '22023';
  END IF;

  -- One statement: winners get the option's points (falling back to the
  -- type's points for free-text bonuses), everyone else is reset to 0.
  UPDATE public.bonus_predictions bp
  SET points_awarded = CASE
      WHEN lower(trim(bp.value)) = lower(trim(p_answer)) THEN coalesce(
        (
          SELECT bo.points
          FROM public.bonus_options bo
          WHERE bo.type = p_type
            AND lower(trim(bo.value)) = lower(trim(bp.value))
          LIMIT 1
        ),
        v_type_points
      )
      ELSE 0
    END
  WHERE bp.type = p_type;

  SELECT count(*) INTO v_winners
  FROM public.bonus_predictions
  WHERE type = p_type AND lower(trim(value)) = lower(trim(p_answer));

  UPDATE public.bonus_types SET answer = p_answer WHERE type = p_type;

  RETURN v_winners;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_match_points(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_bonus_points(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_match_points(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.award_bonus_points(text, text) TO service_role;

-- The signup trigger is SECURITY DEFINER too; pin its search_path.
ALTER FUNCTION public.handle_new_user() SET search_path = '';
