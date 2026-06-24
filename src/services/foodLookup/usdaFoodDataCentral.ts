import { calculateNetCarbs } from './netCarbCalculator'
import { FoodLookupError, type FoodLookupOptions, type FoodLookupResult } from './types'

const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1'

type UsdaNutrient = {
  nutrientId?: number
  nutrientName?: string
  nutrientNumber?: string
  value?: number
  amount?: number
  nutrient?: {
    id?: number
    name?: string
    number?: string
  }
}

type UsdaFood = {
  fdcId?: number
  description?: string
  brandOwner?: string
  brandName?: string
  servingSize?: number
  servingSizeUnit?: string
  householdServingFullText?: string
  foodNutrients?: UsdaNutrient[]
}

type UsdaApiErrorBody = {
  error?: {
    code?: string
    message?: string
  }
}

const numberValue = (value?: number) => (Number.isFinite(value ?? NaN) ? Number(value) : undefined)

const nutrientName = (nutrient: UsdaNutrient) =>
  [nutrient.nutrientName, nutrient.nutrient?.name, nutrient.nutrientNumber, nutrient.nutrient?.number]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const nutrientId = (nutrient: UsdaNutrient) => nutrient.nutrientId ?? nutrient.nutrient?.id

const findNutrient = (food: UsdaFood, matcher: (nutrient: UsdaNutrient) => boolean) => {
  const nutrient = food.foodNutrients?.find(matcher)
  return numberValue(nutrient?.value ?? nutrient?.amount)
}

const servingSizeForFood = (food: UsdaFood) => {
  if (food.householdServingFullText) {
    return food.householdServingFullText
  }
  if (food.servingSize && food.servingSizeUnit) {
    return `${food.servingSize}${food.servingSizeUnit}`
  }
  return undefined
}

export const formatUsdaErrorMessage = (status: number, body?: UsdaApiErrorBody, context = 'lookup') => {
  if (body?.error?.code === 'API_KEY_INVALID') {
    return 'USDA rejected this API key. Confirm or rotate it in FoodData Central, then save it again locally.'
  }

  const message = body?.error?.message?.trim()
  if (message) {
    return `USDA ${context} failed (${status}): ${message}`
  }

  return `USDA ${context} failed (${status}).`
}

const usdaErrorMessage = async (response: Response, context: string) => {
  try {
    return formatUsdaErrorMessage(response.status, (await response.json()) as UsdaApiErrorBody, context)
  } catch {
    return formatUsdaErrorMessage(response.status, undefined, context)
  }
}

export const parseUsdaFood = (
  food: UsdaFood,
  options: Pick<FoodLookupOptions, 'subtractSugarAlcoholsWhenAvailable'> = {},
): FoodLookupResult | null => {
  if (!food.fdcId || !food.description) {
    return null
  }

  const totalCarbohydrateGrams = findNutrient(
    food,
    (nutrient) => nutrientId(nutrient) === 1005 || /carbohydrate/.test(nutrientName(nutrient)),
  )
  const dietaryFiberGrams = findNutrient(
    food,
    (nutrient) => nutrientId(nutrient) === 1079 || /fiber|fibre/.test(nutrientName(nutrient)),
  )
  const sugarAlcoholGrams = findNutrient(
    food,
    (nutrient) => nutrientId(nutrient) === 1086 || /sugar alcohol|polyol/.test(nutrientName(nutrient)),
  )
  const calculation = calculateNetCarbs({
    totalCarbohydrateGrams,
    dietaryFiberGrams,
    sugarAlcoholGrams,
    subtractSugarAlcoholsWhenAvailable: options.subtractSugarAlcoholsWhenAvailable,
  })
  const servingSize = servingSizeForFood(food)

  return {
    id: `usda-${food.fdcId}`,
    source: 'usda',
    sourceType: 'usda',
    sourceId: String(food.fdcId),
    name: food.description,
    brand: food.brandOwner ?? food.brandName,
    servingSize,
    totalCarbohydrateGrams,
    dietaryFiberGrams,
    sugarAlcoholGrams,
    netCarbs: calculation.netCarbs,
    formula: calculation.formula,
    servingWarning: servingSize ? undefined : 'Serving data may be ambiguous. Verify the label or serving before adding.',
    attribution: 'USDA FoodData Central',
  }
}

export const searchUsdaFoods = async (query: string, options: FoodLookupOptions): Promise<FoodLookupResult[]> => {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }
  if (!options.apiKey?.trim()) {
    throw new FoodLookupError('Add your FoodData Central API key in Net Carb Settings first.')
  }

  const params = new URLSearchParams({
    query: trimmed,
    pageSize: '8',
    api_key: options.apiKey.trim(),
  })
  const response = await fetch(`${USDA_BASE_URL}/foods/search?${params.toString()}`, { signal: options.signal })
  if (!response.ok) {
    throw new FoodLookupError(await usdaErrorMessage(response, 'lookup'))
  }
  const json = (await response.json()) as { foods?: UsdaFood[] }

  return (json.foods ?? [])
    .map((food) => parseUsdaFood(food, options))
    .filter((food): food is FoodLookupResult => Boolean(food))
}

export const getUsdaFoodDetails = async (
  fdcId: string,
  options: FoodLookupOptions,
): Promise<FoodLookupResult | null> => {
  if (!options.apiKey?.trim()) {
    throw new FoodLookupError('Add your FoodData Central API key in Net Carb Settings first.')
  }

  const params = new URLSearchParams({ api_key: options.apiKey.trim() })
  const response = await fetch(`${USDA_BASE_URL}/food/${encodeURIComponent(fdcId)}?${params.toString()}`, {
    signal: options.signal,
  })
  if (!response.ok) {
    throw new FoodLookupError(await usdaErrorMessage(response, 'detail lookup'))
  }

  return parseUsdaFood((await response.json()) as UsdaFood, options)
}
