interface PagePlaceholderProps {
  title: string;
  sessionNumber: number;
  description: string;
  accent?: 'indigo' | 'coral' | 'teal' | 'purple';
}

export function PagePlaceholder({
  title,
  sessionNumber,
  description,
  accent = 'indigo',
}: PagePlaceholderProps) {
  const colors = {
    indigo: { bg: 'bg-brand-indigo/10', text: 'text-brand-indigo', ring: 'ring-brand-indigo/20' },
    coral:  { bg: 'bg-brand-coral/10',  text: 'text-brand-coral',  ring: 'ring-brand-coral/20'  },
    teal:   { bg: 'bg-brand-teal/10',   text: 'text-brand-teal',   ring: 'ring-brand-teal/20'   },
    purple: { bg: 'bg-brand-purple/10', text: 'text-brand-purple', ring: 'ring-brand-purple/20' },
  }[accent];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`chip ${colors.bg} ${colors.text} border-transparent ring-1 ${colors.ring}`}>
          Session {sessionNumber}
        </span>
        <span className="chip text-surface-muted">Not yet built</span>
      </div>
      <h1 className="font-display font-extrabold text-3xl tracking-tight text-surface-ink">{title}</h1>
      <p className="mt-3 text-surface-muted max-w-2xl leading-relaxed">{description}</p>

      <div className="card mt-8">
        <h2 className="font-display font-bold text-base text-surface-ink mb-2">
          This module ships in Session {sessionNumber}
        </h2>
        <p className="text-sm text-surface-muted">
          The route and navigation entry exist so that the app shell, hash routing, and
          inter-module links can be tested end-to-end before each feature is built out.
        </p>
      </div>
    </div>
  );
}
