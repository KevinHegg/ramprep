export type FoodLookupSource = 'usda' | 'nutritionix' | 'openFoodFacts' | 'manual'

export type LookupSearchSource = Exclude<FoodLookupSource, 'manual'>

export interface NormalizedFoodCandidate {
  id: string
  source: FoodLookupSource
  sourceId: string
  name: string
  brandName?: string
  dataType?: string
  description?: string
  servingLabel?: string
  servingSizeGrams?: number
  hasDetailEndpoint: boolean
  confidence?: 'high' | 'medium' | 'low'
  warnings?: string[]
}

export interface ServingOption {
  id: string
  label: string
  quantity: number
  unit: string
  grams?: number
  multiplierFromBase?: number
  source: 'label' | 'household' | 'common' | 'per100g' | 'custom'
  isDefault?: boolean
  warning?: string
}

export interface NormalizedFoodDetail {
  candidate: NormalizedFoodCandidate
  baseServing: {
    label: string
    grams?: number
    quantity?: number
    unit?: string
  }
  nutrientsForBaseServing: {
    totalCarbohydrateGrams?: number
    fiberGrams?: number
    sugarAlcoholGrams?: number
  }
  servingOptions: ServingOption[]
  attributionText: string
  warnings: string[]
  raw?: unknown
}

export interface NetCarbCalculation {
  selectedServing: ServingOption
  quantity: number
  totalCarbs: number
  fiber: number
  sugarAlcohols?: number
  subtractSugarAlcohols: boolean
  netCarbsDecimal: number
  netCarbsRounded: number
  formulaLabel: string
  warnings: string[]
}

export interface FoodLookupOptions {
  apiKey?: string
  appId?: string
  appKey?: string
  subtractSugarAlcoholsWhenAvailable?: boolean
  signal?: AbortSignal
}

export class FoodLookupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FoodLookupError'
  }
}
