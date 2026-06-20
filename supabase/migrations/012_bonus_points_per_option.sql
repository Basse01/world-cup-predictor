-- Award per-option points for dropdown bonuses (e.g. world_cup_winner),
-- fall back to bonus_types.points for free-text bonuses (e.g. total_goals).
create or replace function public.award_bonus_points(p_type text, p_answer text)
returns void as $$
begin
  update public.bonus_predictions bp
  set points_awarded = coalesce(
    (
      select bo.points
      from public.bonus_options bo
      where bo.type = p_type
        and lower(trim(bo.value)) = lower(trim(bp.value))
    ),
    (select bt.points from public.bonus_types bt where bt.type = p_type)
  )
  where bp.type = p_type
    and lower(trim(bp.value)) = lower(trim(p_answer));

  update public.bonus_types
  set answer = p_answer
  where type = p_type;
end;
$$ language plpgsql security definer;

-- Antal mål i VM: exact guess = 25 points
update public.bonus_types
set points = 25
where type = 'total_goals';
