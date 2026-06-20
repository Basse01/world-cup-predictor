-- Change lock window from 30 minutes to 5 minutes before kickoff
create or replace function public.set_lock_at()
returns trigger language plpgsql as $$
begin
  new.lock_at := new.kickoff_at - interval '5 minutes';
  return new;
end;
$$;

-- Backfill existing matches
update public.matches
set lock_at = kickoff_at - interval '5 minutes';
