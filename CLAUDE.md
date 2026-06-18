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
| `profiles` | Extends auth.users — display_name, paid (always true), is_admin |
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

## Mobile-First — Core Design Constraint

**This app is primarily used on mobile phones.** Every component, layout, and interaction must work perfectly on a 390px screen before considering larger viewports. This is not optional.

### Tailwind breakpoints
- Write base styles for mobile (no prefix). Add `sm:`, `md:`, `lg:` only to _enhance_ larger screens.
- Wrong: `hidden sm:block` as the primary layout — hide things from mobile only if they truly don't belong there.
- Right: stack vertically on mobile, go side-by-side on `sm:`.

### Navigation
- **Bottom tab bar on mobile** — the top horizontal scroll nav is not acceptable on phones. On `sm:` and up, a top nav is fine.
- The bottom bar must use `pb-safe` / `env(safe-area-inset-bottom)` to clear the iPhone home indicator.
- Sticky bottom: `fixed bottom-0 left-0 right-0 z-50`.
- Main content must add `pb-20` (or similar) so content is not hidden behind the bottom bar.

### Touch targets
- Every tappable element: minimum **44×44px** effective touch area (use `min-h-[44px] min-w-[44px]`).
- Buttons in forms: `w-full` by default on mobile, constrained width on `sm:`.
- Avoid tiny icon-only buttons without labels on mobile.

### Typography & inputs
- Body text: minimum `text-sm` (14px). Never smaller.
- Form `<input>` and `<select>`: use `text-base` (16px) to prevent iOS auto-zoom on focus.
- Headings can be large but use `clamp` or responsive sizes (`text-3xl sm:text-4xl`) to avoid overflow.

### Spacing & layout
- Horizontal padding: `px-4` as default (16px). Never less than `px-3`.
- Cards and list items: `py-4` minimum so rows feel tappable.
- Avoid multi-column grids on mobile — single column first, `grid-cols-2` at `sm:`.
- Max width for content: `max-w-lg mx-auto` on pages with forms; `max-w-5xl` only for data-heavy views.

### Scrolling & overflow
- No horizontal overflow except intentional carousels (which must have `-webkit-overflow-scrolling: touch`).
- Long lists: consider `max-h-[60vh] overflow-y-auto` instead of infinite page scroll.

### Interactions
- Never rely on hover states for functionality — always pair with `active:` or `focus:` equivalents.
- Use `active:scale-95` or `active:opacity-80` for press feedback on buttons.

### Safe area (notched phones)
- Layouts that go edge-to-edge: add `pt-safe` / `pb-safe` using Tailwind's `env(safe-area-inset-*)`.
- The bottom nav bar **must** account for home indicator: `pb-[env(safe-area-inset-bottom)]`.

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

**Betalning sker utanför appen** — `paid` defaultar till `true`, alla användare får full access direkt vid registrering. Admin-panelen har fortfarande en paid-toggle men den påverkar inget funktionellt.

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
