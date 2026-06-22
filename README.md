# RampRep

Mobile-first, local-first workout tracking for home strength, mobility, conditioning, and long-distance bike tour preparation.

## Stack

- Vite + React + TypeScript
- Dexie + IndexedDB persistent storage
- PWA manifest and service worker for install/offline support
- Plain CSS with light/dark theme support
- Vitest sample utility tests

## Run Locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run tests:

```bash
npm test
```

## GitHub Pages Deploy

This repo is configured with `base: './'` in `vite.config.ts`, so the built app can run from the `KevinHegg/ramprep` GitHub Pages project path.

One simple deployment path:

```bash
npm run build
git subtree push --prefix dist origin gh-pages
```

In GitHub, set Pages to serve from the `gh-pages` branch. If you prefer Actions, build with `npm ci && npm run build` and upload the `dist` folder.

## Install On iPhone

1. Deploy the app over HTTPS.
2. Open the site in Safari.
3. Tap Share.
4. Tap Add to Home Screen.
5. Launch RampRep from the home-screen icon.

The app stores workout data locally in IndexedDB, so use Settings -> Backup to export JSON before changing devices or clearing browser data.

## Data

The first launch seeds:

- Default exercises with instructions, cues, common mistakes, equipment, target areas, defaults, generated SVG-style card art, and attribution.
- Five default routines:
  - Back + Hinge + Core
  - Legs + Cycling Support
  - Conditioning Circuit
  - 10-Minute Mat Mobility
  - Recovery Core and Back
- Suggested equipment and a 3-day starter schedule.

Seeding only happens when the app has no settings record. User edits are not overwritten. Settings includes a confirmed Reset demo data action.

## Backup And Export

Settings supports:

- Full JSON export/import of app data
- CSV export of workout logs
- Local reset to seeded demo data

## Future Google Sheets Sync

OAuth is intentionally not implemented in this version. The sync placeholder lives in `src/services/googleSheetsSync.ts`.

The future payload shape is JSON rows containing workout date, routine name, exercise name, sets, reps, weight, duration, effort, and notes. Settings includes `GOOGLE_APPS_SCRIPT_WEB_APP_URL` and a Test Sync button that validates configuration only for now.

## Future Exercise Imports

`src/services/wgerAdapter.ts` contains a future-ready adapter for mapping wger exercise metadata into RampRep exercises. The current app works fully offline from seeded local data.
