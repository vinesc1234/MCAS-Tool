import type { Entry, Symptom } from '../types';

export interface IngredientStat {
  ingredient: string;
  total: number;
  reacted: number;
  safe: number;
  /** Share of non-"unsure" appearances that reacted, 0-1. */
  rate: number;
}

/**
 * For each ingredient tag, how often did entries containing it react?
 * "Unsure" entries are excluded from the rate (they'd muddy it) but still
 * counted in `total` so you can see how much evidence there really is.
 */
export function ingredientStats(entries: Entry[], minAppearances = 2): IngredientStat[] {
  const map = new Map<string, { total: number; reacted: number; safe: number }>();

  for (const entry of entries) {
    for (const ingredient of new Set(entry.ingredients)) {
      const stat = map.get(ingredient) ?? { total: 0, reacted: 0, safe: 0 };
      stat.total += 1;
      if (entry.reaction === 'reacted') stat.reacted += 1;
      else if (entry.reaction === 'none') stat.safe += 1;
      map.set(ingredient, stat);
    }
  }

  return [...map.entries()]
    .filter(([, s]) => s.total >= minAppearances)
    .map(([ingredient, s]) => ({
      ingredient,
      ...s,
      rate: s.reacted + s.safe === 0 ? 0 : s.reacted / (s.reacted + s.safe),
    }))
    .sort((a, b) => b.rate - a.rate || b.reacted - a.reacted);
}

export interface SymptomStat {
  symptomId: string;
  label: string;
  count: number;
  avgSeverity: number;
}

export function symptomStats(entries: Entry[], symptoms: Symptom[]): SymptomStat[] {
  const map = new Map<string, { count: number; severitySum: number }>();

  for (const entry of entries) {
    for (const s of entry.symptoms) {
      const stat = map.get(s.symptomId) ?? { count: 0, severitySum: 0 };
      stat.count += 1;
      stat.severitySum += s.severity;
      map.set(s.symptomId, stat);
    }
  }

  return [...map.entries()]
    .map(([symptomId, s]) => ({
      symptomId,
      label: symptoms.find((x) => x.id === symptomId)?.label ?? 'Unknown',
      count: s.count,
      avgSeverity: s.severitySum / s.count,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface ItemStat {
  name: string;
  reacted: number;
  safe: number;
  unsure: number;
  total: number;
}

/** Groups entries by item name (case-insensitive) so repeats roll up. */
export function itemStats(entries: Entry[]): ItemStat[] {
  const map = new Map<string, ItemStat>();

  for (const entry of entries) {
    const key = entry.name.trim().toLowerCase();
    if (!key) continue;
    const stat = map.get(key) ?? { name: entry.name.trim(), reacted: 0, safe: 0, unsure: 0, total: 0 };
    stat.total += 1;
    if (entry.reaction === 'reacted') stat.reacted += 1;
    else if (entry.reaction === 'none') stat.safe += 1;
    else stat.unsure += 1;
    map.set(key, stat);
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

export interface DayPoint {
  date: string;
  label: string;
  reacted: number;
  safe: number;
  unsure: number;
}

/** Daily counts across the last `days` days, including days with no entries. */
export function reactionsOverTime(entries: Entry[], days = 30): DayPoint[] {
  const points: DayPoint[] = [];
  const byDate = new Map<string, DayPoint>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const point: DayPoint = {
      date: key,
      label: d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
      reacted: 0,
      safe: 0,
      unsure: 0,
    };
    points.push(point);
    byDate.set(key, point);
  }

  for (const entry of entries) {
    const d = new Date(entry.exposedAt);
    d.setHours(0, 0, 0, 0);
    const point = byDate.get(d.toISOString().slice(0, 10));
    if (!point) continue;
    if (entry.reaction === 'reacted') point.reacted += 1;
    else if (entry.reaction === 'none') point.safe += 1;
    else point.unsure += 1;
  }

  return points;
}

export interface OnsetBucket {
  label: string;
  count: number;
}

export function onsetDistribution(entries: Entry[]): OnsetBucket[] {
  const buckets: { label: string; max: number; count: number }[] = [
    { label: '<15m', max: 15, count: 0 },
    { label: '15–30m', max: 30, count: 0 },
    { label: '30–60m', max: 60, count: 0 },
    { label: '1–2h', max: 120, count: 0 },
    { label: '2–4h', max: 240, count: 0 },
    { label: '4h+', max: Infinity, count: 0 },
  ];

  for (const entry of entries) {
    if (entry.onsetMinutes == null) continue;
    const bucket = buckets.find((b) => entry.onsetMinutes! <= b.max);
    if (bucket) bucket.count += 1;
  }

  return buckets.map(({ label, count }) => ({ label, count }));
}
