import type { Reaction } from '../types';

export function formatDuration(minutes?: number): string {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDayHeading(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

/** For <input type="datetime-local">, which needs local time without a timezone suffix. */
export function toDatetimeLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const REACTION_STYLES: Record<Reaction, { bg: string; text: string; label: string }> = {
  reacted: { bg: 'bg-react-bg', text: 'text-react-fg', label: 'Reacted' },
  none: { bg: 'bg-safe-bg', text: 'text-safe-fg', label: 'No reaction' },
  unsure: { bg: 'bg-unsure-bg', text: 'text-unsure-fg', label: 'Unsure' },
};

/** Splits a free-text ingredient field into normalized tags. */
export function parseIngredients(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[,\n;]/)) {
    const t = part.trim().toLowerCase().replace(/\s+/g, ' ');
    if (t) seen.add(t);
  }
  return [...seen];
}

export function severityLabel(severity: number): string {
  if (severity <= 3) return 'Mild';
  if (severity <= 6) return 'Moderate';
  if (severity <= 8) return 'Severe';
  return 'Very severe';
}
