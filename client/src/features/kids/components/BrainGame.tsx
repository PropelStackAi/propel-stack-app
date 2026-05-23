import { useState, useCallback, useEffect } from 'react';
import { useAwardStars } from '../api';

interface Props {
  childId: string;
}

type GameType = 'math' | 'word' | 'memory';

// ── Math game ─────────────────────────────────────────────────────────────────

interface MathQ { q: string; answer: number; choices: number[] }

function genMath(): MathQ {
  const ops = ['+', '-', '×'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * 12) + 1;
  let b = Math.floor(Math.random() * 12) + 1;
  if (op === '-') { if (a < b) [a, b] = [b, a]; }
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const choices = new Set([answer]);
  while (choices.size < 4) choices.add(answer + Math.floor(Math.random() * 10) - 5);
  return { q: `${a} ${op} ${b} = ?`, answer, choices: [...choices].sort(() => Math.random() - 0.5) };
}

// ── Word game ──────────────────────────────────────────────────────────────────

interface WordQ { word: string; correct: string; choices: string[] }
const WORDS: WordQ[] = [
  { word: 'Enormous', correct: 'Very big', choices: ['Very big', 'Very small', 'Very fast', 'Very cold'] },
  { word: 'Brave',    correct: 'Not afraid', choices: ['Not afraid', 'Very tall', 'Very funny', 'Very quiet'] },
  { word: 'Ancient',  correct: 'Very old', choices: ['Very old', 'Very new', 'Very bright', 'Very soft'] },
  { word: 'Swift',    correct: 'Very fast', choices: ['Very fast', 'Very slow', 'Very loud', 'Very dark'] },
  { word: 'Tiny',     correct: 'Very small', choices: ['Very small', 'Very large', 'Very warm', 'Very rough'] },
  { word: 'Radiant',  correct: 'Very bright', choices: ['Very bright', 'Very dark', 'Very noisy', 'Very cold'] },
];

// ── Memory sequence game ────────────────────────────────────────────────────────

const EMOJIS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼'];

export function BrainGame({ childId }: Props): JSX.Element {
  const [gameType, setGameType] = useState<GameType>('math');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const awardStars = useAwardStars();

  // Math state
  const [mathQ, setMathQ] = useState<MathQ>(genMath);

  // Word state
  const [wordIdx, setWordIdx] = useState(0);
  const wordQ = WORDS[wordIdx % WORDS.length];

  // Memory state
  const [memSeq, setMemSeq] = useState<number[]>([]);
  const [userSeq, setUserSeq] = useState<number[]>([]);
  const [memPhase, setMemPhase] = useState<'show' | 'input' | 'result'>('show');
  const [showingIdx, setShowingIdx] = useState(-1);

  const resetFeedback = useCallback(() => {
    setTimeout(() => setFeedback(null), 800);
  }, []);

  function onCorrect() {
    setFeedback('correct');
    const newStreak = streak + 1;
    setStreak(newStreak);
    setScore((s) => s + 1);
    if (newStreak % 5 === 0) awardStars.mutate({ childId, stars: 1 });
    resetFeedback();
  }

  function onWrong() {
    setFeedback('wrong');
    setStreak(0);
    resetFeedback();
  }

  // Math handlers
  function answerMath(choice: number) {
    if (feedback) return;
    if (choice === mathQ.answer) { onCorrect(); setTimeout(() => setMathQ(genMath()), 900); }
    else onWrong();
  }

  // Word handlers
  function answerWord(choice: string) {
    if (feedback) return;
    if (choice === wordQ.correct) { onCorrect(); setTimeout(() => setWordIdx((i) => i + 1), 900); }
    else onWrong();
  }

  // Memory game
  useEffect(() => {
    if (gameType !== 'memory' || memPhase !== 'show') return;
    const newSeq = [...Array(Math.max(2, memSeq.length + 1))].map(() => Math.floor(Math.random() * 4));
    setMemSeq(newSeq);
    setUserSeq([]);
    let i = 0;
    const interval = setInterval(() => {
      setShowingIdx(newSeq[i] ?? -1);
      i++;
      if (i >= newSeq.length) { clearInterval(interval); setTimeout(() => { setShowingIdx(-1); setMemPhase('input'); }, 600); }
    }, 700);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memPhase, gameType]);

  function answerMemory(idx: number) {
    const next = [...userSeq, idx];
    setUserSeq(next);
    if (next[next.length - 1] !== memSeq[next.length - 1]) {
      onWrong();
      setTimeout(() => { setMemPhase('show'); }, 1200);
    } else if (next.length === memSeq.length) {
      onCorrect();
      setTimeout(() => { setMemPhase('show'); }, 1200);
    }
  }

  function switchGame(type: GameType) {
    setGameType(type);
    setFeedback(null);
    if (type === 'memory') setMemPhase('show');
  }

  const feedbackBg = feedback === 'correct' ? 'bg-green-100' : feedback === 'wrong' ? 'bg-red-100' : 'bg-green-50';

  return (
    <div className={`rounded-2xl border border-green-200 p-5 transition-colors ${feedbackBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg text-green-800">🎮 Brain Games</h3>
        <div className="flex items-center gap-3">
          {streak > 0 && <span className="text-xs font-bold text-amber-600">🔥 {streak} streak</span>}
          <span className="chip text-xs bg-green-100 text-green-700">Score: {score}</span>
        </div>
      </div>

      {/* Game type selector */}
      <div className="flex gap-2 mb-4">
        {(['math', 'word', 'memory'] as GameType[]).map((t) => (
          <button
            key={t}
            onClick={() => switchGame(t)}
            className={[
              'flex-1 text-xs font-semibold rounded-xl py-2 border transition-all',
              gameType === t
                ? 'bg-green-600 text-white border-green-600'
                : 'border-green-200 text-green-700 hover:bg-green-100',
            ].join(' ')}
          >
            {t === 'math' ? '➕ Math' : t === 'word' ? '📝 Words' : '🧠 Memory'}
          </button>
        ))}
      </div>

      {/* Math game */}
      {gameType === 'math' && (
        <div className="text-center">
          <div className="font-display font-extrabold text-4xl text-green-800 mb-5">{mathQ.q}</div>
          <div className="grid grid-cols-2 gap-3">
            {mathQ.choices.map((c) => (
              <button
                key={c}
                onClick={() => answerMath(c)}
                disabled={Boolean(feedback)}
                className="rounded-2xl bg-white border-2 border-green-200 py-4 text-xl font-bold text-green-800 hover:bg-green-100 hover:border-green-400 transition-all disabled:opacity-60"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Word game */}
      {gameType === 'word' && (
        <div className="text-center">
          <div className="font-display font-extrabold text-3xl text-green-800 mb-2">{wordQ.word}</div>
          <p className="text-sm text-green-600 mb-4">What does this word mean?</p>
          <div className="grid grid-cols-2 gap-3">
            {wordQ.choices.map((c) => (
              <button
                key={c}
                onClick={() => answerWord(c)}
                disabled={Boolean(feedback)}
                className="rounded-2xl bg-white border-2 border-green-200 py-3 text-sm font-semibold text-green-800 hover:bg-green-100 hover:border-green-400 transition-all disabled:opacity-60"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Memory game */}
      {gameType === 'memory' && (
        <div className="text-center">
          <p className="text-sm text-green-700 mb-4 font-semibold">
            {memPhase === 'show' ? 'Watch the sequence! 👀' : `Your turn! (${userSeq.length}/${memSeq.length})`}
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            {EMOJIS.slice(0, 4).map((em, idx) => (
              <button
                key={idx}
                onClick={() => memPhase === 'input' && answerMemory(idx)}
                disabled={memPhase !== 'input' || Boolean(feedback)}
                className={[
                  'rounded-2xl text-4xl py-5 border-2 transition-all',
                  showingIdx === idx
                    ? 'bg-green-300 border-green-500 scale-105'
                    : memPhase === 'input'
                    ? 'bg-white border-green-200 hover:bg-green-100 hover:border-green-400 cursor-pointer'
                    : 'bg-white border-green-200 opacity-60',
                ].join(' ')}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feedback flash */}
      {feedback && (
        <div className={`mt-4 text-center text-lg font-bold ${feedback === 'correct' ? 'text-green-700' : 'text-red-600'}`}>
          {feedback === 'correct' ? '✅ Correct! Great job! 🎉' : '❌ Not quite — try again!'}
        </div>
      )}
    </div>
  );
}
