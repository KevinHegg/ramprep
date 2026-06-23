import { calculateNetCarbs } from './netCarbCalculator'
import { FoodLookupError, type FoodLookupOptions, type FoodLookupResult } from './types'

const OPEN_FOOD_FACTS_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
export const openFoodFactsWarning = 'Open Food Facts is crowdsourced; verify package labels.'

type OpenFoodFactsProduct = {
  code?: string
  product_name?: string
  brands?: string
  serving_size?: string
  nutriments?: Record<string, number | string | undefined>
}

const numericNutrient = (nutriments: Record<string, number | string | undefined> | undefined, keys: string[]) => {
  for (const key of keys) {
    const value = nutriments?.[key]
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : value
    if (Number.isFinite(parsed ?? NaN)) {
      return Number(parsed)
    }
  }
  return undefined
}

export const parseOpenFoodFactsProduct = (
  product: OpenFoodFactsProduct,
  options: Pick<FoodLookupOptions, 'subtractSugarAlcoholsWhenAvailable'> = {},
): FoodLookupResult | null => {
  const sourceId = product.code
  const name = product.product_name?.trim()
  if (!sourceId || !name) {
    return null
  }

  const totalCarbohydrateGrams = numericNutrient(product.nutriments, [
    'carbohydrates_serving',
    'carbohydrates_prepared_serving',
    'carbohydrates_100g',
  ])
  const dietaryFiberGrams = numericNutrient(product.nutriments, ['fiber_serving', 'fiber_prepared_serving', 'fiber_100g'])
  const sugarAlcoholGrams = numericNutrient(product.nutriments, [
    'polyols_serving',
    'polyols_prepared_serving',
    'polyols_100g',
    'sugar-alcohol_serving',
    'sugar-alcohol_100g',
  ])
  const calculation = calculateNetCarbs({
    totalCarbohydrateGrams,
    dietaryFiberGrams,
    sugarAlcoholGrams,
    subtractSugarAlcoholsWhenAvailable: options.subtractSugarAlcoholsWhenAvailable,
  })

  return {
    id: `open-food-facts-${sourceId}`,
    source: 'openFoodFacts',
    sourceType: 'openFoodFacts',
    sourceId,
    name,
    brand: product.brands,
    servingSize: product.serving_size,
    totalCarbohydrateGrams,
    dietaryFiberGrams,
    sugarAlcoholGrams,
    netCarbs: calculation.netCarbs,
    formula: calculation.formula,
    servingWarning: product.serving_size ? openFoodFactsWarning : `${openFoodFactsWarning} Serving data may be ambiguous.`,
    attribution: 'Open Food Facts',
  }
}

export const searchOpenFoodFacts = async (
  query: string,
  options: FoodLookupOptions = {},
): Promise<FoodLookupResult[]> => {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const params = new URLSearchParams({
    search_terms: trimmed,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '8',
    fields: 'code,product_name,brands,serving_size,nutriments',
  })
  const response = await fetch(`${OPEN_FOOD_FACTS_SEARCH_URL}?${params.toString()}`, { signal: options.signal })
  if (!response.ok) {
    throw new FoodLookupError(`Open Food Facts lookup failed (${response.status}).`)
  }
  const json = (await response.json()) as { products?: OpenFoodFactsProduct[] }

  return (json.products ?? [])
    .map((product) => parseOpenFoodFactsProduct(product, options))
    .filter((product): product is FoodLookupResult => Boolean(product))
}
