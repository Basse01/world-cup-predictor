-- Read-only check of the live database against the security model in
-- migrations 024–025. Paste into the Supabase SQL editor; every row should say
-- ok = true. The live schema was partly built in the dashboard, so it can
-- differ from the repo. Run this after applying the migrations.
-- (supabase/tests/verify-security.test.ts runs it against a fresh install.)

WITH checks(check_name, ok) AS (
  VALUES
  -- 1. Profile fields only the server may change
  ('authenticated cannot UPDATE profiles.is_admin',
    NOT has_column_privilege('authenticated', 'public.profiles', 'is_admin', 'UPDATE')),
  ('authenticated cannot UPDATE profiles.paid',
    NOT has_column_privilege('authenticated', 'public.profiles', 'paid', 'UPDATE')),
  ('authenticated can UPDATE profiles.display_name',
    has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE')),

  -- 2. Points are never client-writable
  ('authenticated cannot INSERT predictions.points_awarded',
    NOT has_column_privilege('authenticated', 'public.predictions', 'points_awarded', 'INSERT')),
  ('authenticated cannot UPDATE predictions.points_awarded',
    NOT has_column_privilege('authenticated', 'public.predictions', 'points_awarded', 'UPDATE')),
  ('authenticated cannot INSERT bonus_predictions.points_awarded',
    NOT has_column_privilege('authenticated', 'public.bonus_predictions', 'points_awarded', 'INSERT')),
  ('authenticated cannot UPDATE bonus_predictions.points_awarded',
    NOT has_column_privilege('authenticated', 'public.bonus_predictions', 'points_awarded', 'UPDATE')),
  ('authenticated cannot INSERT bonus_predictions.locked_points',
    NOT has_column_privilege('authenticated', 'public.bonus_predictions', 'locked_points', 'INSERT')),
  ('authenticated cannot UPDATE bonus_predictions.locked_points',
    NOT has_column_privilege('authenticated', 'public.bonus_predictions', 'locked_points', 'UPDATE')),

  -- 3. Deadline and field rules enforced in the database
  ('deadline trigger on predictions',
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_prediction_rules'
            AND tgrelid = 'public.predictions'::regclass AND tgenabled <> 'D')),
  ('rules trigger on bonus_predictions',
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_bonus_prediction_rules'
            AND tgrelid = 'public.bonus_predictions'::regclass AND tgenabled <> 'D')),
  ('guard trigger on profiles',
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_guard_profile_update'
            AND tgrelid = 'public.profiles'::regclass AND tgenabled <> 'D')),

  -- 4. Scoring functions: server only, pinned search_path
  ('anon cannot EXECUTE calculate_match_points',
    NOT has_function_privilege('anon', 'public.calculate_match_points(uuid)', 'EXECUTE')),
  ('authenticated cannot EXECUTE calculate_match_points',
    NOT has_function_privilege('authenticated', 'public.calculate_match_points(uuid)', 'EXECUTE')),
  ('anon cannot EXECUTE award_bonus_points',
    NOT has_function_privilege('anon', 'public.award_bonus_points(text, text)', 'EXECUTE')),
  ('authenticated cannot EXECUTE award_bonus_points',
    NOT has_function_privilege('authenticated', 'public.award_bonus_points(text, text)', 'EXECUTE')),
  ('service_role can EXECUTE both scoring functions',
    has_function_privilege('service_role', 'public.calculate_match_points(uuid)', 'EXECUTE')
    AND has_function_privilege('service_role', 'public.award_bonus_points(text, text)', 'EXECUTE')),
  ('every SECURITY DEFINER function in public pins search_path',
    NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prosecdef
        AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%'))),

  -- 5. match_events: read for signed-in users, written by the server only
  ('RLS enabled on match_events',
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.match_events'::regclass)),
  ('authenticated cannot write match_events',
    NOT has_table_privilege('authenticated', 'public.match_events', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.match_events', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.match_events', 'DELETE')),
  ('anon cannot read match_events',
    NOT has_table_privilege('anon', 'public.match_events', 'SELECT')),

  -- 6. RLS on every app table
  ('RLS enabled on all app tables',
    NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
        AND c.relname IN ('profiles', 'matches', 'predictions', 'bonus_predictions', 'bonus_types',
                          'bonus_options', 'messages', 'match_events', 'push_subscriptions')))
)
SELECT check_name, coalesce(ok, false) AS ok FROM checks ORDER BY ok, check_name;
