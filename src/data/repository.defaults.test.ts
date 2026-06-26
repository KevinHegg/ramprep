import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Exercise, ExerciseLogEntry, WorkoutLog } from '../types'
import { defaultKeyForExercise, exerciseEquipmentKey } from '../utils/defaults'
import { db } from './db'
import {
  createWorkoutLog,
  deleteWorkoutLog,
  exportAllData,
  getExerciseLogDefaults,
  importAllData,
  initializeAppData,
  rebuildAllPersonalExerciseDefaults,
  rebuildPersonalDefaultForExercise,
  savePrivateSetting,
  USDA_API_KEY_PRIVATE_SETTING_KEY,
  updateWorkoutLog,
} from './repository'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
  await initializeAppData()
})

const completedLog = (id: string, completedAt: string): WorkoutLog => ({
  id,
  routineName: 'Test workout',
  completedAt,
  status: 'completed',
  createdAt: completedAt,
  updatedAt: completedAt,
})

const logEntry = (
  id: string,
  workoutLogId: string,
  exercise: Exercise,
  values: Partial<ExerciseLogEntry> = {},
): ExerciseLogEntry => ({
  id,
  workoutLogId,
  exerciseId: exercise.id,
  equipmentKey: values.equipmentKey ?? exerciseEquipmentKey(exercise),
  exerciseName: exercise.name,
  ...values,
})

const exerciseById = async (id: string) => {
  const exercise = await db.exercises.get(id)
  if (!exercise) {
    throw new Error(`Missing test exercise ${id}`)
  }
  return exercise
}

describe('remembered exercise defaults repository behavior', () => {
  it('remembers completed workout values with equipment metadata and no notes reuse', async () => {
    const exercise = await exerciseById('kettlebell-deadlift')
    const workoutLogId = await createWorkoutLog({ name: 'Free workout' }, [
      {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: 4,
        reps: '6',
        weight: 45,
        effort: 7,
        notes: 'do not reuse me',
      },
    ])
    const storedEntry = (await db.exerciseLogEntries.where('workoutLogId').equals(workoutLogId).first())!
    const equipmentKey = exerciseEquipmentKey(exercise)
    const defaults = await getExerciseLogDefaults(exercise.id, undefined, exercise, 'lb', equipmentKey)
    const defaultRow = await db.personalExerciseDefaults.get(defaultKeyForExercise(exercise.id, equipmentKey))

    expect(storedEntry.equipmentKey).toBe('kettlebell')
    expect(defaults).toMatchObject({ sets: 4, reps: '6', weight: 45, effort: 7 })
    expect(defaults.notes).toBeUndefined()
    expect(defaults.lastSummary).toBe('Last completed: 4 × 6 @ 45 lb')
    expect(defaultRow).toMatchObject({
      source: 'last-log',
      sourceWorkoutLogId: workoutLogId,
      sourceExerciseLogEntryId: storedEntry.id,
    })
    expect(defaultRow?.sourceCompletedAt).toBeDefined()
  })

  it('round-trips duration and carry defaults from completed free logs', async () => {
    const sidePlank = await exerciseById('side-plank')
    const farmerCarry = await exerciseById('farmer-carry')

    await createWorkoutLog({ name: 'Free workout' }, [
      { exerciseId: sidePlank.id, exerciseName: sidePlank.name, sets: 3, durationSeconds: 40 },
      { exerciseId: farmerCarry.id, exerciseName: farmerCarry.name, sets: 4, durationSeconds: 45, weight: 55 },
    ])

    expect(await getExerciseLogDefaults(sidePlank.id, undefined, sidePlank, 'lb', exerciseEquipmentKey(sidePlank))).toMatchObject({
      sets: 3,
      durationSeconds: 40,
      lastSummary: 'Last completed: 3 × 40 sec',
    })
    expect(await getExerciseLogDefaults(farmerCarry.id, undefined, farmerCarry, 'lb', exerciseEquipmentKey(farmerCarry))).toMatchObject({
      sets: 4,
      durationSeconds: 45,
      weight: 55,
      lastSummary: 'Last completed: 4 × 45 sec @ 55 lb',
    })
  })

  it('keeps equipment variants separate for the same exercise id', async () => {
    const exercise = await exerciseById('goblet-squat')
    await db.workoutLogs.bulkPut([
      completedLog('db-log', '2026-06-20T12:00:00.000Z'),
      completedLog('kb-log', '2026-06-21T12:00:00.000Z'),
    ])
    await db.exerciseLogEntries.bulkPut([
      logEntry('db-entry', 'db-log', exercise, { equipmentKey: 'dumbbell', sets: 3, reps: '8', weight: 35 }),
      logEntry('kb-entry', 'kb-log', exercise, { equipmentKey: 'kettlebell', sets: 4, reps: '6', weight: 53 }),
    ])
    await rebuildAllPersonalExerciseDefaults()

    expect(await getExerciseLogDefaults(exercise.id, undefined, exercise, 'lb', 'dumbbell')).toMatchObject({ sets: 3, reps: '8', weight: 35 })
    expect(await getExerciseLogDefaults(exercise.id, undefined, exercise, 'lb', 'kettlebell')).toMatchObject({ sets: 4, reps: '6', weight: 53 })
  })

  it('does not let skipped draft entries overwrite remembered defaults', async () => {
    const exercise = await exerciseById('kettlebell-deadlift')
    const equipmentKey = exerciseEquipmentKey(exercise)

    await createWorkoutLog({ name: 'Free workout' }, [
      { exerciseId: exercise.id, exerciseName: exercise.name, sets: 3, reps: '8', weight: 45 },
    ])
    await createWorkoutLog({ name: 'Free workout' }, [
      { exerciseId: exercise.id, exerciseName: exercise.name, sets: 5, reps: '5', weight: 100, skipped: true },
    ])

    expect(await getExerciseLogDefaults(exercise.id, undefined, exercise, 'lb', equipmentKey)).toMatchObject({
      sets: 3,
      reps: '8',
      weight: 45,
    })
  })

  it('recalculates defaults after older/newest edits and latest/final deletes', async () => {
    const exercise = await exerciseById('goblet-squat')
    const equipmentKey = exerciseEquipmentKey(exercise)
    const oldLog = completedLog('old-log', '2026-06-10T12:00:00.000Z')
    const newLog = completedLog('new-log', '2026-06-20T12:00:00.000Z')
    await db.workoutLogs.bulkPut([oldLog, newLog])
    await db.exerciseLogEntries.bulkPut([
      logEntry('old-entry', oldLog.id, exercise, { sets: 3, reps: '10', weight: 30 }),
      logEntry('new-entry', newLog.id, exercise, { sets: 3, reps: '8', weight: 35 }),
    ])
    await rebuildPersonalDefaultForExercise(exercise.id, equipmentKey)

    await updateWorkoutLog(oldLog, [logEntry('old-entry-edit', oldLog.id, exercise, { sets: 3, reps: '10', weight: 25 })])
    expect(await getExerciseLogDefaults(exercise.id, undefined, exercise, 'lb', equipmentKey)).toMatchObject({ weight: 35 })

    await updateWorkoutLog(newLog, [logEntry('new-entry-edit', newLog.id, exercise, { sets: 4, reps: '6', weight: 40 })])
    expect(await getExerciseLogDefaults(exercise.id, undefined, exercise, 'lb', equipmentKey)).toMatchObject({ sets: 4, reps: '6', weight: 40 })

    await deleteWorkoutLog(newLog.id)
    expect(await getExerciseLogDefaults(exercise.id, undefined, exercise, 'lb', equipmentKey)).toMatchObject({ weight: 25 })

    await deleteWorkoutLog(oldLog.id)
    const fallback = await getExerciseLogDefaults(exercise.id, undefined, exercise, 'lb', equipmentKey)
    expect(fallback.weight).toBe(exercise.defaults.weight)
  })

  it('normalizes imported legacy entries and excludes USDA private settings from export', async () => {
    const exercise = await exerciseById('side-plank')
    await db.workoutLogs.put(completedLog('legacy-log', '2026-06-22T12:00:00.000Z'))
    await db.exerciseLogEntries.put(logEntry('legacy-entry', 'legacy-log', exercise, { equipmentKey: undefined, sets: 3, durationSeconds: 40 }))
    await savePrivateSetting(USDA_API_KEY_PRIVATE_SETTING_KEY, 'private-key')
    const backup = await exportAllData()

    db.close()
    await db.delete()
    await db.open()
    await importAllData(backup)

    const importedEntry = await db.exerciseLogEntries.get('legacy-entry')
    const defaults = await getExerciseLogDefaults(exercise.id, undefined, exercise, 'lb', exerciseEquipmentKey(exercise))
    const exported = await exportAllData()

    expect(importedEntry?.equipmentKey).toBe(exerciseEquipmentKey(exercise))
    expect(defaults.durationSeconds).toBe(40)
    expect(exported).not.toContain('private-key')
  })
})
