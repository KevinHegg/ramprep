import { FoodLookupError, type NormalizedFoodCandidate, type NormalizedFoodDetail, type ServingOption } from './types'

const OPEN_FOOD_FACTS_BASE_URL = 'https://world.openfoodfacts.org'
const OPEN_FOOD_FACTS_USER_AGENT = 'RAMprep/0.0.0 (kevinhegg@gmail.com)'

type OpenFoodFactsNutriments = {
  carbohydrates_serving?: number
  carbohydrates_100g?: number
  fiber_serving?: number
  fiber_100g?: number
  'sugar-alcohol_serving'?: number
  'sugar-alcohol_100g'?: number
  'sugar-alcohols_serving'?: number
  'sugar-alcohols_100g'?: number
}

type OpenFoodFactsProduct = {
  code?: string
  product_name?: string
  brands?: string
  serving_size?: string
  nutriments?: OpenFoodFactsNutriments
}

type OpenFoodFactsBarcodeResponse = {
  status?: number
  product?: OpenFoodFactsProduct
}

type OpenFoodFactsSearchResponse = {
  products?: OpenFoodFactsProduct[]
}

const numberValue = (value?: number) => (Number.isFinite(value ?? NaN) ? Number(value) : undefined)

const cleanText = (value?: string) => value?.replace(/\s+/g, ' ').trim()

const gramsFromServingText = (serving?: string) => {
  const text = serving?.toLowerCase()
  if (!text) {
    return undefined
  }

  const gramsMatch = text.match(/(\d+(?:\.\d+)?)\s*g\b/)
  if (gramsMatch) {
    return Number(gramsMatch[1])
  }

  const ounceMatch = text.match(/(\d+(?:\.\d+)?)\s*oz\b/)
  if (ounceMatch) {
    return Number(ounceMatch[1]) * 28.349523125
  }

  return undefined
}

const per100gOption = (baseGrams?: number): ServingOption => ({
  id: 'per-100g',
  label: '100g',
  quantity: 100,
  unit: 'g',
  grams: 100,
  multiplierFromBase: baseGrams ? 100 / baseGrams : 1,
  source: 'per100g',
  isDefault: !baseGrams,
})

const customGramsOption = (): ServingOption => ({
  id: 'custom-grams',
  label: 'Custom grams',
  quantity: 100,
  unit: 'g',
  grams: 100,
  source: 'custom',
})

const labelWithGrams = (label: string, grams?: number) => (grams ? `${label} (${Math.round(grams)}g)` : label)

export const parseOpenFoodFactsProduct = (product: OpenFoodFactsProduct): NormalizedFoodDetail | null => {
  const name = cleanText(product.product_name)
  const sourceId = cleanText(product.code)
  if (!name || !sourceId) {
    return null
  }

  const servingLabel = cleanText(product.serving_size)
  const servingGrams = gramsFromServingText(servingLabel)
  const nutriments = product.nutriments ?? {}
  const hasServingNutrients = Number.isFinite(nutriments.carbohydrates_serving ?? NaN)
  const baseGrams = hasServingNutrients ? servingGrams : 100
  const warnings = ['Open Food Facts is crowdsourced; verify the package label.']

  if (!servingLabel || !servingGrams) {
    warnings.push('Serving unclear; use custom grams or verify the package label.')
  }

  const candidate: NormalizedFoodCandidate = {
    id: `openFoodFacts-${sourceId}`,
    source: 'openFoodFacts',
    sourceId,
    name,
    brandName: cleanText(product.brands),
    dataType: 'Packaged product',
    servingLabel,
    servingSizeGrams: servingGrams,
    hasDetailEndpoint: false,
    confidence: servingGrams ? 'medium' : 'low',
    warnings,
  }

  const servingOptions: ServingOption[] = []
  if (servingLabel && servingGrams) {
    servingOptions.push({
      id: 'label-serving',
      label: labelWithGrams(servingLabel, servingGrams),
      quantity: 1,
      unit: servingLabel,
      grams: servingGrams,
      multiplierFromBase: hasServingNutrients ? 1 : servingGrams / 100,
      source: 'label',
      isDefault: true,
    })
  }

  servingOptions.push(per100gOption(baseGrams), customGramsOption())

  return {
    candidate,
    baseServing: {
      label: hasServingNutrients ? (servingLabel ?? 'label serving') : '100g',
      grams: baseGrams,
      quantity: hasServingNutrients ? 1 : 100,
      unit: hasServingNutrients ? (servingLabel ?? 'serving') : 'g',
    },
    nutrientsForBaseServing: {
      totalCarbohydrateGrams: hasServingNutrients ? numberValue(nutriments.carbohydrates_serving) : numberValue(nutriments.carbohydrates_100g),
      fiberGrams: hasServingNutrients ? numberValue(nutriments.fiber_serving) : numberValue(nutriments.fiber_100g),
      sugarAlcoholGrams: hasServingNutrients
        ? numberValue(nutriments['sugar-alcohol_serving'] ?? nutriments['sugar-alcohols_serving'])
        : numberValue(nutriments['sugar-alcohol_100g'] ?? nutriments['sugar-alcohols_100g']),
    },
    servingOptions,
    attributionText: 'Open Food Facts',
    warnings,
    raw: product,
  }
}

const fetchOpenFoodFactsJson = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': OPEN_FOOD_FACTS_USER_AGENT,
    },
    signal,
  })
  if (!response.ok) {
    throw new FoodLookupError(`Open Food Facts lookup failed (${response.status}).`)
  }
  return (await response.json()) as T
}

export const searchOpenFoodFactsProducts = async ({
  query,
  barcode,
  signal,
}: {
  query?: string
  barcode?: string
  signal?: AbortSignal
}): Promise<NormalizedFoodDetail[]> => {
  const trimmedBarcode = barcode?.trim()
  const trimmedQuery = query?.trim()

  if (trimmedBarcode) {
    const params = new URLSearchParams({
      fields: 'code,product_name,brands,serving_size,nutriments',
    })
    const body = await fetchOpenFoodFactsJson<OpenFoodFactsBarcodeResponse>(
      `${OPEN_FOOD_FACTS_BASE_URL}/api/v2/product/${encodeURIComponent(trimmedBarcode)}.json?${params.toString()}`,
      signal,
    )
    const detail = body.status === 1 && body.product ? parseOpenFoodFactsProduct(body.product) : null
    return detail ? [detail] : []
  }

  if (!trimmedQuery) {
    return []
  }

  const params = new URLSearchParams({
    search_terms: trimmedQuery,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '8',
    fields: 'code,product_name,brands,serving_size,nutriments',
  })
  const body = await fetchOpenFoodFactsJson<OpenFoodFactsSearchResponse>(
    `${OPEN_FOOD_FACTS_BASE_URL}/cgi/search.pl?${params.toString()}`,
    signal,
  )
  return (body.products ?? [])
    .map((product) => parseOpenFoodFactsProduct(product))
    .filter((detail): detail is NormalizedFoodDetail => Boolean(detail))
}
