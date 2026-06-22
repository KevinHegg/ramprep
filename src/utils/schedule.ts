import type { Routine, SchedulePreference, WorkoutLog } from '../types'
import { startOfLocalDay, toDateKey } from './date'

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const dayName = (day: number) => dayNames[day] ?? 'Day'

export const getScheduledRoutineForDate = (date: Date, schedule: SchedulePreference, routines: Routine[]) => {
  const day = String(date.getDay())
  const routineId = schedule.dayAssignments[day]
  return routines.find((routine) => routine.id === routineId && routine.enabled) ?? null
}

export const getNextRecommendedRoutine = (date: Date, schedule: SchedulePreference, routines: Routine[]) => {
  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(date)
    candidate.setDate(date.getDate() + offset)
    const routine = getScheduledRoutineForDate(candidate, schedule, routines)
    if (routine) {
      return { date: candidate, routine }
    }
  }

  const fallback = routines.find((routine) => routine.enabled) ?? null
  return fallback ? { date, routine: fallback } : null
}

export const isDeloadWeek = (date: Date, enabled: boolean) => {
  if (!enabled) {
    return false
  }

  const firstDay = new Date(date.getFullYear(), 0, 1)
  const week = Math.ceil(((startOfLocalDay(date).getTime() - firstDay.getTime()) / 86400000 + firstDay.getDay() + 1) / 7)
  return week % 4 === 0
}

export const getCompletedDateKeys = (logs: WorkoutLog[]) =>
  new Set(logs.filter((log) => log.status === 'completed').map((log) => toDateKey(log.completedAt)))

export const calculateConsistencyStreak = (logs: WorkoutLog[], today = new Date()) => {
  const completedDays = getCompletedDateKeys(logs)
  let streak = 0
  const cursor = startOfLocalDay(today)

  while (completedDays.has(toDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export const calculateWeeklyCompletions = (logs: WorkoutLog[], today = new Date()) => {
  const start = startOfLocalDay(today)
  start.setDate(today.getDate() - today.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 7)

  return logs.filter((log) => {
    const completedAt = new Date(log.completedAt)
    return log.status === 'completed' && completedAt >= start && completedAt < end
  }).length
}
