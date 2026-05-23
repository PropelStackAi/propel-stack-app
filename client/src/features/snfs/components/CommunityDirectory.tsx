import { useState } from 'react';
import { COMMUNITY_RESOURCES, type CommunityResource } from '../types';

const CATEGORIES = ['All', ...new Set(COMMUNITY_RESOURCES.map((r) => r.category))];

export function CommunityDirectory(): JSX.Element {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = COMMUNITY_RESOURCES.filter((r) => {
    const matchesCat = activeCategory === 'All' || r.category === activeCategory;
    const matchesSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 text-xs text-indigo-800">
        <strong>Community Directory:</strong> Links to national advocacy organizations and support resources.
        Propel Stack AI does not endorse any specific organization. Verify current contact information on each organization's website.
      </div>

      {/* Search */}
      <input
        className="input"
        placeholder="Search organizations…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={[
              'px-3 py-1 rounded-full text-xs font-semibold border transition-all',
              activeCategory === cat
                ? 'bg-brand-indigo text-white border-brand-indigo'
                : 'bg-surface-raised border-surface-ink/10 text-surface-muted hover:text-surface-ink',
            ].join(' ')}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Resources */}
      <div className="space-y-2">
        {filtered.map((res) => (
          <ResourceCard key={res.name} resource={res} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-6 text-surface-muted text-sm">No matching organizations found.</div>
        )}
      </div>

      <p className="text-[10px] text-surface-muted">
        This directory is for informational purposes only. Contact information may change — always verify on each organization's official website.
      </p>
    </div>
  );
}

function ResourceCard({ resource }: { resource: CommunityResource }): JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-surface-ink/[0.06] bg-surface-raised p-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <div className="font-semibold text-sm text-surface-ink">{resource.name}</div>
          <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full px-2 py-0.5">{resource.category}</span>
        </div>
        <p className="text-xs text-surface-muted leading-relaxed">{resource.description}</p>
        <div className="flex flex-wrap gap-3 mt-2">
          {resource.phone && (
            <a href={`tel:${resource.phone.replace(/[^0-9]/g, '')}`} className="text-xs text-brand-indigo hover:underline font-medium">
              📞 {resource.phone}
            </a>
          )}
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-indigo hover:underline font-medium"
          >
            🌐 Website →
          </a>
        </div>
      </div>
    </div>
  );
}
