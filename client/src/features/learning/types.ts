// ─── Learning Hub Types ───────────────────────────────────────────────────────
// Enhancement 20 — Propel Stack AI, LLC

export type ItemType = 'book' | 'course' | 'podcast' | 'certification' | 'article';

export interface LearningItem {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  author: string;
  platform: string;
  url: string;
  status: string;      // 'to-read' | 'reading' | 'finished' | 'in-progress' | 'completed' | 'paused'
  progress: number;    // pages read (books) or % (courses)
  total_pages?: number;
  tags: string;        // comma-separated
  notes: string;
  key_takeaway: string;
  exam_date?: string;
  study_hours_logged: number;
  pass_fail?: 'pass' | 'fail';
  completed_at?: string;
  created_at: string;
}

export interface LearningSummary {
  books_finished: number;
  courses_completed: number;
  study_minutes: number;
  pages_read_month: number;
  articles_saved: number;
  currently_reading: LearningItem[];
  life_score_active: boolean;
  pages_per_day: number;
}
