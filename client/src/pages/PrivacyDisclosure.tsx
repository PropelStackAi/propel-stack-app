/**
 * Privacy Policy / Disclosure — Propel Stack AI, LLC
 * Version 1.0 — Effective May 2026
 *
 * Covers: data collection, AI processing, CCPA, GDPR, data retention,
 * security, cookies, user rights, and contact information.
 */

import { Lock, Eye, Globe, Shield, Database, Mail, ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

// ─── Accordion section ────────────────────────────────────────────────────────

function Section({
  id, icon: Icon, title, children,
}: {
  id?: string;
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div id={id} className="card mb-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-brand-indigo shrink-0" />
          <h2 className="font-semibold text-base text-surface-ink dark:text-white">{title}</h2>
        </div>
        {open ? <ChevronUp size={16} className="text-surface-muted shrink-0" /> : <ChevronDown size={16} className="text-surface-muted shrink-0" />}
      </button>
      {open && (
        <div className="mt-4 space-y-3 text-sm text-surface-ink/80 dark:text-white/80 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-surface-ink/10 dark:border-white/10 mt-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-brand-indigo/10 dark:bg-brand-indigo/20">
            {headers.map((h) => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-surface-ink dark:text-white">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-surface-ink/[0.06] dark:border-white/[0.06]">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-surface-ink/80 dark:text-white/70">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PrivacyDisclosure() {
  return (
    <div className="max-w-3xl mx-auto space-y-1 pb-12">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Lock size={28} className="text-brand-indigo" />
          <h1 className="font-display text-3xl font-bold text-surface-ink dark:text-white">Privacy Policy</h1>
        </div>
        <p className="text-surface-muted text-sm">
          Propel Stack AI, LLC — Version 1.0 — Effective: <strong>[Launch Date]</strong>
        </p>
        <div className="mt-3 bg-brand-indigo/5 dark:bg-brand-indigo/10 rounded-xl p-4 text-sm">
          <p className="font-semibold text-surface-ink dark:text-white mb-1">The Short Version</p>
          <ul className="space-y-1 text-surface-ink/80 dark:text-white/70">
            <li>✅ We collect only what we need to run Life OS</li>
            <li>✅ We do not sell your personal information — ever</li>
            <li>✅ Your AI data is not used to train AI models (zero-retention agreements)</li>
            <li>✅ You can delete everything within 30 days of request</li>
            <li>✅ Health and financial data receive heightened protection</li>
          </ul>
        </div>
      </div>

      <Section icon={Database} title="1. What Information We Collect">
        <p className="font-semibold">1.1 Account & Profile Data</p>
        <p>Name, email address, display name, plan tier, and account preferences. Required to provide the service.</p>

        <p className="font-semibold mt-3">1.2 Content You Create</p>
        <p>Journal entries, mood logs, goals, tasks, memories, health logs, financial data, and anything else you add to Life OS. This data is yours and stored only to provide the service to you.</p>

        <p className="font-semibold mt-3">1.3 AI Interaction Data</p>
        <p>Conversations with our AI systems. We process this to generate responses and build your AI memory. AI providers (OpenAI, Anthropic) process your inputs under zero-retention agreements — they do not retain your data or use it to train models.</p>

        <p className="font-semibold mt-3">1.4 Usage Analytics</p>
        <p>Anonymized feature usage via PostHog (opt-in for EU/UK users). We track which features are used to improve the product — not to build ad profiles.</p>

        <Table
          headers={['Category', 'Collected']}
          rows={[
            ['Identifiers (name, email, IP)', 'Yes'],
            ['Financial information', 'Yes — tokenized via Stripe (we never see card numbers)'],
            ['Health data', 'Yes — with explicit consent, encrypted at rest'],
            ['Biometric information', 'No'],
            ['Internet activity (usage analytics)', 'Yes — anonymized, opt-in for EU/UK'],
            ['Geolocation', 'Yes — with consent, for relevant features'],
            ['Audio/visual information', 'No (voice transcripts stored as text only)'],
            ['Children\'s data (under 13)', 'Only with verifiable parental consent (COPPA)'],
            ['AI inferences', 'Yes — AI-generated recommendations, stored in memory system'],
          ]}
        />
      </Section>

      <Section icon={Eye} title="2. How We Use Your Information">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Service delivery:</strong> Providing Life OS features, generating AI responses, maintaining your account.</li>
          <li><strong>AI personalization:</strong> Building your AI memory to provide context-aware responses across sessions.</li>
          <li><strong>Safety:</strong> Detecting crisis patterns and surfacing emergency resources. Preventing fraud and abuse.</li>
          <li><strong>Product improvement:</strong> Analyzing anonymized usage patterns to improve features.</li>
          <li><strong>Communications:</strong> Sending weekly reviews, morning briefings, and important account notices.</li>
          <li><strong>Billing:</strong> Processing subscription payments via Stripe.</li>
        </ul>
        <p className="mt-2 text-xs text-surface-muted">We do not use your data for advertising, behavioral tracking, or sale to third parties.</p>
      </Section>

      <Section icon={Globe} title="3. Data Sharing & Third Parties">
        <p>We share your data only with:</p>
        <Table
          headers={['Recipient', 'Purpose', 'Your Data']}
          rows={[
            ['OpenAI / Anthropic', 'AI response generation', 'Zero-retention; not used for training'],
            ['Stripe', 'Payment processing', 'Payment data only; PCI DSS Level 1'],
            ['PostHog', 'Product analytics', 'Anonymized event data; opt-in EU/UK'],
            ['Cloudflare R2', 'Document Vault storage', 'Encrypted files only'],
            ['Railway', 'Server hosting (US)', 'All app data; data processing agreement in place'],
          ]}
        />
        <p className="mt-3 font-semibold">We NEVER:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sell your personal information</li>
          <li>Share your data for cross-context behavioral advertising</li>
          <li>Allow third-party advertising networks on our platform</li>
          <li>Share your health or financial data with employers or insurers</li>
        </ul>
        <p className="mt-3 font-semibold">International Transfers</p>
        <p>Propel Stack AI is based in the United States. EU/EEA/UK data transfers use Standard Contractual Clauses (SCCs) approved by the European Commission and the UK IDTA.</p>
      </Section>

      <Section icon={Lock} title="4. Your Rights (CCPA, GDPR, UK GDPR)">
        <p className="font-semibold">Rights for All Users</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Right to Access:</strong> Request a copy of all data we hold about you.</li>
          <li><strong>Right to Correct:</strong> Request correction of inaccurate data.</li>
          <li><strong>Right to Delete:</strong> Request deletion of your account and data (30-day window, Document Vault immediate).</li>
          <li><strong>Right to Portability:</strong> Receive your data in a machine-readable format.</li>
          <li><strong>Right to Opt Out of Sale/Sharing:</strong> We don't sell. Nothing to opt out of, but you have this right.</li>
        </ul>

        <p className="font-semibold mt-3">GDPR-Specific Rights (EU/EEA/UK)</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Right to Erasure / Right to Be Forgotten (Art. 17)</li>
          <li>Right to Restriction of Processing (Art. 18)</li>
          <li>Right to Object (Art. 21) — including profiling</li>
          <li>Right to Withdraw Consent at any time without penalty</li>
          <li>Right Not to Be Subject to Automated Decision-Making — Life OS AI recommendations are advisory only and produce no legal effects</li>
        </ul>

        <div className="bg-brand-indigo/5 dark:bg-brand-indigo/10 rounded-lg p-3 mt-3">
          <p className="font-semibold text-sm">How to Exercise Your Rights</p>
          <p className="text-xs mt-1">Email: <strong>privacy@propelstack.ai</strong> with subject line "Privacy Rights Request"</p>
          <p className="text-xs">In-app: Settings → Privacy → Request My Data or Delete Account</p>
          <p className="text-xs mt-1">Response times: CCPA — 45 calendar days | GDPR — 30 calendar days</p>
        </div>

        <Table
          headers={['Processing Activity', 'Legal Basis (GDPR)']}
          rows={[
            ['Account creation and service delivery', 'Art. 6(1)(b) — Contract performance'],
            ['AI feature processing', 'Art. 6(1)(b) — Contract performance'],
            ['Security and fraud prevention', 'Art. 6(1)(f) — Legitimate interests'],
            ['Marketing communications', 'Art. 6(1)(a) — Consent'],
            ['Processing health data', 'Art. 9(2)(a) — Explicit consent'],
            ['Processing children\'s data', 'Art. 6(1)(a) + Art. 8 — Parental consent'],
          ]}
        />
      </Section>

      <Section icon={Database} title="5. Data Retention">
        <Table
          headers={['Data Type', 'Retention Period']}
          rows={[
            ['Account & profile data', '30 days after account deletion request'],
            ['AI conversation history', 'User-controlled: 7, 30, 90 days, or indefinitely'],
            ['Document Vault files', 'Immediate deletion upon request'],
            ['Payment records', '7 years (tax/accounting regulations)'],
            ['OAuth tokens', 'Revoked and deleted within 24 hours of account deletion'],
            ['Infrastructure backups', '90 days (then permanently purged)'],
            ['Fraud prevention identifiers', 'Up to 3 years (hashed email + account ID only)'],
          ]}
        />
        <p className="text-xs text-surface-muted mt-2">After account deletion, residual data may exist in backups for up to 90 days before complete purge.</p>
      </Section>

      <Section icon={Shield} title="6. Security">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Data at rest (Document Vault):</strong> AES-256 encryption before writing to Cloudflare R2.</li>
          <li><strong>Data in transit:</strong> TLS 1.3 for all data between your device and our servers.</li>
          <li><strong>Database:</strong> Encrypted at rest via PostgreSQL/Railway infrastructure controls.</li>
          <li><strong>OAuth tokens:</strong> Encrypted at rest using AES-256 before storage.</li>
          <li><strong>Authentication:</strong> Password hashing via bcrypt. We never store plaintext passwords.</li>
          <li><strong>2FA:</strong> Available for all accounts; required for Family Admin accounts with child profiles.</li>
          <li><strong>API security:</strong> Keys stored in environment variables, never in client-side code or public repositories.</li>
        </ul>
        <p className="mt-2"><strong>SOC 2 Type II:</strong> Actively pursuing certification. Current status: In progress.</p>
        <p><strong>PCI DSS:</strong> Payment card data handled exclusively by Stripe (Level 1 PCI DSS certified). We are not in PCI scope.</p>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-700 mt-2">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">VULNERABILITY DISCLOSURE</p>
          <p className="text-xs mt-1">Found a security vulnerability? Report it to <strong>security@propelstack.ai</strong>. We acknowledge within 48 hours. Please do not publicly disclose before we have a chance to remediate. We credit researchers publicly (with permission).</p>
        </div>
      </Section>

      <Section icon={Globe} title="7. Cookies & Tracking">
        <Table
          headers={['Cookie Type', 'Purpose', 'Consent Required']}
          rows={[
            ['Strictly Necessary', 'Session management, authentication, security tokens', 'No — required to function'],
            ['Functional', 'Theme, language, notification settings', 'No — enhance functionality without tracking'],
            ['Analytics (PostHog)', 'Feature usage, session length', 'Yes — opt-in (EU/UK only auto-opt-out)'],
            ['Marketing Pixels', 'Meta Pixel, Google Ads conversion', 'Yes — opt-in EU/UK; opt-out available US'],
          ]}
        />
        <p className="mt-3">We honor browser Do Not Track (DNT) signals. When DNT is detected, analytics and marketing pixel tracking are disabled for that session.</p>
        <p className="mt-2">We do not permit any third-party advertising networks to place tracking cookies on our platform.</p>
        <p className="mt-2 font-semibold">Manage Cookies:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>In-app: Settings → Privacy → Cookie Preferences</li>
          <li>PostHog opt-out: posthog.com/privacy</li>
        </ul>
      </Section>

      <Section icon={Mail} title="8. Contact & Data Protection Officer">
        <div className="space-y-3">
          <div>
            <p className="font-semibold">Privacy Requests</p>
            <p>Email: <strong>privacy@propelstack.ai</strong></p>
            <p className="text-xs text-surface-muted">Subject line: "Privacy Rights Request" — Response within 5 business days for inquiries; statutory deadlines for rights requests</p>
          </div>
          <div>
            <p className="font-semibold">Data Protection Officer (EU/UK Users)</p>
            <p>Email: <strong>dpo@propelstack.ai</strong></p>
            <p className="text-xs text-surface-muted">Required for EU/EEA/UK users under GDPR. Our DPO oversees GDPR compliance and serves as point of contact for supervisory authorities.</p>
          </div>
          <div>
            <p className="font-semibold">Supervisory Authorities</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>EU: Your local Data Protection Authority (edpb.europa.eu)</li>
              <li>UK: Information Commissioner's Office (ico.org.uk)</li>
              <li>California: California Privacy Protection Agency (cppa.ca.gov)</li>
              <li>US (general): Federal Trade Commission (ftc.gov)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold">Policy Changes</p>
            <p className="text-xs">We notify you of material changes via email at least 30 days before they take effect, and via in-app notification. Policy at: propelstackai.com/privacy</p>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <div className="text-center pt-6">
        <p className="text-xs text-surface-muted">
          Propel Stack AI, LLC — Privacy Policy Version 1.0
        </p>
        <p className="text-xs text-surface-muted mt-1">
          Questions: <a href="mailto:privacy@propelstack.ai" className="text-brand-indigo">privacy@propelstack.ai</a>
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <a href="#/safety" className="text-xs text-brand-indigo underline">Safety & Trust Policy</a>
          <span className="text-surface-muted">•</span>
          <a href="mailto:privacy@propelstack.ai" className="text-xs text-brand-indigo underline">Request My Data</a>
          <span className="text-surface-muted">•</span>
          <a href="mailto:privacy@propelstack.ai" className="text-xs text-brand-indigo underline">Delete My Account</a>
        </div>
      </div>
    </div>
  );
}
