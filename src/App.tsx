import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  ClipboardList,
  Compass,
  Copy,
  Download,
  Dumbbell,
  Flame,
  Map as MapIcon,
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
  deleteRoutineExercise,
  deleteWorkoutLog,
  duplicateRoutine,
  exportAllData,
  exportCarbEntriesCsv,
  exportWorkoutLogsCsv,
  getFoodLookupCache,
  getAppData,
  importAllData,
  initializeAppData,
  markCarbPresetUsed,
  resetDemoData,
  saveCarbPreset,
  saveCarbSettings,
  saveEquipment,
  saveExercise,
  saveFoodLookupCache,
  saveRoutine,
  saveRoutineExercise,
  saveRoadmap,
  saveSchedule,
  saveSettings,
  updateCarbEntry,
  updateWorkoutLog,
} from './data/repository'
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
  calculateWeeklyCompletions,
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
import { searchOpenFoodFacts, openFoodFactsWarning } from './services/foodLookup/openFoodFacts'
import { getUsdaFoodDetails, searchUsdaFoods } from './services/foodLookup/usdaFoodDataCentral'
import type { FoodLookupResult, FoodLookupSource } from './services/foodLookup/types'
import type {
  AppData,
  BikeTourPurpose,
  CarbEntry,
  CarbMealSlot,
  CarbSettings,
  EquipmentKind,
  Exercise,
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

type Page = 'dashboard' | 'workouts' | 'log' | 'carbs' | 'progress' | 'settings' | 'roadmap'
type WorkoutsTab = 'routines' | 'library'
type LogMode = 'recommended' | 'routine' | 'free'

const navItems: Array<{ page: Page; label: string; icon: typeof Activity }> = [
  { page: 'dashboard', label: 'Dashboard', icon: Activity },
  { page: 'workouts', label: 'Workouts', icon: Dumbbell },
  { page: 'log', label: 'Log', icon: ClipboardList },
  { page: 'carbs', label: 'Net Carbs', icon: Flame },
  { page: 'progress', label: 'Progress', icon: BarChart3 },
]

const skipReasons: SkipReason[] = ['work', 'travel', 'fatigue', 'soreness', 'illness', 'no time', 'other']
const equipmentKinds: EquipmentKind[] = ['bodyweight', 'dumbbell', 'kettlebell', 'band', 'yoga mat', 'carry', 'bike', 'trailer', 'chair', 'foam roller', 'suspension trainer', 'pull-up bar']
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
]
const bikePurposes: BikeTourPurpose[] = ['anti-extension', 'anti-rotation', 'lateral stability', 'upper back', 'posterior chain', 'hill climbing', 'loaded-bike durability', 'mobility', 'recovery', 'ride conditioning', 'trailer handling']
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

type ExerciseMotionKind = 'mobility' | 'core' | 'hinge' | 'single-leg' | 'pull' | 'carry' | 'bike'

const getExerciseMotionKind = (exercise: Exercise): ExerciseMotionKind => {
  const category = getExerciseCategory(exercise)
  const text = `${exercise.id} ${exercise.name} ${category}`.toLowerCase()

  if (/bike|ride|spin|trailer|burley|tour|tow/.test(text)) {
    return 'bike'
  }
  if (/carry|walk|hike|conditioning/.test(text)) {
    return 'carry'
  }
  if (/row|pull|face pull|external rotation|upper-back|posture/.test(text)) {
    return 'pull'
  }
  if (/step|split|lunge|calf|wall sit|single-leg/.test(text)) {
    return 'single-leg'
  }
  if (/hinge|deadlift|swing|bridge|glute|hamstring|posterior/.test(text)) {
    return 'hinge'
  }
  if (/dead bug|bird dog|plank|pallof|hollow|curl-up|bear crawl|anti-rotation|anti-extension|core/.test(text)) {
    return 'core'
  }

  return 'mobility'
}

const MotionGuide = ({ kind }: { kind: ExerciseMotionKind }) => {
  if (kind === 'bike') {
    return (
      <g className="motion-bike">
        <circle className="motion-wheel" cx="46" cy="78" r="18" />
        <circle className="motion-wheel two" cx="116" cy="78" r="18" />
        <path className="motion-frame" d="M46 78 L72 50 L92 78 L116 78 L88 50 L72 50" />
        <circle className="motion-head" cx="88" cy="31" r="8" />
        <path className="motion-person" d="M86 40 L76 55 L92 58 L112 66" />
        <path className="motion-person two" d="M77 55 L60 72 M92 58 L82 78" />
        <path className="motion-load" d="M132 80 h24 v-18 h-24 z M116 78 L132 72" />
      </g>
    )
  }

  if (kind === 'carry') {
    return (
      <g className="motion-carry">
        <circle className="motion-head" cx="82" cy="28" r="9" />
        <path className="motion-person" d="M82 39 L82 66 M82 49 L61 56 M83 50 L105 56" />
        <path className="motion-person two" d="M82 66 L68 91 M84 66 L101 91" />
        <path className="motion-load" d="M47 61 h18 v22 h-18 z M103 61 h18 v22 h-18 z" />
        <path className="motion-ground" d="M38 95 H140" />
      </g>
    )
  }

  if (kind === 'pull') {
    return (
      <g className="motion-pull">
        <path className="motion-band" d="M30 48 C72 35 96 35 142 48" />
        <circle className="motion-head" cx="86" cy="27" r="9" />
        <path className="motion-person" d="M86 38 L86 66 M85 48 L60 50 M87 48 L113 50" />
        <path className="motion-person two" d="M86 66 L73 91 M88 66 L101 91" />
        <path className="motion-ground" d="M50 95 H124" />
      </g>
    )
  }

  if (kind === 'single-leg') {
    return (
      <g className="motion-step">
        <path className="motion-box" d="M92 80 h42 v18 H92 z" />
        <circle className="motion-head" cx="79" cy="27" r="9" />
        <path className="motion-person" d="M80 38 L82 63 M81 49 L62 60 M82 49 L101 60" />
        <path className="motion-person two" d="M82 63 L65 91 M83 63 L108 82" />
        <path className="motion-ground" d="M39 98 H146" />
      </g>
    )
  }

  if (kind === 'hinge') {
    return (
      <g className="motion-hinge">
        <circle className="motion-head" cx="74" cy="30" r="9" />
        <path className="motion-person" d="M75 42 C88 48 98 56 111 71" />
        <path className="motion-person two" d="M86 51 L55 72 M108 70 L132 91 M104 70 L79 91" />
        <path className="motion-load" d="M48 72 h18 v18 h-18 z" />
        <path className="motion-ground" d="M37 94 H145" />
      </g>
    )
  }

  if (kind === 'core') {
    return (
      <g className="motion-core">
        <path className="motion-mat" d="M34 86 H146" />
        <circle className="motion-head" cx="72" cy="49" r="9" />
        <path className="motion-person" d="M83 56 L111 66 M85 58 L58 73" />
        <path className="motion-person two" d="M90 61 L126 38 M72 61 L48 38" />
        <path className="motion-ground" d="M42 92 H138" />
      </g>
    )
  }

  return (
    <g className="motion-mobility">
      <path className="motion-mat" d="M34 91 H146" />
      <circle className="motion-head" cx="72" cy="68" r="8" />
      <path className="motion-person" d="M43 86 L74 58 L118 86" />
      <path className="motion-person two" d="M74 58 L87 86 M58 73 L43 86 M102 74 L118 86" />
      <path className="motion-breath" d="M126 35 C139 31 147 38 150 49" />
    </g>
  )
}

const ExerciseMotion = ({ exercise }: { exercise: Exercise }) => {
  const kind = getExerciseMotionKind(exercise)

  return (
    <div className={`motion-card motion-${kind}`} aria-hidden="true">
      <svg viewBox="0 0 180 110">
        <title>{exercise.name} animated how-to guide</title>
        <rect width="180" height="110" rx="12" />
        <MotionGuide kind={kind} />
      </svg>
    </div>
  )
}

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

const ExerciseDemoButton = ({ exercise, onOpen, compact = false }: { exercise: Exercise; onOpen: (id: string) => void; compact?: boolean }) => (
  <button className={compact ? 'demo-button compact' : 'demo-button'} type="button" onClick={() => onOpen(exercise.id)}>
    <CircleHelp aria-hidden="true" size={compact ? 16 : 18} />
    <span>How to</span>
  </button>
)

const CategoryChips = ({
  value,
  onChange,
}: {
  value: FunctionalCategory | ''
  onChange: (value: FunctionalCategory | '') => void
}) => (
  <div className="category-chip-row" aria-label="Training category filters">
    <button className={!value ? 'active' : ''} type="button" onClick={() => onChange('')}>
      All
    </button>
    {functionalCategories.map((category) => (
      <button className={value === category ? 'active' : ''} key={category} type="button" onClick={() => onChange(category)}>
        {category}
      </button>
    ))}
  </div>
)

const ExerciseDemoSheet = ({
  exercise,
  media,
  onClose,
}: {
  exercise: Exercise
  media?: AppData['exerciseMedia'][number]
  onClose: () => void
}) => (
  <div className="sheet-backdrop" role="presentation" onClick={onClose}>
    <section className="demo-sheet" role="dialog" aria-modal="true" aria-labelledby="demo-title" onClick={(event) => event.stopPropagation()}>
      <div className="section-title">
        <div>
          <p className="eyebrow">Exercise demo</p>
          <h2 id="demo-title">{exercise.name}</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Close demo" onClick={onClose}>
          <X aria-hidden="true" size={18} />
        </button>
      </div>
      <ExerciseMotion exercise={exercise} />
      <div className="demo-meta">
        <span className="tag">{getExerciseCategory(exercise)}</span>
        <span className="tag">{exercise.difficulty}</span>
      </div>
      <div className="demo-section">
        <h3>Purpose</h3>
        <p>{exercise.purpose ?? exercise.description}</p>
      </div>
      <div className="demo-section">
        <h3>Setup</h3>
        <p>{exercise.setup ?? exercise.instructions[0]}</p>
      </div>
      <div className="demo-section">
        <h3>Steps</h3>
        <ol>
          {exercise.instructions.map((step, stepIndex) => (
            <li key={`${exercise.id}-step-${stepIndex}`}>{step}</li>
          ))}
        </ol>
      </div>
      <div className="demo-section">
        <h3>Primary muscles / category</h3>
        <p>{exercise.targetAreas.join(', ') || getExerciseCategory(exercise)}</p>
      </div>
      <div className="demo-section">
        <h3>Equipment</h3>
        <p>{exercise.equipment.join(', ') || 'none'}</p>
      </div>
      <div className="demo-section">
        <h3>Coaching cues</h3>
        <ul>
          {exercise.formCues.map((cue, cueIndex) => (
            <li key={`${exercise.id}-cue-${cueIndex}`}>{cue}</li>
          ))}
        </ul>
      </div>
      <div className="demo-section">
        <h3>Common mistakes</h3>
        <ul>
          {exercise.commonMistakes.map((mistake, mistakeIndex) => (
            <li key={`${exercise.id}-mistake-${mistakeIndex}`}>{mistake}</li>
          ))}
        </ul>
      </div>
      <div className="demo-section two-column-section">
        <div>
          <h3>Regressions</h3>
          <ul>
            {(exercise.regressions ?? ['Reduce range, load, or time until each rep is clean.']).map((regression, regressionIndex) => (
              <li key={`${exercise.id}-regression-${regressionIndex}`}>{regression}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Progressions</h3>
          <ul>
            {(exercise.progressions ?? ['Add load, time, or range only after form is repeatable.']).map((progression, progressionIndex) => (
              <li key={`${exercise.id}-progression-${progressionIndex}`}>{progression}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="demo-section">
        <h3>Dose</h3>
        <p>{exercise.dose ?? prescription({ id: 'demo', routineId: 'demo', exerciseId: exercise.id, section: 'main', order: 1 }, exercise)}</p>
      </div>
      <div className="demo-section">
        <h3>Safety</h3>
        <ul>
          {(exercise.safety ?? ['Stop if pain, numbness, dizziness, or sharp joint discomfort appears.']).map((item, itemIndex) => (
            <li key={`${exercise.id}-safety-${itemIndex}`}>{item}</li>
          ))}
        </ul>
      </div>
      <p className="demo-attribution">
        Media: self-authored RampRep SVG/CSS demo first. {media?.attributionText ?? exercise.attribution ?? 'Original RampRep written instructions.'}
        {media?.licenseName ? ` License: ${media.licenseName}.` : ''}
      </p>
    </section>
  </div>
)

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
  const [routineDraft, setRoutineDraft] = useState<Routine | null>(null)
  const [exerciseDraft, setExerciseDraft] = useState<Exercise | null>(null)
  const [demoExerciseId, setDemoExerciseId] = useState('')
  const [draftEntries, setDraftEntries] = useState<WorkoutDraftEntry[]>([])
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
  const [addCarbRepeat, setAddCarbRepeat] = useState(false)
  const [carbEditEntry, setCarbEditEntry] = useState<CarbEntry | null>(null)
  const [presetDraft, setPresetDraft] = useState({ id: '', name: '', netCarbs: 0, servingDescription: '' })
  const [lookupQuery, setLookupQuery] = useState('')
  const [lookupSource, setLookupSource] = useState<FoodLookupSource>('usda')
  const [lookupResults, setLookupResults] = useState<FoodLookupResult[]>([])
  const [lookupSelected, setLookupSelected] = useState<FoodLookupResult | null>(null)
  const [lookupOverride, setLookupOverride] = useState<number | undefined>()
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [temporaryChangeDraft, setTemporaryChangeDraft] = useState({
    startsOn: '',
    endsOn: '',
    note: '',
    routineId: '',
  })
  const [roadmapConflictDraft, setRoadmapConflictDraft] = useState({ startsOn: '', endsOn: '', note: '' })
  const [historyExerciseName, setHistoryExerciseName] = useState('')

  const refresh = useCallback(async () => {
    const snapshot = await getAppData()
    setData(snapshot)
    setSettingsDraft(snapshot.settings)
    setCarbSettingsDraft(snapshot.carbSettings)
    if (snapshot.carbSettings.preferredNutritionSource !== 'manual') {
      setLookupSource(snapshot.carbSettings.preferredNutritionSource)
    }
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

  const deloadApplied = data ? isDeloadWeek(today, data.schedule.deloadEveryFourthWeek) : false
  const weeklyCompletions = data ? calculateWeeklyCompletions(logs, today) : 0
  const streak = data ? calculateConsistencyStreak(logs, today) : 0
  const weeklyTarget = data?.schedule.weeklyFrequency ?? 3
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

  const showFlash = (message: string) => {
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

  const startRoutine = (routineId: string) => {
    prepareRoutine(routineId)
    setLogMode('recommended')
    setPage('log')
  }

  const startFreeWorkout = () => {
    setLogMode('free')
    setDraftEntries([])
    setSelectedRoutineId('')
    setDurationMinutes(settingsDraft?.durationPreference ?? 30)
    setLogNotes('')
    setPage('log')
  }

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
    await refresh()
    showFlash('Workout logged.')
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
      setDraftEntries((current) => [...(logMode === 'free' ? current : []), draftEntry])
      setPage('log')
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
      `ramprep-backup-${new Date().toISOString().slice(0, 10)}${includePrivateSettings ? '-private' : ''}.json`,
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
    if (!addCarbRepeat) {
      setCarbAmount(0)
    }
    showFlash('Net carbs added.')
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
      const cached = await getFoodLookupCache(lookupSource, lookupQuery)
      if (cached) {
        setLookupResults(JSON.parse(cached.resultJson) as FoodLookupResult[])
        return
      }

      const options = {
        apiKey: carbSettingsDraft.foodDataCentralApiKey,
        subtractSugarAlcoholsWhenAvailable: carbSettingsDraft.subtractSugarAlcoholsWhenAvailable,
      }
      const results =
        lookupSource === 'usda' ? await searchUsdaFoods(lookupQuery, options) : await searchOpenFoodFacts(lookupQuery, options)
      setLookupResults(results)
      await saveFoodLookupCache(lookupSource, lookupQuery, JSON.stringify(results))
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
              apiKey: carbSettingsDraft.foodDataCentralApiKey,
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
    showFlash('Lookup net carbs added.')
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

  const recentLogs = logs.slice(0, 5)
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
  const lookupSourceLabel = lookupSource === 'usda' ? 'USDA' : 'Open Food Facts'
  const routineById = new Map(routines.map((routine) => [routine.id, routine]))
  const completedLogs = logs.filter((log) => log.status === 'completed')
  const strengthSessions = completedLogs.filter((log) => routineById.get(log.routineId ?? '')?.type === 'strength').length
  const mobilitySessions = completedLogs.filter((log) => {
    const type = routineById.get(log.routineId ?? '')?.type
    return type === 'mobility' || type === 'recovery'
  }).length
  const rideSessions = completedLogs.filter((log) => routineById.get(log.routineId ?? '')?.type === 'bike' || /ride|bike|trailer/i.test(log.routineName)).length
  const hillTrailerMinutes = entries
    .filter((entry) => /hill|ride|trailer|burley|climb/i.test(entry.exerciseName))
    .reduce((total, entry) => total + Math.round((entry.durationSeconds ?? 0) / 60), 0)
  const filteredExercises = exercises.filter((exercise) => {
    const query = libraryQuery.trim().toLowerCase()
    const searchable = [
      exercise.name,
      exercise.description,
      exercise.targetAreas.join(' '),
      exercise.equipment.join(' '),
      exercise.group ?? '',
      exercise.bikeTourPurpose?.join(' ') ?? '',
    ]
      .join(' ')
      .toLowerCase()

    return (
      (!query || searchable.includes(query)) &&
      (!categoryFilter || getExerciseCategory(exercise) === categoryFilter) &&
      (!groupFilter || exercise.group === groupFilter) &&
      (!equipmentFilter || exercise.equipment.includes(equipmentFilter as EquipmentKind)) &&
      (!purposeFilter || exercise.bikeTourPurpose?.includes(purposeFilter as BikeTourPurpose))
    )
  })
  const syncValidation = validateGoogleAppsScriptUrl(settingsDraft.googleAppsScriptUrl)
  const demoExercise = demoExerciseId ? exerciseById.get(demoExerciseId) : undefined
  const demoMedia = demoExercise ? data.exerciseMedia.find((media) => media.exerciseId === demoExercise.id) : undefined
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <LogoMark />
          <div>
            <p className="eyebrow">RampRep · Ride Across America Preparation</p>
            <h1>
              {page === 'dashboard' && 'Today'}
              {page === 'workouts' && 'Workouts'}
              {page === 'log' && 'Workout Log'}
              {page === 'carbs' && 'Net Carbs'}
              {page === 'progress' && 'Progress'}
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
          <button className="icon-button" type="button" aria-label="Open settings" onClick={() => setPage('settings')}>
            <Settings aria-hidden="true" size={18} />
          </button>
        </div>
      </header>

      {demoExercise && <ExerciseDemoSheet exercise={demoExercise} media={demoMedia} onClose={() => setDemoExerciseId('')} />}

      {flash && (
        <div className="toast" role="status">
          {flash}
        </div>
      )}

      {page === 'dashboard' && (
        <main className="page-grid">
          <Card className="hero-card">
            <div>
              <p className="eyebrow">{scheduledToday ? 'Today suggested' : 'Next up'}</p>
              <h2>{(scheduledToday ?? nextRecommendation?.routine)?.name ?? 'Choose a routine'}</h2>
              <p>{deloadApplied ? 'Deload week is active. Volume is reduced in the logger.' : 'Built for core, back, hips, mobility, and touring durability.'}</p>
            </div>
            {(scheduledToday ?? nextRecommendation?.routine) && (
              <button className="primary-button" type="button" onClick={() => startRoutine((scheduledToday ?? nextRecommendation!.routine).id)}>
                <CheckCircle2 aria-hidden="true" size={18} />
                Start
              </button>
            )}
          </Card>

          <section className="metric-grid">
            <Card>
              <p className="eyebrow">This week</p>
              <strong className="metric-value">
                {weeklyCompletions}/{weeklyTarget}
              </strong>
              <div className="progress-track">
                <span style={{ width: `${Math.min(100, (weeklyCompletions / weeklyTarget) * 100)}%` }} />
              </div>
            </Card>
            <Card>
              <p className="eyebrow">Consistency</p>
              <strong className="metric-value">{streak}</strong>
              <p>completed days in a row</p>
            </Card>
          </section>

          <Card className="carb-summary-card">
            <div className="section-title">
              <div>
                <p className="eyebrow">Net carbs today</p>
                <h2>
                  {carbReports.today.total} / {carbReports.today.goal}g
                </h2>
              </div>
              <span className="tag">{todayCarbStatus}</span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${Math.min(100, (carbReports.today.total / Math.max(1, carbReports.today.goal)) * 100)}%` }} />
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setCarbSelectedDate(toDateKey(new Date()))
                setPage('carbs')
              }}
            >
              <Plus aria-hidden="true" size={18} />
              Add net carbs
            </button>
          </Card>

          <Card>
            <div className="section-title">
              <h2>Next Recommended</h2>
              <CalendarDays aria-hidden="true" size={20} />
            </div>
            {nextRecommendation ? (
              <div className="split-row">
                <div>
                  <strong>{nextRecommendation.routine.name}</strong>
                  <p>{formatShortDate(nextRecommendation.date)} · {nextRecommendation.routine.estimatedMinutes} min</p>
                </div>
                <button className="ghost-button" type="button" onClick={() => startRoutine(nextRecommendation.routine.id)}>
                  Log
                </button>
              </div>
            ) : (
              <EmptyState title="No enabled routines" body="Enable a routine from Workouts to get recommendations." />
            )}
          </Card>

          <Card className="roadmap-card">
            <div className="section-title">
              <h2>Tour Roadmap</h2>
              <MapIcon aria-hidden="true" size={20} />
            </div>
            {nextRoadmapMilestone ? (
              <div className="stack">
                <p className="eyebrow">Next milestone</p>
                <strong>{nextRoadmapMilestone.title}</strong>
                <p>{nextRoadmapMilestone.description}</p>
                <button className="ghost-button" type="button" onClick={() => setPage('roadmap')}>
                  Open Roadmap
                </button>
              </div>
            ) : (
              <EmptyState title="Roadmap complete" body="All seeded milestones are checked off." />
            )}
          </Card>

          <Card>
            <div className="section-title">
              <h2>Recent Sessions</h2>
              <button className="icon-button" type="button" aria-label="Open progress" onClick={() => setPage('progress')}>
                <BarChart3 aria-hidden="true" size={18} />
              </button>
            </div>
            {recentLogs.length ? (
              <div className="stack">
                {recentLogs.map((log) => (
                  <div className="log-row" key={log.id}>
                    <span className={`dot ${log.status}`} />
                    <div>
                      <strong>{log.routineName}</strong>
                      <p>
                        {formatShortDate(log.completedAt)}
                        {log.status === 'skipped' ? ` · skipped: ${log.skipReason}` : ` · ${log.totalMinutes ?? 0} min`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No sessions yet" body="Your first completed workout will appear here." />
            )}
          </Card>
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
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => {
                          setSelectedRoutineId(routine.id)
                          setRoutineDraft({ ...routine })
                        }}
                      >
                        <span>{routine.name}</span>
                        <small>{routine.type} · {routine.estimatedMinutes} min</small>
                      </button>
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
                    </div>
                    <div className="card-actions compact">
                      <button className="primary-button compact-cta" type="button" onClick={() => startRoutine(routine.id)}>
                        Log
                      </button>
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
                    </div>
                    <div className="skip-row">
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
                    </div>
                  </Card>
                ))}
              </section>

              {activeRoutineDraft && selectedRoutine && (
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
                              {exercise && <ExerciseDemoButton exercise={exercise} onOpen={setDemoExerciseId} compact />}
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
                <label>
                  <span>
                    <Search aria-hidden="true" size={15} /> Search
                  </span>
                  <input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="core, back, dumbbell..." />
                </label>
                <CategoryChips value={categoryFilter} onChange={setCategoryFilter} />
                <div className="form-grid filter-grid">
                  <label>
                    Group
                    <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
                      <option value="">All groups</option>
                      {exerciseGroups.map((group) => (
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
                      <option value="">All purposes</option>
                      {bikePurposes.map((purpose) => (
                        <option key={`library-purpose-${purpose}`} value={purpose}>
                          {purpose}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </Card>
              <section className="library-grid">
                {filteredExercises.map((exercise) => (
                  <Card key={exercise.id} className="exercise-card">
                    <button className="exercise-card-main" type="button" onClick={() => setDemoExerciseId(exercise.id)}>
                      <ExerciseMotion exercise={exercise} />
                      <div>
                        <p className="eyebrow">{getExerciseCategory(exercise)}</p>
                        <h2>{exercise.name}</h2>
                        <p>{exercise.description}</p>
                        <div className="tag-row">
                          {[...(exercise.bikeTourPurpose ?? []), ...exercise.targetAreas].slice(0, 4).map((target, tagIndex) => (
                            <span className="tag" key={`${exercise.id}-${target}-${tagIndex}`}>
                              {target}
                            </span>
                          ))}
                        </div>
                        <small>{data.exerciseMedia.find((media) => media.exerciseId === exercise.id)?.attributionText ?? exercise.attribution}</small>
                      </div>
                    </button>
                    <div className="card-actions compact">
                      <button className="primary-button compact-cta" type="button" onClick={() => addDraftExercise(exercise, { startFreeLog: true })}>
                        <Plus aria-hidden="true" size={17} />
                        Add to Log
                      </button>
                      <ActionMenu label={`${exercise.name} actions`}>
                        <button type="button" onClick={() => setDemoExerciseId(exercise.id)}>
                          <CircleHelp aria-hidden="true" size={16} />
                          How to
                        </button>
                        <button type="button" onClick={() => setExerciseDraft({ ...exercise })}>
                          <Pencil aria-hidden="true" size={16} />
                          Edit exercise
                        </button>
                      </ActionMenu>
                    </div>
                  </Card>
                ))}
              </section>

              {exerciseDraft && (
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
            <CategoryChips value={categoryFilter} onChange={setCategoryFilter} />
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
                      {exercise && <ExerciseDemoButton exercise={exercise} onOpen={setDemoExerciseId} compact />}
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
                  <div className="toolbar">
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
                  </div>
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

          {editLog && (
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
                    {exerciseById.get(entry.exerciseId) && <ExerciseDemoButton exercise={exerciseById.get(entry.exerciseId)!} onOpen={setDemoExerciseId} compact />}
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
            <div className="mini-stepper-grid">
              <NumberStepper
                label="Daily goal"
                value={carbSettingsDraft.dailyNetCarbGoalGrams}
                min={0}
                max={400}
                suffix="g"
                quickOptions={[20, 30, 50, 75, 100]}
                quickIncrements={[1, 5, 10]}
                onChange={(value) =>
                  setCarbSettingsDraft({ ...carbSettingsDraft, dailyNetCarbGoalGrams: normalizeCarbGrams(value) })
                }
              />
              <button className="ghost-button" type="button" onClick={() => void handleSaveCarbSettings()}>
                <Save aria-hidden="true" size={18} />
                Save goal
              </button>
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
            <NumberStepper
              label="Net carbs"
              value={carbAmount}
              min={0}
              max={300}
              step={1}
              suffix="g"
              quickOptions={carbQuickPicks}
              quickIncrements={[1, 5, 10]}
              onChange={(value) => setCarbAmount(normalizeCarbGrams(value))}
            />
            <label className="inline-check">
              <input checked={addCarbRepeat} type="checkbox" onChange={(event) => setAddCarbRepeat(event.target.checked)} />
              Add and repeat
            </label>
            <button className="primary-button" type="button" onClick={() => void handleAddManualCarbs()}>
              <Plus aria-hidden="true" size={18} />
              Add {carbAmount}g to {carbMealSlotLabels[carbMealSlot]}
            </button>
          </Card>

          <Card className="meal-breakdown-card">
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
                                <div className="toolbar">
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
                                </div>
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
          </Card>

          <Card className="lookup-card">
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
                  placeholder="food or packaged item"
                />
              </label>
              <label>
                Source
                <select value={lookupSource} onChange={(event) => setLookupSource(event.target.value as FoodLookupSource)}>
                  <option value="usda">USDA</option>
                  <option value="openFoodFacts">Open Food Facts</option>
                </select>
              </label>
            </div>
            {lookupSource === 'openFoodFacts' && <p className="notice">{openFoodFactsWarning}</p>}
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
          </Card>

          <Card className="preset-card">
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
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No presets yet" body="Save a frequent entry as a lightweight shortcut." />
            )}
          </Card>

          <Card className="carb-reports-card">
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
          </Card>
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
              <p className="eyebrow">Hill/trailer minutes</p>
              <strong className="metric-value">{hillTrailerMinutes}</strong>
              <p>logged ride conditioning minutes</p>
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
                        <div className="toolbar">
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
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}

          <Card>
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
          </Card>
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
                FoodData Central API key
                <input
                  type="password"
                  value={carbSettingsDraft.foodDataCentralApiKey ?? ''}
                  onChange={(event) => setCarbSettingsDraft({ ...carbSettingsDraft, foodDataCentralApiKey: event.target.value })}
                  placeholder="stored locally"
                />
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
                  <option value="openFoodFacts">Open Food Facts</option>
                </select>
              </label>
            </div>
            <p className="notice">Manual entry works offline. The USDA key is stored locally and excluded from normal JSON export.</p>
            <div className="button-grid">
              <button className="ghost-button" type="button" onClick={() => void handleSaveCarbSettings()}>
                <Save aria-hidden="true" size={18} />
                Save
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
            </div>
          </Card>

          <Card>
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
          </Card>

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
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  if (window.confirm('Include private local API settings in this JSON export?')) {
                    void handleExportJson(true)
                  }
                }}
              >
                <Download aria-hidden="true" size={18} />
                Private JSON
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
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              className={page === item.page ? 'active' : ''}
              key={item.page}
              type="button"
              onClick={() => {
                if (item.page === 'log' && selectedRoutine) {
                  prepareRoutine(selectedRoutine.id)
                }
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
