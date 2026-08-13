import { useMemo, useState } from 'react';

interface IngredientInputProps {
  value: string[];
  known: string[];
  onChange: (value: string[]) => void;
}

/** Tag input with autocomplete from ingredients you've already used. */
export default function IngredientInput({ value, known, onChange }: IngredientInputProps) {
  const [draft, setDraft] = useState('');

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return [];
    return known.filter((k) => k.includes(q) && !value.includes(k)).slice(0, 6);
  }, [draft, known, value]);

  /**
   * Adds every tag in one onChange. Calling a single-tag add() in a loop would have
   * each call read the same stale `value` prop, so pasting a comma-separated
   * ingredients label would keep only the last item.
   */
  function add(...raws: string[]) {
    const next = [...value];
    for (const raw of raws) {
      const tag = raw.trim().toLowerCase().replace(/\s+/g, ' ');
      if (tag && !next.includes(tag)) next.push(tag);
    }
    if (next.length !== value.length) onChange(next);
    setDraft('');
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="chip bg-brand-100 text-brand-800"
            >
              {tag} <span className="ml-0.5 text-brand-500">×</span>
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        value={draft}
        placeholder="Type an ingredient, press Enter"
        className="text-input"
        onChange={(e) => {
          // Typing a comma commits the tag, so pasting a label list works.
          if (e.target.value.includes(',')) {
            const parts = e.target.value.split(',');
            const last = parts.pop() ?? '';
            add(...parts);
            setDraft(last);
          } else {
            setDraft(e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(draft);
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
      />

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(s)}
              className="chip bg-white text-gray-700 ring-1 ring-brand-200"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
