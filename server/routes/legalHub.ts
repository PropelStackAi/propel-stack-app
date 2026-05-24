/**
 * Enhancement 40 — Consumer Legal Hub
 * Propel Stack AI, LLC
 *
 * AI-powered consumer legal assistant.
 * MANDATORY disclaimer on EVERY AI response — cannot be dismissed or hidden.
 * Disclaimer gate: PSAI-LEGAL-DISC-v1.0 must be acknowledged before access.
 * NOT a law firm. NOT legal advice. General legal information only.
 */

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { db, getCurrentUserId } from '../db.js';
import { scrubPII } from '../middleware/piiScrubber.js';
import { randomUUID } from 'node:crypto';

export const legalHubRouter = Router();
const ai = new Anthropic();

const LEGAL_DISCLAIMER = 'This is general legal information, not legal advice. Consult a licensed attorney for advice specific to your situation.';
const DISCLAIMER_VERSION = 'PSAI-LEGAL-DISC-v1.0';

const LEGAL_SYSTEM = `You are a consumer legal information assistant. You help people understand their legal rights and common legal situations.

MANDATORY RULE: End EVERY response with:
"DISCLAIMER: ${LEGAL_DISCLAIMER}"

For demand letters and dispute responses also add:
"This document is a template and may not be appropriate for your specific situation. Have it reviewed by an attorney before sending."

You cover: tenant rights, employee rights, consumer protection, small claims court, contract basics, FDCPA debt collection rules.
You DO NOT: give specific legal advice, predict outcomes, recommend specific attorneys, handle criminal matters.`;

// Helper: check disclaimer acknowledged
async function requireDisclaimer(userId: string): Promise<boolean> {
  const ack = await db.prepare('SELECT id FROM legal_disclaimer_acks WHERE user_id = $1').get(userId);
  return !!ack;
}

// GET /api/legal/disclaimer — check status
legalHubRouter.get('/disclaimer', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const ack = await db.prepare('SELECT * FROM legal_disclaimer_acks WHERE user_id = $1').get(userId);
    res.json({ acknowledged: !!ack, version: DISCLAIMER_VERSION });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check disclaimer' });
  }
});

// POST /api/legal/disclaimer — acknowledge disclaimer
legalHubRouter.post('/disclaimer', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const existing = await db.prepare('SELECT id FROM legal_disclaimer_acks WHERE user_id = $1').get(userId);
    if (!existing) {
      await db.prepare(`
        INSERT INTO legal_disclaimer_acks (id, user_id, version)
        VALUES ($1, $2, $3)
      `).run(randomUUID(), userId, DISCLAIMER_VERSION);
    }
    res.json({ acknowledged: true, version: DISCLAIMER_VERSION });
  } catch (err) {
    res.status(500).json({ error: 'Failed to acknowledge disclaimer' });
  }
});

// POST /api/legal/chat — legal Q&A with persistent disclaimer
legalHubRouter.post('/chat', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!(await requireDisclaimer(userId))) {
      return res.status(403).json({ error: 'disclaimer_required', version: DISCLAIMER_VERSION });
    }

    const { question, session_type = 'know_your_rights' } = req.body as { question: string; session_type?: string };
    if (!question) return res.status(400).json({ error: 'question required' });

    const completion = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: LEGAL_SYSTEM,
      messages: [{ role: 'user', content: scrubPII(question) }],
    });

    const answer = (completion.content[0] as any).text || '';
    const finalAnswer = answer.includes('general legal information') ? answer : `${answer}\n\nDISCLAIMER: ${LEGAL_DISCLAIMER}`;

    // Save session
    const sessionId = randomUUID();
    await db.prepare(`
      INSERT INTO legal_chat_sessions (id, user_id, session_type, messages)
      VALUES ($1,$2,$3,$4)
    `).run(sessionId, userId, session_type, JSON.stringify([
      { role: 'user', content: question },
      { role: 'assistant', content: finalAnswer },
    ]));

    res.json({ answer: finalAnswer, session_id: sessionId, disclaimer: LEGAL_DISCLAIMER });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process legal question' });
  }
});

// POST /api/legal/demand-letter — generate demand letter
legalHubRouter.post('/demand-letter', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!(await requireDisclaimer(userId))) {
      return res.status(403).json({ error: 'disclaimer_required', version: DISCLAIMER_VERSION });
    }

    const { situation, amount_owed, recipient_name, deadline_days = 14 } = req.body as {
      situation: string; amount_owed?: number; recipient_name?: string; deadline_days?: number;
    };
    if (!situation) return res.status(400).json({ error: 'situation required' });

    const prompt = scrubPII(`Generate a professional demand letter for this situation:

Situation: ${situation}
Amount owed: ${amount_owed ? `$${amount_owed}` : 'unspecified'}
Recipient: ${recipient_name ?? '[Recipient Name]'}
Response deadline: ${deadline_days} days

Format as a proper business letter with:
- Date placeholder
- Sender/recipient blocks
- Clear statement of the issue
- Specific demand with deadline
- Consequences if not resolved (next steps — small claims, etc.)

Professional but firm tone. End with the standard legal disclaimer.`);

    const completion = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: LEGAL_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const letter = (completion.content[0] as any).text || '';
    const finalLetter = letter.includes('general legal information') ? letter : `${letter}\n\nDISCLAIMER: ${LEGAL_DISCLAIMER}\nThis document is a template and may not be appropriate for your specific situation. Have it reviewed by an attorney before sending.`;

    res.json({ letter: finalLetter, disclaimer: LEGAL_DISCLAIMER });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate demand letter' });
  }
});

// POST /api/legal/dispute-response — generate dispute response
legalHubRouter.post('/dispute-response', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!(await requireDisclaimer(userId))) {
      return res.status(403).json({ error: 'disclaimer_required', version: DISCLAIMER_VERSION });
    }

    const { description, dispute_type = 'general' } = req.body as { description: string; dispute_type?: string };
    if (!description) return res.status(400).json({ error: 'description required' });

    const prompt = scrubPII(`Generate a point-by-point dispute response for this situation:

Dispute type: ${dispute_type}
Description: ${description}

Format as a structured response that:
- Acknowledges receipt of the dispute/notice
- Addresses each point with applicable law references where relevant
- States the sender's position clearly
- Requests specific next steps or documentation

Cite relevant federal consumer protection laws (FDCPA, FCRA, etc.) where applicable.`);

    const completion = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: LEGAL_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const response = (completion.content[0] as any).text || '';
    const finalResponse = response.includes('general legal information') ? response : `${response}\n\nDISCLAIMER: ${LEGAL_DISCLAIMER}`;

    res.json({ response: finalResponse, disclaimer: LEGAL_DISCLAIMER });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate dispute response' });
  }
});

// GET /api/legal/small-claims/:state — state-specific small claims guide
legalHubRouter.get('/small-claims/:state', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!(await requireDisclaimer(userId))) {
      return res.status(403).json({ error: 'disclaimer_required', version: DISCLAIMER_VERSION });
    }

    const state = req.params.state.toUpperCase();
    const prompt = `Provide a brief small claims court guide for ${state}:
- Filing limit (dollar amount)
- Filing fee range
- How to file (online/in-person)
- What to bring
- Process overview (hearing timeline)

Be specific to ${state} law. Under 200 words.`;

    const completion = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 350,
      system: LEGAL_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const guide = (completion.content[0] as any).text || '';
    const finalGuide = guide.includes('general legal information') ? guide : `${guide}\n\nDISCLAIMER: ${LEGAL_DISCLAIMER}`;

    res.json({ state, guide: finalGuide, disclaimer: LEGAL_DISCLAIMER });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get small claims guide' });
  }
});

// GET /api/legal/documents — list stored legal documents
legalHubRouter.get('/documents', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const docs = await db.prepare(`
      SELECT id, document_name, document_type, ai_summary, created_at
      FROM legal_documents WHERE user_id = $1 ORDER BY created_at DESC
    `).all(userId);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/legal/review — AI document review (text submission, no file upload needed for MVP)
legalHubRouter.post('/review', async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    if (!(await requireDisclaimer(userId))) {
      return res.status(403).json({ error: 'disclaimer_required', version: DISCLAIMER_VERSION });
    }

    const { document_text, document_name = 'Document', document_type = 'contract' } = req.body as {
      document_text: string; document_name?: string; document_type?: string;
    };
    if (!document_text) return res.status(400).json({ error: 'document_text required' });

    const prompt = scrubPII(`Review this ${document_type} and identify:

(a) Top 3 risks or unfavorable clauses
(b) Missing standard protections
(c) Plain-English summary of key terms

Document text (first 3000 chars):
${document_text.slice(0, 3000)}

Format as JSON:
{
  "summary": "...",
  "risks": ["risk1", "risk2", "risk3"],
  "missing_protections": ["prot1", "prot2"],
  "key_terms": ["term1", "term2"]
}`);

    const completion = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: LEGAL_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const txt = (completion.content[0] as any).text || '';
    let review: Record<string, unknown> = { summary: txt, risks: [], missing_protections: [], key_terms: [] };
    try {
      const match = txt.match(/\{[\s\S]*\}/);
      if (match) review = JSON.parse(match[0]);
    } catch { /* keep default */ }

    // Store document record
    const docId = randomUUID();
    await db.prepare(`
      INSERT INTO legal_documents (id, user_id, document_name, document_type, ai_summary, risk_flags)
      VALUES ($1,$2,$3,$4,$5,$6)
    `).run(docId, userId, document_name, document_type, String(review.summary ?? '').slice(0, 500), JSON.stringify(review.risks ?? []));

    res.json({ document_id: docId, review, disclaimer: LEGAL_DISCLAIMER });
  } catch (err) {
    res.status(500).json({ error: 'Failed to review document' });
  }
});
