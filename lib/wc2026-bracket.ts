// Official FIFA World Cup 2026 knockout bracket structure (match numbers M73–M104).
//
// api-football gives us only the round + kickoff for each fixture — NOT which
// bracket slot it occupies. Neither kickoff order nor api_match_id order matches
// the official bracket, so the wiring is encoded here. The draw is fixed, so the
// 16 Round-of-32 fixtures are pinned to their slots by their stable api_match_id.
//
// Columns (mirrored, matching bracket-view geometry):
//   col0 R32-left · col1 R16-left · col2 QF-left · col3 SF-left ·
//   col4 FINAL · col5 SF-right · col6 QF-right · col7 R16-right · col8 R32-right

export interface KnockoutSlot {
  id: number // FIFA match number
  round: 'r32' | 'r16' | 'qf' | 'sf' | 'final' | 'bronze'
  col: number
  idx: number // vertical index within the column (for geometry)
  apiMatchId?: number // R32 only — pins a synced fixture to this slot
  feeds?: [number, number] // winners of these match numbers fill this slot
}

// R32 visual order: left column top→bottom, then right column top→bottom.
// Pairs that sit adjacent here feed the same R16 match (so the standard
// consecutive-pair connectors draw the correct official wiring).
export const KNOCKOUT_SLOTS: KnockoutSlot[] = [
  // ── R32 left (col0) ──
  { id: 74, round: 'r32', col: 0, idx: 0, apiMatchId: 1565176 }, // GER/PAR
  { id: 77, round: 'r32', col: 0, idx: 1, apiMatchId: 1565177 }, // FRA/SWE
  { id: 73, round: 'r32', col: 0, idx: 2, apiMatchId: 1561329 }, // RSA/CAN
  { id: 75, round: 'r32', col: 0, idx: 3, apiMatchId: 1562345 }, // NED/MAR
  { id: 83, round: 'r32', col: 0, idx: 4, apiMatchId: 1567309 }, // POR/CRO
  { id: 84, round: 'r32', col: 0, idx: 5, apiMatchId: 1567311 }, // ESP/AUT
  { id: 81, round: 'r32', col: 0, idx: 6, apiMatchId: 1562586 }, // USA/BIH
  { id: 82, round: 'r32', col: 0, idx: 7, apiMatchId: 1567308 }, // BEL/SEN
  // ── R32 right (col8) ──
  { id: 76, round: 'r32', col: 8, idx: 0, apiMatchId: 1562344 }, // BRA/JPN
  { id: 78, round: 'r32', col: 8, idx: 1, apiMatchId: 1564789 }, // CIV/NOR
  { id: 79, round: 'r32', col: 8, idx: 2, apiMatchId: 1567306 }, // MEX/ECU
  { id: 80, round: 'r32', col: 8, idx: 3, apiMatchId: 1567307 }, // ENG/COD
  { id: 86, round: 'r32', col: 8, idx: 4, apiMatchId: 1565179 }, // ARG/CPV
  { id: 88, round: 'r32', col: 8, idx: 5, apiMatchId: 1565178 }, // AUS/EGY
  { id: 85, round: 'r32', col: 8, idx: 6, apiMatchId: 1567312 }, // SUI/ALG
  { id: 87, round: 'r32', col: 8, idx: 7, apiMatchId: 1567310 }, // COL/GHA

  // ── R16 left (col1) / right (col7) ──
  { id: 89, round: 'r16', col: 1, idx: 0, feeds: [74, 77] },
  { id: 90, round: 'r16', col: 1, idx: 1, feeds: [73, 75] },
  { id: 93, round: 'r16', col: 1, idx: 2, feeds: [83, 84] },
  { id: 94, round: 'r16', col: 1, idx: 3, feeds: [81, 82] },
  { id: 91, round: 'r16', col: 7, idx: 0, feeds: [76, 78] },
  { id: 92, round: 'r16', col: 7, idx: 1, feeds: [79, 80] },
  { id: 95, round: 'r16', col: 7, idx: 2, feeds: [86, 88] },
  { id: 96, round: 'r16', col: 7, idx: 3, feeds: [85, 87] },

  // ── QF left (col2) / right (col6) ──
  { id: 97, round: 'qf', col: 2, idx: 0, feeds: [89, 90] },
  { id: 98, round: 'qf', col: 2, idx: 1, feeds: [93, 94] },
  { id: 99, round: 'qf', col: 6, idx: 0, feeds: [91, 92] },
  { id: 100, round: 'qf', col: 6, idx: 1, feeds: [95, 96] },

  // ── SF left (col3) / right (col5) ──
  { id: 101, round: 'sf', col: 3, idx: 0, feeds: [97, 98] },
  { id: 102, round: 'sf', col: 5, idx: 0, feeds: [99, 100] },

  // ── Final (col4) ──
  { id: 104, round: 'final', col: 4, idx: 0, feeds: [101, 102] },

  // ── Bronze (rendered separately; losers of the semis) ──
  { id: 103, round: 'bronze', col: 4, idx: 0, feeds: [101, 102] },
]

// Pin a synced Round-of-32 fixture (by api_match_id) to its slot's match number.
export const apiIdToMatchNo = new Map<number, number>(
  KNOCKOUT_SLOTS.filter(s => s.apiMatchId).map(s => [s.apiMatchId!, s.id]),
)
