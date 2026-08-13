import { useRef, useState } from 'react';
import type { AnalysisResult } from '../analysis-types';
import { downscaleImage } from '../lib/image';
import { savePhoto } from '../db/repository';
import { AnalyzeError, analyzePhoto, isAutoAnalyzeEnabled } from '../lib/analyzeClient';
import PhotoThumb from './PhotoThumb';

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: AnalysisResult }
  | { status: 'error'; message: string; needsPasscode: boolean };

interface PhotoCaptureProps {
  photoIds: string[];
  onChange: (photoIds: string[]) => void;
  /** Called as analysis progresses so the parent can show suggestions. */
  onAnalysis?: (state: AnalysisState) => void;
}

/**
 * `capture="environment"` opens the rear camera directly on phones. On desktop
 * the same input falls back to a file picker, which is what makes this testable
 * here. Each new photo is analyzed automatically unless that's switched off.
 */
export default function PhotoCapture({ photoIds, onChange, onAnalysis }: PhotoCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const ids: string[] = [];
      let firstBlob: Blob | null = null;

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const blob = await downscaleImage(file);
        if (!firstBlob) firstBlob = blob;
        ids.push(await savePhoto(blob));
      }
      if (!ids.length) return;

      onChange([...photoIds, ...ids]);

      // The photo is saved before analysis runs, so a failed or slow analysis
      // never costs you the picture.
      if (firstBlob && onAnalysis && isAutoAnalyzeEnabled()) {
        void runAnalysis(firstBlob, onAnalysis);
      }
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (libraryRef.current) libraryRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {photoIds.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {photoIds.map((id) => (
            <div key={id} className="relative shrink-0">
              <PhotoThumb
                photoId={id}
                className="h-28 w-28 rounded-xl object-cover ring-1 ring-brand-200"
              />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => onChange(photoIds.filter((p) => p !== id))}
                className="absolute -top-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-lg leading-none text-gray-600 shadow ring-1 ring-brand-200"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className="flex-1 rounded-xl bg-brand-600 px-4 py-4 text-base font-semibold text-white shadow-sm transition active:bg-brand-700 disabled:opacity-50"
        >
          {busy ? 'Saving…' : photoIds.length ? '📷 Add another' : '📷 Take photo'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => libraryRef.current?.click()}
          className="rounded-xl bg-brand-100 px-4 py-4 text-base font-semibold text-brand-800 transition active:bg-brand-200 disabled:opacity-50"
        >
          Upload
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Point at the ingredients label if there is one — it gets read automatically.
      </p>
    </div>
  );
}

async function runAnalysis(blob: Blob, onAnalysis: (state: AnalysisState) => void) {
  onAnalysis({ status: 'running' });
  try {
    const result = await analyzePhoto(blob);
    onAnalysis({ status: 'done', result });
  } catch (err) {
    onAnalysis({
      status: 'error',
      message: err instanceof Error ? err.message : 'Analysis failed.',
      needsPasscode: err instanceof AnalyzeError && err.needsPasscode,
    });
  }
}
