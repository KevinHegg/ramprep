import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Compass,
  Copy,
  Download,
  Dumbbell,
  ExternalLink,
  Filter,
  Flame,
  Home,
  Map as MapIcon,
  Menu,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Route,
  Save,
  Search,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import './App.css'
import {
  addExerciseToRoutine,
  clearFoodLookupCache,
  createCarbEntry,
  createSkippedWorkout,
  createWorkoutLog,
  createId,
  deleteAllCarbEntries,
  deleteCarbEntry,
  deleteCarbPreset,
  deletePrivateSetting,
  deleteRoutineExercise,
  deleteWorkoutLog,
  duplicateRoutine,
  exportAllData,
  exportCarbEntriesCsv,
  exportWorkoutLogsCsv,
  getFoodLookupCache,
  getAppData,
  getPrivateSetting,
  importAllData,
  initializeAppData,
  markCarbPresetUsed,
  resetDemoData,
  saveCarbPreset,
  saveCarbSettings,
  saveEquipment,
  saveExercise,
  saveFoodLookupCache,
  savePrivateSetting,
  saveRoutine,
  saveRoutineExercise,
  saveRoadmap,
  saveSchedule,
  saveSettings,
  USDA_API_KEY_PRIVATE_SETTING_KEY,
  updateCarbEntry,
  updateWorkoutLog,
} from './data/repository'
import {
  getExerciseDemoMedia,
  isChecklistDemoMedia,
  isVerifiedDemoMedia,
  isVerifiedVideoDemoMedia,
  learningActionForDemoMedia,
} from './data/exerciseDemoCatalog'
import { mediaCoverageRows, type MediaCoverageRow } from './data/mediaCoverageMatrix'
import { primaryNavItems } from './data/navigation'
import {
  isDefaultLibraryExercise,
  isSearchOnlyExercise,
  rampRepGroupForExercise,
  sweatModeLibraryGroups,
} from './data/trainingTaxonomy'
import {
  consistencyByDate,
  exerciseHistory,
  estimatedVolumeByExercise,
  minutesPerWeek,
  sessionsPerWeek,
  topExercisesByFrequency,
  totalSetsPerWeek,
  type BarDatum,
} from './utils/metrics'
import {
  calculateConsistencyStreak,
  dayName,
  getNextRecommendedRoutine,
  getScheduledRoutineForDate,
  isDeloadWeek,
} from './utils/schedule'
import { formatShortDate, toDateKey } from './utils/date'
import {
  exerciseEquipmentKey,
  firstNumber,
  mostRecentCompletedEntry,
  personalDefaultForExercise,
  resolveExerciseLogDefaults,
} from './utils/defaults'
import { calculateRuckLoadPounds, ruckLoadNotice } from './utils/ruck'
import { functionalCategories, getExerciseCategory, type FunctionalCategory } from './utils/exerciseCategories'
import {
  buildCarbReports,
  carbMealSlotLabels,
  carbMealSlots,
  carbQuickPicks,
  goalForDate,
  normalizeCarbGrams,
  sortedCarbPresets,
  sourceLabels,
  totalCarbsByMeal,
} from './utils/carbs'
import { validateGoogleAppsScriptUrl } from './services/googleSheetsSync'
import { getUsdaFoodDetails, searchUsdaFoods } from './services/foodLookup/usdaFoodDataCentral'
import type { FoodLookupResult } from './services/foodLookup/types'
import type {
  AppData,
  BikeTourPurpose,
  CarbEntry,
  CarbMealSlot,
  CarbSettings,
  EquipmentKind,
  Exercise,
  ExerciseDemoMedia,
  ExerciseGroup,
  ExerciseLogEntry,
  Routine,
  RoutineExercise,
  SchedulePreference,
  SkipReason,
  UserSettings,
  WorkoutDraftEntry,
  WorkoutLog,
} from './types'

type Page = 'dashboard' | 'train' | 'ride' | 'workouts' | 'log' | 'carbs' | 'progress' | 'settings' | 'roadmap' | 'more'
type WorkoutsTab = 'routines' | 'library'
type LogMode = 'recommended' | 'routine' | 'free'
type ActiveWorkoutStage = 'workout' | 'review'
type RideTemplate =
  | 'Start ride log'
  | 'Hill repeats'
  | 'Burley trailer'
  | 'Recovery spin'
  | 'Commute walk'
  | 'Dog walk'
  | 'Ruck walk'
  | 'Ruck commute'
type RideSurface = 'pavement' | 'gravel' | 'mixed'
type RideLoad = 'none' | 'bags' | 'trailer' | 'dog' | 'ruck'

interface RideDraftState {
  template: RideTemplate
  minutes: number
  miles: number
  elevationGain: number
  effort: number
  surface: RideSurface
  load: RideLoad
  notes: string
  dogComfortCheck: boolean
  temperature: string
  dogWeight: number
  trailerLoadWeight: number
  waterLiters: number
  ruckEmptyPackWeight: number
  ruckExtraWeight: number
  discomfort: number
  nextDaySoreness?: number
}

const navIconByPage: Record<(typeof primaryNavItems)[number]['page'], typeof Activity> = {
  dashboard: Home,
  train: Dumbbell,
  ride: Route,
  carbs: Flame,
  more: Menu,
}

const appVersion = `${__APP_COMMIT__} · ${new Date(__APP_BUILD_DATE__).toLocaleDateString()}`

const activeWorkoutPrimaryActions = ['Done', '+ Set', 'Skip']

const rideTemplateExerciseId: Record<RideTemplate, string> = {
  'Start ride log': 'easy-endurance-ride',
  'Hill repeats': 'hill-repeat-ride',
  'Burley trailer': 'burley-loaded-trailer-ride',
  'Recovery spin': 'recovery-spin',
  'Commute walk': 'commute-walk',
  'Dog walk': 'dog-walk',
  'Ruck walk': 'hydration-ruck-walk',
  'Ruck commute': 'ruck-commute',
}

const rideTemplateDefaults: Record<RideTemplate, { minutes: number; miles: number; effort: number; load: RideLoad }> = {
  'Start ride log': { minutes: 45, miles: 8, effort: 4, load: 'none' },
  'Hill repeats': { minutes: 45, miles: 6, effort: 8, load: 'none' },
  'Burley trailer': { minutes: 35, miles: 5, effort: 4, load: 'dog' },
  'Recovery spin': { minutes: 25, miles: 4, effort: 2, load: 'none' },
  'Commute walk': { minutes: 25, miles: 1.2, effort: 2, load: 'none' },
  'Dog walk': { minutes: 50, miles: 2.5, effort: 2, load: 'none' },
  'Ruck walk': { minutes: 35, miles: 2, effort: 4, load: 'ruck' },
  'Ruck commute': { minutes: 25, miles: 1.2, effort: 3, load: 'ruck' },
}

const rideTemplateOptions: RideTemplate[] = ['Start ride log', 'Hill repeats', 'Burley trailer', 'Recovery spin', 'Commute walk', 'Dog walk', 'Ruck walk', 'Ruck commute']
const walkTemplates = new Set<RideTemplate>(['Commute walk', 'Dog walk'])
const ruckTemplates = new Set<RideTemplate>(['Ruck walk', 'Ruck commute'])

const landmarkWords = ['hands', 'feet', 'hips', 'ribs', 'knees', 'shoulders', 'spine', 'breath', 'load', 'eyes']

const skipReasons: SkipReason[] = ['work', 'travel', 'fatigue', 'soreness', 'illness', 'no time', 'other']
const equipmentKinds: EquipmentKind[] = ['bodyweight', 'dumbbell', 'kettlebell', 'band', 'yoga mat', 'carry', 'bike', 'trailer', 'chair', 'bench', 'rucksack', 'foam roller', 'suspension trainer', 'pull-up bar']
const exerciseGroups: ExerciseGroup[] = [
  'Mobility & Yoga',
  'Core Stability',
  'Upper Back & Posture',
  'Hinge & Posterior Chain',
  'Single-Leg Strength',
  'Carry & Load Transfer',
  'Balance & Control',
  'Recovery',
  'Burley & Trailer Work',
  'Ride Sessions',
  'Walk & Ruck',
]
const bikePurposes: BikeTourPurpose[] = ['anti-extension', 'anti-rotation', 'lateral stability', 'upper back', 'posterior chain', 'hill climbing', 'loaded-bike durability', 'mobility', 'recovery', 'ride conditioning', 'trailer handling', 'walking base', 'ruck tolerance', 'bench strength']
const emptyRoutines: Routine[] = []
const emptyExercises: Exercise[] = []
const emptyRoutineExercises: RoutineExercise[] = []
const emptyLogs: WorkoutLog[] = []
const emptyEntries: ExerciseLogEntry[] = []
const emptyCarbEntries: CarbEntry[] = []

const numberOrUndefined = (value: string) => {
  if (value === '') {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const lines = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

const downloadText = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const formatDuration = (seconds?: number) => {
  if (!seconds) {
    return ''
  }

  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.round(seconds / 60)
  return `${minutes} min`
}

const uniqueNumbers = (values: number[]) =>
  [...new Set(values.map((value) => Number(value.toFixed(2))))].sort((a, b) => a - b)

const pickerOptionsFor = (min: number, max: number, step: number, quickOptions?: number[]) => {
  const boundedQuickOptions = quickOptions?.filter((option) => option >= min && option <= max) ?? []
  const span = max - min
  const coarseStep = span > 1000 ? 300 : span > 300 ? 25 : span > 80 ? 10 : step
  const generated: number[] = []

  for (let value = min; value <= max && generated.length < 80; value += coarseStep) {
    generated.push(value)
  }

  return uniqueNumbers([...boundedQuickOptions, ...generated, min, max])
}

const carbStatusText = (total: number, goal: number) => {
  const remaining = goal - total
  if (remaining > 0) {
    return `${remaining}g left`
  }
  if (remaining === 0) {
    return 'Goal met'
  }
  return `Over by ${Math.abs(remaining)}g`
}

const prescription = (entry: RoutineExercise, exercise?: Exercise) => {
  const sets = entry.sets ?? exercise?.defaults.sets
  const reps = entry.reps ?? exercise?.defaults.reps
  const duration = entry.durationSeconds ?? exercise?.defaults.durationSeconds
  const distance = entry.distance ?? exercise?.defaults.distance
  const pieces = [sets ? `${sets} sets` : '', reps ?? '', duration ? formatDuration(duration) : '', distance ?? ''].filter(Boolean)
  return pieces.join(' / ') || 'open'
}

const landmarkStep = (step: string, index: number) => {
  const trimmed = step.trim()
  if (landmarkWords.some((word) => trimmed.toLowerCase().startsWith(word))) {
    return trimmed
  }

  const fallback = landmarkWords[index % landmarkWords.length]
  return `${fallback}: ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const buildDraftEntries = (
  routine: Routine,
  data: AppData,
  deloadApplied: boolean,
): WorkoutDraftEntry[] => {
  const exerciseByName = new Map(data.exercises.map((exercise) => [exercise.name, exercise]))
  const exerciseById = new Map(data.exercises.map((exercise) => [exercise.id, exercise]))

  return data.routineExercises
    .filter((entry) => entry.routineId === routine.id)
    .sort((a, b) => a.order - b.order)
    .map((entry) => {
      const exercise = entry.variationOptions?.[0]
        ? exerciseByName.get(entry.variationOptions[0]) ?? exerciseById.get(entry.exerciseId)
        : exerciseById.get(entry.exerciseId)
      const equipmentKey = exerciseEquipmentKey(exercise)
      const sets = entry.sets ?? exercise?.defaults.sets
      const adjustedSets = deloadApplied && sets && sets > 1 ? Math.max(1, Math.round(sets * 0.7)) : sets
      const recentEntry = mostRecentCompletedEntry(exercise?.id ?? entry.exerciseId, data.exerciseLogEntries, data.workoutLogs, equipmentKey)
      const remembered = resolveExerciseLogDefaults({
        exercise,
        routineExercise: { ...entry, sets: adjustedSets },
        personalDefault: personalDefaultForExercise(data.personalExerciseDefaults, exercise?.id ?? entry.exerciseId, equipmentKey),
        recentEntry,
        units: data.settings.units,
      })

      return {
        routineExerciseId: entry.id,
        exerciseId: exercise?.id ?? entry.exerciseId,
        equipmentKey,
        exerciseName: exercise?.name ?? 'exercise',
        sets: remembered.sets,
        reps: remembered.reps,
        weight: remembered.weight,
        durationSeconds: remembered.durationSeconds,
        distance: remembered.distance,
        effort: remembered.effort,
        notes: remembered.notes ?? entry.notes,
        lastSummary: remembered.lastSummary,
      }
    })
}

const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`card ${className}`}>{children}</section>
)

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="empty-state">
    <p className="eyebrow">{title}</p>
    <p>{body}</p>
  </div>
)

const ActionMenu = ({ label, children }: { label: string; children: ReactNode }) => (
  <details className="action-menu">
    <summary aria-label={label}>
      <MoreVertical aria-hidden="true" size={18} />
    </summary>
    <div className="action-menu-panel">{children}</div>
  </details>
)

const BarList = ({ data, unit = '' }: { data: BarDatum[]; unit?: string }) => {
  const max = Math.max(1, ...data.map((item) => item.value))

  if (!data.length) {
    return <EmptyState title="No chart data yet" body="Log a workout to populate this view." />
  }

  return (
    <div className="bar-list">
      {data.map((item) => (
        <div className="bar-row" key={item.label}>
          <span className="bar-label">{item.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} />
          </span>
          <span className="bar-value">
            {item.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  )
}

const NumberStepper = ({
  label,
  value,
  min = 0,
  max = 999,
  step = 1,
  suffix = '',
  onChange,
  quickOptions,
  quickIncrements,
}: {
  label: string
  value?: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  onChange: (value: number | undefined) => void
  quickOptions?: number[]
  quickIncrements?: number[]
}) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const current = value ?? min
  const clamp = (next: number) => Math.max(min, Math.min(max, Number(next.toFixed(2))))
  const increments = quickIncrements ?? [step, step * 5, step * 10].filter((item, index, array) => item > 0 && array.indexOf(item) === index)
  const pickerOptions = pickerOptionsFor(min, max, step, quickOptions)
  const repeatRef = useRef<{ timeout?: number; interval?: number; repeated: boolean }>({ repeated: false })
  const valueRef = useRef(current)

  useEffect(() => {
    valueRef.current = value ?? min
  }, [min, value])

  const updateBy = (delta: number) => onChange(clamp(valueRef.current + delta))

  const stopRepeat = () => {
    if (repeatRef.current.timeout) {
      window.clearTimeout(repeatRef.current.timeout)
    }
    if (repeatRef.current.interval) {
      window.clearInterval(repeatRef.current.interval)
    }
    repeatRef.current.timeout = undefined
    repeatRef.current.interval = undefined
  }

  const startRepeat = (delta: number) => {
    stopRepeat()
    updateBy(delta)
    repeatRef.current.repeated = false
    repeatRef.current.timeout = window.setTimeout(() => {
      repeatRef.current.repeated = true
      repeatRef.current.interval = window.setInterval(() => updateBy(delta), 120)
    }, 360)
  }

  useEffect(
    () => () => {
      stopRepeat()
    },
    [],
  )

  return (
    <div className="stepper-control">
      <div className="stepper-head">
        <span>{label}</span>
        <strong>
          {value ?? '-'}
          {value != null ? suffix : ''}
        </strong>
      </div>
      <div className="stepper-row">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onPointerCancel={stopRepeat}
          onPointerDown={() => startRepeat(-step)}
          onPointerLeave={stopRepeat}
          onPointerUp={stopRepeat}
          onClick={(event) => {
            if (event.detail === 0) {
              updateBy(-step)
            }
          }}
        >
          -
        </button>
        <button className="stepper-value" type="button" onClick={() => setPickerOpen(true)} aria-label={`Pick ${label}`}>
          {value ?? 'Tap'}
          {value != null ? suffix : ''}
        </button>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onPointerCancel={stopRepeat}
          onPointerDown={() => startRepeat(step)}
          onPointerLeave={stopRepeat}
          onPointerUp={stopRepeat}
          onClick={(event) => {
            if (event.detail === 0) {
              updateBy(step)
            }
          }}
        >
          +
        </button>
      </div>
      <div className="increment-row" aria-label={`${label} quick increments`}>
        {increments.map((increment) => (
          <button key={`${label}-plus-${increment}`} type="button" onClick={() => onChange(clamp(current + increment))}>
            +{increment}
          </button>
        ))}
      </div>
      {quickOptions?.length ? (
        <div className="quick-chip-row" aria-label={`${label} quick picks`}>
          {quickOptions.map((option) => (
            <button className={option === value ? 'active' : ''} key={`${label}-${option}`} type="button" onClick={() => onChange(option)}>
              {option}
              {suffix}
            </button>
          ))}
        </div>
      ) : null}
      {pickerOpen && (
        <div className="sheet-backdrop picker-backdrop" role="presentation" onClick={() => setPickerOpen(false)}>
          <section className="number-picker-sheet" role="dialog" aria-modal="true" aria-labelledby={`${label}-picker-title`} onClick={(event) => event.stopPropagation()}>
            <div className="section-title">
              <div>
                <p className="eyebrow">Picker</p>
                <h2 id={`${label}-picker-title`}>{label}</h2>
              </div>
              <button className="icon-button" type="button" aria-label={`Close ${label} picker`} onClick={() => setPickerOpen(false)}>
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="picker-wheel" role="listbox" aria-label={`${label} values`}>
              {pickerOptions.map((option) => (
                <button
                  className={option === value ? 'active' : ''}
                  key={`${label}-picker-${option}`}
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  onClick={() => onChange(option)}
                >
                  {option}
                  {suffix}
                </button>
              ))}
            </div>
            <label>
              Exact value
              <input inputMode="decimal" value={value ?? ''} onChange={(event) => onChange(numberOrUndefined(event.target.value))} />
            </label>
            <button className="primary-button" type="button" onClick={() => setPickerOpen(false)}>
              Done
            </button>
          </section>
        </div>
      )}
    </div>
  )
}

const WeightPicker = ({
  units,
  value,
  onChange,
  label = 'Weight',
}: {
  units: string
  value?: number
  onChange: (value: number | undefined) => void
  label?: string
}) => (
  <NumberStepper label={label} value={value} min={0} max={500} step={units === 'kg' ? 2.5 : 5} suffix={` ${units}`} quickOptions={units === 'kg' ? [0, 8, 12, 16, 20, 24, 32] : [0, 20, 25, 30, 35, 40, 45, 53]} quickIncrements={units === 'kg' ? [1, 2.5, 5] : [5, 10, 25]} onChange={onChange} />
)

const DurationPicker = ({ label = 'Seconds', value, onChange }: { label?: string; value?: number; onChange: (value: number | undefined) => void }) => (
  <NumberStepper label={label} value={value} min={0} max={14400} step={label === 'Minutes' ? 5 : 10} suffix={label === 'Minutes' ? ' min' : 's'} quickOptions={label === 'Minutes' ? [10, 20, 30, 45, 60, 90] : [20, 30, 45, 60, 90, 120]} quickIncrements={label === 'Minutes' ? [1, 5, 10] : [5, 10, 30]} onChange={onChange} />
)

const EffortPicker = ({ value, onChange }: { value?: number; onChange: (value: number | undefined) => void }) => (
  <NumberStepper
    label="RPE"
    value={value}
    min={1}
    max={10}
    step={1}
    suffix="/10"
    quickOptions={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
    quickIncrements={[1, 2]}
    onChange={onChange}
  />
)

const LogoMark = () => (
  <span className="brand-mark" aria-hidden="true">
    <svg viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="27" />
      <path d="M17 40c8-13 17-20 27-22" />
      <path d="M18 25c11 3 20 9 28 20" />
      <path d="M32 11v42M11 32h42" />
    </svg>
  </span>
)

const ExerciseDemoButton = ({
  exercise,
  onOpen,
  compact = false,
  allowLocalFallback = false,
}: {
  exercise: Exercise
  onOpen: (id: string, launcher?: HTMLElement) => void
  compact?: boolean
  allowLocalFallback?: boolean
}) => {
  const media = getExerciseDemoMedia(exercise.id)
  const verifiedMedia = isVerifiedDemoMedia(media) ? media : undefined
  const label = learningActionForDemoMedia(verifiedMedia, { allowLocalFallback })
  const iconSize = compact ? 16 : 18
  const Icon = label === 'Checklist' ? CheckCircle2 : CircleHelp

  if (!verifiedMedia) {
    if (allowLocalFallback) {
      return (
        <button
          className={compact ? 'demo-button compact' : 'demo-button'}
          type="button"
          onClick={(event) => onOpen(exercise.id, event.currentTarget)}
        >
          <CircleHelp aria-hidden="true" size={iconSize} />
          <span>{label}</span>
        </button>
      )
    }

    return (
      <span className={compact ? 'demo-status-text compact' : 'demo-status-text'} aria-label={`${exercise.name} needs demo review`}>
        <CircleHelp aria-hidden="true" size={iconSize} />
        <span>Needs review</span>
      </span>
    )
  }

  return (
    <button
      className={compact ? 'demo-button compact' : 'demo-button'}
      type="button"
      onClick={(event) => {
        if (verifiedMedia.kind === 'externalVideo' && verifiedMedia.url) {
          const externalWindow = window.open(verifiedMedia.url, '_blank', 'noopener,noreferrer')
          if (externalWindow) {
            return
          }
        }
        onOpen(exercise.id, event.currentTarget)
      }}
    >
      <Icon aria-hidden="true" size={iconSize} />
      <span>{label}</span>
    </button>
  )
}

const exerciseDemoStatusText = (exercise: Exercise) => {
  const media = getExerciseDemoMedia(exercise.id)
  const verifiedMedia = isVerifiedDemoMedia(media) ? media : undefined
  const action = learningActionForDemoMedia(verifiedMedia)

  if (action === 'Watch') {
    return 'Video demo ready'
  }
  if (action === 'Read') {
    return 'Direct article ready'
  }
  if (action === 'Checklist') {
    return 'Checklist ready'
  }
  return 'Needs review'
}

const ExerciseDemoView = ({
  exercise,
  media,
  onClose,
  onLog,
}: {
  exercise: Exercise
  media?: ExerciseDemoMedia
  onClose: () => void
  onLog: () => void
}) => {
  const verifiedMedia = isVerifiedDemoMedia(media) ? media : undefined
  const hasVideo = isVerifiedVideoDemoMedia(verifiedMedia)
  const hasChecklist = isChecklistDemoMedia(verifiedMedia)
  const hasSourceTab = Boolean(verifiedMedia)
  const sourceHref = verifiedMedia?.sourcePageUrl ?? verifiedMedia?.url
  const [demoTab, setDemoTab] = useState<'watch' | 'do' | 'mistakes' | 'source'>(hasVideo ? 'watch' : 'do')
  const demoSteps = exercise.instructions.slice(0, 5).map(landmarkStep)
  const demoMistakes = exercise.commonMistakes.slice(0, 5)
  const sourceActionLabel = verifiedMedia?.kind === 'youtubeEmbed' ? 'Open in YouTube' : verifiedMedia?.kind === 'externalVideo' ? 'Open video' : 'Open source'

  return (
    <section className="exercise-demo-view" role="dialog" aria-modal="true" aria-labelledby="demo-title">
      <header className="demo-view-header">
        <button className="demo-back-button" type="button" onClick={onClose} autoFocus>
          <ArrowLeft aria-hidden="true" size={19} />
          Back
        </button>
        <div>
          <p className="eyebrow">Exercise demo</p>
          <h2 id="demo-title">{exercise.name}</h2>
        </div>
      </header>

      <main className="demo-view-body">
        {!verifiedMedia && (
          <div className="demo-review-notice">
            <CircleHelp aria-hidden="true" size={18} />
            <span>Demo needs review. Local coaching is still available below.</span>
          </div>
        )}

        <div className="demo-tab-row" role="tablist" aria-label="Exercise demo details">
          {hasVideo && (
            <button className={demoTab === 'watch' ? 'active' : ''} type="button" role="tab" aria-selected={demoTab === 'watch'} onClick={() => setDemoTab('watch')}>
              Watch
            </button>
          )}
          <button className={demoTab === 'do' ? 'active' : ''} type="button" role="tab" aria-selected={demoTab === 'do'} onClick={() => setDemoTab('do')}>
            Do
          </button>
          <button className={demoTab === 'mistakes' ? 'active' : ''} type="button" role="tab" aria-selected={demoTab === 'mistakes'} onClick={() => setDemoTab('mistakes')}>
            Mistakes
          </button>
          {hasSourceTab && (
            <button className={demoTab === 'source' ? 'active' : ''} type="button" role="tab" aria-selected={demoTab === 'source'} onClick={() => setDemoTab('source')}>
              Source
            </button>
          )}
        </div>

        {demoTab === 'watch' && hasVideo && (
          <div className="demo-section demo-glance-panel demo-watch-panel">
            <p className="eyebrow">Watch</p>
            <h3>{verifiedMedia?.title ?? 'Demo needs review'}</h3>
            {verifiedMedia?.kind === 'youtubeEmbed' && verifiedMedia.embedUrl ? (
              <iframe
                title={verifiedMedia.title}
                src={verifiedMedia.embedUrl}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <p>{verifiedMedia?.attributionText}</p>
            )}
            {sourceHref && (
              <a className="ghost-button" href={sourceHref} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" size={18} />
                {sourceActionLabel}
              </a>
            )}
            <div className="demo-meta">
              <span className="tag">{rampRepGroupForExercise(exercise)}</span>
              <span className="tag">{exercise.difficulty}</span>
            </div>
          </div>
        )}

        {demoTab === 'do' && (
          <div className="demo-section demo-glance-panel">
            <p className="eyebrow">Do</p>
            <p className="demo-purpose">{exercise.purpose ?? exercise.description}</p>
            <h3>Setup</h3>
            <p>{exercise.setup ?? 'Choose a stable start and a range you can control.'}</p>
            <ol className="demo-big-list">
              {demoSteps.map((step, stepIndex) => (
                <li key={`${exercise.id}-step-${stepIndex}`}>{step}</li>
              ))}
            </ol>
            <p className="demo-dose">{exercise.dose ?? prescription({ id: 'demo', routineId: 'demo', exerciseId: exercise.id, section: 'main', order: 1 }, exercise)}</p>
            {hasChecklist && <p className="demo-checklist-note">Use this as the session checklist, then log distance, load, effort, or notes from the workout screen.</p>}
            {exercise.safety?.length ? (
              <div className="demo-stop-list">
                <h3>Stop if</h3>
                <ul>
                  {exercise.safety.slice(0, 3).map((item, itemIndex) => (
                    <li key={`${exercise.id}-safety-${itemIndex}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {demoTab === 'mistakes' && (
          <div className="demo-section demo-glance-panel">
            <p className="eyebrow">Mistakes</p>
            <ul className="demo-big-list">
              {demoMistakes.map((mistake, mistakeIndex) => (
                <li key={`${exercise.id}-mistake-${mistakeIndex}`}>{mistake}</li>
              ))}
            </ul>
            <details>
              <summary>Make easier / harder</summary>
              <div className="two-column-section">
                <div>
                  <h3>Make it easier</h3>
                  <ul>
                    {(exercise.regressions ?? ['Reduce range, load, or time until each rep is clean.']).map((regression, regressionIndex) => (
                      <li key={`${exercise.id}-regression-${regressionIndex}`}>{regression}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Make it harder</h3>
                  <ul>
                    {(exercise.progressions ?? ['Add a small amount of load, time, or range after form is repeatable.']).map((progression, progressionIndex) => (
                      <li key={`${exercise.id}-progression-${progressionIndex}`}>{progression}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          </div>
        )}

        {demoTab === 'source' && (
          <div className="demo-section demo-glance-panel">
            <p className="eyebrow">Source</p>
            <h3>{verifiedMedia?.title ?? 'No direct source attached'}</h3>
            <div className="demo-source-facts">
              <span>
                Provider <strong>{verifiedMedia?.provider ?? 'RampRep review queue'}</strong>
              </span>
              <span>
                Reviewed <strong>{verifiedMedia?.reviewedAtISO?.slice(0, 10) ?? 'pending'}</strong>
              </span>
              <span>
                Type <strong>{hasChecklist ? 'Checklist' : hasVideo ? 'Video' : 'Article'}</strong>
              </span>
            </div>
            <p>{verifiedMedia?.attributionText ?? 'RampRep has local instructions, but no reviewed exercise-specific external source yet.'}</p>
            {sourceHref && (
              <a className="ghost-button" href={sourceHref} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" size={18} />
                {sourceActionLabel}
              </a>
            )}
            {!sourceHref && hasChecklist && <p className="demo-checklist-note">This is a local checklist source with no external media link.</p>}
          </div>
        )}

        <p className="demo-attribution">
          {verifiedMedia?.attributionText ?? 'No verified motion media is attached yet.'}
          {verifiedMedia?.licenseName ? ` License: ${verifiedMedia.licenseName}.` : ''}
          {exercise.sourceReferences?.length ? ` Source: ${exercise.sourceReferences[0].provider}.` : ''}
        </p>
      </main>

      <footer className="demo-view-footer">
        <button className="primary-button" type="button" onClick={onLog}>
          <Plus aria-hidden="true" size={18} />
          Log this
        </button>
        <button className="ghost-button" type="button" onClick={onClose}>
          <ArrowLeft aria-hidden="true" size={18} />
          Back
        </button>
      </footer>
    </section>
  )
}

const MediaCoveragePanel = ({ onFlash }: { onFlash: (message: string) => void }) => {
  const copyJson = async (row: MediaCoverageRow, override?: Partial<MediaCoverageRow>) => {
    const payload = { ...row, ...override }
    await navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))
    onFlash(override?.status === 'needsReview' ? 'Needs-review media row copied.' : 'Media row JSON copied.')
  }

  return (
    <Card className="media-coverage-card">
      <div className="section-title">
        <div>
          <p className="eyebrow">Media coverage</p>
          <h2>Demo QA matrix</h2>
        </div>
        <span className="tag">{mediaCoverageRows.length} rows</span>
      </div>
      <div className="media-coverage-grid" role="table" aria-label="Exercise media coverage matrix">
        {mediaCoverageRows.map((row) => (
          <div className="media-coverage-row" role="row" key={row.exerciseId}>
            <div>
              <strong>{row.exerciseName}</strong>
              <span>{row.defaultVisible ? 'Default visible' : 'Optional/search-only'}</span>
            </div>
            <div>
              <span>{row.sourceType}</span>
              <strong>{row.provider}</strong>
            </div>
            <div>
              <span>{row.behavior}</span>
              <strong>{row.status}</strong>
            </div>
            <div>
              <span>Reviewed {row.reviewedAtISO ? row.reviewedAtISO.slice(0, 10) : 'pending'}</span>
              <small>{row.directUrl || row.statusReason}</small>
            </div>
            <div className="media-coverage-actions">
              {row.directUrl ? (
                <a className="ghost-button compact-cta" href={row.directUrl} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" size={16} />
                  Open source
                </a>
              ) : (
                <span className="demo-status-text compact">Local checklist</span>
              )}
              <button
                className="ghost-button compact-cta"
                type="button"
                onClick={() => void copyJson(row, { status: 'needsReview', statusReason: `QA marked for review from ${row.status}.` })}
              >
                <CircleHelp aria-hidden="true" size={16} />
                Mark needs review
              </button>
              <button className="ghost-button compact-cta" type="button" onClick={() => void copyJson(row)}>
                <Copy aria-hidden="true" size={16} />
                Copy JSON
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState('')
  const [selectedRoutineId, setSelectedRoutineId] = useState('')
  const [workoutsTab, setWorkoutsTab] = useState<WorkoutsTab>('routines')
  const [libraryQuery, setLibraryQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<FunctionalCategory | ''>('')
  const [groupFilter, setGroupFilter] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [purposeFilter, setPurposeFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [libraryFiltersOpen, setLibraryFiltersOpen] = useState(false)
  const [routineDraft, setRoutineDraft] = useState<Routine | null>(null)
  const [exerciseDraft, setExerciseDraft] = useState<Exercise | null>(null)
  const [demoExerciseId, setDemoExerciseId] = useState('')
  const demoLauncherRef = useRef<HTMLElement | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [draftEntries, setDraftEntries] = useState<WorkoutDraftEntry[]>([])
  const [activeWorkout, setActiveWorkout] = useState<{
    stage: ActiveWorkoutStage
    currentIndex: number
    startedAt: number
    routineName: string
  } | null>(null)
  const [skipPromptRoutine, setSkipPromptRoutine] = useState<Routine | null>(null)
  const [logMode, setLogMode] = useState<LogMode>('recommended')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [logNotes, setLogNotes] = useState('')
  const [freeExerciseId, setFreeExerciseId] = useState('')
  const [quickExerciseName, setQuickExerciseName] = useState('')
  const [editLog, setEditLog] = useState<{ log: WorkoutLog; entries: ExerciseLogEntry[] } | null>(null)
  const [settingsDraft, setSettingsDraft] = useState<UserSettings | null>(null)
  const [carbSettingsDraft, setCarbSettingsDraft] = useState<CarbSettings | null>(null)
  const [scheduleDraft, setScheduleDraft] = useState<SchedulePreference | null>(null)
  const [carbSelectedDate, setCarbSelectedDate] = useState(() => toDateKey(new Date()))
  const [carbMealSlot, setCarbMealSlot] = useState<CarbMealSlot>('breakfast')
  const [carbAmount, setCarbAmount] = useState(0)
  const [carbEditEntry, setCarbEditEntry] = useState<CarbEntry | null>(null)
  const [presetDraft, setPresetDraft] = useState({ id: '', name: '', netCarbs: 0, servingDescription: '' })
  const [lookupQuery, setLookupQuery] = useState('')
  const [lookupResults, setLookupResults] = useState<FoodLookupResult[]>([])
  const [lookupSelected, setLookupSelected] = useState<FoodLookupResult | null>(null)
  const [lookupOverride, setLookupOverride] = useState<number | undefined>()
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [usdaKeyDraft, setUsdaKeyDraft] = useState('')
  const [usdaKeySaved, setUsdaKeySaved] = useState(false)
  const [usdaTestQuery, setUsdaTestQuery] = useState('plain greek yogurt')
  const [usdaKeyBusy, setUsdaKeyBusy] = useState(false)
  const [usdaKeyStatus, setUsdaKeyStatus] = useState('')
  const [carbPanel, setCarbPanel] = useState<'none' | 'lookup' | 'reports' | 'presets'>('none')
  const [rideDraft, setRideDraft] = useState<RideDraftState>({
    template: 'Start ride log' as RideTemplate,
    minutes: 45,
    miles: 8,
    elevationGain: 0,
    effort: 4,
    surface: 'mixed' as RideSurface,
    load: 'none' as RideLoad,
    notes: '',
    dogComfortCheck: true,
    temperature: '',
    dogWeight: 45,
    trailerLoadWeight: 0,
    waterLiters: 1,
    ruckEmptyPackWeight: 2,
    ruckExtraWeight: 0,
    discomfort: 0,
    nextDaySoreness: undefined,
  })
  const [updateReady, setUpdateReady] = useState(false)
  const [temporaryChangeDraft, setTemporaryChangeDraft] = useState({
    startsOn: '',
    endsOn: '',
    note: '',
    routineId: '',
  })
  const [roadmapConflictDraft, setRoadmapConflictDraft] = useState({ startsOn: '', endsOn: '', note: '' })
  const [historyExerciseName, setHistoryExerciseName] = useState('')

  const refresh = useCallback(async () => {
    const [snapshot, usdaPrivateSetting] = await Promise.all([
      getAppData(),
      getPrivateSetting(USDA_API_KEY_PRIVATE_SETTING_KEY),
    ])
    setData(snapshot)
    setSettingsDraft(snapshot.settings)
    setCarbSettingsDraft(snapshot.carbSettings)
    setUsdaKeySaved(Boolean(usdaPrivateSetting?.encryptedOrPlainValue.trim()))
    setScheduleDraft(snapshot.schedule)
    setLoading(false)
  }, [])

  useEffect(() => {
    void initializeAppData()
      .then(refresh)
      .catch((error) => {
        setFlash(error instanceof Error ? error.message : 'Unable to load RampRep data.')
        setLoading(false)
      })
  }, [refresh])

  const today = new Date()
  const routines = data?.routines ?? emptyRoutines
  const enabledRoutines = routines.filter((routine) => routine.enabled)
  const exercises = data?.exercises ?? emptyExercises
  const routineExercises = data?.routineExercises ?? emptyRoutineExercises
  const logs = data?.workoutLogs ?? emptyLogs
  const entries = data?.exerciseLogEntries ?? emptyEntries
  const carbEntries = data?.carbEntries ?? emptyCarbEntries
  const scheduledToday = data ? getScheduledRoutineForDate(today, data.schedule, routines) : null
  const nextRecommendation = data ? getNextRecommendedRoutine(today, data.schedule, routines) : null
  const selectedRoutine = routines.find((routine) => routine.id === selectedRoutineId) ?? nextRecommendation?.routine ?? enabledRoutines[0]
  const activeRoutineDraft = routineDraft?.id === selectedRoutine?.id ? routineDraft : selectedRoutine
  const activeHistoryExerciseName = historyExerciseName || exercises[0]?.name || ''
  const nextRoadmapMilestone = data?.roadmap.milestones
    .filter((milestone) => !milestone.completed)
    .sort((a, b) => a.order - b.order)[0]

  const exerciseById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises])
  const exerciseByName = useMemo(() => new Map(exercises.map((exercise) => [exercise.name, exercise])), [exercises])

  useEffect(() => {
    if (!data?.settings) {
      return
    }

    if (data.settings.darkMode === 'system') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.dataset.theme = data.settings.darkMode
    }
  }, [data?.settings])

  useEffect(() => {
    const handleUpdateReady = () => setUpdateReady(true)
    window.addEventListener('ramprep:update-ready', handleUpdateReady)
    return () => window.removeEventListener('ramprep:update-ready', handleUpdateReady)
  }, [])

  const deloadApplied = data ? isDeloadWeek(today, data.schedule.deloadEveryFourthWeek) : false
  const streak = data ? calculateConsistencyStreak(logs, today) : 0
  const selectedRoutineExercises = selectedRoutine
    ? routineExercises.filter((entry) => entry.routineId === selectedRoutine.id).sort((a, b) => a.order - b.order)
    : []
  const visibleDraftEntries =
    logMode === 'free'
      ? draftEntries
      : selectedRoutine && data
      ? draftEntries.length
        ? draftEntries
        : buildDraftEntries(selectedRoutine, data, deloadApplied)
      : []

  const pulseFeedback = () => {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12)
    }
  }

  const showFlash = (message: string, vibrate = false) => {
    if (vibrate) {
      pulseFeedback()
    }
    setFlash(message)
    window.setTimeout(() => setFlash(''), 3200)
  }

  const prepareRoutine = (routineId: string) => {
    setSelectedRoutineId(routineId)
    const routine = routines.find((item) => item.id === routineId)
    if (routine && data) {
      setDraftEntries(buildDraftEntries(routine, data, deloadApplied))
      setDurationMinutes(routine.estimatedMinutes)
      setLogNotes('')
      setLogMode('routine')
    }
  }

  const startActiveRoutine = (routineId: string, mode: LogMode = 'recommended') => {
    const routine = routines.find((item) => item.id === routineId)
    if (!routine || !data) {
      return
    }

    const nextEntries = buildDraftEntries(routine, data, deloadApplied)
    setSelectedRoutineId(routineId)
    setDraftEntries(nextEntries)
    setDurationMinutes(routine.estimatedMinutes)
    setLogNotes('')
    setLogMode(mode)
    setActiveWorkout({
      stage: 'workout',
      currentIndex: 0,
      startedAt: new Date().getTime(),
      routineName: routine.name,
    })
    setPage('train')
  }

  const startRoutine = (routineId: string) => {
    startActiveRoutine(routineId, 'recommended')
  }

  const startFreeWorkout = () => {
    setLogMode('free')
    setDraftEntries([])
    setSelectedRoutineId('')
    setDurationMinutes(settingsDraft?.durationPreference ?? 30)
    setLogNotes('')
    setPage('log')
  }

  const updateDraftEntryAt = (index: number, updater: (entry: WorkoutDraftEntry) => WorkoutDraftEntry) => {
    setDraftEntries((current) => {
      const base = current.length ? current : visibleDraftEntries
      return base.map((item, itemIndex) => (itemIndex === index ? updater(item) : item))
    })
  }

  const repeatActiveSet = (index: number) => {
    setDraftEntries((current) => {
      const base = current.length ? current : visibleDraftEntries
      const source = base[index]
      if (!source) {
        return base
      }

      return [
        ...base.slice(0, index + 1),
        { ...source, routineExerciseId: undefined, notes: source.notes ? `${source.notes} (repeat)` : 'repeat set' },
        ...base.slice(index + 1),
      ]
    })
    pulseFeedback()
  }

  const advanceActiveWorkout = () => {
    if (!activeWorkout) {
      return
    }

    if (activeWorkout.currentIndex >= visibleDraftEntries.length - 1) {
      setActiveWorkout({ ...activeWorkout, stage: 'review' })
      pulseFeedback()
      return
    }

    setActiveWorkout({ ...activeWorkout, currentIndex: activeWorkout.currentIndex + 1 })
    pulseFeedback()
  }

  const handleSkipRoutine = async (reason: SkipReason) => {
    if (!skipPromptRoutine) {
      return
    }

    await createSkippedWorkout(skipPromptRoutine, reason)
    setSkipPromptRoutine(null)
    await refresh()
    showFlash('Skipped workout logged.', true)
  }

  const buildRideDraftForTemplate = (template: RideTemplate, current = rideDraft): RideDraftState => {
    const defaults = rideTemplateDefaults[template]
    const miles =
      template === 'Commute walk' || template === 'Ruck commute'
        ? settingsDraft?.commuteDefaultMiles ?? defaults.miles
        : template === 'Dog walk'
        ? settingsDraft?.dogWalkDefaultMiles ?? defaults.miles
        : defaults.miles

    return {
      ...current,
      template,
      minutes: defaults.minutes,
      miles,
      effort: defaults.effort,
      load: defaults.load,
      waterLiters: ruckTemplates.has(template) ? settingsDraft?.ruckDefaultWaterLiters ?? current.waterLiters : current.waterLiters,
      ruckEmptyPackWeight: settingsDraft?.ruckEmptyPackWeight ?? current.ruckEmptyPackWeight,
      ruckExtraWeight: ruckTemplates.has(template) ? settingsDraft?.ruckDefaultExtraWeight ?? current.ruckExtraWeight : current.ruckExtraWeight,
      dogComfortCheck: template === 'Burley trailer' ? true : current.dogComfortCheck,
    }
  }

  const applyRideTemplate = (template: RideTemplate) => {
    setRideDraft((current) => buildRideDraftForTemplate(template, current))
  }

  const handleSaveRideLog = async (draft = rideDraft) => {
    if (!data) {
      return
    }

    const isRuckSession = ruckTemplates.has(draft.template) || draft.load === 'ruck'
    const isWalkSession = walkTemplates.has(draft.template) || isRuckSession
    const sessionKind = isRuckSession ? 'Ruck' : isWalkSession ? 'Walk' : 'Ride'

    if (draft.template === 'Hill repeats' && (draft.load === 'dog' || draft.load === 'trailer' || draft.load === 'ruck')) {
      showFlash('No hard repeats with dog, trailer, or ruck load. Unload first or choose an easy session.')
      return
    }

    if (draft.template === 'Burley trailer' && !draft.dogComfortCheck) {
      showFlash('Dog comfort check comes first.')
      return
    }

    const exerciseId = rideTemplateExerciseId[draft.template]
    const exercise = exerciseById.get(exerciseId)
    const totalTowedLoad = draft.load === 'dog' || draft.load === 'trailer'
      ? draft.dogWeight + draft.trailerLoadWeight
      : 0
    const totalRuckLoad = calculateRuckLoadPounds({
      waterLiters: draft.waterLiters,
      emptyPackWeight: draft.ruckEmptyPackWeight,
      extraWeight: draft.ruckExtraWeight,
    })
    const entry: WorkoutDraftEntry = {
      exerciseId,
      equipmentKey: isRuckSession ? 'hydration-rucksack-12l' : isWalkSession ? 'bodyweight' : draft.load === 'none' ? 'bike' : `bike-${draft.load}`,
      exerciseName: exercise?.name ?? draft.template,
      durationSeconds: draft.minutes * 60,
      distance: `${draft.miles} mi`,
      effort: draft.effort,
      notes: draft.notes || undefined,
      customFields: {
        elevationGain: draft.elevationGain,
        surface: draft.surface,
        load: draft.load,
        dogComfortCheck: draft.dogComfortCheck,
        temperature: draft.temperature || undefined,
        dogWeight: draft.dogWeight,
        trailerLoadWeight: draft.trailerLoadWeight,
        totalTowedLoad,
        waterLiters: isRuckSession ? draft.waterLiters : undefined,
        ruckEmptyPackWeight: isRuckSession ? draft.ruckEmptyPackWeight : undefined,
        ruckExtraWeight: isRuckSession ? draft.ruckExtraWeight : undefined,
        totalRuckLoad: isRuckSession ? totalRuckLoad : undefined,
        discomfort: isRuckSession ? draft.discomfort : undefined,
        nextDaySoreness: isRuckSession ? draft.nextDaySoreness : undefined,
      },
    }

    await createWorkoutLog({ name: `${sessionKind}: ${draft.template}` }, [entry], {
      totalMinutes: draft.minutes,
      notes: draft.notes || undefined,
      travelMode: data.schedule.travelMode,
      deloadApplied,
    })
    await refresh()
    showFlash(`${sessionKind} logged.${isRuckSession && draft.discomfort >= 4 ? ' Reduce load next time.' : ''}`, true)
  }

  const handleQuickSaveRideTemplate = async (template: RideTemplate) => {
    const nextDraft = buildRideDraftForTemplate(template)
    setRideDraft(nextDraft)
    await handleSaveRideLog(nextDraft)
  }

  const handleClearLocalAppCache = async () => {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key.startsWith('ramprep')).map((key) => caches.delete(key)))
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.update()))
    }

    showFlash('App cache cleared. IndexedDB data preserved.', true)
  }

  const openExerciseDemo = (exerciseId: string, launcher?: HTMLElement) => {
    demoLauncherRef.current = launcher ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setDemoExerciseId(exerciseId)
  }

  const closeExerciseDemo = useCallback(() => {
    setDemoExerciseId('')
    window.requestAnimationFrame(() => {
      demoLauncherRef.current?.focus()
    })
  }, [])

  useEffect(() => {
    if (!demoExerciseId) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeExerciseDemo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeExerciseDemo, demoExerciseId])

  const handleSaveRoutine = async (routineToSave?: Routine) => {
    if (!routineToSave) {
      return
    }

    await saveRoutine(routineToSave)
    await refresh()
    setRoutineDraft(null)
    showFlash('Routine saved.')
  }

  const moveRoutine = async (routine: Routine, direction: -1 | 1) => {
    const ordered = [...routines].sort((a, b) => a.order - b.order)
    const index = ordered.findIndex((item) => item.id === routine.id)
    const swap = ordered[index + direction]
    if (!swap) {
      return
    }

    await Promise.all([
      saveRoutine({ ...routine, order: swap.order }),
      saveRoutine({ ...swap, order: routine.order }),
    ])
    await refresh()
  }

  const moveRoutineExercise = async (entry: RoutineExercise, direction: -1 | 1) => {
    const ordered = routineExercises.filter((item) => item.routineId === entry.routineId).sort((a, b) => a.order - b.order)
    const index = ordered.findIndex((item) => item.id === entry.id)
    const swap = ordered[index + direction]
    if (!swap) {
      return
    }

    await Promise.all([
      saveRoutineExercise({ ...entry, order: swap.order }),
      saveRoutineExercise({ ...swap, order: entry.order }),
    ])
    await refresh()
  }

  const handleCompleteWorkout = async () => {
    if (!selectedRoutine && logMode !== 'free') {
      return
    }

    await createWorkoutLog(logMode === 'free' ? { name: 'Free workout' } : selectedRoutine!, visibleDraftEntries, {
      totalMinutes: durationMinutes,
      notes: logNotes,
      travelMode: data?.schedule.travelMode,
      deloadApplied,
    })
    setLogNotes('')
    setActiveWorkout(null)
    await refresh()
    showFlash('Workout logged.', true)
    setPage('dashboard')
  }

  const addDraftExercise = (exercise: Exercise, options: { startFreeLog?: boolean } = {}) => {
    const equipmentKey = exerciseEquipmentKey(exercise)
    const recentEntry = data ? mostRecentCompletedEntry(exercise.id, data.exerciseLogEntries, data.workoutLogs, equipmentKey) : undefined
    const personalDefault = data
      ? personalDefaultForExercise(data.personalExerciseDefaults, exercise.id, equipmentKey)
      : undefined
    const remembered = resolveExerciseLogDefaults({ exercise, personalDefault, recentEntry, units: data?.settings.units })
    const draftEntry: WorkoutDraftEntry = {
        exerciseId: exercise.id,
        equipmentKey,
        exerciseName: exercise.name,
        sets: remembered.sets ?? 1,
        reps: remembered.reps ?? '8',
        weight: remembered.weight,
        durationSeconds: remembered.durationSeconds,
        distance: remembered.distance,
        effort: remembered.effort ?? 6,
        lastSummary: remembered.lastSummary,
        customFields:
          exercise.id === 'burley-loaded-trailer-ride'
            ? {
                dogWeight: 45,
                trailerLoadWeight: 0,
                totalTowedLoad: 45,
                surface: 'mixed',
                dogComfortCheck: true,
                emptyTrailerPractice: false,
              }
            : undefined,
      }

    if (options.startFreeLog) {
      setLogMode('free')
      setSelectedRoutineId('')
      setDurationMinutes(settingsDraft?.durationPreference ?? 30)
      setDraftEntries([draftEntry])
      setActiveWorkout({
        stage: 'workout',
        currentIndex: 0,
        startedAt: new Date().getTime(),
        routineName: 'Free workout',
      })
      setPage('train')
      return
    }

    setDraftEntries((current) => [...current, draftEntry])
  }

  const applyExerciseToDraftEntry = (index: number, exercise: Exercise) => {
    const equipmentKey = exerciseEquipmentKey(exercise)
    const recentEntry = data ? mostRecentCompletedEntry(exercise.id, data.exerciseLogEntries, data.workoutLogs, equipmentKey) : undefined
    const personalDefault = data
      ? personalDefaultForExercise(data.personalExerciseDefaults, exercise.id, equipmentKey)
      : undefined
    const remembered = resolveExerciseLogDefaults({ exercise, personalDefault, recentEntry, units: data?.settings.units })

    setDraftEntries((current) =>
      (current.length ? current : visibleDraftEntries).map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              exerciseId: exercise.id,
              equipmentKey,
              exerciseName: exercise.name,
              sets: remembered.sets ?? exercise.defaults.sets,
              reps: remembered.reps ?? exercise.defaults.reps,
              weight: remembered.weight ?? exercise.defaults.weight,
              durationSeconds: remembered.durationSeconds ?? exercise.defaults.durationSeconds,
              distance: remembered.distance ?? exercise.defaults.distance,
              effort: remembered.effort ?? exercise.defaults.effort ?? 6,
              lastSummary: remembered.lastSummary,
            }
          : item,
      ),
    )
  }

  const resetDraftEntryToSeedDefaults = (index: number) => {
    const exercise = exerciseById.get(visibleDraftEntries[index]?.exerciseId)
    if (!exercise) {
      return
    }

    setDraftEntries((current) =>
      (current.length ? current : visibleDraftEntries).map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              sets: exercise.defaults.sets,
              reps: exercise.defaults.reps,
              weight: exercise.defaults.weight,
              durationSeconds: exercise.defaults.durationSeconds,
              distance: exercise.defaults.distance,
              effort: exercise.defaults.effort ?? 6,
              lastSummary: undefined,
            }
          : item,
      ),
    )
  }

  const saveQuickExercise = async () => {
    const name = quickExerciseName.trim()
    if (!name) {
      showFlash('Add an exercise name first.')
      return
    }

    const timestamp = new Date().toISOString()
    const exercise: Exercise = {
      id: createId('custom-exercise'),
      name,
      description: 'Quick custom exercise added during a free workout.',
      instructions: ['Move with control and record what matters.'],
      formCues: ['Comfortable range', 'Controlled tempo'],
      commonMistakes: ['Rushing', 'Ignoring discomfort'],
      targetAreas: ['custom'],
      equipment: ['bodyweight'],
      difficulty: 'beginner',
      group: 'Recovery',
      bikeTourPurpose: ['recovery'],
      defaults: { sets: 1, reps: '8', effort: 5 },
      attribution: 'User-created exercise.',
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await saveExercise(exercise)
    addDraftExercise(exercise)
    setQuickExerciseName('')
    await refresh()
    showFlash('Custom exercise added.')
  }

  const handleUpdatePastLog = async () => {
    if (!editLog) {
      return
    }

    await updateWorkoutLog(editLog.log, editLog.entries)
    setEditLog(null)
    await refresh()
    showFlash('Past log updated.')
  }

  const handleSaveSettings = async () => {
    if (!settingsDraft) {
      return
    }

    await saveSettings(settingsDraft)
    await refresh()
    showFlash('Settings saved.')
  }

  const handleSaveSchedule = async () => {
    if (!scheduleDraft) {
      return
    }

    await saveSchedule(scheduleDraft)
    await refresh()
    showFlash('Plan saved.')
  }

  const updateRoadmap = async (updater: (roadmap: AppData['roadmap']) => AppData['roadmap'], message: string) => {
    if (!data) {
      return
    }

    const next = updater(data.roadmap)
    await saveRoadmap(next)
    await refresh()
    showFlash(message)
  }

  const roadmapCompletion = data
    ? Math.round(
        (data.roadmap.milestones.filter((milestone) => milestone.completed).length / Math.max(1, data.roadmap.milestones.length)) *
          100,
      )
    : 0

  const handleExportJson = async (includePrivateSettings = false) => {
    downloadText(
      `ramprep-backup-${new Date().toISOString().slice(0, 10)}.json`,
      await exportAllData({ includePrivateSettings }),
      'application/json',
    )
  }

  const handleExportCsv = async () => {
    downloadText(`ramprep-workout-logs-${new Date().toISOString().slice(0, 10)}.csv`, await exportWorkoutLogsCsv(), 'text/csv')
  }

  const handleExportCarbCsv = async () => {
    downloadText(`ramprep-net-carb-entries-${new Date().toISOString().slice(0, 10)}.csv`, await exportCarbEntriesCsv(), 'text/csv')
  }

  const goalForSelectedCarbDate = () =>
    data && carbSettingsDraft ? goalForDate(carbSelectedDate, data.carbGoalHistory, carbSettingsDraft) : 50

  const addCarbEntry = async ({
    netCarbs,
    mealSlot = carbMealSlot,
    sourceType,
    sourceLabel,
    savedFoodName,
  }: {
    netCarbs: number
    mealSlot?: CarbMealSlot
    sourceType: CarbEntry['sourceType']
    sourceLabel?: string
    savedFoodName?: string
  }) => {
    if (!data || !carbSettingsDraft) {
      return
    }

    await createCarbEntry({
      dateISO: carbSelectedDate,
      mealSlot,
      netCarbs,
      sourceType,
      sourceLabel: sourceLabel ?? sourceLabels[sourceType],
      savedFoodName: carbSettingsDraft.saveFoodNamesInLog ? savedFoodName : undefined,
      goalGramsAtEntry: goalForSelectedCarbDate(),
    })
    await refresh()
  }

  const handleAddManualCarbs = async () => {
    await addCarbEntry({ netCarbs: carbAmount, sourceType: 'manual', sourceLabel: 'manual' })
    setCarbAmount(0)
    showFlash('Net carbs added.', true)
  }

  const handleSaveCarbEdit = async () => {
    if (!carbEditEntry) {
      return
    }

    await updateCarbEntry({ ...carbEditEntry, netCarbs: normalizeCarbGrams(carbEditEntry.netCarbs) })
    setCarbEditEntry(null)
    await refresh()
    showFlash('Net carb entry updated.')
  }

  const handleSaveCarbSettings = async () => {
    if (!carbSettingsDraft) {
      return
    }

    await saveCarbSettings(carbSettingsDraft)
    await refresh()
    showFlash('Net carb settings saved.')
  }

  const loadUsdaApiKey = async () =>
    (await getPrivateSetting(USDA_API_KEY_PRIVATE_SETTING_KEY))?.encryptedOrPlainValue.trim() ?? ''

  const handleSaveUsdaApiKey = async () => {
    const key = usdaKeyDraft.trim()
    if (!key) {
      setUsdaKeyStatus('Paste a USDA FoodData Central key first.')
      return
    }

    await savePrivateSetting(USDA_API_KEY_PRIVATE_SETTING_KEY, key)
    await clearFoodLookupCache()
    setUsdaKeyDraft('')
    setUsdaKeySaved(true)
    setUsdaKeyStatus('USDA key saved locally. Cache cleared.')
    showFlash('USDA key saved locally.')
  }

  const handleClearUsdaApiKey = async () => {
    await deletePrivateSetting(USDA_API_KEY_PRIVATE_SETTING_KEY)
    await clearFoodLookupCache()
    setUsdaKeyDraft('')
    setUsdaKeySaved(false)
    setUsdaKeyStatus('USDA key cleared from this browser.')
    showFlash('USDA key cleared.')
  }

  const handleTestUsdaLookup = async () => {
    if (!carbSettingsDraft) {
      return
    }

    setUsdaKeyBusy(true)
    setUsdaKeyStatus('')
    try {
      const results = await searchUsdaFoods(usdaTestQuery || 'plain greek yogurt', {
        apiKey: await loadUsdaApiKey(),
        subtractSugarAlcoholsWhenAvailable: carbSettingsDraft.subtractSugarAlcoholsWhenAvailable,
      })
      setUsdaKeySaved(true)
      setUsdaKeyStatus(results[0] ? `USDA test found ${results[0].name}: ${results[0].formula}` : 'USDA responded, but no matching foods were found.')
    } catch (error) {
      setUsdaKeyStatus(error instanceof Error ? error.message : 'USDA test failed.')
    } finally {
      setUsdaKeyBusy(false)
    }
  }

  const handlePresetSave = async () => {
    const name = presetDraft.name.trim()
    if (!name) {
      showFlash('Name the preset first.')
      return
    }

    await saveCarbPreset({
      id: presetDraft.id || undefined,
      name,
      netCarbs: presetDraft.netCarbs,
      servingDescription: presetDraft.servingDescription.trim() || undefined,
      sourceType: 'preset',
    })
    setPresetDraft({ id: '', name: '', netCarbs: 0, servingDescription: '' })
    await refresh()
    showFlash('Net carb preset saved.')
  }

  const handleUsePreset = async (preset: AppData['carbPresets'][number]) => {
    await addCarbEntry({
      netCarbs: preset.netCarbs,
      sourceType: 'preset',
      sourceLabel: 'preset',
      savedFoodName: preset.name,
    })
    await markCarbPresetUsed(preset)
    await refresh()
    showFlash('Preset added. Delete the entry if that was a mis-tap.')
  }

  const handleLookupSearch = async () => {
    if (!lookupQuery.trim() || !carbSettingsDraft) {
      return
    }

    setLookupLoading(true)
    setLookupError('')
    setLookupSelected(null)
    try {
      const cached = await getFoodLookupCache('usda', lookupQuery)
      if (cached) {
        setLookupResults(JSON.parse(cached.resultJson) as FoodLookupResult[])
        return
      }

      const options = {
        apiKey: await loadUsdaApiKey(),
        subtractSugarAlcoholsWhenAvailable: carbSettingsDraft.subtractSugarAlcoholsWhenAvailable,
      }
      const results = await searchUsdaFoods(lookupQuery, options)
      setLookupResults(results)
      await saveFoodLookupCache('usda', lookupQuery, JSON.stringify(results))
      if (!results.length) {
        setLookupError('No lookup results found. Manual entry still works.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lookup failed.'
      setLookupError(message)
      setLookupResults([])
    } finally {
      setLookupLoading(false)
    }
  }

  const handleSelectLookupResult = async (result: FoodLookupResult) => {
    setLookupError('')
    setLookupLoading(true)
    try {
      const detailed =
        result.source === 'usda' && carbSettingsDraft
          ? (await getUsdaFoodDetails(result.sourceId, {
              apiKey: await loadUsdaApiKey(),
              subtractSugarAlcoholsWhenAvailable: carbSettingsDraft.subtractSugarAlcoholsWhenAvailable,
            })) ?? result
          : result
      setLookupSelected(detailed)
      setLookupOverride(detailed.netCarbs)
    } catch {
      setLookupSelected(result)
      setLookupOverride(result.netCarbs)
    } finally {
      setLookupLoading(false)
    }
  }

  const handleAddLookupCarbs = async () => {
    if (!lookupSelected) {
      return
    }

    await addCarbEntry({
      netCarbs: lookupOverride ?? lookupSelected.netCarbs,
      sourceType: lookupSelected.sourceType,
      sourceLabel: lookupSelected.attribution,
      savedFoodName: lookupSelected.name,
    })
    showFlash('Lookup net carbs added.', true)
  }

  const handleSaveLookupPreset = async () => {
    if (!lookupSelected) {
      return
    }

    await saveCarbPreset({
      name: lookupSelected.name,
      netCarbs: lookupOverride ?? lookupSelected.netCarbs,
      servingDescription: lookupSelected.servingSize,
      sourceType: lookupSelected.sourceType,
      sourceId: lookupSelected.sourceId,
    })
    await refresh()
    showFlash('Lookup saved as preset.')
  }

  const handleImport = async (file?: File) => {
    if (!file) {
      return
    }

    await importAllData(await file.text())
    await refresh()
    showFlash('Backup imported.')
  }

  if (loading || !data || !settingsDraft || !carbSettingsDraft || !scheduleDraft) {
    return (
      <main className="loading-screen">
        <Dumbbell aria-hidden="true" />
        <p>Loading RampRep...</p>
      </main>
    )
  }

  const carbReports = buildCarbReports(carbEntries, data.carbGoalHistory, data.carbSettings, today)
  const todayCarbStatus = carbStatusText(carbReports.today.total, carbReports.today.goal)
  const selectedDayEntries = carbEntries
    .filter((entry) => entry.dateISO === carbSelectedDate)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const selectedDayMealTotals = totalCarbsByMeal(carbEntries, carbSelectedDate)
  const selectedDayTotal = selectedDayMealTotals.reduce((sum, item) => sum + item.value, 0)
  const selectedDayGoal = goalForDate(carbSelectedDate, data.carbGoalHistory, data.carbSettings)
  const selectedDayStatus = carbStatusText(selectedDayTotal, selectedDayGoal)
  const recentPresets = sortedCarbPresets(data.carbPresets)
  const lookupSourceLabel = 'USDA FoodData Central'
  const routineById = new Map(routines.map((routine) => [routine.id, routine]))
  const completedLogs = logs.filter((log) => log.status === 'completed')
  const strengthSessions = completedLogs.filter((log) => routineById.get(log.routineId ?? '')?.type === 'strength').length
  const mobilitySessions = completedLogs.filter((log) => {
    const type = routineById.get(log.routineId ?? '')?.type
    return type === 'mobility' || type === 'recovery'
  }).length
  const rideSessions = completedLogs.filter((log) => routineById.get(log.routineId ?? '')?.type === 'bike' || /ride|bike|trailer/i.test(log.routineName)).length
  const walkSessions = completedLogs.filter((log) => /walk|ruck/i.test(log.routineName)).length
  const todayWalkBaseLogged = completedLogs.some((log) => /walk|ruck/i.test(log.routineName) && log.completedAt.slice(0, 10) === toDateKey(today))
  const hillTrailerMinutes = entries
    .filter((entry) => /hill|ride|trailer|burley|climb/i.test(entry.exerciseName))
    .reduce((total, entry) => total + Math.round((entry.durationSeconds ?? 0) / 60), 0)
  const ruckMinutes = entries
    .filter((entry) => /ruck/i.test(entry.exerciseName))
    .reduce((total, entry) => total + Math.round((entry.durationSeconds ?? 0) / 60), 0)
  const dogWalkMiles = entries
    .filter((entry) => /dog walk/i.test(entry.exerciseName))
    .reduce((total, entry) => total + Number.parseFloat(entry.distance?.match(/[\d.]+/)?.[0] ?? '0'), 0)
  const currentRideIsRuck = ruckTemplates.has(rideDraft.template) || rideDraft.load === 'ruck'
  const currentRideIsWalk = walkTemplates.has(rideDraft.template) || currentRideIsRuck
  const currentRuckLoad = calculateRuckLoadPounds({
    waterLiters: rideDraft.waterLiters,
    emptyPackWeight: rideDraft.ruckEmptyPackWeight,
    extraWeight: rideDraft.ruckExtraWeight,
  })
  const librarySearchText = libraryQuery.trim().toLowerCase()
  const libraryFiltersActive = Boolean(categoryFilter || groupFilter || equipmentFilter || purposeFilter || difficultyFilter)
  const filteredExercises = exercises.filter((exercise) => {
    const rampRepGroup = rampRepGroupForExercise(exercise)
    const searchable = [
      exercise.name,
      exercise.description,
      exercise.targetAreas.join(' '),
      exercise.equipment.join(' '),
      exercise.group ?? '',
      rampRepGroup,
      exercise.bikeTourPurpose?.join(' ') ?? '',
    ]
      .join(' ')
      .toLowerCase()
    const searchableMatch = !librarySearchText || searchable.includes(librarySearchText)
    const defaultVisible =
      editMode ||
      libraryFiltersActive ||
      isDefaultLibraryExercise(exercise) ||
      (isSearchOnlyExercise(exercise) && Boolean(librarySearchText) && searchableMatch)
    const passesSafetyGate = exercise.id !== 'step-up-to-bench' || Boolean(settingsDraft.benchStepUpsSafe) || editMode

    return (
      passesSafetyGate &&
      defaultVisible &&
      searchableMatch &&
      (!categoryFilter || getExerciseCategory(exercise) === categoryFilter) &&
      (!groupFilter || rampRepGroup === groupFilter) &&
      (!equipmentFilter || exercise.equipment.includes(equipmentFilter as EquipmentKind)) &&
      (!purposeFilter || exercise.bikeTourPurpose?.includes(purposeFilter as BikeTourPurpose)) &&
      (!difficultyFilter || exercise.difficulty === difficultyFilter)
    )
  })
  const syncValidation = validateGoogleAppsScriptUrl(settingsDraft.googleAppsScriptUrl)
  const demoExercise = demoExerciseId ? exerciseById.get(demoExerciseId) : undefined
  const demoMedia = demoExercise ? getExerciseDemoMedia(demoExercise.id) : undefined
  const ownedEquipmentKinds = new Set(data.equipment.filter((item) => item.owned).map((item) => item.kind))
  const roadmapGuidance = [
    `${data.schedule.weeklyFrequency} planned sessions/week across ${data.schedule.preferredDays.map(dayName).join(', ') || 'flex days'}.`,
    data.schedule.travelMode
      ? 'Travel mode: choose bodyweight core stability, mobility, walks, and short recovery sessions.'
      : ownedEquipmentKinds.has('bike')
      ? 'Bike available: keep one easy endurance or hill-support ride in the week.'
      : 'No bike marked owned yet: use walks, carries, hips, and core until rides are available.',
    data.schedule.busyWorkWeek
      ? 'Busy week: use the shortest useful session and keep the consistency streak alive.'
      : 'Normal week: pair two strength/mobility sessions with one longer aerobic outing.',
    data.schedule.hillFocusWeek
      ? 'Hill focus: prioritize step-ups, split squats, low-cadence climbs, calves, and posterior chain.'
      : 'Long-ride progression: add time gradually, then practice back-to-back days in later phases.',
    data.schedule.recoveryWeek
      ? 'Recovery week: reduce intensity, use mobility, and watch soreness before adding volume.'
      : 'Recovery rhythm: keep every fourth week lighter or switch to recovery mode when soreness rises.',
  ]
  const trainRoutine = scheduledToday ?? nextRecommendation?.routine ?? selectedRoutine
  const trainRoutineExercises = trainRoutine
    ? routineExercises
        .filter((entry) => entry.routineId === trainRoutine.id)
        .sort((a, b) => a.order - b.order)
        .slice(0, 5)
        .map((entry) => exerciseById.get(entry.exerciseId)?.name ?? entry.exerciseId)
    : []
  const activeWorkoutEntry = activeWorkout ? visibleDraftEntries[clamp(activeWorkout.currentIndex, 0, Math.max(0, visibleDraftEntries.length - 1))] : undefined
  const activeWorkoutExercise = activeWorkoutEntry ? exerciseById.get(activeWorkoutEntry.exerciseId) : undefined
  const activeWorkoutProgress = activeWorkout ? `${Math.min(activeWorkout.currentIndex + 1, visibleDraftEntries.length)} of ${visibleDraftEntries.length}` : ''
  const activeWorkoutTarget = activeWorkoutEntry
    ? [
        activeWorkoutEntry.sets && activeWorkoutEntry.reps ? `${activeWorkoutEntry.sets} x ${activeWorkoutEntry.reps}` : activeWorkoutEntry.reps,
        activeWorkoutEntry.weight ? `@ ${activeWorkoutEntry.weight} ${data.settings.units}` : '',
        activeWorkoutEntry.durationSeconds ? formatDuration(activeWorkoutEntry.durationSeconds) : '',
        activeWorkoutEntry.distance ?? '',
      ]
        .filter(Boolean)
        .join(' ')
    : ''
  const activeWorkoutElapsedMinutes = activeWorkout ? durationMinutes : 0

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <LogoMark />
          <div>
            <p className="eyebrow">RampRep · Ride Across America Preparation</p>
              <h1>
                {page === 'dashboard' && 'Today'}
                {page === 'train' && 'Train'}
                {page === 'ride' && 'Ride'}
                {page === 'workouts' && 'Workouts'}
                {page === 'log' && 'Workout Log'}
              {page === 'carbs' && 'Net Carbs'}
              {page === 'progress' && 'Progress'}
              {page === 'more' && 'More'}
              {page === 'settings' && 'Settings'}
              {page === 'roadmap' && 'Tour Roadmap'}
            </h1>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="status-pill">
            <Flame aria-hidden="true" size={18} />
            {streak} day streak
          </div>
        </div>
      </header>

      {demoExercise && (
        <ExerciseDemoView
          key={demoExercise.id}
          exercise={demoExercise}
          media={demoMedia}
          onClose={closeExerciseDemo}
          onLog={() => {
            addDraftExercise(demoExercise, { startFreeLog: true })
            closeExerciseDemo()
          }}
        />
      )}

      {flash && (
        <div className="toast" role="status">
          {flash}
        </div>
      )}

      {updateReady && (
        <button className="update-banner" type="button" onClick={() => window.location.reload()}>
          Update available - refresh
        </button>
      )}

      {page === 'dashboard' && (
        <main className="page-grid today-cockpit">
          <Card className="hero-card cockpit-primary train-today-tile">
            <div>
              <p className="eyebrow">Train today</p>
              <h2>{(scheduledToday ?? nextRecommendation?.routine)?.name ?? 'Choose a routine'}</h2>
              <p className="cockpit-subline">
                {(scheduledToday ?? nextRecommendation?.routine)?.estimatedMinutes ?? settingsDraft.durationPreference} min
                {deloadApplied ? ' · deload volume' : ' · core, back, hips'}
              </p>
            </div>
            {(scheduledToday ?? nextRecommendation?.routine) && (
              <button className="primary-button" type="button" onClick={() => startRoutine((scheduledToday ?? nextRecommendation!.routine).id)}>
                <CheckCircle2 aria-hidden="true" size={18} />
                Start
              </button>
            )}
          </Card>

          <Card className="cockpit-tile ride-tile">
            <div>
              <p className="eyebrow">Ride</p>
              <h2>{rideSessions} logged</h2>
              <p>Ride, walk, ruck, or Burley. Walk base: {todayWalkBaseLogged ? 'logged' : 'not logged'}.</p>
            </div>
            <button className="ghost-button" type="button" onClick={() => setPage('ride')}>
              Start
            </button>
          </Card>

          <Card className="cockpit-tile carb-summary-card">
            <div>
              <p className="eyebrow">Net Carbs</p>
              <h2>
                {carbReports.today.total} / {carbReports.today.goal}g
              </h2>
              <p>{todayCarbStatus}</p>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setCarbSelectedDate(toDateKey(new Date()))
                setPage('carbs')
              }}
            >
              Add net carbs
            </button>
          </Card>

          <Card className="cockpit-tile roadmap-card">
            {nextRoadmapMilestone ? (
              <div>
                <p className="eyebrow">Next milestone</p>
                <h2>{nextRoadmapMilestone.title}</h2>
                <p>{nextRoadmapMilestone.description}</p>
              </div>
            ) : (
              <EmptyState title="Roadmap complete" body="All seeded milestones are checked off." />
            )}
            <button className="ghost-button" type="button" onClick={() => setPage('roadmap')}>
              Open roadmap
            </button>
          </Card>
        </main>
      )}

      {skipPromptRoutine && (
        <section className="skip-prompt-mode" role="dialog" aria-modal="true" aria-labelledby="skip-prompt-title">
          <div>
            <p className="eyebrow">Skip workout</p>
            <h2 id="skip-prompt-title">{skipPromptRoutine.name}</h2>
          </div>
          <div className="skip-reason-grid">
            <button type="button" onClick={() => void handleSkipRoutine('work')}>Work</button>
            <button type="button" onClick={() => void handleSkipRoutine('fatigue')}>Tired</button>
            <button type="button" onClick={() => void handleSkipRoutine('soreness')}>Sore</button>
            <button type="button" onClick={() => void handleSkipRoutine('other')}>Other</button>
          </div>
          <button className="ghost-button" type="button" onClick={() => setSkipPromptRoutine(null)}>
            Back
          </button>
        </section>
      )}

      {page === 'train' && activeWorkout?.stage === 'workout' && activeWorkoutEntry && (
        <main className="active-workout-mode" aria-label="Active workout shows one exercise at a time">
          <header className="active-workout-top">
            <button className="demo-back-button" type="button" onClick={() => setActiveWorkout(null)}>
              <ArrowLeft aria-hidden="true" size={19} />
              Back
            </button>
            <div>
              <p className="eyebrow">{activeWorkout.routineName}</p>
              <h2>{activeWorkoutProgress}</h2>
            </div>
          </header>

          <section className="active-exercise-card">
            <p className="eyebrow">Current exercise only</p>
            <h2>{activeWorkoutEntry.exerciseName}</h2>
            <strong className="active-target">{activeWorkoutTarget || 'Open set'}</strong>
            {activeWorkoutEntry.lastSummary && <p className="last-summary">{activeWorkoutEntry.lastSummary}</p>}
            <div className="active-demo-row">
              {activeWorkoutExercise && <ExerciseDemoButton exercise={activeWorkoutExercise} onOpen={openExerciseDemo} allowLocalFallback />}
            </div>
          </section>

          <section className="active-stepper-grid">
            <NumberStepper
              label="Sets"
              value={activeWorkoutEntry.sets}
              min={0}
              max={20}
              step={1}
              quickOptions={[1, 2, 3, 4, 5]}
              onChange={(value) => updateDraftEntryAt(activeWorkout.currentIndex, (entry) => ({ ...entry, sets: value }))}
            />
            <NumberStepper
              label="Reps"
              value={firstNumber(activeWorkoutEntry.reps)}
              min={0}
              max={100}
              step={1}
              quickOptions={[5, 8, 10, 12, 15, 20]}
              onChange={(value) => updateDraftEntryAt(activeWorkout.currentIndex, (entry) => ({ ...entry, reps: value == null ? undefined : String(value) }))}
            />
            <WeightPicker
              units={data.settings.units}
              value={activeWorkoutEntry.weight}
              onChange={(value) => updateDraftEntryAt(activeWorkout.currentIndex, (entry) => ({ ...entry, weight: value }))}
            />
          </section>

          <details className="active-collapsible">
            <summary>Notes</summary>
            <textarea value={activeWorkoutEntry.notes ?? ''} onChange={(event) => updateDraftEntryAt(activeWorkout.currentIndex, (entry) => ({ ...entry, notes: event.target.value }))} />
          </details>

          <details className="active-collapsible">
            <summary>Swap</summary>
            <select
              value={activeWorkoutEntry.exerciseId}
              onChange={(event) => {
                const nextExercise = exerciseById.get(event.target.value)
                if (nextExercise) {
                  applyExerciseToDraftEntry(activeWorkout.currentIndex, nextExercise)
                }
              }}
            >
              {filteredExercises.map((exerciseOption) => (
                <option key={exerciseOption.id} value={exerciseOption.id}>
                  {exerciseOption.name}
                </option>
              ))}
            </select>
          </details>

          <footer className="active-workout-actions">
            <button className="primary-button active-primary" type="button" onClick={advanceActiveWorkout}>
              {activeWorkoutPrimaryActions[0]}
            </button>
            <button className="ghost-button active-secondary" type="button" onClick={() => repeatActiveSet(activeWorkout.currentIndex)}>
              {activeWorkoutPrimaryActions[1]}
            </button>
            <button className="ghost-button active-secondary" type="button" onClick={advanceActiveWorkout}>
              {activeWorkoutPrimaryActions[2]}
            </button>
          </footer>
        </main>
      )}

      {page === 'train' && activeWorkout?.stage === 'review' && (
        <main className="active-workout-mode review-workout-mode">
          <header className="active-workout-top">
            <div>
              <p className="eyebrow">Review workout</p>
              <h2>{activeWorkout.routineName}</h2>
            </div>
            <span className="tag">{activeWorkoutElapsedMinutes} min</span>
          </header>
          <section className="review-exercise-list">
            {visibleDraftEntries.map((entry, index) => (
              <div className="review-row" key={`${entry.exerciseId}-${index}`}>
                <strong>{entry.exerciseName}</strong>
                <span>{[entry.sets && entry.reps ? `${entry.sets} x ${entry.reps}` : entry.reps, entry.weight ? `${entry.weight} ${data.settings.units}` : '', entry.distance ?? ''].filter(Boolean).join(' · ') || 'done'}</span>
              </div>
            ))}
          </section>
          <EffortPicker
            value={visibleDraftEntries[0]?.effort}
            onChange={(value) => {
              setDraftEntries((current) => (current.length ? current : visibleDraftEntries).map((entry) => ({ ...entry, effort: value })))
            }}
          />
          <footer className="active-workout-actions">
            <button className="primary-button active-primary" type="button" onClick={() => void handleCompleteWorkout()}>
              Save
            </button>
            <button
              className="danger-button active-secondary"
              type="button"
              onClick={() => {
                setActiveWorkout(null)
                setDraftEntries([])
                setPage('train')
              }}
            >
              Discard
            </button>
          </footer>
        </main>
      )}

      {page === 'train' && !activeWorkout && (
        <main className="page-grid train-page">
          <Card className="hero-card train-hero-card">
            <div>
              <p className="eyebrow">Today recommended</p>
              <h2>{trainRoutine?.name ?? 'Choose workout'}</h2>
              <p>{trainRoutine?.estimatedMinutes ?? settingsDraft.durationPreference} min</p>
              <div className="train-preview-list">
                {trainRoutineExercises.map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
            </div>
            {trainRoutine && (
              <button className="primary-button" type="button" onClick={() => startActiveRoutine(trainRoutine.id)}>
                Start
              </button>
            )}
          </Card>
          <div className="train-secondary-actions">
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setWorkoutsTab('routines')
                setPage('workouts')
              }}
            >
              Choose workout
            </button>
            <button className="ghost-button" type="button" onClick={startFreeWorkout}>
              Free log
            </button>
            {trainRoutine && (
              <button className="ghost-button" type="button" onClick={() => setSkipPromptRoutine(trainRoutine)}>
                Skip
              </button>
            )}
          </div>
        </main>
      )}

      {page === 'ride' && (
        <main className="page-grid ride-page">
          <Card className="hero-card ride-hero-card">
            <div>
              <p className="eyebrow">Ride / Walk / Ruck</p>
              <h2>{rideDraft.template}</h2>
              <p>
                {rideDraft.template === 'Burley trailer'
                  ? 'Conditioning, not punishment. Dog comfort comes first.'
                  : currentRideIsRuck
                  ? 'Light pack work. Capacity is not the target.'
                  : currentRideIsWalk
                  ? 'Easy base minutes without making it a hard training day.'
                  : 'Log the ride without opening a training console.'}
              </p>
            </div>
            <button className="primary-button" type="button" onClick={() => void handleSaveRideLog()}>
              Save
            </button>
          </Card>

          <section className="ride-template-grid">
            {rideTemplateOptions.map((template) => (
              <button className={rideDraft.template === template ? 'active' : ''} key={template} type="button" onClick={() => applyRideTemplate(template)}>
                {template}
              </button>
            ))}
          </section>

          <Card className="walk-quick-card">
            <div className="section-title">
              <div>
                <p className="eyebrow">One-tap done</p>
                <h2>Walk base</h2>
              </div>
              <span className="tag">{todayWalkBaseLogged ? 'logged' : 'open'}</span>
            </div>
            <div className="button-grid">
              {(['Commute walk', 'Dog walk', 'Ruck walk'] as RideTemplate[]).map((template) => (
                <button className="ghost-button" key={template} type="button" onClick={() => void handleQuickSaveRideTemplate(template)}>
                  <CheckCircle2 aria-hidden="true" size={18} />
                  {template}
                </button>
              ))}
            </div>
          </Card>

          <Card className="ride-log-card">
            {rideDraft.template === 'Burley trailer' && (
              <label className="dog-check-card">
                <input
                  checked={rideDraft.dogComfortCheck}
                  type="checkbox"
                  onChange={(event) => setRideDraft({ ...rideDraft, dogComfortCheck: event.target.checked })}
                />
                <span>
                  <strong>Dog comfort check first</strong>
                  <small>Water, shade, harness, surface, heat, and calm behavior.</small>
                </span>
              </label>
            )}
            <div className="ride-field-grid">
              <NumberStepper label="Minutes" value={rideDraft.minutes} min={0} max={600} step={5} quickOptions={currentRideIsWalk ? [15, 25, 35, 45, 50, 60] : [15, 25, 35, 45, 60, 90]} onChange={(value) => setRideDraft({ ...rideDraft, minutes: value ?? 0 })} />
              <NumberStepper label="Miles" value={rideDraft.miles} min={0} max={200} step={0.5} suffix=" mi" quickOptions={currentRideIsWalk ? [1.2, 2, 2.5, 3, 4, 5] : [3, 5, 8, 10, 20, 40]} onChange={(value) => setRideDraft({ ...rideDraft, miles: value ?? 0 })} />
              <NumberStepper label="Elevation" value={rideDraft.elevationGain} min={0} max={20000} step={50} suffix=" ft" quickOptions={[0, 250, 500, 1000, 2000]} onChange={(value) => setRideDraft({ ...rideDraft, elevationGain: value ?? 0 })} />
              <EffortPicker value={rideDraft.effort} onChange={(value) => setRideDraft({ ...rideDraft, effort: value ?? 1 })} />
              <label>
                Surface
                <select value={rideDraft.surface} onChange={(event) => setRideDraft({ ...rideDraft, surface: event.target.value as RideSurface })}>
                  <option value="pavement">pavement</option>
                  <option value="gravel">gravel</option>
                  <option value="mixed">mixed</option>
                </select>
              </label>
              <label>
                Load
                <select value={rideDraft.load} onChange={(event) => setRideDraft({ ...rideDraft, load: event.target.value as RideLoad })}>
                  <option value="none">none</option>
                  <option value="bags">bags</option>
                  <option value="trailer">trailer</option>
                  <option value="dog">dog</option>
                  <option value="ruck">ruck</option>
                </select>
              </label>
            </div>

            {currentRideIsRuck && (
              <div className="burley-ride-panel">
                <p className="notice">{ruckLoadNotice(rideDraft.discomfort)}</p>
                <div className="ride-field-grid">
                  <NumberStepper label="Water liters" value={rideDraft.waterLiters} min={0} max={12} step={0.5} suffix=" L" quickOptions={[0.5, 1, 1.5, 2, 3]} onChange={(value) => setRideDraft({ ...rideDraft, waterLiters: value ?? 0 })} />
                  <WeightPicker units={data.settings.units} label="Empty pack" value={rideDraft.ruckEmptyPackWeight} onChange={(value) => setRideDraft({ ...rideDraft, ruckEmptyPackWeight: value ?? 0 })} />
                  <WeightPicker units={data.settings.units} label="Extra load" value={rideDraft.ruckExtraWeight} onChange={(value) => setRideDraft({ ...rideDraft, ruckExtraWeight: value ?? 0 })} />
                  <NumberStepper label="Discomfort" value={rideDraft.discomfort} min={0} max={10} step={1} suffix="/10" quickOptions={[0, 1, 2, 3, 4, 5]} onChange={(value) => setRideDraft({ ...rideDraft, discomfort: value ?? 0 })} />
                  <NumberStepper label="Next-day sore" value={rideDraft.nextDaySoreness} min={0} max={10} step={1} suffix="/10" quickOptions={[0, 1, 2, 3, 4, 5]} onChange={(value) => setRideDraft({ ...rideDraft, nextDaySoreness: value })} />
                  <div className="total-load-tile">
                    <p className="eyebrow">Pack load</p>
                    <strong>{currentRuckLoad} lb</strong>
                    <small>Water uses 2.2 lb/L.</small>
                  </div>
                </div>
              </div>
            )}

            {(rideDraft.template === 'Burley trailer' || rideDraft.load === 'dog' || rideDraft.load === 'trailer') && (
              <div className="burley-ride-panel">
                <p className="notice">No hard repeats with dog. Keep it gentle, short, and boringly successful.</p>
                <div className="ride-field-grid">
                  <label>
                    Temperature
                    <input value={rideDraft.temperature} inputMode="numeric" placeholder="optional" onChange={(event) => setRideDraft({ ...rideDraft, temperature: event.target.value })} />
                  </label>
                  <WeightPicker units={data.settings.units} label="Dog weight" value={rideDraft.dogWeight} onChange={(value) => setRideDraft({ ...rideDraft, dogWeight: value ?? 45 })} />
                  <WeightPicker units={data.settings.units} label="Trailer/load" value={rideDraft.trailerLoadWeight} onChange={(value) => setRideDraft({ ...rideDraft, trailerLoadWeight: value ?? 0 })} />
                  <div className="total-load-tile">
                    <p className="eyebrow">Total towed load</p>
                    <strong>{rideDraft.dogWeight + rideDraft.trailerLoadWeight} {data.settings.units}</strong>
                  </div>
                </div>
              </div>
            )}

            <details className="active-collapsible">
              <summary>Notes</summary>
              <textarea value={rideDraft.notes} onChange={(event) => setRideDraft({ ...rideDraft, notes: event.target.value })} />
            </details>
          </Card>
        </main>
      )}

      {page === 'more' && (
        <main className="page-grid">
          <Card className="more-card">
            <div className="section-title">
              <div>
                <p className="eyebrow">More</p>
                <h2>Planning and setup</h2>
              </div>
              <Menu aria-hidden="true" size={21} />
            </div>
            <div className="more-menu-grid">
              <button type="button" onClick={() => setPage('progress')}>
                <BarChart3 aria-hidden="true" size={18} />
                <span>
                  <strong>Reports</strong>
                  <small>Training totals and trends</small>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkoutsTab('routines')
                  setPage('workouts')
                }}
              >
                <Dumbbell aria-hidden="true" size={18} />
                <span>
                  <strong>Workouts manager</strong>
                  <small>Routines and plans</small>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkoutsTab('library')
                  setPage('workouts')
                }}
              >
                <CircleHelp aria-hidden="true" size={18} />
                <span>
                  <strong>Exercise library</strong>
                  <small>How-to and logging</small>
                </span>
              </button>
              <button type="button" onClick={() => setPage('roadmap')}>
                <MapIcon aria-hidden="true" size={18} />
                <span>
                  <strong>Roadmap</strong>
                  <small>Full tour prep plan</small>
                </span>
              </button>
              <button type="button" onClick={() => setPage('settings')}>
                <Settings aria-hidden="true" size={18} />
                <span>
                  <strong>Settings</strong>
                  <small>Equipment and app version</small>
                </span>
              </button>
              <button type="button" onClick={() => setPage('settings')}>
                <Download aria-hidden="true" size={18} />
                <span>
                  <strong>Backup</strong>
                  <small>JSON, CSV, import</small>
                </span>
              </button>
              <button type="button" onClick={() => setEditMode((current) => !current)}>
                <Pencil aria-hidden="true" size={18} />
                <span>
                  <strong>Advanced edit mode</strong>
                  <small>{editMode ? 'On' : 'Off'} by default for daily screens</small>
                </span>
              </button>
            </div>
          </Card>
          <Card>
            <div className="section-title">
              <div>
                <p className="eyebrow">Advanced</p>
                <h2>Edit mode</h2>
              </div>
              <label className="switch">
                <input checked={editMode} type="checkbox" onChange={(event) => setEditMode(event.target.checked)} />
                <span />
              </label>
            </div>
            <p className="notice">Edit, reorder, duplicate, seed, and debug controls stay hidden until edit mode is on.</p>
          </Card>
          {editMode && <MediaCoveragePanel onFlash={showFlash} />}
        </main>
      )}

      {page === 'workouts' && (
        <main className="page-grid">
          <div className="segmented">
            <button className={workoutsTab === 'routines' ? 'active' : ''} type="button" onClick={() => setWorkoutsTab('routines')}>
              Routines
            </button>
            <button className={workoutsTab === 'library' ? 'active' : ''} type="button" onClick={() => setWorkoutsTab('library')}>
              Library
            </button>
          </div>

          {workoutsTab === 'routines' && (
            <>
              <section className="routine-list">
                {routines.map((routine) => (
                  <Card className={selectedRoutine?.id === routine.id ? 'selected-card' : ''} key={routine.id}>
                    <div className="routine-header">
                      <div className="routine-title-block">
                        <span>{routine.name}</span>
                        <small>{routine.type} · {routine.estimatedMinutes} min</small>
                      </div>
                      {editMode && (
                        <label className="switch">
                          <input
                            checked={routine.enabled}
                            type="checkbox"
                            onChange={async (event) => {
                              await saveRoutine({ ...routine, enabled: event.target.checked })
                              await refresh()
                            }}
                          />
                          <span />
                        </label>
                      )}
                    </div>
                    <div className="card-actions compact">
                      <button className="primary-button compact-cta" type="button" onClick={() => startRoutine(routine.id)}>
                        Log
                      </button>
                      {editMode && (
                        <ActionMenu label={`${routine.name} actions`}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRoutineId(routine.id)
                              setRoutineDraft({ ...routine })
                            }}
                          >
                            <Pencil aria-hidden="true" size={16} />
                            Edit routine
                          </button>
                          <button type="button" onClick={() => void moveRoutine(routine, -1)}>
                            <ChevronUp aria-hidden="true" size={16} />
                            Move up
                          </button>
                          <button type="button" onClick={() => void moveRoutine(routine, 1)}>
                            <ChevronDown aria-hidden="true" size={16} />
                            Move down
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await duplicateRoutine(routine.id)
                              await refresh()
                            }}
                          >
                            <Copy aria-hidden="true" size={16} />
                            Duplicate
                          </button>
                        </ActionMenu>
                      )}
                    </div>
                    {editMode && <div className="skip-row">
                      <select
                        aria-label={`Skip reason for ${routine.name}`}
                        defaultValue="work"
                        id={`skip-${routine.id}`}
                      >
                        {skipReasons.map((reason) => (
                          <option key={`skip-${routine.id}-${reason}`} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={async () => {
                          const select = document.getElementById(`skip-${routine.id}`) as HTMLSelectElement | null
                          await createSkippedWorkout(routine, (select?.value as SkipReason) ?? 'other')
                          await refresh()
                          showFlash('Skipped workout logged.')
                        }}
                      >
                        Skip
                      </button>
                    </div>}
                  </Card>
                ))}
              </section>

              {editMode && activeRoutineDraft && selectedRoutine && (
                <Card>
                  <div className="section-title">
                    <h2>Edit Routine</h2>
                    <button className="icon-button" type="button" aria-label="Save routine" onClick={() => void handleSaveRoutine(activeRoutineDraft)}>
                      <Save aria-hidden="true" size={18} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <label>
                      Name
                      <input value={activeRoutineDraft.name} onChange={(event) => setRoutineDraft({ ...activeRoutineDraft, name: event.target.value })} />
                    </label>
                    <DurationPicker label="Minutes" value={activeRoutineDraft.estimatedMinutes} onChange={(value) => setRoutineDraft({ ...activeRoutineDraft, estimatedMinutes: value ?? activeRoutineDraft.estimatedMinutes })} />
                    <label>
                      Type
                      <select value={activeRoutineDraft.type} onChange={(event) => setRoutineDraft({ ...activeRoutineDraft, type: event.target.value as Routine['type'] })}>
                        <option value="strength">strength</option>
                        <option value="conditioning">conditioning</option>
                        <option value="mobility">mobility</option>
                        <option value="recovery">recovery</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Notes
                    <textarea value={activeRoutineDraft.notes ?? ''} onChange={(event) => setRoutineDraft({ ...activeRoutineDraft, notes: event.target.value })} />
                  </label>

                  <div className="exercise-stack">
                    {selectedRoutineExercises.map((entry) => {
                      const exercise = exerciseById.get(entry.exerciseId)
                      return (
                        <div className="exercise-edit-row" key={entry.id}>
                          <div className="exercise-edit-main">
                            <select
                              defaultValue={entry.exerciseId}
                              aria-label="Routine exercise"
                              onChange={async (event) => {
                                await saveRoutineExercise({ ...entry, exerciseId: event.target.value })
                                await refresh()
                              }}
                            >
                              {exercises.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                            <div className="row-meta-actions">
                              <small>{prescription(entry, exercise)}</small>
                              {exercise && <ExerciseDemoButton exercise={exercise} onOpen={openExerciseDemo} compact />}
                            </div>
                          </div>
                          <div className="mini-stepper-grid">
                            <NumberStepper
                              label="Sets"
                              value={entry.sets}
                              min={0}
                              max={12}
                              step={1}
                              quickOptions={[1, 2, 3, 4, 5]}
                              onChange={(value) => void saveRoutineExercise({ ...entry, sets: value }).then(refresh)}
                            />
                            <NumberStepper
                              label="Reps"
                              value={firstNumber(entry.reps)}
                              min={0}
                              max={60}
                              step={1}
                              quickOptions={[5, 8, 10, 12, 15, 20]}
                              onChange={(value) => void saveRoutineExercise({ ...entry, reps: value == null ? undefined : String(value) }).then(refresh)}
                            />
                            <NumberStepper
                              label="Seconds"
                              value={entry.durationSeconds}
                              min={0}
                              max={3600}
                              step={10}
                              quickOptions={[20, 30, 45, 60, 90, 120]}
                              onChange={(value) => void saveRoutineExercise({ ...entry, durationSeconds: value }).then(refresh)}
                            />
                          </div>
                          <div className="row-menu-line">
                            <ActionMenu label={`${exercise?.name ?? 'Exercise'} row actions`}>
                              <button type="button" onClick={() => void moveRoutineExercise(entry, -1)}>
                                <ChevronUp aria-hidden="true" size={16} />
                                Move up
                              </button>
                              <button type="button" onClick={() => void moveRoutineExercise(entry, 1)}>
                                <ChevronDown aria-hidden="true" size={16} />
                                Move down
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await deleteRoutineExercise(entry.id)
                                  await refresh()
                                }}
                              >
                                <Trash2 aria-hidden="true" size={16} />
                                Remove
                              </button>
                            </ActionMenu>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <label>
                    Add Exercise
                    <select
                      defaultValue=""
                      onChange={async (event) => {
                        if (!event.target.value || !selectedRoutine) {
                          return
                        }

                        await addExerciseToRoutine(selectedRoutine.id, event.target.value, selectedRoutineExercises.length + 1)
                        event.currentTarget.value = ''
                        await refresh()
                      }}
                    >
                      <option value="">Select exercise</option>
                      {exercises.map((exercise) => (
                        <option key={exercise.id} value={exercise.id}>
                          {exercise.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </Card>
              )}
            </>
          )}

          {workoutsTab === 'library' && (
            <>
              <Card>
                <div className="library-search-row">
                  <label>
                    <span>
                      <Search aria-hidden="true" size={15} /> Search
                    </span>
                    <input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="core, back, dumbbell..." />
                  </label>
                  <button className="ghost-button filter-button" type="button" onClick={() => setLibraryFiltersOpen(true)}>
                    <Filter aria-hidden="true" size={18} />
                    Filter
                  </button>
                </div>
                {(categoryFilter || groupFilter || equipmentFilter || purposeFilter || difficultyFilter) && (
                  <div className="active-filter-row">
                    <span className="tag">Filters on</span>
                    <button
                      className="text-icon-button"
                      type="button"
                      onClick={() => {
                        setCategoryFilter('')
                        setGroupFilter('')
                        setEquipmentFilter('')
                        setPurposeFilter('')
                        setDifficultyFilter('')
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </Card>
              {libraryFiltersOpen && (
                <div className="sheet-backdrop picker-backdrop" role="presentation" onClick={() => setLibraryFiltersOpen(false)}>
                  <section className="filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title" onClick={(event) => event.stopPropagation()}>
                    <div className="section-title">
                      <div>
                        <p className="eyebrow">Library</p>
                        <h2 id="filter-title">Filters</h2>
                      </div>
                      <button className="icon-button" type="button" aria-label="Close filters" onClick={() => setLibraryFiltersOpen(false)}>
                        <X aria-hidden="true" size={18} />
                      </button>
                    </div>
                    <label>
                      Purpose
                      <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as FunctionalCategory | '')}>
                        <option value="">All purposes</option>
                        {functionalCategories.map((category) => (
                          <option key={`category-${category}`} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Group
                      <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
                        <option value="">All groups</option>
                        {sweatModeLibraryGroups.map((group) => (
                          <option key={`library-group-${group}`} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Equipment
                      <select value={equipmentFilter} onChange={(event) => setEquipmentFilter(event.target.value)}>
                        <option value="">All equipment</option>
                        {equipmentKinds.map((kind) => (
                          <option key={`library-equipment-${kind}`} value={kind}>
                            {kind}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Bike-tour purpose
                      <select value={purposeFilter} onChange={(event) => setPurposeFilter(event.target.value)}>
                        <option value="">All bike-tour purposes</option>
                        {bikePurposes.map((purpose) => (
                          <option key={`library-purpose-${purpose}`} value={purpose}>
                            {purpose}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Difficulty
                      <select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}>
                        <option value="">All difficulties</option>
                        <option value="beginner">beginner</option>
                        <option value="intermediate">intermediate</option>
                        <option value="advanced">advanced</option>
                      </select>
                    </label>
                    <div className="button-grid">
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => {
                          setCategoryFilter('')
                          setGroupFilter('')
                          setEquipmentFilter('')
                          setPurposeFilter('')
                          setDifficultyFilter('')
                        }}
                      >
                        Clear
                      </button>
                      <button className="primary-button" type="button" onClick={() => setLibraryFiltersOpen(false)}>
                        Done
                      </button>
                    </div>
                  </section>
                </div>
              )}
              <section className="library-grid">
                {filteredExercises.map((exercise) => (
                  <Card key={exercise.id} className="exercise-card">
                    <div className="exercise-card-main">
                      <div>
                        <span className="tag">{rampRepGroupForExercise(exercise)}</span>
                        <h2>{exercise.name}</h2>
                        <p>{exercise.purpose ?? exercise.description}</p>
                        <small>{exerciseDemoStatusText(exercise)}</small>
                      </div>
                    </div>
                    <div className="card-actions compact">
                      <ExerciseDemoButton exercise={exercise} onOpen={openExerciseDemo} />
                      <button className="primary-button compact-cta" type="button" onClick={() => addDraftExercise(exercise, { startFreeLog: true })}>
                        <Plus aria-hidden="true" size={17} />
                        Log
                      </button>
                      {editMode && (
                        <ActionMenu label={`${exercise.name} actions`}>
                          <button type="button" onClick={() => setExerciseDraft({ ...exercise })}>
                            <Pencil aria-hidden="true" size={16} />
                            Edit exercise
                          </button>
                        </ActionMenu>
                      )}
                    </div>
                  </Card>
                ))}
              </section>

              {editMode && exerciseDraft && (
                <Card>
                  <div className="section-title">
                    <h2>Edit Exercise</h2>
                    <button className="icon-button" type="button" aria-label="Close exercise editor" onClick={() => setExerciseDraft(null)}>
                      <X aria-hidden="true" size={18} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <label>
                      Name
                      <input value={exerciseDraft.name} onChange={(event) => setExerciseDraft({ ...exerciseDraft, name: event.target.value })} />
                    </label>
                    <label>
                      Difficulty
                      <select value={exerciseDraft.difficulty} onChange={(event) => setExerciseDraft({ ...exerciseDraft, difficulty: event.target.value as Exercise['difficulty'] })}>
                        <option value="beginner">beginner</option>
                        <option value="intermediate">intermediate</option>
                        <option value="advanced">advanced</option>
                      </select>
                    </label>
                    <label>
                      Group
                      <select value={exerciseDraft.group ?? ''} onChange={(event) => setExerciseDraft({ ...exerciseDraft, group: event.target.value as ExerciseGroup })}>
                        <option value="">Select group</option>
                        {exerciseGroups.map((group) => (
                          <option key={`exercise-draft-group-${group}`} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Description
                    <textarea value={exerciseDraft.description} onChange={(event) => setExerciseDraft({ ...exerciseDraft, description: event.target.value })} />
                  </label>
                  <label>
                    Instructions
                    <textarea value={exerciseDraft.instructions.join('\n')} onChange={(event) => setExerciseDraft({ ...exerciseDraft, instructions: lines(event.target.value) })} />
                  </label>
                  <label>
                    Form cues
                    <textarea value={exerciseDraft.formCues.join('\n')} onChange={(event) => setExerciseDraft({ ...exerciseDraft, formCues: lines(event.target.value) })} />
                  </label>
                  <label>
                    Common mistakes
                    <textarea value={exerciseDraft.commonMistakes.join('\n')} onChange={(event) => setExerciseDraft({ ...exerciseDraft, commonMistakes: lines(event.target.value) })} />
                  </label>
                  <label>
                    Target areas
                    <input value={exerciseDraft.targetAreas.join(', ')} onChange={(event) => setExerciseDraft({ ...exerciseDraft, targetAreas: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
                  </label>
                  <label>
                    Bike-tour purpose
                    <input value={exerciseDraft.bikeTourPurpose?.join(', ') ?? ''} onChange={(event) => setExerciseDraft({ ...exerciseDraft, bikeTourPurpose: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) as BikeTourPurpose[] })} />
                  </label>
                  <div className="checkbox-grid">
                    {equipmentKinds.map((kind) => (
                      <label key={`exercise-draft-equipment-${kind}`}>
                        <input
                          checked={exerciseDraft.equipment.includes(kind)}
                          type="checkbox"
                          onChange={(event) => {
                            const next = event.target.checked ? [...exerciseDraft.equipment, kind] : exerciseDraft.equipment.filter((item) => item !== kind)
                            setExerciseDraft({ ...exerciseDraft, equipment: next })
                          }}
                        />
                        {kind}
                      </label>
                    ))}
                  </div>
                  <div className="form-grid">
                    <NumberStepper
                      label="Default sets"
                      value={exerciseDraft.defaults.sets}
                      min={0}
                      max={20}
                      step={1}
                      quickOptions={[1, 2, 3, 4, 5]}
                      onChange={(value) => setExerciseDraft({ ...exerciseDraft, defaults: { ...exerciseDraft.defaults, sets: value } })}
                    />
                    <NumberStepper
                      label="Default reps"
                      value={firstNumber(exerciseDraft.defaults.reps)}
                      min={0}
                      max={100}
                      step={1}
                      quickOptions={[5, 8, 10, 12, 15, 20]}
                      onChange={(value) => setExerciseDraft({ ...exerciseDraft, defaults: { ...exerciseDraft.defaults, reps: value == null ? undefined : String(value) } })}
                    />
                    <DurationPicker
                      value={exerciseDraft.defaults.durationSeconds}
                      onChange={(value) => setExerciseDraft({ ...exerciseDraft, defaults: { ...exerciseDraft.defaults, durationSeconds: value } })}
                    />
                  </div>
                  <label>
                    YouTube embed URL
                    <input value={exerciseDraft.videoUrl ?? ''} onChange={(event) => setExerciseDraft({ ...exerciseDraft, videoUrl: event.target.value })} />
                  </label>
                  <label>
                    Image URL
                    <input value={exerciseDraft.imageUrl ?? ''} onChange={(event) => setExerciseDraft({ ...exerciseDraft, imageUrl: event.target.value })} />
                  </label>
                  <label>
                    Attribution
                    <input value={exerciseDraft.attribution ?? ''} onChange={(event) => setExerciseDraft({ ...exerciseDraft, attribution: event.target.value })} />
                  </label>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={async () => {
                      await saveExercise(exerciseDraft)
                      setExerciseDraft(null)
                      await refresh()
                      showFlash('Exercise saved.')
                    }}
                  >
                    <Save aria-hidden="true" size={18} />
                    Save Exercise
                  </button>
                </Card>
              )}
            </>
          )}
        </main>
      )}

      {page === 'log' && (
        <main className="page-grid">
          <Card className="log-start-card">
            <div className="section-title">
              <h2>Start Logging</h2>
              <Route aria-hidden="true" size={20} />
            </div>
            <div className="segmented three-way">
              <button className={logMode === 'recommended' ? 'active' : ''} type="button" onClick={() => nextRecommendation && startRoutine(nextRecommendation.routine.id)}>
                Start recommended workout
              </button>
              <button className={logMode === 'routine' ? 'active' : ''} type="button" onClick={() => setLogMode('routine')}>
                Choose routine
              </button>
              <button className={logMode === 'free' ? 'active' : ''} type="button" onClick={startFreeWorkout}>
                Free workout
              </button>
            </div>
            {logMode !== 'free' && (
              <label>
                Choose routine
                <select value={selectedRoutine?.id ?? ''} onChange={(event) => prepareRoutine(event.target.value)}>
                  {enabledRoutines.map((routine) => (
                    <option key={routine.id} value={routine.id}>
                      {routine.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <DurationPicker label="Minutes" value={durationMinutes} onChange={(value) => setDurationMinutes(value ?? 0)} />
            {data.schedule.travelMode && <p className="notice">Travel mode is active.</p>}
            {data.schedule.busyWorkWeek && <p className="notice">Busy work week: choose the shortest useful session.</p>}
            {data.schedule.hillFocusWeek && <p className="notice">Hill focus week: prioritize step-ups, split squats, carries, and climbs.</p>}
            {data.schedule.recoveryWeek && <p className="notice">Recovery week: keep intensity easy and protect soreness.</p>}
            {deloadApplied && <p className="notice">Deload week: planned sets are reduced.</p>}
          </Card>

          <Card>
            <div className="section-title">
              <h2>Add Any Exercise</h2>
              <Plus aria-hidden="true" size={20} />
            </div>
            <label>
              <span>
                <Search aria-hidden="true" size={15} /> Search library
              </span>
              <input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="anti-rotation, trailer, row..." />
            </label>
            <div className="form-grid">
              <label>
                Search/select
                <select value={freeExerciseId} onChange={(event) => setFreeExerciseId(event.target.value)}>
                  <option value="">Select exercise</option>
                  {filteredExercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  const exercise = exercises.find((item) => item.id === freeExerciseId)
                  if (exercise) {
                    addDraftExercise(exercise)
                    setFreeExerciseId('')
                  }
                }}
              >
                <Plus aria-hidden="true" size={18} />
                Add
              </button>
            </div>
            <label>
              Quick custom exercise
              <input value={quickExerciseName} onChange={(event) => setQuickExerciseName(event.target.value)} placeholder="e.g. hotel room mobility" />
            </label>
            <button className="ghost-button" type="button" onClick={() => void saveQuickExercise()}>
              Create and Add
            </button>
          </Card>

          <section className="exercise-stack">
            {visibleDraftEntries.map((entry, index) => {
              const routineEntry = routineExercises.find((item) => item.id === entry.routineExerciseId)
              const exercise = exerciseById.get(entry.exerciseId)
              return (
                <Card key={entry.routineExerciseId ?? entry.exerciseId}>
                  <div className="section-title">
                    <h2>{entry.exerciseName}</h2>
                    <div className="compact-action-row">
                      {exercise && <ExerciseDemoButton exercise={exercise} onOpen={openExerciseDemo} compact />}
                      <span className="tag">effort {entry.effort ?? '-'}</span>
                    </div>
                  </div>
                  {entry.lastSummary && (
                    <div className="last-values-row">
                      <p className="last-summary">Using last values · {entry.lastSummary.replace('Last: ', '')}</p>
                      <button className="text-icon-button" type="button" onClick={() => resetDraftEntryToSeedDefaults(index)}>
                        <RotateCcw aria-hidden="true" size={15} />
                        Reset
                      </button>
                    </div>
                  )}
                  {routineEntry?.variationOptions?.length ? (
                    <label>
                      Variation
                      <select
                        value={entry.exerciseName}
                        onChange={(event) => {
                          const exercise = exerciseByName.get(event.target.value)
                          setDraftEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, exerciseName: event.target.value, exerciseId: exercise?.id ?? item.exerciseId }
                                : item,
                            ),
                          )
                        }}
                      >
                        {routineEntry.variationOptions.map((option) => (
                          <option key={`${routineEntry.id}-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="swap-control">
                    Swap exercise
                    <select
                      value={entry.exerciseId}
                      onChange={(event) => {
                        const nextExercise = exerciseById.get(event.target.value)
                        if (nextExercise) {
                          applyExerciseToDraftEntry(index, nextExercise)
                        }
                      }}
                    >
                      {exercises.map((exerciseOption) => (
                        <option key={exerciseOption.id} value={exerciseOption.id}>
                          {exerciseOption.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="log-grid thumb-grid">
                    <NumberStepper
                      label="Sets"
                      value={entry.sets}
                      min={0}
                      max={20}
                      step={1}
                      quickOptions={[1, 2, 3, 4, 5]}
                      onChange={(value) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, sets: value } : item)))}
                    />
                    <NumberStepper
                      label="Reps"
                      value={firstNumber(entry.reps)}
                      min={0}
                      max={100}
                      step={1}
                      quickOptions={[5, 8, 10, 12, 15, 20]}
                      onChange={(value) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, reps: value == null ? undefined : String(value) } : item)))}
                    />
                    <WeightPicker
                      units={data.settings.units}
                      value={entry.weight}
                      onChange={(value) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, weight: value } : item)))}
                    />
                    <DurationPicker
                      value={entry.durationSeconds}
                      onChange={(value) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, durationSeconds: value } : item)))}
                    />
                    <NumberStepper
                      label="Distance"
                      value={firstNumber(entry.distance)}
                      min={0}
                      max={500}
                      step={0.5}
                      suffix=" mi"
                      quickOptions={[1, 3, 5, 8, 10, 20, 40]}
                      onChange={(value) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, distance: value == null ? undefined : `${value} mi` } : item)))}
                    />
                    <EffortPicker
                      value={entry.effort}
                      onChange={(value) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, effort: value } : item)))}
                    />
                  </div>
                  {editMode && <div className="toolbar">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        setDraftEntries((current) => {
                          const source = (current.length ? current : visibleDraftEntries)[index]
                          if (!source) {
                            return current
                          }
                          const nextEntry: WorkoutDraftEntry = {
                            ...source,
                            routineExerciseId: undefined,
                            notes: source.notes ? `${source.notes} (repeat)` : 'repeat set',
                          }
                          const base = current.length ? current : visibleDraftEntries
                          return [...base.slice(0, index + 1), nextEntry, ...base.slice(index + 1)]
                        })
                      }
                    >
                      Repeat last set
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={index === 0}
                      onClick={() =>
                        setDraftEntries((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index && current[index - 1]
                              ? {
                                  ...item,
                                  sets: current[index - 1].sets,
                                  reps: current[index - 1].reps,
                                  weight: current[index - 1].weight,
                                  durationSeconds: current[index - 1].durationSeconds,
                                  effort: current[index - 1].effort,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      Copy previous set
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        setDraftEntries((current) =>
                          (current.length ? current : visibleDraftEntries).map((item, itemIndex) =>
                            itemIndex > index
                              ? {
                                  ...item,
                                  sets: entry.sets,
                                  reps: entry.reps,
                                  weight: entry.weight,
                                  durationSeconds: entry.durationSeconds,
                                  effort: entry.effort,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      Apply to remaining
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        setDraftEntries((current) =>
                          current.map((item) => ({
                            ...item,
                            sets: entry.sets,
                            reps: entry.reps,
                            weight: entry.weight,
                            durationSeconds: entry.durationSeconds,
                          })),
                        )
                      }
                    >
                      Apply to all
                    </button>
                  </div>}
                  {entry.exerciseId === 'burley-loaded-trailer-ride' && (
                    <div className="burley-panel">
                      <p className="notice">Dog comfort is mandatory. Avoid heat, traffic, excessive speed, and hard hill repeats with the dog.</p>
                      <div className="log-grid thumb-grid">
                        <WeightPicker
                          label="Dog weight"
                          units={data.settings.units}
                          value={Number(entry.customFields?.dogWeight ?? 45)}
                          onChange={(value) =>
                            setDraftEntries((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      customFields: {
                                        ...item.customFields,
                                        dogWeight: value ?? 45,
                                        totalTowedLoad: (value ?? 45) + Number(item.customFields?.trailerLoadWeight ?? 0),
                                      },
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                        <WeightPicker
                          label="Trailer load"
                          units={data.settings.units}
                          value={Number(entry.customFields?.trailerLoadWeight ?? 0)}
                          onChange={(value) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, customFields: { ...item.customFields, trailerLoadWeight: value ?? 0, totalTowedLoad: Number(item.customFields?.dogWeight ?? 45) + (value ?? 0) } } : item)))}
                        />
                        <label>
                          Surface
                          <select value={String(entry.customFields?.surface ?? 'mixed')} onChange={(event) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, customFields: { ...item.customFields, surface: event.target.value } } : item)))}>
                            <option value="pavement">pavement</option>
                            <option value="gravel">gravel</option>
                            <option value="mixed">mixed</option>
                          </select>
                        </label>
                        <label className="inline-check">
                          <input checked={Boolean(entry.customFields?.dogComfortCheck ?? true)} type="checkbox" onChange={(event) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, customFields: { ...item.customFields, dogComfortCheck: event.target.checked } } : item)))} />
                          dog comfort check
                        </label>
                        <label className="inline-check">
                          <input checked={Boolean(entry.customFields?.emptyTrailerPractice)} type="checkbox" onChange={(event) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, customFields: { ...item.customFields, emptyTrailerPractice: event.target.checked } } : item)))} />
                          empty trailer practice
                        </label>
                      </div>
                    </div>
                  )}
                  <label>
                    Notes
                    <textarea value={entry.notes ?? ''} onChange={(event) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, notes: event.target.value } : item)))} />
                  </label>
                </Card>
              )
            })}
          </section>

          <Card>
            <label>
              Workout notes
              <textarea value={logNotes} onChange={(event) => setLogNotes(event.target.value)} />
            </label>
            <button className="primary-button" type="button" onClick={() => void handleCompleteWorkout()}>
              <CheckCircle2 aria-hidden="true" size={18} />
              Complete Workout
            </button>
          </Card>

          <Card>
            <div className="section-title">
              <h2>Past Logs</h2>
              <button className="icon-button" type="button" aria-label="Export CSV" onClick={() => void handleExportCsv()}>
                <Download aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="stack">
              {logs.slice(0, 8).map((log) => (
                <div className="past-log" key={log.id}>
                  <div>
                    <strong>{log.routineName}</strong>
                    <p>
                      {formatShortDate(log.completedAt)} · {log.status}
                    </p>
                  </div>
                  <div className="toolbar">
                    <button
                      className="icon-button tertiary"
                      type="button"
                      aria-label={`Edit ${log.routineName}`}
                      onClick={() =>
                        setEditLog({
                          log: { ...log },
                          entries: entries.filter((entry) => entry.workoutLogId === log.id).map((entry) => ({ ...entry })),
                        })
                      }
                    >
                      <Pencil aria-hidden="true" size={17} />
                    </button>
                    <button
                      className="icon-button danger"
                      type="button"
                      aria-label="Delete log"
                      onClick={async () => {
                        if (window.confirm('Delete this workout log?')) {
                          await deleteWorkoutLog(log.id)
                          await refresh()
                        }
                      }}
                    >
                      <Trash2 aria-hidden="true" size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {editMode && editLog && (
            <Card>
              <div className="section-title">
                <h2>Edit Past Log</h2>
                <button className="icon-button" type="button" aria-label="Close edit log" onClick={() => setEditLog(null)}>
                  <X aria-hidden="true" size={18} />
                </button>
              </div>
              <div className="form-grid">
                <label>
                  Date/time
                  <input value={editLog.log.completedAt.slice(0, 16)} type="datetime-local" onChange={(event) => setEditLog({ ...editLog, log: { ...editLog.log, completedAt: new Date(event.target.value).toISOString() } })} />
                </label>
                <DurationPicker label="Minutes" value={editLog.log.totalMinutes} onChange={(value) => setEditLog({ ...editLog, log: { ...editLog.log, totalMinutes: value } })} />
              </div>
              {editLog.entries.map((entry, index) => (
                <div className="exercise-edit-row" key={entry.id}>
                  <div className="section-title">
                    <strong>{entry.exerciseName}</strong>
                    {exerciseById.get(entry.exerciseId) && <ExerciseDemoButton exercise={exerciseById.get(entry.exerciseId)!} onOpen={openExerciseDemo} compact />}
                  </div>
                  <div className="mini-stepper-grid">
                    <NumberStepper
                      label="Sets"
                      value={entry.sets}
                      min={0}
                      max={20}
                      step={1}
                      quickOptions={[1, 2, 3, 4, 5]}
                      onChange={(value) => setEditLog({ ...editLog, entries: editLog.entries.map((item, itemIndex) => (itemIndex === index ? { ...item, sets: value } : item)) })}
                    />
                    <NumberStepper
                      label="Reps"
                      value={firstNumber(entry.reps)}
                      min={0}
                      max={100}
                      step={1}
                      quickOptions={[5, 8, 10, 12, 15, 20]}
                      onChange={(value) => setEditLog({ ...editLog, entries: editLog.entries.map((item, itemIndex) => (itemIndex === index ? { ...item, reps: value == null ? undefined : String(value) } : item)) })}
                    />
                    <WeightPicker
                      units={data.settings.units}
                      value={entry.weight}
                      onChange={(value) => setEditLog({ ...editLog, entries: editLog.entries.map((item, itemIndex) => (itemIndex === index ? { ...item, weight: value } : item)) })}
                    />
                  </div>
                </div>
              ))}
              <label>
                Notes
                <textarea value={editLog.log.notes ?? ''} onChange={(event) => setEditLog({ ...editLog, log: { ...editLog.log, notes: event.target.value } })} />
              </label>
              <button className="primary-button" type="button" onClick={() => void handleUpdatePastLog()}>
                <Save aria-hidden="true" size={18} />
                Save Log
              </button>
            </Card>
          )}
        </main>
      )}

      {page === 'carbs' && (
        <main className="page-grid carb-page">
          <Card className="carb-hero">
            <div className="section-title">
              <div>
                <p className="eyebrow">Today</p>
                <h2>
                  {carbReports.today.total} / {carbReports.today.goal}g
                </h2>
              </div>
              <span className="tag">{todayCarbStatus}</span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${Math.min(100, (carbReports.today.total / Math.max(1, carbReports.today.goal)) * 100)}%` }} />
            </div>
          </Card>

          <Card className="quick-carb-card">
            <div className="section-title">
              <div>
                <p className="eyebrow">Quick add</p>
                <h2>{selectedDayStatus}</h2>
              </div>
              <label className="date-pill">
                <span>Date</span>
                <input type="date" value={carbSelectedDate} onChange={(event) => setCarbSelectedDate(event.target.value)} />
              </label>
            </div>
            <div className="meal-slot-grid" aria-label="Meal slot">
              {carbMealSlots.map((slot) => (
                <button
                  className={carbMealSlot === slot ? 'active' : ''}
                  key={slot}
                  type="button"
                  onClick={() => setCarbMealSlot(slot)}
                >
                  {carbMealSlotLabels[slot]}
                </button>
              ))}
            </div>
            <div className="carb-integer-picker" aria-label="Net carb integer picker">
              <button type="button" onClick={() => setCarbAmount((value) => normalizeCarbGrams(value - 5))}>-5</button>
              <button type="button" onClick={() => setCarbAmount((value) => normalizeCarbGrams(value - 1))}>-1</button>
              <strong>{carbAmount}g</strong>
              <button type="button" onClick={() => setCarbAmount((value) => normalizeCarbGrams(value + 1))}>+1</button>
              <button type="button" onClick={() => setCarbAmount((value) => normalizeCarbGrams(value + 5))}>+5</button>
            </div>
            <button className="primary-button" type="button" onClick={() => void handleAddManualCarbs()}>
              <Plus aria-hidden="true" size={18} />
              Add {carbAmount}g to {carbMealSlotLabels[carbMealSlot]}
            </button>
          </Card>

          {carbPanel === 'reports' && <Card className="meal-breakdown-card">
            <div className="section-title">
              <div>
                <p className="eyebrow">{carbSelectedDate}</p>
                <h2>Meal breakdown</h2>
              </div>
              <span className="tag">
                {selectedDayTotal}/{selectedDayGoal}g
              </span>
            </div>
            <div className="meal-section-list">
              {selectedDayMealTotals.map((meal) => {
                const mealEntries = selectedDayEntries.filter((entry) => entry.mealSlot === meal.slot)
                return (
                  <details className="meal-section" key={meal.slot} open={mealEntries.length > 0}>
                    <summary>
                      <span>{meal.label}</span>
                      <strong>{meal.value}g</strong>
                    </summary>
                    <button
                      className="text-icon-button"
                      type="button"
                      onClick={() => {
                        setCarbMealSlot(meal.slot)
                        setCarbAmount(0)
                      }}
                    >
                      <Plus aria-hidden="true" size={16} />
                      Add here
                    </button>
                    {mealEntries.length ? (
                      <div className="stack">
                        {mealEntries.map((entry) => (
                          <div className="carb-entry-row" key={entry.id}>
                            {carbEditEntry?.id === entry.id ? (
                              <div className="carb-entry-edit">
                                <select
                                  value={carbEditEntry.mealSlot}
                                  onChange={(event) =>
                                    setCarbEditEntry({ ...carbEditEntry, mealSlot: event.target.value as CarbMealSlot })
                                  }
                                >
                                  {carbMealSlots.map((slot) => (
                                    <option key={slot} value={slot}>
                                      {carbMealSlotLabels[slot]}
                                    </option>
                                  ))}
                                </select>
                                <NumberStepper
                                  label="Net carbs"
                                  value={carbEditEntry.netCarbs}
                                  min={0}
                                  max={300}
                                  suffix="g"
                                  quickOptions={carbQuickPicks}
                                  quickIncrements={[1, 5, 10]}
                                  onChange={(value) =>
                                    setCarbEditEntry({ ...carbEditEntry, netCarbs: normalizeCarbGrams(value) })
                                  }
                                />
                                <div className="button-grid">
                                  <button className="ghost-button" type="button" onClick={() => void handleSaveCarbEdit()}>
                                    <Save aria-hidden="true" size={18} />
                                    Save
                                  </button>
                                  <button className="danger-button" type="button" onClick={() => setCarbEditEntry(null)}>
                                    <X aria-hidden="true" size={18} />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <strong>{entry.netCarbs}g net</strong>
                                  <p>
                                    {sourceLabels[entry.sourceType]}
                                    {entry.savedFoodName ? ` · ${entry.savedFoodName}` : ''}
                                  </p>
                                </div>
                                {editMode && <div className="toolbar">
                                  <button className="icon-button" type="button" aria-label="Edit net carb entry" onClick={() => setCarbEditEntry(entry)}>
                                    <Pencil aria-hidden="true" size={18} />
                                  </button>
                                  <button
                                    className="icon-button danger"
                                    type="button"
                                    aria-label="Delete net carb entry"
                                    onClick={async () => {
                                      await deleteCarbEntry(entry.id)
                                      await refresh()
                                      showFlash('Net carb entry deleted.')
                                    }}
                                  >
                                    <Trash2 aria-hidden="true" size={18} />
                                  </button>
                                </div>}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState title="No entries" body="Tap Add here or use Quick add." />
                    )}
                  </details>
                )
              })}
            </div>
          </Card>}

          <Card className="carb-more-card">
            <div className="section-title">
              <div>
                <p className="eyebrow">Carbs</p>
                <h2>More options</h2>
              </div>
            </div>
            <div className="button-grid">
              <button className={carbPanel === 'lookup' ? 'primary-button' : 'ghost-button'} type="button" onClick={() => setCarbPanel(carbPanel === 'lookup' ? 'none' : 'lookup')}>
                Food lookup
              </button>
              <button className={carbPanel === 'presets' ? 'primary-button' : 'ghost-button'} type="button" onClick={() => setCarbPanel(carbPanel === 'presets' ? 'none' : 'presets')}>
                Presets
              </button>
              <button className={carbPanel === 'reports' ? 'primary-button' : 'ghost-button'} type="button" onClick={() => setCarbPanel(carbPanel === 'reports' ? 'none' : 'reports')}>
                Reports
              </button>
            </div>
          </Card>

          {carbPanel === 'lookup' && <Card className="lookup-card">
            <div className="section-title">
              <div>
                <p className="eyebrow">Optional lookup</p>
                <h2>{lookupSourceLabel}</h2>
              </div>
              {lookupLoading && <span className="tag">Searching</span>}
            </div>
            <div className="form-grid">
              <label>
                Search
                <input
                  value={lookupQuery}
                  onChange={(event) => setLookupQuery(event.target.value)}
                  placeholder="food or branded item"
                />
              </label>
            </div>
            {!usdaKeySaved && <p className="notice">Add your USDA key in Net Carb Settings before lookup. Manual net-carb entry still works.</p>}
            <button className="ghost-button" type="button" disabled={lookupLoading} onClick={() => void handleLookupSearch()}>
              <Search aria-hidden="true" size={18} />
              Search
            </button>
            {lookupError && <p className="notice">{lookupError}</p>}
            {lookupResults.length ? (
              <div className="lookup-results">
                {lookupResults.map((result) => (
                  <button key={result.id} type="button" onClick={() => void handleSelectLookupResult(result)}>
                    <span>
                      <strong>{result.name}</strong>
                      <small>
                        {result.brand ? `${result.brand} · ` : ''}
                        {result.servingSize ?? 'serving unclear'}
                      </small>
                    </span>
                    <b>{result.netCarbs}g</b>
                  </button>
                ))}
              </div>
            ) : null}
            {lookupSelected && (
              <div className="lookup-detail">
                <div>
                  <p className="eyebrow">{lookupSelected.attribution}</p>
                  <h3>{lookupSelected.name}</h3>
                  <p>{lookupSelected.formula}</p>
                  <p>
                    {lookupSelected.servingSize ?? 'Serving unclear'}
                    {lookupSelected.brand ? ` · ${lookupSelected.brand}` : ''}
                  </p>
                  {lookupSelected.servingWarning && <p className="notice">{lookupSelected.servingWarning}</p>}
                </div>
                <NumberStepper
                  label="Manual override"
                  value={lookupOverride}
                  min={0}
                  max={300}
                  suffix="g"
                  quickOptions={carbQuickPicks}
                  quickIncrements={[1, 5, 10]}
                  onChange={(value) => setLookupOverride(normalizeCarbGrams(value))}
                />
                <div className="button-grid">
                  <button className="ghost-button" type="button" onClick={() => void handleAddLookupCarbs()}>
                    <Plus aria-hidden="true" size={18} />
                    Add to meal
                  </button>
                  <button className="ghost-button" type="button" onClick={() => void handleSaveLookupPreset()}>
                    <Save aria-hidden="true" size={18} />
                    Save preset
                  </button>
                </div>
              </div>
            )}
          </Card>}

          {carbPanel === 'presets' && <Card className="preset-card">
            <div className="section-title">
              <div>
                <p className="eyebrow">Shortcuts</p>
                <h2>Net carb presets</h2>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Name
                <input value={presetDraft.name} onChange={(event) => setPresetDraft({ ...presetDraft, name: event.target.value })} />
              </label>
              <label>
                Serving
                <input
                  value={presetDraft.servingDescription}
                  onChange={(event) => setPresetDraft({ ...presetDraft, servingDescription: event.target.value })}
                  placeholder="optional"
                />
              </label>
            </div>
            <NumberStepper
              label="Preset net carbs"
              value={presetDraft.netCarbs}
              min={0}
              max={300}
              suffix="g"
              quickOptions={carbQuickPicks}
              quickIncrements={[1, 5, 10]}
              onChange={(value) => setPresetDraft({ ...presetDraft, netCarbs: normalizeCarbGrams(value) })}
            />
            <button className="ghost-button" type="button" onClick={() => void handlePresetSave()}>
              <Save aria-hidden="true" size={18} />
              Save preset
            </button>
            {recentPresets.length ? (
              <div className="preset-list">
                {recentPresets.map((preset) => (
                  <div className="preset-row" key={preset.id}>
                    <div>
                      <strong>{preset.name}</strong>
                      <p>
                        {preset.netCarbs}g
                        {preset.servingDescription ? ` · ${preset.servingDescription}` : ''} · used {preset.useCount}
                      </p>
                    </div>
                    <div className="toolbar">
                      <button className="ghost-button" type="button" onClick={() => void handleUsePreset(preset)}>
                        Use
                      </button>
                      {editMode && (
                        <>
                          <button
                            className="icon-button"
                            type="button"
                            aria-label="Edit preset"
                            onClick={() =>
                              setPresetDraft({
                                id: preset.id,
                                name: preset.name,
                                netCarbs: preset.netCarbs,
                                servingDescription: preset.servingDescription ?? '',
                              })
                            }
                          >
                            <Pencil aria-hidden="true" size={18} />
                          </button>
                          <button
                            className="icon-button danger"
                            type="button"
                            aria-label="Delete preset"
                            onClick={async () => {
                              await deleteCarbPreset(preset.id)
                              await refresh()
                              showFlash('Preset deleted.')
                            }}
                          >
                            <Trash2 aria-hidden="true" size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No presets yet" body="Save a frequent entry as a lightweight shortcut." />
            )}
          </Card>}

          {carbPanel === 'reports' && <Card className="carb-reports-card">
            <div className="section-title">
              <div>
                <p className="eyebrow">Reports</p>
                <h2>Net-carb trends</h2>
              </div>
            </div>
            <section className="metric-grid">
              <div className="report-tile">
                <p className="eyebrow">Today</p>
                <strong>{carbReports.today.total}g</strong>
              </div>
              <div className="report-tile">
                <p className="eyebrow">Last 7 days</p>
                <strong>{carbReports.last7Total}g</strong>
              </div>
              <div className="report-tile">
                <p className="eyebrow">Last 30 days</p>
                <strong>{carbReports.last30Total}g</strong>
              </div>
              <div className="report-tile">
                <p className="eyebrow">Goal days</p>
                <strong>{carbReports.compliance.percentageMet}%</strong>
              </div>
            </section>
            <div className="stacked-meal-bar" aria-label="Selected day meal-slot stacked bar">
              {selectedDayMealTotals.map((meal) => (
                <span
                  key={meal.slot}
                  style={{ width: `${Math.max(3, (meal.value / Math.max(1, selectedDayTotal)) * 100)}%` }}
                  title={`${meal.label}: ${meal.value}g`}
                />
              ))}
            </div>
            <BarList data={carbReports.daily.slice(-14).map((item) => ({ label: formatShortDate(item.dateISO), value: item.total }))} unit="g" />
            <div className="report-list">
              {carbReports.weekly.slice(-4).map((week) => (
                <div className="report-row" key={week.key}>
                  <strong>{formatShortDate(week.key)}</strong>
                  <p>
                    {week.total}g total · {week.averagePerDay}g/day · {week.goalDaysMet} met / {week.goalDaysOver} over
                  </p>
                </div>
              ))}
              {carbReports.monthly.slice(-3).map((month) => (
                <div className="report-row" key={month.key}>
                  <strong>{month.key}</strong>
                  <p>
                    {month.total}g total · {month.averagePerDay}g/day · {month.goalDaysMet} days met
                  </p>
                </div>
              ))}
              <div className="report-row">
                <strong>Streaks</strong>
                <p>
                  Current {carbReports.compliance.currentStreak} days · best {carbReports.compliance.longestStreak} days
                </p>
              </div>
            </div>
            <div className="mini-report-grid">
              {carbReports.dayOfWeek.map((item) => (
                <div className="report-tile" key={item.label}>
                  <p className="eyebrow">{item.label.slice(0, 3)}</p>
                  <strong>{item.average}g</strong>
                  <small>{item.total}g total</small>
                </div>
              ))}
            </div>
            <div className="mini-report-grid">
              {carbReports.mealSlot.map((item) => (
                <div className="report-tile" key={item.label}>
                  <p className="eyebrow">{item.label}</p>
                  <strong>{item.average}g</strong>
                  <small>{item.total}g total</small>
                </div>
              ))}
            </div>
          </Card>}
        </main>
      )}

      {page === 'progress' && (
        <main className="page-grid">
          <section className="metric-grid">
            <Card>
              <p className="eyebrow">Strength</p>
              <strong className="metric-value">{strengthSessions}</strong>
              <p>completed sessions</p>
            </Card>
            <Card>
              <p className="eyebrow">Mobility</p>
              <strong className="metric-value">{mobilitySessions}</strong>
              <p>mobility/recovery sessions</p>
            </Card>
            <Card>
              <p className="eyebrow">Ride sessions</p>
              <strong className="metric-value">{rideSessions}</strong>
              <p>bike or trailer logs</p>
            </Card>
            <Card>
              <p className="eyebrow">Walk sessions</p>
              <strong className="metric-value">{walkSessions}</strong>
              <p>walk or ruck logs</p>
            </Card>
            <Card>
              <p className="eyebrow">Ruck minutes</p>
              <strong className="metric-value">{ruckMinutes}</strong>
              <p>logged pack-carry minutes</p>
            </Card>
            <Card>
              <p className="eyebrow">Dog walk miles</p>
              <strong className="metric-value">{Math.round(dogWalkMiles * 10) / 10}</strong>
              <p>logged dog walk distance</p>
            </Card>
          </section>
          <Card>
            <h2>Sessions Per Week</h2>
            <BarList data={sessionsPerWeek(logs)} />
          </Card>
          <Card>
            <h2>Total Sets Per Week</h2>
            <BarList data={totalSetsPerWeek(logs, entries)} />
          </Card>
          <Card>
            <h2>Total Logged Minutes</h2>
            <BarList data={minutesPerWeek(logs)} unit="m" />
          </Card>
          <Card>
            <h2>Hill / Trailer Minutes</h2>
            <BarList data={[{ label: 'Total', value: hillTrailerMinutes }]} unit="m" />
          </Card>
          <Card>
            <h2>Estimated Volume By Exercise</h2>
            <BarList data={estimatedVolumeByExercise(entries)} />
          </Card>
          <Card>
            <h2>Consistency Over Time</h2>
            <BarList data={consistencyByDate(logs)} />
          </Card>
          <Card>
            <h2>Top Exercises</h2>
            <BarList data={topExercisesByFrequency(entries)} />
          </Card>
          <Card>
            <label>
              Exercise history
              <select value={activeHistoryExerciseName} onChange={(event) => setHistoryExerciseName(event.target.value)}>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.name}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="history-list">
              {exerciseHistory(activeHistoryExerciseName, logs, entries).map((item) => (
                <div className="past-log" key={`${item.date}-${item.reps}-${item.weight}`}>
                  <strong>{formatShortDate(item.date)}</strong>
                  <p>
                    {item.sets} sets · {item.reps || 'open'} · {item.weight ? `${item.weight}${data.settings.units}` : 'bodyweight'} · effort {item.effort || '-'}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </main>
      )}

      {page === 'roadmap' && (
        <main className="page-grid">
          <Card className="hero-card">
            <div>
              <p className="eyebrow">12-month bike-tour preparation</p>
              <h2>{roadmapCompletion}% complete</h2>
              <p>Built around consistency, Harrisonburg hills, loaded gravel, trailer practice, recovery, and real work/life constraints.</p>
            </div>
            <button className="primary-button" type="button" onClick={() => setPage('dashboard')}>
              Dashboard
            </button>
          </Card>

          <Card className="roadmap-guidance-card">
            <div className="section-title">
              <h2>This Week's Roadmap Read</h2>
              <Compass aria-hidden="true" size={20} />
            </div>
            <div className="guidance-list">
              {roadmapGuidance.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </Card>

          {data.roadmap.phases
            .sort((a, b) => a.order - b.order)
            .map((phase) => {
              const phaseMilestones = data.roadmap.milestones
                .filter((milestone) => milestone.phaseId === phase.id)
                .sort((a, b) => a.order - b.order)
              const completed = phaseMilestones.filter((milestone) => milestone.completed).length
              return (
                <Card key={phase.id}>
                  <div className="section-title">
                    <div>
                      <p className="eyebrow">{phase.months}</p>
                      <h2>{phase.title}</h2>
                    </div>
                    <span className="tag">
                      {completed}/{phaseMilestones.length}
                    </span>
                  </div>
                  <div className="tag-row">
                    {phase.focus.map((item, focusIndex) => (
                      <span className="tag" key={`${phase.id}-${item}-${focusIndex}`}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="stack roadmap-stack">
                    {phaseMilestones.map((milestone) => (
                      <div className="milestone-row" key={milestone.id}>
                        <label className="inline-check">
                          <input
                            checked={milestone.completed}
                            type="checkbox"
                            onChange={(event) =>
                              void updateRoadmap(
                                (roadmap) => ({
                                  ...roadmap,
                                  milestones: roadmap.milestones.map((item) =>
                                    item.id === milestone.id
                                      ? {
                                          ...item,
                                          completed: event.target.checked,
                                          completedAt: event.target.checked ? new Date().toISOString() : undefined,
                                        }
                                      : item,
                                  ),
                                }),
                                event.target.checked ? 'Milestone completed.' : 'Milestone reopened.',
                              )
                            }
                          />
                          <span>
                            <strong>{milestone.title}</strong>
                            <small>{milestone.description}</small>
                          </span>
                        </label>
                        {editMode && <div className="toolbar">
                          <button
                            className="icon-button"
                            type="button"
                            aria-label="Move milestone earlier"
                            onClick={() =>
                              void updateRoadmap(
                                (roadmap) => ({
                                  ...roadmap,
                                  milestones: roadmap.milestones.map((item) =>
                                    item.id === milestone.id ? { ...item, order: Math.max(1, item.order - 1) } : item,
                                  ),
                                }),
                                'Milestone moved.',
                              )
                            }
                          >
                            <ChevronUp aria-hidden="true" size={18} />
                          </button>
                          <button
                            className="icon-button"
                            type="button"
                            aria-label="Move milestone later"
                            onClick={() =>
                              void updateRoadmap(
                                (roadmap) => ({
                                  ...roadmap,
                                  milestones: roadmap.milestones.map((item) =>
                                    item.id === milestone.id ? { ...item, order: item.order + 1 } : item,
                                  ),
                                }),
                                'Milestone moved.',
                              )
                            }
                          >
                            <ChevronDown aria-hidden="true" size={18} />
                          </button>
                        </div>}
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}

          {editMode && <Card>
            <div className="section-title">
              <h2>Job/Life Conflicts</h2>
              <CalendarDays aria-hidden="true" size={20} />
            </div>
            <div className="form-grid">
              <label>
                Starts
                <input type="date" value={roadmapConflictDraft.startsOn} onChange={(event) => setRoadmapConflictDraft({ ...roadmapConflictDraft, startsOn: event.target.value })} />
              </label>
              <label>
                Ends
                <input type="date" value={roadmapConflictDraft.endsOn} onChange={(event) => setRoadmapConflictDraft({ ...roadmapConflictDraft, endsOn: event.target.value })} />
              </label>
            </div>
            <label>
              Note
              <input value={roadmapConflictDraft.note} onChange={(event) => setRoadmapConflictDraft({ ...roadmapConflictDraft, note: event.target.value })} placeholder="busy work travel, family weekend..." />
            </label>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                if (!roadmapConflictDraft.startsOn || !roadmapConflictDraft.endsOn) {
                  showFlash('Add conflict dates first.')
                  return
                }
                void updateRoadmap(
                  (roadmap) => ({
                    ...roadmap,
                    conflicts: [
                      ...roadmap.conflicts,
                      {
                        id: createId('conflict'),
                        startsOn: roadmapConflictDraft.startsOn,
                        endsOn: roadmapConflictDraft.endsOn,
                        note: roadmapConflictDraft.note,
                        lighterWeekSuggested: true,
                      },
                    ],
                  }),
                  'Conflict added. RampRep suggests a lighter week.',
                )
                setRoadmapConflictDraft({ startsOn: '', endsOn: '', note: '' })
              }}
            >
              <Plus aria-hidden="true" size={18} />
              Add Conflict
            </button>
            {data.roadmap.conflicts.map((conflict) => (
              <div className="past-log" key={conflict.id}>
                <div>
                  <strong>
                    {conflict.startsOn} to {conflict.endsOn}
                  </strong>
                  <p>{conflict.note || 'Life conflict'} · lighter week suggested</p>
                </div>
              </div>
            ))}
          </Card>}
        </main>
      )}

      {page === 'settings' && (
        <main className="page-grid">
          <Card>
            <div className="section-title">
              <h2>Preferences</h2>
              <button className="icon-button" type="button" aria-label="Save settings" onClick={() => void handleSaveSettings()}>
                <Save aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="form-grid">
              <label>
                Units
                <select value={settingsDraft.units} onChange={(event) => setSettingsDraft({ ...settingsDraft, units: event.target.value as UserSettings['units'] })}>
                  <option value="lb">pounds</option>
                  <option value="kg">kilograms</option>
                </select>
              </label>
              <label>
                Bodyweight
                <input value={settingsDraft.bodyweight ?? ''} inputMode="decimal" onChange={(event) => setSettingsDraft({ ...settingsDraft, bodyweight: numberOrUndefined(event.target.value) })} />
              </label>
              <label>
                Duration
                <select value={settingsDraft.durationPreference} onChange={(event) => setSettingsDraft({ ...settingsDraft, durationPreference: Number(event.target.value) as UserSettings['durationPreference'] })}>
                  <option value="20">20 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </label>
              <label>
                Theme
                <select value={settingsDraft.darkMode} onChange={(event) => setSettingsDraft({ ...settingsDraft, darkMode: event.target.value as UserSettings['darkMode'] })}>
                  <option value="system">system</option>
                  <option value="light">light</option>
                  <option value="dark">dark</option>
                </select>
              </label>
            </div>
          </Card>

          <Card>
            <div className="section-title">
              <div>
                <p className="eyebrow">Defaults</p>
                <h2>Walk, ruck, bench</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Save walk ruck bench defaults" onClick={() => void handleSaveSettings()}>
                <Save aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="form-grid">
              <NumberStepper label="Commute" value={settingsDraft.commuteDefaultMiles ?? 1.2} min={0} max={20} step={0.1} suffix=" mi" quickOptions={[1, 1.2, 1.5, 2, 3]} onChange={(value) => setSettingsDraft({ ...settingsDraft, commuteDefaultMiles: value ?? 1.2 })} />
              <NumberStepper label="Dog walk" value={settingsDraft.dogWalkDefaultMiles ?? 2.5} min={0} max={20} step={0.5} suffix=" mi" quickOptions={[2, 2.5, 3, 4]} onChange={(value) => setSettingsDraft({ ...settingsDraft, dogWalkDefaultMiles: value ?? 2.5 })} />
              <NumberStepper label="Ruck water" value={settingsDraft.ruckDefaultWaterLiters ?? 1} min={0} max={12} step={0.5} suffix=" L" quickOptions={[0.5, 1, 1.5, 2, 3]} onChange={(value) => setSettingsDraft({ ...settingsDraft, ruckDefaultWaterLiters: value ?? 1 })} />
              <NumberStepper label="Empty pack" value={settingsDraft.ruckEmptyPackWeight ?? 2} min={0} max={20} step={0.5} suffix=" lb" quickOptions={[1, 2, 3, 4]} onChange={(value) => setSettingsDraft({ ...settingsDraft, ruckEmptyPackWeight: value ?? 2 })} />
              <NumberStepper label="Extra ruck" value={settingsDraft.ruckDefaultExtraWeight ?? 0} min={0} max={100} step={1} suffix=" lb" quickOptions={[0, 5, 10, 15, 20]} onChange={(value) => setSettingsDraft({ ...settingsDraft, ruckDefaultExtraWeight: value ?? 0 })} />
              <label>
                Bench step-ups
                <span className="inline-check">
                  <input
                    checked={settingsDraft.benchStepUpsSafe ?? false}
                    type="checkbox"
                    onChange={(event) => setSettingsDraft({ ...settingsDraft, benchStepUpsSafe: event.target.checked })}
                  />
                  bench is rated and stable
                </span>
              </label>
            </div>
            <p className="notice">Step-ups to the portable bench stay off unless this safety box is checked. A 12L rucksack is capacity, not a target load.</p>
          </Card>

          <Card>
            <div className="section-title">
              <div>
                <p className="eyebrow">App version</p>
                <h2>{appVersion}</h2>
              </div>
              <RefreshCcw aria-hidden="true" size={20} />
            </div>
            <p className="notice">RampRep uses a versioned, network-first app cache. Clearing it preserves IndexedDB workout logs, net-carb logs, settings, defaults, and roadmap data.</p>
            <button className="ghost-button" type="button" onClick={() => void handleClearLocalAppCache()}>
              Clear local app cache
            </button>
          </Card>

          <Card>
            <div className="section-title">
              <div>
                <p className="eyebrow">Private local settings</p>
                <h2>Net Carb Settings</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Save net carb settings" onClick={() => void handleSaveCarbSettings()}>
                <Save aria-hidden="true" size={18} />
              </button>
            </div>
            <NumberStepper
              label="Daily net-carb goal"
              value={carbSettingsDraft.dailyNetCarbGoalGrams}
              min={0}
              max={400}
              suffix="g"
              quickOptions={[20, 30, 50, 75, 100]}
              quickIncrements={[1, 5, 10]}
              onChange={(value) => setCarbSettingsDraft({ ...carbSettingsDraft, dailyNetCarbGoalGrams: normalizeCarbGrams(value) })}
            />
            <div className="form-grid">
              <label>
                Save food names in net carb log
                <span className="inline-check">
                  <input
                    checked={carbSettingsDraft.saveFoodNamesInLog}
                    type="checkbox"
                    onChange={(event) => setCarbSettingsDraft({ ...carbSettingsDraft, saveFoodNamesInLog: event.target.checked })}
                  />
                  off by default
                </span>
              </label>
              <label>
                Subtract sugar alcohols
                <span className="inline-check">
                  <input
                    checked={carbSettingsDraft.subtractSugarAlcoholsWhenAvailable}
                    type="checkbox"
                    onChange={(event) =>
                      setCarbSettingsDraft({
                        ...carbSettingsDraft,
                        subtractSugarAlcoholsWhenAvailable: event.target.checked,
                      })
                    }
                  />
                  only when explicit
                </span>
              </label>
              <label>
                Preferred lookup source
                <select
                  value={carbSettingsDraft.preferredNutritionSource}
                  onChange={(event) =>
                    setCarbSettingsDraft({
                      ...carbSettingsDraft,
                      preferredNutritionSource: event.target.value as CarbSettings['preferredNutritionSource'],
                    })
                  }
                >
                  <option value="manual">manual</option>
                  <option value="usda">USDA</option>
                </select>
              </label>
              <label>
                USDA FoodData Central key
                <input
                  type="password"
                  value={usdaKeyDraft}
                  onChange={(event) => setUsdaKeyDraft(event.target.value)}
                  placeholder={usdaKeySaved ? 'saved locally; paste to replace' : 'paste key to save locally'}
                  autoComplete="off"
                />
              </label>
              <label>
                USDA test query
                <input value={usdaTestQuery} onChange={(event) => setUsdaTestQuery(event.target.value)} placeholder="plain greek yogurt" />
              </label>
            </div>
            <p className="notice">
              Manual entry works offline. USDA key saved locally: {usdaKeySaved ? 'yes' : 'no'}. The key is not included in JSON export.
              {usdaKeyStatus ? ` ${usdaKeyStatus}` : ''}
            </p>
            <div className="button-grid">
              <button className="ghost-button" type="button" onClick={() => void handleSaveCarbSettings()}>
                <Save aria-hidden="true" size={18} />
                Save
              </button>
              <button className="ghost-button" type="button" onClick={() => void handleSaveUsdaApiKey()}>
                <Save aria-hidden="true" size={18} />
                Save USDA key
              </button>
              <button className="ghost-button" type="button" disabled={usdaKeyBusy || !usdaKeySaved} onClick={() => void handleTestUsdaLookup()}>
                <Search aria-hidden="true" size={18} />
                Test USDA
              </button>
              <button className="ghost-button" type="button" disabled={!usdaKeySaved} onClick={() => void handleClearUsdaApiKey()}>
                <Trash2 aria-hidden="true" size={18} />
                Clear USDA key
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={async () => {
                  await clearFoodLookupCache()
                  await refresh()
                  showFlash('Lookup cache cleared.')
                }}
              >
                <RefreshCcw aria-hidden="true" size={18} />
                Clear cache
              </button>
              <button className="ghost-button" type="button" onClick={() => void handleExportCarbCsv()}>
                <Download aria-hidden="true" size={18} />
                Net Carb CSV
              </button>
              {editMode && (
                <button
                  className="danger-button"
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Delete all net carb entries? Presets and workout data stay intact.')) {
                      await deleteAllCarbEntries()
                      await refresh()
                      showFlash('Net carb entries deleted.')
                    }
                  }}
                >
                  <Trash2 aria-hidden="true" size={18} />
                  Delete net carbs
                </button>
              )}
            </div>
          </Card>

          <Card>
            <div className="section-title">
              <div>
                <p className="eyebrow">Advanced</p>
                <h2>Edit mode</h2>
              </div>
              <label className="switch">
                <input checked={editMode} type="checkbox" onChange={(event) => setEditMode(event.target.checked)} />
                <span />
              </label>
            </div>
            <p className="notice">Shows routine editing, reorder controls, milestone editing, and other infrequent management actions.</p>
          </Card>

          {editMode && <Card>
            <h2>Plan Editor</h2>
            <div className="form-grid">
              <label>
                Weekly frequency
                <select value={scheduleDraft.weeklyFrequency} onChange={(event) => setScheduleDraft({ ...scheduleDraft, weeklyFrequency: Number(event.target.value) as SchedulePreference['weeklyFrequency'] })}>
                  <option value="2">2 sessions</option>
                  <option value="3">3 sessions</option>
                  <option value="4">4 sessions</option>
                  <option value="5">5 sessions</option>
                </select>
              </label>
              <label>
                Travel mode
                <span className="inline-check">
                  <input checked={scheduleDraft.travelMode} type="checkbox" onChange={(event) => setScheduleDraft({ ...scheduleDraft, travelMode: event.target.checked })} />
                  bodyweight only
                </span>
              </label>
              <label>
                Deload
                <span className="inline-check">
                  <input checked={scheduleDraft.deloadEveryFourthWeek} type="checkbox" onChange={(event) => setScheduleDraft({ ...scheduleDraft, deloadEveryFourthWeek: event.target.checked })} />
                  every 4th week
                </span>
              </label>
              <label>
                Busy work week
                <span className="inline-check">
                  <input checked={scheduleDraft.busyWorkWeek} type="checkbox" onChange={(event) => setScheduleDraft({ ...scheduleDraft, busyWorkWeek: event.target.checked })} />
                  make this week lighter
                </span>
              </label>
              <label>
                Hill focus
                <span className="inline-check">
                  <input checked={scheduleDraft.hillFocusWeek} type="checkbox" onChange={(event) => setScheduleDraft({ ...scheduleDraft, hillFocusWeek: event.target.checked })} />
                  Harrisonburg hill focus
                </span>
              </label>
              <label>
                Recovery week
                <span className="inline-check">
                  <input checked={scheduleDraft.recoveryWeek} type="checkbox" onChange={(event) => setScheduleDraft({ ...scheduleDraft, recoveryWeek: event.target.checked })} />
                  reduce intensity
                </span>
              </label>
            </div>
            <button className="ghost-button" type="button" onClick={() => setPage('roadmap')}>
              <MapIcon aria-hidden="true" size={18} />
              Open Tour Roadmap
            </button>
            <div className="day-grid">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <div className="day-card" key={day}>
                  <label className="inline-check">
                    <input
                      checked={scheduleDraft.preferredDays.includes(day)}
                      type="checkbox"
                      onChange={(event) => {
                        const preferredDays = event.target.checked
                          ? [...scheduleDraft.preferredDays, day].sort()
                          : scheduleDraft.preferredDays.filter((item) => item !== day)
                        setScheduleDraft({ ...scheduleDraft, preferredDays })
                      }}
                    />
                    {dayName(day)}
                  </label>
                  <select value={scheduleDraft.dayAssignments[String(day)] ?? ''} onChange={(event) => setScheduleDraft({ ...scheduleDraft, dayAssignments: { ...scheduleDraft.dayAssignments, [String(day)]: event.target.value } })}>
                    <option value="">Rest</option>
                    {routines.map((routine) => (
                      <option key={routine.id} value={routine.id}>
                        {routine.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="temporary-form">
              <h3>Busy Week Change</h3>
              <div className="form-grid">
                <label>
                  Starts
                  <input type="date" value={temporaryChangeDraft.startsOn} onChange={(event) => setTemporaryChangeDraft({ ...temporaryChangeDraft, startsOn: event.target.value })} />
                </label>
                <label>
                  Ends
                  <input type="date" value={temporaryChangeDraft.endsOn} onChange={(event) => setTemporaryChangeDraft({ ...temporaryChangeDraft, endsOn: event.target.value })} />
                </label>
                <label>
                  Routine
                  <select value={temporaryChangeDraft.routineId} onChange={(event) => setTemporaryChangeDraft({ ...temporaryChangeDraft, routineId: event.target.value })}>
                    <option value="">Select</option>
                    {routines.map((routine) => (
                      <option key={routine.id} value={routine.id}>
                        {routine.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Note
                <input value={temporaryChangeDraft.note} onChange={(event) => setTemporaryChangeDraft({ ...temporaryChangeDraft, note: event.target.value })} />
              </label>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  if (!temporaryChangeDraft.startsOn || !temporaryChangeDraft.endsOn) {
                    showFlash('Add dates for the temporary change.')
                    return
                  }

                  setScheduleDraft({
                    ...scheduleDraft,
                    temporaryChanges: [
                      ...scheduleDraft.temporaryChanges,
                      {
                        id: `temp-${Date.now()}`,
                        startsOn: temporaryChangeDraft.startsOn,
                        endsOn: temporaryChangeDraft.endsOn,
                        note: temporaryChangeDraft.note,
                        routineIds: temporaryChangeDraft.routineId ? [temporaryChangeDraft.routineId] : [],
                      },
                    ],
                  })
                  setTemporaryChangeDraft({ startsOn: '', endsOn: '', note: '', routineId: '' })
                }}
              >
                <Plus aria-hidden="true" size={18} />
                Add Change
              </button>
            </div>
            {scheduleDraft.temporaryChanges.map((change) => (
              <div className="past-log" key={change.id}>
                <div>
                  <strong>
                    {change.startsOn} to {change.endsOn}
                  </strong>
                  <p>{change.note || 'Temporary schedule change'}</p>
                </div>
                <button
                  className="icon-button danger"
                  type="button"
                  aria-label="Remove temporary change"
                  onClick={() => setScheduleDraft({ ...scheduleDraft, temporaryChanges: scheduleDraft.temporaryChanges.filter((item) => item.id !== change.id) })}
                >
                  <Trash2 aria-hidden="true" size={18} />
                </button>
              </div>
            ))}
            <button className="primary-button" type="button" onClick={() => void handleSaveSchedule()}>
              <Save aria-hidden="true" size={18} />
              Save Plan
            </button>
          </Card>}

          <Card>
            <h2>Suggested Equipment</h2>
            <div className="equipment-list">
              {data.equipment.map((item) => (
                <label className="equipment-row" key={item.id}>
                  <input
                    checked={item.owned}
                    type="checkbox"
                    onChange={async (event) => {
                      await saveEquipment({ ...item, owned: event.target.checked })
                      await refresh()
                    }}
                  />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.notes ?? (item.recommended ? 'recommended' : 'optional')}</small>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <h2>Backup</h2>
            <div className="button-grid">
              <button className="ghost-button" type="button" onClick={() => void handleExportJson()}>
                <Download aria-hidden="true" size={18} />
                JSON
              </button>
              <button className="ghost-button" type="button" onClick={() => void handleExportCsv()}>
                <Download aria-hidden="true" size={18} />
                Workout CSV
              </button>
              <button className="ghost-button" type="button" onClick={() => void handleExportCarbCsv()}>
                <Download aria-hidden="true" size={18} />
                Net Carb CSV
              </button>
              <label className="file-button">
                <Upload aria-hidden="true" size={18} />
                Import
                <input accept="application/json" type="file" onChange={(event) => void handleImport(event.target.files?.[0])} />
              </label>
              {editMode && (
                <button
                  className="danger-button"
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Reset all app data back to demo defaults?')) {
                      await resetDemoData()
                      await refresh()
                      showFlash('Demo data reset.')
                    }
                  }}
                >
                  <RefreshCcw aria-hidden="true" size={18} />
                  Reset
                </button>
              )}
            </div>
          </Card>

          <Card>
            <h2>Google Sheets Sync</h2>
            <label>
              GOOGLE_APPS_SCRIPT_WEB_APP_URL
              <input value={settingsDraft.googleAppsScriptUrl ?? ''} onChange={(event) => setSettingsDraft({ ...settingsDraft, googleAppsScriptUrl: event.target.value })} />
            </label>
            <p className={syncValidation.ok ? 'notice success' : 'notice'}>{syncValidation.message}</p>
            <button className="ghost-button" type="button" onClick={() => showFlash(syncValidation.message)}>
              Test Sync
            </button>
          </Card>
        </main>
      )}

      <nav className="bottom-nav" aria-label="Primary">
        {primaryNavItems.map((item) => {
          const Icon = navIconByPage[item.page]
          return (
            <button
              className={page === item.page || (item.page === 'more' && ['workouts', 'settings', 'roadmap', 'progress'].includes(page)) ? 'active' : ''}
              key={item.page}
              type="button"
              onClick={() => {
                setPage(item.page)
              }}
            >
              <Icon aria-hidden="true" size={21} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default App
