import { describe, expect, it } from 'vitest'
import type { Exercise, ExerciseLogEntry, PersonalExerciseDefault, RoutineExercise, WorkoutLog } from '../types'
import { resolveExerciseLogDefaults } from './defaults'

const exercise: Exercise = {
  id: 'goblet-squat',
  name: 'goblet squat',
  description: '',
  instructions: [],
  formCues: [],
  commonMistakes: [],
  targetAreas: [],
  equipment: ['dumbbell'],
  difficulty: 'beginner',
  defaults: { sets: 2, reps: '8', weight: 25, effort: 5 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const routineExercise: RoutineExercise = {
  id: 'routine-entry',
  routineId: 'routine',
  exerciseId: exercise.id,
  section: 'main',
  order: 1,
  sets: 3,
  reps: '10',
}

const recentEntry: ExerciseLogEntry = {
  id: 'entry',
  workoutLogId: 'log',
  exerciseId: exercise.id,
  exerciseName: exercise.name,
  sets: 4,
  reps: '6',
  weight: 35,
  effort: 7,
}

describe('exercise log defaults', () => {
  it('uses personal defaults before recent, routine, and seed defaults', () => {
    const personalDefault: PersonalExerciseDefault = {
      id: `default-${exercise.id}`,
      exerciseId: exercise.id,
      sets: 5,
      reps: '5',
      weight: 45,
      effort: 8,
      updatedAt: '2026-06-01T00:00:00.000Z',
      source: 'user',
    }

    expect(resolveExerciseLogDefaults({ exercise, routineExercise, personalDefault, recentEntry })).toMatchObject({
      sets: 5,
      reps: '5',
      weight: 45,
      effort: 8,
      lastSummary: 'Last: 4 x 6, @ 35 lb, effort 7',
    })
  })

  it('falls back from recent log to routine prescription to seed defaults', () => {
    expect(resolveExerciseLogDefaults({ exercise, routineExercise, recentEntry })).toMatchObject({
      sets: 4,
      reps: '6',
      weight: 35,
      effort: 7,
    })

    expect(resolveExerciseLogDefaults({ exercise, routineExercise })).toMatchObject({
      sets: 3,
      reps: '10',
      weight: 25,
      effort: 5,
    })
  })

  it('does not reuse notes unless explicitly requested', () => {
    const personalDefault: PersonalExerciseDefault = {
      id: `default-${exercise.id}`,
      exerciseId: exercise.id,
      noteTemplate: 'Keep it smooth.',
      reuseLastNote: false,
      updatedAt: '2026-06-01T00:00:00.000Z',
      source: 'last-log',
    }

    expect(resolveExerciseLogDefaults({ exercise, personalDefault }).notes).toBeUndefined()
    expect(resolveExerciseLogDefaults({ exercise, personalDefault: { ...personalDefault, reuseLastNote: true } }).notes).toBe(
      'Keep it smooth.',
    )
  })
})

describe('free workout data shape', () => {
  it('allows completed workout logs without a routine id', () => {
    const log: WorkoutLog = {
      id: 'free-log',
      routineName: 'Free workout',
      completedAt: '2026-06-22T12:00:00.000Z',
      status: 'completed',
      createdAt: '2026-06-22T12:00:00.000Z',
      updatedAt: '2026-06-22T12:00:00.000Z',
    }

    expect(log.routineId).toBeUndefined()
    expect(log.routineName).toBe('Free workout')
  })
})
