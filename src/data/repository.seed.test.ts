import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { getAppData, initializeAppData, ensureV11Seeds, USDA_API_KEY_PRIVATE_SETTING_KEY } from './repository'
import { seedExercises } from './seed'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

describe('seed repository migration', () => {
  it('backfills old generic exercise instructions and can rerun safely', async () => {
    await initializeAppData()

    const seededDownwardDog = seedExercises.find((exercise) => exercise.id === 'downward-dog')
    expect(seededDownwardDog).toBeDefined()

    await db.exercises.put({
      ...seededDownwardDog!,
      description: 'Old placeholder description.',
      instructions: ['Set up for downward dog and perform the movement with control.'],
      formCues: ['old cue'],
      commonMistakes: ['old mistake'],
      updatedAt: '2026-01-02T12:00:00.000Z',
    })

    await ensureV11Seeds()
    await ensureV11Seeds()

    const downwardDog = await db.exercises.get('downward-dog')
    const data = await getAppData()

    expect(downwardDog?.setup).toContain('Hands slightly forward of shoulders')
    expect(downwardDog?.instructions[0]).toBe('Exhale and lift knees from the floor.')
    expect(downwardDog?.instructions.join(' ').toLowerCase()).not.toContain('set up for downward dog')
    expect(data.exercises).toHaveLength(seedExercises.length)
  })

  it('preserves workout logs, carb logs, and personal defaults during seed backfill', async () => {
    await initializeAppData()

    await db.workoutLogs.put({
      id: 'log-preserve',
      routineName: 'Preserve me',
      completedAt: '2026-06-23T12:00:00.000Z',
      status: 'completed',
      totalMinutes: 20,
      createdAt: '2026-06-23T12:00:00.000Z',
      updatedAt: '2026-06-23T12:00:00.000Z',
    })
    await db.exerciseLogEntries.put({
      id: 'entry-preserve',
      workoutLogId: 'log-preserve',
      exerciseId: 'downward-dog',
      exerciseName: 'downward dog',
      durationSeconds: 60,
    })
    await db.carbEntries.put({
      id: 'carb-preserve',
      dateISO: '2026-06-23',
      mealSlot: 'breakfast',
      netCarbs: 12,
      sourceType: 'manual',
      goalGramsAtEntry: 50,
      createdAt: '2026-06-23T12:05:00.000Z',
      updatedAt: '2026-06-23T12:05:00.000Z',
    })
    await db.personalExerciseDefaults.put({
      id: 'default-downward-dog-bodyweight',
      exerciseId: 'downward-dog',
      equipmentKey: 'bodyweight',
      durationSeconds: 60,
      updatedAt: '2026-06-23T12:10:00.000Z',
      source: 'last-log',
    })
    await db.privateSettings.put({
      key: USDA_API_KEY_PRIVATE_SETTING_KEY,
      encryptedOrPlainValue: 'redacted-test-value',
      createdAt: '2026-06-23T12:15:00.000Z',
      updatedAt: '2026-06-23T12:15:00.000Z',
    })

    await ensureV11Seeds()
    const data = await getAppData()
    const privateSetting = await db.privateSettings.get(USDA_API_KEY_PRIVATE_SETTING_KEY)

    expect(data.workoutLogs.find((log) => log.id === 'log-preserve')).toBeDefined()
    expect(data.exerciseLogEntries.find((entry) => entry.id === 'entry-preserve')).toBeDefined()
    expect(data.carbEntries.find((entry) => entry.id === 'carb-preserve')?.netCarbs).toBe(12)
    expect(data.personalExerciseDefaults.find((item) => item.id === 'default-downward-dog-bodyweight')?.durationSeconds).toBe(60)
    expect(privateSetting?.encryptedOrPlainValue).toBe('redacted-test-value')
  })

  it('updates retired bundled routine rows without rewriting historical exercise logs', async () => {
    await initializeAppData()

    await db.exercises.put({
      ...(await db.exercises.get('bench-hip-thrust'))!,
      name: 'bench hip thrust/glute bridge',
      instructions: ['Brace, soften the knees, and send hips back as if closing a car door.'],
      formCues: ['finish tall'],
      commonMistakes: ['old mistake', 'old mistake 2', 'old mistake 3'],
    })
    await db.routineExercises.put({
      id: 'routine-b-legs-cycling-support-7-glute-bridge-march',
      routineId: 'routine-b-legs-cycling-support',
      exerciseId: 'glute-bridge-march',
      section: 'main',
      order: 7,
      sets: 2,
      reps: '10 each side',
      variationOptions: ['glute bridge march', 'bench hip thrust/glute bridge'],
    })
    await db.workoutLogs.put({
      id: 'log-old-combo',
      routineName: 'Old combo log',
      completedAt: '2026-06-23T12:00:00.000Z',
      status: 'completed',
      createdAt: '2026-06-23T12:00:00.000Z',
      updatedAt: '2026-06-23T12:00:00.000Z',
    })
    await db.exerciseLogEntries.put({
      id: 'entry-old-combo',
      workoutLogId: 'log-old-combo',
      exerciseId: 'bench-hip-thrust',
      exerciseName: 'bench hip thrust/glute bridge',
      sets: 2,
      reps: '10',
    })

    await ensureV11Seeds()

    const benchHipThrust = await db.exercises.get('bench-hip-thrust')
    const historicalEntry = await db.exerciseLogEntries.get('entry-old-combo')
    const oldRoutineEntry = await db.routineExercises.get('routine-b-legs-cycling-support-7-glute-bridge-march')
    const newRoutineEntry = await db.routineExercises.get('routine-b-legs-cycling-support-7-bench-hip-thrust')

    expect(benchHipThrust?.name).toBe('bench hip thrust')
    expect(benchHipThrust?.instructions.join(' ').toLowerCase()).not.toContain('car door')
    expect(historicalEntry?.exerciseName).toBe('bench hip thrust/glute bridge')
    expect(oldRoutineEntry).toBeUndefined()
    expect(newRoutineEntry?.exerciseId).toBe('bench-hip-thrust')
  })
})
