import { describe, expect, it } from 'vitest'
import { parseOpenFoodFactsProduct } from './openFoodFacts'
import { parseUsdaFood } from './usdaFoodDataCentral'

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

  it('parses Open Food Facts serving nutrients and warns about crowdsourced data', () => {
    expect(
      parseOpenFoodFactsProduct({
        code: '0001',
        product_name: 'Almond crackers',
        brands: 'Bike Snacks',
        serving_size: '30 g',
        nutriments: {
          carbohydrates_serving: 11,
          fiber_serving: 3,
        },
      }),
    ).toMatchObject({
      sourceType: 'openFoodFacts',
      sourceId: '0001',
      netCarbs: 8,
      servingWarning: 'Open Food Facts is crowdsourced; verify package labels.',
    })
  })

  it('handles missing fiber and missing serving size', () => {
    expect(
      parseOpenFoodFactsProduct({
        code: '0002',
        product_name: 'Unknown bar',
        nutriments: {
          carbohydrates_100g: 19,
        },
      }),
    ).toMatchObject({
      netCarbs: 19,
      servingWarning: 'Open Food Facts is crowdsourced; verify package labels. Serving data may be ambiguous.',
    })
  })
})
