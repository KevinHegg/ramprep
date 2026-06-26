import type { Routine, RoutineRotationState } from '../types'
import { seedRoutineRotationState, trainRotationRoutineIds } from './seed'

export const defaultTrainRotationSequence: string[] = [...trainRotationRoutineIds]

export const normalizeRoutineRole = (routine: Pick<Routine, 'id' | 'role' | 'type'>): Routine['role'] => {
  if (routine.role) {
    return routine.role
  }
  if (routine.id === 'routine-f-burley-loaded-trailer-ride' || routine.type === 'bike') {
    return 'ride'
  }
  if (routine.id === 'routine-d-10-minute-mat-mobility' || routine.id === 'routine-e-recovery-core-back') {
    return 'supplemental'
  }
  return defaultTrainRotationSequence.includes(routine.id) ? 'rotation' : 'supplemental'
}

export const normalizeRoutineRotationState = (
  state: RoutineRotationState | undefined,
  nowISO: string,
): RoutineRotationState => {
  if (!state) {
    return { ...seedRoutineRotationState, updatedAtISO: nowISO }
  }

  const sequence = state.sequence.length ? state.sequence : defaultTrainRotationSequence
  const nextRoutineId = sequence.includes(state.nextRoutineId) ? state.nextRoutineId : sequence[0]

  return {
    id: 'default',
    sequence,
    nextRoutineId,
    lastCompletedRotationRoutineId: state.lastCompletedRotationRoutineId,
    completedRotationHistory: state.completedRotationHistory ?? [],
    updatedAtISO: state.updatedAtISO ?? nowISO,
  }
}

export const getNextRotationRoutine = (state: RoutineRotationState, routines: Routine[]) => {
  const routineById = new Map(routines.map((routine) => [routine.id, routine]))
  const direct = routineById.get(state.nextRoutineId)
  if (direct?.enabled && normalizeRoutineRole(direct) === 'rotation') {
    return direct
  }

  return state.sequence
    .map((routineId) => routineById.get(routineId))
    .find((routine): routine is Routine => Boolean(routine?.enabled && normalizeRoutineRole(routine) === 'rotation')) ?? null
}

export const advanceRoutineRotationState = (
  state: RoutineRotationState,
  completedRoutineId: string,
  completedAtISO: string,
): RoutineRotationState => {
  const index = state.sequence.indexOf(completedRoutineId)
  if (index < 0) {
    return state
  }

  const nextRoutineId = state.sequence[(index + 1) % state.sequence.length]

  return {
    ...state,
    nextRoutineId,
    lastCompletedRotationRoutineId: completedRoutineId,
    completedRotationHistory: [
      ...state.completedRotationHistory,
      {
        routineId: completedRoutineId,
        completedAtISO,
      },
    ].slice(-100),
    updatedAtISO: completedAtISO,
  }
}
