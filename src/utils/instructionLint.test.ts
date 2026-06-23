import { describe, expect, it } from 'vitest'
import { priorityExerciseIds } from '../data/exerciseDemoCatalog'
import { seedExercises } from '../data/seed'
import { lintExerciseInstructions, lintPriorityExerciseInstructions } from './instructionLint'

describe('instruction linter', () => {
  it('catches tautological instructions', () => {
    const exercise = seedExercises.find((item) => item.id === 'downward-dog')!
    const issues = lintExerciseInstructions({
      ...exercise,
      instructions: ['Position yourself in the downward dog position.', 'Perform the exercise.', 'Repeat as needed.'],
      commonMistakes: ['old mistake', 'another mistake', 'third mistake'],
    })

    expect(issues.map((issue) => issue.message).join(' ')).toContain('Banned generic instruction')
  })

  it('passes priority exercises with source references', () => {
    const issues = lintPriorityExerciseInstructions(seedExercises)

    expect(issues).toEqual([])
    expect(priorityExerciseIds.length).toBeGreaterThan(30)
  })

  it('keeps downward dog specific and useful', () => {
    const exercise = seedExercises.find((item) => item.id === 'downward-dog')!
    const text = [exercise.setup, ...exercise.instructions, ...exercise.commonMistakes].join(' ').toLowerCase()

    expect(text).toContain('hands slightly forward of shoulders')
    expect(text).toContain('base of each index finger')
    expect(text).toContain('heels')
    expect(exercise.commonMistakes.length).toBeGreaterThanOrEqual(3)
    expect(exercise.sourceReferences?.length).toBeGreaterThan(0)
  })

  it('keeps 90/90 hip switch specific and useful', () => {
    const exercise = seedExercises.find((item) => item.id === '90-90-hip-switch')!
    const text = [exercise.setup, ...exercise.instructions, ...exercise.commonMistakes].join(' ').toLowerCase()

    expect(text).toContain('front shin')
    expect(text).toContain('back shin')
    expect(text).toContain('knees')
    expect(text).toContain('low back')
    expect(exercise.commonMistakes.length).toBeGreaterThanOrEqual(3)
    expect(exercise.sourceReferences?.length).toBeGreaterThan(0)
  })
})
