export interface NetCarbInputs {
  totalCarbohydrateGrams?: number
  dietaryFiberGrams?: number
  sugarAlcoholGrams?: number
  subtractSugarAlcoholsWhenAvailable?: boolean
}

export interface NetCarbCalculation {
  netCarbs: number
  formula: string
  hasExplicitSugarAlcohols: boolean
}

const grams = (value?: number) => (Number.isFinite(value ?? NaN) ? Number(value) : 0)

export const calculateNetCarbs = ({
  totalCarbohydrateGrams,
  dietaryFiberGrams,
  sugarAlcoholGrams,
  subtractSugarAlcoholsWhenAvailable = false,
}: NetCarbInputs): NetCarbCalculation => {
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
