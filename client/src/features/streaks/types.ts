// ─── Streaks & Life Wins — Types ─────────────────────────────────────────────
// Session 16 — Propel Stack AI, LLC

export type StreakType =
  | 'daily_login' | 'mood' | 'habit' | 'goal'
  | 'life_score' | 'finance' | 'weekly_recap';

export interface Streak {
  id: string;
  user_id: string;
  streak_type: StreakType;
  habit_id: string;
  current_len: number;
  longest_ever: number;
  last_logged: string | null;
  grace_used: boolean;
  updated_at: string;
  // Enriched by server
  label: string;
  emoji: string;
  unit: string;
}

export interface LifeWin {
  id: string;
  user_id: string;
  win_type: 'goal' | 'streak' | 'score' | 'manual' | 'badge' | 'habit' | string;
  title: string;
  detail: string;
  source_hub: string;
  is_shared: number; // 0 | 1 (SQLite int)
  occurred_on: string; // YYYY-MM-DD
  created_at: string;
}

export interface StreaksResponse {
  streaks: Streak[];
}

export interface LifeWinsResponse {
  wins: LifeWin[];
  total: number;
  hasMore: boolean;
}

export interface HubsResponse {
  hubs: string[];
}
