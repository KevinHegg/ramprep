import type { NetCarbCalculation, NormalizedFoodDetail, ServingOption } from './types'

export interface NetCarbInputs {
  totalCarbohydrateGrams?: number
  dietaryFiberGrams?: number
  sugarAlcoholGrams?: number
  subtractSugarAlcoholsWhenAvailable?: boolean
}

export interface SimpleNetCarbCalculation {
  netCarbs: number
  formula: string
  hasExplicitSugarAlcohols: boolean
}

const grams = (value?: number) => (Number.isFinite(value ?? NaN) ? Number(value) : 0)
const roundOne = (value: number) => Math.round(value * 10) / 10
const formatGram = (value: number) => (Number.isInteger(roundOne(value)) ? String(Math.round(value)) : String(roundOne(value)))

export const calculateNetCarbs = ({
  totalCarbohydrateGrams,
  dietaryFiberGrams,
  sugarAlcoholGrams,
  subtractSugarAlcoholsWhenAvailable = false,
}: NetCarbInputs): SimpleNetCarbCalculation => {
  const total = grams(totalCarbohydrateGrams)
  const fiber = grams(dietaryFiberGrams)
  const sugarAlcohol = grams(sugarAlcoholGrams)
  const useSugarAlcohol = subtractSugarAlcoholsWhenAvailable && sugarAlcoholsAreExplicit(sugarAlcoholGrams)
  const netCarbs = Math.max(0, Math.round(total - fiber - (useSugarAlcohol ? sugarAlcohol : 0)))
  const formula = useSugarAlcohol
    ? `Total carbs ${total}g - fiber ${fiber}g - sugar alcohols ${sugarAlcohol}g = ${netCarbs}g net`
    : `Total carbs ${total}g - fiber ${fiber}g = ${netCarbs}g net`

  return { netCarbs, formula, hasExplicitSugarAlcohols: sugarAlcoholsAreExplicit(sugarAlcoholGrams) }
}

export const sugarAlcoholsAreExplicit = (value?: number) => Number.isFinite(value ?? NaN)

const multiplierForServing = (detail: NormalizedFoodDetail, selectedServing: ServingOption) => {
  if (Number.isFinite(selectedServing.multiplierFromBase ?? NaN)) {
    return selectedServing.multiplierFromBase ?? 1
  }

  if (selectedServing.grams && detail.baseServing.grams) {
    return selectedServing.grams / detail.baseServing.grams
  }

  return 1
}

export const calculateServingNetCarbs = ({
  detail,
  selectedServing,
  quantity,
  subtractSugarAlcoholsWhenAvailable = false,
}: {
  detail: NormalizedFoodDetail
  selectedServing: ServingOption
  quantity: number
  subtractSugarAlcoholsWhenAvailable?: boolean
}): NetCarbCalculation => {
  const warnings = [...detail.warnings]
  const multiplier = multiplierForServing(detail, selectedServing) * Math.max(0, quantity)
  const totalCarbs = grams(detail.nutrientsForBaseServing.totalCarbohydrateGrams) * multiplier
  const fiber = grams(detail.nutrientsForBaseServing.fiberGrams) * multiplier
  const sugarAlcoholsExplicit = sugarAlcoholsAreExplicit(detail.nutrientsForBaseServing.sugarAlcoholGrams)
  const sugarAlcohols = sugarAlcoholsExplicit ? grams(detail.nutrientsForBaseServing.sugarAlcoholGrams) * multiplier : undefined
  const subtractSugarAlcohols = subtractSugarAlcoholsWhenAvailable && sugarAlcoholsExplicit
  const netCarbsDecimal = Math.max(0, totalCarbs - fiber - (subtractSugarAlcohols ? (sugarAlcohols ?? 0) : 0))
  const netCarbsRounded = Math.round(netCarbsDecimal)
  const formulaLabel = subtractSugarAlcohols
    ? `Total carbs ${formatGram(totalCarbs)}g - fiber ${formatGram(fiber)}g - sugar alcohols ${formatGram(sugarAlcohols ?? 0)}g = ${formatGram(netCarbsDecimal)}g net`
    : `Total carbs ${formatGram(totalCarbs)}g - fiber ${formatGram(fiber)}g = ${formatGram(netCarbsDecimal)}g net`

  if (!Number.isFinite(detail.nutrientsForBaseServing.totalCarbohydrateGrams ?? NaN)) {
    warnings.push('Total carbohydrate is missing; use manual override or verify the label.')
  }
  if (!Number.isFinite(detail.nutrientsForBaseServing.fiberGrams ?? NaN)) {
    warnings.push('Fiber is missing, so the formula treats fiber as 0g.')
  }
  if (selectedServing.warning) {
    warnings.push(selectedServing.warning)
  }

  return {
    selectedServing,
    quantity,
    totalCarbs,
    fiber,
    sugarAlcohols,
    subtractSugarAlcohols,
    netCarbsDecimal,
    netCarbsRounded,
    formulaLabel,
    warnings: [...new Set(warnings)],
  }
}
