export type AgeRange = 'child' | 'tween'; // child = 5-8, tween = 9-12

export interface ChildProfile {
  id: string;
  parent_user_id: string;
  name: string;
  avatar_emoji: string;
  age_range: AgeRange;
  content_filter: number;        // 0 | 1 (sqlite boolean)
  ai_logging_enabled: number;    // 0 | 1
  screen_time_limit_minutes: number;
  app_sections_approved: string; // JSON string: string[]
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  created_at: string;
}

export interface ScreenTimeStatus {
  usedMinutes: number;
  limitMinutes: number;
  remainingMinutes: number;
  allowed: boolean;
}

export interface AiUsageSummaryRow {
  session_type: string;
  session_count: number;
  interaction_count: number;
}

export interface AiUsageRecentRow {
  session_type: string;
  created_at: string;
}

export interface AiUsageData {
  summary: AiUsageSummaryRow[];
  recent: AiUsageRecentRow[];
}

export const AVATAR_OPTIONS = ['🧒', '👧', '👦', '🧒‍♀️', '🧒‍♂️', '🐶', '🦊', '🐱', '🦋', '⭐'];

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  child: 'Ages 5–8',
  tween: 'Ages 9–12',
};

export const SECTION_LABELS: Record<string, string> = {
  stories: 'Stories',
  homework: 'Homework Helper',
  games: 'Brain Games',
  bedtime: 'Bedtime Stories',
};
