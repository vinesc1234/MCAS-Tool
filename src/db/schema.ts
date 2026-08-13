import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { BodySystem, Category, Entry, Photo, Symptom } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_SYMPTOMS, DEFAULT_SYSTEMS } from './seed';

export const DB_NAME = 'mcas-tracker';
export const DB_VERSION = 1;

export interface TrackerDB extends DBSchema {
  entries: {
    key: string;
    value: Entry;
    indexes: { 'by-exposedAt': number; 'by-reaction': string };
  };
  photos: {
    key: string;
    value: Photo;
    indexes: { 'by-entryId': string };
  };
  systems: { key: string; value: BodySystem };
  symptoms: {
    key: string;
    value: Symptom;
    indexes: { 'by-systemId': string };
  };
  categories: { key: string; value: Category };
}

let dbPromise: Promise<IDBPDatabase<TrackerDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<TrackerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TrackerDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        // v1: initial schema. Future versions add their own `if (oldVersion < n)` block
        // so existing installs migrate forward without losing data.
        if (oldVersion < 1) {
          const entries = db.createObjectStore('entries', { keyPath: 'id' });
          entries.createIndex('by-exposedAt', 'exposedAt');
          entries.createIndex('by-reaction', 'reaction');

          const photos = db.createObjectStore('photos', { keyPath: 'id' });
          photos.createIndex('by-entryId', 'entryId');

          db.createObjectStore('systems', { keyPath: 'id' });

          const symptoms = db.createObjectStore('symptoms', { keyPath: 'id' });
          symptoms.createIndex('by-systemId', 'systemId');

          db.createObjectStore('categories', { keyPath: 'id' });

          // Seed inside the upgrade transaction so a fresh install is never
          // briefly usable with an empty symptom list.
          for (const s of DEFAULT_SYSTEMS) tx.objectStore('systems').put(s);
          for (const s of DEFAULT_SYMPTOMS) tx.objectStore('symptoms').put(s);
          for (const c of DEFAULT_CATEGORIES) tx.objectStore('categories').put(c);
        }
      },
    });
  }
  return dbPromise;
}
