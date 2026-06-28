import { describe, expect, it } from 'vitest'
import { calculateNetCarbs, calculateServingNetCarbs } from './netCarbCalculator'
import type { NormalizedFoodDetail } from './types'

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

  it('keeps serving quantity and custom gram math decimal until final rounding', () => {
    const detail: NormalizedFoodDetail = {
      candidate: {
        id: 'usda-orange',
        source: 'usda',
        sourceId: '123',
        name: 'Orange',
        hasDetailEndpoint: true,
      },
      baseServing: { label: '100g', grams: 100 },
      nutrientsForBaseServing: {
        totalCarbohydrateGrams: 11.8,
        fiberGrams: 2.4,
      },
      servingOptions: [
        {
          id: 'custom',
          label: 'Custom 75g',
          quantity: 75,
          unit: 'g',
          grams: 75,
          source: 'custom',
        },
      ],
      attributionText: 'USDA FoodData Central',
      warnings: [],
    }

    const calculation = calculateServingNetCarbs({
      detail,
      selectedServing: detail.servingOptions[0],
      quantity: 1.5,
    })

    expect(calculation.netCarbsDecimal).toBeCloseTo(10.575)
    expect(calculation.netCarbsRounded).toBe(11)
    expect(calculation.formulaLabel).toBe('Total carbs 13.3g - fiber 2.7g = 10.6g net')
  })
})
