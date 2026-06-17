@AGENTS.md

# World Cup Predictor — Project Context

## What This Is

A Swedish-language FIFA World Cup 2026 prediction game. Users predict match outcomes and compete on a live leaderboard. Built for a closed group (paid users only).

**Live URL:** Deployed on Vercel.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Runtime | React 19, TypeScript 5 |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| Styling | Tailwind CSS 4, custom theme |
| External API | api-football.com (API Sports) — live fixture data |
| Deployment | Vercel (Node.js runtime) |
| Cron | Vercel cron — `/api/cron/sync-matches` every 5 minutes |
| Testing | Vitest + Testing Library |

---

## Architecture

**Routing:** App Router with two route groups:
- `(auth)/` — public: `/login`, `/register`
- `(app)/` — protected: all other routes, guarded in `app/(app)/layout.tsx`

**Key directories:**
```
app/          # Pages & API routes
components/   # React components (client + server)
lib/          # Supabase clients, types, scoring logic, API integration
supabase/     # DB migrations
```

**Supabase clients — use the right one:**
- `lib/supabase/server.ts` — SSR client (server components, API routes)
- `lib/supabase/client.ts` — browser client (client components only)
- `lib/supabase/admin.ts` — service role (admin API routes only, bypasses RLS)

---

## Database Schema (key tables)

| Table | Purpose |
|---|---|
| `profiles` | Extends auth.users — display_name, paid, is_admin |
| `matches` | Fixtures from api-football.com — status, stage, scores, lock_at |
| `predictions` | User picks — 1X2 for group, score+winner for knockout |
| `bonus_predictions` | Answers to admin-created bonus questions |
| `bonus_types` | Admin-configured bonus questions with points + answer |
| `messages` | Group chat (1–500 chars) |

**Views:** `standings` — aggregates total_points + rank per user.

**RPC functions:**
- `calculate_match_points(match_id)` — call after match finishes (3pts group, 5pts exact knockout, 2pts winner knockout)
- `award_bonus_points(type, answer)` — case-insensitive match against user answers
- `handle_new_user()` — trigger on auth signup → creates profile row

---

## Scoring Rules

- **Group stage:** 3 points for correct 1X2 pick
- **Knockout exact score:** 5 points
- **Knockout correct winner only:** 2 points
- **Bonus questions:** Admin-defined points (default 10)

Scoring is calculated server-side via Supabase RPC — do not reimplement in client code.

---

## Key Files

| File | Role |
|---|---|
| `lib/types.ts` | All TypeScript interfaces (Match, Prediction, Standing, etc.) |
| `lib/points.ts` | Lock-time checks, score validation |
| `lib/api-football.ts` | External API integration — fixture fetching + status mapping |
| `app/api/cron/sync-matches/route.ts` | Cron endpoint — sync fixtures + trigger point calculation |
| `app/api/predictions/route.ts` | POST — upsert group or knockout prediction |
| `app/api/bonus/route.ts` | POST — upsert bonus answer |
| `app/api/admin/` | Admin-only routes: paid, bonus-award, override |

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL        # Supabase API URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY       # Service role (server only, never expose)
API_FOOTBALL_KEY                # API Sports key
CRON_SECRET                     # Bearer token for cron endpoint
```

---

## Conventions

**Data fetching:**
- Server components query Supabase directly (no fetch)
- Client components call internal API routes
- Batch parallel queries with `Promise.all()`

**Styling:**
- Dark theme: `bg-[#1a1a1a]` cards, `border-[#2a2a2a]` borders
- Custom colors: `wc-blue`, `wc-red`, `wc-green`, `wc-black`, `wc-dark-gray`, `wc-light-gray`
- Fonts: Anton (headings), Noto Sans (body)

**Predictions lock 30 minutes before kickoff** — enforced by `matches.lock_at` (generated column: `kickoff_at - interval '30 minutes'`). Always check this server-side before accepting a prediction.

**Admin check:** Read `is_admin` from profiles; redirect non-admins before rendering the page.

**Knockout score range:** 0–20, non-negative integers.

**UI language:** Swedish throughout.

---

## Pages

| Route | Purpose |
|---|---|
| `/dashboard` | My rank, top 3 leaderboard, next upcoming matches |
| `/tips/gruppspel` | Group stage 1X2 predictions |
| `/tips/slutspel` | Knockout score predictions |
| `/bonus` | Bonus questions |
| `/leaderboard` | Full standings table |
| `/chat` | Group chat |
| `/admin` | Admin panel — paid users, bonus awards, score overrides |

---

## Development

```bash
npm run dev    # Dev server
npm run build  # Production build
npm test       # Vitest
```

DB migrations are in `supabase/migrations/` — apply via Supabase CLI or dashboard.
