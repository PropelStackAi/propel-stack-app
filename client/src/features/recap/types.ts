// ─── AI Weekly Life Recap — Types ───────────────────────────────────────────
// Session 15 — Propel Stack AI, LLC

export interface WeeklyRecap {
  id: string;
  user_id: string;
  week_start: string; // YYYY-MM-DD
  recap_text: string;
  insight_key: string; // 'general' | 'sleep-mood' | 'fitness' | 'nutrition' | 'habits'
  life_score_delta: number | null;
  next_week_intention: string;
  next_week_habit: string;
  next_week_goal: string;
  opened_at: string | null;
  created_at: string;
}

export interface RecapCurrentResponse {
  recap: WeeklyRecap | null;
  isNew: boolean;
}

export interface RecapGenerateResponse {
  recap: WeeklyRecap;
  cached: boolean;
}

export interface RecapHistoryResponse {
  recaps: WeeklyRecap[];
  total: number;
  hasMore: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

export interface NextWeekPayload {
  intention: string;
  habit: string;
  goal: string;
}
