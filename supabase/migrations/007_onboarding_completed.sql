-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- All existing users have already been using the app — mark as done
UPDATE public.profiles SET onboarding_completed = true;

-- Allow users to update their own profile (needed for complete-onboarding API)
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
