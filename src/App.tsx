import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import {
  Camera,
  ClipboardList,
  Settings2,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { BodySystem, Category, Entry, Symptom } from './types';
import { TrackerContext } from './hooks/useTrackerData';
import {
  listCategories,
  listEntries,
  listSymptoms,
  listSystems,
  purgeOrphanPhotos,
  requestPersistentStorage,
} from './db/repository';
import LogEntry from './screens/LogEntry';
import History from './screens/History';
import Settings from './screens/Settings';

// Charting pulls in ~350KB. Splitting it out keeps the Log screen — the one you
// open when you're not feeling well — fast to load on a phone.
const Trends = lazy(() => import('./screens/Trends'));

type Tab = 'log' | 'history' | 'trends' | 'settings';

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'log', label: 'Log', icon: Camera },
  { id: 'history', label: 'History', icon: ClipboardList },
  { id: 'trends', label: 'Patterns', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('log');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [systems, setSystems] = useState<BodySystem[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [e, sys, sym, cat] = await Promise.all([
      listEntries(),
      listSystems(),
      listSymptoms(),
      listCategories(),
    ]);
    setEntries(e);
    setSystems(sys);
    setSymptoms(sym);
    setCategories(cat);
  }, []);

  useEffect(() => {
    // Fire and forget — a browser that refuses persistence shouldn't block startup.
    void requestPersistentStorage();

    refresh()
      .then(() => purgeOrphanPhotos())
      .catch((err: unknown) => {
        // Private browsing and some locked-down browsers block IndexedDB outright.
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't open local storage. Private browsing mode can block it.",
        );
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted">Loading…</div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="card ring-react-line">
          <h1 className="mb-2 text-lg font-bold text-react-fg">Can't access local storage</h1>
          <p className="text-sm text-ink">{error}</p>
          <p className="mt-2 text-sm text-muted">
            This app keeps everything on your device, so it needs browser storage. Try a normal
            (non-private) window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TrackerContext.Provider value={{ entries, systems, symptoms, categories, loading, refresh }}>
      <div className="mx-auto flex h-full max-w-2xl flex-col">
        <main
          className="flex-1 overflow-y-auto px-4 pt-6"
          style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
        >
          {tab === 'log' && (
            <LogEntry
              onDone={() => setTab('history')}
              onOpenSettings={() => setTab('settings')}
            />
          )}
          {tab === 'history' && <History onLogNew={() => setTab('log')} />}
          {tab === 'trends' && (
            <Suspense
              fallback={<div className="pt-10 text-center text-muted">Loading charts…</div>}
            >
              <Trends />
            </Suspense>
          )}
          {tab === 'settings' && <Settings />}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 mx-auto max-w-2xl border-t border-line bg-surface/95 backdrop-blur"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="grid grid-cols-4">
            {TABS.map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-2xs font-semibold transition ${
                    active ? 'text-accent' : 'text-muted'
                  }`}
                >
                  {/* A heavier stroke on the active tab — an affordance the
                      emoji version couldn't express, since emoji don't
                      inherit colour or weight. */}
                  <Icon size={21} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </TrackerContext.Provider>
  );
}
