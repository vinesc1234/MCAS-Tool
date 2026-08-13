import type { AnalysisResult } from '../analysis-types';
import { formatUsd, getStatus, recordUsage } from './budget';

const PASSCODE_KEY = 'mcas-tracker.passcode';
const AUTO_ANALYZE_KEY = 'mcas-tracker.autoAnalyze';

/**
 * Talks to the analyze endpoint. The passcode is stored locally and sent as a
 * header; the API key lives only on the server and never reaches this device.
 */

export function getPasscode(): string {
  try {
    return localStorage.getItem(PASSCODE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setPasscode(value: string): void {
  try {
    if (value) localStorage.setItem(PASSCODE_KEY, value);
    else localStorage.removeItem(PASSCODE_KEY);
  } catch {
    // Private browsing can block localStorage; analysis just stays unavailable.
  }
}

export function isAutoAnalyzeEnabled(): boolean {
  try {
    return localStorage.getItem(AUTO_ANALYZE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setAutoAnalyze(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_ANALYZE_KEY, enabled ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

export class AnalyzeError extends Error {
  constructor(
    message: string,
    /** True when the passcode was rejected, so the UI can prompt for it again. */
    readonly needsPasscode = false,
    /** True when blocked by the spend cap, so the UI can offer to raise it. */
    readonly overCap = false,
  ) {
    super(message);
    this.name = 'AnalyzeError';
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the `data:image/jpeg;base64,` prefix — the API wants raw base64.
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function analyzePhoto(blob: Blob): Promise<AnalysisResult> {
  const passcode = getPasscode();
  if (!passcode) {
    throw new AnalyzeError('Add your passcode in Settings to read labels automatically.', true);
  }

  // Checked before the request, so hitting the cap costs nothing.
  const budget = getStatus();
  if (budget.overCap) {
    throw new AnalyzeError(
      `Label reading is paused — you've spent ${formatUsd(budget.spent)} of your ${formatUsd(budget.cap)} yearly limit. Raise it in Settings to continue.`,
      false,
      true,
    );
  }

  if (!navigator.onLine) {
    throw new AnalyzeError("You're offline — enter ingredients yourself for now.");
  }

  const image = await blobToBase64(blob);
  const mediaType = blob.type || 'image/jpeg';

  let response: Response;
  try {
    response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-app-passcode': passcode },
      body: JSON.stringify({ image, mediaType }),
    });
  } catch {
    throw new AnalyzeError("Couldn't reach the server. Enter ingredients yourself for now.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new AnalyzeError(
      body.error ?? 'Analysis failed.',
      response.status === 401,
    );
  }

  const result = (await response.json()) as AnalysisResult;
  recordUsage(result.usage);
  return result;
}
