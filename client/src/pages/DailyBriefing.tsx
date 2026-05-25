/**
 * AI Daily Briefing (Cross-Hub) — Session 14 Enhancement 2
 * Propel Stack AI, LLC
 *
 * Full-page personalized briefing pulling from every hub simultaneously.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sun, Moon, Sunrise, RefreshCw, ChevronDown, ChevronUp, Volume2, History } from 'lucide-react';
import { apiRequest } from '../lib/apiRequest';
import { Link } from 'wouter';

interface BriefingSection {
  hub: string;
  headline: string;
  detail: string;
  cta_url: string;
}

interface BriefingData {
  greeting: string;
  sections: BriefingSection[];
  actions: string[];
  briefing_date: string;
  cached: boolean;
  read_at?: string;
}

function getTimeIcon() {
  const h = new Date().getHours();
  if (h < 6) return Moon;
  if (h < 12) return Sunrise;
  return Sun;
}

function SectionCard({ section }: { section: BriefingSection }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="card">
      <button className="w-full flex items-center justify-between text-left gap-3" onClick={() => setOpen(!open)}>
        <div>
          <span className="chip bg-brand-indigo/10 text-brand-indigo border-transparent text-xs mb-1">{section.hub}</span>
          <p className="font-display font-bold text-sm text-surface-ink mt-1">{section.headline}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-surface-muted flex-shrink-0" /> : <ChevronDown size={16} className="text-surface-muted flex-shrink-0" />}
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t border-surface-ink/[0.06]">
          <p className="text-sm text-surface-muted">{section.detail}</p>
          {section.cta_url && (
            <Link href={section.cta_url}>
              <span className="text-xs text-brand-teal font-semibold mt-2 inline-block hover:underline">Go to {section.hub} →</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function DailyBriefing() {
  const qc = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const TimeIcon = getTimeIcon();

  const { data: briefing, isLoading } = useQuery({
    queryKey: ['daily-briefing', 'today'],
    queryFn: () => apiRequest<BriefingData>('/api/daily-briefing/today'),
    staleTime: 60 * 60_000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['daily-briefing', 'history'],
    queryFn: () => apiRequest<BriefingData[]>('/api/daily-briefing/history'),
    enabled: showHistory,
    staleTime: 30 * 60_000,
  });

  const regen = useMutation({
    mutationFn: () => apiRequest('/api/daily-briefing/generate', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-briefing', 'today'] }),
  });

  const speakBriefing = () => {
    if (!briefing || !window.speechSynthesis) return;
    const text = `${briefing.greeting}. ${briefing.sections.map((s) => `${s.hub}: ${s.headline}. ${s.detail}`).join('. ')}`;
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    window.speechSynthesis.speak(utt);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-surface-raised rounded w-64" />
        <div className="h-32 bg-surface-raised rounded-2xl" />
        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-surface-raised rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="chip bg-brand-coral/10 text-brand-coral border-transparent ring-1 ring-brand-coral/20">Life OS</span>
        <span className="chip text-surface-muted">Daily Briefing</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-surface-ink">Your Briefing</h1>
          <p className="text-sm text-surface-muted mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={speakBriefing} className="btn-ghost flex items-center gap-1.5 text-sm" title="Read aloud">
            <Volume2 size={15} />
          </button>
          <button onClick={() => setShowHistory(!showHistory)} className="btn-ghost flex items-center gap-1.5 text-sm">
            <History size={15} /> History
          </button>
          <button onClick={() => regen.mutate()} disabled={regen.isPending} className="btn-ghost flex items-center gap-1.5 text-sm disabled:opacity-50">
            <RefreshCw size={15} className={regen.isPending ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Greeting Card */}
      {briefing && (
        <>
          <div className="card mb-6" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
            <div className="flex items-start gap-4">
              <div className="rounded-2xl p-3 bg-white/10 flex-shrink-0">
                <TimeIcon size={24} color="white" />
              </div>
              <div>
                <p className="font-display font-extrabold text-2xl text-white">{briefing.greeting}</p>
                {briefing.cached && <p className="text-xs text-white/60 mt-1">Cached · tap Refresh to regenerate</p>}
              </div>
            </div>
          </div>

          {/* Section Cards */}
          <div className="space-y-3 mb-6">
            {(briefing.sections ?? []).map((section, i) => (
              <SectionCard key={i} section={section} />
            ))}
          </div>

          {/* Action Items */}
          {briefing.actions && briefing.actions.length > 0 && (
            <div className="card mb-6">
              <h3 className="font-display font-bold text-sm text-surface-ink mb-3">Today's Action Items</h3>
              <ul className="space-y-2">
                {briefing.actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-surface-muted">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-brand-teal/10 text-brand-teal flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* History */}
      {showHistory && (
        <div className="card">
          <h3 className="font-display font-bold text-sm text-surface-ink mb-3">Past Briefings</h3>
          {history.length === 0 ? (
            <p className="text-sm text-surface-muted text-center py-4">No past briefings yet</p>
          ) : (
            <div className="space-y-2">
              {history.slice(1).map((b, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-surface-ink/[0.06] last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-surface-ink">{b.briefing_date}</p>
                    <p className="text-xs text-surface-muted truncate max-w-xs">{b.greeting}</p>
                  </div>
                  <span className="text-xs text-surface-muted">{b.sections?.length ?? 0} sections</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
