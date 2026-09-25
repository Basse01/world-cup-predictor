-- Lock down what signed-in users can write directly through the Supabase API.
--
-- The anon key is public, so every rule the API routes enforce must also hold
-- when a user calls PostgREST directly with their own JWT. Two layers:
--   1. Column privileges: anon/authenticated may only write the columns a user
--      legitimately owns (no is_admin, paid, points_awarded, locked_points).
--   2. BEFORE triggers: enforce deadlines and immutable fields. They only
--      restrict the anon/authenticated roles; service_role and the SECURITY
--      DEFINER scoring functions (which run as the table owner) pass through.
-- RLS policies stay as they are; privileges are checked before RLS, so any
-- extra permissive policy that exists on the live database can't bypass this.

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Users may change their display name, avatar and onboarding flag. is_admin and
-- paid are changed only by server code using the service role.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (display_name, avatar_url, onboarding_completed) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND (
       NEW.id IS DISTINCT FROM OLD.id
    OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
    OR NEW.paid IS DISTINCT FROM OLD.paid
    OR NEW.last_chat_push_at IS DISTINCT FROM OLD.last_chat_push_at
  ) THEN
    RAISE EXCEPTION 'Not allowed to change this profile field' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_update ON public.profiles;
CREATE TRIGGER trg_guard_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

-- ── predictions ──────────────────────────────────────────────────────────────
-- user_id/match_id need UPDATE privilege because a PostgREST upsert writes
-- every payload column in ON CONFLICT DO UPDATE; the trigger keeps them fixed.
REVOKE INSERT, UPDATE ON public.predictions FROM anon, authenticated;
GRANT INSERT (user_id, match_id, pick, home_score, away_score, winner_pick)
  ON public.predictions TO authenticated;
GRANT UPDATE (user_id, match_id, pick, home_score, away_score, winner_pick)
  ON public.predictions TO authenticated;

-- SECURITY INVOKER on purpose: current_user must be the caller's role.
-- matches is readable by authenticated, so the lock lookup works; a missing
-- match (or an anon caller who can't see it) is treated as locked.
CREATE OR REPLACE FUNCTION public.enforce_prediction_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_lock_at timestamptz;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT lock_at INTO v_lock_at FROM public.matches WHERE id = OLD.match_id;
    IF v_lock_at IS NULL OR v_lock_at <= now() THEN
      RAISE EXCEPTION 'Prediction locked' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND (
       NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.match_id IS DISTINCT FROM OLD.match_id
  ) THEN
    RAISE EXCEPTION 'user_id and match_id cannot be changed' USING ERRCODE = '42501';
  END IF;

  SELECT lock_at INTO v_lock_at FROM public.matches WHERE id = NEW.match_id;
  IF v_lock_at IS NULL OR v_lock_at <= now() THEN
    RAISE EXCEPTION 'Prediction locked' USING ERRCODE = '42501';
  END IF;

  -- Points are only ever written by calculate_match_points.
  NEW.points_awarded := CASE WHEN TG_OP = 'UPDATE' THEN OLD.points_awarded ELSE 0 END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_prediction_rules ON public.predictions;
CREATE TRIGGER trg_enforce_prediction_rules
  BEFORE INSERT OR UPDATE OR DELETE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_prediction_rules();

-- ── bonus_predictions ────────────────────────────────────────────────────────
-- locked_points is computed here from bonus_options/bonus_types, never taken
-- from the client. It is set on insert and whenever the value changes, for any
-- caller, so it always reflects the option that was actually picked.
REVOKE INSERT, UPDATE ON public.bonus_predictions FROM anon, authenticated;
GRANT INSERT (user_id, type, value) ON public.bonus_predictions TO authenticated;
GRANT UPDATE (user_id, type, value) ON public.bonus_predictions TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_bonus_prediction_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_type public.bonus_types;
  v_has_options boolean;
  v_option_points integer;
  v_restricted boolean := current_user IN ('anon', 'authenticated');
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.value IS NOT DISTINCT FROM OLD.value
     AND NEW.type IS NOT DISTINCT FROM OLD.type THEN
    -- Nothing the user owns changed (e.g. award_bonus_points setting points).
    IF v_restricted THEN
      NEW.points_awarded := OLD.points_awarded;
      NEW.locked_points := OLD.locked_points;
    END IF;
    RETURN NEW;
  END IF;

  SELECT * INTO v_type FROM public.bonus_types WHERE type = NEW.type;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown bonus type: %', NEW.type USING ERRCODE = '23503';
  END IF;

  IF v_restricted THEN
    IF TG_OP = 'UPDATE' AND (
         NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.type IS DISTINCT FROM OLD.type
    ) THEN
      RAISE EXCEPTION 'user_id and type cannot be changed' USING ERRCODE = '42501';
    END IF;
    IF v_type.locked_at IS NOT NULL AND v_type.locked_at <= now() THEN
      RAISE EXCEPTION 'Bonus locked' USING ERRCODE = '42501';
    END IF;
    NEW.points_awarded := CASE WHEN TG_OP = 'UPDATE' THEN OLD.points_awarded ELSE 0 END;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.bonus_options WHERE type = NEW.type)
  INTO v_has_options;

  IF v_has_options THEN
    SELECT points INTO v_option_points
    FROM public.bonus_options
    WHERE type = NEW.type AND lower(trim(value)) = lower(trim(NEW.value))
    ORDER BY sort_order
    LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid option for bonus %: %', NEW.type, NEW.value USING ERRCODE = '23514';
    END IF;
    NEW.locked_points := v_option_points;
  ELSE
    NEW.locked_points := v_type.points;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_bonus_prediction_rules ON public.bonus_predictions;
CREATE TRIGGER trg_enforce_bonus_prediction_rules
  BEFORE INSERT OR UPDATE ON public.bonus_predictions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bonus_prediction_rules();

-- ── match_events ─────────────────────────────────────────────────────────────
-- Written only by the sync cron / admin backfill (service_role). Signed-in
-- users can read; nobody else can write.
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_events_select" ON public.match_events;
CREATE POLICY "match_events_select" ON public.match_events
  FOR SELECT TO authenticated USING (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.match_events FROM anon, authenticated;
REVOKE SELECT ON public.match_events FROM anon;
REVOKE USAGE, SELECT ON SEQUENCE public.match_events_id_seq FROM anon, authenticated;
GRANT SELECT ON public.match_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.match_events_id_seq TO service_role;

-- ── server-only tables ───────────────────────────────────────────────────────
-- RLS already blocks writes here (no write policies); revoking the privileges
-- makes that explicit and independent of policy changes.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.matches FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.bonus_types FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.bonus_options FROM anon, authenticated;
