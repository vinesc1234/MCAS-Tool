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
      <p className="mb-3 text-sm text-muted">
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
          auto ? 'bg-sunk ring-1 ring-accent' : 'bg-surface ring-1 ring-line-strong'
        }`}
      >
        <span>
          <span className="block font-semibold text-heading">Analyze photos automatically</span>
          <span className="block text-xs text-muted">
            {auto ? 'On — about 1–2¢ per photo' : 'Off — no photos are sent anywhere'}
          </span>
        </span>
        <span
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            auto ? 'bg-accent' : 'bg-line-strong'
          }`}
          aria-hidden="true"
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-all ${
              auto ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>

      <label htmlFor="passcode" className="field-label">
        Passcode
      </label>
      <p className="mb-2 text-xs text-muted">
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
          className="rounded-xl bg-accent px-5 font-semibold text-on-accent disabled:opacity-40"
        >
          Save
        </button>
      </div>
      {saved && <p className="mt-2 text-sm font-medium text-safe-fg">Passcode saved.</p>}
    </section>
  );
}
