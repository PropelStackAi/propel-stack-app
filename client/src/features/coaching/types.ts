// ─── AI Life Coach Types ──────────────────────────────────────────────────────
// Enhancement 22 — Propel Stack AI, LLC

export type InsightType =
  | 'relationship_neglect'
  | 'learning_gap'
  | 'maintenance_overdue'
  | 'streak_gap'
  | 'finance_awareness'
  | 'health_regression';

export interface CoachingInsight {
  id: string;
  user_id: string;
  insight_type: InsightType;
  insight_text: string;
  hubs_used: string;        // comma-separated
  dismissed: number;        // 0 | 1
  dismiss_type?: 'once' | 'permanent_type';
  delivered_at: string;
  opened_at?: string;
  created_at: string;
}

export interface CoachingPreferences {
  id: string;
  user_id: string;
  ai_coach_enabled: number;    // 0 | 1
  mental_health_enabled: number; // 0 | 1 — explicit opt-in
  last_generated?: string;
}

export const INSIGHT_META: Record<InsightType, { label: string; emoji: string; hue: string }> = {
  relationship_neglect: { label: 'Relationship',  emoji: '👥', hue: 'teal'   },
  learning_gap:         { label: 'Learning',       emoji: '📚', hue: 'indigo' },
  maintenance_overdue:  { label: 'Home',           emoji: '🔧', hue: 'orange' },
  streak_gap:           { label: 'Habits',         emoji: '🔥', hue: 'coral'  },
  finance_awareness:    { label: 'Finance',        emoji: '💰', hue: 'green'  },
  health_regression:    { label: 'Health',         emoji: '💚', hue: 'green'  },
};
