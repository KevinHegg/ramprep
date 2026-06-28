import { FoodLookupError, type FoodLookupOptions, type NormalizedFoodCandidate, type NormalizedFoodDetail, type ServingOption } from './types'

const NUTRITIONIX_URL = 'https://trackapi.nutritionix.com/v2/natural/nutrients'

type NutritionixFullNutrient = {
  attr_id?: number
  value?: number
}

type NutritionixAltMeasure = {
  serving_weight?: number
  measure?: string
  qty?: number
  seq?: number
}

type NutritionixFood = {
  food_name?: string
  brand_name?: string
  serving_qty?: number
  serving_unit?: string
  serving_weight_grams?: number
  nf_total_carbohydrate?: number
  nf_dietary_fiber?: number
  full_nutrients?: NutritionixFullNutrient[]
  alt_measures?: NutritionixAltMeasure[]
}

type NutritionixResponse = {
  foods?: NutritionixFood[]
  message?: string
}

const numberValue = (value?: number) => (Number.isFinite(value ?? NaN) ? Number(value) : undefined)

const cleanName = (value?: string) => value?.replace(/\s+/g, ' ').trim()

const sugarAlcoholFromFullNutrients = (nutrients?: NutritionixFullNutrient[]) =>
  numberValue(nutrients?.find((nutrient) => nutrient.attr_id === 1086)?.value)

const servingLabel = (qty?: number, unit?: string, grams?: number) => {
  const label = [numberValue(qty) ?? 1, cleanName(unit) ?? 'serving'].join(' ')
  return grams ? `${label} (${Math.round(grams)}g)` : label
}

const customGramsOption = (): ServingOption => ({
  id: 'custom-grams',
  label: 'Custom grams',
  quantity: 100,
  unit: 'g',
  grams: 100,
  source: 'custom',
})

const per100gOption = (baseGrams?: number): ServingOption => ({
  id: 'per-100g',
  label: '100g',
  quantity: 100,
  unit: 'g',
  grams: 100,
  multiplierFromBase: baseGrams ? 100 / baseGrams : undefined,
  source: 'per100g',
})

export const parseNutritionixFood = (food: NutritionixFood, index = 0): NormalizedFoodDetail | null => {
  const name = cleanName(food.food_name)
  if (!name) {
    return null
  }

  const baseGrams = numberValue(food.serving_weight_grams)
  const baseQuantity = numberValue(food.serving_qty) ?? 1
  const baseUnit = cleanName(food.serving_unit) ?? 'serving'
  const sourceId = `${name}-${food.brand_name ?? 'common'}-${index}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const warnings: string[] = []

  if (!baseGrams) {
    warnings.push('Serving weight is missing; verify serving before adding.')
  }

  const candidate: NormalizedFoodCandidate = {
    id: `nutritionix-${sourceId}`,
    source: 'nutritionix',
    sourceId,
    name,
    brandName: cleanName(food.brand_name),
    dataType: food.brand_name ? 'Branded/common food' : 'Common food',
    servingLabel: servingLabel(baseQuantity, baseUnit, baseGrams),
    servingSizeGrams: baseGrams,
    hasDetailEndpoint: false,
    confidence: baseGrams ? 'high' : 'medium',
    warnings: warnings.length ? warnings : undefined,
  }

  const servingOptions: ServingOption[] = [
    {
      id: 'nutritionix-default',
      label: servingLabel(baseQuantity, baseUnit, baseGrams),
      quantity: baseQuantity,
      unit: baseUnit,
      grams: baseGrams,
      multiplierFromBase: 1,
      source: 'label',
      isDefault: true,
    },
    ...(food.alt_measures ?? [])
      .filter((measure) => Number.isFinite(measure.serving_weight ?? NaN))
      .slice(0, 10)
      .map((measure, measureIndex): ServingOption => {
        const grams = Number(measure.serving_weight)
        const quantity = numberValue(measure.qty) ?? 1
        const unit = cleanName(measure.measure) ?? 'serving'
        return {
          id: `alt-${measure.seq ?? measureIndex}`,
          label: servingLabel(quantity, unit, grams),
          quantity,
          unit,
          grams,
          multiplierFromBase: baseGrams ? grams / baseGrams : undefined,
          source: 'common',
        }
      }),
    per100gOption(baseGrams),
    customGramsOption(),
  ]

  return {
    candidate,
    baseServing: {
      label: servingLabel(baseQuantity, baseUnit, baseGrams),
      grams: baseGrams,
      quantity: baseQuantity,
      unit: baseUnit,
    },
    nutrientsForBaseServing: {
      totalCarbohydrateGrams: numberValue(food.nf_total_carbohydrate),
      fiberGrams: numberValue(food.nf_dietary_fiber),
      sugarAlcoholGrams: sugarAlcoholFromFullNutrients(food.full_nutrients),
    },
    servingOptions,
    attributionText: 'Nutritionix',
    warnings,
    raw: food,
  }
}

export const searchNutritionixFoods = async (
  query: string,
  options: FoodLookupOptions,
): Promise<NormalizedFoodDetail[]> => {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }
  if (!options.appId?.trim() || !options.appKey?.trim()) {
    throw new FoodLookupError('Add Nutritionix App ID and App Key in Net Carb Settings first.')
  }

  const response = await fetch(NUTRITIONIX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-id': options.appId.trim(),
      'x-app-key': options.appKey.trim(),
    },
    body: JSON.stringify({
      query: trimmed,
      use_raw_foods: true,
      use_branded_foods: true,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    let message = `Nutritionix lookup failed (${response.status}).`
    try {
      const body = (await response.json()) as NutritionixResponse
      if (body.message?.trim()) {
        message = `Nutritionix lookup failed (${response.status}): ${body.message.trim()}`
      }
    } catch {
      // Keep the generic status message.
    }
    throw new FoodLookupError(message)
  }

  const json = (await response.json()) as NutritionixResponse
  return (json.foods ?? [])
    .map((food, index) => parseNutritionixFood(food, index))
    .filter((detail): detail is NormalizedFoodDetail => Boolean(detail))
}
