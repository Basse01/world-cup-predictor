export type Stage = 'group' | 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'third_place' | 'final'
export type MatchStatus = 'scheduled' | 'live' | 'finished'
export type Pick1X2 = '1' | 'X' | '2'
export type WinnerPick = 'home' | 'away'

export interface Match {
  id: string
  api_match_id: number
  home_team: string
  away_team: string
  home_team_logo: string | null
  away_team_logo: string | null
  kickoff_at: string
  status: MatchStatus
  stage: Stage
  home_score: number | null
  away_score: number | null
  group_name: string | null
  lock_at: string
  elapsed_minutes: number | null
  api_status: string | null
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  pick: Pick1X2 | null
  home_score: number | null
  away_score: number | null
  winner_pick: WinnerPick | null
  points_awarded: number
}

export interface Profile {
  id: string
  display_name: string
  paid: boolean
  is_admin: boolean
  avatar_url: string | null
}

export interface Standing {
  user_id: string
  display_name: string
  paid: boolean
  total_points: number
  rank: number
}

export interface Message {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles: { display_name: string }
}

export interface BonusPrediction {
  id: string
  user_id: string
  type: string
  value: string
  points_awarded: number
  locked_at: string | null
  locked_points: number | null
}

export interface BonusType {
  type: string
  label: string
  points: number
  locked_at: string | null
}

export interface MatchEvent {
  id: number
  match_id: string
  elapsed: number
  extra_time: number | null
  team_name: string
  team_logo: string | null
  player_name: string | null
  player_id: number | null
  assist_name: string | null
  type: string
  detail: string | null
  comments: string | null
}

export interface BonusOption {
  type: string
  value: string
  display_label: string
  points: number
  sort_order: number
}
