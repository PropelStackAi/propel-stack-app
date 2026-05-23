import { useState, useRef, useCallback } from 'react';
import { useStoryAI, useTTS, useAwardStars } from '../api';

interface Props {
  childId: string;
  isBedtime?: boolean;
}

const STORY_PROMPTS = [
  'A dragon who is afraid of fire',
  'A robot who learns to dance',
  'A tiny elephant who goes on a big adventure',
  'A kid who discovers a secret garden',
  'A friendly ghost who wants to make friends',
  'A bear who opens a bakery',
];

export function StoryGenerator({ childId, isBedtime = false }: Props): JSX.Element {
  const [prompt, setPrompt] = useState('');
  const [story, setStory] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [ttsMode, setTtsMode] = useState<'idle' | 'loading' | 'playing' | 'done'>('idle');
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const storyMutation = useStoryAI();
  const ttsMutation = useTTS();
  const awardStars = useAwardStars();

  function generate() {
    if (!prompt.trim()) return;
    storyMutation.mutate(
      { childId, prompt: prompt.trim() },
      {
        onSuccess: (data) => {
          setStory(data.text);
          awardStars.mutate({ childId, stars: 2 });
        },
      },
    );
  }

  const readAloud = useCallback(() => {
    if (!story) return;
    setTtsMode('loading');
    // First try OpenAI TTS via server
    ttsMutation.mutate(story, {
      onSuccess: (res) => {
        if (!res.stub && res.audioBase64) {
          // Real TTS audio from server
          const audio = new Audio(`data:audio/mp3;base64,${res.audioBase64}`);
          audioRef.current = audio;
          audio.onended = () => { setTtsMode('done'); setIsReading(false); };
          audio.play();
          setTtsMode('playing');
          setIsReading(true);
        } else {
          // Fallback: Web Speech API
          useBrowserTTS(story);
        }
      },
      onError: () => useBrowserTTS(story),
    });
  }, [story, ttsMutation]);

  function useBrowserTTS(text: string) {
    if (!('speechSynthesis' in window)) {
      setTtsMode('idle');
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = isBedtime ? 0.85 : 1.0;
    utt.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => v.name.includes('Samantha') || v.name.includes('Google US English'));
    if (preferred) utt.voice = preferred;
    utt.onstart = () => { setTtsMode('playing'); setIsReading(true); };
    utt.onend = () => { setTtsMode('done'); setIsReading(false); };
    utt.onerror = () => { setTtsMode('idle'); setIsReading(false); };
    speechRef.current = utt;
    window.speechSynthesis.speak(utt);
  }

  function stopReading() {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    setIsReading(false);
    setTtsMode('idle');
  }

  const bg = isBedtime
    ? 'bg-gradient-to-br from-indigo-950 to-purple-950 text-white'
    : 'bg-gradient-to-br from-purple-50 to-pink-50';
  const inputBg = isBedtime ? 'bg-white/10 text-white placeholder:text-white/40 border-white/20' : '';

  return (
    <div className={`rounded-2xl p-5 ${bg}`}>
      <h3 className={`font-display font-bold text-lg mb-1 ${isBedtime ? 'text-white' : 'text-purple-800'}`}>
        {isBedtime ? '🌙 Bedtime Story' : '📚 Story Generator'}
      </h3>
      <p className={`text-sm mb-4 ${isBedtime ? 'text-white/70' : 'text-purple-600'}`}>
        {isBedtime ? 'A cozy story to wind down your day ✨' : 'What should your story be about?'}
      </p>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2 mb-3">
        {STORY_PROMPTS.slice(0, 3).map((p) => (
          <button
            key={p}
            onClick={() => setPrompt(p)}
            className={[
              'text-xs rounded-full px-3 py-1.5 border transition-all',
              isBedtime
                ? 'border-white/20 text-white/70 hover:bg-white/10'
                : 'border-purple-200 text-purple-700 hover:bg-purple-100',
              prompt === p ? (isBedtime ? 'bg-white/20' : 'bg-purple-200') : '',
            ].join(' ')}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          className={[
            'flex-1 rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple',
            inputBg || 'bg-white border-purple-200',
          ].join(' ')}
          placeholder="Type your story idea…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generate()}
          maxLength={200}
        />
        <button
          onClick={generate}
          disabled={storyMutation.isPending || !prompt.trim()}
          className="btn bg-brand-purple text-white hover:bg-brand-purple/90 disabled:opacity-50 px-4"
        >
          {storyMutation.isPending ? '✨' : '🚀'}
        </button>
      </div>

      {/* Story output */}
      {story && (
        <div className={`rounded-xl p-4 text-sm leading-relaxed mb-4 ${isBedtime ? 'bg-white/10 text-white' : 'bg-white text-surface-ink'}`}>
          {story}
        </div>
      )}

      {/* TTS controls */}
      {story && (
        <div className="flex gap-2">
          {!isReading ? (
            <button
              onClick={readAloud}
              disabled={ttsMode === 'loading'}
              className={`flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2 transition-all ${
                isBedtime
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              {ttsMode === 'loading' ? '⏳ Loading…' : '🔊 Read aloud'}
            </button>
          ) : (
            <button
              onClick={stopReading}
              className={`flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2 ${
                isBedtime ? 'bg-red-500/30 text-white' : 'bg-red-100 text-red-700'
              }`}
            >
              ⏹ Stop
            </button>
          )}
          <button
            onClick={() => { setStory(''); setPrompt(''); setTtsMode('idle'); }}
            className={`text-sm px-4 py-2 rounded-xl ${isBedtime ? 'text-white/60 hover:text-white' : 'text-surface-muted hover:text-surface-ink'}`}
          >
            New story
          </button>
        </div>
      )}

      {storyMutation.error && (
        <p className={`text-xs mt-2 ${isBedtime ? 'text-red-300' : 'text-red-600'}`}>
          {(storyMutation.error as Error).message || 'Could not generate story. Try again!'}
        </p>
      )}
    </div>
  );
}
