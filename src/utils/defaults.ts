import type { Exercise, ExerciseLogEntry, PersonalExerciseDefault, RoutineExercise, WorkoutLog } from '../types'

export const firstNumber = (value?: string | number) => {
  if (value == null) {
    return undefined
  }

  const match = String(value).match(/\d+(\.\d+)?/)
  return match ? Number(match[0]) : undefined
}

export const formatLastSummary = (entry?: ExerciseLogEntry, units = 'lb') => {
  if (!entry) {
    return ''
  }

  const pieces = [
    entry.sets && entry.reps ? `${entry.sets} x ${entry.reps}` : entry.sets ? `${entry.sets} sets` : entry.reps,
    entry.weight ? `@ ${entry.weight} ${units}` : '',
    entry.durationSeconds ? `${entry.durationSeconds}s` : '',
    entry.distance ? entry.distance : '',
    entry.effort ? `effort ${entry.effort}` : '',
  ].filter(Boolean)

  return pieces.length ? `Last: ${pieces.join(', ')}` : ''
}

export const mostRecentCompletedEntry = (
  exerciseId: string,
  entries: ExerciseLogEntry[],
  logs: WorkoutLog[],
) => {
  const completedLogById = new Map(
    logs
      .filter((log) => log.status === 'completed')
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .map((log) => [log.id, log]),
  )

  return entries
    .filter((entry) => entry.exerciseId === exerciseId && completedLogById.has(entry.workoutLogId))
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
  sets: personalDefault?.sets ?? recentEntry?.sets ?? routineExercise?.sets ?? exercise?.defaults.sets,
  reps: personalDefault?.reps ?? recentEntry?.reps ?? routineExercise?.reps ?? exercise?.defaults.reps,
  weight: personalDefault?.weight ?? recentEntry?.weight ?? exercise?.defaults.weight,
  durationSeconds:
    personalDefault?.durationSeconds ??
    recentEntry?.durationSeconds ??
    routineExercise?.durationSeconds ??
    exercise?.defaults.durationSeconds,
  distance: personalDefault?.distance ?? recentEntry?.distance ?? routineExercise?.distance ?? exercise?.defaults.distance,
  effort: personalDefault?.effort ?? recentEntry?.effort ?? exercise?.defaults.effort ?? 6,
  notes: personalDefault?.reuseLastNote ? personalDefault.noteTemplate : undefined,
  lastSummary: formatLastSummary(recentEntry, units),
})
