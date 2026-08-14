import { useEffect, useMemo, useRef } from 'react';
import { Check, X } from 'lucide-react';
import type { AnalysisResult } from '../analysis-types';
import { CONCERN_LABELS } from '../analysis-types';
import { useTracker } from '../hooks/useTrackerData';
import { buildSuggestions, historyLabel, type Suggestion } from '../lib/suggest';

interface IngredientSuggestionsProps {
  result: AnalysisResult;
  /** Currently selected ingredient tags on the entry. */
  selected: string[];
  onChange: (next: string[]) => void;
  onDismiss: () => void;
}

/**
 * Pops up after a photo is analyzed. Everything flagged starts checked, so the
 * common case is "glance, confirm, done" — tapping is only needed to correct it.
 */
export default function IngredientSuggestions({
  result,
  selected,
  onChange,
  onDismiss,
}: IngredientSuggestionsProps) {
  const { entries } = useTracker();
  const summary = useMemo(
    () => buildSuggestions(result.ingredients, entries),
    [result.ingredients, entries],
  );

  // Auto-check the flagged ones once per analysis, so the common case is
  // "glance and confirm". Guarded by a ref so re-renders (and the user
  // un-checking something) don't re-apply it.
  const appliedFor = useRef<AnalysisResult | null>(null);
  useEffect(() => {
    if (appliedFor.current === result) return;
    appliedFor.current = result;

    const toAdd = summary.suggestions.filter((s) => s.preselected).map((s) => s.name);
    if (toAdd.length === 0) return;

    const merged = [...selected];
    for (const name of toAdd) if (!merged.includes(name)) merged.push(name);
    if (merged.length !== selected.length) onChange(merged);
  }, [result, summary, selected, onChange]);

  const chosen = new Set(selected);

  function toggle(name: string) {
    onChange(chosen.has(name) ? selected.filter((s) => s !== name) : [...selected, name]);
  }

  const groups: { key: Suggestion['group']; title: string; hint?: string }[] = [
    { key: 'personal', title: 'You’ve reacted to these before', hint: 'From your own log' },
    { key: 'known', title: 'Known MCAS triggers', hint: 'General — not from your history' },
    { key: 'other', title: 'Everything else' },
  ];

  return (
    <section className="card ring-accent">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-heading">
            {result.identified ? result.name : 'Couldn’t read that photo'}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {result.identified ? summary.headline : result.notes}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss suggestions"
          className="shrink-0 rounded-full px-2 py-1 text-sm font-semibold text-muted"
        >
          <X size={16} />
        </button>
      </div>

      {result.identified && result.source === 'inferred' && (
        <p className="mb-3 rounded-lg bg-unsure-bg px-3 py-2 text-xs text-unsure-fg">
          No label visible — these are the likely ingredients for this item, not a transcription.
          Worth double-checking.
        </p>
      )}

      {summary.suggestions.length > 0 && (
        <div className="space-y-4">
          {groups.map((group) => {
            const items = summary.suggestions.filter((s) => s.group === group.key);
            if (items.length === 0) return null;

            return (
              <div key={group.key}>
                <div className="mb-1.5 flex items-baseline gap-2">
                  <h3 className="text-xs font-bold tracking-wide text-muted uppercase">
                    {group.title}
                  </h3>
                  {group.hint && <span className="text-2xs text-muted">{group.hint}</span>}
                </div>

                <div className="space-y-1.5">
                  {items.map((s) => (
                    <SuggestionRow
                      key={s.name}
                      suggestion={s}
                      checked={chosen.has(s.name)}
                      onToggle={() => toggle(s.name)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => onChange([...new Set([...selected, ...summary.suggestions.map((s) => s.name)])])}
          className="btn-ghost -ml-2 text-xs"
        >
          Add all
        </button>
        <button
          type="button"
          onClick={() => onChange(selected.filter((s) => !summary.suggestions.some((x) => x.name === s)))}
          className="btn-ghost text-xs"
        >
          Clear these
        </button>
      </div>
    </section>
  );
}

function SuggestionRow({
  suggestion,
  checked,
  onToggle,
}: {
  suggestion: Suggestion;
  checked: boolean;
  onToggle: () => void;
}) {
  const isPersonal = suggestion.group === 'personal';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
        checked ? 'bg-sunk ring-1 ring-accent' : 'bg-surface ring-1 ring-line'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs text-on-accent transition ${
          checked ? 'bg-accent' : 'bg-surface ring-1 ring-accent'
        }`}
        aria-hidden="true"
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium text-ink">{suggestion.name}</span>
          {isPersonal && suggestion.history && (
            <span className="rounded-full bg-react-bg px-2 py-0.5 text-2xs font-bold text-react-fg">
              {historyLabel(suggestion.history)}
            </span>
          )}
        </span>
        {(suggestion.note || suggestion.concern !== 'none') && (
          <span className="mt-0.5 block text-xs text-muted">
            {suggestion.note || CONCERN_LABELS[suggestion.concern]}
          </span>
        )}
      </span>
    </button>
  );
}
