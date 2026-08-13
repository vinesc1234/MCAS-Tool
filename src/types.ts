/** Core domain types. Kept free of any storage detail so a future backend can reuse them. */

export type Reaction = 'reacted' | 'none' | 'unsure';

export interface BodySystem {
  id: string;
  label: string;
  order: number;
  archived: boolean;
}

export interface Symptom {
  id: string;
  systemId: string;
  label: string;
  /** False for the seeded defaults, true for ones you added yourself. */
  custom: boolean;
  archived: boolean;
  order: number;
}

export interface Category {
  id: string;
  label: string;
  emoji: string;
  order: number;
  archived: boolean;
}

export interface SymptomEntry {
  symptomId: string;
  /** 1-10. */
  severity: number;
}

export interface Entry {
  id: string;
  /** When the record was created. */
  createdAt: number;
  /** When you actually ate/used/touched the thing. Editable, defaults to createdAt. */
  exposedAt: number;
  updatedAt: number;
  name: string;
  categoryId: string;
  photoIds: string[];
  reaction: Reaction;
  /** Minutes between exposure and first symptom. */
  onsetMinutes?: number;
  /** How long the reaction lasted, in minutes. */
  durationMinutes?: number;
  symptoms: SymptomEntry[];
  /** Lowercased ingredient tags, used to correlate across entries. */
  ingredients: string[];
  notes: string;
}

export interface Photo {
  id: string;
  entryId: string;
  blob: Blob;
  createdAt: number;
}

export const REACTION_LABELS: Record<Reaction, string> = {
  reacted: 'Reacted',
  none: 'No reaction',
  unsure: 'Unsure',
};
