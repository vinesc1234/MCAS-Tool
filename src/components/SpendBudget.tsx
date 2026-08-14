import { useState } from 'react';
import {
  formatUsd,
  getStatus,
  resetSpend,
  setCap,
  setWarnAt,
  type BudgetStatus,
} from '../lib/budget';

/** Compact banner shown on the Log screen once spend passes the warn threshold. */
export function SpendWarning({ onOpenSettings }: { onOpenSettings: () => void }) {
  const status = getStatus();
  if (!status.shouldWarn && !status.overCap) return null;

  const over = status.overCap;

  return (
    <div
      role="status"
      className={`mb-4 rounded-xl px-4 py-3 ring-1 ${
        over ? 'bg-react-bg ring-react-line' : 'bg-unsure-bg ring-unsure-line'
      }`}
    >
      <p className={`text-sm font-semibold ${over ? 'text-react-fg' : 'text-unsure-fg'}`}>
        {over
          ? `Label reading paused — ${formatUsd(status.spent)} of ${formatUsd(status.cap)} used`
          : `${formatUsd(status.spent)} of ${formatUsd(status.cap)} used this year`}
      </p>
      <p className="mt-0.5 text-xs text-muted">
        {over
          ? 'Photos still save and everything else works — you just enter ingredients yourself until you raise the limit.'
          : `Heads up — you'll hit the ${formatUsd(status.cap)} limit soon.`}
      </p>
      <button onClick={onOpenSettings} className="btn-ghost mt-1 -ml-2 text-xs">
        {over ? 'Raise the limit' : 'Adjust in Settings'}
      </button>
    </div>
  );
}

/** Full controls, shown in Settings. */
export default function SpendBudget() {
  const [status, setStatus] = useState<BudgetStatus>(getStatus);
  const [capDraft, setCapDraft] = useState(String(getStatus().cap));
  const [warnDraft, setWarnDraft] = useState(String(getStatus().warnAt));
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const pct = status.cap > 0 ? Math.min(100, (status.spent / status.cap) * 100) : 0;
  const warnPct = status.cap > 0 ? Math.min(100, (status.warnAt / status.cap) * 100) : 0;

  function save() {
    const cap = Number(capDraft);
    const warn = Number(warnDraft);
    if (!Number.isFinite(cap) || cap <= 0) return;
    // A warning at or above the cap would never fire before the block does.
    const clampedWarn = Number.isFinite(warn) && warn > 0 ? Math.min(warn, cap) : cap;

    setCap(cap);
    setWarnAt(clampedWarn);
    setWarnDraft(String(clampedWarn));
    setStatus(getStatus());
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <section className="card">
      <h2 className="field-label">Spending limit</h2>
      <p className="mb-3 text-sm text-muted">
        Covers label reading only. Nothing else in the app costs anything.
      </p>

      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-heading">{formatUsd(status.spent)}</span>
        <span className="text-sm text-muted">of {formatUsd(status.cap)} this year</span>
      </div>

      <div className="relative mb-2 h-2.5 overflow-hidden rounded-full bg-plum-100">
        <div
          className={`h-full rounded-full transition-all ${
            status.overCap ? 'bg-react-fg' : status.shouldWarn ? 'bg-unsure-fg' : 'bg-accent'
          }`}
          style={{ width: `${pct}%` }}
        />
        {/* Warn threshold marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-muted/50"
          style={{ left: `${warnPct}%` }}
          aria-hidden="true"
        />
      </div>

      <p className="mb-4 text-xs text-muted">
        {status.count} {status.count === 1 ? 'photo' : 'photos'} read in the last 12 months
        {status.count > 0 && ` · about ${formatUsd(status.spent / status.count)} each`}.
        Warning at {formatUsd(status.warnAt)}.
      </p>

      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="cap" className="mb-1 block text-xs font-semibold text-heading">
            Yearly limit
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-muted">$</span>
            <input
              id="cap"
              type="number"
              inputMode="decimal"
              min={1}
              step={1}
              value={capDraft}
              onChange={(e) => setCapDraft(e.target.value)}
              className="text-input"
            />
          </div>
        </div>
        <div className="flex-1">
          <label htmlFor="warn" className="mb-1 block text-xs font-semibold text-heading">
            Warn me at
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-muted">$</span>
            <input
              id="warn"
              type="number"
              inputMode="decimal"
              min={1}
              step={1}
              value={warnDraft}
              onChange={(e) => setWarnDraft(e.target.value)}
              className="text-input"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          aria-label="Save spending limit"
          className="mt-5 rounded-xl bg-accent px-5 font-semibold text-on-accent"
        >
          Save
        </button>
      </div>
      {saved && <p className="mt-2 text-sm font-medium text-safe-fg">Limit updated.</p>}

      <div className="mt-4 border-t border-line pt-3">
        {confirmReset ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-xs text-muted">
              Reset the tally to $0? Only do this if you've reconciled against your Anthropic
              account.
            </span>
            <button
              onClick={() => setConfirmReset(false)}
              className="chip bg-surface text-muted ring-1 ring-line-strong"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                resetSpend();
                setStatus(getStatus());
                setConfirmReset(false);
              }}
              className="chip bg-accent text-on-accent"
            >
              Reset
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmReset(true)} className="btn-ghost -ml-2 text-xs">
            Reset the tally
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-muted">
        This counter lives on this device, so each phone tracks its own share and clearing browser
        data resets it. The limit that can't be bypassed is the spend limit on your Anthropic
        account — set that one too.
      </p>
    </section>
  );
}
