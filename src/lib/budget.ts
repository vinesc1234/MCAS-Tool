import { costOf, type AnalysisUsage } from '../analysis-types';

/**
 * Tracks what label reading has actually cost, over a rolling 12 months.
 *
 * This is the *soft* cap — it stops this app from spending, and it's what
 * produces the in-app warning. It is not a guarantee: it lives in this
 * browser's storage, so clearing browser data resets it, and each phone keeps
 * its own tally. The hard cap is the spend limit set in the Anthropic Console,
 * which applies to the account no matter what any client does.
 */

const CHARGES_KEY = 'mcas-tracker.charges';
const CAP_KEY = 'mcas-tracker.spendCap';
const WARN_KEY = 'mcas-tracker.spendWarn';

const DEFAULT_CAP = 20;
const DEFAULT_WARN = 15;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

interface Charge {
  /** Timestamp of the call. */
  t: number;
  /** Cost in USD. */
  c: number;
}

function readCharges(): Charge[] {
  try {
    const raw = localStorage.getItem(CHARGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Charge[];
    if (!Array.isArray(parsed)) return [];
    // Drop anything outside the rolling window on every read, so the stored
    // list can't grow without bound.
    const cutoff = Date.now() - YEAR_MS;
    return parsed.filter((x) => typeof x?.t === 'number' && x.t >= cutoff);
  } catch {
    return [];
  }
}

function writeCharges(charges: Charge[]): void {
  try {
    localStorage.setItem(CHARGES_KEY, JSON.stringify(charges));
  } catch {
    // Storage unavailable — tracking degrades, the Console limit still holds.
  }
}

function readNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

export function getCap(): number {
  return readNumber(CAP_KEY, DEFAULT_CAP);
}

export function getWarnAt(): number {
  return readNumber(WARN_KEY, DEFAULT_WARN);
}

export function setCap(value: number): void {
  try {
    localStorage.setItem(CAP_KEY, String(value));
  } catch {
    /* ignore */
  }
}

export function setWarnAt(value: number): void {
  try {
    localStorage.setItem(WARN_KEY, String(value));
  } catch {
    /* ignore */
  }
}

export interface BudgetStatus {
  /** Spend in the last 365 days, USD. */
  spent: number;
  cap: number;
  warnAt: number;
  /** Number of analyses in the window. */
  count: number;
  /** True once spend reaches the cap — analysis is blocked. */
  overCap: boolean;
  /** True once spend reaches the warn threshold (and not yet over cap). */
  shouldWarn: boolean;
  /** When the oldest charge in the window rolls off, freeing headroom. */
  oldestChargeAt: number | null;
}

export function getStatus(): BudgetStatus {
  const charges = readCharges();
  const spent = charges.reduce((sum, x) => sum + x.c, 0);
  const cap = getCap();
  const warnAt = getWarnAt();

  return {
    spent,
    cap,
    warnAt,
    count: charges.length,
    overCap: spent >= cap,
    shouldWarn: spent >= warnAt && spent < cap,
    oldestChargeAt: charges.length ? Math.min(...charges.map((x) => x.t)) : null,
  };
}

/** Records a completed call. Returns the status *after* recording. */
export function recordUsage(usage: AnalysisUsage | undefined): BudgetStatus {
  if (usage) {
    const charges = readCharges();
    charges.push({ t: Date.now(), c: costOf(usage) });
    writeCharges(charges);
  }
  return getStatus();
}

/** Clears the tally. Used when the user raises the cap after being blocked. */
export function resetSpend(): void {
  writeCharges([]);
}

export function formatUsd(amount: number): string {
  if (amount === 0) return '$0.00';
  if (amount < 0.01) return '<$0.01';
  return `$${amount.toFixed(2)}`;
}
