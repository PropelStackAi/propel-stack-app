// ─── Smart Notification Intelligence — Types ──────────────────────────────────
// Enhancement 17 — Propel Stack AI, LLC

export type NotifType = 'reminder' | 'recap' | 'streak' | 'coach' | 'nudge';

export type TriggerKey =
  | 'no_mood_log'
  | 'streak_at_risk'
  | 'recap_unread'
  | 'life_score_drop'
  | 'goal_deadline'
  | 'finance_spike'
  | 'absence';

export interface NotificationEvent {
  id: string;
  user_id: string;
  notif_type: NotifType;
  trigger_key: TriggerKey;
  title: string;
  body: string;
  sent_at: string;
  opened_at: string | null;
  hour_of_day: number;
  day_of_week: number;
}

export interface NotificationPreference {
  key: TriggerKey;
  notif_type: NotifType;
  label: string;
  mental_health: boolean;
  enabled: boolean;
}
