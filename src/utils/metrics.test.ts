import { describe, expect, it } from 'vitest'
import type { ExerciseLogEntry, WorkoutLog } from '../types'
import { calculateConsistencyStreak } from './schedule'
import { estimatedVolumeByExercise, sessionsPerWeek } from './metrics'

const log = (id: string, completedAt: string): WorkoutLog => ({
  id,
  routineName: 'Test',
  completedAt,
  status: 'completed',
  createdAt: completedAt,
  updatedAt: completedAt,
})

describe('progress utilities', () => {
  it('counts sessions per week', () => {
    expect(
      sessionsPerWeek([
        log('a', '2026-06-01T12:00:00.000Z'),
        log('b', '2026-06-03T12:00:00.000Z'),
        log('c', '2026-06-10T12:00:00.000Z'),
      ]),
    ).toEqual([
      { label: '2026-05-31', value: 2 },
      { label: '2026-06-07', value: 1 },
    ])
  })

  it('calculates estimated exercise volume', () => {
    const entries: ExerciseLogEntry[] = [
      { id: '1', workoutLogId: 'a', exerciseId: 'deadlift', exerciseName: 'deadlift', sets: 3, reps: '8', weight: 35 },
      { id: '2', workoutLogId: 'b', exerciseId: 'deadlift', exerciseName: 'deadlift', sets: 2, reps: '10', weight: 40 },
    ]

    expect(estimatedVolumeByExercise(entries)).toEqual([{ label: 'deadlift', value: 1640 }])
  })

  it('tracks consecutive completed days', () => {
    expect(
      calculateConsistencyStreak(
        [
          log('a', '2026-06-22T12:00:00.000Z'),
          log('b', '2026-06-21T12:00:00.000Z'),
          log('c', '2026-06-19T12:00:00.000Z'),
        ],
        new Date('2026-06-22T18:00:00'),
      ),
    ).toBe(2)
  })
})
