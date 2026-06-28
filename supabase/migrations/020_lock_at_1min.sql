-- Change the prediction lock window to 1 minute before kickoff.
-- Users can submit and freely edit their pick until 1 min before the match
-- starts, then it locks. Enforced server-side via lock_at in /api/predictions.

CREATE OR REPLACE FUNCTION public.set_lock_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.lock_at := NEW.kickoff_at - interval '1 minute';
  RETURN NEW;
END;
$$;

-- Backfill existing matches.
UPDATE public.matches
SET lock_at = kickoff_at - interval '1 minute';
