import type { Exercise, ExerciseLogEntry, PersonalExerciseDefault, RoutineExercise, WorkoutLog } from '../types'

export const normalizeEquipmentKey = (equipment?: string[]) =>
  equipment?.length ? [...equipment].sort((a, b) => a.localeCompare(b)).join('+') : 'bodyweight'

export const exerciseEquipmentKey = (exercise?: Pick<Exercise, 'equipment'>) => normalizeEquipmentKey(exercise?.equipment)

export const defaultKeyForExercise = (exerciseId: string, equipmentKey?: string) =>
  `default-${exerciseId}-${equipmentKey ?? 'bodyweight'}`

export const userDefaultKeyForExercise = (exerciseId: string, equipmentKey?: string) =>
  `user-default-${exerciseId}-${equipmentKey ?? 'bodyweight'}`

export const personalDefaultForExercise = (
  defaults: PersonalExerciseDefault[],
  exerciseId: string,
  equipmentKey?: string,
) => {
  const matchingEquipment = defaults.filter((item) => item.exerciseId === exerciseId && item.equipmentKey === equipmentKey)

  return (
    matchingEquipment.find((item) => item.source === 'user') ??
    defaults.find((item) => item.id === userDefaultKeyForExercise(exerciseId, equipmentKey)) ??
    matchingEquipment.find((item) => item.source === 'last-log') ??
    defaults.find((item) => item.id === defaultKeyForExercise(exerciseId, equipmentKey)) ??
    defaults.find((item) => item.id === `default-${exerciseId}`)
  )
}

export const firstNumber = (value?: string | number) => {
  if (value == null) {
    return undefined
  }

  const match = String(value).match(/\d+(\.\d+)?/)
  return match ? Number(match[0]) : undefined
}

const formatDuration = (seconds: number) => {
  if (seconds >= 60 && seconds % 60 === 0) {
    return `${seconds / 60} min`
  }

  return `${seconds} sec`
}

export const formatLastSummary = (entry?: ExerciseLogEntry, units = 'lb') => {
  if (!entry) {
    return ''
  }

  const pieces = [
    entry.sets && entry.reps
      ? `${entry.sets} × ${entry.reps}`
      : entry.sets && entry.durationSeconds
      ? `${entry.sets} × ${formatDuration(entry.durationSeconds)}`
      : entry.sets
      ? `${entry.sets} sets`
      : entry.reps,
    entry.weight ? `@ ${entry.weight} ${units}` : '',
    entry.durationSeconds && !(entry.sets && !entry.reps) ? formatDuration(entry.durationSeconds) : '',
    entry.distance ? entry.distance : '',
  ].filter(Boolean)

  return pieces.length ? `Last completed: ${pieces.join(' ')}` : ''
}

export const mostRecentCompletedEntry = (
  exerciseId: string,
  entries: ExerciseLogEntry[],
  logs: WorkoutLog[],
  equipmentKey?: string,
) => {
  const completedLogById = new Map(
    logs
      .filter((log) => log.status === 'completed')
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .map((log) => [log.id, log]),
  )

  return entries
    .filter(
      (entry) =>
        entry.exerciseId === exerciseId &&
        completedLogById.has(entry.workoutLogId) &&
        !entry.skipped &&
        (!equipmentKey || entry.equipmentKey === equipmentKey),
    )
    .sort((a, b) => {
      const logA = completedLogById.get(a.workoutLogId)?.completedAt ?? ''
      const logB = completedLogById.get(b.workoutLogId)?.completedAt ?? ''
      return logB.localeCompare(logA)
    })[0]
}

export const resolveExerciseLogDefaults = ({
  exercise,
  routineExercise,
  personalDefault,
  recentEntry,
  units = 'lb',
}: {
  exercise?: Exercise
  routineExercise?: RoutineExercise
  personalDefault?: PersonalExerciseDefault
  recentEntry?: ExerciseLogEntry
  units?: string
}) => ({
  sets:
    personalDefault?.source === 'user'
      ? personalDefault.sets ?? recentEntry?.sets ?? routineExercise?.sets ?? exercise?.defaults.sets
      : recentEntry?.sets ?? personalDefault?.sets ?? routineExercise?.sets ?? exercise?.defaults.sets,
  reps:
    personalDefault?.source === 'user'
      ? personalDefault.reps ?? recentEntry?.reps ?? routineExercise?.reps ?? exercise?.defaults.reps
      : recentEntry?.reps ?? personalDefault?.reps ?? routineExercise?.reps ?? exercise?.defaults.reps,
  weight:
    personalDefault?.source === 'user'
      ? personalDefault.weight ?? recentEntry?.weight ?? exercise?.defaults.weight
      : recentEntry?.weight ?? personalDefault?.weight ?? exercise?.defaults.weight,
  durationSeconds:
    personalDefault?.source === 'user'
      ? personalDefault.durationSeconds ??
        recentEntry?.durationSeconds ??
        routineExercise?.durationSeconds ??
        exercise?.defaults.durationSeconds
      : recentEntry?.durationSeconds ??
        personalDefault?.durationSeconds ??
        routineExercise?.durationSeconds ??
        exercise?.defaults.durationSeconds,
  distance:
    personalDefault?.source === 'user'
      ? personalDefault.distance ?? recentEntry?.distance ?? routineExercise?.distance ?? exercise?.defaults.distance
      : recentEntry?.distance ?? personalDefault?.distance ?? routineExercise?.distance ?? exercise?.defaults.distance,
  effort:
    personalDefault?.source === 'user'
      ? personalDefault.effort ?? recentEntry?.effort ?? exercise?.defaults.effort ?? 6
      : recentEntry?.effort ?? personalDefault?.effort ?? exercise?.defaults.effort ?? 6,
  notes: personalDefault?.reuseLastNote ? personalDefault.noteTemplate : undefined,
  customFields: personalDefault?.source === 'user'
    ? personalDefault.customFields ?? recentEntry?.customFields
    : recentEntry?.customFields ?? personalDefault?.customFields,
  lastSummary: formatLastSummary(recentEntry, units),
})
