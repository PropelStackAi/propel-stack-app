import { useMemo, useState } from 'react';
import { CONTACT_CATEGORIES, displayName, type Contact, type ContactCategory } from '../types';
import { ContactCard } from './ContactCard';

type SortKey = 'name' | 'lastContact' | 'score';

export function ContactList({
  contacts,
  selectedId,
  onSelect,
}: {
  contacts: Contact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | ContactCategory>('all');
  const [sort, setSort] = useState<SortKey>('name');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = contacts.filter((c) => {
      if (category !== 'all' && c.category !== category) return false;
      if (!q) return true;
      const hay = [
        displayName(c),
        c.company,
        c.title,
        ...c.emails.map((e) => e.value),
        ...c.phones.map((p) => p.value),
        ...c.tags,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });

    const sorted = [...matches];
    sorted.sort((a, b) => {
      if (sort === 'name') return displayName(a).localeCompare(displayName(b));
      if (sort === 'score') return b.relationshipScore - a.relationshipScore;
      // lastContact: most recent first; nulls last
      const av = a.lastContact ?? '';
      const bv = b.lastContact ?? '';
      if (!av && !bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;
      return bv.localeCompare(av);
    });
    return sorted;
  }, [contacts, search, category, sort]);

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-2">
        <label className="relative block">
          <span className="sr-only">Search contacts</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, email…"
            className="w-full rounded-lg border border-surface-ink/10 bg-surface-raised px-3 py-2 text-sm focus:outline-none"
          />
        </label>
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as 'all' | ContactCategory)}
            aria-label="Filter by category"
            className="flex-1 rounded-lg border border-surface-ink/10 bg-surface-raised px-2 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {CONTACT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort contacts"
            className="rounded-lg border border-surface-ink/10 bg-surface-raised px-2 py-2 text-sm"
          >
            <option value="name">Name</option>
            <option value="lastContact">Last contact</option>
            <option value="score">Score</option>
          </select>
        </div>
      </div>

      <div className="mt-3 text-[11px] uppercase tracking-wider text-surface-muted font-semibold px-1">
        {filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}
      </div>

      <div className="mt-1 flex-1 overflow-y-auto space-y-0.5 pr-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-surface-muted px-1 py-6 text-center">No contacts match.</p>
        ) : (
          filtered.map((c) => (
            <ContactCard key={c.id} contact={c} active={c.id === selectedId} onSelect={() => onSelect(c.id)} />
          ))
        )}
      </div>
    </div>
  );
}
