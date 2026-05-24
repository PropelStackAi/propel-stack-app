// ─── Student Mode Types ───────────────────────────────────────────────────────
// Session 14 (Bug Fix) — Propel Stack AI, LLC

export interface Course {
  id: string;
  user_id: string;
  name: string;
  code: string;
  instructor: string;
  credits: number;
  status: 'active' | 'completed' | 'planned' | 'dropped';
  grade: string;
  color: string;
  notes: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface FlashcardDeck {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  description: string;
  card_count: number;
  due_count: number;
  created_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  user_id: string;
  front: string;
  back: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_due: string;
  deck_name?: string;
  deck_subject?: string;
  created_at: string;
}

export interface StudentNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  doc_type: 'essay' | 'paper' | 'thesis' | 'notes';
  course_id: string | null;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface StudentResource {
  id: string;
  user_id: string;
  title: string;
  url: string;
  authors: string;
  year: string;
  summary: string;
  tags: string; // JSON string []
  source_type: 'article' | 'book' | 'video' | 'website' | 'journal';
  created_at: string;
}

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
}
