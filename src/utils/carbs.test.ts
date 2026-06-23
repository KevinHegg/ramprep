import { describe, expect, it } from 'vitest'
import type { CarbEntry, CarbGoalHistory, CarbSettings } from '../types'
import { buildCarbReports, buildDailyCarbSummaries, carbMealSlotLabels, totalCarbsByMeal } from './carbs'

const settings: CarbSettings = {
  id: 'default',
  dailyNetCarbGoalGrams: 50,
  saveFoodNamesInLog: false,
  subtractSugarAlcoholsWhenAvailable: false,
  preferredNutritionSource: 'manual',
  updatedAt: '2026-06-22T12:00:00.000Z',
}

const history: CarbGoalHistory[] = [
  {
    id: 'old',
    effectiveDateISO: '2026-06-01',
    goalGrams: 40,
    createdAt: '2026-06-01T12:00:00.000Z',
  },
  {
    id: 'new',
    effectiveDateISO: '2026-06-15',
    goalGrams: 50,
    createdAt: '2026-06-15T12:00:00.000Z',
  },
]

const entry = (
  id: string,
  dateISO: string,
  mealSlot: CarbEntry['mealSlot'],
  netCarbs: number,
  goalGramsAtEntry: number,
): CarbEntry => ({
  id,
  dateISO,
  mealSlot,
  netCarbs,
  sourceType: 'manual',
  sourceLabel: 'manual',
  goalGramsAtEntry,
  createdAt: `${dateISO}T12:00:00.000Z`,
  updatedAt: `${dateISO}T12:00:00.000Z`,
})

describe('carb reports', () => {
  it('keeps old goal snapshots when evaluating historical days', () => {
    const summaries = buildDailyCarbSummaries(
      [entry('a', '2026-06-10', 'breakfast', 45, 40)],
      history,
      settings,
      new Date('2026-06-22T12:00:00'),
      30,
    )

    expect(summaries.find((item) => item.dateISO === '2026-06-10')).toMatchObject({
      total: 45,
      goal: 40,
      metGoal: false,
    })
  })

  it('calculates daily, weekly, monthly, day-of-week, meal-slot, and compliance summaries', () => {
    const entries: CarbEntry[] = [
      entry('a', '2026-06-10', 'breakfast', 12, 40),
      entry('b', '2026-06-10', 'lunch', 20, 40),
      entry('c', '2026-06-16', 'dinner', 55, 50),
      entry('d', '2026-06-22', 'morningSnack', 5, 50),
      entry('e', '2026-06-22', 'dinner', 10, 50),
    ]
    const reports = buildCarbReports(entries, history, settings, new Date('2026-06-22T12:00:00'))

    expect(reports.today).toMatchObject({ dateISO: '2026-06-22', total: 15, goal: 50, metGoal: true })
    expect(reports.last7Total).toBe(70)
    expect(reports.last30Total).toBe(102)
    expect(reports.weekly.at(-1)).toMatchObject({ total: 15, averagePerDay: 2 })
    expect(reports.monthly.at(-1)).toMatchObject({ key: '2026-06', total: 102 })
    expect(reports.dayOfWeek.find((item) => item.label === 'Monday')?.total).toBe(15)
    expect(reports.mealSlot.find((item) => item.label === carbMealSlotLabels.dinner)?.total).toBe(65)
    expect(reports.compliance.daysOver).toBe(1)
  })

  it('totals a selected day by meal slot', () => {
    expect(
      totalCarbsByMeal(
        [entry('a', '2026-06-22', 'breakfast', 7, 50), entry('b', '2026-06-22', 'breakfast', 3, 50)],
        '2026-06-22',
      ).find((item) => item.slot === 'breakfast')?.value,
    ).toBe(10)
  })
})
