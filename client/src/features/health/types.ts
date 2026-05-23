export type MetricType = 'weight' | 'bp' | 'hr' | 'glucose' | 'spo2';
export type AppointmentStatus = 'upcoming' | 'past' | 'cancelled';

export interface HealthProfile {
  id: string;
  user_id: string;
  full_name: string;
  blood_type: string;
  allergies: string;      // JSON string: string[]
  conditions: string;     // JSON string: string[]
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface HealthMetric {
  id: string;
  user_id: string;
  metric_type: MetricType;
  value: number;
  value2: number | null;   // diastolic BP only
  unit: string;
  notes: string;
  measured_at: string;
}

export interface SymptomLog {
  id: string;
  user_id: string;
  symptom: string;
  severity: number;        // 1-10
  duration_hours: number | null;
  notes: string;
  logged_at: string;
}

export interface SymptomPattern {
  symptom: string;
  count: number;
}

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dose: string;
  frequency: string;
  reminder_times: string; // JSON: string[]
  active: number;          // 0 | 1
  start_date: string | null;
  notes: string;
  created_at: string;
}

export interface HealthAppointment {
  id: string;
  user_id: string;
  doctor_name: string;
  specialty: string;
  appointment_date: string;
  appointment_time: string;
  location: string;
  notes: string;
  status: AppointmentStatus;
  created_at: string;
}

export interface HealthAIResponse {
  text: string;
  stub?: boolean;
  crisis?: boolean;
  emergency?: boolean;
  resources?: string[];
  disclaimer: string;
}

// ── Display helpers ──────────────────────────────────────────────────────────

export const METRIC_CONFIG: Record<MetricType, {
  label: string; unit: string; emoji: string; color: string;
  normal?: string; dataKey: string; dataKey2?: string;
}> = {
  weight:  { label: 'Weight',        unit: 'lbs',   emoji: '⚖️',  color: '#4F35C2', normal: '',                   dataKey: 'value' },
  bp:      { label: 'Blood Pressure', unit: 'mmHg',  emoji: '❤️',  color: '#F05A28', normal: '<120/80 mmHg',       dataKey: 'value', dataKey2: 'value2' },
  hr:      { label: 'Heart Rate',     unit: 'bpm',   emoji: '💓',  color: '#01696F', normal: '60-100 bpm',         dataKey: 'value' },
  glucose: { label: 'Blood Glucose',  unit: 'mg/dL', emoji: '🩸',  color: '#6B21A8', normal: '70-99 mg/dL fasting', dataKey: 'value' },
  spo2:    { label: 'SpO2',           unit: '%',     emoji: '🫁',  color: '#0369A1', normal: '95-100%',            dataKey: 'value' },
};

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export const HEALTH_DISCLAIMER = 'Health information is for personal tracking only. Nothing here constitutes medical advice. Consult a licensed physician before making any health decisions.';
