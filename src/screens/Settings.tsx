import { useEffect, useRef, useState } from 'react';
import type { BodySystem, Symptom } from '../types';
import { useTracker } from '../hooks/useTrackerData';
import {
  archiveSymptom,
  archiveSystem,
  newId,
  saveSymptom,
  saveSystem,
  storageEstimate,
} from '../db/repository';
import { entriesToCsv, downloadFile, timestampedName } from '../export/csv';
import { buildBackup, restoreBackup } from '../export/json';
import { formatBytes } from '../lib/image';
import LabelReadingSettings from '../components/LabelReadingSettings';
import SpendBudget from '../components/SpendBudget';

export default function Settings() {
  const { entries, systems, symptoms, categories, refresh } = useTracker();
  const [showArchived, setShowArchived] = useState(false);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storageEstimate().then(setStorage);
  }, [entries.length]);

  function notify(kind: 'ok' | 'error', text: string) {
    setMessage({ kind, text });
    setTimeout(() => setMessage(null), 6000);
  }

  async function handleCsv() {
    setBusy('csv');
    try {
      const csv = entriesToCsv(entries, symptoms, categories);
      downloadFile(csv, timestampedName('trigger-log', 'csv'), 'text/csv;charset=utf-8');
      notify('ok', 'CSV downloaded.');
    } finally {
      setBusy(null);
    }
  }

  async function handleBackup() {
    setBusy('backup');
    try {
      const backup = await buildBackup();
      downloadFile(
        JSON.stringify(backup),
        timestampedName('trigger-backup', 'json'),
        'application/json',
      );
      notify('ok', `Backed up ${backup.entries.length} entries and ${backup.photos.length} photos.`);
    } catch {
      notify('error', 'Backup failed.');
    } finally {
      setBusy(null);
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    setBusy('import');
    try {
      const result = await restoreBackup(await file.text());
      await refresh();
      notify('ok', `Restored ${result.entries} entries and ${result.photos} photos.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(null);
      if (importRef.current) importRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-2xl font-bold text-brand-900">Settings</h1>
      </header>

      {message && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            message.kind === 'ok'
              ? 'bg-safe-bg text-safe-fg ring-1 ring-green-200'
              : 'bg-react-bg text-react-fg ring-1 ring-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="card">
        <h2 className="field-label">Your data</h2>
        <p className="mb-3 text-sm text-gray-600">
          Everything is stored on this device only — nothing is uploaded. Clearing your browser data
          would erase it, so keep a backup somewhere safe.
        </p>

        <div className="space-y-2">
          <button onClick={handleCsv} disabled={busy !== null || entries.length === 0} className="btn-primary">
            {busy === 'csv' ? 'Exporting…' : 'Export CSV (for your doctor)'}
          </button>
          <button
            onClick={handleBackup}
            disabled={busy !== null}
            className="w-full rounded-xl bg-brand-100 px-5 py-4 font-semibold text-brand-800 transition active:bg-brand-200 disabled:opacity-40"
          >
            {busy === 'backup' ? 'Building backup…' : 'Download full backup (JSON + photos)'}
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => handleImport(e.target.files?.[0])}
          />
          <button
            onClick={() => importRef.current?.click()}
            disabled={busy !== null}
            className="w-full rounded-xl bg-white px-5 py-4 font-semibold text-gray-700 ring-1 ring-brand-200 disabled:opacity-40"
          >
            {busy === 'import' ? 'Restoring…' : 'Restore from backup'}
          </button>
        </div>

        {storage && (
          <p className="mt-3 text-xs text-gray-500">
            Using {formatBytes(storage.usage)}
            {storage.quota > 0 && ` of about ${formatBytes(storage.quota)} available`}.
          </p>
        )}
      </section>

      <LabelReadingSettings />

      <SpendBudget />

      <SymptomEditor
        systems={systems}
        symptoms={symptoms}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived(!showArchived)}
        onChanged={refresh}
      />

      <section className="card">
        <h2 className="field-label">About</h2>
        <p className="text-sm text-gray-600">
          A personal log for spotting MCAS patterns. It records what you tell it and does simple
          counting — it isn't a diagnostic tool, and patterns it surfaces are worth discussing with
          your doctor rather than acting on alone.
        </p>
      </section>
    </div>
  );
}

interface SymptomEditorProps {
  systems: BodySystem[];
  symptoms: Symptom[];
  showArchived: boolean;
  onToggleArchived: () => void;
  onChanged: () => Promise<void>;
}

function SymptomEditor({
  systems,
  symptoms,
  showArchived,
  onToggleArchived,
  onChanged,
}: SymptomEditorProps) {
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [newSystem, setNewSystem] = useState('');
  const [addingSystem, setAddingSystem] = useState(false);

  async function addSymptom(systemId: string) {
    const label = draft.trim();
    if (!label) return;
    const siblings = symptoms.filter((s) => s.systemId === systemId);
    await saveSymptom({
      id: newId(),
      systemId,
      label,
      custom: true,
      archived: false,
      order: siblings.length,
    });
    setDraft('');
    await onChanged();
  }

  async function addSystem() {
    const label = newSystem.trim();
    if (!label) return;
    await saveSystem({ id: newId(), label, order: systems.length, archived: false });
    setNewSystem('');
    setAddingSystem(false);
    await onChanged();
  }

  async function rename(symptom: Symptom) {
    const label = window.prompt('Rename symptom', symptom.label)?.trim();
    if (!label || label === symptom.label) return;
    await saveSymptom({ ...symptom, label });
    await onChanged();
  }

  const visibleSystems = systems.filter((s) => showArchived || !s.archived);

  return (
    <section className="card">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="field-label mb-0">Symptoms</h2>
        <button onClick={onToggleArchived} className="text-xs font-semibold text-brand-700">
          {showArchived ? 'Hide hidden' : 'Show hidden'}
        </button>
      </div>
      <p className="mb-3 text-sm text-gray-500">
        Add your own, or hide ones you never use. Hiding keeps past entries intact.
      </p>

      <div className="space-y-4">
        {visibleSystems.map((system) => {
          const list = symptoms.filter(
            (s) => s.systemId === system.id && (showArchived || !s.archived),
          );
          return (
            <div key={system.id}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <h3
                  className={`text-sm font-bold ${
                    system.archived ? 'text-gray-400 line-through' : 'text-brand-900'
                  }`}
                >
                  {system.label}
                </h3>
                <button
                  onClick={async () => {
                    await archiveSystem(system.id, !system.archived);
                    await onChanged();
                  }}
                  className="text-xs font-semibold text-gray-400"
                >
                  {system.archived ? 'Restore' : 'Hide'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {list.map((symptom) => (
                  <span
                    key={symptom.id}
                    className={`chip flex items-center gap-1.5 py-1 pr-1.5 text-xs ${
                      symptom.archived
                        ? 'bg-gray-100 text-gray-400 line-through'
                        : 'bg-brand-50 text-brand-900 ring-1 ring-brand-200'
                    }`}
                  >
                    <button onClick={() => rename(symptom)} className="underline-offset-2 hover:underline">
                      {symptom.label}
                    </button>
                    <button
                      onClick={async () => {
                        await archiveSymptom(symptom.id, !symptom.archived);
                        await onChanged();
                      }}
                      aria-label={symptom.archived ? 'Restore symptom' : 'Hide symptom'}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-gray-500"
                    >
                      {symptom.archived ? '↺' : '×'}
                    </button>
                  </span>
                ))}

                {addingTo === system.id ? (
                  <span className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSymptom(system.id);
                        } else if (e.key === 'Escape') {
                          setAddingTo(null);
                          setDraft('');
                        }
                      }}
                      placeholder="New symptom"
                      className="w-36 rounded-full bg-white px-3 py-1 text-xs ring-1 ring-brand-300 outline-none"
                    />
                    <button
                      onClick={() => addSymptom(system.id)}
                      className="chip bg-brand-600 px-2.5 py-1 text-xs text-white"
                    >
                      Add
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setAddingTo(system.id);
                      setDraft('');
                    }}
                    className="chip bg-white px-2.5 py-1 text-xs text-brand-700 ring-1 ring-dashed ring-brand-300"
                  >
                    + Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-brand-100 pt-3">
        {addingSystem ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newSystem}
              onChange={(e) => setNewSystem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSystem();
                } else if (e.key === 'Escape') setAddingSystem(false);
              }}
              placeholder="New body system"
              className="text-input flex-1 py-2 text-sm"
            />
            <button onClick={addSystem} className="chip bg-brand-600 text-white">
              Add
            </button>
          </div>
        ) : (
          <button onClick={() => setAddingSystem(true)} className="btn-ghost -ml-2">
            + Add a body system
          </button>
        )}
      </div>
    </section>
  );
}
