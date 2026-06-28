// Country display helpers — maps a team name to a short code, flag emoji, and
// an ISO-2 code (used to build a flag image URL when the API logo is missing,
// e.g. in the dev preview). Falls back gracefully for unknown names.

export interface CountryMeta {
  abbr: string
  flag: string // emoji fallback
  iso: string | null // ISO 3166-1 alpha-2 (flagcdn) — 'gb-eng' etc. for home nations
}

// Keyed by lowercased team name. Covers the likely WC 2026 field; extend freely.
const COUNTRIES: Record<string, CountryMeta> = {
  argentina: { abbr: 'ARG', flag: '🇦🇷', iso: 'ar' },
  australia: { abbr: 'AUS', flag: '🇦🇺', iso: 'au' },
  austria: { abbr: 'AUT', flag: '🇦🇹', iso: 'at' },
  belgium: { abbr: 'BEL', flag: '🇧🇪', iso: 'be' },
  brazil: { abbr: 'BRA', flag: '🇧🇷', iso: 'br' },
  cameroon: { abbr: 'CMR', flag: '🇨🇲', iso: 'cm' },
  canada: { abbr: 'CAN', flag: '🇨🇦', iso: 'ca' },
  colombia: { abbr: 'COL', flag: '🇨🇴', iso: 'co' },
  'costa rica': { abbr: 'CRC', flag: '🇨🇷', iso: 'cr' },
  croatia: { abbr: 'CRO', flag: '🇭🇷', iso: 'hr' },
  curacao: { abbr: 'CUW', flag: '🏳️', iso: 'cw' },
  'curaçao': { abbr: 'CUW', flag: '🏳️', iso: 'cw' },
  denmark: { abbr: 'DEN', flag: '🇩🇰', iso: 'dk' },
  ecuador: { abbr: 'ECU', flag: '🇪🇨', iso: 'ec' },
  egypt: { abbr: 'EGY', flag: '🇪🇬', iso: 'eg' },
  england: { abbr: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', iso: 'gb-eng' },
  france: { abbr: 'FRA', flag: '🇫🇷', iso: 'fr' },
  germany: { abbr: 'GER', flag: '🇩🇪', iso: 'de' },
  ghana: { abbr: 'GHA', flag: '🇬🇭', iso: 'gh' },
  iran: { abbr: 'IRN', flag: '🇮🇷', iso: 'ir' },
  'ivory coast': { abbr: 'CIV', flag: '🇨🇮', iso: 'ci' },
  italy: { abbr: 'ITA', flag: '🇮🇹', iso: 'it' },
  japan: { abbr: 'JPN', flag: '🇯🇵', iso: 'jp' },
  mexico: { abbr: 'MEX', flag: '🇲🇽', iso: 'mx' },
  morocco: { abbr: 'MAR', flag: '🇲🇦', iso: 'ma' },
  netherlands: { abbr: 'NED', flag: '🇳🇱', iso: 'nl' },
  nigeria: { abbr: 'NGA', flag: '🇳🇬', iso: 'ng' },
  norway: { abbr: 'NOR', flag: '🇳🇴', iso: 'no' },
  panama: { abbr: 'PAN', flag: '🇵🇦', iso: 'pa' },
  paraguay: { abbr: 'PAR', flag: '🇵🇾', iso: 'py' },
  peru: { abbr: 'PER', flag: '🇵🇪', iso: 'pe' },
  poland: { abbr: 'POL', flag: '🇵🇱', iso: 'pl' },
  portugal: { abbr: 'POR', flag: '🇵🇹', iso: 'pt' },
  qatar: { abbr: 'QAT', flag: '🇶🇦', iso: 'qa' },
  'saudi arabia': { abbr: 'KSA', flag: '🇸🇦', iso: 'sa' },
  senegal: { abbr: 'SEN', flag: '🇸🇳', iso: 'sn' },
  serbia: { abbr: 'SRB', flag: '🇷🇸', iso: 'rs' },
  'south africa': { abbr: 'RSA', flag: '🇿🇦', iso: 'za' },
  'south korea': { abbr: 'KOR', flag: '🇰🇷', iso: 'kr' },
  korea: { abbr: 'KOR', flag: '🇰🇷', iso: 'kr' },
  'korea republic': { abbr: 'KOR', flag: '🇰🇷', iso: 'kr' },
  spain: { abbr: 'ESP', flag: '🇪🇸', iso: 'es' },
  sweden: { abbr: 'SWE', flag: '🇸🇪', iso: 'se' },
  switzerland: { abbr: 'SUI', flag: '🇨🇭', iso: 'ch' },
  tunisia: { abbr: 'TUN', flag: '🇹🇳', iso: 'tn' },
  'united states': { abbr: 'USA', flag: '🇺🇸', iso: 'us' },
  usa: { abbr: 'USA', flag: '🇺🇸', iso: 'us' },
  uruguay: { abbr: 'URU', flag: '🇺🇾', iso: 'uy' },
  wales: { abbr: 'WAL', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', iso: 'gb-wls' },
}

export function getCountry(name: string | null | undefined): CountryMeta {
  if (!name) return { abbr: '—', flag: '🏳️', iso: null }
  const hit = COUNTRIES[name.trim().toLowerCase()]
  if (hit) return hit
  return { abbr: name.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 3).toUpperCase() || '—', flag: '🏳️', iso: null }
}

export function flagcdn(iso: string | null, size: 'w40' | 'w80' | 'w160' = 'w80'): string | null {
  return iso ? `https://flagcdn.com/${size}/${iso}.png` : null
}
