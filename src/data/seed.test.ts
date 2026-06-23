import { describe, expect, it } from 'vitest'
import { seedExerciseMedia, seedExercises, seedRoutineExercises, seedRoutines } from './seed'

describe('seed exercise guidance', () => {
  it('keeps generated seed primary keys unique', () => {
    const duplicateIds = <T extends { id: string }>(items: T[]) =>
      items
        .map((item) => item.id)
        .filter((id, index, ids) => ids.indexOf(id) !== index)

    expect(duplicateIds(seedExercises)).toEqual([])
    expect(duplicateIds(seedExerciseMedia)).toEqual([])
    expect(duplicateIds(seedRoutines)).toEqual([])
    expect(duplicateIds(seedRoutineExercises)).toEqual([])
  })

  it('does not generate name-repeating quick exercise instructions', () => {
    const downwardDog = seedExercises.find((exercise) => exercise.id === 'downward-dog')
    expect(downwardDog?.instructions[0]).toBe('Start on hands and knees with hands slightly forward of shoulders.')
    expect(downwardDog?.instructions.join(' ').toLowerCase()).not.toContain('set up for downward dog')
  })

  it('keeps quick exercise guidance actionable across categories', () => {
    const ride = seedExercises.find((exercise) => exercise.id === 'easy-endurance-ride')
    const core = seedExercises.find((exercise) => exercise.id === 'front-plank')

    expect(ride?.instructions.join(' ')).toContain('Warm up easily')
    expect(core?.formCues).toContain('Ribs stacked over pelvis')
  })
})
