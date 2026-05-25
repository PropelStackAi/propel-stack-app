// ─── Referral Hub — Enhancement 30 (Referral Loop) ───────────────────────────
// Propel Stack AI, LLC

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift, Copy, Check, Share2, Users, Zap, ExternalLink, Mail, MessageCircle } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';
import { analytics } from '../lib/analytics';

interface ReferralCode {
  code: string;
  created_at: string;
}

interface ReferralStats {
  referral_count: number;
  token_credits_earned: number;
  conversions: Array<{
    id: number;
    created_at: string;
  }>;
}

interface ShareText {
  text: string;
}

function useReferralCode() {
  return useQuery({
    queryKey: ['referral-code'],
    queryFn: () => apiRequest<ReferralCode>('/api/referral/my-code'),
  });
}

function useReferralStats() {
  return useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => apiRequest<ReferralStats>('/api/referral/stats'),
  });
}

function useShareText() {
  return useQuery({
    queryKey: ['referral-share-text'],
    queryFn: () => apiRequest<ShareText>('/api/referral/share-text'),
  });
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy', onCopied }: { text: string; label?: string; onCopied?: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
        copied
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-brand-indigo/10 text-brand-indigo hover:bg-brand-indigo/20'
      }`}
      aria-label={copied ? 'Copied!' : label}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ─── Share Channel Buttons ────────────────────────────────────────────────────

function ShareChannels({ shareText, code }: { shareText: string; code: string }) {
  const url = `https://propelstackai.com?ref=${code}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl  = encodeURIComponent(url);

  const channels = [
    {
      key: 'twitter',
      label: 'X / Twitter',
      icon: <ExternalLink size={14} />,
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      color: 'bg-black text-white hover:bg-black/80 dark:bg-white/10 dark:hover:bg-white/20',
    },
    {
      key: 'email',
      label: 'Email',
      icon: <Mail size={14} />,
      href: `mailto:?subject=Check%20out%20Propel%20Stack%20AI&body=${encodedText}%0A%0A${encodedUrl}`,
      color: 'bg-surface-sunk text-surface-ink hover:bg-surface-muted/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20',
    },
    {
      key: 'sms',
      label: 'Text',
      icon: <MessageCircle size={14} />,
      href: `sms:?body=${encodedText}%20${encodedUrl}`,
      color: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50',
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {channels.map(ch => (
        <a
          key={ch.key}
          href={ch.href}
          target={ch.key !== 'email' && ch.key !== 'sms' ? '_blank' : undefined}
          rel="noopener noreferrer"
          onClick={() => analytics.referralShareClicked(ch.key)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${ch.color}`}
        >
          {ch.icon}
          {ch.label}
        </a>
      ))}
    </div>
  );
}

// ─── Stats Cards ──────────────────────────────────────────────────────────────

function StatCard({ icon, value, label, color }: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-xl font-display font-bold text-surface-ink dark:text-white">{value}</div>
        <div className="text-xs text-surface-muted">{label}</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ReferralHub() {
  const { data: codeData,  isLoading: codeLoading  } = useReferralCode();
  const { data: statsData, isLoading: statsLoading } = useReferralStats();
  const { data: shareData                           } = useShareText();

  const code     = codeData?.code ?? '';
  const stats    = statsData ?? { referral_count: 0, token_credits_earned: 0, conversions: [] };
  const shareMsg = shareData?.text ?? `I've been using Propel Stack AI to manage my entire life in one place. It's incredible! Use my code ${code} for 500 bonus AI tokens.`;

  if (codeLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-sunk rounded-lg animate-pulse" />
        <div className="h-32 bg-surface-sunk rounded-xl2 animate-pulse" />
        <div className="h-32 bg-surface-sunk rounded-xl2 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Gift size={22} className="text-brand-coral" />
          <h1 className="font-display text-2xl font-bold text-surface-ink dark:text-white">Referral Hub</h1>
        </div>
        <p className="text-sm text-surface-muted">
          Share Propel Stack AI with friends. You both earn <strong className="text-surface-ink dark:text-white">500 AI tokens</strong> when they join.
        </p>
      </div>

      {/* Stats row */}
      {!statsLoading && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Users size={18} className="text-brand-indigo" />}
            value={stats.referral_count}
            label="Friends referred"
            color="bg-brand-indigo/10"
          />
          <StatCard
            icon={<Zap size={18} className="text-brand-coral" />}
            value={`+${stats.token_credits_earned.toLocaleString()}`}
            label="Tokens earned"
            color="bg-brand-coral/10"
          />
        </div>
      )}

      {/* Referral code card */}
      <div className="card space-y-4">
        <div>
          <p className="label">Your unique code</p>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1 font-mono text-2xl font-bold tracking-widest text-brand-indigo dark:text-brand-indigo/90 bg-brand-indigo/5 dark:bg-brand-indigo/10 rounded-xl px-4 py-3 border border-brand-indigo/20 select-all">
              {code || '——'}
            </div>
            <CopyButton
              text={code}
              label="Copy code"
              onCopied={() => analytics.referralLinkCopied()}
            />
          </div>
        </div>

        <div>
          <p className="label">Your referral link</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 input font-mono text-xs truncate cursor-text select-all" style={{ paddingTop: '0.375rem', paddingBottom: '0.375rem' }}>
              {`https://propelstackai.com?ref=${code}`}
            </div>
            <CopyButton
              text={`https://propelstackai.com?ref=${code}`}
              label="Copy link"
              onCopied={() => analytics.referralLinkCopied()}
            />
          </div>
        </div>
      </div>

      {/* Share card */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Share2 size={16} className="text-surface-muted" />
          <p className="font-semibold text-sm text-surface-ink dark:text-white">Share with friends</p>
        </div>

        <div className="rounded-xl bg-surface-sunk dark:bg-white/5 p-3 text-sm text-surface-ink dark:text-white/80 leading-relaxed">
          {shareMsg}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ShareChannels shareText={shareMsg} code={code} />
          <CopyButton
            text={shareMsg}
            label="Copy message"
            onCopied={() => analytics.referralLinkCopied()}
          />
        </div>
      </div>

      {/* How it works */}
      <div className="card space-y-3">
        <p className="font-semibold text-sm text-surface-ink dark:text-white">How it works</p>
        <ol className="space-y-2">
          {[
            { step: '1', text: 'Share your code or link with a friend' },
            { step: '2', text: 'They sign up and enter your code' },
            { step: '3', text: 'You both get 500 free AI tokens immediately' },
            { step: '4', text: 'No limit — refer as many friends as you like!' },
          ].map(({ step, text }) => (
            <li key={step} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-indigo text-white text-xs font-bold grid place-items-center shrink-0">
                {step}
              </span>
              <span className="text-sm text-surface-ink dark:text-white/80 pt-0.5">{text}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Recent referrals */}
      {stats.conversions.length > 0 && (
        <div className="card space-y-3">
          <p className="font-semibold text-sm text-surface-ink dark:text-white">Recent referrals</p>
          <ul className="divide-y divide-surface-ink/[0.06] dark:divide-white/[0.06]">
            {stats.conversions.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between">
                <span className="text-sm text-surface-ink dark:text-white/80">Friend joined</span>
                <div className="flex items-center gap-2">
                  <span className="chip text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                    +500 tokens
                  </span>
                  <span className="text-xs text-surface-muted">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
