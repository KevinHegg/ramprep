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
  Plus,
  RefreshCcw,
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
import { validateGoogleAppsScriptUrl } from './services/googleSheetsSync'
import type {
  AppData,
  EquipmentKind,
  Exercise,
  ExerciseLogEntry,
  Routine,
  RoutineExercise,
  SchedulePreference,
  SkipReason,
  UserSettings,
  WorkoutDraftEntry,
  WorkoutLog,
} from './types'

type Page = 'dashboard' | 'workouts' | 'log' | 'progress' | 'settings'
type WorkoutsTab = 'routines' | 'library'

const navItems: Array<{ page: Page; label: string; icon: typeof Activity }> = [
  { page: 'dashboard', label: 'Dashboard', icon: Activity },
  { page: 'workouts', label: 'Workouts', icon: Dumbbell },
  { page: 'log', label: 'Log', icon: ClipboardList },
  { page: 'progress', label: 'Progress', icon: BarChart3 },
  { page: 'settings', label: 'Settings', icon: Settings },
]

const skipReasons: SkipReason[] = ['work', 'travel', 'fatigue', 'soreness', 'illness', 'no time', 'other']
const equipmentKinds: EquipmentKind[] = ['bodyweight', 'dumbbell', 'kettlebell', 'band', 'yoga mat', 'carry', 'suspension trainer', 'pull-up bar']
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
  routineExercises: RoutineExercise[],
  exercises: Exercise[],
  deloadApplied: boolean,
): WorkoutDraftEntry[] => {
  const exerciseByName = new Map(exercises.map((exercise) => [exercise.name, exercise]))
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]))

  return routineExercises
    .filter((entry) => entry.routineId === routine.id)
    .sort((a, b) => a.order - b.order)
    .map((entry) => {
      const exercise = entry.variationOptions?.[0]
        ? exerciseByName.get(entry.variationOptions[0]) ?? exerciseById.get(entry.exerciseId)
        : exerciseById.get(entry.exerciseId)
      const sets = entry.sets ?? exercise?.defaults.sets
      const adjustedSets = deloadApplied && sets && sets > 1 ? Math.max(1, Math.round(sets * 0.7)) : sets

      return {
        routineExerciseId: entry.id,
        exerciseId: exercise?.id ?? entry.exerciseId,
        exerciseName: exercise?.name ?? 'exercise',
        sets: adjustedSets,
        reps: entry.reps ?? exercise?.defaults.reps,
        durationSeconds: entry.durationSeconds ?? exercise?.defaults.durationSeconds,
        distance: entry.distance ?? exercise?.defaults.distance,
        effort: 6,
        notes: entry.notes,
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

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState('')
  const [selectedRoutineId, setSelectedRoutineId] = useState('')
  const [workoutsTab, setWorkoutsTab] = useState<WorkoutsTab>('routines')
  const [libraryQuery, setLibraryQuery] = useState('')
  const [routineDraft, setRoutineDraft] = useState<Routine | null>(null)
  const [exerciseDraft, setExerciseDraft] = useState<Exercise | null>(null)
  const [draftEntries, setDraftEntries] = useState<WorkoutDraftEntry[]>([])
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [logNotes, setLogNotes] = useState('')
  const [editLog, setEditLog] = useState<{ log: WorkoutLog; entries: ExerciseLogEntry[] } | null>(null)
  const [settingsDraft, setSettingsDraft] = useState<UserSettings | null>(null)
  const [scheduleDraft, setScheduleDraft] = useState<SchedulePreference | null>(null)
  const [temporaryChangeDraft, setTemporaryChangeDraft] = useState({
    startsOn: '',
    endsOn: '',
    note: '',
    routineId: '',
  })
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
    selectedRoutine && data
      ? draftEntries.length
        ? draftEntries
        : buildDraftEntries(selectedRoutine, data.routineExercises, data.exercises, deloadApplied)
      : []

  const showFlash = (message: string) => {
    setFlash(message)
    window.setTimeout(() => setFlash(''), 3200)
  }

  const prepareRoutine = (routineId: string) => {
    setSelectedRoutineId(routineId)
    const routine = routines.find((item) => item.id === routineId)
    if (routine && data) {
      setDraftEntries(buildDraftEntries(routine, data.routineExercises, data.exercises, deloadApplied))
      setDurationMinutes(routine.estimatedMinutes)
      setLogNotes('')
    }
  }

  const startRoutine = (routineId: string) => {
    prepareRoutine(routineId)
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
    if (!selectedRoutine) {
      return
    }

    await createWorkoutLog(selectedRoutine, visibleDraftEntries, {
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
  const filteredExercises = exercises.filter((exercise) => {
    const query = libraryQuery.trim().toLowerCase()
    if (!query) {
      return true
    }

    return [exercise.name, exercise.description, exercise.targetAreas.join(' '), exercise.equipment.join(' ')].join(' ').toLowerCase().includes(query)
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
                          <option key={reason} value={reason}>
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
              </Card>
              <section className="library-grid">
                {filteredExercises.map((exercise) => (
                  <Card key={exercise.id} className="exercise-card">
                    <img src={exercise.imageUrl} alt="" />
                    <div>
                      <p className="eyebrow">{exercise.equipment.join(', ')}</p>
                      <h2>{exercise.name}</h2>
                      <p>{exercise.description}</p>
                      <div className="tag-row">
                        {exercise.targetAreas.slice(0, 3).map((target) => (
                          <span className="tag" key={target}>
                            {target}
                          </span>
                        ))}
                      </div>
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
                  <div className="checkbox-grid">
                    {equipmentKinds.map((kind) => (
                      <label key={kind}>
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
          <Card>
            <div className="form-grid">
              <label>
                Routine
                <select value={selectedRoutine?.id ?? ''} onChange={(event) => prepareRoutine(event.target.value)}>
                  {enabledRoutines.map((routine) => (
                    <option key={routine.id} value={routine.id}>
                      {routine.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Minutes
                <input inputMode="numeric" type="number" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} />
              </label>
            </div>
            {data.schedule.travelMode && <p className="notice">Travel mode is active.</p>}
            {deloadApplied && <p className="notice">Deload week: planned sets are reduced.</p>}
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
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <div className="log-grid">
                    <label>
                      Sets
                      <input
                        value={entry.sets ?? ''}
                        inputMode="numeric"
                        onChange={(event) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, sets: numberOrUndefined(event.target.value) } : item)))}
                      />
                    </label>
                    <label>
                      Reps
                      <input
                        value={entry.reps ?? ''}
                        onChange={(event) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, reps: event.target.value } : item)))}
                      />
                    </label>
                    <label>
                      Weight
                      <input
                        value={entry.weight ?? ''}
                        inputMode="decimal"
                        onChange={(event) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, weight: numberOrUndefined(event.target.value) } : item)))}
                      />
                    </label>
                    <label>
                      Seconds
                      <input
                        value={entry.durationSeconds ?? ''}
                        inputMode="numeric"
                        onChange={(event) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, durationSeconds: numberOrUndefined(event.target.value) } : item)))}
                      />
                    </label>
                    <label>
                      Distance
                      <input
                        value={entry.distance ?? ''}
                        onChange={(event) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, distance: event.target.value } : item)))}
                      />
                    </label>
                    <label>
                      Effort
                      <input
                        max="10"
                        min="1"
                        type="range"
                        value={entry.effort ?? 6}
                        onChange={(event) => setDraftEntries((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, effort: Number(event.target.value) } : item)))}
                      />
                    </label>
                  </div>
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
            </div>
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
