import type { BodySystem, Category, Symptom } from '../types';

/**
 * Defaults written on first launch. After that they live in IndexedDB and are yours
 * to rename, archive, or add to — nothing here is referenced by ID from the UI.
 */

export const DEFAULT_SYSTEMS: BodySystem[] = [
  { id: 'gi', label: 'Stomach / GI', order: 0, archived: false },
  { id: 'skin', label: 'Skin', order: 1, archived: false },
  { id: 'breathing', label: 'Breathing', order: 2, archived: false },
  { id: 'neuro', label: 'Head / Neuro', order: 3, archived: false },
  { id: 'heart', label: 'Heart', order: 4, archived: false },
  { id: 'other', label: 'Other', order: 5, archived: false },
];

const SYMPTOMS_BY_SYSTEM: Record<string, string[]> = {
  gi: [
    'Nausea',
    'Vomiting',
    'Abdominal pain',
    'Bloating',
    'Cramping',
    'Diarrhea',
    'Constipation',
    'Reflux / heartburn',
  ],
  skin: ['Flushing', 'Hives', 'Itching', 'Rash', 'Swelling / angioedema'],
  breathing: ['Shortness of breath', 'Wheezing', 'Throat tightness', 'Congestion', 'Cough'],
  neuro: ['Headache', 'Migraine', 'Brain fog', 'Dizziness', 'Fatigue', 'Anxiety'],
  heart: ['Rapid heartbeat', 'Palpitations', 'Blood pressure drop', 'Chest tightness'],
  other: ['Bone / joint pain', 'Urinary urgency', 'Temperature intolerance'],
};

export const DEFAULT_SYMPTOMS: Symptom[] = Object.entries(SYMPTOMS_BY_SYSTEM).flatMap(
  ([systemId, labels]) =>
    labels.map((label, i) => ({
      id: `${systemId}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      systemId,
      label,
      custom: false,
      archived: false,
      order: i,
    })),
);

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', label: 'Food', emoji: '🍽️', order: 0, archived: false },
  { id: 'drink', label: 'Drink', emoji: '🥤', order: 1, archived: false },
  { id: 'medicine', label: 'Medicine', emoji: '💊', order: 2, archived: false },
  { id: 'skincare', label: 'Skincare', emoji: '🧴', order: 3, archived: false },
  { id: 'material', label: 'Material', emoji: '🧶', order: 4, archived: false },
  { id: 'other', label: 'Other', emoji: '📦', order: 5, archived: false },
];
