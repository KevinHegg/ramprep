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
    expect(downwardDog?.setup).toContain('Hands slightly forward of shoulders')
    expect(downwardDog?.instructions[0]).toBe('Exhale and lift knees from the floor.')
    expect(downwardDog?.instructions.join(' ').toLowerCase()).not.toContain('set up for downward dog')
  })

  it('keeps quick exercise guidance actionable across categories', () => {
    const ride = seedExercises.find((exercise) => exercise.id === 'easy-endurance-ride')
    const core = seedExercises.find((exercise) => exercise.id === 'front-plank')

    expect(ride?.instructions.join(' ')).toContain('Warm up easily')
    expect(core?.formCues).toContain('Ribs stacked over pelvis')
  })

  it('uses the requested library taxonomy and structured instruction template', () => {
    const groups = new Set(seedExercises.map((exercise) => exercise.group))
    expect(groups).toEqual(
      new Set([
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
      ]),
    )

    for (const exercise of seedExercises) {
      expect(exercise.purpose).toBeTruthy()
      expect(exercise.setup).toBeTruthy()
      expect(exercise.regressions?.length).toBeGreaterThan(0)
      expect(exercise.progressions?.length).toBeGreaterThan(0)
      expect(exercise.dose).toBeTruthy()
      expect(exercise.safety?.length).toBeGreaterThan(0)
    }
  })

  it('covers requested exercises and trailer drill gaps', () => {
    const names = seedExercises.map((exercise) => exercise.name.toLowerCase())
    expect(names).toEqual(expect.arrayContaining([
      'chest-supported dumbbell row',
      'bench-supported one-arm dumbbell row',
      'band face pull',
      'pallof press',
      'suitcase carry',
      'split squat',
      'floor glute bridge',
      'bench hip thrust',
      'reverse lunge',
      'step-up',
      'single-leg romanian deadlift',
      'calf raise',
      'tibialis raise',
      'single-leg balance reach',
      'loaded carry for trailer days',
      'trailer hill starts',
    ]))
  })
})
