-- Create bonus_options table for dropdown-style bonus questions
CREATE TABLE IF NOT EXISTS public.bonus_options (
  id          uuid primary key default gen_random_uuid(),
  type        text not null references public.bonus_types(type) on delete cascade,
  value       text not null,
  display_label text not null,
  points      integer not null default 10,
  sort_order  integer not null default 0,
  unique(type, value)
);

ALTER TABLE public.bonus_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bonus_options_select" ON public.bonus_options;
CREATE POLICY "bonus_options_select" ON public.bonus_options
  FOR SELECT USING (auth.role() = 'authenticated');

GRANT SELECT ON public.bonus_options TO authenticated;

-- Add onboarding bonus types
INSERT INTO public.bonus_types (type, label, points)
VALUES
  ('world_cup_winner', 'VM-vinnare', 15),
  ('golden_ball', 'Golden Ball', 10),
  ('total_goals', 'Antal mål i VM', 10)
ON CONFLICT (type) DO NOTHING;

-- Rename existing top_scorer to match Golden Boot branding
UPDATE public.bonus_types
SET label = 'Skyttekung (Golden Boot)'
WHERE type = 'top_scorer';
