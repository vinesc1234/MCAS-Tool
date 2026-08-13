import type { BodySystem, Category, Entry, Photo, Symptom } from '../types';
import { getDB } from './schema';

/**
 * The ONLY module that touches IndexedDB. Screens and hooks call these functions and
 * nothing else, so swapping in a hosted backend later means reimplementing this file
 * against an API rather than rewriting the UI. Every method is async for that reason,
 * even where a local read could be synchronous.
 */

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ---------------------------------------------------------------- entries */

export async function listEntries(): Promise<Entry[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('entries', 'by-exposedAt');
  return all.reverse(); // newest first
}

export async function getEntry(id: string): Promise<Entry | undefined> {
  return (await getDB()).get('entries', id);
}

export type NewEntry = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>;

export async function createEntry(input: NewEntry): Promise<Entry> {
  const now = Date.now();
  const entry: Entry = { ...input, id: newId(), createdAt: now, updatedAt: now };
  const db = await getDB();
  await db.put('entries', entry);
  // Photos are saved before the entry exists, so adopt any that claim this entry.
  await reassignPhotos(entry.photoIds, entry.id);
  return entry;
}

export async function updateEntry(
  id: string,
  patch: Partial<Omit<Entry, 'id' | 'createdAt'>>,
): Promise<Entry> {
  const db = await getDB();
  const existing = await db.get('entries', id);
  if (!existing) throw new Error(`Entry ${id} not found`);
  const updated: Entry = { ...existing, ...patch, id, updatedAt: Date.now() };
  await db.put('entries', updated);
  await reassignPhotos(updated.photoIds, id);

  // Drop photos that were removed from the entry during editing.
  const orphaned = existing.photoIds.filter((p) => !updated.photoIds.includes(p));
  await Promise.all(orphaned.map((pid) => db.delete('photos', pid)));
  return updated;
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDB();
  const entry = await db.get('entries', id);
  if (entry) await Promise.all(entry.photoIds.map((pid) => db.delete('photos', pid)));
  await db.delete('entries', id);
}

/* ----------------------------------------------------------------- photos */

/** Saved immediately on capture with a placeholder entryId, then adopted on save. */
export async function savePhoto(blob: Blob, entryId = ''): Promise<string> {
  const db = await getDB();
  const photo: Photo = { id: newId(), entryId, blob, createdAt: Date.now() };
  await db.put('photos', photo);
  return photo.id;
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  return (await getDB()).get('photos', id);
}

export async function deletePhoto(id: string): Promise<void> {
  await (await getDB()).delete('photos', id);
}

async function reassignPhotos(photoIds: string[], entryId: string): Promise<void> {
  const db = await getDB();
  await Promise.all(
    photoIds.map(async (pid) => {
      const photo = await db.get('photos', pid);
      if (photo && photo.entryId !== entryId) await db.put('photos', { ...photo, entryId });
    }),
  );
}

/** Photos captured but never attached to a saved entry (abandoned drafts). */
export async function purgeOrphanPhotos(): Promise<number> {
  const db = await getDB();
  const orphans = await db.getAllFromIndex('photos', 'by-entryId', '');
  const stale = orphans.filter((p) => Date.now() - p.createdAt > 24 * 60 * 60 * 1000);
  await Promise.all(stale.map((p) => db.delete('photos', p.id)));
  return stale.length;
}

/* ------------------------------------------------ systems / symptoms / categories */

export async function listSystems(): Promise<BodySystem[]> {
  const all = await (await getDB()).getAll('systems');
  return all.sort((a, b) => a.order - b.order);
}

export async function listSymptoms(): Promise<Symptom[]> {
  const all = await (await getDB()).getAll('symptoms');
  return all.sort((a, b) => a.order - b.order);
}

export async function listCategories(): Promise<Category[]> {
  const all = await (await getDB()).getAll('categories');
  return all.sort((a, b) => a.order - b.order);
}

export async function saveSystem(system: BodySystem): Promise<void> {
  await (await getDB()).put('systems', system);
}

export async function saveSymptom(symptom: Symptom): Promise<void> {
  await (await getDB()).put('symptoms', symptom);
}

export async function saveCategory(category: Category): Promise<void> {
  await (await getDB()).put('categories', category);
}

/**
 * Symptoms and systems are archived rather than deleted so past entries that
 * reference them still render correctly.
 */
export async function archiveSymptom(id: string, archived: boolean): Promise<void> {
  const db = await getDB();
  const s = await db.get('symptoms', id);
  if (s) await db.put('symptoms', { ...s, archived });
}

export async function archiveSystem(id: string, archived: boolean): Promise<void> {
  const db = await getDB();
  const s = await db.get('systems', id);
  if (s) await db.put('systems', { ...s, archived });
}

export async function archiveCategory(id: string, archived: boolean): Promise<void> {
  const db = await getDB();
  const c = await db.get('categories', id);
  if (c) await db.put('categories', { ...c, archived });
}

/* ------------------------------------------------------------ bulk / backup */

export async function exportAll() {
  const db = await getDB();
  const [entries, photos, systems, symptoms, categories] = await Promise.all([
    db.getAll('entries'),
    db.getAll('photos'),
    db.getAll('systems'),
    db.getAll('symptoms'),
    db.getAll('categories'),
  ]);
  return { entries, photos, systems, symptoms, categories };
}

export interface ImportPayload {
  entries: Entry[];
  photos: Photo[];
  systems: BodySystem[];
  symptoms: Symptom[];
  categories: Category[];
}

/** Merges by id — re-importing your own backup is idempotent, never duplicating. */
export async function importAll(payload: ImportPayload): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['entries', 'photos', 'systems', 'symptoms', 'categories'],
    'readwrite',
  );
  await Promise.all([
    ...payload.systems.map((s) => tx.objectStore('systems').put(s)),
    ...payload.symptoms.map((s) => tx.objectStore('symptoms').put(s)),
    ...payload.categories.map((c) => tx.objectStore('categories').put(c)),
    ...payload.entries.map((e) => tx.objectStore('entries').put(e)),
    ...payload.photos.map((p) => tx.objectStore('photos').put(p)),
    tx.done,
  ]);
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}

/** All ingredient tags used so far, for autocomplete. */
export async function listKnownIngredients(): Promise<string[]> {
  const entries = await listEntries();
  const seen = new Set<string>();
  for (const e of entries) for (const i of e.ingredients) seen.add(i);
  return [...seen].sort();
}
