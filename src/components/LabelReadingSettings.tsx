import { useState } from 'react';
import {
  getPasscode,
  isAutoAnalyzeEnabled,
  setAutoAnalyze,
  setPasscode,
} from '../lib/analyzeClient';

/**
 * Setup for automatic label reading. The passcode gates the analyze endpoint so
 * a stranger who finds the URL can't run up API charges; it is not protecting
 * your log, which never leaves this device.
 */
export default function LabelReadingSettings() {
  const [draft, setDraft] = useState(getPasscode());
  const [auto, setAuto] = useState(isAutoAnalyzeEnabled());
  const [saved, setSaved] = useState(false);

  function save() {
    setPasscode(draft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <section className="card">
      <h2 className="field-label">Reading labels from photos</h2>
      <p className="mb-3 text-sm text-gray-600">
        When on, each new photo is sent for analysis and its ingredients come back as
        suggestions. The photo is the only thing that leaves this device — your log,
        symptoms, and history never do.
      </p>

      <button
        type="button"
        onClick={() => {
          const next = !auto;
          setAuto(next);
          setAutoAnalyze(next);
        }}
        aria-pressed={auto}
        className={`mb-4 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition ${
          auto ? 'bg-brand-50 ring-1 ring-brand-300' : 'bg-white ring-1 ring-brand-200'
        }`}
      >
        <span>
          <span className="block font-semibold text-brand-900">Analyze photos automatically</span>
          <span className="block text-xs text-gray-500">
            {auto ? 'On — about 1–2¢ per photo' : 'Off — no photos are sent anywhere'}
          </span>
        </span>
        <span
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            auto ? 'bg-brand-600' : 'bg-gray-300'
          }`}
          aria-hidden="true"
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
              auto ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>

      <label htmlFor="passcode" className="field-label">
        Passcode
      </label>
      <p className="mb-2 text-xs text-gray-500">
        The shared passcode you set when deploying. Stored on this device only.
      </p>
      <div className="flex gap-2">
        <input
          id="passcode"
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Enter passcode"
          autoComplete="off"
          className="text-input flex-1"
        />
        <button
          type="button"
          onClick={save}
          disabled={draft.trim() === getPasscode()}
          aria-label="Save passcode"
          className="rounded-xl bg-brand-600 px-5 font-semibold text-white disabled:opacity-40"
        >
          Save
        </button>
      </div>
      {saved && <p className="mt-2 text-sm font-medium text-safe-fg">Passcode saved.</p>}
    </section>
  );
}
