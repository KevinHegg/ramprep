import { describe, expect, it } from 'vitest'
import { advanceRoutineRotationState, defaultTrainRotationSequence, normalizeRoutineRole } from './routineRotation'
import { seedRoutineRotationState, seedRoutines } from './seed'

describe('routine rotation model', () => {
  it('contains A, B, C, G, H in order', () => {
    expect(defaultTrainRotationSequence).toEqual([
      'routine-a-back-hinge-core',
      'routine-b-legs-cycling-support',
      'routine-c-conditioning-circuit',
      'routine-g-bench-posture-core',
      'routine-h-hill-armor-load',
    ])
    expect(seedRoutineRotationState.nextRoutineId).toBe('routine-a-back-hinge-core')
  })

  it('classifies recovery and ride routines outside the Train rotation', () => {
    const roleById = new Map(seedRoutines.map((routine) => [routine.id, normalizeRoutineRole(routine)]))

    expect(roleById.get('routine-d-10-minute-mat-mobility')).toBe('supplemental')
    expect(roleById.get('routine-e-recovery-core-back')).toBe('supplemental')
    expect(roleById.get('routine-f-burley-loaded-trailer-ride')).toBe('ride')
  })

  it('advances only after a completed rotation routine', () => {
    const next = advanceRoutineRotationState(seedRoutineRotationState, 'routine-a-back-hinge-core', '2026-06-25T12:00:00.000Z')
    const unchanged = advanceRoutineRotationState(seedRoutineRotationState, 'routine-d-10-minute-mat-mobility', '2026-06-25T12:00:00.000Z')

    expect(next.nextRoutineId).toBe('routine-b-legs-cycling-support')
    expect(next.completedRotationHistory).toEqual([
      {
        routineId: 'routine-a-back-hinge-core',
        completedAtISO: '2026-06-25T12:00:00.000Z',
      },
    ])
    expect(unchanged.nextRoutineId).toBe(seedRoutineRotationState.nextRoutineId)
    expect(unchanged.completedRotationHistory).toHaveLength(0)
  })
})
