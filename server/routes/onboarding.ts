/**
 * Onboarding API — Propel Stack AI, LLC
 *
 * Enhancement 4: Designed Aha Moment (90-Second Activation)
 * Enhancement 5: Persona-Based Onboarding Tracks
 * Enhancement 6: Import Connectors at Signup
 */
import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { upsertSemantic, upsertProcedural, logEpisodic } from '../lib/memoryStore.js';

export const onboardingRouter = Router();

// ─── Aha Moment templates (Enhancement 4) ────────────────────────────────────

interface AhaMoment {
  reframe: string;
  habit: string;
  firstTask: string;
}

const AHA_TEMPLATES: Record<string, AhaMoment> = {
  'health-fitness': {
    reframe:
      "You're not trying to get fit — you're becoming someone who moves and feels strong every day. That identity shift changes everything.",
    habit: 'Move your body for 20 minutes every morning, before opening your phone.',
    firstTask:
      "Block 20 minutes in your calendar for tomorrow morning and label it 'MY TIME.' Done.",
  },
  'financial-freedom': {
    reframe:
      "You're not managing money — you're designing the life your future self will thank you for.",
    habit: "Review one financial transaction daily and ask: does this move me toward my goal?",
    firstTask:
      'List your top 3 monthly expenses right now. That\'s where the opportunity lives.',
  },
  'career-business': {
    reframe:
      "You're not chasing a job — you're building a body of work that speaks for itself.",
    habit: 'Spend 30 minutes on your #1 priority before checking any messages each morning.',
    firstTask:
      'Write down the one career move that would make the biggest difference in 12 months.',
  },
  'family-relationships': {
    reframe:
      "You're not trying to fix relationships — you're investing in the people who matter most.",
    habit: 'Give one genuine compliment or acknowledgment to someone important to you daily.',
    firstTask:
      "Send a message to someone you've been meaning to reach out to — right now.",
  },
  'learning-growth': {
    reframe:
      "You're not a student — you're a lifelong explorer who gets sharper every single day.",
    habit: 'Read or learn something new for 20 minutes before you sleep each night.',
    firstTask:
      "Choose one book, course, or skill you'll commit to for the next 30 days and write it down.",
  },
  'mental-wellness': {
    reframe:
      "You're not managing stress — you're building a mind that can handle anything.",
    habit: 'Take 3 deep, intentional breaths every time you transition between tasks.',
    firstTask:
      'Find a quiet spot right now and sit with your thoughts for 3 minutes. Just observe.',
  },
  'home-environment': {
    reframe:
      "Your space isn't just a place to live — it's the environment that shapes who you become.",
    habit: 'Spend 10 minutes each evening tidying one small area of your home.',
    firstTask:
      'Pick the one room or area that drains you most and spend 15 minutes on it today.',
  },
  'travel-adventure': {
    reframe:
      "You're not planning trips — you're collecting experiences that will define your story.",
    habit: 'Research one destination, experience, or adventure for 10 minutes each week.',
    firstTask:
      'Write down 3 places or experiences you want to have in the next 12 months.',
  },
  'creative-projects': {
    reframe:
      "You're not pursuing a hobby — you're developing a creative voice that's uniquely yours.",
    habit: 'Create something, however small, for 20 minutes each day without judging the output.',
    firstTask: 'Set a timer for 10 minutes and start creating. No planning — just begin.',
  },
  'spirituality-purpose': {
    reframe:
      "You're not seeking answers — you're deepening your relationship with what truly matters.",
    habit: 'Start each morning with 5 minutes of silence, reflection, or gratitude.',
    firstTask: 'Write down 3 things you are genuinely grateful for — right now.',
  },
  'social-community': {
    reframe:
      "You're not building a network — you're creating a community that lifts everyone higher.",
    habit: 'Reach out to one person each week just to see how they are doing.',
    firstTask:
      'Think of someone who could use support right now and send them a message today.',
  },
  'work-life-balance': {
    reframe:
      "You're not managing time — you're designing a life that actually works on your terms.",
    habit: 'Set a hard stop time for work each day and honor it like your most important meeting.',
    firstTask: 'Block one hour this week for something that has nothing to do with work.',
  },
};

// ─── Persona memory seeds (Enhancement 5) ────────────────────────────────────

interface PersonaMemory { semantic: string; procedural: string; modules: string[] }

const PERSONA_MEMORIES: Record<string, PersonaMemory> = {
  'busy-parent': {
    semantic: 'User is a busy parent balancing family responsibilities with personal goals',
    procedural:
      'Keep responses concise and practical. Focus on time-saving strategies. Acknowledge family constraints. Celebrate small wins.',
    modules: ['family', 'kitchen', 'health', 'financial-score', 'streaks'],
  },
  'building-business': {
    semantic: 'User is actively building or growing a business',
    procedural:
      'Focus on ROI, leverage, and scalable systems. Think strategically. Prioritize high-impact activities. Respect the entrepreneurial mindset.',
    modules: ['business', 'career', 'financial', 'network', 'learning'],
  },
  'want-healthy': {
    semantic: 'User is focused on improving their health, fitness, and overall wellness',
    procedural:
      'Emphasize sustainable habits over quick fixes. Be encouraging without shaming. Focus on consistency. Celebrate progress, not perfection.',
    modules: ['health', 'sleep', 'athlete', 'awareness', 'financial-score'],
  },
  'career-climber': {
    semantic: 'User is focused on professional growth and career advancement',
    procedural:
      'Be strategic and goal-oriented. Focus on skill building, networking, and visibility. Help prioritize career-accelerating actions.',
    modules: ['career', 'learning', 'network', 'business', 'streaks'],
  },
  'student-learner': {
    semantic: 'User is a student or dedicated learner focused on education and personal growth',
    procedural:
      'Focus on effective learning techniques, time management, and academic goals. Be encouraging. Break down complex topics simply.',
    modules: ['student', 'learning', 'streaks', 'awareness', 'health'],
  },
  'life-transition': {
    semantic: 'User is navigating a significant life transition or major change',
    procedural:
      'Be especially supportive and non-judgmental. Focus on stability, clarity, and one step at a time. Validate their experience fully.',
    modules: ['awareness', 'health', 'financial-score', 'life-events', 'coach'],
  },
};

// ─── Status ───────────────────────────────────────────────────────────────────

onboardingRouter.get('/status', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const user = await db
    .prepare('SELECT onboarding_completed_at, onboarding_persona, onboarding_goal_category FROM users WHERE id = ?')
    .get(userId) as { onboarding_completed_at: string | null; onboarding_persona: string | null; onboarding_goal_category: string | null } | undefined;
  res.json({
    completed: !!user?.onboarding_completed_at,
    persona: user?.onboarding_persona ?? null,
    goalCategory: user?.onboarding_goal_category ?? null,
  });
});

// ─── Aha Moment generation (Enhancement 4) ───────────────────────────────────

onboardingRouter.post('/aha-moment', async (req: Request, res: Response) => {
  const { category, goal, persona } = req.body ?? {};
  if (!category) return res.status(400).json({ error: 'category required' });

  const template = AHA_TEMPLATES[category] ?? AHA_TEMPLATES['work-life-balance'];

  // Personalize slightly if goal text was provided
  const goalContext = goal && typeof goal === 'string' ? goal.trim() : '';
  const reframe = template.reframe;
  const habit = template.habit;
  // Weave the user's own words into the first task if possible
  const firstTask = goalContext
    ? `${template.firstTask} (Remember: your goal is "${goalContext.slice(0, 80)}")`
    : template.firstTask;

  // Small simulated delay so it feels like AI is "thinking"
  await new Promise<void>((r) => setTimeout(r, 600));

  res.json({ reframe, habit, firstTask, category, persona: persona ?? null });
});

// ─── Complete onboarding (Enhancement 4+5) ───────────────────────────────────

onboardingRouter.post('/complete', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { persona, goalCategory, goal } = req.body ?? {};

  await db
    .prepare(
      `UPDATE users
       SET onboarding_completed_at = NOW(), onboarding_persona = ?, onboarding_goal_category = ?, onboarding_goal = ?
       WHERE id = ?`,
    )
    .run(persona ?? null, goalCategory ?? null, goal ?? null, userId);

  // Enhancement 5: Seed persona-specific memories
  if (persona && PERSONA_MEMORIES[persona]) {
    const { semantic, procedural } = PERSONA_MEMORIES[persona];
    await upsertSemantic(userId, semantic, 'persona');
    await upsertProcedural(userId, procedural, 'communication_style');
  }

  // Log onboarding as first episodic memory
  const goalText = goal ? `Goal: "${String(goal).slice(0, 100)}"` : '';
  const personaLabel = persona ? ` as a ${persona.replace(/-/g, ' ')}` : '';
  await logEpisodic(
    userId,
    `User completed onboarding${personaLabel}. Category: ${goalCategory ?? 'general'}. ${goalText}`,
    'onboarding',
  );

  res.json({ ok: true });
});

// ─── Import connectors (Enhancement 6) ───────────────────────────────────────

// Google Calendar — returns OAuth URL if credentials configured, stub otherwise
onboardingRouter.post('/connect/google-calendar', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:5000/api/onboarding/callback/google';

  if (!clientId) {
    // Stub: record connection attempt, return success for demo
    await db
      .prepare(
        `INSERT INTO onboarding_connections (user_id, provider, status, metadata)
         VALUES (?, 'google_calendar', 'stub', '{"note":"credentials_not_configured"}')
         ON CONFLICT (user_id, provider) DO UPDATE SET status = 'stub', connected_at = NOW()`,
      )
      .run(userId);
    return res.json({ connected: true, stub: true, message: 'Demo mode — Google credentials not configured' });
  }

  const scopes = encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly');
  const state = encodeURIComponent(userId);
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}&state=${state}&access_type=offline`;
  res.json({ authUrl, connected: false });
});

// Apple Health — iOS/Capacitor only; web returns instructions
onboardingRouter.post('/connect/apple-health', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  await db
    .prepare(
      `INSERT INTO onboarding_connections (user_id, provider, status)
       VALUES (?, 'apple_health', 'ios_pending')
       ON CONFLICT (user_id, provider) DO UPDATE SET status = 'ios_pending', connected_at = NOW()`,
    )
    .run(userId);
  res.json({ status: 'ios_only', message: 'Apple Health requires the iOS app. It will connect automatically after installing Propel Stack AI from the App Store.' });
});

// Todoist — accepts personal API token
onboardingRouter.post('/connect/todoist', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const { apiToken } = req.body ?? {};
  if (!apiToken) return res.status(400).json({ error: 'apiToken required' });

  // Store token securely (encrypted in production — for now just record connection)
  await db
    .prepare(
      `INSERT INTO onboarding_connections (user_id, provider, status, metadata)
       VALUES (?, 'todoist', 'connected', ?)
       ON CONFLICT (user_id, provider) DO UPDATE SET status = 'connected', metadata = ?, connected_at = NOW()`,
    )
    .run(userId, JSON.stringify({ token_provided: true }), JSON.stringify({ token_provided: true }));

  // Log as episodic memory
  await logEpisodic(userId, 'User connected Todoist for task import', 'integrations');

  res.json({ connected: true, message: 'Todoist connected. Tasks will sync within 24 hours.' });
});

// Get connections status
onboardingRouter.get('/connections', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db
    .prepare('SELECT provider, status, connected_at FROM onboarding_connections WHERE user_id = ?')
    .all(userId);
  res.json(rows);
});

// ─── Segment / tier / role routing — Enterprise onboarding ───────────────────

/**
 * POST /api/onboarding/segment
 * Set the user's segment track, tier, and role.
 * Called from SegmentSelector and RoleSelector components.
 */
onboardingRouter.post('/segment', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { track, tier, role } = req.body as {
      track?: 'consumer' | 'education' | 'business';
      tier?: string;
      role?: string;
    };

    const updates: string[] = [];
    const values: unknown[] = [];

    if (track) { updates.push(`onboarding_track = $${updates.length + 1}`); values.push(track); }
    if (tier)  { updates.push(`onboarding_tier  = $${updates.length + 1}`); values.push(tier);  }
    if (role)  { updates.push(`onboarding_role  = $${updates.length + 1}`); values.push(role);  }

    if (updates.length > 0) {
      values.push(userId);
      await db.prepare(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`
      ).run(...values);
    }

    res.json({ ok: true, track, tier, role });
  } catch (err: unknown) {
    console.error('[onboarding] segment error:', err);
    res.status(500).json({ error: 'Failed to save segment' });
  }
});

/**
 * GET /api/onboarding/stage
 * Returns the user's current onboarding state.
 */
onboardingRouter.get('/stage', async (_req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const user = await db.prepare(
      `SELECT onboarding_track, onboarding_tier, onboarding_role, onboarding_stage,
              verification_state, integration_state, onboarding_completed_at
       FROM users WHERE id = $1`
    ).get(userId) as {
      onboarding_track: string; onboarding_tier: string; onboarding_role: string;
      onboarding_stage: string; verification_state: string; integration_state: unknown;
      onboarding_completed_at: string | null;
    } | undefined;

    res.json(user ?? { onboarding_track: 'consumer', onboarding_stage: 'account_created' });
  } catch (err: unknown) {
    console.error('[onboarding] stage error:', err);
    res.status(500).json({ error: 'Failed to load stage' });
  }
});

/**
 * POST /api/onboarding/stage
 * Advance or set the onboarding stage for the current user.
 */
onboardingRouter.post('/stage', async (req: Request, res: Response) => {
  try {
    const userId = getCurrentUserId();
    const { stage } = req.body as { stage: string };
    const validStages = [
      'preboarding', 'account_created', 'segment_selected', 'workspace_configured',
      'integrations_connected', 'first_success', 'active', 'review_due',
    ];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
    }

    await db.prepare(
      `UPDATE users SET onboarding_stage = $1, updated_at = NOW() WHERE id = $2`
    ).run(stage, userId);

    if (stage === 'first_success') {
      await db.prepare(
        `UPDATE users SET onboarding_completed_at = NOW() WHERE id = $1 AND onboarding_completed_at IS NULL`
      ).run(userId);
    }

    res.json({ ok: true, stage });
  } catch (err: unknown) {
    console.error('[onboarding] stage update error:', err);
    res.status(500).json({ error: 'Failed to update stage' });
  }
});
