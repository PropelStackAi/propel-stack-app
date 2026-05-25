/**
 * Safety & Trust Policy — Propel Stack AI, LLC
 *
 * This page must be publicly accessible before the first paying user onboards.
 * Crisis escalation resources are HARDCODED and must never be AI-generated.
 *
 * PSAI-SAFETY-POLICY-v1.0 | May 2026
 */

import {
  Shield, Heart, AlertTriangle, Phone, MessageCircle, Eye, Lock,
  Baby, Brain, HandHeart, ChevronDown, ChevronUp, type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

// ─── Section accordion ────────────────────────────────────────────────────────

function Section({
  icon: Icon, title, color = 'text-brand-indigo', children,
}: {
  icon: LucideIcon;
  title: string;
  color?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="card mb-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <Icon size={20} className={color} />
          <h2 className="font-display text-lg font-bold text-surface-ink dark:text-white">{title}</h2>
        </div>
        {open ? <ChevronUp size={16} className="text-surface-muted" /> : <ChevronDown size={16} className="text-surface-muted" />}
      </button>
      {open && <div className="mt-4 space-y-3 text-sm text-surface-ink/80 dark:text-white/80 leading-relaxed">{children}</div>}
    </div>
  );
}

function CrisisBox() {
  return (
    <div className="rounded-xl2 border-2 border-red-500 bg-red-50 dark:bg-red-900/20 p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Phone size={20} className="text-red-600" />
        <h2 className="font-bold text-red-700 dark:text-red-400 text-lg">If you or someone you know is in crisis</h2>
      </div>
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <span className="text-red-600 font-bold text-base min-w-fit">📞 988</span>
          <div>
            <p className="font-semibold text-surface-ink dark:text-white">Suicide & Crisis Lifeline</p>
            <p className="text-xs text-surface-muted">Call or text 988 — 24/7, free, confidential</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-red-600 font-bold text-base min-w-fit">💬 Text</span>
          <div>
            <p className="font-semibold text-surface-ink dark:text-white">Crisis Text Line</p>
            <p className="text-xs text-surface-muted">Text HOME to 741741 — 24/7, free, confidential</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-red-600 font-bold text-base min-w-fit">🚨 911</span>
          <div>
            <p className="font-semibold text-surface-ink dark:text-white">Emergency Services</p>
            <p className="text-xs text-surface-muted">Call 911 (US) or your local emergency number for immediate danger</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-surface-muted italic">
        Propel Stack AI is not a mental health treatment, therapy service, or emergency response service. The above resources are staffed by trained human professionals.
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SafetyTrustPolicy() {
  return (
    <div className="max-w-3xl mx-auto space-y-2 pb-12">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={28} className="text-brand-indigo" />
          <h1 className="font-display text-3xl font-bold text-surface-ink dark:text-white">Safety & Trust Policy</h1>
        </div>
        <p className="text-surface-muted text-sm">
          Propel Stack AI, LLC — PSAI-SAFETY-POLICY-v1.0 — Effective May 2026
        </p>
        <p className="mt-2 text-sm text-surface-ink/80 dark:text-white/80">
          This policy explains how Propel Stack AI protects your wellbeing, handles sensitive topics,
          and escalates to appropriate human support when needed. These are architectural commitments,
          not optional features.
        </p>
      </div>

      {/* Crisis Box — always visible, non-collapsible */}
      <CrisisBox />

      <Section icon={Brain} title="AI Guardrails — What Our AI Will Not Do">
        <p>Propel Stack AI uses large language models to provide life organization, coaching, and insights. To protect you, our AI systems have built-in guardrails that prevent the following:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>No medical diagnoses.</strong> The AI will not diagnose medical conditions, interpret lab results as medical advice, or recommend specific medications or dosages.</li>
          <li><strong>No legal advice.</strong> The AI does not provide legal advice, draft legally binding documents, or represent that its analysis is a substitute for licensed legal counsel.</li>
          <li><strong>No financial investment advice.</strong> The AI does not recommend specific securities, predict market movements, or tell you what to buy or sell.</li>
          <li><strong>No crisis counseling.</strong> When crisis language is detected, the AI pauses and directs you to hardcoded human resources (see above). It will not attempt to counsel you through a mental health emergency.</li>
          <li><strong>No identity impersonation.</strong> The AI does not claim to be a human therapist, doctor, lawyer, or financial advisor.</li>
          <li><strong>No toxic productivity shaming.</strong> The AI never shames missed streaks or low output. Framing is always forward-looking and neutral.</li>
        </ul>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-700 mt-2">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">AI HALLUCINATION PREVENTION</p>
          <p className="text-xs mt-1">When the AI is uncertain, it says so: "I'm not certain about this — want me to look deeper?" Confident wrong answers are prevented through memory verification before any factual reference is made.</p>
        </div>
      </Section>

      <Section icon={AlertTriangle} title="Sensitive Topic Detection" color="text-amber-500">
        <p>Our system monitors conversation patterns — not just keywords — to detect signals of:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Acute stress or burnout (work hours spike, self-care disappearance, sleep disruption)</li>
          <li>Financial anxiety and crisis indicators</li>
          <li>Mental health strain (tone, pattern, and context analysis)</li>
          <li>Sleep deprivation patterns correlated with mental health risk</li>
        </ul>
        <p>When these patterns are detected, the AI shifts into a supportive mode — pausing productivity tasks and gently checking in. Threshold-based crisis resource surfacing is automatic and hardcoded.</p>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700 mt-2">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">"NOT NOW" MODE</p>
          <p className="text-xs mt-1">Users can activate "Not Now" mode with a single tap. The AI shifts from task-driver to check-in mode — no reminders, no productivity pressure. Auto-expires after 24 hours with a gentle re-ask.</p>
        </div>
      </Section>

      <Section icon={Phone} title="Crisis Escalation Protocol" color="text-red-500">
        <p>When language consistent with self-harm or suicidal ideation is detected, the following protocol executes immediately and automatically:</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li><strong>AI session pauses.</strong> The ongoing conversation is suspended.</li>
          <li><strong>Crisis resources display immediately.</strong> The 988 Suicide & Crisis Lifeline, Crisis Text Line (HOME to 741741), and local emergency services are shown. These are hardcoded — never AI-generated.</li>
          <li><strong>Internal flag created.</strong> An anonymized safety event is logged for internal review. User identity is protected; only aggregate patterns are reviewed.</li>
          <li><strong>No further productivity suggestions.</strong> The session does not resume task suggestions until the user explicitly continues.</li>
        </ol>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-700 mt-2">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400">LEGAL AND ETHICAL FLOOR — NON-NEGOTIABLE</p>
          <p className="text-xs mt-1">Crisis escalation is an architectural constraint, not a feature. It cannot be turned off by any user, partner, or administrator. Child protection and mental health guardrails apply at every tier of the platform.</p>
        </div>
      </Section>

      <Section icon={Baby} title="Child Protection" color="text-purple-500">
        <p>Propel Stack AI takes child safety seriously. The following protections are in place:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>COPPA compliance.</strong> We do not knowingly collect personal information from children under 13 without verifiable parental consent.</li>
          <li><strong>Child profiles require Family Admin.</strong> Only a verified adult account holder can create and manage child profiles.</li>
          <li><strong>CSAM zero tolerance.</strong> Any suspected child sexual abuse material is immediately reported to the National Center for Missing & Exploited Children (NCMEC) CyberTipline and the relevant authorities. Our systems maintain a zero-tolerance policy with automatic detection and human review.</li>
          <li><strong>Age-appropriate content.</strong> AI responses are modulated based on profile age. Child profiles receive developmentally appropriate content only.</li>
          <li><strong>Parental visibility controls.</strong> Family administrators can review (but not read-lock) child activity, with appropriate privacy boundaries respected.</li>
        </ul>
        <p className="text-xs text-surface-muted mt-2">
          To report a child safety concern: <strong>safety@propelstack.ai</strong> — We respond to all reports within 24 hours.
        </p>
      </Section>

      <Section icon={Lock} title="Data Privacy & Memory Controls" color="text-teal-500">
        <p>Your data is yours. You have complete control over what Propel Stack AI knows about you:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Memory Health Card.</strong> View every memory the AI holds about you, flag items as stale, or delete them individually.</li>
          <li><strong>Soft Reset.</strong> Flag a memory namespace as outdated — "this isn't me anymore." The AI updates its model without purging historical data.</li>
          <li><strong>Full Reset.</strong> Purge all AI memory completely. Your data stays but the AI starts fresh.</li>
          <li><strong>Account Deletion.</strong> All personal data deleted within 30 days. Document Vault files deleted immediately upon request.</li>
          <li><strong>No data selling.</strong> We do not sell, rent, or share your personal information for cross-context behavioral advertising. Ever.</li>
          <li><strong>AI provider zero-retention.</strong> We use zero-retention agreements with AI providers (OpenAI, Anthropic) — your data is not used to train their models.</li>
        </ul>
        <p className="text-xs mt-2">See our full <a href="#/privacy" className="text-brand-indigo underline">Privacy Policy</a> for complete data handling details.</p>
      </Section>

      <Section icon={Eye} title="Transparency — What AI Can and Cannot Do" color="text-indigo-400">
        <ul className="list-disc pl-5 space-y-1">
          <li>AI recommendations are <strong>advisory only</strong> and do not produce legal, medical, or financial effects.</li>
          <li>The AI may make mistakes. Always verify important information with qualified professionals.</li>
          <li>AI-generated content (briefings, weekly reviews, insights) is labeled as AI-generated throughout the app.</li>
          <li>Propel Stack AI does not guarantee the accuracy, completeness, or timeliness of AI-generated content.</li>
          <li>When confidence is low, the AI discloses this explicitly rather than providing a confident wrong answer.</li>
        </ul>
      </Section>

      <Section icon={Heart} title="Mental Health Disclaimer" color="text-rose-500">
        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-4 border border-rose-200 dark:border-rose-700">
          <p className="font-semibold text-rose-700 dark:text-rose-400 mb-2">IMPORTANT: Propel Stack AI is NOT a mental health treatment</p>
          <p>Propel Stack AI — Life OS is a personal productivity and life organization platform. It is not:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>A licensed mental health treatment, therapy, or counseling service</li>
            <li>A substitute for professional mental health care</li>
            <li>A medical device under FDA or equivalent regulatory definitions</li>
            <li>A crisis intervention service</li>
          </ul>
          <p className="mt-2 text-sm">If you are experiencing a mental health crisis, please contact a qualified mental health professional or use the crisis resources listed at the top of this page.</p>
        </div>
      </Section>

      <Section icon={HandHeart} title="Reporting Safety Concerns">
        <p>To report a safety issue, vulnerability, or policy violation:</p>
        <div className="space-y-2 mt-2">
          <div className="flex items-center gap-2">
            <MessageCircle size={14} className="text-brand-indigo" />
            <span><strong>Safety concerns:</strong> safety@propelstack.ai</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-brand-indigo" />
            <span><strong>Security vulnerabilities:</strong> security@propelstack.ai</span>
          </div>
          <div className="flex items-center gap-2">
            <Baby size={14} className="text-purple-500" />
            <span><strong>Child safety:</strong> safety@propelstack.ai (Priority review within 24 hours)</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-teal-500" />
            <span><strong>Privacy requests:</strong> privacy@propelstack.ai</span>
          </div>
        </div>
        <p className="text-xs text-surface-muted mt-3">
          We acknowledge all safety reports within 24 hours and security vulnerability reports within 48 hours.
          We maintain a responsible disclosure program and publicly credit researchers (with permission) who
          report valid vulnerabilities.
        </p>
      </Section>

      {/* Footer */}
      <div className="text-center pt-4">
        <p className="text-xs text-surface-muted">
          Propel Stack AI, LLC — Safety & Trust Policy v1.0 — May 2026
        </p>
        <p className="text-xs text-surface-muted mt-1">
          Questions: <a href="mailto:safety@propelstack.ai" className="text-brand-indigo">safety@propelstack.ai</a>
        </p>
      </div>
    </div>
  );
}
