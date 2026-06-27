#!/usr/bin/env node
/**
 * VM 2026 Knockout Prediction Engine
 *
 * Multi-pass Poisson-modell med Bayesiansk shrinkage mot turneringsgenomsnitt.
 * Hämtar live-data från api-football.com och genererar konkreta tippsrekommendationer.
 *
 * Usage:
 *   API_FOOTBALL_KEY=xxx npx tsx scripts/predict-knockout.ts
 *
 * Poäng i tipsspelet:
 *   5p = exakt slutresultat   (90 min)
 *   2p = rätt vinnare
 *
 * Modellsteg:
 *   1. Bygg attack/försvarsprofil per lag från gruppspelet
 *   2. Poisson-sannolikhetsmatris för alla scorelines 0-8 per lag
 *   3. Välj rekommenderat tips med hänsyn till EV (expected value i tipsspelet)
 */

import { fetchAllFixtures, mapStage, mapStatus } from '../lib/api-football'
import type { ApiFixture } from '../lib/api-football'

// ── Types ──────────────────────────────────────────────────────────────────────

interface TeamStats {
  name: string
  id: number
  played: number
  goalsScored: number
  goalsConceded: number
  wins: number
  draws: number
  losses: number
  attackRating: number
  defenseRating: number
}

interface ScoreLine {
  home: number
  away: number
  prob: number
}

interface MatchPrediction {
  homeTeam: string
  awayTeam: string
  date: string
  round: string
  lambdaHome: number
  lambdaAway: number
  homeWinProb: number
  drawProb: number
  awayWinProb: number
  topScores: ScoreLine[]
  tip: string
  tipEV: number
  confidence: 'HÖG' | 'MEDIUM' | 'LÅG'
  warning?: string
}

// ── Poisson Math ───────────────────────────────────────────────────────────────

function poissonPMF(lambda: number, k: number): number {
  if (k < 0 || lambda <= 0) return k === 0 ? 1 : 0
  // Use log-space to avoid underflow
  let logP = -lambda + k * Math.log(lambda)
  for (let i = 2; i <= k; i++) logP -= Math.log(i)
  return Math.exp(logP)
}

function buildScoreMatrix(lH: number, lA: number, maxGoals = 8): number[][] {
  const matrix: number[][] = []
  for (let h = 0; h <= maxGoals; h++) {
    matrix[h] = []
    for (let a = 0; a <= maxGoals; a++) {
      matrix[h][a] = poissonPMF(lH, h) * poissonPMF(lA, a)
    }
  }
  return matrix
}

function analyseMatrix(matrix: number[][], maxGoals = 8) {
  let homeWin = 0, draw = 0, awayWin = 0
  const scores: ScoreLine[] = []

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = matrix[h][a]
      scores.push({ home: h, away: a, prob: p })
      if (h > a) homeWin += p
      else if (h === a) draw += p
      else awayWin += p
    }
  }

  scores.sort((a, b) => b.prob - a.prob)
  return { homeWin, draw, awayWin, topScores: scores.slice(0, 8) }
}

// ── Expected Value Calc ────────────────────────────────────────────────────────

/**
 * Beräknar EV för ett givet tipp (5p exakt, 2p rätt vinnare).
 */
function calcTipEV(tip: ScoreLine, topScores: ScoreLine[], homeWinProb: number, awayWinProb: number): number {
  // Sannolikhet för exakt resultat
  const exactProb = topScores.find(s => s.home === tip.home && s.away === tip.away)?.prob ?? 0
  // Sannolikhet för rätt vinnare (men fel exakt)
  const correctWinner = tip.home > tip.away ? homeWinProb : tip.home < tip.away ? awayWinProb : 0
  const wrongExactRightWinner = correctWinner - exactProb
  return exactProb * 5 + wrongExactRightWinner * 2
}

/**
 * Väljer det tips som maximerar EV.
 * Söker bland top-30 scorelines.
 */
function pickBestTip(topScores: ScoreLine[], homeWinProb: number, awayWinProb: number): { tip: ScoreLine; ev: number } {
  let bestEV = -1
  let bestTip = topScores[0]

  for (const candidate of topScores.slice(0, 30)) {
    const ev = calcTipEV(candidate, topScores, homeWinProb, awayWinProb)
    if (ev > bestEV) {
      bestEV = ev
      bestTip = candidate
    }
  }

  return { tip: bestTip, ev: bestEV }
}

// ── Team Stats Builder ─────────────────────────────────────────────────────────

const PRIOR_WEIGHT = 2 // Bayesian prior: shrink mot turneringsgenomsnitt

function buildTeamStats(fixtures: ApiFixture[]): { stats: Map<number, TeamStats>; leagueAvg: number } {
  const raw = new Map<number, Omit<TeamStats, 'attackRating' | 'defenseRating'>>()

  const groupFinished = fixtures.filter(f =>
    mapStatus(f.fixture.status.short) === 'finished' &&
    mapStage(f.league.round) === 'group'
  )

  for (const f of groupFinished) {
    const hg = f.score.fulltime.home ?? 0
    const ag = f.score.fulltime.away ?? 0

    const upsert = (id: number, name: string, scored: number, conceded: number, win: boolean, draw: boolean) => {
      if (!raw.has(id)) raw.set(id, { name, id, played: 0, goalsScored: 0, goalsConceded: 0, wins: 0, draws: 0, losses: 0 })
      const t = raw.get(id)!
      t.played++
      t.goalsScored += scored
      t.goalsConceded += conceded
      if (win) t.wins++
      else if (draw) t.draws++
      else t.losses++
    }

    const homeWon = hg > ag
    const drew = hg === ag
    upsert(f.teams.home.id, f.teams.home.name, hg, ag, homeWon, drew)
    upsert(f.teams.away.id, f.teams.away.name, ag, hg, !homeWon && !drew, drew)
  }

  // Turneringsgenomsnitt
  let totalGoals = 0, totalGames = 0
  for (const t of raw.values()) {
    totalGoals += t.goalsScored
    totalGames += t.played
  }
  const leagueAvg = totalGames > 0 ? totalGoals / totalGames : 1.5

  // Bygg ratings med Bayesian shrinkage
  const stats = new Map<number, TeamStats>()
  for (const [id, t] of raw) {
    const rawAttack = t.played > 0 ? t.goalsScored / t.played : leagueAvg
    const rawDefense = t.played > 0 ? t.goalsConceded / t.played : leagueAvg

    // Shrink mot snitt (PRIOR_WEIGHT "virtual games" vid genomsnittet)
    const shrunkAttack = (rawAttack * t.played + leagueAvg * PRIOR_WEIGHT) / (t.played + PRIOR_WEIGHT)
    const shrunkDefense = (rawDefense * t.played + leagueAvg * PRIOR_WEIGHT) / (t.played + PRIOR_WEIGHT)

    stats.set(id, {
      ...t,
      attackRating: shrunkAttack / leagueAvg,
      defenseRating: shrunkDefense / leagueAvg,
    })
  }

  return { stats, leagueAvg }
}

// ── Warning Detector ───────────────────────────────────────────────────────────

/**
 * Flaggar statistiska "röda flaggor" som modellen kan missa.
 */
function detectWarnings(home: TeamStats, away: TeamStats): string | undefined {
  const warnings: string[] = []

  // Laget med flest mål har hög varians (outlier-match)
  const homeGPG = home.goalsScored / home.played
  const awayGPG = away.goalsScored / away.played
  if (homeGPG > 3.5) warnings.push(`${home.name} mål/match (${homeGPG.toFixed(1)}) kan vara inflaterat av ett svagt motstånd`)
  if (awayGPG > 3.5) warnings.push(`${away.name} mål/match (${awayGPG.toFixed(1)}) kan vara inflaterat av ett svagt motstånd`)

  // Tight match (sannolikheter nära 33/33/33)
  return warnings.length > 0 ? warnings.join(' | ') : undefined
}

// ── Match Predictor ────────────────────────────────────────────────────────────

function predictMatch(home: TeamStats, away: TeamStats, leagueAvg: number, matchDate: string, round: string): MatchPrediction {
  const lH = home.attackRating * away.defenseRating * leagueAvg
  const lA = away.attackRating * home.defenseRating * leagueAvg

  const matrix = buildScoreMatrix(lH, lA)
  const { homeWin, draw, awayWin, topScores } = analyseMatrix(matrix)

  // Bygg alla möjliga tips (inte bara top-8) för EV-beräkning
  const allScores: ScoreLine[] = []
  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      allScores.push({ home: h, away: a, prob: matrix[h][a] })
    }
  }
  allScores.sort((x, y) => y.prob - x.prob)

  const { tip, ev: tipEV } = pickBestTip(allScores, homeWin, awayWin)

  const dominance = Math.abs(homeWin - awayWin)
  const confidence: 'HÖG' | 'MEDIUM' | 'LÅG' =
    dominance > 0.35 ? 'HÖG' : dominance > 0.15 ? 'MEDIUM' : 'LÅG'

  return {
    homeTeam: home.name,
    awayTeam: away.name,
    date: matchDate,
    round,
    lambdaHome: lH,
    lambdaAway: lA,
    homeWinProb: homeWin,
    drawProb: draw,
    awayWinProb: awayWin,
    topScores: topScores.slice(0, 5),
    tip: `${tip.home}-${tip.away}`,
    tipEV,
    confidence,
    warning: detectWarnings(home, away),
  }
}

// ── Formatter ──────────────────────────────────────────────────────────────────

function formatPrediction(p: MatchPrediction, idx: number): string {
  const confColor = { HÖG: '🟢', MEDIUM: '🟡', LÅG: '🔴' }[p.confidence]
  const lines: string[] = [
    ``,
    `┌─ Match ${idx + 1} ─ ${p.date} ─ ${p.round}`,
    `│  ⚽ ${p.homeTeam}  vs  ${p.awayTeam}`,
    `│`,
    `│  Förväntade mål:  ${p.homeTeam} ${p.lambdaHome.toFixed(2)}  |  ${p.awayTeam} ${p.lambdaAway.toFixed(2)}`,
    `│  Vinstsannolikhet: ${p.homeTeam} ${(p.homeWinProb * 100).toFixed(0)}%  |  OT/PEN ${(p.drawProb * 100).toFixed(0)}%  |  ${p.awayTeam} ${(p.awayWinProb * 100).toFixed(0)}%`,
    `│`,
    `│  Topp resultat:`,
    ...p.topScores.map((s, i) =>
      `│    ${i === 0 ? '→' : ' '} ${p.homeTeam} ${s.home}-${s.away} ${p.awayTeam}  (${(s.prob * 100).toFixed(1)}%)`
    ),
    `│`,
    `│  ${confColor} TIPS: ${p.homeTeam} ${p.tip} ${p.awayTeam}   [${p.confidence}]  EV: ${p.tipEV.toFixed(2)}p`,
    p.warning ? `│  ⚠️  ${p.warning}` : `│`,
    `└${'─'.repeat(68)}`,
  ]
  return lines.join('\n')
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🏆 VM 2026 — KNOCKOUT PREDICTION ENGINE')
  console.log('━'.repeat(70))
  console.log('  Poisson-modell | Bayesiansk shrinkage | EV-optimerade tips')
  console.log('━'.repeat(70))

  if (!process.env.API_FOOTBALL_KEY) {
    console.error('\n❌ Sätt API_FOOTBALL_KEY innan du kör scriptet:\n   API_FOOTBALL_KEY=xxx npx tsx scripts/predict-knockout.ts\n')
    process.exit(1)
  }

  console.log('\n📡 Hämtar alla VM 2026-fixtures...')
  const fixtures = await fetchAllFixtures()
  console.log(`   ${fixtures.length} fixtures hittade`)

  const { stats: teamStats, leagueAvg } = buildTeamStats(fixtures)
  console.log(`\n📊 Turneringssnitt: ${leagueAvg.toFixed(2)} mål/lag/match (${teamStats.size} lag analyserade)`)

  // Hitta kommande knockout-matcher
  const now = Date.now()
  const upcoming = fixtures
    .filter(f => {
      const status = mapStatus(f.fixture.status.short)
      const stage = mapStage(f.league.round)
      const matchTime = new Date(f.fixture.date).getTime()
      return status === 'scheduled' && stage !== 'group' && matchTime > now
    })
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())

  if (upcoming.length === 0) {
    console.log('\n  Inga kommande knockout-matcher.\n')
    return
  }

  console.log(`\n🗓  ${upcoming.length} kommande knockout-matcher\n`)

  const predictions: MatchPrediction[] = []
  const missing: string[] = []

  for (const match of upcoming) {
    const home = teamStats.get(match.teams.home.id)
    const away = teamStats.get(match.teams.away.id)

    const dateStr = new Date(match.fixture.date).toLocaleDateString('sv-SE', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Stockholm',
    })

    if (!home || !away) {
      missing.push(`${match.teams.home.name} vs ${match.teams.away.name} (${dateStr}) — stats saknas`)
      continue
    }

    predictions.push(predictMatch(home, away, leagueAvg, dateStr, match.league.round))
  }

  for (let i = 0; i < predictions.length; i++) {
    console.log(formatPrediction(predictions[i], i))
  }

  if (missing.length > 0) {
    console.log('\n⚠️  Matcher utan stats (lotten ej klar):')
    for (const m of missing) console.log(`   - ${m}`)
  }

  // Sammanfattning — ren tipstabell
  console.log('\n' + '━'.repeat(70))
  console.log('📋 TIPSTABELL — KLISTRA IN DIREKT\n')
  for (const p of predictions) {
    const conf = { HÖG: '●●●', MEDIUM: '●●○', LÅG: '●○○' }[p.confidence]
    console.log(`  ${p.date.padEnd(22)} ${p.homeTeam} ${p.tip} ${p.awayTeam}  ${conf}`)
  }
  console.log()
}

main().catch(err => {
  console.error('\n❌ Fel:', err.message)
  process.exit(1)
})
