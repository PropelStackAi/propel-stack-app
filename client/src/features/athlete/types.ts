// ─── Athlete Feature Types ─────────────────────────────────────────────────
// Session 13 — Propel Stack AI, LLC

export const DISCLAIMER_VERSION = 'PSAI-ATH-DISC-v1.0';

export const DISCLAIMER_TEXT = `
PROPEL STACK AI — ATHLETE PERFORMANCE HUB DISCLAIMER (PSAI-ATH-DISC-v1.0)

This Athlete Performance Hub ("Hub") is an organizational and general informational tool provided by Propel Stack AI, LLC. It is NOT a substitute for professional coaching, sports medicine, physical therapy, or medical advice.

IMPORTANT LIMITATIONS:
• AI-generated training plans are general suggestions only. They do not account for your complete health history, biomechanics, or individual physiology.
• Nutrition guidance is general and informational. Consult a Registered Dietitian or sports nutritionist for individualized plans.
• Recovery scores and readiness indicators are self-reported estimates — not clinical measurements.
• Personal record (PR) detection relies on self-entered data and may not reflect accurate testing conditions.

MEDICAL DISCLAIMER:
• If you experience chest pain, difficulty breathing, severe dizziness, loss of consciousness, or any sign of serious injury, STOP IMMEDIATELY and seek emergency medical care (call 911).
• Do not use this tool to diagnose, treat, or manage any medical condition or injury.
• Always consult a physician before beginning any new exercise program, especially if you have pre-existing conditions.

YOUTH ATHLETES (Under 14):
• Youth safety mode is active for athletes under 14. Certain features (1RM calculators, aggressive periodization, weight-cutting guidance) are restricted.
• All training plans for youth require review by a qualified coach or parent/guardian.

By continuing to use the Athlete Performance Hub, you acknowledge that you have read and understood this disclaimer. Propel Stack AI, LLC is not liable for any injury, health event, or outcome resulting from use of this Hub.
`.trim();

// ─── Sports ────────────────────────────────────────────────────────────────

export const SPORTS = [
  'Running', 'Cycling', 'Swimming', 'Triathlon', 'Weightlifting',
  'Powerlifting', 'CrossFit', 'Soccer', 'Basketball', 'Baseball',
  'Softball', 'Tennis', 'Volleyball', 'Football', 'Wrestling',
  'Gymnastics', 'Track & Field', 'Rowing', 'MMA / Martial Arts',
  'Rock Climbing', 'Golf', 'Other',
] as const;

export type Sport = (typeof SPORTS)[number];

export const SPORT_CATEGORIES: Record<string, Sport[]> = {
  endurance: ['Running', 'Cycling', 'Swimming', 'Triathlon', 'Rowing'],
  strength: ['Weightlifting', 'Powerlifting', 'CrossFit'],
  team: ['Soccer', 'Basketball', 'Baseball', 'Softball', 'Football', 'Volleyball'],
  combat: ['Wrestling', 'MMA / Martial Arts'],
  technical: ['Gymnastics', 'Tennis', 'Track & Field', 'Rock Climbing', 'Golf'],
  other: ['Other'],
};

export function getSportCategory(sport: string): keyof typeof SPORT_CATEGORIES {
  for (const [cat, sports] of Object.entries(SPORT_CATEGORIES)) {
    if ((sports as string[]).includes(sport)) return cat as keyof typeof SPORT_CATEGORIES;
  }
  return 'other';
}

// ─── Experience Levels ──────────────────────────────────────────────────────

export const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'Less than 1 year' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–3 years' },
  { value: 'advanced', label: 'Advanced', desc: '3–7 years' },
  { value: 'elite', label: 'Elite / Competitive', desc: '7+ years or competitive' },
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]['value'];

// ─── Primary Goals ──────────────────────────────────────────────────────────

export const PRIMARY_GOALS = [
  { value: 'general_fitness', label: 'General Fitness', emoji: '💪' },
  { value: 'lose_fat', label: 'Lose Body Fat', emoji: '🔥' },
  { value: 'build_muscle', label: 'Build Muscle / Hypertrophy', emoji: '📈' },
  { value: 'increase_strength', label: 'Increase Strength', emoji: '🏋️' },
  { value: 'improve_endurance', label: 'Improve Endurance', emoji: '🏃' },
  { value: 'sport_performance', label: 'Sport Performance', emoji: '🏆' },
  { value: 'competition_prep', label: 'Competition Prep', emoji: '🎯' },
  { value: 'recovery', label: 'Recovery / Injury Prevention', emoji: '🩹' },
] as const;

export type PrimaryGoal = (typeof PRIMARY_GOALS)[number]['value'];

// ─── Equipment ──────────────────────────────────────────────────────────────

export const EQUIPMENT_OPTIONS = [
  'Full gym access', 'Barbell & plates', 'Dumbbells', 'Kettlebells',
  'Pull-up bar', 'Resistance bands', 'Cable machine', 'Cardio machines',
  'Swimming pool', 'Track / Outdoor', 'No equipment (bodyweight only)',
] as const;

// ─── Training Days ──────────────────────────────────────────────────────────

export const TRAINING_DAYS_OPTIONS = [2, 3, 4, 5, 6, 7] as const;
export const SESSION_LENGTH_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 75, label: '75 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '2 hours' },
] as const;

// ─── Macro Targets by Sport Category ───────────────────────────────────────

export const MACRO_TARGETS: Record<string, { protein: string; carbs: string; fat: string; note: string }> = {
  endurance: { protein: '1.4–1.7g/kg', carbs: '5–10g/kg', fat: '1.0–1.5g/kg', note: 'Prioritize carb loading before long efforts' },
  strength: { protein: '1.6–2.2g/kg', carbs: '3–5g/kg', fat: '1.0–1.5g/kg', note: 'Higher protein for muscle protein synthesis' },
  team: { protein: '1.4–1.7g/kg', carbs: '5–8g/kg', fat: '1.0–1.5g/kg', note: 'Balance for speed, power, and endurance' },
  combat: { protein: '1.8–2.2g/kg', carbs: '4–6g/kg', fat: '1.0–1.5g/kg', note: 'Weight class management may apply — consult RD' },
  technical: { protein: '1.4–1.7g/kg', carbs: '4–6g/kg', fat: '1.0–1.5g/kg', note: 'Fueling supports focus and motor control' },
  other: { protein: '1.4–2.0g/kg', carbs: '4–7g/kg', fat: '1.0–1.5g/kg', note: 'Adjust based on training volume' },
};

// ─── Meal Types ─────────────────────────────────────────────────────────────

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Pre-workout', 'Post-workout', 'Snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

// ─── Body Areas for Soreness Map ────────────────────────────────────────────

export const BODY_AREAS = [
  // Front
  { id: 'neck', label: 'Neck', side: 'front' },
  { id: 'chest', label: 'Chest', side: 'front' },
  { id: 'left_shoulder', label: 'L Shoulder', side: 'front' },
  { id: 'right_shoulder', label: 'R Shoulder', side: 'front' },
  { id: 'left_bicep', label: 'L Bicep', side: 'front' },
  { id: 'right_bicep', label: 'R Bicep', side: 'front' },
  { id: 'left_forearm', label: 'L Forearm', side: 'front' },
  { id: 'right_forearm', label: 'R Forearm', side: 'front' },
  { id: 'abs', label: 'Abs / Core', side: 'front' },
  { id: 'left_hip', label: 'L Hip', side: 'front' },
  { id: 'right_hip', label: 'R Hip', side: 'front' },
  { id: 'left_quad', label: 'L Quad', side: 'front' },
  { id: 'right_quad', label: 'R Quad', side: 'front' },
  { id: 'left_knee', label: 'L Knee', side: 'front' },
  { id: 'right_knee', label: 'R Knee', side: 'front' },
  { id: 'left_shin', label: 'L Shin', side: 'front' },
  { id: 'right_shin', label: 'R Shin', side: 'front' },
  // Back
  { id: 'upper_back', label: 'Upper Back', side: 'back' },
  { id: 'lower_back', label: 'Lower Back', side: 'back' },
  { id: 'left_trap', label: 'L Trap', side: 'back' },
  { id: 'right_trap', label: 'R Trap', side: 'back' },
  { id: 'left_tricep', label: 'L Tricep', side: 'back' },
  { id: 'right_tricep', label: 'R Tricep', side: 'back' },
  { id: 'left_glute', label: 'L Glute', side: 'back' },
  { id: 'right_glute', label: 'R Glute', side: 'back' },
  { id: 'left_hamstring', label: 'L Hamstring', side: 'back' },
  { id: 'right_hamstring', label: 'R Hamstring', side: 'back' },
  { id: 'left_calf', label: 'L Calf', side: 'back' },
  { id: 'right_calf', label: 'R Calf', side: 'back' },
] as const;

export type BodyAreaId = (typeof BODY_AREAS)[number]['id'];

// ─── Recovery Modalities ────────────────────────────────────────────────────

export const RECOVERY_MODALITIES = [
  'Ice / Cold therapy', 'Heat therapy', 'Foam rolling', 'Stretching',
  'Massage', 'Compression', 'Epsom salt bath', 'Contrast therapy',
  'Active recovery (light movement)', 'Sauna',
] as const;

// ─── Session Types ──────────────────────────────────────────────────────────

export const SESSION_TYPES = [
  'Strength', 'Cardio', 'Sport practice', 'HIIT', 'Recovery / Active rest',
  'Flexibility / Mobility', 'Competition', 'Time trial / Test',
] as const;

// ─── PR Units ───────────────────────────────────────────────────────────────

export const PR_UNITS = ['lbs', 'kg', 'miles', 'km', 'meters', 'minutes', 'seconds', 'reps'] as const;
export type PRUnit = (typeof PR_UNITS)[number];

// ─── Pacing Calculator ──────────────────────────────────────────────────────

export const RACE_DISTANCES = {
  running: [
    { label: '1 mile', meters: 1609 },
    { label: '5K', meters: 5000 },
    { label: '10K', meters: 10000 },
    { label: 'Half Marathon', meters: 21097 },
    { label: 'Marathon', meters: 42195 },
    { label: '50K Ultra', meters: 50000 },
    { label: 'Custom', meters: 0 },
  ],
  cycling: [
    { label: '20 km TT', meters: 20000 },
    { label: '40 km TT', meters: 40000 },
    { label: '100 km', meters: 100000 },
    { label: 'Custom', meters: 0 },
  ],
  swimming: [
    { label: '100m', meters: 100 },
    { label: '200m', meters: 200 },
    { label: '400m', meters: 400 },
    { label: '1500m', meters: 1500 },
    { label: 'Open Water 1km', meters: 1000 },
    { label: 'Custom', meters: 0 },
  ],
};

// ─── Competition Checklist ──────────────────────────────────────────────────

export const COMPETITION_CHECKLIST = [
  'Register / confirm race entry',
  'Book travel & accommodation',
  'Plan competition-day nutrition and hydration',
  'Pack gear bag: uniform, shoes, warm-up clothes',
  'Arrange transport to venue',
  'Complete taper week protocol',
  'Confirm weigh-in time (if applicable)',
  'Prepare mental warm-up routine',
  'Get coach / support team contact details',
  'Review rules and course/event layout',
  'Post-competition recovery plan',
];

// ─── Biological Sex ─────────────────────────────────────────────────────────

export const BIOLOGICAL_SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

// ─── DB Record Types ────────────────────────────────────────────────────────

export interface AthleteProfile {
  id: number;
  user_id: number;
  sports: string; // JSON
  experience: string;
  primary_goal: string;
  training_days: number;
  session_length: number;
  equipment: string; // JSON
  competition_date: string | null;
  injury_history: string;
  age: number | null;
  weight: number | null;
  height: number | null;
  biological_sex: string;
  dietary_restrictions: string; // JSON
  calorie_goal: number | null;
  protein_target: number | null;
  is_youth: boolean;
  is_youth_under_14: boolean;
  disclaimer_dismissed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingPlan {
  id: number;
  user_id: number;
  name: string;
  sport: string;
  phase: string;
  plan_data: string; // JSON
  is_active: boolean;
  target_date: string | null;
  created_at: string;
}

export interface TrainingSession {
  id: number;
  user_id: number;
  plan_id: number | null;
  session_date: string;
  session_type: string;
  sport: string;
  exercises: string; // JSON
  duration_min: number | null;
  rpe: number | null;
  heart_rate_avg: number | null;
  total_volume: number | null;
  notes: string;
  mood: number | null;
  created_at: string;
}

export interface NutritionLog {
  id: number;
  user_id: number;
  log_date: string;
  meal_type: string;
  foods: string; // JSON
  total_calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  water_ml: number | null;
  notes: string;
  created_at: string;
}

export interface RecoveryLog {
  id: number;
  user_id: number;
  log_date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  hrv: number | null;
  sore_areas: string; // JSON
  soreness_level: number | null;
  energy_level: number | null;
  modalities: string; // JSON
  readiness_score: number | null;
  notes: string;
  created_at: string;
}

export interface AthletePR {
  id: number;
  user_id: number;
  exercise: string;
  value: number;
  unit: string;
  achieved_at: string;
  session_id: number | null;
  notes: string;
  created_at: string;
}

export interface ExerciseSet {
  exercise: string;
  sets?: number;
  reps?: string | number;
  weight?: number;
  unit?: string;
  duration_sec?: number;
  distance_m?: number;
  notes?: string;
}

export interface FoodEntry {
  name: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  quantity?: string;
}
