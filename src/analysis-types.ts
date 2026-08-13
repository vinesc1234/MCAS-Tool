/**
 * Shared between the browser and the serverless function. Kept in its own file
 * with no imports so the API handler doesn't pull in any DOM-dependent code.
 */

/** Why an ingredient might matter for MCAS. Drives the UI grouping and copy. */
export type Concern =
  | 'histamine'
  | 'liberator'
  | 'sulfite'
  | 'salicylate'
  | 'additive'
  | 'fragrance'
  | 'none'
  | 'unknown';

export interface DetectedIngredient {
  name: string;
  concern: Concern;
  /** Short plain-language reason. Empty string when there's nothing to say. */
  note: string;
}

/** Real token counts from the API, so spend is measured rather than estimated. */
export interface AnalysisUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AnalysisResult {
  /** False when the photo is too blurry/dark to read or shows nothing identifiable. */
  identified: boolean;
  name: string;
  category: string;
  /** Whether ingredients were read off a label or inferred from the item itself. */
  source: 'label' | 'inferred' | 'unclear';
  ingredients: DetectedIngredient[];
  notes: string;
  /** Absent if the response predates usage reporting; treat as unknown, not zero. */
  usage?: AnalysisUsage;
}

/** Claude Opus 5 list pricing, USD per million tokens. */
export const PRICE_PER_MTOK = { input: 5, output: 25 } as const;

export function costOf(usage: AnalysisUsage): number {
  return (
    (usage.inputTokens / 1_000_000) * PRICE_PER_MTOK.input +
    (usage.outputTokens / 1_000_000) * PRICE_PER_MTOK.output
  );
}

export const CONCERN_LABELS: Record<Concern, string> = {
  histamine: 'High histamine',
  liberator: 'Histamine liberator',
  sulfite: 'Sulfite',
  salicylate: 'Salicylate',
  additive: 'Additive / preservative',
  fragrance: 'Fragrance',
  none: 'No known concern',
  unknown: 'Unknown',
};

/** Concerns worth surfacing to the user. `none` and `unknown` are not. */
export const NOTABLE_CONCERNS: Concern[] = [
  'histamine',
  'liberator',
  'sulfite',
  'salicylate',
  'additive',
  'fragrance',
];
