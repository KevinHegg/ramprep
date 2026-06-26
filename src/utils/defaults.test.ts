import { describe, expect, it } from 'vitest'
import type { Exercise, ExerciseLogEntry, PersonalExerciseDefault, RoutineExercise, WorkoutLog } from '../types'
import { defaultKeyForExercise, mostRecentCompletedEntry, personalDefaultForExercise, resolveExerciseLogDefaults } from './defaults'

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
  it('selects remembered defaults by exercise and equipment with legacy fallback', () => {
    const defaults: PersonalExerciseDefault[] = [
      {
        id: `default-${exercise.id}`,
        exerciseId: exercise.id,
        weight: 20,
        updatedAt: '2026-05-01T00:00:00.000Z',
        source: 'last-log',
      },
      {
        id: defaultKeyForExercise(exercise.id, 'dumbbell'),
        exerciseId: exercise.id,
        equipmentKey: 'dumbbell',
        weight: 45,
        updatedAt: '2026-06-01T00:00:00.000Z',
        source: 'last-log',
      },
    ]

    expect(personalDefaultForExercise(defaults, exercise.id, 'dumbbell')?.weight).toBe(45)
    expect(personalDefaultForExercise(defaults, exercise.id, 'kettlebell')?.weight).toBe(20)
  })

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
      lastSummary: 'Last completed: 4 × 6 @ 35 lb',
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

  it('keeps completed defaults equipment-specific and ignores skipped entries', () => {
    const logs: WorkoutLog[] = [
      {
        id: 'old',
        routineName: 'Old',
        completedAt: '2026-06-20T12:00:00.000Z',
        status: 'completed',
        createdAt: '2026-06-20T12:00:00.000Z',
        updatedAt: '2026-06-20T12:00:00.000Z',
      },
      {
        id: 'new',
        routineName: 'New',
        completedAt: '2026-06-21T12:00:00.000Z',
        status: 'completed',
        createdAt: '2026-06-21T12:00:00.000Z',
        updatedAt: '2026-06-21T12:00:00.000Z',
      },
    ]
    const entries: ExerciseLogEntry[] = [
      { ...recentEntry, id: 'db', workoutLogId: 'old', equipmentKey: 'dumbbell', weight: 35 },
      { ...recentEntry, id: 'kb', workoutLogId: 'new', equipmentKey: 'kettlebell', weight: 55 },
      { ...recentEntry, id: 'skipped', workoutLogId: 'new', equipmentKey: 'dumbbell', skipped: true, weight: 100 },
    ]

    expect(mostRecentCompletedEntry(exercise.id, entries, logs, 'dumbbell')?.weight).toBe(35)
    expect(mostRecentCompletedEntry(exercise.id, entries, logs, 'kettlebell')?.weight).toBe(55)
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
