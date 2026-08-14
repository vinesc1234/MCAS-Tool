import { useState } from 'react';
import type { Entry } from '../types';
import { deleteEntry, updateEntry, type NewEntry } from '../db/repository';
import { useTracker, categoryFor, symptomLabel } from '../hooks/useTrackerData';
import {
  REACTION_STYLES,
  formatDateTime,
  formatDuration,
  severityColor,
  severityLabel,
} from '../lib/format';
import { ArrowLeft } from 'lucide-react';
import EntryForm from '../components/EntryForm';
import PhotoThumb from '../components/PhotoThumb';

interface EntryDetailProps {
  entry: Entry;
  onClose: () => void;
}

export default function EntryDetail({ entry, onClose }: EntryDetailProps) {
  const { symptoms, categories, refresh } = useTracker();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const style = REACTION_STYLES[entry.reaction];
  const category = categoryFor(categories, entry.categoryId);

  async function handleSave(data: NewEntry) {
    await updateEntry(entry.id, data);
    await refresh();
    setEditing(false);
  }

  async function handleDelete() {
    await deleteEntry(entry.id);
    await refresh();
    onClose();
  }

  if (editing) {
    return (
      <div>
        <button onClick={() => setEditing(false)} className="btn-ghost mb-2 -ml-2">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="mb-4 text-2xl font-bold text-heading">Edit entry</h1>
        <EntryForm
          initial={entry}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
          submitLabel="Save changes"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <button onClick={onClose} className="btn-ghost -ml-2">
        <ArrowLeft size={16} /> History
      </button>

      {entry.photoIds.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {entry.photoIds.map((id) => (
            <PhotoThumb
              key={id}
              photoId={id}
              alt={entry.name}
              className="h-48 w-48 shrink-0 rounded-2xl object-cover ring-1 ring-line-strong"
            />
          ))}
        </div>
      )}

      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-heading">{entry.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {category ? `${category.label} · ` : ''}
              {formatDateTime(entry.exposedAt)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${style.bg} ${style.text}`}
          >
            {style.label}
          </span>
        </div>
      </div>

      {entry.reaction === 'reacted' && (
        <div className="card">
          <h2 className="field-label">Symptoms</h2>
          {entry.symptoms.length === 0 ? (
            <p className="text-sm text-muted">None recorded.</p>
          ) : (
            <ul className="space-y-2">
              {entry.symptoms
                .slice()
                .sort((a, b) => b.severity - a.severity)
                .map((s) => (
                  <li key={s.symptomId} className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-iris-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${s.severity * 10}%`,
                          background: severityColor(s.severity),
                        }}
                      />
                    </div>
                    <span className="w-40 shrink-0 text-sm text-ink">
                      {symptomLabel(symptoms, s.symptomId)}
                    </span>
                    <span
                      className="w-24 shrink-0 text-right text-xs font-semibold"
                      style={{ color: severityColor(s.severity) }}
                    >
                      {s.severity} · {severityLabel(s.severity)}
                    </span>
                  </li>
                ))}
            </ul>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
            <div>
              <dt className="text-muted">Started after</dt>
              <dd className="font-semibold text-heading">{formatDuration(entry.onsetMinutes)}</dd>
            </div>
            <div>
              <dt className="text-muted">Lasted</dt>
              <dd className="font-semibold text-heading">
                {formatDuration(entry.durationMinutes)}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {(entry.ingredients.length > 0 || entry.notes) && (
        <div className="card">
          {entry.ingredients.length > 0 && (
            <>
              <h2 className="field-label">Ingredients</h2>
              <div className="mb-4 flex flex-wrap gap-2">
                {entry.ingredients.map((i) => (
                  <span key={i} className="chip bg-iris-100 text-heading">
                    {i}
                  </span>
                ))}
              </div>
            </>
          )}
          {entry.notes && (
            <>
              <h2 className="field-label">Notes</h2>
              <p className="text-sm whitespace-pre-wrap text-ink">{entry.notes}</p>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setEditing(true)} className="btn-primary flex-1">
          Edit
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="rounded-xl bg-surface px-6 py-4 font-semibold text-react-fg ring-1 ring-react-line"
        >
          Delete
        </button>
      </div>

      {confirmDelete && (
        <div className="card ring-react-line">
          <p className="mb-3 text-sm font-medium text-ink">
            Delete “{entry.name}” and its photos? This can't be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 rounded-xl bg-surface px-4 py-3 font-semibold text-muted ring-1 ring-line-strong"
            >
              Keep it
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 rounded-xl bg-react-fg px-4 py-3 font-semibold text-surface"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
