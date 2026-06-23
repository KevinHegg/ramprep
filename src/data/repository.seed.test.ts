import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { getAppData, initializeAppData, ensureV11Seeds } from './repository'
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

    expect(downwardDog?.instructions[0]).toBe('Start on hands and knees with hands slightly forward of shoulders.')
    expect(downwardDog?.instructions.join(' ').toLowerCase()).not.toContain('set up for downward dog')
    expect(data.exercises).toHaveLength(seedExercises.length)
  })
})
