import type { Category, Entry, Symptom } from '../types';
import { REACTION_LABELS } from '../types';
import { formatDuration } from '../lib/format';

function escapeCell(value: string): string {
  // Leading =/+/-/@ makes Excel treat a cell as a formula; prefix with ' to keep it text.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

const HEADERS = [
  'Date',
  'Item',
  'Type',
  'Reaction',
  'Symptoms',
  'Symptom count',
  'Max severity',
  'Onset',
  'Duration',
  'Ingredients',
  'Notes',
  'Photos',
];

export function entriesToCsv(
  entries: Entry[],
  symptoms: Symptom[],
  categories: Category[],
): string {
  const rows = [HEADERS.map(escapeCell).join(',')];

  for (const entry of entries) {
    const symptomText = entry.symptoms
      .slice()
      .sort((a, b) => b.severity - a.severity)
      .map((s) => `${symptoms.find((x) => x.id === s.symptomId)?.label ?? s.symptomId} (${s.severity}/10)`)
      .join('; ');

    const maxSeverity = entry.symptoms.length
      ? Math.max(...entry.symptoms.map((s) => s.severity))
      : '';

    rows.push(
      [
        new Date(entry.exposedAt).toLocaleString(),
        entry.name,
        categories.find((c) => c.id === entry.categoryId)?.label ?? entry.categoryId,
        REACTION_LABELS[entry.reaction],
        symptomText,
        String(entry.symptoms.length),
        String(maxSeverity),
        entry.onsetMinutes == null ? '' : formatDuration(entry.onsetMinutes),
        entry.durationMinutes == null ? '' : formatDuration(entry.durationMinutes),
        entry.ingredients.join('; '),
        entry.notes,
        String(entry.photoIds.length),
      ]
        .map(escapeCell)
        .join(','),
    );
  }

  // BOM so Excel opens UTF-8 correctly on Windows.
  return '﻿' + rows.join('\r\n');
}

export function downloadFile(content: BlobPart, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function timestampedName(prefix: string, ext: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.${ext}`;
}
