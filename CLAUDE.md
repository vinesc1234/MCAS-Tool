# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Windows PowerShell is the shell here. It does **not** support `&&` — chain with `;` instead.

```powershell
npm run dev        # Vite dev server + the API function (see "Two runtimes" below)
npm run build      # typecheck, then production build to dist/
npm run typecheck  # tsc --noEmit — covers src/, api/, and the vite configs
npm run icons      # regenerate PWA PNGs from public/icon.svg
npm run qr         # regenerate qr/ from the APP_URL in scripts/gen-qr.mjs
```

**There is no test suite** — no runner, no test dependencies, no `npm test`. Verification to date
has been manual: drive the running app in a browser and check behavior. If you add tests, add the
tooling first; don't assume a command exists.

`npm run dev` needs `ANTHROPIC_API_KEY` and `APP_PASSCODE` for label reading to work. Copy
`.env.example` to `.env.local`. Without them the endpoint returns 503 and the rest of the app
still works.

## Two runtimes in one repo

This is not a plain SPA. Two separately-executed pieces share one TypeScript project:

| Path | Runs on | Notes |
| --- | --- | --- |
| `src/` | Browser | Vite build → `dist/`. Never imports the Anthropic SDK. |
| `api/analyze.ts` | Vercel serverless (Node) | Holds `ANTHROPIC_API_KEY`. Not part of the Vite build. |
| `src/analysis-types.ts` | Both | Deliberately import-free so the handler pulls in no DOM code. |

`tsconfig.json` therefore carries **both** browser and Node types, and `include` covers `src`,
`api`, and the vite configs. A change that typechecks in one runtime can still be wrong in the
other — `import 'node:crypto'` in `src/` would compile and then fail in the browser.

**Local dev is a shim, production is not.** `vite-dev-api.ts` is a Vite plugin that mounts
`api/analyze.ts` at `/api/analyze` during `npm run dev`, faking just the two `VercelResponse`
methods the handler uses (`status`, `json`, `setHeader`). Vercel runs the real thing. If you use
more of the `VercelResponse` surface, extend the shim or local dev silently diverges.

## The repository seam

`src/db/repository.ts` is the **only** module that touches IndexedDB (`getDB()` from `db/schema.ts`
is called nowhere else). Screens, components, and hooks go through it and nothing else. Every
method is async even where a local read wouldn't need to be.

This exists so a future hosted backend is a reimplementation of that one file rather than a UI
rewrite. Reaching into IndexedDB from a component would work today and break that. Don't.

Schema changes go in `db/schema.ts` as a new `if (oldVersion < n)` block with `DB_VERSION` bumped —
existing installs migrate forward rather than losing data.

## Privacy boundary — the constraint most changes have to respect

The log is local-only and per-device. Entries, symptoms, severities, photos, and history live in
IndexedDB on one phone and are never uploaded. **The single exception** is that one photo is POSTed
to `/api/analyze` at capture time, and nothing about it is stored server-side.

Consequences worth knowing before designing a feature:

- No accounts, no sync, no server-side state. Two users = two independent installs.
- The JSON backup in Settings is the only recovery path; clearing browser data destroys the log.
- Anything that would send entry data off-device changes the product's core claim. Flag it rather
  than doing it quietly.

`ANTHROPIC_API_KEY` lives only in the function's environment. `APP_PASSCODE` is a shared secret the
client sends as `x-app-passcode`; it exists to stop a stranger who finds the URL from spending API
credit, **not** to protect the log (which never leaves the device). Compared with `timingSafeEqual`.

## The analysis pipeline

```
PhotoCapture ──downscale (lib/image)──> savePhoto ──> analyzeClient.analyzePhoto
                                                            │ POST /api/analyze
                                                            ▼
                                              api/analyze.ts (Claude Opus 5, vision
                                              + structured outputs, effort: medium)
                                                            │ AnalysisResult
                                                            ▼
        IngredientSuggestions <── lib/suggest.buildSuggestions(detected, entries)
```

The photo is saved **before** analysis runs, so a slow or failed analysis never costs the picture.
Analysis failure is always non-fatal — every path leaves manual ingredient entry working.

`lib/suggest.ts` holds the product's actual opinion: **the user's own logged history outranks
general MCAS knowledge.** An ingredient they've reacted to 3/3 times is grouped `personal` and
shown with that evidence, even if the model flagged it as unremarkable; a generically-flagged
ingredient they've repeatedly tolerated drops to `other`. Preserve that ranking.

The model returns one `concern` per ingredient from a fixed enum (`analysis-types.ts`), enforced by
a JSON schema in the handler. Adding a concern means changing the enum, the schema, the system
prompt's flagging rules, and `CONCERN_LABELS` together.

Effort is `medium` — a deliberate accuracy/latency tradeoff for a health-adjacent extraction task.
Real-world latency is 6–9s. Dropping to `low` is the known lever if that becomes the complaint.

## Spend control

Two layers, and only one is real:

- `lib/budget.ts` — soft cap. Sums **actual** token costs (the handler returns `usage`; pricing in
  `analysis-types.ts`) over a rolling 365 days. Checked *before* the fetch, so hitting the cap
  costs nothing. Per-device localStorage, so it drifts from true account spend.
- Anthropic Console spend limit — the hard cap. The in-app one is a convenience, not a guarantee.
  Don't describe it as a guarantee in user-facing copy.

## The token layer

`src/index.css` holds everything visual. Three layers: an `iris` primitive ramp, a **semantic layer**
(`--color-surface`, `--color-ink`, `--color-accent`, `--color-line`…), and role-named scales for
type, radius, elevation, and motion.

**Components consume the semantic layer only.** That is what makes dark mode a token redefinition
rather than an edit to all 27 card sites, and it is worth preserving — reaching for a raw ramp step
or a literal hex in a component defeats it.

Two rules the colours encode:

- **The accent (`#6355B0` light / `#A896F5` dark) is the save button and active tab, and is never a
  reaction or severity colour.** Keeping it clear of red/green/amber is deliberate, so a
  call-to-action can't be mistaken for a signal.
- **`severityColor()` in `src/lib/format.ts` runs amber → deep red and never green.** Severity only
  exists once a reaction is recorded, so 1/10 is a *mild reaction*, not a good outcome; green would
  collide with the green "no reaction" state.

Dark mode follows `prefers-color-scheme`. `?style=classic` swaps in the pre-redesign palette for
A/B comparison (switch lives in `src/main.tsx`) — delete it once the look is settled.

Charts read the tokens at runtime via `useChartColors()` in `src/screens/Trends.tsx` rather than
keeping their own palette, which had previously drifted out of sync.

## Gotchas

- **Vercel env var changes need a redeploy.** They aren't applied to an existing deployment. The
  symptom is "Server is not configured yet" (503).
- **Symptoms and body systems are archived, never deleted**, so past entries referencing them still
  render. Same for categories.
- **Recharts is lazy-loaded** (`Trends` via `React.lazy`) to keep the Log screen — the one opened
  while unwell — fast. Don't import it eagerly.
- **Photos are downscaled to 1600px JPEG before storage.** Phone originals would exhaust the
  browser quota within a few dozen entries.
- **The service worker must never cache `/api/`** — `navigateFallbackDenylist` in `vite.config.ts`.
- `dist/` and `qr/` are build output; `qr/` is currently committed, `dist/` is not.

## Deployment

GitHub → Vercel, auto-deploying from `main`. Vercel detects Vite and `api/` without configuration.
`SETUP.md` is the end-to-end setup guide written for the repo owner; `README.md` covers
architecture and the privacy model.
