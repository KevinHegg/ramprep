import { FoodLookupError, type FoodLookupOptions, type NormalizedFoodCandidate, type NormalizedFoodDetail, type ServingOption } from './types'

const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1'

type UsdaNutrient = {
  nutrientId?: number
  nutrientName?: string
  nutrientNumber?: string
  value?: number
  amount?: number
  unitName?: string
  nutrient?: {
    id?: number
    name?: string
    number?: string
    unitName?: string
  }
}

type UsdaFoodPortion = {
  id?: number
  amount?: number
  modifier?: string
  portionDescription?: string
  gramWeight?: number
  measureUnit?: {
    id?: number
    name?: string
    abbreviation?: string
  }
}

type UsdaFood = {
  fdcId?: number
  description?: string
  brandOwner?: string
  brandName?: string
  dataType?: string
  foodCategory?: string
  servingSize?: number
  servingSizeUnit?: string
  householdServingFullText?: string
  foodNutrients?: UsdaNutrient[]
  foodPortions?: UsdaFoodPortion[]
}

type UsdaApiErrorBody = {
  error?: {
    code?: string
    message?: string
  }
}

const numberValue = (value?: number) => (Number.isFinite(value ?? NaN) ? Number(value) : undefined)

const cleanText = (value?: string) => value?.replace(/\s+/g, ' ').trim()

const nutrientName = (nutrient: UsdaNutrient) =>
  [nutrient.nutrientName, nutrient.nutrient?.name, nutrient.nutrientNumber, nutrient.nutrient?.number]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const nutrientId = (nutrient: UsdaNutrient) => nutrient.nutrientId ?? nutrient.nutrient?.id

const nutrientNumber = (nutrient: UsdaNutrient) => nutrient.nutrientNumber ?? nutrient.nutrient?.number

const findNutrient = (food: UsdaFood, matcher: (nutrient: UsdaNutrient) => boolean) => {
  const nutrient = food.foodNutrients?.find(matcher)
  return numberValue(nutrient?.value ?? nutrient?.amount)
}

const gramsFromServingSize = (servingSize?: number, unit?: string) => {
  const value = numberValue(servingSize)
  if (!value || !unit) {
    return undefined
  }

  const normalized = unit.trim().toLowerCase()
  if (['g', 'gram', 'grams'].includes(normalized)) {
    return value
  }
  if (['oz', 'ounce', 'ounces'].includes(normalized)) {
    return value * 28.349523125
  }
  if (['ml', 'milliliter', 'milliliters'].includes(normalized)) {
    return value
  }

  return undefined
}

const servingLabelForFood = (food: UsdaFood) => {
  const household = cleanText(food.householdServingFullText)
  if (household) {
    return household
  }
  if (food.servingSize && food.servingSizeUnit) {
    return `${food.servingSize}${food.servingSizeUnit}`
  }
  return undefined
}

const normalizeWords = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const brandedQueryWords = /\b(quest|atkins|ratio|keto|bar|bagel|bread|cereal|marmalade|yogurt|protein|chips|cookie|cracker|restaurant|brand)\b/

const preparedFoodWords = /\b(bagel|marmalade|sherbet|babyfood|baby food|sauce|dressing|restaurant|prepared|frozen|cereal|cookie|cracker|candy|juice)\b/

const rawCommonWords = /\b(raw|fresh|uncooked|whole)\b/

const looksPackagedOrBranded = (query: string) => {
  const normalized = normalizeWords(query)
  return normalized.split(' ').length > 2 || brandedQueryWords.test(normalized)
}

const candidateRankScore = (query: string, candidate: NormalizedFoodCandidate) => {
  const normalizedQuery = normalizeWords(query)
  const normalizedName = normalizeWords(candidate.name)
  const dataType = normalizeWords(candidate.dataType ?? '')
  const hasBrand = Boolean(candidate.brandName)
  const brandedQuery = looksPackagedOrBranded(query)
  let score = 0

  if (dataType.includes('foundation')) score -= 90
  if (dataType.includes('sr legacy')) score -= 80
  if (dataType.includes('survey') || dataType.includes('fndds')) score -= 70
  if (dataType.includes('branded')) score += brandedQuery ? -25 : 70
  if (dataType.includes('restaurant')) score += brandedQuery ? 10 : 90
  if (hasBrand) score += brandedQuery ? -15 : 35
  if (brandedQuery) {
    const queryTerms = normalizedQuery.split(' ').filter((term) => term.length > 2)
    const matchedTerms = queryTerms.filter((term) => normalizedName.includes(term)).length
    score -= matchedTerms * 35
  }

  if (new RegExp(`\\b${normalizedQuery.replaceAll(' ', '\\s+')}s?\\b`).test(normalizedName)) score -= 18
  if (normalizedName.startsWith(normalizedQuery)) score -= 22
  if (rawCommonWords.test(normalizedName)) score -= 35
  if (preparedFoodWords.test(normalizedName)) score += brandedQuery ? 0 : 45
  if (/babyfood|baby food|sherbet|marmalade/.test(normalizedName)) score += brandedQuery ? 10 : 65
  if (!candidate.servingLabel && !candidate.servingSizeGrams) score += 8

  return score
}

export const rankUsdaCandidates = (query: string, candidates: NormalizedFoodCandidate[]) =>
  candidates
    .map((candidate, index) => ({ candidate, index, score: candidateRankScore(query, candidate) }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(({ candidate }) => candidate)

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

export const parseUsdaCandidate = (food: UsdaFood): NormalizedFoodCandidate | null => {
  if (!food.fdcId || !food.description) {
    return null
  }

  const servingSizeGrams = gramsFromServingSize(food.servingSize, food.servingSizeUnit)
  const warnings: string[] = []
  if (!servingLabelForFood(food)) {
    warnings.push('Serving unclear; verify label.')
  }
  if (food.dataType?.toLowerCase().includes('branded')) {
    warnings.push('Branded food may require label verification.')
  }

  return {
    id: `usda-${food.fdcId}`,
    source: 'usda',
    sourceId: String(food.fdcId),
    name: food.description,
    brandName: food.brandOwner ?? food.brandName,
    dataType: food.dataType ?? food.foodCategory,
    servingLabel: servingLabelForFood(food),
    servingSizeGrams,
    hasDetailEndpoint: true,
    confidence: servingSizeGrams || food.foodPortions?.length ? 'high' : 'medium',
    warnings: warnings.length ? warnings : undefined,
  }
}

const totalCarbohydrateMatcher = (nutrient: UsdaNutrient) => {
  const name = nutrientName(nutrient)
  const id = nutrientId(nutrient)
  const number = nutrientNumber(nutrient)
  return id === 1005 || number === '205' || number === '1005' || /carbohydrate|carbs?/.test(name)
}

const fiberMatcher = (nutrient: UsdaNutrient) => {
  const name = nutrientName(nutrient)
  const id = nutrientId(nutrient)
  const number = nutrientNumber(nutrient)
  return id === 1079 || number === '291' || number === '1079' || /fiber|fibre/.test(name)
}

const sugarAlcoholMatcher = (nutrient: UsdaNutrient) => {
  const name = nutrientName(nutrient)
  const id = nutrientId(nutrient)
  const number = nutrientNumber(nutrient)
  return id === 1086 || number === '1086' || /sugar alcohol|sugar alcohols|polyol/.test(name)
}

const per100gOption = (): ServingOption => ({
  id: 'per-100g',
  label: '100g reference',
  quantity: 100,
  unit: 'g',
  grams: 100,
  multiplierFromBase: 1,
  source: 'per100g',
})

const customGramsOption = (): ServingOption => ({
  id: 'custom-grams',
  label: 'Custom grams',
  quantity: 100,
  unit: 'g',
  grams: 100,
  source: 'custom',
})

const optionLabelWithGrams = (label: string, grams?: number) =>
  grams ? `${label} (${Math.round(grams)}g)` : label

const servingOptionsForFood = (food: UsdaFood): { options: ServingOption[]; warnings: string[] } => {
  const options: ServingOption[] = []
  const warnings: string[] = []
  const servingSizeGrams = gramsFromServingSize(food.servingSize, food.servingSizeUnit)
  const householdServing = cleanText(food.householdServingFullText)
  const servingUnit = food.servingSizeUnit?.trim() || 'serving'

  if (servingSizeGrams) {
    options.push({
      id: 'label-serving',
      label: optionLabelWithGrams(householdServing || `${food.servingSize}${servingUnit}`, servingSizeGrams),
      quantity: 1,
      unit: householdServing || servingUnit,
      grams: servingSizeGrams,
      multiplierFromBase: servingSizeGrams / 100,
      source: householdServing ? 'household' : 'label',
      isDefault: true,
    })
  } else if (food.dataType?.toLowerCase().includes('branded')) {
    warnings.push('Serving unclear; verify label.')
  }

  ;(food.foodPortions ?? [])
    .filter((portion) => Number.isFinite(portion.gramWeight ?? NaN))
    .slice(0, 8)
    .forEach((portion, index) => {
      const unit = cleanText(portion.measureUnit?.abbreviation || portion.measureUnit?.name || portion.modifier) ?? 'serving'
      const quantity = numberValue(portion.amount) ?? 1
      const labelText = cleanText(portion.portionDescription || portion.modifier || `${quantity} ${unit}`) ?? `${quantity} ${unit}`
      const grams = Number(portion.gramWeight)
      options.push({
        id: `portion-${portion.id ?? index}`,
        label: optionLabelWithGrams(labelText, grams),
        quantity,
        unit,
        grams,
        multiplierFromBase: grams / 100,
        source: 'common',
        isDefault: !options.some((option) => option.isDefault),
      })
    })

  if (!options.length && !food.dataType?.toLowerCase().includes('branded')) {
    warnings.push('Portion data is missing; use 100g or custom grams.')
  }

  return {
    options: [...options, per100gOption(), customGramsOption()],
    warnings,
  }
}

export const parseUsdaFoodDetail = (food: UsdaFood): NormalizedFoodDetail | null => {
  const candidate = parseUsdaCandidate(food)
  if (!candidate) {
    return null
  }

  const totalCarbohydrateGrams = findNutrient(food, totalCarbohydrateMatcher)
  const fiberGrams = findNutrient(food, fiberMatcher)
  const sugarAlcoholGrams = findNutrient(food, sugarAlcoholMatcher)
  const { options, warnings } = servingOptionsForFood(food)
  if (food.dataType?.toLowerCase().includes('branded')) {
    warnings.push('Branded food may require label verification.')
  }

  return {
    candidate,
    baseServing: {
      label: '100g reference',
      grams: 100,
      quantity: 100,
      unit: 'g',
    },
    nutrientsForBaseServing: {
      totalCarbohydrateGrams,
      fiberGrams,
      sugarAlcoholGrams,
    },
    servingOptions: options,
    attributionText: 'USDA FoodData Central',
    warnings,
    raw: food,
  }
}

export const searchUsdaFoods = async (query: string, options: FoodLookupOptions): Promise<NormalizedFoodCandidate[]> => {
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

  const candidates = (json.foods ?? [])
    .map((food) => parseUsdaCandidate(food))
    .filter((food): food is NormalizedFoodCandidate => Boolean(food))

  return rankUsdaCandidates(trimmed, candidates)
}

export const getUsdaFoodDetails = async (
  fdcId: string,
  options: FoodLookupOptions,
): Promise<NormalizedFoodDetail | null> => {
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

  return parseUsdaFoodDetail((await response.json()) as UsdaFood)
}
