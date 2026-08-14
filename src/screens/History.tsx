import { useMemo, useState } from 'react';
import type { Entry, Reaction } from '../types';
import { useTracker, categoryFor, symptomLabel } from '../hooks/useTrackerData';
import { REACTION_STYLES, formatDayHeading, formatDateTime } from '../lib/format';
import { CategoryIcon } from '../lib/categoryIcons';
import PhotoThumb from '../components/PhotoThumb';
import EntryDetail from './EntryDetail';

export default function History({ onLogNew }: { onLogNew: () => void }) {
  const { entries, symptoms, categories } = useTracker();
  const [query, setQuery] = useState('');
  const [reactionFilter, setReactionFilter] = useState<Reaction | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (reactionFilter !== 'all' && e.reaction !== reactionFilter) return false;
      if (categoryFilter !== 'all' && e.categoryId !== categoryFilter) return false;
      if (!q) return true;
      if (e.name.toLowerCase().includes(q)) return true;
      if (e.notes.toLowerCase().includes(q)) return true;
      if (e.ingredients.some((i) => i.includes(q))) return true;
      return e.symptoms.some((s) => symptomLabel(symptoms, s.symptomId).toLowerCase().includes(q));
    });
  }, [entries, query, reactionFilter, categoryFilter, symptoms]);

  // Group into day sections so the list reads as a diary rather than a flat feed.
  const grouped = useMemo(() => {
    const groups: { heading: string; items: Entry[] }[] = [];
    for (const e of filtered) {
      const heading = formatDayHeading(e.exposedAt);
      const last = groups[groups.length - 1];
      if (last?.heading === heading) last.items.push(e);
      else groups.push({ heading, items: [e] });
    }
    return groups;
  }, [filtered]);

  const openEntry = openId ? entries.find((e) => e.id === openId) : null;
  if (openEntry) return <EntryDetail entry={openEntry} onClose={() => setOpenId(null)} />;

  return (
    <div className="pb-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-heading">History</h1>
        <p className="text-sm text-muted">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'} logged
        </p>
      </header>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search names, ingredients, symptoms…"
        className="text-input mb-3"
      />

      <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={reactionFilter === 'all'} onClick={() => setReactionFilter('all')}>
          All
        </FilterChip>
        {(['reacted', 'none', 'unsure'] as const).map((r) => (
          <FilterChip
            key={r}
            active={reactionFilter === r}
            onClick={() => setReactionFilter(reactionFilter === r ? 'all' : r)}
          >
            {REACTION_STYLES[r].label}
          </FilterChip>
        ))}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
          Any type
        </FilterChip>
        {categories
          .filter((c) => !c.archived)
          .map((c) => (
            <FilterChip
              key={c.id}
              active={categoryFilter === c.id}
              onClick={() => setCategoryFilter(categoryFilter === c.id ? 'all' : c.id)}
            >
              <CategoryIcon category={c} className="h-4 w-4" />
              {c.label}
            </FilterChip>
          ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center">
          <p className="text-muted">
            {entries.length === 0 ? 'Nothing logged yet.' : 'Nothing matches those filters.'}
          </p>
          {entries.length === 0 && (
            <button onClick={onLogNew} className="btn-primary mt-4">
              Log your first thing
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <section key={group.heading}>
              <h2 className="mb-2 px-1 text-xs font-bold tracking-wide text-muted uppercase">
                {group.heading}
              </h2>
              <div className="space-y-2">
                {group.items.map((entry) => {
                  const style = REACTION_STYLES[entry.reaction];
                  const category = categoryFor(categories, entry.categoryId);
                  const topSymptoms = entry.symptoms
                    .slice()
                    .sort((a, b) => b.severity - a.severity)
                    .slice(0, 3)
                    .map((s) => symptomLabel(symptoms, s.symptomId));

                  return (
                    <button
                      key={entry.id}
                      onClick={() => setOpenId(entry.id)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left shadow-sm ring-1 ring-line transition active:bg-sunk"
                    >
                      {entry.photoIds[0] ? (
                        <PhotoThumb
                          photoId={entry.photoIds[0]}
                          alt={entry.name}
                          className="h-16 w-16 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-sunk text-2xl">
                          <CategoryIcon category={category} className="h-7 w-7 text-muted" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-heading">
                            {entry.name}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-bold ${style.bg} ${style.text}`}
                          >
                            {style.label}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted">
                          {formatDateTime(entry.exposedAt)}
                        </p>
                        {topSymptoms.length > 0 && (
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {topSymptoms.join(' · ')}
                            {entry.symptoms.length > 3 && ` +${entry.symptoms.length - 3}`}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`chip inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap ${
        active ? 'bg-accent text-on-accent' : 'bg-surface text-ink ring-1 ring-line-strong'
      }`}
    >
      {children}
    </button>
  );
}
