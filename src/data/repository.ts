import { db } from './db'
import {
  seedEquipment,
  seedExercises,
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
  UserSettings,
  WorkoutDraftEntry,
  WorkoutLog,
} from '../types'

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
    return
  }

  await db.transaction(
    'rw',
    [db.exercises, db.routines, db.routineExercises, db.settings, db.equipment, db.schedulePreferences],
    async () => {
      await db.exercises.bulkAdd(seedExercises)
      await db.routines.bulkAdd(seedRoutines)
      await db.routineExercises.bulkAdd(seedRoutineExercises)
      await db.settings.add({ ...seedSettings, seededAt: nowIso(), updatedAt: nowIso() })
      await db.equipment.bulkAdd(seedEquipment)
      await db.schedulePreferences.add({ ...seedSchedule, updatedAt: nowIso() })
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
      ])

      await db.exercises.bulkAdd(seedExercises)
      await db.routines.bulkAdd(seedRoutines)
      await db.routineExercises.bulkAdd(seedRoutineExercises)
      await db.settings.add({ ...seedSettings, seededAt: nowIso(), updatedAt: nowIso() })
      await db.equipment.bulkAdd(seedEquipment)
      await db.schedulePreferences.add({ ...seedSchedule, updatedAt: nowIso() })
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
    settings,
    equipment,
    schedule,
  ] = await Promise.all([
    db.exercises.orderBy('name').toArray(),
    db.routines.orderBy('order').toArray(),
    db.routineExercises.orderBy('order').toArray(),
    db.workoutLogs.orderBy('completedAt').reverse().toArray(),
    db.exerciseLogEntries.toArray(),
    db.settings.get('default'),
    db.equipment.toArray(),
    db.schedulePreferences.get('default'),
  ])

  if (!settings || !schedule) {
    await initializeAppData()
    return getAppData()
  }

  return { exercises, routines, routineExercises, workoutLogs, exerciseLogEntries, settings, equipment, schedule }
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

export const saveEquipment = async (equipment: Equipment) => {
  await db.equipment.put(equipment)
}

export const createWorkoutLog = async (
  routine: Routine,
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

  await db.transaction('rw', db.workoutLogs, db.exerciseLogEntries, async () => {
    await db.workoutLogs.add(workoutLog)
    if (logEntries.length) {
      await db.exerciseLogEntries.bulkAdd(logEntries)
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
  await db.transaction('rw', db.workoutLogs, db.exerciseLogEntries, async () => {
    await db.workoutLogs.put({ ...log, updatedAt: nowIso() })
    await db.exerciseLogEntries.where('workoutLogId').equals(log.id).delete()
    if (entries.length) {
      await db.exerciseLogEntries.bulkAdd(entries.map((entry) => ({ ...entry, workoutLogId: log.id })))
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
      ])

      await db.exercises.bulkAdd(data.exercises)
      await db.routines.bulkAdd(data.routines)
      await db.routineExercises.bulkAdd(data.routineExercises ?? [])
      await db.workoutLogs.bulkAdd(data.workoutLogs ?? [])
      await db.exerciseLogEntries.bulkAdd(data.exerciseLogEntries ?? [])
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
