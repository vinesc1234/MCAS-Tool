import type { Concern, DetectedIngredient } from '../analysis-types';
import { NOTABLE_CONCERNS } from '../analysis-types';
import type { Entry } from '../types';
import { ingredientStats } from './analysis';

/**
 * Combines what the model saw in the photo with what you've actually logged.
 *
 * The model knows aged cheddar is high-histamine in general; only your own
 * history knows whether *you* react to it. Where the two disagree, your history
 * wins the headline — it's evidence about you rather than about people in
 * general.
 */

export type SuggestionGroup = 'personal' | 'known' | 'other';

export interface Suggestion {
  name: string;
  concern: Concern;
  /** The model's note, e.g. "aged, high histamine". */
  note: string;
  group: SuggestionGroup;
  /** Your own history for this ingredient, when you have any. */
  history?: {
    reacted: number;
    safe: number;
    /** Share of decided (non-"unsure") appearances that reacted, 0-1. */
    rate: number;
  };
  /** Whether it starts out checked in the picker. */
  preselected: boolean;
}

export interface SuggestionSummary {
  suggestions: Suggestion[];
  /** Count of ingredients you personally have a reaction history with. */
  personalCount: number;
  /** Count flagged by general MCAS knowledge but with no history of yours. */
  knownCount: number;
  /** One-line verdict for the top of the card. */
  headline: string;
}

/** Ingredients only count as "yours" once you've logged them at least twice. */
const MIN_APPEARANCES = 2;
/** Below this reaction rate, a personal history isn't a warning. */
const PERSONAL_ALERT_RATE = 0.5;

export function buildSuggestions(
  detected: DetectedIngredient[],
  entries: Entry[],
): SuggestionSummary {
  const stats = new Map(
    ingredientStats(entries, MIN_APPEARANCES).map((s) => [s.ingredient, s]),
  );

  const suggestions: Suggestion[] = detected.map((d) => {
    const key = d.name.trim().toLowerCase();
    const stat = stats.get(key);
    const notable = NOTABLE_CONCERNS.includes(d.concern);

    // A history of reacting outranks a general flag; a history of *not*
    // reacting is worth surfacing too, so it isn't shown as a scary unknown.
    if (stat && stat.reacted > 0 && stat.rate >= PERSONAL_ALERT_RATE) {
      return {
        name: key,
        concern: d.concern,
        note: d.note,
        group: 'personal',
        history: { reacted: stat.reacted, safe: stat.safe, rate: stat.rate },
        preselected: true,
      };
    }

    return {
      name: key,
      concern: d.concern,
      note: d.note,
      group: notable ? 'known' : 'other',
      history: stat
        ? { reacted: stat.reacted, safe: stat.safe, rate: stat.rate }
        : undefined,
      // Flagged ingredients start checked so the common case is zero tapping;
      // ordinary ones (water, salt) stay off so the tag list doesn't fill with noise.
      preselected: notable,
    };
  });

  const personalCount = suggestions.filter((s) => s.group === 'personal').length;
  const knownCount = suggestions.filter((s) => s.group === 'known').length;

  return {
    suggestions,
    personalCount,
    knownCount,
    headline: buildHeadline(personalCount, knownCount, suggestions.length),
  };
}

function buildHeadline(personal: number, known: number, total: number): string {
  if (total === 0) return 'No ingredients found.';

  if (personal > 0) {
    const noun = personal === 1 ? 'ingredient' : 'ingredients';
    const base = `${personal} ${noun} you've reacted to before`;
    return known > 0 ? `${base}, plus ${known} known trigger${known === 1 ? '' : 's'}.` : `${base}.`;
  }
  if (known > 0) {
    return `${known} known MCAS trigger${known === 1 ? '' : 's'} — nothing you've reacted to before.`;
  }
  return 'Nothing here is a known trigger for you.';
}

/** Short evidence string like "3 of 3 times" for the chip subtitle. */
export function historyLabel(history: NonNullable<Suggestion['history']>): string {
  const decided = history.reacted + history.safe;
  return `reacted ${history.reacted} of ${decided} time${decided === 1 ? '' : 's'}`;
}
