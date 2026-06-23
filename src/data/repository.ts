import { db } from './db'
import {
  seedEquipment,
  seedExerciseMedia,
  seedExercises,
  seedRoadmap,
  seedRoutineExercises,
  seedRoutines,
  seedSchedule,
  seedSettings,
} from './seed'
import type {
  AppData,
  Equipment,
  Exercise,
  ExerciseLogEntry,
  Routine,
  RoutineExercise,
  SchedulePreference,
  SkipReason,
  TourRoadmap,
  UserSettings,
  WorkoutDraftEntry,
  WorkoutLog,
} from '../types'
import { mostRecentCompletedEntry, resolveExerciseLogDefaults } from '../utils/defaults'

const nowIso = () => new Date().toISOString()

export const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const initializeAppData = async () => {
  const settings = await db.settings.get('default')
  if (settings) {
    await ensureV11Seeds()
    return
  }

  await db.transaction(
    'rw',
    [
      db.exercises,
      db.routines,
      db.routineExercises,
      db.settings,
      db.equipment,
      db.schedulePreferences,
      db.exerciseMedia,
      db.tourRoadmaps,
    ],
    async () => {
      await db.exercises.bulkAdd(seedExercises)
      await db.routines.bulkAdd(seedRoutines)
      await db.routineExercises.bulkAdd(seedRoutineExercises)
      await db.settings.add({ ...seedSettings, seededAt: nowIso(), updatedAt: nowIso() })
      await db.equipment.bulkAdd(seedEquipment)
      await db.schedulePreferences.add({ ...seedSchedule, updatedAt: nowIso() })
      await db.exerciseMedia.bulkAdd(seedExerciseMedia)
      await db.tourRoadmaps.add({ ...seedRoadmap, updatedAt: nowIso() })
    },
  )
}

export const ensureV11Seeds = async () => {
  const [
    existingExercises,
    existingRoutines,
    existingRoutineExercises,
    existingMedia,
    existingRoadmap,
    schedule,
  ] = await Promise.all([
    db.exercises.toArray(),
    db.routines.toArray(),
    db.routineExercises.toArray(),
    db.exerciseMedia.toArray(),
    db.tourRoadmaps.get('default'),
    db.schedulePreferences.get('default'),
  ])

  const exerciseIds = new Set(existingExercises.map((item) => item.id))
  const routineIds = new Set(existingRoutines.map((item) => item.id))
  const routineExerciseIds = new Set(existingRoutineExercises.map((item) => item.id))
  const mediaIds = new Set(existingMedia.map((item) => item.id))

  await db.transaction(
    'rw',
    [db.exercises, db.routines, db.routineExercises, db.exerciseMedia, db.tourRoadmaps, db.schedulePreferences],
    async () => {
      const missingExercises = seedExercises.filter((item) => !exerciseIds.has(item.id))
      const missingRoutines = seedRoutines.filter((item) => !routineIds.has(item.id))
      const missingRoutineExercises = seedRoutineExercises.filter((item) => !routineExerciseIds.has(item.id))
      const missingMedia = seedExerciseMedia.filter((item) => !mediaIds.has(item.id))

      if (missingExercises.length) {
        await db.exercises.bulkAdd(missingExercises)
      }
      if (missingRoutines.length) {
        await db.routines.bulkAdd(missingRoutines)
      }
      if (missingRoutineExercises.length) {
        await db.routineExercises.bulkAdd(missingRoutineExercises)
      }
      if (missingMedia.length) {
        await db.exerciseMedia.bulkAdd(missingMedia)
      }
      if (!existingRoadmap) {
        await db.tourRoadmaps.add({ ...seedRoadmap, updatedAt: nowIso() })
      } else {
        const seedPhaseById = new Map(seedRoadmap.phases.map((phase) => [phase.id, phase]))
        await db.tourRoadmaps.put({
          ...existingRoadmap,
          phases: existingRoadmap.phases.map((phase) => seedPhaseById.get(phase.id) ?? phase),
          updatedAt: nowIso(),
        })
      }
      if (schedule) {
        await db.schedulePreferences.put({
          ...schedule,
          busyWorkWeek: schedule.busyWorkWeek ?? false,
          hillFocusWeek: schedule.hillFocusWeek ?? false,
          recoveryWeek: schedule.recoveryWeek ?? false,
          updatedAt: schedule.updatedAt ?? nowIso(),
        })
      }
    },
  )
}

export const resetDemoData = async () => {
  await db.transaction(
    'rw',
    [
      db.exercises,
      db.routines,
      db.routineExercises,
      db.workoutLogs,
      db.exerciseLogEntries,
      db.settings,
      db.equipment,
      db.schedulePreferences,
      db.personalExerciseDefaults,
      db.exerciseMedia,
      db.tourRoadmaps,
    ],
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.routines.clear(),
        db.routineExercises.clear(),
        db.workoutLogs.clear(),
        db.exerciseLogEntries.clear(),
        db.settings.clear(),
        db.equipment.clear(),
        db.schedulePreferences.clear(),
        db.personalExerciseDefaults.clear(),
        db.exerciseMedia.clear(),
        db.tourRoadmaps.clear(),
      ])

      await db.exercises.bulkAdd(seedExercises)
      await db.routines.bulkAdd(seedRoutines)
      await db.routineExercises.bulkAdd(seedRoutineExercises)
      await db.settings.add({ ...seedSettings, seededAt: nowIso(), updatedAt: nowIso() })
      await db.equipment.bulkAdd(seedEquipment)
      await db.schedulePreferences.add({ ...seedSchedule, updatedAt: nowIso() })
      await db.exerciseMedia.bulkAdd(seedExerciseMedia)
      await db.tourRoadmaps.add({ ...seedRoadmap, updatedAt: nowIso() })
    },
  )
}

export const getAppData = async (): Promise<AppData> => {
  const [
    exercises,
    routines,
    routineExercises,
    workoutLogs,
    exerciseLogEntries,
    personalExerciseDefaults,
    exerciseMedia,
    roadmap,
    settings,
    equipment,
    schedule,
  ] = await Promise.all([
    db.exercises.orderBy('name').toArray(),
    db.routines.orderBy('order').toArray(),
    db.routineExercises.orderBy('order').toArray(),
    db.workoutLogs.orderBy('completedAt').reverse().toArray(),
    db.exerciseLogEntries.toArray(),
    db.personalExerciseDefaults.toArray(),
    db.exerciseMedia.toArray(),
    db.tourRoadmaps.get('default'),
    db.settings.get('default'),
    db.equipment.toArray(),
    db.schedulePreferences.get('default'),
  ])

  if (!settings || !schedule || !roadmap) {
    await initializeAppData()
    return getAppData()
  }

  return {
    exercises,
    routines,
    routineExercises,
    workoutLogs,
    exerciseLogEntries,
    personalExerciseDefaults,
    exerciseMedia,
    roadmap,
    settings,
    equipment,
    schedule,
  }
}

export const saveExercise = async (exercise: Exercise) => {
  await db.exercises.put({ ...exercise, updatedAt: nowIso() })
}

export const saveRoutine = async (routine: Routine) => {
  await db.routines.put({ ...routine, updatedAt: nowIso() })
}

export const saveRoutineExercise = async (routineExercise: RoutineExercise) => {
  await db.routineExercises.put(routineExercise)
}

export const deleteRoutineExercise = async (id: string) => {
  await db.routineExercises.delete(id)
}

export const addExerciseToRoutine = async (routineId: string, exerciseId: string, order: number) => {
  await db.routineExercises.add({
    id: createId('routine-exercise'),
    routineId,
    exerciseId,
    section: 'main',
    order,
    sets: 2,
    reps: '8-10',
  })
}

export const duplicateRoutine = async (routineId: string) => {
  const routine = await db.routines.get(routineId)
  if (!routine) {
    return
  }

  const routineExercises = await db.routineExercises.where('routineId').equals(routineId).toArray()
  const allRoutines = await db.routines.toArray()
  const copiedRoutineId = createId('routine')
  const timestamp = nowIso()

  await db.transaction('rw', db.routines, db.routineExercises, async () => {
    await db.routines.add({
      ...routine,
      id: copiedRoutineId,
      name: `${routine.name} copy`,
      order: Math.max(0, ...allRoutines.map((item) => item.order)) + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await db.routineExercises.bulkAdd(
      routineExercises.map((entry) => ({
        ...entry,
        id: createId('routine-exercise'),
        routineId: copiedRoutineId,
      })),
    )
  })
}

export const saveSettings = async (settings: UserSettings) => {
  await db.settings.put({ ...settings, updatedAt: nowIso() })
}

export const saveSchedule = async (schedule: SchedulePreference) => {
  await db.schedulePreferences.put({ ...schedule, updatedAt: nowIso() })
}

export const saveRoadmap = async (roadmap: TourRoadmap) => {
  await db.tourRoadmaps.put({ ...roadmap, updatedAt: nowIso() })
}

export const saveEquipment = async (equipment: Equipment) => {
  await db.equipment.put(equipment)
}

export const updateExerciseDefaultsFromLog = async (entry: ExerciseLogEntry) => {
  await db.personalExerciseDefaults.put({
    id: `default-${entry.exerciseId}`,
    exerciseId: entry.exerciseId,
    sets: entry.sets,
    reps: entry.reps,
    weight: entry.weight,
    durationSeconds: entry.durationSeconds,
    distance: entry.distance,
    effort: entry.effort,
    updatedAt: nowIso(),
    source: 'last-log',
  })
}

export const getExerciseLogDefaults = async (
  exerciseId: string,
  routineExercise?: RoutineExercise,
  exercise?: Exercise,
  units = 'lb',
) => {
  const [personalDefault, logs, entries] = await Promise.all([
    db.personalExerciseDefaults.get(`default-${exerciseId}`),
    db.workoutLogs.orderBy('completedAt').reverse().toArray(),
    db.exerciseLogEntries.where('exerciseId').equals(exerciseId).toArray(),
  ])
  const recentEntry = mostRecentCompletedEntry(exerciseId, entries, logs)
  return resolveExerciseLogDefaults({ exercise, routineExercise, personalDefault, recentEntry, units })
}

export const createWorkoutLog = async (
  routine: Pick<Routine, 'id' | 'name'> | { name: string; id?: string },
  entries: WorkoutDraftEntry[],
  options: { totalMinutes?: number; notes?: string; travelMode?: boolean; deloadApplied?: boolean } = {},
) => {
  const timestamp = nowIso()
  const workoutLogId = createId('log')
  const workoutLog: WorkoutLog = {
    id: workoutLogId,
    routineId: routine.id,
    routineName: routine.name,
    completedAt: timestamp,
    status: 'completed',
    notes: options.notes,
    totalMinutes: options.totalMinutes,
    travelMode: options.travelMode,
    deloadApplied: options.deloadApplied,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const logEntries: ExerciseLogEntry[] = entries.map((entry) => ({
    ...entry,
    id: createId('entry'),
    workoutLogId,
  }))

  await db.transaction('rw', db.workoutLogs, db.exerciseLogEntries, db.personalExerciseDefaults, async () => {
    await db.workoutLogs.add(workoutLog)
    if (logEntries.length) {
      await db.exerciseLogEntries.bulkAdd(logEntries)
      await Promise.all(logEntries.map(updateExerciseDefaultsFromLog))
    }
  })

  return workoutLogId
}

export const createSkippedWorkout = async (routine: Routine, skipReason: SkipReason, notes?: string) => {
  const timestamp = nowIso()
  await db.workoutLogs.add({
    id: createId('log'),
    routineId: routine.id,
    routineName: routine.name,
    completedAt: timestamp,
    status: 'skipped',
    skipReason,
    notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
}

export const updateWorkoutLog = async (log: WorkoutLog, entries: ExerciseLogEntry[]) => {
  await db.transaction('rw', db.workoutLogs, db.exerciseLogEntries, db.personalExerciseDefaults, async () => {
    await db.workoutLogs.put({ ...log, updatedAt: nowIso() })
    await db.exerciseLogEntries.where('workoutLogId').equals(log.id).delete()
    if (entries.length) {
      await db.exerciseLogEntries.bulkAdd(entries.map((entry) => ({ ...entry, workoutLogId: log.id })))
      if (log.status === 'completed') {
        await Promise.all(entries.map(updateExerciseDefaultsFromLog))
      }
    }
  })
}

export const deleteWorkoutLog = async (logId: string) => {
  await db.transaction('rw', db.workoutLogs, db.exerciseLogEntries, async () => {
    await db.workoutLogs.delete(logId)
    await db.exerciseLogEntries.where('workoutLogId').equals(logId).delete()
  })
}

export const exportAllData = async () => {
  const data = await getAppData()
  return JSON.stringify({ schemaVersion: 1, exportedAt: nowIso(), data }, null, 2)
}

export const importAllData = async (rawJson: string) => {
  const parsed = JSON.parse(rawJson) as { data?: AppData } | AppData
  const data = 'data' in parsed && parsed.data ? parsed.data : (parsed as AppData)

  if (!data.exercises || !data.routines || !data.settings || !data.schedule) {
    throw new Error('Import file is missing required RampRep data.')
  }

  await db.transaction(
    'rw',
    [
      db.exercises,
      db.routines,
      db.routineExercises,
      db.workoutLogs,
      db.exerciseLogEntries,
      db.settings,
      db.equipment,
      db.schedulePreferences,
      db.personalExerciseDefaults,
      db.exerciseMedia,
      db.tourRoadmaps,
    ],
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.routines.clear(),
        db.routineExercises.clear(),
        db.workoutLogs.clear(),
        db.exerciseLogEntries.clear(),
        db.settings.clear(),
        db.equipment.clear(),
        db.schedulePreferences.clear(),
        db.personalExerciseDefaults.clear(),
        db.exerciseMedia.clear(),
        db.tourRoadmaps.clear(),
      ])

      await db.exercises.bulkAdd(data.exercises)
      await db.routines.bulkAdd(data.routines)
      await db.routineExercises.bulkAdd(data.routineExercises ?? [])
      await db.workoutLogs.bulkAdd(data.workoutLogs ?? [])
      await db.exerciseLogEntries.bulkAdd(data.exerciseLogEntries ?? [])
      await db.personalExerciseDefaults.bulkAdd(data.personalExerciseDefaults ?? [])
      await db.exerciseMedia.bulkAdd(data.exerciseMedia ?? [])
      await db.tourRoadmaps.add(data.roadmap ?? seedRoadmap)
      await db.settings.add(data.settings)
      await db.equipment.bulkAdd(data.equipment ?? [])
      await db.schedulePreferences.add(data.schedule)
    },
  )
}

const csvCell = (value: unknown) => {
  const text = value == null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export const exportWorkoutLogsCsv = async () => {
  const { workoutLogs, exerciseLogEntries } = await getAppData()
  const rows = [
    ['date', 'routine', 'status', 'skipReason', 'exercise', 'sets', 'reps', 'weight', 'durationSeconds', 'distance', 'effort', 'notes'],
    ...workoutLogs.flatMap((log) => {
      const entries = exerciseLogEntries.filter((entry) => entry.workoutLogId === log.id)
      if (log.status === 'skipped' || entries.length === 0) {
        return [[log.completedAt, log.routineName, log.status, log.skipReason ?? '', '', '', '', '', '', '', '', log.notes ?? '']]
      }

      return entries.map((entry) => [
        log.completedAt,
        log.routineName,
        log.status,
        '',
        entry.exerciseName,
        entry.sets ?? '',
        entry.reps ?? '',
        entry.weight ?? '',
        entry.durationSeconds ?? '',
        entry.distance ?? '',
        entry.effort ?? '',
        entry.notes ?? log.notes ?? '',
      ])
    }),
  ]

  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}
