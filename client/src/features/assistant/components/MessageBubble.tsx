import { useState } from 'react';
import { MODEL_LABELS, messageCost, type Message } from '../types';

export function MessageBubble({
  message,
  onRate,
  onRegenerate,
}: {
  message: Message;
  onRate?: (rating: number) => void;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div className={isUser ? 'max-w-[80%]' : 'max-w-[85%] w-full'}>
        <div
          className={[
            'rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
            isUser ? 'bg-brand-indigo text-white' : 'bg-surface-raised border border-surface-ink/[0.06] text-surface-ink',
          ].join(' ')}
        >
          {message.content}
        </div>

        {!isUser && (
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-surface-muted">
            {message.model && <span>{MODEL_LABELS[message.model] ?? message.model}</span>}
            {(message.tokensIn > 0 || message.tokensOut > 0) && (
              <span>
                {message.tokensIn + message.tokensOut} tokens · ${messageCost(message.model, message.tokensIn, message.tokensOut).toFixed(4)}
              </span>
            )}
            <button type="button" onClick={copy} className="hover:text-surface-ink">{copied ? 'Copied' : 'Copy'}</button>
            {onRegenerate && <button type="button" onClick={onRegenerate} className="hover:text-surface-ink">Regenerate</button>}
            {onRate && (
              <span className="inline-flex items-center gap-1">
                <button type="button" aria-label="Good response" onClick={() => onRate(message.rating === 1 ? 0 : 1)} className={message.rating === 1 ? 'text-emerald-600' : 'hover:text-surface-ink'}>▲</button>
                <button type="button" aria-label="Bad response" onClick={() => onRate(message.rating === -1 ? 0 : -1)} className={message.rating === -1 ? 'text-red-600' : 'hover:text-surface-ink'}>▼</button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
