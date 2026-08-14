import { useEffect, useState } from 'react';
import type { Entry, Reaction, SymptomEntry } from '../types';
import { useTracker } from '../hooks/useTrackerData';
import { listKnownIngredients, type NewEntry } from '../db/repository';
import { REACTION_STYLES, toDatetimeLocal } from '../lib/format';
import { CategoryIcon } from '../lib/categoryIcons';
import PhotoCapture, { type AnalysisState } from './PhotoCapture';
import SymptomAccordion from './SymptomAccordion';
import IngredientInput from './IngredientInput';
import IngredientSuggestions from './IngredientSuggestions';
import MinutesPicker from './MinutesPicker';

const ONSET_PRESETS = [5, 15, 30, 60, 120, 240];
const DURATION_PRESETS = [30, 60, 120, 240, 480, 1440];

interface EntryFormProps {
  initial?: Entry;
  onSave: (data: NewEntry) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export default function EntryForm({ initial, onSave, onCancel, submitLabel }: EntryFormProps) {
  const { systems, symptoms, categories } = useTracker();

  const [name, setName] = useState(initial?.name ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? 'food');
  const [photoIds, setPhotoIds] = useState<string[]>(initial?.photoIds ?? []);
  const [reaction, setReaction] = useState<Reaction | null>(initial?.reaction ?? null);
  const [symptomEntries, setSymptomEntries] = useState<SymptomEntry[]>(initial?.symptoms ?? []);
  const [onsetMinutes, setOnsetMinutes] = useState<number | undefined>(initial?.onsetMinutes);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(
    initial?.durationMinutes,
  );
  const [ingredients, setIngredients] = useState<string[]>(initial?.ingredients ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [exposedAt, setExposedAt] = useState(initial?.exposedAt ?? Date.now());
  const [known, setKnown] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: 'idle' });

  useEffect(() => {
    listKnownIngredients().then(setKnown);
  }, []);

  const canSave = name.trim().length > 0 && reaction !== null && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The button always looks live, so an incomplete form points at what is
    // missing rather than doing nothing.
    if (!canSave || reaction === null) {
      if (!name.trim()) document.getElementById("entry-name")?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        categoryId,
        photoIds,
        reaction,
        // Reaction-only details are dropped if you switch back to "no reaction",
        // so the record never claims symptoms it doesn't have.
        symptoms: reaction === 'reacted' ? symptomEntries : [],
        onsetMinutes: reaction === 'reacted' ? onsetMinutes : undefined,
        durationMinutes: reaction === 'reacted' ? durationMinutes : undefined,
        ingredients,
        notes: notes.trim(),
        exposedAt,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-4">
      <section className="card">
        <h2 className="field-label">Photo</h2>
        <PhotoCapture
          photoIds={photoIds}
          onChange={setPhotoIds}
          onAnalysis={(state) => {
            setAnalysis(state);
            // Fill in name and type from the photo, but never overwrite
            // something already typed.
            if (state.status === 'done' && state.result.identified) {
              setName((current) => current || state.result.name);
              setCategoryId((current) =>
                current === 'food' && state.result.category ? state.result.category : current,
              );
            }
          }}
        />
      </section>

      {analysis.status === 'running' && (
        <div className="card flex items-center gap-3 text-sm text-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
          Reading the photo…
        </div>
      )}

      {analysis.status === 'error' && (
        <div className="card ring-unsure-bg">
          <p className="text-sm text-ink">{analysis.message}</p>
          <p className="mt-1 text-xs text-muted">
            Everything else works — add ingredients by hand below.
          </p>
        </div>
      )}

      {analysis.status === 'done' && (
        <IngredientSuggestions
          result={analysis.result}
          selected={ingredients}
          onChange={setIngredients}
          onDismiss={() => setAnalysis({ status: 'idle' })}
        />
      )}

      <section className="card">
        <label htmlFor="entry-name" className="field-label">
          What was it?
        </label>
        <input
          id="entry-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Aged cheddar, new hand lotion"
          className="text-input"
          autoComplete="off"
        />

        <div className="mt-4">
          <span className="field-label">Type</span>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter((c) => !c.archived)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`chip inline-flex items-center gap-1.5 ${
                    categoryId === c.id
                      ? 'bg-accent text-on-accent'
                      : 'bg-surface text-ink ring-1 ring-line-strong'
                  }`}
                >
                  <CategoryIcon category={c} className="h-4 w-4" />
                  {c.label}
                </button>
              ))}
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="exposed-at" className="field-label">
            When
          </label>
          <input
            id="exposed-at"
            type="datetime-local"
            value={toDatetimeLocal(exposedAt)}
            onChange={(e) => {
              const t = new Date(e.target.value).getTime();
              if (!Number.isNaN(t)) setExposedAt(t);
            }}
            className="text-input"
          />
        </div>
      </section>

      <section className="card">
        <h2 className="field-label">Did it cause a reaction?</h2>
        <div className="grid grid-cols-3 gap-2">
          {(['reacted', 'none', 'unsure'] as const).map((r) => {
            const style = REACTION_STYLES[r];
            const active = reaction === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setReaction(r)}
                aria-pressed={active}
                className={`rounded-xl px-2 py-5 text-sm font-semibold transition ${
                  active
                    ? `${style.bg} ${style.text} ring-2 ring-current`
                    : 'bg-surface text-muted ring-1 ring-line-strong'
                }`}
              >
                {style.label}
              </button>
            );
          })}
        </div>
      </section>

      {reaction === 'reacted' && (
        <>
          <section className="card">
            <h2 className="field-label">Which symptoms?</h2>
            <p className="mb-3 text-sm text-muted">
              Tap a body system to open it, then check what you felt.
            </p>
            <SymptomAccordion
              systems={systems}
              symptoms={symptoms}
              value={symptomEntries}
              onChange={setSymptomEntries}
            />
          </section>

          <section className="card">
            <h2 className="field-label">How long until it started?</h2>
            <MinutesPicker
              value={onsetMinutes}
              presets={ONSET_PRESETS}
              onChange={setOnsetMinutes}
            />

            <h2 className="field-label mt-5">How long did it last?</h2>
            <MinutesPicker
              value={durationMinutes}
              presets={DURATION_PRESETS}
              onChange={setDurationMinutes}
            />
          </section>
        </>
      )}

      <section className="card">
        <h2 className="field-label">Ingredients</h2>
        <p className="mb-2 text-sm text-muted">
          Anything you suspect. These get matched across entries on the Patterns tab.
        </p>
        <IngredientInput value={ingredients} known={known} onChange={setIngredients} />

        <label htmlFor="entry-notes" className="field-label mt-5">
          Notes
        </label>
        <textarea
          id="entry-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything else worth remembering"
          className="text-input resize-y"
        />
      </section>

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-surface px-6 py-4 font-semibold text-muted ring-1 ring-line-strong"
          >
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary flex-1">
          {saving ? 'Saving…' : (submitLabel ?? 'Save entry')}
        </button>
      </div>
      {!canSave && !saving && (
        <p className="text-center text-sm text-muted">
          {!name.trim() ? 'Add a name to save.' : 'Pick whether it caused a reaction.'}
        </p>
      )}
    </form>
  );
}
