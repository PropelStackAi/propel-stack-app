// ─── Smart Document Intelligence ─────────────────────────────────────────────
// Enhancement 23 — Propel Stack AI, LLC
// Upload any doc → AI classifies type, extracts structured fields, masks PII.
// User reviews and confirms → data flows into the relevant hub automatically.

import { Router, type Request, type Response } from 'express';
import { db, getCurrentUserId } from '../db.js';

export const docIntelligenceRouter = Router();

// ── Types ─────────────────────────────────────────────────────────────────────

type DocType =
  | 'insurance_policy'
  | 'lease_agreement'
  | 'vehicle_service'
  | 'medical_lab'
  | 'warranty_card'
  | 'prescription'
  | 'bill_invoice'
  | 'contract'
  | 'unknown';

const ALL_DOC_TYPES: DocType[] = [
  'insurance_policy', 'lease_agreement', 'vehicle_service', 'medical_lab',
  'warranty_card', 'prescription', 'bill_invoice', 'contract', 'unknown',
];

function newId(): string {
  return `di-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── PII Masking ───────────────────────────────────────────────────────────────
// CRITICAL SAFETY RULE: PII is masked BEFORE any data reaches the AI.
// Account numbers and SSNs are NEVER sent to any AI model.
function maskPII(text: string): string {
  return text
    .replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, '***-**-****')             // SSN pattern
    .replace(/\b(?:\d{4}[-.\s]?){3}\d{4}\b/g, '****-****-****-****')           // 16-digit card
    .replace(/\b\d{17,19}\b/g, '****-****-****-****')                           // 17-19 digit card
    .replace(/(?:account|acct|routing)[\s#:]*\d{4,17}/gi, 'ACCOUNT ***MASKED***') // Labeled accounts
    .replace(/\b\d{9}(?!\d)\b/g, '***MASKED***');                               // 9-digit numbers
}

function maskExtractedJson(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      result[k] = maskPII(v);
    } else if (Array.isArray(v)) {
      result[k] = v.map((item) => (typeof item === 'string' ? maskPII(item) : item));
    } else {
      result[k] = v;
    }
  }
  return result;
}

// ── Text Extraction from Base64 Binary ───────────────────────────────────────
// Extracts human-readable text from base64-encoded PDF/document bytes.
// Works well for text-based PDFs; returns empty string for binary-only files.
function extractTextFromBase64(base64: string): string {
  try {
    const buf = Buffer.from(base64, 'base64');
    const raw = buf.toString('binary');
    const readable = raw
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/[ \t]{5,}/g, ' ')
      .replace(/\n{4,}/g, '\n\n')
      .trim();
    return readable.length > 200 ? readable.substring(0, 6000) : '';
  } catch {
    return '';
  }
}

// ── Direct Anthropic AI Call ─────────────────────────────────────────────────
async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) return '';
    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    return data.content?.[0]?.text?.trim() ?? '';
  } catch {
    return '';
  }
}

// ── Classification Prompt ─────────────────────────────────────────────────────
const CLASSIFY_SYSTEM = `You are a document classifier for a personal life management app.
Given a document title, category, and any readable text excerpt, return EXACTLY ONE of these type strings:
insurance_policy | lease_agreement | vehicle_service | medical_lab | warranty_card | prescription | bill_invoice | contract | unknown

Rules:
- insurance_policy: home, auto, life, umbrella, health insurance documents
- lease_agreement: rental lease, tenancy agreement, rent contract
- vehicle_service: oil change, tire rotation, inspection, repair record, service record
- medical_lab: blood test results, lab report, pathology, diagnostic results
- warranty_card: product warranty card, receipt with warranty, appliance registration
- prescription: medication prescription, Rx label, pharmacy instructions
- bill_invoice: utility bill, invoice, account statement, service bill
- contract: service contract, employment agreement, vendor agreement, general contract
- unknown: does not clearly fit any category above

Return ONLY the type string — no punctuation, no explanation.`;

// ── Per-Type Extraction Prompts ───────────────────────────────────────────────
const EXTRACT_SYSTEMS: Record<DocType, string> = {
  insurance_policy: `Extract fields from this insurance document. Return ONLY valid JSON matching this schema exactly:
{"carrier":"","policy_number":"","policy_type":"home","coverage_type":"","premium_annual":null,"renewal_date":"","agent_name":"","agent_contact":"","notes":""}
policy_type values: home | auto | life | umbrella | health | other. Dates as YYYY-MM-DD. null for unknown numbers. "" for unknown strings.`,

  lease_agreement: `Extract fields from this lease or rental agreement. Return ONLY valid JSON:
{"property_address":"","landlord_name":"","tenant_name":"","monthly_rent":null,"lease_start":"","lease_end":"","security_deposit":null,"due_day":1,"notes":""}
Dates as YYYY-MM-DD. null for unknown numbers.`,

  vehicle_service: `Extract fields from this vehicle service record. Return ONLY valid JSON:
{"service_type":"other","service_date":"","mileage":null,"cost":null,"next_service_recommendation":"","shop_name":"","notes":""}
service_type: oil_change | tire_rotation | brake_service | inspection | registration | other. Dates as YYYY-MM-DD.`,

  medical_lab: `Extract general metadata from this medical lab document. DO NOT include specific test values, reference ranges, or diagnostic interpretations.
Return ONLY valid JSON:
{"test_date":"","ordering_provider":"","facility":"","test_names":[],"notes":"Lab results received"}
Keep notes brief and non-diagnostic. Never include clinical values.`,

  warranty_card: `Extract fields from this warranty or receipt document. Return ONLY valid JSON:
{"product_name":"","brand":"","model":"","serial_number":"","purchase_date":"","warranty_months":null,"warranty_expiry":"","store_name":"","purchase_price":null}
Dates as YYYY-MM-DD. serial_number and purchase_price may already be masked.`,

  prescription: `Extract fields from this prescription or medication document. Return ONLY valid JSON:
{"medication_name":"","dosage":"","frequency":"","prescriber":"","fill_date":"","refill_date":"","quantity":null,"pharmacy":"","notes":""}
Dates as YYYY-MM-DD. Do not include patient identifiers beyond what is structurally necessary.`,

  bill_invoice: `Extract fields from this bill or invoice document. Return ONLY valid JSON:
{"vendor":"","amount":null,"due_date":"","category":"Bills & Utilities","is_recurring":false,"billing_period":"","notes":""}
category options: Bills & Utilities | Internet | Electric | Gas | Water | Insurance | Subscription | Other. Dates as YYYY-MM-DD.`,

  contract: `Extract key structural information from this contract or agreement. Return ONLY valid JSON:
{"parties":[],"effective_date":"","termination_date":"","renewal_date":"","key_obligations":"","summary":""}
key_obligations: one short sentence max. summary: one sentence describing the contract purpose.`,

  unknown: `Return ONLY this JSON: {"summary":"Document type could not be determined. Please categorize manually."}`,
};

// ── Confidence Scoring ────────────────────────────────────────────────────────
function scoreConfidence(docType: DocType, extracted: Record<string, unknown>): number {
  if (docType === 'unknown') return 0.15;
  const vals = Object.values(extracted).filter(
    (v) => v !== null && v !== '' && v !== false && !(Array.isArray(v) && v.length === 0),
  );
  const total = Object.keys(extracted).length;
  if (total === 0) return 0.2;
  return Math.min(0.95, 0.35 + (vals.length / total) * 0.6);
}

// ── Row Mapper ────────────────────────────────────────────────────────────────
function rowToExtraction(row: Record<string, unknown>) {
  const fields = (() => {
    try { return JSON.parse(String(row.extracted_json ?? '{}')); } catch { return {}; }
  })();
  return {
    id: row.id,
    userId: row.user_id,
    vaultFileId: row.vault_file_id,
    docType: row.doc_type,
    fields,
    confidence: Number(row.confidence ?? 0),
    confirmedAt: row.confirmed_at ?? null,
    dismissedAt: row.dismissed_at ?? null,
    createdAt: row.created_at,
    docTitle: row.doc_title ?? null,
    docCategory: row.doc_category ?? null,
    docFileName: row.doc_file_name ?? null,
  };
}

// ── Hub Auto-Populate Handlers ────────────────────────────────────────────────
// Applied only after explicit user confirmation. Never auto-saves without review.
async function applyToHub(
  userId: string,
  docType: DocType,
  data: Record<string, unknown>,
  vaultFileId: string,
  actions: string[],
): Promise<void> {
  const genId = () => `hub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  switch (docType) {
    case 'insurance_policy': {
      await db.prepare(
        `INSERT INTO insurance_policies
           (id, user_id, policy_type, carrier, policy_number, agent_name, agent_contact, premium_cents, renewal_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        genId(), userId,
        String(data.policy_type || 'home'),
        String(data.carrier || ''),
        String(data.policy_number || ''),
        String(data.agent_name || ''),
        String(data.agent_contact || ''),
        data.premium_annual != null ? Math.round(Number(data.premium_annual) * 100) : null,
        String(data.renewal_date || ''),
        String(data.notes || `Extracted from Document Vault`),
      );
      actions.push('Added to Insurance Vault');
      break;
    }

    case 'warranty_card': {
      await db.prepare(
        `INSERT INTO appliances
           (id, user_id, name, brand, model, serial_number, purchase_date, warranty_expiry, purchase_price, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        genId(), userId,
        String(data.product_name || 'Appliance'),
        String(data.brand || ''),
        String(data.model || ''),
        String(data.serial_number || ''),
        String(data.purchase_date || ''),
        String(data.warranty_expiry || ''),
        data.purchase_price != null ? Math.round(Number(data.purchase_price)) : null,
        'Added via Smart Document Intelligence',
      );
      actions.push('Added to Appliance Tracker');
      break;
    }

    case 'bill_invoice': {
      await db.prepare(
        `INSERT INTO finance_bills (id, user_id, name, amount, due_day, recurrence, category, is_autopay)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        genId(), userId,
        String(data.vendor || 'Bill'),
        Number(data.amount || 0),
        1,
        data.is_recurring ? 'monthly' : 'none',
        String(data.category || 'Bills & Utilities'),
        0,
      );
      actions.push('Added to Bill Tracker');
      break;
    }

    case 'contract': {
      if (data.summary) {
        const summary = `Contract: ${String(data.summary)}${data.renewal_date ? ` Renews: ${String(data.renewal_date)}` : ''}`;
        await db.prepare('UPDATE documents SET ai_summary = ? WHERE id = ?').run(summary, vaultFileId);
        actions.push('Document summary updated with contract details');
      } else {
        actions.push('Contract extraction saved');
      }
      break;
    }

    case 'vehicle_service': {
      const vehicle = await db.prepare('SELECT id FROM vehicles WHERE user_id = ? ORDER BY created_at ASC LIMIT 1').get(userId) as Record<string, unknown> | undefined;
      if (vehicle) {
        await db.prepare(
          `INSERT INTO vehicle_service_log
             (id, user_id, vehicle_id, service_type, service_date, mileage, cost_cents, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          genId(), userId, String(vehicle.id),
          String(data.service_type || 'other'),
          String(data.service_date || new Date().toISOString().slice(0, 10)),
          data.mileage != null ? Number(data.mileage) : null,
          data.cost != null ? Math.round(Number(data.cost) * 100) : null,
          String(data.notes || data.next_service_recommendation || ''),
        );
        actions.push('Added to Vehicle Service Log');
      } else {
        actions.push('Service record saved — add a vehicle in Home & Property to link it');
      }
      break;
    }

    case 'lease_agreement': {
      const property = await db.prepare('SELECT id FROM properties WHERE user_id = ? ORDER BY created_at ASC LIMIT 1').get(userId) as Record<string, unknown> | undefined;
      if (property && data.monthly_rent != null) {
        await db.prepare(
          `INSERT INTO rental_ledger
             (id, user_id, property_id, tenant_name, lease_start, lease_end, rent_cents, due_day, security_deposit_cents, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          genId(), userId, String(property.id),
          String(data.tenant_name || ''),
          String(data.lease_start || ''),
          String(data.lease_end || ''),
          Math.round(Number(data.monthly_rent) * 100),
          Number(data.due_day || 1),
          data.security_deposit != null ? Math.round(Number(data.security_deposit) * 100) : null,
          'Added via Smart Document Intelligence',
        );
        actions.push('Added to Rental Manager');
      } else {
        actions.push('Lease details saved — add a property in Home & Property to link it');
      }
      break;
    }

    case 'medical_lab':
    case 'prescription':
    case 'unknown':
    default:
      // Medical data: extracted fields stay here in the extraction record only.
      // Never auto-inserted into shared hubs. User can copy values manually.
      actions.push('Extraction confirmed and saved to your private record');
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /analyze/:docId — Classify and extract from an existing vault document
docIntelligenceRouter.post('/analyze/:docId', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const docId = req.params.docId as string;

  const doc = await db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(docId, userId) as Record<string, unknown> | undefined;
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  // Prevent duplicate pending extraction
  const existing = await db.prepare(
    `SELECT id FROM doc_extractions
     WHERE vault_file_id = ? AND user_id = ? AND confirmed_at IS NULL AND dismissed_at IS NULL`,
  ).get(docId, userId) as Record<string, unknown> | undefined;
  if (existing) {
    return res.status(409).json({ error: 'Extraction already pending', extraction_id: existing.id });
  }

  try {
    // Step 1: Extract text from document binary — PII masked BEFORE any AI call
    const rawText = doc.data ? extractTextFromBase64(String(doc.data)) : '';
    const safeText = maskPII(rawText).substring(0, 5000);

    // Step 2: Classify document type
    const classifyPrompt = `Title: ${String(doc.title)}\nCategory: ${String(doc.category)}\n\nText excerpt:\n${safeText.substring(0, 1000)}`;
    const rawType = (await callAI(CLASSIFY_SYSTEM, classifyPrompt)).toLowerCase().trim() as DocType;
    const docType: DocType = ALL_DOC_TYPES.includes(rawType) ? rawType : 'unknown';

    // Step 3: Type-specific field extraction (still using PII-masked text)
    const extractPrompt = `Document Title: ${String(doc.title)}\nDocument Category: ${String(doc.category)}\n\nDocument Text:\n${safeText}`;
    const rawJson = await callAI(EXTRACT_SYSTEMS[docType], extractPrompt);

    let extracted: Record<string, unknown> = {};
    try {
      const match = rawJson.match(/\{[\s\S]*\}/);
      if (match) extracted = JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      extracted = { notes: 'Could not parse structured extraction. Review manually.' };
    }

    // Step 4: Second PII masking pass on extracted values (defense in depth)
    const masked = maskExtractedJson(extracted);
    const confidence = scoreConfidence(docType, masked);

    // Store extraction — user must confirm before anything hits hub tables
    const id = newId();
    await db.prepare(
      `INSERT INTO doc_extractions (id, user_id, vault_file_id, doc_type, extracted_json, confidence)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, userId, docId, docType, JSON.stringify(masked), confidence);

    const row = await db.prepare(
      `SELECT de.*, d.title AS doc_title, d.category AS doc_category, d.file_name AS doc_file_name
       FROM doc_extractions de JOIN documents d ON d.id = de.vault_file_id
       WHERE de.id = ?`,
    ).get(id) as Record<string, unknown> | undefined;

    res.status(201).json(rowToExtraction(row ?? { id, user_id: userId, vault_file_id: docId, doc_type: docType, extracted_json: JSON.stringify(masked), confidence }));
  } catch (err) {
    console.error('[docIntelligence] analyze error', err);
    res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
});

// GET /pending — list unconfirmed, un-dismissed extractions for current user
docIntelligenceRouter.get('/pending', async (_req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const rows = await db.prepare(
    `SELECT de.*, d.title AS doc_title, d.category AS doc_category, d.file_name AS doc_file_name
     FROM doc_extractions de
     JOIN documents d ON d.id = de.vault_file_id
     WHERE de.user_id = ? AND de.confirmed_at IS NULL AND de.dismissed_at IS NULL
     ORDER BY de.created_at DESC`,
  ).all(userId) as Record<string, unknown>[];
  res.json(rows.map(rowToExtraction));
});

// GET /:id — single extraction
docIntelligenceRouter.get('/:id', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const row = await db.prepare(
    `SELECT de.*, d.title AS doc_title, d.category AS doc_category, d.file_name AS doc_file_name
     FROM doc_extractions de JOIN documents d ON d.id = de.vault_file_id
     WHERE de.id = ? AND de.user_id = ?`,
  ).get(req.params.id as string, userId) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(rowToExtraction(row));
});

// POST /:id/confirm — user confirms extraction, data flows into hub tables
docIntelligenceRouter.post('/:id/confirm', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const id = req.params.id as string;

  const row = await db.prepare('SELECT * FROM doc_extractions WHERE id = ? AND user_id = ?').get(id, userId) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.confirmed_at) return res.status(409).json({ error: 'Already confirmed' });

  const docType = String(row.doc_type) as DocType;
  let baseFields: Record<string, unknown> = {};
  try { baseFields = JSON.parse(String(row.extracted_json)); } catch { /* empty */ }

  // Merge any user edits from the review UI
  const overrides = (req.body?.fields ?? {}) as Record<string, unknown>;
  const finalData = { ...baseFields, ...maskExtractedJson(overrides) };

  const actions: string[] = [];
  try {
    await applyToHub(userId, docType, finalData, String(row.vault_file_id), actions);
  } catch (err) {
    console.error('[docIntelligence] hub apply error (non-fatal)', err);
    actions.push('Hub update failed — extraction still saved');
  }

  await db.prepare('UPDATE doc_extractions SET confirmed_at = NOW() WHERE id = ?').run(id);
  res.json({ ok: true, actions_taken: actions });
});

// POST /:id/dismiss — user dismisses without taking action
docIntelligenceRouter.post('/:id/dismiss', async (req: Request, res: Response) => {
  const userId = getCurrentUserId();
  const r = await db.prepare(
    'UPDATE doc_extractions SET dismissed_at = NOW() WHERE id = ? AND user_id = ?',
  ).run(req.params.id as string, userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
