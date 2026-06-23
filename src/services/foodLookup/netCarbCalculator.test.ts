import { describe, expect, it } from 'vitest'
import { calculateNetCarbs } from './netCarbCalculator'

describe('net carb formula', () => {
  it('subtracts fiber from total carbohydrate and rounds to an integer', () => {
    expect(calculateNetCarbs({ totalCarbohydrateGrams: 12.4, dietaryFiberGrams: 4.2 })).toMatchObject({
      netCarbs: 8,
      formula: 'Total carbs 12.4g - fiber 4.2g = 8g net',
    })
  })

  it('clamps below zero', () => {
    expect(calculateNetCarbs({ totalCarbohydrateGrams: 3, dietaryFiberGrams: 8 }).netCarbs).toBe(0)
  })

  it('subtracts sugar alcohols only when explicit and enabled', () => {
    expect(
      calculateNetCarbs({
        totalCarbohydrateGrams: 20,
        dietaryFiberGrams: 5,
        sugarAlcoholGrams: 6,
        subtractSugarAlcoholsWhenAvailable: false,
      }).netCarbs,
    ).toBe(15)

    expect(
      calculateNetCarbs({
        totalCarbohydrateGrams: 20,
        dietaryFiberGrams: 5,
        sugarAlcoholGrams: 6,
        subtractSugarAlcoholsWhenAvailable: true,
      }).netCarbs,
    ).toBe(9)
  })
})
