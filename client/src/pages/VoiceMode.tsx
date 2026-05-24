/**
 * Voice-First Ambient AI Mode — Enhancement 28
 * Propel Stack AI, LLC
 *
 * Push-to-talk interface using Web Speech API.
 * No always-on listening. No audio stored — transcripts only.
 */

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';

interface VoiceSession {
  id: string;
  transcript: string;
  intent_type: string;
  hub_routed: string;
  action_taken: string;
  response_text: string;
  duration_seconds: number | null;
  created_at: string;
}

interface ProcessResult {
  id: string;
  intent_type: string;
  hub_routed: string;
  action_taken: string;
  response_text: string;
}

interface MorningBriefing {
  briefing: string;
}

// ── Browser Speech Recognition shim ─────────────────────────────────────────
const SpeechRecognition =
  (typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || null;

export function VoiceMode() {
  const qc = useQueryClient();
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResult, setLastResult] = useState<ProcessResult | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(() => !!SpeechRecognition);
  const recognitionRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['voice-history'],
    queryFn: () => apiRequest<VoiceSession[]>('/api/voice/history'),
  });

  const { data: briefing } = useQuery({
    queryKey: ['morning-briefing'],
    queryFn: () => apiRequest<MorningBriefing>('/api/voice/morning-briefing'),
  });

  const processMutation = useMutation({
    mutationFn: (data: { transcript: string; duration_seconds: number }) =>
      apiRequest<ProcessResult>('/api/voice/process', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: (result) => {
      setLastResult(result);
      qc.invalidateQueries({ queryKey: ['voice-history'] });
      // Speak the response
      if ('speechSynthesis' in window && result.response_text) {
        const utt = new SpeechSynthesisUtterance(result.response_text);
        utt.rate = 1.0;
        utt.pitch = 1.0;
        utt.onstart = () => setSpeaking(true);
        utt.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(utt);
      }
    },
  });

  function startRecording() {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const t = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      setTranscript(t);
    };

    recognition.onend = () => {
      setRecording(false);
      if (transcript.trim()) {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        processMutation.mutate({ transcript: transcript.trim(), duration_seconds: duration });
      }
    };

    recognitionRef.current = recognition;
    startTimeRef.current = Date.now();
    setTranscript('');
    setLastResult(null);
    setRecording(true);
    recognition.start();
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setRecording(false);
  }

  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  const INTENT_ICONS: Record<string, string> = {
    log_entry: '📝', query: '🔍', reminder: '⏰', navigation: '🗺️', general_chat: '💬',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-surface-ink">Voice Mode</h1>
        <p className="text-sm text-surface-muted mt-1">
          Push-to-talk AI. Speak naturally — log workouts, mood, expenses, set reminders, ask questions.
        </p>
      </div>

      {/* Morning briefing */}
      {briefing?.briefing && (
        <div className="rounded-xl bg-brand-indigo/5 border border-brand-indigo/20 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span>🌅</span>
            <span className="text-sm font-semibold text-brand-indigo">Morning Briefing</span>
          </div>
          <p className="text-sm text-surface-ink">{briefing.briefing}</p>
          <button
            className="mt-2 text-xs text-brand-indigo hover:underline"
            onClick={() => {
              if ('speechSynthesis' in window) {
                const utt = new SpeechSynthesisUtterance(briefing.briefing);
                utt.onstart = () => setSpeaking(true);
                utt.onend = () => setSpeaking(false);
                window.speechSynthesis.speak(utt);
              }
            }}
          >
            🔊 Play aloud
          </button>
        </div>
      )}

      {!supported && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          ⚠️ Your browser does not support the Web Speech API. Voice mode requires Chrome or Edge.
          On iOS/Android, the native app will use the Capacitor speech plugin.
        </div>
      )}

      {/* Push-to-talk button */}
      <section className="card text-center py-10">
        <div className="relative inline-flex">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            disabled={!supported || processMutation.isPending}
            className={[
              'w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200 select-none',
              'text-4xl shadow-raised focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-indigo',
              recording
                ? 'bg-brand-coral scale-110 animate-pulse'
                : 'bg-brand-indigo hover:bg-brand-indigo/90 active:scale-95',
              (!supported || processMutation.isPending) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
            aria-label={recording ? 'Release to send' : 'Hold to speak'}
          >
            {recording ? '🎤' : speaking ? '🔊' : '🎙️'}
          </button>
          {recording && (
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-brand-coral font-semibold whitespace-nowrap">
              Listening…
            </span>
          )}
        </div>
        <p className="text-sm text-surface-muted mt-12">
          {supported ? 'Hold to speak. Release to send.' : 'Speech recognition not available in this browser.'}
        </p>
        {transcript && (
          <div className="mt-4 rounded-xl bg-surface-sunk px-4 py-3 text-sm text-surface-ink italic">
            "{transcript}"
          </div>
        )}
        {processMutation.isPending && (
          <p className="mt-3 text-sm text-surface-muted animate-pulse">Processing…</p>
        )}
        {lastResult && (
          <div className="mt-4 rounded-xl bg-brand-teal/5 border border-brand-teal/20 p-4 text-left">
            <div className="flex items-center gap-2 mb-1">
              <span>{INTENT_ICONS[lastResult.intent_type] ?? '💬'}</span>
              <span className="text-xs font-semibold text-brand-teal capitalize">
                {lastResult.intent_type.replace('_', ' ')}
                {lastResult.hub_routed !== 'none' && ` → ${lastResult.hub_routed}`}
              </span>
            </div>
            <p className="text-sm text-surface-ink">{lastResult.response_text}</p>
          </div>
        )}
      </section>

      {/* Voice history */}
      <section className="card">
        <h2 className="text-lg font-semibold text-surface-ink mb-4">Recent Voice Sessions</h2>
        {isLoading ? (
          <div className="py-6 text-center text-surface-muted text-sm animate-pulse">Loading…</div>
        ) : history.length === 0 ? (
          <p className="text-sm text-surface-muted text-center py-6">No voice sessions yet.</p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 20).map((s) => (
              <div key={s.id} className="rounded-xl bg-surface-sunk p-3">
                <div className="flex items-start gap-2">
                  <span className="text-base shrink-0">{INTENT_ICONS[s.intent_type] ?? '💬'}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-surface-ink italic">"{s.transcript}"</p>
                    <p className="text-xs text-surface-muted mt-0.5">{s.response_text}</p>
                    <p className="text-[10px] text-surface-muted/60 mt-0.5">{new Date(s.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-surface-muted text-center">
        Push-to-talk only — no always-on listening. No audio is stored, only text transcripts.
      </p>
    </div>
  );
}
