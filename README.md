# MCAS Trigger Tracker

A personal, mobile-first log for tracking what triggers your MCAS. Photograph a food, drink,
medicine, lotion, or material; record whether it caused a reaction and which symptoms; then see
patterns build up over time.

**Everything stays on your device.** No account, no server, no network calls. The data lives in
your browser's IndexedDB on whichever device you use.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. `npm run build` produces a static `dist/` folder.

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server, reachable from your phone on the same WiFi |
| `npm run build` | Typecheck + production build into `dist/` |
| `npm run preview` | Serve the built output locally |
| `npm run typecheck` | TypeScript only |
| `npm run icons` | Regenerate PWA PNGs from `public/icon.svg` |

## Screens

- **Log** — photo (read automatically, see below) → name/type → reacted / no reaction / unsure →
  symptoms by body system with a 1-10 severity each → onset and duration → ingredient tags and notes.
- **History** — day-grouped timeline; search by name, ingredient, or symptom; filter by reaction
  or type; tap through to edit or delete.
- **Patterns** — which ingredients correlate with reactions, most common symptoms, how fast
  reactions start, last 30 days, and your trigger vs. safe lists.
- **Settings** — edit the symptom and body-system lists, CSV export, JSON backup and restore.

## Reading labels from photos

Each new photo is sent to `api/analyze.ts` (a Vercel serverless function), which asks Claude what
the item is and what's in it. Ingredients come back as tappable chips, grouped by:

1. **You've reacted to these before** — cross-referenced against your own log, with the evidence
   ("reacted 3 of 3 times"). This ranks above any general flag; it's evidence about *you*.
2. **Known MCAS triggers** — general knowledge (histamine, liberators, sulfites, fragrance…).
3. **Everything else** — water, salt, and the rest.

Groups 1 and 2 start checked, so the usual case is glance-and-confirm. Photos with no label
(a restaurant plate, loose produce, a fabric) get inferred ingredients, clearly marked as such.

**Privacy boundary:** the photo is the only thing that leaves the device, and only at the moment
it's taken. Your entries, symptoms, severities, and history never go to the server, and nothing is
stored there — the image is passed straight through and forgotten.

`ANTHROPIC_API_KEY` lives only in the serverless function's environment. It is never sent to the
browser and cannot be extracted from a phone. The client bundle contains no Anthropic SDK and no
key reference (verifiable: `grep -ri anthropic dist/`).

`APP_PASSCODE` is a shared secret entered once per phone in Settings and sent as a header. It
exists to stop a stranger who finds the URL from running up API charges — not to protect the log,
which never leaves the device anyway.

Turning off **Settings → Analyze photos automatically** stops all network calls; the app then
behaves exactly as it did before this feature, with manual ingredient entry.

### Spending

Label reading is the only thing in the app that costs money — about **1.8¢ per photo** on Claude
Opus 5 (~1,800 input tokens for a high-res image plus prompt, ~350 output tokens of JSON). Cost is
computed from the **real token counts** the API returns, not a per-photo estimate.

Two layers, and only the second is a real cap:

| Layer | Where | What it does |
| --- | --- | --- |
| In-app budget | Settings → Spending limit | Warns at $15, blocks at $20, over a rolling 12 months. Blocks *before* the network call, so hitting it costs nothing. |
| Account spend limit | Anthropic Console → Billing → Limits | The cap that can't be bypassed. Set this too. |

At the defaults that's **846 photos before the warning** and **1,127 before it stops** — roughly
three photos a day each for two people.

The in-app counter lives in browser storage, so **each phone tracks its own share** and clearing
browser data resets it. Set a smaller per-phone limit (e.g. $10 each) if you want the pair to stay
under $20 with certainty, or just rely on the Console limit as the true ceiling.

When blocked, everything else keeps working — photos still save, you just type ingredients
yourself until you raise the limit.

### Deploying

1. Push this repo to GitHub.
2. Import it in Vercel (framework preset: Vite — it will detect `api/` automatically).
3. Set two Environment Variables in the Vercel project:
   - `ANTHROPIC_API_KEY` — from `console.anthropic.com`
   - `APP_PASSCODE` — a long random string you choose
4. Deploy, open the URL on each phone, add to home screen, then enter the passcode once under
   **Settings → Reading labels from photos**.
5. Set a **spend limit** in the Anthropic Console (Billing → Limits) with an email alert. This is
   the ceiling that holds no matter what any device does — the in-app limit is a convenience, not
   a guarantee.

For local development, copy `.env.example` to `.env.local` and fill in the same two values —
`npm run dev` serves the function alongside the app, no Vercel CLI needed.

## Architecture

```
api/
  analyze.ts          serverless: holds the API key, calls Claude vision
src/
  analysis-types.ts   types shared between browser and function
  types.ts            domain types, free of any storage detail
  db/
    schema.ts         IndexedDB stores, versioning, migrations
    seed.ts           default body systems, symptoms, categories
    repository.ts     THE data interface — all reads/writes go through here
  hooks/              React context over the repository
  screens/            Log, History, EntryDetail, Trends, Settings
  components/         PhotoCapture, SymptomAccordion, IngredientInput, EntryForm, …
  lib/                image downscaling, formatting, pattern analysis,
                      analyzeClient (calls the function), suggest (ranking)
  export/             CSV and JSON backup
```

**One rule:** screens and components never touch IndexedDB directly — only `db/repository.ts`.
Every method there is async even where a local read wouldn't need to be. Adding a real synced
backend later means reimplementing that one file against an API instead of rewriting the UI.

Schema changes go in `db/schema.ts` as a new `if (oldVersion < n)` block with a bumped
`DB_VERSION`, so existing installs migrate forward without losing data.

## Notes

- Photos are downscaled to 1600px and re-encoded as JPEG before storage — phone originals would
  exhaust the browser quota within a few dozen entries.
- Symptoms and body systems are **archived**, never deleted, so older entries referencing them
  still render.
- The Patterns charts lazy-load (~110 KB gzipped of recharts) so the Log screen stays fast.
- Ingredient correlation is plain counting, not statistics. Small counts swing wildly. It's a
  prompt for a conversation with your doctor, not a conclusion.

## Backups

Because storage is local-only, clearing browser data erases the log, and nothing syncs between
your phone and computer. Settings → **Download full backup** writes a single JSON file containing
every entry and photo; **Restore from backup** merges it back by ID, so re-importing the same file
is harmless.
