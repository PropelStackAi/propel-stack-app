// ─── Flashcards — SM-2 spaced repetition ─────────────────────────────────────
// Session 14 (Bug Fix) — Propel Stack AI, LLC

import { useState } from 'react';
import {
  useDecks,
  useCreateDeck,
  useDeleteDeck,
  useDeckCards,
  useCreateCard,
  useReviewCard,
  useDueCards,
} from '../api';
import type { FlashcardDeck } from '../types';

type View = 'decks' | 'cards' | 'review';

export function Flashcards(): JSX.Element {
  const [view, setView] = useState<View>('decks');
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [showNewCard, setShowNewCard] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [deckSubject, setDeckSubject] = useState('');
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const { data: decksData } = useDecks();
  const { data: cardsData } = useDeckCards(activeDeck?.id ?? null);
  const { data: dueData } = useDueCards();
  const createDeck = useCreateDeck();
  const deleteDeck = useDeleteDeck();
  const createCard = useCreateCard();
  const reviewCard = useReviewCard();

  const decks = decksData?.decks ?? [];
  const cards = cardsData?.cards ?? [];
  const dueCards = dueData?.cards ?? [];
  const reviewCards = view === 'review' ? dueCards : [];
  const currentCard = reviewCards[reviewIndex];

  function handleCreateDeck() {
    if (!deckName.trim()) return;
    createDeck.mutate(
      { name: deckName.trim(), subject: deckSubject.trim() },
      { onSuccess: () => { setDeckName(''); setDeckSubject(''); setShowNewDeck(false); } },
    );
  }

  function handleCreateCard() {
    if (!cardFront.trim() || !cardBack.trim() || !activeDeck) return;
    createCard.mutate(
      { deckId: activeDeck.id, front: cardFront.trim(), back: cardBack.trim() },
      { onSuccess: () => { setCardFront(''); setCardBack(''); setShowNewCard(false); } },
    );
  }

  function handleReview(quality: number) {
    if (!currentCard) return;
    reviewCard.mutate({ id: currentCard.id, quality });
    setFlipped(false);
    setReviewIndex((i) => i + 1);
  }

  // ── Review session ──────────────────────────────────────────────────────────
  if (view === 'review') {
    if (dueCards.length === 0 || reviewIndex >= dueCards.length) {
      return (
        <div className="text-center py-12 space-y-3">
          <div className="text-4xl">{dueCards.length === 0 ? '✅' : '🎉'}</div>
          <p className="font-semibold text-surface-ink">
            {dueCards.length === 0 ? 'No cards due right now!' : `Session complete! You reviewed ${reviewIndex} card${reviewIndex !== 1 ? 's' : ''}.`}
          </p>
          <p className="text-xs text-surface-muted">
            Come back tomorrow for your next review session.
          </p>
          <button
            type="button"
            onClick={() => { setView('decks'); setReviewIndex(0); setFlipped(false); }}
            className="px-4 py-2 rounded-xl bg-brand-coral text-white text-sm font-semibold"
          >
            Back to decks
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setView('decks'); setReviewIndex(0); setFlipped(false); }}
            className="text-xs text-surface-muted hover:text-surface-ink"
          >
            ← Exit review
          </button>
          <span className="text-xs text-surface-muted">
            {reviewIndex + 1} / {dueCards.length}
          </span>
        </div>

        {/* Card */}
        <div
          className="bg-surface-raised border border-surface-ink/10 rounded-2xl p-6 min-h-[200px] flex flex-col items-center justify-center text-center cursor-pointer select-none"
          onClick={() => setFlipped(!flipped)}
        >
          <p className="text-xs text-surface-muted mb-3 uppercase tracking-wider">
            {flipped ? 'Answer' : 'Question — tap to reveal'}
          </p>
          <p className="text-base font-semibold text-surface-ink leading-relaxed">
            {flipped ? currentCard.back : currentCard.front}
          </p>
          {currentCard.deck_name && (
            <p className="text-xs text-surface-muted mt-3">{currentCard.deck_name}</p>
          )}
        </div>

        {flipped ? (
          <div className="space-y-2">
            <p className="text-xs text-center text-surface-muted">How well did you know this?</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { q: 0, label: 'Forgot', color: 'bg-red-100 text-red-700 border-red-200' },
                { q: 2, label: 'Hard', color: 'bg-orange-100 text-orange-700 border-orange-200' },
                { q: 3, label: 'Good', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                { q: 5, label: 'Easy', color: 'bg-green-100 text-green-700 border-green-200' },
              ].map(({ q, label, color }) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleReview(q)}
                  className={`py-2 rounded-xl text-sm font-semibold border ${color} transition-all hover:opacity-80`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="w-full py-2 rounded-xl bg-brand-coral text-white text-sm font-semibold"
          >
            Reveal answer
          </button>
        )}
      </div>
    );
  }

  // ── Cards inside a deck ─────────────────────────────────────────────────────
  if (view === 'cards' && activeDeck) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setView('decks'); setActiveDeck(null); }}
            className="text-xs text-surface-muted hover:text-surface-ink"
          >
            ← All decks
          </button>
          <span className="text-sm font-semibold text-surface-ink flex-1">{activeDeck.name}</span>
          <button
            type="button"
            onClick={() => setShowNewCard(!showNewCard)}
            className="text-xs bg-brand-coral text-white px-3 py-1.5 rounded-xl font-semibold"
          >
            + Add card
          </button>
        </div>

        {showNewCard && (
          <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-2">
            <textarea
              value={cardFront}
              onChange={(e) => setCardFront(e.target.value)}
              placeholder="Front (question or term)…"
              rows={2}
              className="w-full resize-none border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-coral/30"
            />
            <textarea
              value={cardBack}
              onChange={(e) => setCardBack(e.target.value)}
              placeholder="Back (answer or definition)…"
              rows={2}
              className="w-full resize-none border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-coral/30"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowNewCard(false)}
                className="text-xs text-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCard}
                disabled={createCard.isPending}
                className="text-xs bg-brand-coral text-white px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40"
              >
                Save card
              </button>
            </div>
          </div>
        )}

        {cards.length === 0 ? (
          <p className="text-sm text-surface-muted text-center py-8">
            No cards yet — add some above!
          </p>
        ) : (
          <div className="space-y-2">
            {cards.map((c) => (
              <div
                key={c.id}
                className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3"
              >
                <p className="text-sm font-medium text-surface-ink">{c.front}</p>
                <p className="text-xs text-surface-muted mt-1">{c.back}</p>
                <p className="text-[10px] text-surface-muted mt-1">
                  Due: {c.next_due || 'now'} · Reps: {c.repetitions}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Deck list ───────────────────────────────────────────────────────────────
  const totalDue = decks.reduce((sum, d) => sum + (d.due_count ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {totalDue > 0 && (
          <button
            type="button"
            onClick={() => { setView('review'); setReviewIndex(0); setFlipped(false); }}
            className="flex-1 py-2.5 rounded-xl bg-brand-coral text-white text-sm font-semibold text-center"
          >
            🔁 Review {totalDue} due card{totalDue !== 1 ? 's' : ''}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowNewDeck(!showNewDeck)}
          className="px-3 py-2 rounded-xl border border-surface-ink/10 text-sm font-semibold text-surface-muted hover:text-surface-ink"
        >
          + New deck
        </button>
      </div>

      {showNewDeck && (
        <div className="bg-surface-raised border border-surface-ink/10 rounded-xl p-4 space-y-2">
          <input
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Deck name (e.g. Biology Chapter 3)"
            className="w-full border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-coral/30"
          />
          <input
            value={deckSubject}
            onChange={(e) => setDeckSubject(e.target.value)}
            placeholder="Subject (optional)"
            className="w-full border border-surface-ink/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-coral/30"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowNewDeck(false)} className="text-xs text-surface-muted">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateDeck}
              disabled={createDeck.isPending}
              className="text-xs bg-brand-coral text-white px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {decks.length === 0 ? (
        <p className="text-sm text-surface-muted text-center py-8">
          No decks yet — create one to get started!
        </p>
      ) : (
        <div className="space-y-2">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="bg-surface-raised border border-surface-ink/10 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-brand-coral/30"
              onClick={() => { setActiveDeck(deck); setView('cards'); }}
            >
              <div className="w-10 h-10 rounded-lg bg-brand-coral/10 flex items-center justify-center text-lg flex-shrink-0">
                🃏
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-ink">{deck.name}</p>
                <p className="text-xs text-surface-muted">
                  {deck.subject && `${deck.subject} · `}{deck.card_count} card{deck.card_count !== 1 ? 's' : ''}
                  {deck.due_count > 0 && (
                    <span className="ml-1 text-brand-coral font-semibold">
                      · {deck.due_count} due
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteDeck.mutate(deck.id); }}
                className="text-surface-muted hover:text-red-500 text-xs px-1"
                aria-label="Delete deck"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
