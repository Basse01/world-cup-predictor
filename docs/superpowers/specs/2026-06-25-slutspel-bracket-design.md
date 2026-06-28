# Slutspel (Knockout) UX/UI — Design Spec

**Date:** 2026-06-25
**Status:** Implemented as dev preview, pending visual review
**Scope:** `/tips/slutspel` — the mobile-first knockout prediction interface

---

## Problem

The knockout stage of WC 2026 is large — it starts at the **Round of 32 (16 matches)** and
narrows through R16 → QF → SF → Final, plus a bronze match (32 matches total). A traditional
left-to-right bracket does not fit a 390px phone, and the existing `/tips/slutspel` page was a
"Kommer snart" placeholder. The scoring logic already exists and is **per-match**
(5p exact score / 2p correct winner), synced round-by-round from api-football.

## Decisions (validated via visual companion)

1. **Prediction model = per-match (reality).** Users predict each match once its two teams are
   known, exactly like the group stage. Reuses the existing `KnockoutCard` + `/api/predictions`.
   Not a fill-the-whole-bracket-upfront game.
2. **Two views behind a toggle**, same matches, same prediction sheet:
   - **Bracket** — the whole tree, fit to screen width, vertical scroll only. The overview
     ("who's still in / who's out").
   - **Omgångar** (pager) — one round at a time, large thumb-friendly rows. The "tip quickly" view.
3. **Tap a match in either view → a shared bottom sheet** slides up with `KnockoutCard`
   (winner + exact score). Scores never live inside the tiny bracket nodes.
4. **Future/unknown rounds = reality, not projection.** Nodes whose teams aren't decided yet show
   as TBD ("Väntar") until real results fill them. No cosmetic cascade of the user's picks.
5. **Toggle labels:** `Bracket` / `Omgångar`.

## Node states (shared visual language)

Derived from `match.status`, `lock_at` (`isMatchLocked`), team-known, and whether a prediction exists:

| State | Meaning | Treatment |
|---|---|---|
| `tbd` | Teams not yet known | Dashed, muted, "Väntar", not tappable |
| `open` | Teams known, not locked, no pick | Blue glow / "Tippa →" |
| `predicted` | Pick saved, not locked | Winner highlighted, "✓ tippad", editable until lock |
| `locked` | Within 30 min of kickoff / live | Pick shown, 🔒, not editable |
| `finished` | Result in | Real score, loser struck, points (+5/+2/0) |

## Architecture

- **`app/(app)/tips/slutspel/page.tsx`** (server) — fetches knockout matches + the user's
  predictions in parallel. If real matches exist → render them. Else, in **development only**,
  render `SAMPLE_KNOCKOUT` with a "Förhandsvisning" banner so the UI is reviewable before the
  group stage finishes; in production keeps the "Kommer snart" placeholder.
- **`components/slutspel-view.tsx`** (client shell) — toggle state, optimistic prediction map,
  selected-match state, renders the active view + sheet.
- **`components/bracket-view.tsx`** — fit-to-width tree. Columns stretch to equal height; inner
  rounds use `justify-around` so each round visually centers against the round feeding it.
  Bronze match rendered as a separate strip below the tree; trophy column at the end.
- **`components/rounds-view.tsx`** — pager: segmented progress + ‹ › round nav + large match rows.
- **`components/knockout-match-sheet.tsx`** — bottom sheet (safe-area aware, Escape/backdrop close)
  wrapping `KnockoutCard`.
- **`lib/knockout.ts`** — stage order/labels, `deriveMatchState`, team-known detection, grouping,
  `teamDisplay`.
- **`lib/countries.ts`** — name → `{ abbr, flag }` for compact flag-led chips (real + sample data).
- **`lib/knockout-sample.ts`** — dev-only preview bracket exercising every node state. Deletable
  once real fixtures sync.

### Changes to existing code

- `components/knockout-card.tsx` — added `round_of_32` + `third_place` labels; `onPickChange`
  now passes saved values back for optimistic node updates; added `preview` prop that confirms
  saves optimistically (no DB row exists for sample data).

## Data flow

`page.tsx` (Supabase) → `SlutspelView` → `groupByStage` / `presentStages` → `BracketView` /
`RoundsView`. Tapping a match opens `KnockoutMatchSheet` → `KnockoutCard` → `POST /api/predictions`
→ optimistic update of the local prediction map (node reflects "predicted" immediately).

## Known limitations / v1 tradeoffs

- **Bracket connector wiring is approximate.** api-football gives the round but not
  "winner of match X feeds node Y". Each round is ordered by kickoff and stacked; columns and
  eliminations are correct, exact connector lines are not drawn yet. The Omgångar view is exact.
- **Bracket nodes are dense** (small tap targets) — the Omgångar view is the primary tipping
  surface; the bracket is the overview.
- **Champion (🏆) fills only when the final is decided.** A separate "champion guess" could live in
  the bonus system later.
- `components/tournament-bracket.tsx` is pre-existing dead code (scale-to-fit-width approach) — not
  imported anywhere; candidate for deletion.

## Open questions for review

- Bigger bracket nodes / horizontal scroll vs. current dense fit-to-width?
- Add subtle connector lines to the bracket?
- Stage naming: Sextondelsfinal (16-del) / Åttondelsfinal (8-del) — confirmed?
