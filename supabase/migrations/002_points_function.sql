-- Points calculation: called by cron after match result is written
create or replace function public.calculate_match_points(p_match_id uuid)
returns void as $$
declare
  v_match public.matches;
  v_actual_result text;
  v_actual_winner text;
begin
  select * into v_match from public.matches where id = p_match_id;

  if v_match.status != 'finished' or v_match.home_score is null then
    return;
  end if;

  if v_match.stage = 'group' then
    -- Determine 1X2 result
    v_actual_result := case
      when v_match.home_score > v_match.away_score then '1'
      when v_match.home_score = v_match.away_score then 'X'
      else '2'
    end;

    update public.predictions
    set
      points_awarded = case when pick = v_actual_result then 3 else 0 end,
      updated_at = now()
    where match_id = p_match_id;

  else
    -- Knockout: winner based on 90 min result only
    v_actual_winner := case
      when v_match.home_score > v_match.away_score then 'home'
      else 'away'
    end;

    update public.predictions
    set
      points_awarded = case
        when winner_pick = v_actual_winner
          and home_score = v_match.home_score
          and away_score = v_match.away_score
        then 5
        when winner_pick = v_actual_winner
        then 2
        else 0
      end,
      updated_at = now()
    where match_id = p_match_id;
  end if;
end;
$$ language plpgsql security definer;

-- Bonus points: called by admin when they reveal the correct answer
create or replace function public.award_bonus_points(p_type text, p_answer text)
returns void as $$
begin
  update public.bonus_predictions bp
  set points_awarded = (select points from public.bonus_types where type = p_type)
  where bp.type = p_type
    and lower(trim(bp.value)) = lower(trim(p_answer));

  update public.bonus_types
  set answer = p_answer
  where type = p_type;
end;
$$ language plpgsql security definer;
