-- Migrate existing predictions from old type keys to new canonical keys
INSERT INTO public.bonus_predictions (id, user_id, type, value, points_awarded, locked_at, created_at)
SELECT gen_random_uuid(), user_id, 'world_cup_winner', value, points_awarded, locked_at, created_at
FROM public.bonus_predictions WHERE type = 'vm_vinnare'
ON CONFLICT (user_id, type) DO NOTHING;

INSERT INTO public.bonus_predictions (id, user_id, type, value, points_awarded, locked_at, created_at)
SELECT gen_random_uuid(), user_id, 'golden_ball', value, points_awarded, locked_at, created_at
FROM public.bonus_predictions WHERE type = 'gyllene_bollen'
ON CONFLICT (user_id, type) DO NOTHING;

INSERT INTO public.bonus_predictions (id, user_id, type, value, points_awarded, locked_at, created_at)
SELECT gen_random_uuid(), user_id, 'total_goals', value, points_awarded, locked_at, created_at
FROM public.bonus_predictions WHERE type = 'antal_mal'
ON CONFLICT (user_id, type) DO NOTHING;

INSERT INTO public.bonus_predictions (id, user_id, type, value, points_awarded, locked_at, created_at)
SELECT gen_random_uuid(), user_id, 'top_scorer', value, points_awarded, locked_at, created_at
FROM public.bonus_predictions WHERE type = 'skyttekung'
ON CONFLICT (user_id, type) DO NOTHING;

-- Remove old predictions and type definitions
DELETE FROM public.bonus_predictions WHERE type IN ('antal_mal', 'gyllene_bollen', 'skyttekung', 'vm_vinnare');
DELETE FROM public.bonus_types WHERE type IN ('antal_mal', 'gyllene_bollen', 'skyttekung', 'vm_vinnare');
