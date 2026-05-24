// ─── Relationships & People Hub — Types ──────────────────────────────────────
// Enhancement 19 — Propel Stack AI, LLC

export type RelationshipType = 'family' | 'friend' | 'colleague' | 'mentor' | 'partner' | 'neighbour' | 'other';
export type CheckinCadence = 'weekly' | 'monthly' | 'quarterly' | 'custom';
export type ContactMethod = 'call' | 'text' | 'in_person' | 'email' | 'video';
export type StrengthLabel = 'Warm' | 'Active' | 'Cooling' | 'Distant';

export interface RelationshipContact {
  id: string;
  user_id: string;
  name: string;
  relationship: RelationshipType;
  birthday: string | null;
  anniversary: string | null;
  checkin_cadence: CheckinCadence;
  cadence_days: number;
  last_contact: string | null;
  contact_method: ContactMethod;
  photo_emoji: string;
  notes: string;
  is_private: number;
  created_at: string;
  // computed server-side
  strength: StrengthLabel;
  days_since_contact: number;
  days_overdue: number;
}

export interface RelationshipInteraction {
  id: string;
  user_id: string;
  contact_id: string;
  method: ContactMethod;
  note: string;
  occurred_on: string;
  created_at: string;
}

export interface UpcomingEvent {
  contact_id: string;
  name: string;
  relationship: RelationshipType;
  event_type: 'Birthday' | 'Anniversary';
  event_date: string;
  days_until: number;
  date_this_year: string;
}
