/**
 * Enhancement 45 — Smart Calendar Intelligence
 * Propel Stack AI, LLC
 *
 * OAuth stubs for Google Calendar and Outlook.
 * (Actual OAuth requires GOOGLE_CLIENT_ID + OUTLOOK_CLIENT_ID env vars set by founder.)
 * Schedule analysis, goal-conflict detection, smart block suggestions, NLP scheduling.
 */

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { db, getCurrentUserId } from '../db.js';
import { scrubPII } from '../middleware/piiScrubber.js';
import { randomUUID } from 'node:crypto';

export const calendarHubRouter = Router();
const ai = new Anthropic();

// POST /api/calendar/connect/:provider — OAuth connect stub
calendarHubRouter.post('/connect/:provider', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const provider = req.params.provider.toLowerCase();

    if (!['google', 'outlook'].includes(provider)) {
      return res.status(400).json({ error: 'Supported providers: google, outlook' });
    }

    const { access_token, refresh_token, calendar_id } = req.body as {
      access_token?: string; refresh_token?: string; calendar_id?: string;
    };

    if (!access_token) {
      // Return OAuth URL for the provider — founder must set env vars
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID ?? 'GOOGLE_CLIENT_ID_NOT_SET'}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI ?? 'https://propel-stack-app.vercel.app/api/calendar/callback/google'}&scope=https://www.googleapis.com/auth/calendar.readonly&response_type=code&access_type=offline`;
      const outlookAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.OUTLOOK_CLIENT_ID ?? 'OUTLOOK_CLIENT_ID_NOT_SET'}&response_type=code&redirect_uri=${process.env.OUTLOOK_REDIRECT_URI ?? 'https://propel-stack-app.vercel.app/api/calendar/callback/outlook'}&scope=Calendars.ReadWrite`;

      return res.json({
        oauth_required: true,
        provider,
        auth_url: provider === 'google' ? googleAuthUrl : outlookAuthUrl,
        message: `Visit the auth_url to connect your ${provider === 'google' ? 'Google Calendar' : 'Outlook'} account.`,
      });
    }

    // Store token (encrypted in production via Enhancement 41 encryption)
    const existing = await db.prepare('SELECT id FROM calendar_connections WHERE user_id = $1 AND provider = $2').get(userId, provider);
    if (existing) {
      await db.prepare(`
        UPDATE calendar_connections SET access_token=$1, refresh_token=$2, calendar_id=$3, last_synced=NULL WHERE user_id=$4 AND provider=$5
      `).run(access_token, refresh_token ?? null, calendar_id ?? 'primary', userId, provider);
    } else {
      await db.prepare(`
        INSERT INTO calendar_connections (id, user_id, provider, access_token, refresh_token, calendar_id)
        VALUES ($1,$2,$3,$4,$5,$6)
      `).run(randomUUID(), userId, provider, access_token, refresh_token ?? null, calendar_id ?? 'primary');
    }

    res.json({ connected: true, provider });
  } catch (err) {
    res.status(500).json({ error: 'Failed to connect calendar' });
  }
});

// POST /api/calendar/sync — sync events from connected calendar
calendarHubRouter.post('/sync', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const connections = await db.prepare('SELECT * FROM calendar_connections WHERE user_id = $1').all(userId) as any[];

    if (connections.length === 0) {
      return res.json({ message: 'No calendar connected. Use POST /api/calendar/connect/google or /api/calendar/connect/outlook.', synced: 0 });
    }

    // In production: call Google/Outlook APIs with stored tokens.
    // For MVP with no live token: return guidance.
    res.json({
      message: 'Calendar sync requires live OAuth tokens. Connect via the Calendar Hub page to enable automatic sync.',
      connected_providers: connections.map(c => c.provider),
      synced: 0,
      last_synced: connections[0]?.last_synced ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync calendar' });
  }
});

// GET /api/calendar/events — fetch this week's events
calendarHubRouter.get('/events', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const events = await db.prepare(`
      SELECT * FROM calendar_events WHERE user_id = $1
        AND start_time >= NOW() - INTERVAL '1 day'
        AND start_time <= NOW() + INTERVAL '14 days'
      ORDER BY start_time ASC LIMIT 50
    `).all(userId);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/calendar/events — manually add an event (for testing / NLP blocks)
calendarHubRouter.post('/events', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { title, start_time, end_time, meeting_type = 'meeting', is_all_day = false } = req.body as {
      title: string; start_time: string; end_time: string; meeting_type?: string; is_all_day?: boolean;
    };
    if (!title || !start_time || !end_time) return res.status(400).json({ error: 'title, start_time, end_time required' });

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO calendar_events (id, user_id, title, start_time, end_time, meeting_type, is_all_day)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `).run(id, userId, title, start_time, end_time, meeting_type, is_all_day);

    res.status(201).json({ id, title });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add event' });
  }
});

// GET /api/calendar/analysis — current week schedule analysis
calendarHubRouter.get('/analysis', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().split('T')[0];

    // Check for cached analysis this week
    const cached = await db.prepare('SELECT * FROM schedule_analysis WHERE user_id = $1 AND week_start = $2').get(userId, weekKey) as any;
    if (cached) return res.json(cached);

    const events = await db.prepare(`
      SELECT title, start_time, end_time, meeting_type FROM calendar_events WHERE user_id = $1
        AND start_time >= $2 AND start_time < $2::date + INTERVAL '7 days'
      ORDER BY start_time
    `).all(userId, weekKey) as any[];

    if (events.length === 0) {
      return res.json({
        week_start: weekKey,
        total_meeting_hours: 0,
        overload_days: [],
        goal_conflicts: [],
        optimization_suggestions: ['Connect your calendar to get schedule analysis.'],
        goal_alignment_score: null,
      });
    }

    // Compute meeting hours
    let totalMeetingHours = 0;
    const dayHours: Record<string, number> = {};
    const overloadDays: string[] = [];

    for (const ev of events) {
      const durationH = (new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 3600000;
      totalMeetingHours += durationH;
      const day = new Date(ev.start_time).toLocaleDateString('en-US', { weekday: 'short' });
      dayHours[day] = (dayHours[day] ?? 0) + durationH;
    }
    Object.entries(dayHours).forEach(([day, hrs]) => { if (hrs >= 6) overloadDays.push(day); });

    // Goal-conflict detection
    const goals = await db.prepare(`
      SELECT title, notes FROM goals WHERE user_id = $1 AND status = 'active' LIMIT 10
    `).all(userId) as any[];

    const goalConflicts: string[] = [];
    for (const g of goals) {
      const title = (g.title ?? '').toLowerCase();
      if ((title.includes('sleep') || title.includes('rest')) && events.some(e => new Date(e.start_time).getHours() >= 21)) {
        goalConflicts.push(`Sleep goal conflicts with late evening events`);
      }
      if (title.includes('workout') || title.includes('gym') || title.includes('exercise')) {
        const hasGymBlock = events.some(e => (e.meeting_type === 'focus' || e.title?.toLowerCase().includes('gym') || e.title?.toLowerCase().includes('workout')));
        if (!hasGymBlock) goalConflicts.push(`No workout blocks scheduled this week (goal: ${g.title})`);
      }
    }

    // Optimization suggestions
    const suggestions: string[] = [];
    if (overloadDays.length > 0) suggestions.push(`${overloadDays.join(', ')} are overloaded (6+ hrs of meetings). Consider moving 1-2 meetings.`);
    if (totalMeetingHours > 30) suggestions.push(`You have ${Math.round(totalMeetingHours)} meeting hours this week — above the healthy 25hr threshold.`);
    suggestions.push('Add a 90-min Deep Work block on your lightest meeting day for focused progress.');

    const goalAlignmentScore = Math.max(0, 100 - goalConflicts.length * 20 - overloadDays.length * 10);

    const analysisId = randomUUID();
    await db.prepare(`
      INSERT INTO schedule_analysis (id, user_id, week_start, total_meeting_hours, overload_days, goal_conflicts, optimization_suggestions, goal_alignment_score)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (user_id, week_start) DO UPDATE SET
        total_meeting_hours=$4, overload_days=$5, goal_conflicts=$6, optimization_suggestions=$7, goal_alignment_score=$8
    `).run(analysisId, userId, weekKey, totalMeetingHours, JSON.stringify(overloadDays), JSON.stringify(goalConflicts), JSON.stringify(suggestions), goalAlignmentScore);

    res.json({ week_start: weekKey, total_meeting_hours: Math.round(totalMeetingHours * 10) / 10, overload_days: overloadDays, goal_conflicts: goalConflicts, optimization_suggestions: suggestions, goal_alignment_score: goalAlignmentScore });
  } catch (err) {
    console.error('[calendar] analysis error', err);
    res.status(500).json({ error: 'Failed to analyze schedule' });
  }
});

// POST /api/calendar/block — add an AI-suggested time block
calendarHubRouter.post('/block', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { title, start_time, end_time, meeting_type = 'focus' } = req.body as {
      title: string; start_time: string; end_time: string; meeting_type?: string;
    };
    if (!title || !start_time || !end_time) return res.status(400).json({ error: 'title, start_time, end_time required' });

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO calendar_events (id, user_id, title, start_time, end_time, meeting_type)
      VALUES ($1,$2,$3,$4,$5,$6)
    `).run(id, userId, title, start_time, end_time, meeting_type);

    res.status(201).json({ added: true, id, title, meeting_type });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add block' });
  }
});

// POST /api/calendar/nlp-schedule — natural language scheduling
calendarHubRouter.post('/nlp-schedule', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { request } = req.body as { request: string };
    if (!request) return res.status(400).json({ error: 'request required' });

    // Get next 7 days of events for context
    const events = await db.prepare(`
      SELECT title, start_time, end_time FROM calendar_events WHERE user_id = $1
        AND start_time >= NOW() AND start_time <= NOW() + INTERVAL '7 days'
      ORDER BY start_time LIMIT 20
    `).all(userId) as any[];

    const prompt = scrubPII(`You are a smart calendar assistant. The user wants to schedule: "${request}"

Current calendar (next 7 days):
${events.length > 0 ? events.map(e => `- ${e.title}: ${new Date(e.start_time).toLocaleString()} to ${new Date(e.end_time).toLocaleString()}`).join('\n') : 'Calendar is empty.'}

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.

Respond with:
1. A suggested time slot (specific day + time)
2. Duration recommendation
3. A one-line confirmation: "I'll schedule [event name] on [day] at [time] for [duration]."

Keep it concise. Do not invent events not shown.`);

    const completion = await ai.messages.create({
      model: 'claude-haiku-4-5', max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const suggestion = (completion.content[0] as any).text || '';

    res.json({
      request,
      suggestion,
      note: 'Review the suggestion and use POST /api/calendar/block to confirm adding it to your calendar.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process scheduling request' });
  }
});

// GET /api/calendar/connections — list connected calendars
calendarHubRouter.get('/connections', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const conns = await db.prepare(`
      SELECT provider, calendar_id, last_synced FROM calendar_connections WHERE user_id = $1
    `).all(userId);
    res.json(conns);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});
