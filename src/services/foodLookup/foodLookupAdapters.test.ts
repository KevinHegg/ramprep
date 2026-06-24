import { describe, expect, it } from 'vitest'
import { formatUsdaErrorMessage, parseUsdaFood } from './usdaFoodDataCentral'

describe('food lookup adapters', () => {
  it('parses USDA FoodData Central search/detail food nutrients', () => {
    expect(
      parseUsdaFood({
        fdcId: 123,
        description: 'Plain Greek yogurt',
        brandOwner: 'Test Dairy',
        servingSize: 170,
        servingSizeUnit: 'g',
        foodNutrients: [
          { nutrientId: 1005, nutrientName: 'Carbohydrate, by difference', value: 9 },
          { nutrientId: 1079, nutrientName: 'Fiber, total dietary', value: 1 },
        ],
      }),
    ).toMatchObject({
      sourceType: 'usda',
      sourceId: '123',
      name: 'Plain Greek yogurt',
      brand: 'Test Dairy',
      servingSize: '170g',
      netCarbs: 8,
    })
  })
  it('handles missing fiber and missing serving size with USDA data', () => {
    expect(
      parseUsdaFood({
        fdcId: 456,
        description: 'Unknown bar',
        foodNutrients: [{ nutrientId: 1005, nutrientName: 'Carbohydrate, by difference', value: 19 }],
      }),
    ).toMatchObject({
      netCarbs: 19,
      servingWarning: 'Serving data may be ambiguous. Verify the label or serving before adding.',
    })
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
