import { describe, expect, it } from 'vitest'
import type { Exercise } from '../types'
import { getExerciseCategory } from './exerciseCategories'

const exercise = (overrides: Partial<Exercise>): Exercise =>
  ({
    id: 'test',
    name: 'test',
    description: '',
    instructions: [],
    formCues: [],
    commonMistakes: [],
    targetAreas: [],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    defaults: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as Exercise

describe('getExerciseCategory', () => {
  it('prioritizes Burley and trailer work as its own category', () => {
    expect(getExerciseCategory(exercise({ name: 'controlled trailer towing workout', equipment: ['bike', 'trailer'] }))).toBe(
      'Burley / loaded trailer',
    )
  })

  it('groups anti-rotation core when no more specific category applies', () => {
    expect(getExerciseCategory(exercise({ name: 'Pallof press', targetAreas: ['core'], bikeTourPurpose: ['anti-rotation'] }))).toBe(
      'core / anti-rotation',
    )
  })

  it('groups single-leg work separately from general posterior-chain work', () => {
    expect(getExerciseCategory(exercise({ name: 'single-leg Romanian deadlift', targetAreas: ['hamstrings', 'glutes'] }))).toBe(
      'single-leg leg strength',
    )
  })
})
