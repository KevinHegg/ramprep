import type {
  CarbEntry,
  CarbGoalHistory,
  CarbMealSlot,
  CarbPreset,
  CarbSettings,
  CarbSourceType,
} from '../types'
import { daysAgo, toDateKey } from './date'

export const carbMealSlots: CarbMealSlot[] = [
  'breakfast',
  'morningSnack',
  'lunch',
  'afternoonSnack',
  'dinner',
  'eveningSnack',
]

export const carbMealSlotLabels: Record<CarbMealSlot, string> = {
  breakfast: 'Breakfast',
  morningSnack: 'AM Snack',
  lunch: 'Lunch',
  afternoonSnack: 'PM Snack',
  dinner: 'Dinner',
  eveningSnack: 'Evening',
}

export const carbQuickPicks = [0, 1, 2, 5, 10, 15, 20, 25]

export const sourceLabels: Record<CarbSourceType, string> = {
  manual: 'manual',
  preset: 'preset',
  usda: 'USDA lookup',
  openFoodFacts: 'packaged lookup',
}

export const defaultCarbSettings = (updatedAt: string): CarbSettings => ({
  id: 'default',
  dailyNetCarbGoalGrams: 50,
  saveFoodNamesInLog: false,
  subtractSugarAlcoholsWhenAvailable: false,
  preferredNutritionSource: 'manual',
  updatedAt,
})

export const normalizeCarbGrams = (value?: number) => Math.max(0, Math.round(Number.isFinite(value ?? NaN) ? value! : 0))

export const goalForDate = (dateISO: string, history: CarbGoalHistory[], settings: CarbSettings) => {
  const dateKey = dateISO.slice(0, 10)
  const historicalGoal = [...history]
    .filter((entry) => entry.effectiveDateISO <= dateKey)
    .sort((a, b) => b.effectiveDateISO.localeCompare(a.effectiveDateISO))[0]

  return historicalGoal?.goalGrams ?? settings.dailyNetCarbGoalGrams
}

export const totalCarbsForDate = (entries: CarbEntry[], dateISO: string) =>
  entries.filter((entry) => entry.dateISO === dateISO).reduce((total, entry) => total + entry.netCarbs, 0)

export const totalCarbsByMeal = (entries: CarbEntry[], dateISO: string) => {
  const totals = new Map<CarbMealSlot, number>(carbMealSlots.map((slot) => [slot, 0]))
  entries
    .filter((entry) => entry.dateISO === dateISO)
    .forEach((entry) => totals.set(entry.mealSlot, (totals.get(entry.mealSlot) ?? 0) + entry.netCarbs))

  return carbMealSlots.map((slot) => ({ slot, label: carbMealSlotLabels[slot], value: totals.get(slot) ?? 0 }))
}

export const sortedCarbPresets = (presets: CarbPreset[]) =>
  [...presets].sort((a, b) => {
    const used = (b.useCount ?? 0) - (a.useCount ?? 0)
    if (used !== 0) {
      return used
    }

    return (b.lastUsedAt ?? b.updatedAt).localeCompare(a.lastUsedAt ?? a.updatedAt)
  })

const startOfWeek = (date: Date) => {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  copy.setDate(copy.getDate() - copy.getDay())
  return copy
}

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface CarbDailySummary {
  dateISO: string
  total: number
  goal: number
  metGoal: boolean
}

export interface CarbPeriodSummary {
  key: string
  total: number
  averagePerDay: number
  goalDaysMet: number
  goalDaysOver: number
}

export interface CarbBreakdownSummary {
  label: string
  total: number
  average: number
}

export interface CarbComplianceSummary {
  daysMet: number
  daysOver: number
  percentageMet: number
  currentStreak: number
  longestStreak: number
}

export interface CarbReports {
  today: CarbDailySummary
  last7Total: number
  last30Total: number
  daily: CarbDailySummary[]
  weekly: CarbPeriodSummary[]
  monthly: CarbPeriodSummary[]
  dayOfWeek: CarbBreakdownSummary[]
  mealSlot: CarbBreakdownSummary[]
  compliance: CarbComplianceSummary
}

export const buildDailyCarbSummaries = (
  entries: CarbEntry[],
  history: CarbGoalHistory[],
  settings: CarbSettings,
  endDate: Date,
  days: number,
): CarbDailySummary[] =>
  Array.from({ length: days }, (_, index) => daysAgo(endDate, days - index - 1)).map((date) => {
    const dateISO = toDateKey(date)
    const dayEntries = entries.filter((entry) => entry.dateISO === dateISO)
    const total = dayEntries.reduce((sum, entry) => sum + entry.netCarbs, 0)
    const entryGoal = dayEntries[0]?.goalGramsAtEntry
    const goal = entryGoal ?? goalForDate(dateISO, history, settings)
    return { dateISO, total, goal, metGoal: total <= goal }
  })

const summarizeWeeks = (daily: CarbDailySummary[]): CarbPeriodSummary[] => {
  const grouped = new Map<string, CarbDailySummary[]>()
  daily.forEach((item) => {
    const key = toDateKey(startOfWeek(new Date(`${item.dateISO}T12:00:00`)))
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  })

  return [...grouped.entries()].map(([key, values]) => {
    const total = values.reduce((sum, item) => sum + item.total, 0)
    const goalDaysMet = values.filter((item) => item.metGoal).length
    return {
      key,
      total,
      averagePerDay: Math.round(total / 7),
      goalDaysMet,
      goalDaysOver: values.length - goalDaysMet,
    }
  })
}

const summarizeMonths = (daily: CarbDailySummary[]): CarbPeriodSummary[] => {
  const grouped = new Map<string, CarbDailySummary[]>()
  daily.forEach((item) => {
    const key = monthKey(new Date(`${item.dateISO}T12:00:00`))
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  })

  return [...grouped.entries()].map(([key, values]) => {
    const total = values.reduce((sum, item) => sum + item.total, 0)
    const goalDaysMet = values.filter((item) => item.metGoal).length
    return {
      key,
      total,
      averagePerDay: Math.round(total / Math.max(1, values.length)),
      goalDaysMet,
      goalDaysOver: values.length - goalDaysMet,
    }
  })
}

const complianceForDaily = (daily: CarbDailySummary[]): CarbComplianceSummary => {
  const daysMet = daily.filter((item) => item.metGoal).length
  const daysOver = daily.length - daysMet
  let currentStreak = 0
  for (let index = daily.length - 1; index >= 0; index -= 1) {
    if (!daily[index].metGoal) {
      break
    }
    currentStreak += 1
  }

  let longestStreak = 0
  let active = 0
  daily.forEach((item) => {
    if (item.metGoal) {
      active += 1
      longestStreak = Math.max(longestStreak, active)
    } else {
      active = 0
    }
  })

  return {
    daysMet,
    daysOver,
    percentageMet: Math.round((daysMet / Math.max(1, daily.length)) * 100),
    currentStreak,
    longestStreak,
  }
}

export const buildCarbReports = (
  entries: CarbEntry[],
  history: CarbGoalHistory[],
  settings: CarbSettings,
  endDate = new Date(),
): CarbReports => {
  const todayISO = toDateKey(endDate)
  const daily = buildDailyCarbSummaries(entries, history, settings, endDate, 30)
  const longerDaily = buildDailyCarbSummaries(entries, history, settings, endDate, 92)
  const monthlyDaily = buildDailyCarbSummaries(entries, history, settings, endDate, 184)
  const last7 = daily.slice(-7)
  const today = daily.find((item) => item.dateISO === todayISO) ?? {
    dateISO: todayISO,
    total: totalCarbsForDate(entries, todayISO),
    goal: goalForDate(todayISO, history, settings),
    metGoal: totalCarbsForDate(entries, todayISO) <= goalForDate(todayISO, history, settings),
  }
  const dayOfWeek = dayNames.map((label, dayIndex) => {
    const values = daily.filter((item) => new Date(`${item.dateISO}T12:00:00`).getDay() === dayIndex)
    const total = values.reduce((sum, item) => sum + item.total, 0)
    return { label, total, average: Math.round(total / Math.max(1, values.length)) }
  })
  const slotTotals = new Map<CarbMealSlot, number>(carbMealSlots.map((slot) => [slot, 0]))
  entries
    .filter((entry) => entry.dateISO >= daily[0].dateISO && entry.dateISO <= todayISO)
    .forEach((entry) => slotTotals.set(entry.mealSlot, (slotTotals.get(entry.mealSlot) ?? 0) + entry.netCarbs))
  const mealSlot = carbMealSlots.map((slot) => ({
    label: carbMealSlotLabels[slot],
    total: slotTotals.get(slot) ?? 0,
    average: Math.round((slotTotals.get(slot) ?? 0) / Math.max(1, daily.length)),
  }))

  return {
    today,
    last7Total: last7.reduce((sum, item) => sum + item.total, 0),
    last30Total: daily.reduce((sum, item) => sum + item.total, 0),
    daily,
    weekly: summarizeWeeks(longerDaily).slice(-8),
    monthly: summarizeMonths(monthlyDaily).slice(-6),
    dayOfWeek,
    mealSlot,
    compliance: complianceForDaily(daily),
  }
}
