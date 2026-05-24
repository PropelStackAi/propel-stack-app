/**
 * Enhancement 42 — Life Score Social & Accountability Circles
 * Propel Stack AI, LLC
 *
 * PRIVACY RULE: NEVER expose raw Life Score sub-scores to circle members.
 * Only the composite trend direction (up/down/flat) is shared.
 * Plan gate: Solo=1 circle, Family=3, Network=10, Elite=unlimited
 */

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';

export const circlesRouter = Router();
const ai = new Anthropic();

const PLAN_LIMITS: Record<string, number> = {
  spark: 1, solo: 1, family: 3, network: 10, elite: 999,
};

async function getUserPlanLimit(userId: string): Promise<number> {
  const row = await db.prepare('SELECT plan_tier FROM users WHERE id = $1').get(userId) as any;
  const tier = (row?.plan_tier ?? 'solo').toLowerCase();
  return PLAN_LIMITS[tier] ?? 1;
}

async function isCircleMember(circleId: string, userId: string): Promise<boolean> {
  const row = await db.prepare('SELECT id FROM circle_members WHERE circle_id = $1 AND user_id = $2').get(circleId, userId);
  return !!row;
}

// POST /api/circles — create circle
circlesRouter.post('/', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const limit = await getUserPlanLimit(userId);
    const countRow = await db.prepare(`
      SELECT COUNT(*) AS cnt FROM circle_members cm
      JOIN circles c ON c.id = cm.circle_id
      WHERE cm.user_id = $1 AND cm.role = 'admin'
    `).get(userId) as any;
    if (Number(countRow?.cnt ?? 0) >= limit) {
      return res.status(403).json({ error: `plan_limit`, message: `Your plan allows a maximum of ${limit} circle(s). Upgrade to create more.` });
    }

    const { name } = req.body as { name: string };
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });

    const circleId = randomUUID();
    const inviteCode = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();

    await db.prepare(`
      INSERT INTO circles (id, name, created_by, invite_code)
      VALUES ($1, $2, $3, $4)
    `).run(circleId, name.trim(), userId, inviteCode);

    await db.prepare(`
      INSERT INTO circle_members (id, circle_id, user_id, role)
      VALUES ($1, $2, $3, 'admin')
    `).run(randomUUID(), circleId, userId);

    res.status(201).json({
      id: circleId,
      name: name.trim(),
      invite_code: inviteCode,
      invite_link: `https://propelstackai.com/join/${inviteCode}`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create circle' });
  }
});

// POST /api/circles/join/:code — join via invite code
circlesRouter.post('/join/:code', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const code = req.params.code.toUpperCase();

    const circle = await db.prepare('SELECT * FROM circles WHERE invite_code = $1').get(code) as any;
    if (!circle) return res.status(404).json({ error: 'Invalid invite code' });

    const memberCount = await db.prepare('SELECT COUNT(*) AS cnt FROM circle_members WHERE circle_id = $1').get(circle.id) as any;
    if (Number(memberCount?.cnt ?? 0) >= circle.max_members) {
      return res.status(403).json({ error: 'Circle is full (max 8 members)' });
    }

    const existing = await db.prepare('SELECT id FROM circle_members WHERE circle_id = $1 AND user_id = $2').get(circle.id, userId);
    if (existing) return res.json({ message: 'Already a member', circle_id: circle.id });

    await db.prepare(`
      INSERT INTO circle_members (id, circle_id, user_id, role)
      VALUES ($1, $2, $3, 'member')
    `).run(randomUUID(), circle.id, userId);

    res.json({ joined: true, circle_id: circle.id, circle_name: circle.name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join circle' });
  }
});

// GET /api/circles — list circles for user
circlesRouter.get('/', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const circles = await db.prepare(`
      SELECT c.id, c.name, c.invite_code, cm.role,
        (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) AS member_count
      FROM circles c
      JOIN circle_members cm ON cm.circle_id = c.id
      WHERE cm.user_id = $1
      ORDER BY c.created_at DESC
    `).all(userId);
    res.json(circles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch circles' });
  }
});

// GET /api/circles/:id/leaderboard — streak leaderboard (rank by current streak)
circlesRouter.get('/:id/leaderboard', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!(await isCircleMember(req.params.id, userId))) return res.status(403).json({ error: 'Not a member' });

    const members = await db.prepare(`
      SELECT cm.user_id, cm.share_streaks,
        u.display_name,
        COALESCE(s.current_len, 0) AS top_streak_days,
        COALESCE(s.streak_type, 'daily_login') AS streak_type
      FROM circle_members cm
      JOIN users u ON u.id = cm.user_id
      LEFT JOIN LATERAL (
        SELECT streak_type, current_len FROM streaks WHERE user_id = cm.user_id ORDER BY current_len DESC LIMIT 1
      ) s ON TRUE
      WHERE cm.circle_id = $1
      ORDER BY top_streak_days DESC
    `).all(req.params.id) as any[];

    // Mask names for non-sharing members
    const board = members.map((m, i) => ({
      rank: i + 1,
      display_name: m.display_name,
      top_streak_days: m.share_streaks ? m.top_streak_days : null,
      streak_type: m.share_streaks ? m.streak_type : null,
      is_self: m.user_id === userId,
    }));

    res.json(board);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/circles/:id/feed — weekly circle feed
circlesRouter.get('/:id/feed', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!(await isCircleMember(req.params.id, userId))) return res.status(403).json({ error: 'Not a member' });

    // Get or generate this week's feed
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    const weekKey = weekStart.toISOString().split('T')[0];

    let feed = await db.prepare('SELECT * FROM weekly_circle_feed WHERE circle_id = $1 AND week_start = $2').get(req.params.id, weekKey) as any;

    if (!feed) {
      // Aggregate member highlights
      const members = await db.prepare(`
        SELECT cm.user_id, cm.share_life_score, cm.share_streaks, cm.share_goal_names, u.display_name
        FROM circle_members cm JOIN users u ON u.id = cm.user_id WHERE cm.circle_id = $1
      `).all(req.params.id) as any[];

      const highlights: string[] = [];
      for (const m of members) {
        if (m.share_streaks) {
          const s = await db.prepare('SELECT streak_type, current_len FROM streaks WHERE user_id = $1 ORDER BY current_len DESC LIMIT 1').get(m.user_id) as any;
          if (s?.current_len > 0) highlights.push(`${m.display_name}: ${s.current_len}-day ${s.streak_type} streak`);
        }
      }

      const prompt = `You are an encouraging life coach. Write a 2-sentence motivational message for an accountability circle with these member highlights this week:\n${highlights.join('\n') || 'Members are building their habits.'}\nBe warm, specific, and energizing.`;

      let encouragement = 'Great work this week, everyone! Keep supporting each other — every day counts.';
      try {
        const completion = await ai.messages.create({
          model: 'claude-haiku-4-5', max_tokens: 100,
          messages: [{ role: 'user', content: prompt }],
        });
        encouragement = (completion.content[0] as any).text || encouragement;
      } catch { /* use default */ }

      const feedId = randomUUID();
      await db.prepare(`
        INSERT INTO weekly_circle_feed (id, circle_id, week_start, encouragement_message, feed_data)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (circle_id, week_start) DO NOTHING
      `).run(feedId, req.params.id, weekKey, encouragement, JSON.stringify({ highlights }));

      feed = { encouragement_message: encouragement, feed_data: { highlights }, week_start: weekKey };
    }

    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get circle feed' });
  }
});

// POST /api/circles/:id/nudge — send a nudge to a member
circlesRouter.post('/:id/nudge', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!(await isCircleMember(req.params.id, userId))) return res.status(403).json({ error: 'Not a member' });

    const { to_user_id, message = 'Cheering you on! 🎉' } = req.body as { to_user_id: string; message?: string };
    if (!to_user_id) return res.status(400).json({ error: 'to_user_id required' });

    const nudgeId = randomUUID();
    await db.prepare(`
      INSERT INTO circle_nudges (id, circle_id, from_user_id, to_user_id, message)
      VALUES ($1,$2,$3,$4,$5)
    `).run(nudgeId, req.params.id, userId, to_user_id, message.slice(0, 200));

    res.json({ nudged: true, id: nudgeId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send nudge' });
  }
});

// GET /api/circles/:id/nudges — get nudges received
circlesRouter.get('/:id/nudges', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!(await isCircleMember(req.params.id, userId))) return res.status(403).json({ error: 'Not a member' });

    const nudges = await db.prepare(`
      SELECT n.*, u.display_name AS from_name
      FROM circle_nudges n JOIN users u ON u.id = n.from_user_id
      WHERE n.circle_id = $1 AND n.to_user_id = $2
      ORDER BY n.created_at DESC LIMIT 20
    `).all(req.params.id, userId);

    res.json(nudges);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch nudges' });
  }
});

// POST /api/circles/:id/challenge — create group challenge (Family+)
circlesRouter.post('/:id/challenge', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const member = await db.prepare('SELECT role FROM circle_members WHERE circle_id = $1 AND user_id = $2').get(req.params.id, userId) as any;
    if (!member) return res.status(403).json({ error: 'Not a member' });
    if (member.role !== 'admin') return res.status(403).json({ error: 'Only circle admin can create challenges' });

    const { title, description, challenge_type = 'streak', target_value = 7, start_date, end_date } = req.body as {
      title: string; description?: string; challenge_type?: string;
      target_value?: number; start_date: string; end_date: string;
    };
    if (!title || !start_date || !end_date) return res.status(400).json({ error: 'title, start_date, end_date required' });

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO circle_challenges (id, circle_id, title, description, challenge_type, target_value, start_date, end_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `).run(id, req.params.id, title, description ?? null, challenge_type, target_value, start_date, end_date);

    res.status(201).json({ id, title });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// GET /api/circles/:id/members — list members
circlesRouter.get('/:id/members', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!(await isCircleMember(req.params.id, userId))) return res.status(403).json({ error: 'Not a member' });

    const members = await db.prepare(`
      SELECT cm.user_id, cm.role, cm.share_life_score, cm.share_streaks, cm.share_goal_names, cm.joined_at,
        u.display_name
      FROM circle_members cm JOIN users u ON u.id = cm.user_id
      WHERE cm.circle_id = $1 ORDER BY cm.joined_at
    `).all(req.params.id);

    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// PUT /api/circles/:id/privacy — update own sharing preferences
circlesRouter.put('/:id/privacy', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { share_life_score, share_streaks, share_goal_names } = req.body as {
      share_life_score?: boolean; share_streaks?: boolean; share_goal_names?: boolean;
    };
    await db.prepare(`
      UPDATE circle_members SET share_life_score = COALESCE($1, share_life_score),
        share_streaks = COALESCE($2, share_streaks), share_goal_names = COALESCE($3, share_goal_names)
      WHERE circle_id = $4 AND user_id = $5
    `).run(share_life_score ?? null, share_streaks ?? null, share_goal_names ?? null, req.params.id, userId);
    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update privacy' });
  }
});
