import { createContext, useContext } from 'react';
import type { BodySystem, Category, Entry, Symptom } from '../types';

export interface TrackerData {
  entries: Entry[];
  systems: BodySystem[];
  symptoms: Symptom[];
  categories: Category[];
  loading: boolean;
  /** Re-reads everything from the repository. Called after any mutation. */
  refresh: () => Promise<void>;
}

export const TrackerContext = createContext<TrackerData | null>(null);

export function useTracker(): TrackerData {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error('useTracker must be used inside <TrackerProvider>');
  return ctx;
}

/** Lookup helpers used by several screens. */
export function symptomLabel(symptoms: Symptom[], id: string): string {
  return symptoms.find((s) => s.id === id)?.label ?? 'Unknown symptom';
}

export function categoryFor(categories: Category[], id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
