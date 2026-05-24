// ─── Social & Media Hub Routes ─────────────────────────────────────────────
// Session 14 — Propel Stack AI, LLC

import { Router } from 'express';
import { db, getCurrentUserId } from '../db.js';
import { randomUUID } from 'node:crypto';
import { scrubPII } from '../middleware/piiScrubber.js'; // Enhancement 41

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

async function callAI(systemPrompt: string, userMsg: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: scrubPII(userMsg) }], // Enhancement 41
    }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find((c) => c.type === 'text')?.text ?? '';
}

export const socialRouter = Router();

const BASE = '/api/social';

// ─── Helpers ────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseJSON<T>(s: unknown, fallback: T): T {
  try { return JSON.parse(s as string) as T; } catch { return fallback; }
}

// Default news sources with bias labels
const DEFAULT_NEWS_SOURCES = [
  { source_name: 'AP News', rss_url: 'https://rsshub.app/apnews/topics/apf-topnews', bias_label: 'center' },
  { source_name: 'Reuters', rss_url: 'https://feeds.reuters.com/reuters/topNews', bias_label: 'center' },
  { source_name: 'BBC News', rss_url: 'http://feeds.bbci.co.uk/news/rss.xml', bias_label: 'center' },
  { source_name: 'NPR', rss_url: 'https://feeds.npr.org/1001/rss.xml', bias_label: 'left' },
  { source_name: 'Wall Street Journal', rss_url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', bias_label: 'right' },
];

// Streaming services catalog
const STREAMING_SERVICES = [
  { service: 'Netflix', service_type: 'streaming', deep_link_url: 'https://www.netflix.com' },
  { service: 'Hulu', service_type: 'streaming', deep_link_url: 'https://www.hulu.com' },
  { service: 'Disney+', service_type: 'streaming', deep_link_url: 'https://www.disneyplus.com' },
  { service: 'Prime Video', service_type: 'streaming', deep_link_url: 'https://www.primevideo.com' },
  { service: 'Max', service_type: 'streaming', deep_link_url: 'https://www.max.com' },
  { service: 'Peacock', service_type: 'streaming', deep_link_url: 'https://www.peacocktv.com' },
  { service: 'Paramount+', service_type: 'streaming', deep_link_url: 'https://www.paramountplus.com' },
  { service: 'Apple TV+', service_type: 'streaming', deep_link_url: 'https://tv.apple.com' },
  { service: 'ESPN+', service_type: 'streaming', deep_link_url: 'https://www.espnplus.com' },
  { service: 'Spotify', service_type: 'music', deep_link_url: 'https://open.spotify.com' },
  { service: 'Apple Music', service_type: 'music', deep_link_url: 'https://music.apple.com' },
  { service: 'YouTube Music', service_type: 'music', deep_link_url: 'https://music.youtube.com' },
  { service: 'Spotify Podcasts', service_type: 'podcast', deep_link_url: 'https://open.spotify.com/browse/podcasts' },
  { service: 'Apple Podcasts', service_type: 'podcast', deep_link_url: 'https://podcasts.apple.com' },
  { service: 'Pocket Casts', service_type: 'podcast', deep_link_url: 'https://play.pocketcasts.com' },
];

// ─── Social Connections ──────────────────────────────────────────────────────

// GET /connections
socialRouter.get('/connections', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(
      'SELECT * FROM social_connections WHERE user_id = ? ORDER BY created_at ASC'
    ).all(userId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /connect — simulate OAuth connection (in production: redirect to platform OAuth)
socialRouter.post('/connect', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { platform, display_name, avatar_url } = req.body as {
      platform: string; display_name?: string; avatar_url?: string;
    };
    if (!platform) return res.status(400).json({ error: 'platform required' });

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO social_connections (id, user_id, platform, display_name, avatar_url, is_active)
      VALUES (?, ?, ?, ?, ?, true)
      ON CONFLICT (user_id, platform) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        is_active = true
    `).run(id, userId, platform, display_name ?? platform, avatar_url ?? '');

    const row = await db.prepare(
      'SELECT * FROM social_connections WHERE user_id = ? AND platform = ?'
    ).get(userId, platform);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /disconnect/:id
socialRouter.delete('/disconnect/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(
      'DELETE FROM social_connections WHERE id = ? AND user_id = ?'
    ).run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Unified Feed (simulated) ─────────────────────────────────────────────────

socialRouter.get('/feed', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const connections = await db.prepare(
      'SELECT platform, display_name FROM social_connections WHERE user_id = ? AND is_active = true'
    ).all(userId) as { platform: string; display_name: string }[];

    if (connections.length === 0) {
      return res.json({ items: [], total: 0, hasMore: false });
    }

    // Return simulated feed items for connected platforms
    const now = Date.now();
    const items = connections.flatMap((conn, ci) =>
      [0, 1, 2].map((i) => ({
        id: `${conn.platform}-${ci}-${i}`,
        platform: conn.platform,
        author: conn.display_name,
        content: `Sample post ${i + 1} from ${conn.platform} — connect real OAuth to see live content.`,
        media: null,
        timestamp: new Date(now - (i * 3600000 + ci * 600000)).toISOString(),
        likes: Math.floor(Math.random() * 500),
        comments: Math.floor(Math.random() * 50),
        url: '#',
      }))
    );

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json({ items: items.slice(0, 20), total: items.length, hasMore: items.length > 20 });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Notification Inbox ───────────────────────────────────────────────────────

socialRouter.get('/inbox', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const connections = await db.prepare(
      'SELECT platform, display_name FROM social_connections WHERE user_id = ? AND is_active = true'
    ).all(userId) as { platform: string; display_name: string }[];

    if (connections.length === 0) return res.json([]);

    const now = Date.now();
    const types = ['DM', 'Mention', 'Like', 'Comment'] as const;
    const notifications = connections.flatMap((conn, ci) =>
      [0, 1].map((i) => ({
        id: `notif-${conn.platform}-${ci}-${i}`,
        platform: conn.platform,
        type: types[(ci + i) % types.length],
        sender: `user_${conn.platform}_${i}`,
        preview: `This is a sample notification preview from ${conn.platform}…`,
        timestamp: new Date(now - (i * 7200000 + ci * 900000)).toISOString(),
        read: false,
        deep_link: '#',
      }))
    );
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── AI Daily Digest ──────────────────────────────────────────────────────────

socialRouter.get('/digest', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const date = today();

    // Check cache — regenerate if >6h old
    const existing = await db.prepare(
      'SELECT * FROM social_digests WHERE user_id = ? AND digest_date = ?'
    ).get(userId, date) as { content: string; created_at: string } | undefined;

    if (existing) {
      const ageH = (Date.now() - new Date(existing.created_at).getTime()) / 3600000;
      if (ageH < 6) {
        return res.json({ digest: parseJSON(existing.content, {}), cached: true });
      }
    }

    // Fetch connections for context
    const connections = await db.prepare(
      'SELECT platform FROM social_connections WHERE user_id = ? AND is_active = true'
    ).all(userId) as { platform: string }[];

    const platforms = connections.map((c) => c.platform).join(', ') || 'no connected platforms';
    const digest = await generateDigest(platforms);
    const id = randomUUID();
    const contentStr = JSON.stringify(digest);

    await db.prepare(`
      INSERT INTO social_digests (id, user_id, digest_date, content, model_used, tokens_used)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, digest_date) DO UPDATE SET content = EXCLUDED.content, created_at = NOW()
    `).run(id, userId, date, contentStr, 'gpt-4o-mini', 800);

    res.json({ digest, cached: false });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

socialRouter.post('/digest/regenerate', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const date = today();
    const connections = await db.prepare(
      'SELECT platform FROM social_connections WHERE user_id = ? AND is_active = true'
    ).all(userId) as { platform: string }[];

    const platforms = connections.map((c) => c.platform).join(', ') || 'none';
    const digest = await generateDigest(platforms);
    const id = randomUUID();

    await db.prepare(`
      INSERT INTO social_digests (id, user_id, digest_date, content, model_used, tokens_used)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, digest_date) DO UPDATE SET content = EXCLUDED.content, created_at = NOW()
    `).run(id, userId, date, JSON.stringify(digest), 'gpt-4o-mini', 800);

    res.json({ digest, cached: false });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

async function generateDigest(platforms: string): Promise<Record<string, unknown>> {
  const systemPrompt = `You are the Propel Stack AI social intelligence engine. Summarize the user's social activity and news from the last 24 hours. Return ONLY a valid JSON object with this exact shape:
{
  "summary": "2-3 sentence summary of social activity",
  "highlights": [{"platform": "...", "text": "...", "url": "#"}],
  "news_hits": [{"topic": "...", "headline": "...", "source": "...", "url": "#"}],
  "actions": ["action suggestion 1", "action suggestion 2"]
}`;

  const userMsg = `User is connected to: ${platforms}. Today is ${today()}. Generate an AI morning digest for this user.`;

  try {
    const raw = await callAI(systemPrompt, userMsg);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch { /* fall through to default */ }

  return {
    summary: `Your daily digest is ready. You are connected to: ${platforms}.`,
    highlights: [],
    news_hits: [],
    actions: ['Connect more social accounts to get personalized highlights.'],
  };
}

// ─── Watchlist Topics ─────────────────────────────────────────────────────────

socialRouter.get('/watchlist', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(
      'SELECT * FROM watchlist_topics WHERE user_id = ? ORDER BY created_at ASC'
    ).all(userId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

socialRouter.post('/watchlist', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { topic, alert_enabled } = req.body as { topic: string; alert_enabled?: boolean };
    if (!topic?.trim()) return res.status(400).json({ error: 'topic required' });

    const id = randomUUID();
    await db.prepare(
      'INSERT INTO watchlist_topics (id, user_id, topic, alert_enabled) VALUES (?, ?, ?, ?)'
    ).run(id, userId, topic.trim(), alert_enabled ? true : false);

    const row = await db.prepare('SELECT * FROM watchlist_topics WHERE id = ?').get(id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

socialRouter.delete('/watchlist/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(
      'DELETE FROM watchlist_topics WHERE id = ? AND user_id = ?'
    ).run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

socialRouter.patch('/watchlist/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { alert_enabled } = req.body as { alert_enabled: boolean };
    await db.prepare(
      'UPDATE watchlist_topics SET alert_enabled = ? WHERE id = ? AND user_id = ?'
    ).run(alert_enabled, req.params.id, userId);
    const row = await db.prepare('SELECT * FROM watchlist_topics WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /watchlist/search?q=topic — client-side keyword match returns scored news
socialRouter.get('/watchlist/search', async (req, res) => {
  try {
    const q = ((req.query.q as string) || '').toLowerCase().trim();
    if (!q) return res.json([]);
    // In a real build this would scan the news feed cache; return empty for now
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── News Sources ─────────────────────────────────────────────────────────────

socialRouter.get('/news/sources', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    let rows = await db.prepare(
      'SELECT * FROM news_sources WHERE user_id = ? ORDER BY source_name ASC'
    ).all(userId);

    // Seed defaults if none
    if (rows.length === 0) {
      for (const src of DEFAULT_NEWS_SOURCES) {
        const id = randomUUID();
        await db.prepare(
          'INSERT INTO news_sources (id, user_id, source_name, rss_url, bias_label) VALUES (?, ?, ?, ?, ?)'
        ).run(id, userId, src.source_name, src.rss_url, src.bias_label);
      }
      rows = await db.prepare(
        'SELECT * FROM news_sources WHERE user_id = ? ORDER BY source_name ASC'
      ).all(userId);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

socialRouter.post('/news/sources', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { source_name, rss_url, bias_label } = req.body as {
      source_name: string; rss_url: string; bias_label?: string;
    };
    if (!source_name || !rss_url) return res.status(400).json({ error: 'source_name and rss_url required' });

    const id = randomUUID();
    await db.prepare(
      'INSERT INTO news_sources (id, user_id, source_name, rss_url, bias_label) VALUES (?, ?, ?, ?, ?)'
    ).run(id, userId, source_name, rss_url, bias_label ?? 'unknown');

    const row = await db.prepare('SELECT * FROM news_sources WHERE id = ?').get(id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

socialRouter.delete('/news/sources/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(
      'DELETE FROM news_sources WHERE id = ? AND user_id = ?'
    ).run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

socialRouter.patch('/news/sources/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { is_active } = req.body as { is_active: boolean };
    await db.prepare(
      'UPDATE news_sources SET is_active = ? WHERE id = ? AND user_id = ?'
    ).run(is_active, req.params.id, userId);
    const row = await db.prepare('SELECT * FROM news_sources WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /news/feed — fetch & return RSS articles from active sources
socialRouter.get('/news/feed', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const sources = await db.prepare(
      'SELECT * FROM news_sources WHERE user_id = ? AND is_active = true LIMIT 10'
    ).all(userId) as { id: string; source_name: string; rss_url: string; bias_label: string }[];

    if (sources.length === 0) {
      return res.json([]);
    }

    const articles = await fetchRssArticles(sources);
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /news/summary — AI 2-sentence summary of an article
socialRouter.post('/news/summary', async (req, res) => {
  try {
    const { title, text } = req.body as { title: string; text: string };
    if (!title) return res.status(400).json({ error: 'title required' });

    const systemPrompt = 'Summarize this news article in exactly 2 sentences. Be factual and neutral.';
    const userMsg = `Title: ${title}\n\n${text ?? ''}`;
    const summary = await callAI(systemPrompt, userMsg);
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

async function fetchRssArticles(
  sources: { source_name: string; rss_url: string; bias_label: string }[]
): Promise<Record<string, unknown>[]> {
  const allArticles: Record<string, unknown>[] = [];

  await Promise.allSettled(sources.map(async (src) => {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 5000);
      const resp = await fetch(src.rss_url, { signal: ctrl.signal });
      clearTimeout(timeout);
      const xml = await resp.text();

      // Simple regex-based RSS parser (avoids xml2js dependency)
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
      for (const item of items.slice(0, 5)) {
        const title = (item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s)?.[1] ?? '').trim();
        const link = (item.match(/<link>(.*?)<\/link>/s)?.[1] ?? '').trim();
        const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/s)?.[1] ?? '').trim();
        const description = (item.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/s)?.[1] ?? '')
          .replace(/<[^>]+>/g, '').slice(0, 200).trim();

        if (title) {
          allArticles.push({
            id: `${src.source_name}-${link}`,
            source: src.source_name,
            bias_label: src.bias_label,
            title,
            url: link,
            summary: description,
            published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          });
        }
      }
    } catch { /* skip failed sources */ }
  }));

  allArticles.sort((a, b) =>
    new Date(b.published_at as string).getTime() - new Date(a.published_at as string).getTime()
  );
  return allArticles;
}

// ─── Media Connections (Streaming) ───────────────────────────────────────────

socialRouter.get('/media', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(
      'SELECT * FROM media_connections WHERE user_id = ? ORDER BY service ASC'
    ).all(userId);
    res.json({ connections: rows, catalog: STREAMING_SERVICES });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

socialRouter.post('/media', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { service, service_type, deep_link_url } = req.body as {
      service: string; service_type?: string; deep_link_url?: string;
    };
    if (!service) return res.status(400).json({ error: 'service required' });

    const catalog = STREAMING_SERVICES.find((s) => s.service === service);
    const id = randomUUID();
    await db.prepare(`
      INSERT INTO media_connections (id, user_id, service, service_type, deep_link_url)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (user_id, service) DO UPDATE SET is_active = true
    `).run(
      id, userId, service,
      service_type ?? catalog?.service_type ?? 'streaming',
      deep_link_url ?? catalog?.deep_link_url ?? ''
    );

    const row = await db.prepare(
      'SELECT * FROM media_connections WHERE user_id = ? AND service = ?'
    ).get(userId, service);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

socialRouter.delete('/media/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(
      'DELETE FROM media_connections WHERE id = ? AND user_id = ?'
    ).run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Scheduled Posts (Content Calendar) ───────────────────────────────────────

socialRouter.get('/posts', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(
      'SELECT * FROM scheduled_posts WHERE user_id = ? ORDER BY scheduled_for DESC NULLS LAST, created_at DESC'
    ).all(userId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

socialRouter.post('/posts', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { platforms, content, media_urls, scheduled_for } = req.body as {
      platforms: string[]; content: string; media_urls?: string[]; scheduled_for?: string;
    };
    if (!content?.trim()) return res.status(400).json({ error: 'content required' });

    const id = randomUUID();
    const status = scheduled_for ? 'scheduled' : 'draft';
    await db.prepare(`
      INSERT INTO scheduled_posts (id, user_id, platforms, content, media_urls, scheduled_for, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, userId,
      JSON.stringify(platforms ?? []),
      content,
      JSON.stringify(media_urls ?? []),
      scheduled_for ?? null,
      status
    );

    const row = await db.prepare('SELECT * FROM scheduled_posts WHERE id = ?').get(id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

socialRouter.put('/posts/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { platforms, content, media_urls, scheduled_for, status } = req.body as {
      platforms?: string[]; content?: string; media_urls?: string[];
      scheduled_for?: string | null; status?: string;
    };

    const existing = await db.prepare(
      'SELECT * FROM scheduled_posts WHERE id = ? AND user_id = ?'
    ).get(req.params.id, userId) as Record<string, unknown> | undefined;
    if (!existing) return res.status(404).json({ error: 'Post not found' });

    await db.prepare(`
      UPDATE scheduled_posts
      SET platforms = ?, content = ?, media_urls = ?, scheduled_for = ?, status = ?
      WHERE id = ? AND user_id = ?
    `).run(
      JSON.stringify(platforms ?? parseJSON(existing.platforms, [])),
      content ?? existing.content,
      JSON.stringify(media_urls ?? parseJSON(existing.media_urls, [])),
      scheduled_for !== undefined ? scheduled_for : existing.scheduled_for,
      status ?? existing.status,
      req.params.id, userId
    );

    const row = await db.prepare('SELECT * FROM scheduled_posts WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

socialRouter.delete('/posts/:id', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    await db.prepare(
      'DELETE FROM scheduled_posts WHERE id = ? AND user_id = ?'
    ).run(req.params.id, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /posts/:id/publish — attempt to publish (simulated)
socialRouter.post('/posts/:id/publish', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const post = await db.prepare(
      'SELECT * FROM scheduled_posts WHERE id = ? AND user_id = ?'
    ).get(req.params.id, userId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // In production: call platform APIs. For now simulate success.
    await db.prepare(
      "UPDATE scheduled_posts SET status = 'published', scheduled_for = NOW() WHERE id = ? AND user_id = ?"
    ).run(req.params.id, userId);

    res.json({ ok: true, message: 'Post marked as published. Connect platform OAuth to enable real publishing.' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /posts/draft-ai — AI-assisted post drafting
socialRouter.post('/posts/draft-ai', async (req, res) => {
  try {
    const { platform, topic, tone } = req.body as {
      platform: string; topic: string; tone?: string;
    };
    if (!platform || !topic) return res.status(400).json({ error: 'platform and topic required' });

    const systemPrompt = `You are a social media copywriter. Write an engaging post for ${platform} about the following topic. Match the platform's style, tone, and character limits. ${tone ? `Tone: ${tone}.` : ''} Return only the post text, no explanation.`;
    const draft = await callAI(systemPrompt, topic);
    res.json({ draft: draft.trim() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Screen Time ──────────────────────────────────────────────────────────────

socialRouter.post('/screen-time/log', async (req, res) => {
  try {
    const userId = getCurrentUserId();
    const { platform, duration_seconds } = req.body as {
      platform: string; duration_seconds?: number;
    };
    if (!platform) return res.status(400).json({ error: 'platform required' });

    const id = randomUUID();
    await db.prepare(`
      INSERT INTO screen_time_log (id, user_id, platform, duration_seconds, session_end)
      VALUES (?, ?, ?, ?, NOW())
    `).run(id, userId, platform, duration_seconds ?? 0);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

socialRouter.get('/screen-time/weekly', async (_req, res) => {
  try {
    const userId = getCurrentUserId();
    const rows = await db.prepare(`
      SELECT platform,
             SUM(duration_seconds) as total_seconds,
             COUNT(*) as session_count
      FROM screen_time_log
      WHERE user_id = ?
        AND session_start >= NOW() - INTERVAL '7 days'
      GROUP BY platform
      ORDER BY total_seconds DESC
    `).all(userId);

    const prevRows = await db.prepare(`
      SELECT SUM(duration_seconds) as total_seconds
      FROM screen_time_log
      WHERE user_id = ?
        AND session_start >= NOW() - INTERVAL '14 days'
        AND session_start < NOW() - INTERVAL '7 days'
    `).get(userId) as { total_seconds: number | null } | undefined;

    res.json({
      weekly: rows,
      prev_week_total: prevRows?.total_seconds ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Hub Stats (for SocialHub home) ───────────────────────────────────────────

socialRouter.get('/stats', async (_req, res) => {
  try {
    const userId = getCurrentUserId();

    const [connCount, inboxCount, postCount, screenTime] = await Promise.all([
      db.prepare('SELECT COUNT(*) as n FROM social_connections WHERE user_id = ? AND is_active = true').get(userId),
      db.prepare('SELECT COUNT(*) as n FROM social_connections WHERE user_id = ? AND is_active = true').get(userId),
      db.prepare("SELECT COUNT(*) as n FROM scheduled_posts WHERE user_id = ? AND scheduled_for > NOW()").get(userId),
      db.prepare(`
        SELECT SUM(duration_seconds) as total
        FROM screen_time_log
        WHERE user_id = ? AND session_start >= NOW() - INTERVAL '7 days'
      `).get(userId),
    ]);

    // Engagement sparkline (last 7 days, mock data based on connection count)
    const connections = (connCount as { n: number }).n;
    const sparkline = Array.from({ length: 7 }, (_, i) => ({
      day: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
      posts: Math.floor(Math.random() * 20 * connections),
      interactions: Math.floor(Math.random() * 50 * connections),
    }));

    res.json({
      total_connections: connections,
      unread_notifications: connections * 2, // simulated
      todays_posts: (postCount as { n: number }).n,
      weekly_screen_time_seconds: (screenTime as { total: number | null }).total ?? 0,
      sparkline,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
