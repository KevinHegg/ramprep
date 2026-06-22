import type { ExerciseLogEntry, WorkoutLog } from '../types'
import { toDateKey } from './date'

const startOfWeek = (date: Date) => {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  copy.setDate(copy.getDate() - copy.getDay())
  return copy
}

const weekKey = (date: Date) => toDateKey(startOfWeek(date))

export interface BarDatum {
  label: string
  value: number
}

export const sessionsPerWeek = (logs: WorkoutLog[]): BarDatum[] => {
  const counts = new Map<string, number>()
  logs
    .filter((log) => log.status === 'completed')
    .forEach((log) => {
      const key = weekKey(new Date(log.completedAt))
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([label, value]) => ({ label, value }))
}

export const totalSetsPerWeek = (logs: WorkoutLog[], entries: ExerciseLogEntry[]): BarDatum[] => {
  const logById = new Map(logs.map((log) => [log.id, log]))
  const counts = new Map<string, number>()

  entries.forEach((entry) => {
    const log = logById.get(entry.workoutLogId)
    if (!log || log.status !== 'completed') {
      return
    }

    const key = weekKey(new Date(log.completedAt))
    counts.set(key, (counts.get(key) ?? 0) + (entry.sets ?? 0))
  })

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([label, value]) => ({ label, value }))
}

export const minutesPerWeek = (logs: WorkoutLog[]): BarDatum[] => {
  const counts = new Map<string, number>()
  logs
    .filter((log) => log.status === 'completed')
    .forEach((log) => {
      const key = weekKey(new Date(log.completedAt))
      counts.set(key, (counts.get(key) ?? 0) + (log.totalMinutes ?? 0))
    })

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([label, value]) => ({ label, value }))
}

export const estimatedVolumeByExercise = (entries: ExerciseLogEntry[]): BarDatum[] => {
  const totals = new Map<string, number>()
  entries.forEach((entry) => {
    const reps = Number.parseFloat(entry.reps?.match(/\d+/)?.[0] ?? '1')
    const sets = entry.sets ?? 1
    const load = entry.weight ?? 0
    const volume = load > 0 ? sets * reps * load : sets * reps
    totals.set(entry.exerciseName, (totals.get(entry.exerciseName) ?? 0) + volume)
  })

  return [...totals.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([label, value]) => ({ label, value: Math.round(value) }))
}

export const topExercisesByFrequency = (entries: ExerciseLogEntry[]): BarDatum[] => {
  const totals = new Map<string, number>()
  entries.forEach((entry) => totals.set(entry.exerciseName, (totals.get(entry.exerciseName) ?? 0) + 1))

  return [...totals.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }))
}

export const consistencyByDate = (logs: WorkoutLog[]): BarDatum[] => {
  const counts = new Map<string, number>()
  logs
    .filter((log) => log.status === 'completed')
    .forEach((log) => {
      const key = toDateKey(log.completedAt)
      counts.set(key, 1)
    })

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([label, value]) => ({ label, value }))
}

export const exerciseHistory = (exerciseName: string, logs: WorkoutLog[], entries: ExerciseLogEntry[]) => {
  const logById = new Map(logs.map((log) => [log.id, log]))

  return entries
    .filter((entry) => entry.exerciseName === exerciseName)
    .map((entry) => {
      const log = logById.get(entry.workoutLogId)
      return {
        date: log?.completedAt ?? '',
        sets: entry.sets ?? 0,
        reps: entry.reps ?? '',
        weight: entry.weight ?? 0,
        effort: entry.effort ?? 0,
      }
    })
    .filter((item) => item.date)
    .sort((a, b) => a.date.localeCompare(b.date))
}
