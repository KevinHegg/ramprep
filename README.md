# RampRep

Sweaty-thumb training, ride logging, and net-carb tracking for Ride Across America Preparation.

RampRep means RAM Prep: a calm bike-tour preparation app for one private rider. The v1.2 interface is designed for an iPhone outdoors, with large text, giant primary buttons, one-exercise workout mode, a dedicated Ride screen, and a fast net-carb logger.

## Brand

- Identity: RampRep / Ride Across America Preparation
- Logo: bike wheel, road line, and subtle ram-horn curve in `public/ramrep-logo.svg`
- Icon assets: `public/favicon.svg`, `public/apple-touch-icon.svg`, and `public/pwa-icon.svg`
- Palette: deep fjord blue, warm road clay, off-white paper, and pine green

## Stack

- Vite + React + TypeScript
- Dexie + IndexedDB persistent storage
- PWA manifest and versioned service worker for install support
- Plain CSS with light/dark theme support
- Vitest sample utility tests

## Live URL

Expected GitHub Pages URL:

```text
https://kevinhegg.github.io/ramprep/
```

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

This repo is configured with `base: '/ramprep/'` in `vite.config.ts`, so the built app runs from the `KevinHegg/ramprep` GitHub Pages project path.

Deployment is handled by `.github/workflows/deploy.yml` on pushes to `main`.

```bash
git push origin main
```

Manual GitHub setting if needed:

1. Open GitHub repo Settings.
2. Go to Pages.
3. Set Source to GitHub Actions.
4. Save and run the workflow.

The build artifact root is `dist/`, and `public/.nojekyll` is copied into it.

## Install On iPhone

1. Deploy the app over HTTPS.
2. Open the site in Safari.
3. Tap Share.
4. Tap Add to Home Screen.
5. Launch RampRep from the home-screen icon.

The app stores workout data locally in IndexedDB, so use Settings -> Backup to export JSON before changing devices or clearing browser data.

## PWA And Cache Notes

RampRep registers a service worker from `/ramprep/sw.js` in production. Offline use is not the priority; the service worker uses a versioned, network-first strategy for app assets and does not cache external videos. The app surfaces an "Update available - refresh" prompt when a new service worker is ready.

Workout logs, net-carb logs, settings, personal defaults, and roadmap data remain in IndexedDB. Settings includes a Clear local app cache action that preserves IndexedDB data. Clearing Safari site data or switching phones can still remove local data, so export a JSON backup first.

## Data

The first launch seeds:

- Default exercises with structured instructions, cues, common mistakes, equipment, target areas, source references, and defaults.
- Verified or needs-review demo source records. RampRep does not show fake SVG demos as primary media.
- Five default routines:
  - Back + Hinge + Core
  - Legs + Cycling Support
  - Conditioning Circuit
  - 10-Minute Mat Mobility
  - Recovery Core and Back
- Bike/outdoor routine:
  - Burley Loaded Trailer Ride
- Suggested equipment and a 3-day starter schedule.
- A 12-month bike-tour roadmap with editable milestones and job/life conflicts.

Seeding only happens when the app has no settings record. User edits are not overwritten. Settings includes a confirmed Reset demo data action.

v1.1 adds migration-safe stores for personal exercise defaults, exercise media, and the tour roadmap. v1.2 adds the sweat-mode UI, Ride screen, curated RampRep library taxonomy, verified source catalog, giant net-carb logger, and versioned cache behavior. New seed content is added only when missing.

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

## Media And Source Strategy

Exercise demos prioritize verified external pages or official YouTube embeds. RampRep links or embeds; it does not download, cache, scrape, or re-host YouTube videos. If a movement does not have a reviewed source, the demo screen says "Demo needs review" instead of faking motion media.

The curated source list lives in `src/data/verifiedExerciseSources.ts`. Future imports should copy source, author, license name, license URL, and attribution text into `ExerciseMedia` before showing imported media. If license/source fields are unavailable or unclear, mark the item `needsReview`.
