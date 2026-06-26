import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { primaryNavItems } from './data/navigation'
import { seedExercises, seedRoutineExercises } from './data/seed'
import { defaultLibraryExerciseIds, isSearchOnlyExercise, optionalSearchOnlyExerciseIds, sweatModeLibraryGroups } from './data/trainingTaxonomy'
import { carbMealSlotLabels, carbMealSlots } from './utils/carbs'

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8')
const cssSource = readFileSync(new URL('./App.css', import.meta.url), 'utf8')
const indexCssSource = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
const viteConfigSource = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')

const sourceBetween = (start: string, end: string) => appSource.slice(appSource.indexOf(start), appSource.indexOf(end))

describe('mobile UI structure', () => {
  it('uses exactly five primary bottom nav items', () => {
    expect(primaryNavItems.map((item) => item.label)).toEqual(['Today', 'Train', 'Ride', 'Net Carbs', 'More'])
  })

  it('uses full-viewport exercise demo styles with sticky controls', () => {
    expect(cssSource).toContain('.exercise-demo-view')
    expect(cssSource).toContain('position: fixed')
    expect(cssSource).toContain('inset: 0')
    expect(cssSource).toContain('width: 100%')
    expect(cssSource).toContain('min-height: 100dvh')
    expect(cssSource).toContain('grid-template-rows: auto 1fr auto')
    expect(cssSource).toContain('.demo-view-header')
    expect(cssSource).toContain('.demo-view-footer')
    expect(cssSource).toContain('min-height: 72px')
    expect(cssSource).toContain('position: sticky')
    expect(cssSource).not.toContain('.demo-view-footer .ghost-button:last-child')
    expect(cssSource).not.toContain('.demo-sheet')
  })

  it('keeps edit controls and library filters hidden by default', () => {
    expect(appSource).toContain('editMode && exerciseDraft')
    expect(appSource).toContain('editMode && activeRoutineDraft')
    expect(appSource).toContain('libraryFiltersOpen')
    expect(appSource).toContain('Filter')
    expect(appSource).not.toContain('<CategoryChips')
  })

  it('keeps the Today cockpit free of edit and filter controls', () => {
    const todayBlock = sourceBetween("{page === 'dashboard' && (", '{skipPromptRoutine &&')

    expect(todayBlock).toContain('Train today')
    expect(todayBlock).not.toContain('editMode')
    expect(todayBlock).not.toContain('Filter')
    expect(todayBlock).not.toContain('Pencil')
  })

  it('keeps Train focused on the next routine with direct browser and variation actions', () => {
    const trainBlock = sourceBetween("{page === 'train' && !activeWorkout", "{page === 'ride' && (")

    expect(trainBlock).toContain("Today&apos;s next routine")
    expect(trainBlock.match(/Start/g)?.length).toBe(1)
    expect(trainBlock).toContain('Browse routines')
    expect(trainBlock).toContain('Change it up')
    expect(trainBlock).toContain('Free log')
  })

  it('shows one exercise at a time in active workout mode with 72px actions', () => {
    expect(appSource).toContain('Active workout shows one exercise at a time')
    expect(appSource).toContain('Current exercise only')
    expect(appSource).toContain('activeWorkoutDraftStorageKey')
    expect(appSource).toContain('Draft workout restored.')
    expect(appSource).toContain('Discard this workout draft?')
    expect(appSource).toContain('Defaults')
    expect(appSource).toContain('Use last completed')
    expect(appSource).toContain('Reset to routine target')
    expect(cssSource).toContain('.active-primary')
    expect(cssSource).toContain('min-height: var(--touch-primary)')
    expect(indexCssSource).toContain('--touch-primary: 72px')
  })

  it('keeps Carbs giant and fast with six meal buttons', () => {
    expect(appSource).toContain('carb-integer-picker')
    expect(appSource).toContain('Add {carbAmount} net carbs to {carbMealSlotLabels[carbMealSlot]}')
    expect(appSource).toContain('<span className="carb-amount-label">net carbs</span>')
    expect(carbMealSlots.map((slot) => carbMealSlotLabels[slot])).toEqual([
      'Breakfast',
      'AM Snack',
      'Lunch',
      'PM Snack',
      'Dinner',
      'Evening',
    ])
  })

  it('uses USDA result selections to set the Quick Add net-carb amount', () => {
    const selectLookupBlock = sourceBetween('const handleSelectLookupResult', 'const handleAddLookupCarbs')

    expect(selectLookupBlock).toContain('setCarbAmount(normalizeCarbGrams(detailed.netCarbs))')
    expect(selectLookupBlock).toContain('setCarbAmount(normalizeCarbGrams(result.netCarbs))')
    expect(appSource).toContain('{result.netCarbs} net carbs')
  })

  it('uses the RAMprep default library and keeps downward dog search-only', () => {
    expect(sweatModeLibraryGroups).toEqual([
      'Core Armor',
      'Back & Posture',
      'Hips & Glutes',
      'Hill Legs',
      'Carries & Load',
      'Mobility Reset',
      'Ride Sessions',
      'Walk & Ruck',
      'Burley / Trailer',
    ])
    expect(defaultLibraryExerciseIds.has('downward-dog')).toBe(false)
    expect(optionalSearchOnlyExerciseIds.has('downward-dog')).toBe(true)
    expect(isSearchOnlyExercise({ id: 'downward-dog' })).toBe(true)
  })

  it('keeps downward dog out of default routines and recommendations while retaining the exercise', () => {
    const downwardDog = seedExercises.find((exercise) => exercise.id === 'downward-dog')
    const routineExerciseIds = seedRoutineExercises.map((entry) => entry.exerciseId)

    expect(downwardDog).toBeDefined()
    expect(routineExerciseIds).not.toContain('downward-dog')
  })

  it('adds a Ride screen that saves ride logs and protects the Burley flow', () => {
    expect(appSource).toContain("page === 'ride'")
    expect(appSource).toContain('handleSaveRideLog')
    expect(appSource).toContain('createWorkoutLog({ name: `${sessionKind}: ${draft.template}` }')
    expect(appSource).toContain('Dog comfort check first')
    expect(appSource).toContain('No hard repeats with dog')
    expect(appSource).toContain('Ruck walk')
    expect(appSource).toContain('Walk base')
  })

  it('keeps demo media honest when sources need review', () => {
    expect(appSource).toContain('Video not yet approved')
    expect(appSource).toContain('Activity checklist')
    expect(appSource).toContain('demo-tab-row')
    expect(appSource).toContain('Watch')
    expect(appSource).toContain('Cues')
    expect(appSource).toContain('Avoid')
    expect(appSource).toContain('Checklist')
    expect(appSource).toContain('Safety')
    expect(appSource).toContain('Draft instructions are hidden')
    expect(appSource).toContain('MediaCoveragePanel')
    expect(appSource).toContain('editMode && <MediaCoveragePanel')
    expect(appSource).not.toContain('Local coaching is still available')
    expect(appSource).not.toContain('Demo needed')
  })

  it('keeps the PWA deployable under /ramprep/ with an update prompt', () => {
    expect(viteConfigSource).toContain("base: '/ramprep/'")
    expect(appSource).toContain('Update available - refresh')
  })

  it('uses RAMprep public branding assets and metadata', () => {
    const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    const manifestSource = readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8')
    const logoSource = readFileSync(new URL('../public/ramprep-logo-horizontal.svg', import.meta.url), 'utf8')

    expect(indexSource).toContain('<title>RAMprep</title>')
    expect(manifestSource).toContain('"short_name": "RAMprep"')
    expect(appSource).toContain('About RAMprep')
    expect(appSource).toContain('Share RAMprep')
    expect(appSource).toContain('aria-label="RAMprep"')
    expect(logoSource).toContain('RAM')
    expect(logoSource).toContain('prep')
    expect(existsSync(new URL('../public/favicon.svg', import.meta.url))).toBe(true)
    expect(existsSync(new URL('../public/apple-touch-icon.png', import.meta.url))).toBe(true)
    expect(existsSync(new URL('../public/ramprep-social-card.png', import.meta.url))).toBe(true)
  })
})
