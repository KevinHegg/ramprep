import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  Download,
  Dumbbell,
  Flame,
  Map as MapIcon,
  Plus,
  RefreshCcw,
  Route,
  Save,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import './App.css'
import {
  addExerciseToRoutine,
  createSkippedWorkout,
  createWorkoutLog,
  createId,
  deleteRoutineExercise,
  deleteWorkoutLog,
  duplicateRoutine,
  exportAllData,
  exportWorkoutLogsCsv,
  getAppData,
  importAllData,
  initializeAppData,
  resetDemoData,
  saveEquipment,
  saveExercise,
  saveRoutine,
  saveRoutineExercise,
  saveRoadmap,
  saveSchedule,
  saveSettings,
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
import { formatShortDate } from './utils/date'
import { firstNumber, mostRecentCompletedEntry, resolveExerciseLogDefaults } from './utils/defaults'
import { validateGoogleAppsScriptUrl } from './services/googleSheetsSync'
import type {
  AppData,
  BikeTourPurpose,
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

type Page = 'dashboard' | 'workouts' | 'log' | 'progress' | 'settings' | 'roadmap'
type WorkoutsTab = 'routines' | 'library'
type LogMode = 'recommended' | 'routine' | 'free'

const navItems: Array<{ page: Page; label: string; icon: typeof Activity }> = [
  { page: 'dashboard', label: 'Dashboard', icon: Activity },
  { page: 'workouts', label: 'Workouts', icon: Dumbbell },
  { page: 'log', label: 'Log', icon: ClipboardList },
  { page: 'progress', label: 'Progress', icon: BarChart3 },
  { page: 'settings', label: 'Settings', icon: Settings },
]

const skipReasons: SkipReason[] = ['work', 'travel', 'fatigue', 'soreness', 'illness', 'no time', 'other']
const equipmentKinds: EquipmentKind[] = ['bodyweight', 'dumbbell', 'kettlebell', 'band', 'yoga mat', 'carry', 'bike', 'trailer', 'chair', 'foam roller', 'suspension trainer', 'pull-up bar']
const exerciseGroups: ExerciseGroup[] = ['Core', 'Back and Posture', 'Hinge and Posterior Chain', 'Legs and Hill Climbing', 'Carries and Loaded Conditioning', 'Mobility and Yoga', 'Bike and Outdoor Conditioning', 'Recovery and Prehab']
const bikePurposes: BikeTourPurpose[] = ['anti-extension', 'anti-rotation', 'lateral stability', 'upper back', 'posterior chain', 'hill climbing', 'loaded-bike durability', 'mobility', 'recovery', 'ride conditioning', 'trailer handling']
const emptyRoutines: Routine[] = []
const emptyExercises: Exercise[] = []
const emptyRoutineExercises: RoutineExercise[] = []
const emptyLogs: WorkoutLog[] = []
const emptyEntries: ExerciseLogEntry[] = []

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
  const personalByExercise = new Map(data.personalExerciseDefaults.map((item) => [item.exerciseId, item]))

  return data.routineExercises
    .filter((entry) => entry.routineId === routine.id)
    .sort((a, b) => a.order - b.order)
    .map((entry) => {
      const exercise = entry.variationOptions?.[0]
        ? exerciseByName.get(entry.variationOptions[0]) ?? exerciseById.get(entry.exerciseId)
        : exerciseById.get(entry.exerciseId)
      const sets = entry.sets ?? exercise?.defaults.sets
      const adjustedSets = deloadApplied && sets && sets > 1 ? Math.max(1, Math.round(sets * 0.7)) : sets
      const recentEntry = mostRecentCompletedEntry(exercise?.id ?? entry.exerciseId, data.exerciseLogEntries, data.workoutLogs)
      const remembered = resolveExerciseLogDefaults({
        exercise,
        routineExercise: { ...entry, sets: adjustedSets },
        personalDefault: personalByExercise.get(exercise?.id ?? entry.exerciseId),
        recentEntry,
        units: data.settings.units,
      })

      return {
        routineExerciseId: entry.id,
        exerciseId: exercise?.id ?? entry.exerciseId,
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

const NumberWheelPicker = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value?: number
  options: number[]
  onChange: (value: number) => void
}) => (
  <details className="wheel-picker">
    <summary>{label} quick picks</summary>
    <div>
      {options.map((option) => (
        <button className={option === value ? 'active' : ''} key={`${label}-${option}`} type="button" onClick={() => onChange(option)}>
          {option}
        </button>
      ))}
    </div>
  </details>
)

const NumberStepper = ({
  label,
  value,
  min = 0,
  max = 999,
  step = 1,
  suffix = '',
  onChange,
  quickOptions,
}: {
  label: string
  value?: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  onChange: (value: number | undefined) => void
  quickOptions?: number[]
}) => {
  const current = value ?? min
  const clamp = (next: number) => Math.max(min, Math.min(max, Number(next.toFixed(2))))

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
        <button type="button" onClick={() => onChange(clamp(current - step))}>
          -
        </button>
        <input
          inputMode="decimal"
          value={value ?? ''}
          onChange={(event) => onChange(numberOrUndefined(event.target.value))}
          placeholder="tap"
        />
        <button type="button" onClick={() => onChange(clamp(current + step))}>
          +
        </button>
      </div>
      {quickOptions?.length ? <NumberWheelPicker label={label} value={value} options={quickOptions} onChange={onChange} /> : null}
    </div>
  )
}

const WeightPicker = ({ units, value, onChange }: { units: string; value?: number; onChange: (value: number | undefined) => void }) => (
  <NumberStepper label="Weight" value={value} min={0} max={500} step={units === 'kg' ? 2.5 : 5} suffix={` ${units}`} quickOptions={units === 'kg' ? [0, 8, 12, 16, 20, 24, 32] : [0, 20, 25, 30, 35, 40, 45, 53]} onChange={onChange} />
)

const DurationPicker = ({ label = 'Seconds', value, onChange }: { label?: string; value?: number; onChange: (value: number | undefined) => void }) => (
  <NumberStepper label={label} value={value} min={0} max={14400} step={label === 'Minutes' ? 5 : 10} suffix={label === 'Minutes' ? ' min' : 's'} quickOptions={label === 'Minutes' ? [10, 20, 30, 45, 60, 90] : [20, 30, 45, 60, 90, 120]} onChange={onChange} />
)

const EffortPicker = ({ value, onChange }: { value?: number; onChange: (value: number | undefined) => void }) => (
  <div className="effort-picker">
    <div className="stepper-head">
      <span>Effort</span>
      <strong>{value ?? 6}/10</strong>
    </div>
    <div className="effort-row">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
        <button className={level === value ? 'active' : ''} key={level} type="button" onClick={() => onChange(level)}>
          {level}
        </button>
      ))}
    </div>
  </div>
)

const ExerciseMotion = ({ exercise }: { exercise: Exercise }) => (
  <div className="motion-card" aria-hidden="true">
    <svg viewBox="0 0 180 110">
      <title>{exercise.name} offline animation</title>
      <rect width="180" height="110" rx="12" />
      <circle className="motion-head" cx="72" cy="34" r="10" />
      <path className="motion-spine" d="M74 46 C84 56 98 62 118 70" />
      <path className="motion-arm" d="M88 55 L52 74" />
      <path className="motion-leg" d="M112 71 L138 88" />
      <path className="motion-leg two" d="M106 70 L78 90" />
      <path className="motion-load" d="M44 78 H66" />
    </svg>
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
  const [groupFilter, setGroupFilter] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [purposeFilter, setPurposeFilter] = useState('')
  const [routineDraft, setRoutineDraft] = useState<Routine | null>(null)
  const [exerciseDraft, setExerciseDraft] = useState<Exercise | null>(null)
  const [draftEntries, setDraftEntries] = useState<WorkoutDraftEntry[]>([])
  const [logMode, setLogMode] = useState<LogMode>('recommended')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [logNotes, setLogNotes] = useState('')
  const [freeExerciseId, setFreeExerciseId] = useState('')
  const [quickExerciseName, setQuickExerciseName] = useState('')
  const [editLog, setEditLog] = useState<{ log: WorkoutLog; entries: ExerciseLogEntry[] } | null>(null)
  const [settingsDraft, setSettingsDraft] = useState<UserSettings | null>(null)
  const [scheduleDraft, setScheduleDraft] = useState<SchedulePreference | null>(null)
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

  const addDraftExercise = (exercise: Exercise) => {
    const recentEntry = data ? mostRecentCompletedEntry(exercise.id, data.exerciseLogEntries, data.workoutLogs) : undefined
    const personalDefault = data?.personalExerciseDefaults.find((item) => item.exerciseId === exercise.id)
    const remembered = resolveExerciseLogDefaults({ exercise, personalDefault, recentEntry, units: data?.settings.units })
    setDraftEntries((current) => [
      ...current,
      {
        exerciseId: exercise.id,
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
      },
    ])
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
      group: 'Recovery and Prehab',
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

  const handleExportJson = async () => {
    downloadText(`ramprep-backup-${new Date().toISOString().slice(0, 10)}.json`, await exportAllData(), 'application/json')
  }

  const handleExportCsv = async () => {
    downloadText(`ramprep-workout-logs-${new Date().toISOString().slice(0, 10)}.csv`, await exportWorkoutLogsCsv(), 'text/csv')
  }

  const handleImport = async (file?: File) => {
    if (!file) {
      return
    }

    await importAllData(await file.text())
    await refresh()
    showFlash('Backup imported.')
  }

  if (loading || !data || !settingsDraft || !scheduleDraft) {
    return (
      <main className="loading-screen">
        <Dumbbell aria-hidden="true" />
        <p>Loading RampRep...</p>
      </main>
    )
  }

  const recentLogs = logs.slice(0, 5)
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
      (!groupFilter || exercise.group === groupFilter) &&
      (!equipmentFilter || exercise.equipment.includes(equipmentFilter as EquipmentKind)) &&
      (!purposeFilter || exercise.bikeTourPurpose?.includes(purposeFilter as BikeTourPurpose))
    )
  })
  const syncValidation = validateGoogleAppsScriptUrl(settingsDraft.googleAppsScriptUrl)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">RampRep</p>
          <h1>
            {page === 'dashboard' && 'Today'}
            {page === 'workouts' && 'Workouts'}
            {page === 'log' && 'Workout Log'}
            {page === 'progress' && 'Progress'}
            {page === 'settings' && 'Settings'}
            {page === 'roadmap' && 'Tour Roadmap'}
          </h1>
        </div>
        <div className="status-pill">
          <Flame aria-hidden="true" size={18} />
          {streak} day streak
        </div>
      </header>

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
                    <div className="toolbar">
                      <button className="icon-button" type="button" aria-label="Move routine up" onClick={() => void moveRoutine(routine, -1)}>
                        <ChevronUp aria-hidden="true" size={18} />
                      </button>
                      <button className="icon-button" type="button" aria-label="Move routine down" onClick={() => void moveRoutine(routine, 1)}>
                        <ChevronDown aria-hidden="true" size={18} />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="Duplicate routine"
                        onClick={async () => {
                          await duplicateRoutine(routine.id)
                          await refresh()
                        }}
                      >
                        <Copy aria-hidden="true" size={18} />
                      </button>
                      <button className="ghost-button" type="button" onClick={() => startRoutine(routine.id)}>
                        Log
                      </button>
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
                    <label>
                      Minutes
                      <input
                        inputMode="numeric"
                        type="number"
                        value={activeRoutineDraft.estimatedMinutes}
                        onChange={(event) => setRoutineDraft({ ...activeRoutineDraft, estimatedMinutes: Number(event.target.value) })}
                      />
                    </label>
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
                            <small>{prescription(entry, exercise)}</small>
                          </div>
                          <div className="mini-grid">
                            <input
                              aria-label="Sets"
                              defaultValue={entry.sets ?? ''}
                              inputMode="numeric"
                              placeholder="sets"
                              onBlur={(event) => void saveRoutineExercise({ ...entry, sets: numberOrUndefined(event.target.value) }).then(refresh)}
                            />
                            <input
                              aria-label="Reps"
                              defaultValue={entry.reps ?? ''}
                              placeholder="reps"
                              onBlur={(event) => void saveRoutineExercise({ ...entry, reps: event.target.value || undefined }).then(refresh)}
                            />
                            <input
                              aria-label="Seconds"
                              defaultValue={entry.durationSeconds ?? ''}
                              inputMode="numeric"
                              placeholder="sec"
                              onBlur={(event) => void saveRoutineExercise({ ...entry, durationSeconds: numberOrUndefined(event.target.value) }).then(refresh)}
                            />
                          </div>
                          <div className="toolbar">
                            <button className="icon-button" type="button" aria-label="Move exercise up" onClick={() => void moveRoutineExercise(entry, -1)}>
                              <ChevronUp aria-hidden="true" size={18} />
                            </button>
                            <button className="icon-button" type="button" aria-label="Move exercise down" onClick={() => void moveRoutineExercise(entry, 1)}>
                              <ChevronDown aria-hidden="true" size={18} />
                            </button>
                            <button
                              className="icon-button danger"
                              type="button"
                              aria-label="Remove exercise"
                              onClick={async () => {
                                await deleteRoutineExercise(entry.id)
                                await refresh()
                              }}
                            >
                              <Trash2 aria-hidden="true" size={18} />
                            </button>
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
                  Search
                  <input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="core, back, dumbbell..." />
                </label>
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
                    <ExerciseMotion exercise={exercise} />
                    <div>
                      <p className="eyebrow">{exercise.group ?? exercise.equipment.join(', ')}</p>
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
                    <button className="ghost-button" type="button" onClick={() => setExerciseDraft({ ...exercise })}>
                      Edit
                    </button>
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
                    <label>
                      Default sets
                      <input
                        value={exerciseDraft.defaults.sets ?? ''}
                        inputMode="numeric"
                        onChange={(event) => setExerciseDraft({ ...exerciseDraft, defaults: { ...exerciseDraft.defaults, sets: numberOrUndefined(event.target.value) } })}
                      />
                    </label>
                    <label>
                      Default reps
                      <input value={exerciseDraft.defaults.reps ?? ''} onChange={(event) => setExerciseDraft({ ...exerciseDraft, defaults: { ...exerciseDraft.defaults, reps: event.target.value } })} />
                    </label>
                    <label>
                      Default seconds
                      <input
                        value={exerciseDraft.defaults.durationSeconds ?? ''}
                        inputMode="numeric"
                        onChange={(event) => setExerciseDraft({ ...exerciseDraft, defaults: { ...exerciseDraft.defaults, durationSeconds: numberOrUndefined(event.target.value) } })}
                      />
                    </label>
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
              return (
                <Card key={entry.routineExerciseId ?? entry.exerciseId}>
                  <div className="section-title">
                    <h2>{entry.exerciseName}</h2>
                    <span className="tag">effort {entry.effort ?? '-'}</span>
                  </div>
                  {entry.lastSummary && <p className="last-summary">{entry.lastSummary}</p>}
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
                          units={data.settings.units}
                          value={Number(entry.customFields?.dogWeight ?? 45)}
                          onChange={(value) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, customFields: { ...item.customFields, dogWeight: value ?? 45 } } : item)))}
                        />
                        <WeightPicker
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
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        setEditLog({
                          log: { ...log },
                          entries: entries.filter((entry) => entry.workoutLogId === log.id).map((entry) => ({ ...entry })),
                        })
                      }
                    >
                      Edit
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
                <label>
                  Minutes
                  <input value={editLog.log.totalMinutes ?? ''} inputMode="numeric" onChange={(event) => setEditLog({ ...editLog, log: { ...editLog.log, totalMinutes: numberOrUndefined(event.target.value) } })} />
                </label>
              </div>
              {editLog.entries.map((entry, index) => (
                <div className="exercise-edit-row" key={entry.id}>
                  <strong>{entry.exerciseName}</strong>
                  <div className="mini-grid">
                    <input aria-label="Sets" value={entry.sets ?? ''} onChange={(event) => setEditLog({ ...editLog, entries: editLog.entries.map((item, itemIndex) => (itemIndex === index ? { ...item, sets: numberOrUndefined(event.target.value) } : item)) })} />
                    <input aria-label="Reps" value={entry.reps ?? ''} onChange={(event) => setEditLog({ ...editLog, entries: editLog.entries.map((item, itemIndex) => (itemIndex === index ? { ...item, reps: event.target.value } : item)) })} />
                    <input aria-label="Weight" value={entry.weight ?? ''} onChange={(event) => setEditLog({ ...editLog, entries: editLog.entries.map((item, itemIndex) => (itemIndex === index ? { ...item, weight: numberOrUndefined(event.target.value) } : item)) })} />
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
              <button className="ghost-button" type="button" onClick={() => void handleExportCsv()}>
                <Download aria-hidden="true" size={18} />
                CSV
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
