# World Cup Predictor

A private prediction game for the FIFA World Cup 2026, built for a group of friends
and used for the whole tournament. Everyone tips every match, answers a few bonus
questions before kick-off, and follows a live leaderboard, chat and match feed on
their phone. The UI is in Swedish.

## In use

- **18 players** in a closed group, with an entry fee paid outside the app.
- Ran from the opening match to the final on **19 July 2026**: all 104 matches
  were tipped and scored in the app (the last two results were entered manually
  after the match-data subscription ended).
- Built and iterated **during** the tournament (~140 commits), driven by what
  the players asked for: knockout scoring that rewards going against the crowd,
  live scores, "everyone's tips" once a match locks, push reminders before
  deadlines.
- Current status: the tournament is over. The Supabase project is paused (data
  kept) and the match-data API subscription has ended, so there is no public demo.

## Features

- **Group stage**: pick 1 / X / 2 for each match.
- **Knockouts**: pick who advances plus the score after extra time. Points depend
  on how many others picked the same team (details below).
- **Bonus questions** answered once before the tournament: World Cup winner
  (points based on pre-tournament odds), top scorer, Golden Ball, total goals.
- **Deadlines**: each tip locks 1 minute before kick-off. The API routes check
  this, and so does the database.
- **Live**: scores, minute and match events (goals, cards) synced from
  api-football; the leaderboard and bracket update in realtime.
- **Social**: group chat, player profiles showing everyone's tips after the lock,
  stats page with the tournament's top scorers.
- **Push notifications** (PWA): a reminder for untipped matches 30 minutes before
  kick-off, a daily "matches today" reminder, and chat messages.
- **Admin panel**: enter or correct results, set bonus answers, mark payments.
  Correcting a result or answer re-scores everyone.

## Scoring

| Situation | Points |
|---|---|
| Group stage, correct 1X2 | 3 |
| Knockout, correct team advances | `round(2 + 8 × share who picked the other team)`, so 2–10 |
| … and exact score after extra time (penalties excluded) | +5 |
| Knockout, wrong team but exact score (e.g. 1–1, lost on penalties) | 5 |
| Bonus: World Cup winner | 20–102, from pre-tournament odds |
| Bonus: total goals / top scorer / Golden Ball | 25 / 10 / 10 |

All scoring happens in Postgres (`calculate_match_points`, `award_bonus_points`),
never in the client.

## Tech stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, mobile-first |
| Database, auth, realtime | Supabase (Postgres, RLS, Realtime) |
| Match data | api-football.com (API-Sports) |
| Push | Web Push (VAPID) via `web-push` + a service worker |
| Hosting | Vercel |
| Tests | Vitest, Testing Library, PGlite (Postgres in WASM) for database tests |

## How it fits together

```
Browser ──► Next.js API routes ──► Supabase (as the signed-in user, RLS applies)
                 │
                 └─ admin routes ──► Supabase (service role, after an is_admin check)

Scheduler ──► /api/cron/sync-matches ──► api-football ──► matches, match_events
          │                          └─► calculate_match_points() for finished matches
          └─► /api/cron/daily-reminder ──► web push
```

**Security model.** The Supabase anon key is public by design, so a user can
always call the database directly with their own login. The rules therefore live
in the database, not only in the API routes:

- Users may only write their own tips and bonus answers, and only the columns
  they own. `points_awarded`, `locked_points`, `is_admin` and `paid` can only be
  written by the server.
- A trigger rejects creating, changing or deleting a tip after the match locks.
- A trigger computes `locked_points` for bonus answers from the chosen option.
- The scoring functions can only be executed by the service role.
- Match data and events are read-only for users.

See `supabase/migrations/025_lock_down_writes.sql`, and `supabase/tests/` for the
tests that try to break these rules.

## Getting started

Requirements: Node 20+, a Supabase project, and optionally an api-football key.

```bash
git clone https://github.com/Basse01/world-cup-predictor.git
cd world-cup-predictor
npm ci
cp .env.example .env.local   # fill in the values, see comments in the file
```

**Database.** Apply every migration in `supabase/migrations/` in filename order,
either by pasting them into the Supabase SQL editor or with `psql`:

```bash
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f" || break
done
```

(`DATABASE_URL` is the connection string from Project Settings → Database.)
Then run `supabase/checks/verify_security.sql` in the SQL editor: every row
should say `ok = true`.

**Make yourself admin** after registering in the app:

```sql
update public.profiles set is_admin = true where id = '<your auth user id>';
```

**Run it:**

```bash
npm run dev     # http://localhost:3000
npm test        # unit, component and database tests (no Docker needed)
npm run build   # production build; works without push keys configured
```

To load fixtures, call the sync once:
`curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-matches`.

## Scheduled jobs

`vercel.json` has no crons on purpose. The Vercel Hobby plan only allows daily
crons, and having both Vercel and an external scheduler call the endpoints caused
duplicate runs and duplicate push notifications. Both endpoints are called by an
external scheduler (cron-job.org during the tournament):

| Endpoint | Schedule | What it does |
|---|---|---|
| `GET /api/cron/sync-matches` | every 5 minutes | Syncs fixtures, scores, status and events; sends reminders 30–35 min before kick-off; scores finished matches. Outside a match window it only does work in minutes 0–4 of each hour, so polling every 5 minutes is cheap. |
| `GET /api/cron/daily-reminder` | daily at 11:00 UTC (13:00 CEST) | Push reminder if there are matches left today. |

Both require `Authorization: Bearer <CRON_SECRET>` and answer 401 without it. A
tied knockout match is only marked as scored once the shootout winner is known,
so the next run picks it up automatically.

On a paid Vercel plan the same schedule can live in `vercel.json` instead; just
make sure only one scheduler calls each endpoint.

## Project structure

```
app/                 pages (App Router) and API routes (app/api/**/route.ts)
components/          React components
hooks/               client hooks (push subscription)
lib/                 Supabase clients, API helpers, validation, scoring helpers, api-football
public/sw.js         service worker for push
supabase/migrations/ schema, RLS, scoring functions (apply in order)
supabase/checks/     read-only SQL to verify a live database
supabase/tests/      database tests: fresh install + permissions + scoring on PGlite
```
