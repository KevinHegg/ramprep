import { describe, expect, it } from 'vitest'
import { calculateServingNetCarbs } from './netCarbCalculator'
import { parseNutritionixFood } from './nutritionix'
import { parseOpenFoodFactsProduct } from './openFoodFacts'
import { formatUsdaErrorMessage, parseUsdaCandidate, parseUsdaFoodDetail } from './usdaFoodDataCentral'

describe('food lookup adapters', () => {
  it('parses USDA search rows as candidates only', () => {
    const candidate = parseUsdaCandidate({
      fdcId: 123,
      description: 'ORANGE, RAW',
      dataType: 'Survey (FNDDS)',
      foodNutrients: [
        { nutrientId: 1005, nutrientName: 'Carbohydrate, by difference', value: 91 },
      ],
    })

    expect(candidate).toMatchObject({
      source: 'usda',
      sourceId: '123',
      name: 'ORANGE, RAW',
      dataType: 'Survey (FNDDS)',
      hasDetailEndpoint: true,
    })
    expect(candidate).not.toHaveProperty('netCarbs')
  })

  it('parses USDA branded details into label, 100g, and custom serving options', () => {
    const detail = parseUsdaFoodDetail({
      fdcId: 123,
      description: 'Plain Greek yogurt',
      brandOwner: 'Test Dairy',
      dataType: 'Branded',
      servingSize: 170,
      servingSizeUnit: 'g',
      householdServingFullText: '1 container',
      foodNutrients: [
        { nutrientId: 1005, nutrientName: 'Carbohydrate, by difference', amount: 9 },
        { nutrientId: 1079, nutrientName: 'Fiber, total dietary', amount: 1 },
      ],
    })

    expect(detail?.candidate).toMatchObject({
      source: 'usda',
      sourceId: '123',
      name: 'Plain Greek yogurt',
      brandName: 'Test Dairy',
      servingLabel: '1 container',
    })
    expect(detail?.servingOptions.map((option) => option.id)).toEqual(['label-serving', 'per-100g', 'custom-grams'])

    const calculation = calculateServingNetCarbs({
      detail: detail!,
      selectedServing: detail!.servingOptions[0],
      quantity: 1,
    })
    expect(calculation.formulaLabel).toBe('Total carbs 15.3g - fiber 1.7g = 13.6g net')
    expect(calculation.netCarbsRounded).toBe(14)
  })

  it('parses USDA foodPortions and keeps 100g behavior explicit', () => {
    const detail = parseUsdaFoodDetail({
      fdcId: 456,
      description: 'Orange, raw',
      dataType: 'Survey (FNDDS)',
      foodPortions: [
        {
          id: 1,
          amount: 1,
          modifier: 'medium',
          gramWeight: 131,
          measureUnit: { abbreviation: 'orange' },
        },
      ],
      foodNutrients: [
        { nutrient: { id: 1005, name: 'Carbohydrate, by difference', number: '205' }, amount: 11.8 },
        { nutrient: { id: 1079, name: 'Fiber, total dietary', number: '291' }, amount: 2.4 },
      ],
    })

    expect(detail?.servingOptions.find((option) => option.id === 'portion-1')).toMatchObject({
      label: 'medium (131g)',
      grams: 131,
    })
    const per100g = detail!.servingOptions.find((option) => option.id === 'per-100g')!
    expect(
      calculateServingNetCarbs({
        detail: detail!,
        selectedServing: per100g,
        quantity: 1,
      }).netCarbsRounded,
    ).toBe(9)
  })

  it('subtracts USDA sugar alcohols only when the setting is on and explicit', () => {
    const detail = parseUsdaFoodDetail({
      fdcId: 789,
      description: 'Low carb bar',
      dataType: 'Branded',
      servingSize: 50,
      servingSizeUnit: 'g',
      foodNutrients: [
        { nutrientNumber: '205', nutrientName: 'Carbohydrate, by difference', amount: 20 },
        { nutrientNumber: '291', nutrientName: 'Fiber, total dietary', amount: 6 },
        { nutrientNumber: '1086', nutrientName: 'Sugar alcohols', amount: 8 },
      ],
    })!

    const serving = detail.servingOptions[0]
    expect(calculateServingNetCarbs({ detail, selectedServing: serving, quantity: 1 }).netCarbsRounded).toBe(7)
    expect(
      calculateServingNetCarbs({
        detail,
        selectedServing: serving,
        quantity: 1,
        subtractSugarAlcoholsWhenAvailable: true,
      }).netCarbsRounded,
    ).toBe(3)
  })

  it('parses Nutritionix serving and alternate-measure gram math', () => {
    const detail = parseNutritionixFood({
      food_name: 'orange',
      serving_qty: 1,
      serving_unit: 'cup sections',
      serving_weight_grams: 180,
      nf_total_carbohydrate: 21,
      nf_dietary_fiber: 4.3,
      alt_measures: [{ seq: 1, qty: 1, measure: 'medium', serving_weight: 131 }],
    })!

    expect(detail.candidate).toMatchObject({
      source: 'nutritionix',
      servingLabel: '1 cup sections (180g)',
    })
    const medium = detail.servingOptions.find((option) => option.id === 'alt-1')!
    const calculation = calculateServingNetCarbs({ detail, selectedServing: medium, quantity: 1 })
    expect(calculation.netCarbsRounded).toBe(12)
  })

  it('parses Open Food Facts packaged serving and warning', () => {
    const detail = parseOpenFoodFactsProduct({
      code: '0123456789',
      product_name: 'Protein yogurt',
      brands: 'Test Brand',
      serving_size: '150 g',
      nutriments: {
        carbohydrates_serving: 12,
        fiber_serving: 3,
        carbohydrates_100g: 8,
        fiber_100g: 2,
      },
    })!

    expect(detail.candidate).toMatchObject({
      source: 'openFoodFacts',
      sourceId: '0123456789',
      brandName: 'Test Brand',
      servingSizeGrams: 150,
    })
    expect(detail.warnings).toContain('Open Food Facts is crowdsourced; verify the package label.')
    expect(detail.servingOptions.map((option) => option.id)).toEqual(['label-serving', 'per-100g', 'custom-grams'])
  })

  it('turns USDA invalid-key responses into an actionable local settings message', () => {
    expect(
      formatUsdaErrorMessage(403, {
        error: {
          code: 'API_KEY_INVALID',
          message: 'An invalid api_key was supplied.',
        },
      }),
    ).toBe('USDA rejected this API key. Confirm or rotate it in FoodData Central, then save it again locally.')
  })
})
