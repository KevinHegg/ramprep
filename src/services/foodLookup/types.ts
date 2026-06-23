import type { CarbSourceType } from '../../types'

export type FoodLookupSource = 'usda' | 'openFoodFacts'

export interface FoodLookupResult {
  id: string
  source: FoodLookupSource
  sourceType: Extract<CarbSourceType, 'usda' | 'openFoodFacts'>
  sourceId: string
  name: string
  brand?: string
  servingSize?: string
  totalCarbohydrateGrams?: number
  dietaryFiberGrams?: number
  sugarAlcoholGrams?: number
  netCarbs: number
  formula: string
  servingWarning?: string
  attribution: string
}

export interface FoodLookupOptions {
  apiKey?: string
  subtractSugarAlcoholsWhenAvailable?: boolean
  signal?: AbortSignal
}

export class FoodLookupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FoodLookupError'
  }
}
