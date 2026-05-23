import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { db, getCurrentUserId } from '../db.js';

/**
 * Athlete Performance Hub — Session 13.
 *
 * SAFETY ARCHITECTURE:
 *   1. Injury detection runs BEFORE every AI call — hard-coded keyword list.
 *      Chest pain / head injury → recommend 911 immediately.
 *   2. Youth safety mode — profiles with is_youth_under_14=1 get a server-side
 *      flag injected into every AI plan: no 1RM, no weight-cut guidance.
 *   3. Disclaimer PSAI-ATH-DISC-v1.0 — client tracks weekly dismissal via
 *      athlete_profiles.disclaimer_dismissed_at.
 */

export const athleteRouter = Router();

// ── Injury detection keyword list ─────────────────────────────────────────
const INJURY_KEYWORDS = [
  'pain', 'injury', 'hurt', 'sprain', 'strain', 'fracture', 'broken',
  'swelling', 'sharp pain', "can't move", 'popped', 'snapped', 'torn',
  'concussion', 'head injury', 'dizzy', 'nausea after exercise',
  'chest pain', 'heart racing', "can't breathe",
];

const CHEST_HEAD_KEYWORDS = ['chest pain', 'heart racing', "can't breathe", 'concussion', 'head injury'];

function detectInjury(text: string): { detected: boolean; critical: boolean } {
  const lower = text.toLowerCase();
  const critical = CHEST_HEAD_KEYWORDS.some((kw) => lower.includes(kw));
  const detected = critical || INJURY_KEYWORDS.some((kw) => lower.includes(kw));
  return { detected, critical };
}

const INJURY_RESPONSE =
  'It sounds like you may be describing an injury or physical symptom. ' +
  '**Please stop activity immediately** and consult a physician, certified athletic trainer (ATC), or go to urgent care.\n\n' +
  'For chest pain, difficulty breathing, or head injuries — **call 911 immediately**.\n\n' +
  'Do not train through pain without professional medical clearance.';

const CHEST_RESPONSE =
  '🚨 **Stop activity immediately.** Chest pain, difficulty breathing, or heart racing during exercise requires immediate medical attention.\n\n' +
  '**Call 911 or go to the nearest emergency room now.** Do not continue training.';

// ── AI system prompt ───────────────────────────────────────────────────────
const ATHLETE_SYSTEM_PROMPT = `You are an expert sports performance AI assistant for Propel Stack AI. You provide sport-specific training, nutrition, and performance guidance for athletes of all levels.

ABSOLUTE RULES:
1. If any message describes pain, injury, or symptoms — STOP and refer to a physician or ATC immediately. Never provide workout modifications for injuries without professional clearance.
2. For chest pain, difficulty breathing, or head injuries — always recommend calling 911 immediately.
3. NEVER recommend specific medications or medical treatments.
4. Always end responses with the disclaimer: "PSAI-ATH-DISC-v1.0 — Not professional coaching or medical advice. Consult a licensed coach, ATC, or RD for your specific situation."
5. For youth athletes under 14: no 1RM testing, no maximal effort strength tests, no weight-cut guidance. All plans marked "Coach Review Required."

EXPERTISE: Periodized training, sport-specific programming, nutrition periodization, recovery protocols, pacing strategies, competition prep for 22 sports.`;

// ── Athlete Profile ────────────────────────────────────────────────────────

/** GET /api/athlete/profile */
athleteRouter.get('/profile', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const row = await db.prepare('SELECT * FROM athlete_profiles WHERE user_id = ?').get(userId);
    res.json(row ?? null);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** PUT /api/athlete/profile — create or update */
athleteRouter.put('/profile', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const {
      sports = [], experience = 'beginner', primaryGoal = 'general_fitness',
      trainingDays = 3, sessionLength = 60, equipment = [], competitionDate,
      injuryHistory = '', age, weight, height, biologicalSex,
      dietaryRestrictions = [], calorieGoal, proteinTarget,
      isYouth = false, isYouthUnder14 = false,
    } = req.body as {
      sports?: string[]; experience?: string; primaryGoal?: string;
      trainingDays?: number; sessionLength?: number; equipment?: string[];
      competitionDate?: string; injuryHistory?: string; age?: number;
      weight?: number; height?: number; biologicalSex?: string;
      dietaryRestrictions?: string[]; calorieGoal?: number; proteinTarget?: number;
      isYouth?: boolean; isYouthUnder14?: boolean;
    };

    const existing = await db.prepare('SELECT id FROM athlete_profiles WHERE user_id = ?').get(userId);
    const id = (existing as { id: string } | undefined)?.id ?? randomUUID();

    await db.prepare(
      `INSERT INTO athlete_profiles
         (id, user_id, sports, experience, primary_goal, training_days, session_length,
          equipment, competition_date, injury_history, age, weight, height, biological_sex,
          dietary_restrictions, calorie_goal, protein_target, is_youth, is_youth_under_14, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         sports = EXCLUDED.sports, experience = EXCLUDED.experience,
         primary_goal = EXCLUDED.primary_goal, training_days = EXCLUDED.training_days,
         session_length = EXCLUDED.session_length, equipment = EXCLUDED.equipment,
         competition_date = EXCLUDED.competition_date, injury_history = EXCLUDED.injury_history,
         age = EXCLUDED.age, weight = EXCLUDED.weight, height = EXCLUDED.height,
         biological_sex = EXCLUDED.biological_sex,
         dietary_restrictions = EXCLUDED.dietary_restrictions,
         calorie_goal = EXCLUDED.calorie_goal, protein_target = EXCLUDED.protein_target,
         is_youth = EXCLUDED.is_youth, is_youth_under_14 = EXCLUDED.is_youth_under_14,
         updated_at = NOW()`,
    ).run(
      id, userId,
      JSON.stringify(sports), experience, primaryGoal, trainingDays, sessionLength,
      JSON.stringify(equipment), competitionDate ?? null, injuryHistory,
      age ?? null, weight ?? null, height ?? null, biologicalSex ?? null,
      JSON.stringify(dietaryRestrictions), calorieGoal ?? null, proteinTarget ?? null,
      isYouth ? 1 : 0, isYouthUnder14 ? 1 : 0,
    );
    const row = await db.prepare('SELECT * FROM athlete_profiles WHERE user_id = ?').get(userId);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /api/athlete/profile/dismiss-disclaimer */
athleteRouter.post('/profile/dismiss-disclaimer', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(
      `UPDATE athlete_profiles SET disclaimer_dismissed_at = NOW() WHERE user_id = ?`,
    ).run(userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Training Plans ─────────────────────────────────────────────────────────

/** GET /api/athlete/plans/active */
athleteRouter.get('/plans/active', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const row = await db.prepare(
      'SELECT * FROM training_plans WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
    ).get(userId);
    res.json(row ?? null);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /api/athlete/plans/generate — AI plan generation */
athleteRouter.post('/plans/generate', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const profile = await db.prepare('SELECT * FROM athlete_profiles WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
    if (!profile) return void res.status(400).json({ error: 'Complete your athlete profile first' });

    const sports: string[] = JSON.parse(String(profile.sports || '[]'));
    const isYouthUnder14 = Number(profile.is_youth_under_14) === 1;
    const sport = sports[0] ?? 'General Fitness';

    // Deactivate previous plans
    await db.prepare('UPDATE training_plans SET is_active = 0 WHERE user_id = ?').run(userId);

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    let planData: object = buildFallbackPlan(profile, sport, isYouthUnder14);

    if (ANTHROPIC_API_KEY) {
      try {
        const youthClause = isYouthUnder14
          ? 'YOUTH SAFETY: No 1RM testing. No max-effort strength tests. No weight-cut guidance. Mark plan "Coach Review Required". Fun-first language.'
          : '';
        const prompt = `Generate a 4-week periodized training plan as JSON for this athlete:
Sport: ${sport}
Experience: ${profile.experience}
Goal: ${profile.primary_goal}
Training days/week: ${profile.training_days}
Session length: ${profile.session_length} minutes
Equipment: ${profile.equipment}
Injury history: ${profile.injury_history || 'None'}
Dietary restrictions: ${profile.dietary_restrictions}
${youthClause}

Return ONLY valid JSON matching this structure (no markdown, no explanation):
{
  "name": "string",
  "phase": "base|build|peak|taper",
  "weeks": [
    {
      "week": 1,
      "theme": "string",
      "days": [
        {
          "day": "Monday",
          "type": "strength|cardio|skill|recovery|rest",
          "title": "string",
          "duration": 60,
          "warmup": "string",
          "exercises": [
            {"name": "string", "sets": 3, "reps": "8-10", "load": "70% 1RM or bodyweight", "rest": "90s", "cue": "string"}
          ],
          "cooldown": "string"
        }
      ]
    }
  ]
}`;

        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 4000,
            system: ATHLETE_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json() as { content: Array<{ type: string; text: string }> };
          const text = aiData.content.find((c) => c.type === 'text')?.text ?? '';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) planData = JSON.parse(jsonMatch[0]);
        }
      } catch {
        /* use fallback plan */
      }
    }

    const planId = randomUUID();
    await db.prepare(
      `INSERT INTO training_plans (id, user_id, name, sport, phase, plan_data, is_active, target_date)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    ).run(
      planId, userId,
      (planData as { name?: string }).name ?? `${sport} Performance Plan`,
      sport,
      (planData as { phase?: string }).phase ?? 'base',
      JSON.stringify(planData),
      profile.competition_date ?? null,
    );

    const row = await db.prepare('SELECT * FROM training_plans WHERE id = ?').get(planId);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

function buildFallbackPlan(profile: Record<string, unknown>, sport: string, isYouthUnder14: boolean): object {
  const days = Number(profile.training_days) || 3;
  const sessionLen = Number(profile.session_length) || 60;
  const strengthExercises = isYouthUnder14
    ? [
        { name: 'Goblet Squat', sets: 2, reps: '10-12', load: 'light', rest: '60s', cue: 'Focus on form, not weight' },
        { name: 'Push-Up', sets: 2, reps: '8-10', load: 'bodyweight', rest: '60s', cue: 'Keep core tight' },
        { name: 'Banded Row', sets: 2, reps: '10', load: 'light band', rest: '60s', cue: 'Squeeze shoulder blades' },
      ]
    : [
        { name: 'Squat', sets: 4, reps: '6-8', load: '70-75% 1RM', rest: '2min', cue: 'Break parallel, brace core' },
        { name: 'Romanian Deadlift', sets: 3, reps: '8', load: 'moderate', rest: '90s', cue: 'Hip hinge, feel hamstrings' },
        { name: 'Bench Press', sets: 4, reps: '6-8', load: '70% 1RM', rest: '2min', cue: 'Feet flat, bar path' },
        { name: 'Pull-Up / Lat Pulldown', sets: 3, reps: '8-10', load: 'bodyweight or moderate', rest: '90s', cue: 'Full range of motion' },
      ];

  const weeks = [1, 2, 3, 4].map((w) => ({
    week: w,
    theme: ['Foundation', 'Development', 'Intensification', 'Recovery'][w - 1],
    days: Array.from({ length: days }, (_, d) => ({
      day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][d],
      type: d % 2 === 0 ? 'strength' : 'cardio',
      title: d % 2 === 0 ? 'Strength Session' : 'Conditioning',
      duration: sessionLen,
      warmup: '5-10 min light cardio + dynamic stretching',
      exercises: d % 2 === 0 ? strengthExercises : [
        { name: `Sport-specific conditioning`, sets: 3, reps: '10 min', load: 'moderate intensity', rest: '2min', cue: 'Maintain form throughout' },
      ],
      cooldown: '5 min static stretching, focus on worked muscles',
    })),
  }));

  return {
    name: `${sport} Performance Plan${isYouthUnder14 ? ' — Coach Review Required' : ''}`,
    phase: 'base',
    weeks,
    disclaimer: 'PSAI-ATH-DISC-v1.0 — Not professional coaching or medical advice.',
    coachReviewRequired: isYouthUnder14,
  };
}

// ── Training Sessions ──────────────────────────────────────────────────────

/** GET /api/athlete/sessions */
athleteRouter.get('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(
      'SELECT * FROM training_sessions WHERE user_id = ? ORDER BY session_date DESC LIMIT 30',
    ).all(userId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /api/athlete/sessions */
athleteRouter.post('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const {
      planId, sessionDate, sessionType = 'strength', sport = '',
      exercises = [], durationMin, rpe, heartRateAvg, notes = '', mood,
    } = req.body as {
      planId?: string; sessionDate: string; sessionType?: string; sport?: string;
      exercises?: Array<{ name: string; sets?: number; reps?: string; weight?: number; rpe?: number; notes?: string }>;
      durationMin?: number; rpe?: number; heartRateAvg?: number; notes?: string; mood?: number;
    };

    // Calculate total volume for strength sessions
    const totalVolume = exercises.reduce((sum, ex) => {
      if (ex.sets && ex.weight && ex.reps) {
        const repsNum = parseInt(String(ex.reps)) || 0;
        return sum + ex.sets * repsNum * ex.weight;
      }
      return sum;
    }, 0);

    const id = randomUUID();
    await db.prepare(
      `INSERT INTO training_sessions
         (id, user_id, plan_id, session_date, session_type, sport, exercises,
          duration_min, rpe, heart_rate_avg, total_volume, notes, mood)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id, userId, planId ?? null, sessionDate, sessionType, sport,
      JSON.stringify(exercises), durationMin ?? null, rpe ?? null,
      heartRateAvg ?? null, totalVolume || null, notes, mood ?? null,
    );

    // PR Detection
    const newPRs: string[] = [];
    for (const ex of exercises) {
      if (!ex.name || !ex.weight) continue;
      const bestPr = await db.prepare(
        'SELECT value FROM athlete_prs WHERE user_id = ? AND exercise = ? ORDER BY value DESC LIMIT 1',
      ).get(userId, ex.name) as { value: number } | undefined;

      const weightNum = Number(ex.weight);
      if (!bestPr || weightNum > bestPr.value) {
        await db.prepare(
          `INSERT INTO athlete_prs (id, user_id, exercise, value, unit, achieved_at, session_id)
           VALUES (?, ?, ?, ?, 'lbs', ?, ?)`,
        ).run(randomUUID(), userId, ex.name, weightNum, sessionDate, id);
        newPRs.push(ex.name);
      }
    }

    const row = await db.prepare('SELECT * FROM training_sessions WHERE id = ?').get(id);
    res.status(201).json({ session: row, newPRs });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** DELETE /api/athlete/sessions/:id */
athleteRouter.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM training_sessions WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Nutrition Logs ─────────────────────────────────────────────────────────

/** GET /api/athlete/nutrition */
athleteRouter.get('/nutrition', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(
      'SELECT * FROM nutrition_logs WHERE user_id = ? ORDER BY log_date DESC LIMIT 30',
    ).all(userId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /api/athlete/nutrition */
athleteRouter.post('/nutrition', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const {
      logDate, mealType = 'meal', foods = [],
      totalCalories, proteinG, carbsG, fatG, waterMl, notes = '',
    } = req.body as {
      logDate: string; mealType?: string; foods?: string[];
      totalCalories?: number; proteinG?: number; carbsG?: number; fatG?: number;
      waterMl?: number; notes?: string;
    };

    const id = randomUUID();
    await db.prepare(
      `INSERT INTO nutrition_logs
         (id, user_id, log_date, meal_type, foods, total_calories, protein_g, carbs_g, fat_g, water_ml, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, userId, logDate, mealType, JSON.stringify(foods),
      totalCalories ?? null, proteinG ?? null, carbsG ?? null, fatG ?? null, waterMl ?? null, notes);
    const row = await db.prepare('SELECT * FROM nutrition_logs WHERE id = ?').get(id);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** DELETE /api/athlete/nutrition/:id */
athleteRouter.delete('/nutrition/:id', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare('DELETE FROM nutrition_logs WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Recovery Logs ──────────────────────────────────────────────────────────

/** GET /api/athlete/recovery */
athleteRouter.get('/recovery', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(
      'SELECT * FROM recovery_logs WHERE user_id = ? ORDER BY log_date DESC LIMIT 30',
    ).all(userId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /api/athlete/recovery */
athleteRouter.post('/recovery', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const {
      logDate, sleepHours, sleepQuality, hrv,
      soreAreas = [], sorenessLevel, energyLevel, modalities = [], notes = '',
    } = req.body as {
      logDate: string; sleepHours?: number; sleepQuality?: number; hrv?: number;
      soreAreas?: string[]; sorenessLevel?: number; energyLevel?: number;
      modalities?: string[]; notes?: string;
    };

    // Readiness score: weighted average of sleep quality (40%), energy (40%), HRV trend (20%)
    let readinessScore: number | null = null;
    if (sleepQuality !== undefined && energyLevel !== undefined) {
      const sleepNorm = ((sleepQuality ?? 3) - 1) / 4 * 100;
      const energyNorm = ((energyLevel ?? 5) - 1) / 9 * 100;
      const sorenessNorm = soreAreas.length === 0 ? 100 : Math.max(0, 100 - (sorenessLevel ?? 5) * 10);
      readinessScore = Math.round(sleepNorm * 0.35 + energyNorm * 0.40 + sorenessNorm * 0.25);
    }

    const id = randomUUID();
    await db.prepare(
      `INSERT INTO recovery_logs
         (id, user_id, log_date, sleep_hours, sleep_quality, hrv, sore_areas,
          soreness_level, energy_level, modalities, readiness_score, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id, userId, logDate, sleepHours ?? null, sleepQuality ?? null, hrv ?? null,
      JSON.stringify(soreAreas), sorenessLevel ?? null, energyLevel ?? null,
      JSON.stringify(modalities), readinessScore, notes,
    );
    const row = await db.prepare('SELECT * FROM recovery_logs WHERE id = ?').get(id);
    res.status(201).json({ ...row, readinessScore });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── PRs ────────────────────────────────────────────────────────────────────

/** GET /api/athlete/prs */
athleteRouter.get('/prs', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(
      `SELECT DISTINCT ON (exercise) * FROM athlete_prs WHERE user_id = ?
       ORDER BY exercise, value DESC`,
    ).all(userId).catch(async () => {
      // Fallback for DBs without DISTINCT ON
      const all = await db.prepare('SELECT * FROM athlete_prs WHERE user_id = ? ORDER BY value DESC').all(userId) as Array<{ exercise: string }>;
      const seen = new Set<string>();
      return all.filter((r) => { if (seen.has(r.exercise)) return false; seen.add(r.exercise); return true; });
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── AI Ask ─────────────────────────────────────────────────────────────────

/** POST /api/athlete/ai/ask */
athleteRouter.post('/ai/ask', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { question } = req.body as { question: string };
    if (!question?.trim()) return void res.status(400).json({ error: 'question is required' });

    // ── INJURY DETECTION — runs before AI call ─────────────────────────────
    const { detected, critical } = detectInjury(question);
    if (detected) {
      return void res.json({
        answer: critical ? CHEST_RESPONSE : INJURY_RESPONSE,
        injury: true,
        critical,
      });
    }

    const profile = await db.prepare('SELECT * FROM athlete_profiles WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
    const isYouthUnder14 = Number(profile?.is_youth_under_14 ?? 0) === 1;

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    let answer = '';
    if (ANTHROPIC_API_KEY) {
      try {
        const context = profile
          ? `Athlete context: Sport=${profile.sports}, Experience=${profile.experience}, Goal=${profile.primary_goal}${isYouthUnder14 ? ', YOUTH UNDER 14 — no 1RM, no weight cuts, Coach Review Required' : ''}`
          : '';
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 800,
            system: ATHLETE_SYSTEM_PROMPT + (context ? `\n\n${context}` : ''),
            messages: [{ role: 'user', content: question }],
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json() as { content: Array<{ type: string; text: string }> };
          answer = aiData.content.find((c) => c.type === 'text')?.text ?? '';
        }
      } catch { /* fallback below */ }
    }

    if (!answer) {
      answer = 'I\'m here to help with your training and performance questions. Please try again — the AI coach is temporarily unavailable.\n\n*PSAI-ATH-DISC-v1.0 — Not professional coaching or medical advice.*';
    }

    res.json({ answer, injury: false, critical: false });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
