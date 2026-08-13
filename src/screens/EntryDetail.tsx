import { useState } from 'react';
import type { Entry } from '../types';
import { deleteEntry, updateEntry, type NewEntry } from '../db/repository';
import { useTracker, categoryFor, symptomLabel } from '../hooks/useTrackerData';
import { REACTION_STYLES, formatDateTime, formatDuration, severityLabel } from '../lib/format';
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
          ← Back
        </button>
        <h1 className="mb-4 text-2xl font-bold text-brand-900">Edit entry</h1>
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
        ← History
      </button>

      {entry.photoIds.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {entry.photoIds.map((id) => (
            <PhotoThumb
              key={id}
              photoId={id}
              alt={entry.name}
              className="h-48 w-48 shrink-0 rounded-2xl object-cover ring-1 ring-brand-200"
            />
          ))}
        </div>
      )}

      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">{entry.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {category ? `${category.emoji} ${category.label} · ` : ''}
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
            <p className="text-sm text-gray-500">None recorded.</p>
          ) : (
            <ul className="space-y-2">
              {entry.symptoms
                .slice()
                .sort((a, b) => b.severity - a.severity)
                .map((s) => (
                  <li key={s.symptomId} className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${s.severity * 10}%` }}
                      />
                    </div>
                    <span className="w-40 shrink-0 text-sm text-gray-800">
                      {symptomLabel(symptoms, s.symptomId)}
                    </span>
                    <span className="w-24 shrink-0 text-right text-xs font-semibold text-brand-700">
                      {s.severity} · {severityLabel(s.severity)}
                    </span>
                  </li>
                ))}
            </ul>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-brand-100 pt-4 text-sm">
            <div>
              <dt className="text-gray-500">Started after</dt>
              <dd className="font-semibold text-brand-900">{formatDuration(entry.onsetMinutes)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Lasted</dt>
              <dd className="font-semibold text-brand-900">
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
                  <span key={i} className="chip bg-brand-100 text-brand-800">
                    {i}
                  </span>
                ))}
              </div>
            </>
          )}
          {entry.notes && (
            <>
              <h2 className="field-label">Notes</h2>
              <p className="text-sm whitespace-pre-wrap text-gray-700">{entry.notes}</p>
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
          className="rounded-xl bg-white px-6 py-4 font-semibold text-react-fg ring-1 ring-red-200"
        >
          Delete
        </button>
      </div>

      {confirmDelete && (
        <div className="card ring-red-200">
          <p className="mb-3 text-sm font-medium text-gray-800">
            Delete “{entry.name}” and its photos? This can't be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 rounded-xl bg-white px-4 py-3 font-semibold text-gray-600 ring-1 ring-brand-200"
            >
              Keep it
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
