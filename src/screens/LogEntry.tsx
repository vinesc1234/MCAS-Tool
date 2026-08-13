import { useState } from 'react';
import { createEntry, type NewEntry } from '../db/repository';
import { useTracker } from '../hooks/useTrackerData';
import EntryForm from '../components/EntryForm';
import { SpendWarning } from '../components/SpendBudget';

export default function LogEntry({
  onDone,
  onOpenSettings,
}: {
  onDone: () => void;
  onOpenSettings: () => void;
}) {
  const { refresh } = useTracker();
  // Remounting the form after save clears every field without hand-resetting state.
  const [formKey, setFormKey] = useState(0);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  async function handleSave(data: NewEntry) {
    await createEntry(data);
    await refresh();
    setJustSaved(data.name);
    setFormKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setJustSaved(null), 4000);
  }

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-brand-900">Log something</h1>
        <p className="text-sm text-gray-500">Snap it, then say how you reacted.</p>
      </header>

      <SpendWarning onOpenSettings={onOpenSettings} />

      {justSaved && (
        <div
          role="status"
          className="mb-4 flex items-center justify-between rounded-xl bg-safe-bg px-4 py-3 ring-1 ring-green-200"
        >
          <span className="text-sm font-medium text-safe-fg">Saved “{justSaved}”</span>
          <button onClick={onDone} className="text-sm font-semibold text-safe-fg underline">
            View history
          </button>
        </div>
      )}

      <EntryForm key={formKey} onSave={handleSave} />
    </div>
  );
}
