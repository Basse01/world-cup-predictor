-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  display_name text not null,
  paid        boolean default false,
  is_admin    boolean default false,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- Matches
create table public.matches (
  id              uuid primary key default gen_random_uuid(),
  api_match_id    integer unique not null,
  home_team       text not null,
  away_team       text not null,
  home_team_logo  text,
  away_team_logo  text,
  kickoff_at      timestamptz not null,
  status          text not null default 'scheduled'
                    check (status in ('scheduled', 'live', 'finished')),
  stage           text not null
                    check (stage in ('group', 'round_of_16', 'quarter_final', 'semi_final', 'final')),
  home_score      integer,
  away_score      integer,
  group_name      text,
  lock_at         timestamptz,
  updated_at      timestamptz default now()
);

create or replace function public.set_lock_at()
returns trigger as $$
begin
  new.lock_at := new.kickoff_at - interval '30 minutes';
  return new;
end;
$$ language plpgsql immutable;

create trigger trg_set_lock_at
  before insert or update of kickoff_at on public.matches
  for each row execute procedure public.set_lock_at();

-- Predictions
create table public.predictions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade not null,
  match_id      uuid references public.matches(id) on delete cascade not null,
  pick          text check (pick in ('1', 'X', '2')),
  home_score    integer,
  away_score    integer,
  winner_pick   text check (winner_pick in ('home', 'away')),
  points_awarded integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, match_id)
);

-- Bonus predictions
create table public.bonus_predictions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade not null,
  type          text not null,
  value         text not null,
  points_awarded integer default 0,
  locked_at     timestamptz,
  created_at    timestamptz default now(),
  unique(user_id, type)
);

-- Messages (group chat)
create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  content     text not null check (length(content) between 1 and 500),
  created_at  timestamptz default now()
);

-- Bonus types config (admin-managed)
create table public.bonus_types (
  type        text primary key,
  label       text not null,
  points      integer not null default 10,
  locked_at   timestamptz,
  answer      text
);

-- Seed default bonus type
insert into public.bonus_types (type, label, points) values ('top_scorer', 'Skyttekung', 10);

-- Standings view (live points from predictions + bonus)
create or replace view public.standings as
select
  p.id as user_id,
  p.display_name,
  p.paid,
  coalesce((select sum(pr.points_awarded) from public.predictions pr where pr.user_id = p.id), 0)
  + coalesce((select sum(bp.points_awarded) from public.bonus_predictions bp where bp.user_id = p.id), 0)
  as total_points,
  rank() over (
    order by
      coalesce((select sum(pr.points_awarded) from public.predictions pr where pr.user_id = p.id), 0)
      + coalesce((select sum(bp.points_awarded) from public.bonus_predictions bp where bp.user_id = p.id), 0)
    desc
  ) as rank
from public.profiles p;

-- RLS
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.bonus_predictions enable row level security;
alter table public.messages enable row level security;
alter table public.bonus_types enable row level security;

create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "matches_select" on public.matches for select using (auth.role() = 'authenticated');

create policy "predictions_select" on public.predictions for select using (auth.role() = 'authenticated');
create policy "predictions_insert_own" on public.predictions for insert with check (auth.uid() = user_id);
create policy "predictions_update_own" on public.predictions for update using (auth.uid() = user_id);

create policy "bonus_select" on public.bonus_predictions for select using (auth.role() = 'authenticated');
create policy "bonus_insert_own" on public.bonus_predictions for insert with check (auth.uid() = user_id);
create policy "bonus_update_own" on public.bonus_predictions for update using (auth.uid() = user_id);

create policy "messages_select" on public.messages for select using (auth.role() = 'authenticated');
create policy "messages_insert_own" on public.messages for insert with check (auth.uid() = user_id);

create policy "bonus_types_select" on public.bonus_types for select using (auth.role() = 'authenticated');

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
