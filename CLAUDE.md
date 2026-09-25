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
| Cron | External scheduler (cron-job.org) — see README "Scheduled jobs"; `vercel.json` intentionally has none |
| Testing | Vitest + Testing Library; DB tests on PGlite (`supabase/tests/`) |

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
supabase/     # migrations/ (apply in order), checks/ (live-DB verification SQL), tests/ (PGlite)
```

**Supabase clients — use the right one:**
- `lib/supabase/server.ts` — SSR client (server components, API routes)
- `lib/supabase/client.ts` — browser client (client components only)
- `lib/supabase/admin.ts` — service role (cron + admin API routes only, bypasses RLS)

---

## Database Schema (key tables)

| Table | Purpose |
|---|---|
| `profiles` | Extends auth.users — display_name, paid, is_admin (paid/is_admin: service role only) |
| `matches` | Fixtures from api-football.com — status, stage, scores, lock_at |
| `predictions` | User picks — 1X2 for group, score+winner for knockout |
| `bonus_predictions` | Bonus answers; `locked_points` computed by a DB trigger from the chosen option |
| `bonus_options` | Dropdown options per bonus type, each with its own points (odds-based for world_cup_winner) |
| `match_events` | Goals/cards per match from api-football — written by the cron only |
| `bonus_types` | Admin-configured bonus questions with points + answer |
| `messages` | Group chat (1–500 chars) |

**Views:** `standings` — aggregates total_points + rank per user.

**RPC functions** (service role only — EXECUTE is revoked from anon/authenticated):
- `calculate_match_points(match_id) → boolean` — scores a finished match. Returns false when there is nothing to score yet (not finished, or a tied knockout without `penalty_winner`); callers must then leave `points_calculated_at` null so the cron retries. Idempotent: re-running after a corrected result re-scores everyone.
- `award_bonus_points(type, answer) → integer` — resets the bonus to 0 for everyone, then awards matching answers (case-insensitive). Returns the number of winners. Safe to re-run with a corrected answer — but it overwrites any manual points adjustments on that bonus.
- `handle_new_user()` — trigger on auth signup → creates profile row

---

## Scoring Rules

Source of truth: `supabase/migrations/024_scoring_functions.sql` (mirrored in `lib/points.ts` for display only).

- **Group stage:** 3 points for correct 1X2 pick
- **Knockout, correct team advances:** contrarian pot `round(2 + 8 × share who picked the other team)` → 2–10
- **Knockout, correct team + exact score after ET (excl. penalties):** pot + 5
- **Knockout, wrong team but exact score:** 5
- **Bonus:** option points for dropdown bonuses (world_cup_winner 20–102 from odds), otherwise `bonus_types.points` (total_goals 25, top_scorer 10, golden_ball 10)

Scoring is calculated server-side via Supabase RPC — do not reimplement in client code.

---

## Key Files

| File | Role |
|---|---|
| `lib/types.ts` | All TypeScript interfaces (Match, Prediction, Standing, etc.) |
| `lib/points.ts` | Lock-time check, client-side mirror of the scoring rules |
| `lib/validate.ts` | Runtime validation of API request bodies (UUIDs, scores 0–20, picks, strings) |
| `lib/api.ts` | Route helpers: `requireUser`, `requireAdmin`, `readJsonObject`, `dbError` |
| `lib/api-football.ts` | External API integration — fixture fetching + status mapping |
| `app/api/cron/sync-matches/route.ts` | Cron endpoint — sync fixtures + trigger point calculation |
| `app/api/predictions/route.ts` | POST — upsert group or knockout prediction |
| `app/api/bonus/route.ts` | POST — upsert bonus answer |
| `app/api/admin/` | Admin-only routes: paid, bonus-award, override, backfill-player-ids |
| `supabase/migrations/025_lock_down_writes.sql` | Column privileges + triggers: deadlines, protected fields |

---

## Environment Variables

All documented with placeholders in `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL        # Supabase API URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY       # Service role (server only, never expose)
API_FOOTBALL_KEY                # API Sports key
CRON_SECRET                     # Bearer token for cron endpoints
NEXT_PUBLIC_VAPID_PUBLIC_KEY    # Web push (optional — push is disabled when unset)
VAPID_PRIVATE_KEY               # Web push (optional)
VAPID_SUBJECT                   # Web push contact, email or https URL (optional)
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

**Betalning sker utanför appen** — `paid` är bara informativt; alla användare får full access direkt vid registrering. Admin-panelen har en paid-toggle (skrivs med service role) men den påverkar inget funktionellt.

**Predictions lock 1 minute before kickoff** — `matches.lock_at` is set by the `set_lock_at` trigger (`kickoff_at - interval '1 minute'`, migration 020). The API routes check it for a clean 403, and the `enforce_prediction_rules` trigger enforces it in the database for insert, update and delete.

**Security — the database is the boundary.** The anon key is public, so users can call PostgREST directly. Never rely on an API route alone for a rule:
- New user-writable columns need an explicit column GRANT in a migration (025 revokes table-wide INSERT/UPDATE).
- Server-owned values (points, locked_points, is_admin, paid, match data) are written only with the service role.
- New SECURITY DEFINER functions need `SET search_path = ''` and EXECUTE revoked from anon/authenticated.
- Add a test in `supabase/tests/` for every new rule, and a row in `supabase/checks/verify_security.sql` if it should be verified on the live DB.

**API input:** Validate with `lib/validate.ts` — never trust `body.x as string`. Bad input → 400, DB rule violations map to 403/400 via `dbError`, and failures are never reported as `{ ok: true }`.

**Admin check:** Use `requireAdmin()` in API routes; pages read `is_admin` from profiles and redirect non-admins before rendering.

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
| `/tips/idag` | Today's matches |
| `/match/[id]` | Match page — live events, everyone's tips after the lock |
| `/profile/[userId]` | Player profile, tips and bonus outcomes |
| `/stats` | Tournament stats, top scorers |
| `/onboarding` | One-time bonus picks after signup |
| `/admin` | Admin panel — paid users, bonus awards, score overrides |

Chat is an overlay (`components/chat-overlay.tsx`), not a page.

---

## Development

```bash
npm run dev    # Dev server
npm run build  # Production build (works without VAPID keys)
npm test       # Vitest — unit, component and DB tests (PGlite, no Docker)
```

DB migrations are in `supabase/migrations/` — apply in filename order via the SQL editor or `psql` (see README). A fresh install is tested by `supabase/tests/`. After applying to the live DB, run `supabase/checks/verify_security.sql`.
