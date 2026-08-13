import type { BodySystem, Category, Entry, Symptom } from '../types';
import { exportAll, importAll } from '../db/repository';

export const BACKUP_FORMAT = 'mcas-tracker-backup';
export const BACKUP_VERSION = 1;

interface SerializedPhoto {
  id: string;
  entryId: string;
  createdAt: number;
  /** data: URL, so the whole backup is a single portable text file. */
  dataUrl: string;
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  entries: Entry[];
  systems: BodySystem[];
  symptoms: Symptom[];
  categories: Category[];
  photos: SerializedPhoto[];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

export async function buildBackup(): Promise<BackupFile> {
  const data = await exportAll();
  const photos = await Promise.all(
    data.photos.map(async (p) => ({
      id: p.id,
      entryId: p.entryId,
      createdAt: p.createdAt,
      dataUrl: await blobToDataUrl(p.blob),
    })),
  );

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    entries: data.entries,
    systems: data.systems,
    symptoms: data.symptoms,
    categories: data.categories,
    photos,
  };
}

export interface RestoreResult {
  entries: number;
  photos: number;
}

export async function restoreBackup(text: string): Promise<RestoreResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  const backup = parsed as Partial<BackupFile>;
  if (backup.format !== BACKUP_FORMAT) {
    throw new Error("That doesn't look like a Trigger Tracker backup.");
  }
  if (typeof backup.version !== 'number' || backup.version > BACKUP_VERSION) {
    throw new Error('That backup was made by a newer version of the app.');
  }
  if (!Array.isArray(backup.entries)) {
    throw new Error('That backup is missing its entries.');
  }

  const photos = await Promise.all(
    (backup.photos ?? []).map(async (p) => ({
      id: p.id,
      entryId: p.entryId,
      createdAt: p.createdAt,
      blob: await dataUrlToBlob(p.dataUrl),
    })),
  );

  await importAll({
    entries: backup.entries,
    photos,
    systems: backup.systems ?? [],
    symptoms: backup.symptoms ?? [],
    categories: backup.categories ?? [],
  });

  return { entries: backup.entries.length, photos: photos.length };
}
