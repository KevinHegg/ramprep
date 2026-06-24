export const WATER_LITER_POUNDS = 2.2

export interface RuckLoadParts {
  waterLiters?: number
  emptyPackWeight?: number
  extraWeight?: number
}

export const calculateRuckLoadPounds = ({ waterLiters = 0, emptyPackWeight = 0, extraWeight = 0 }: RuckLoadParts) =>
  Math.max(0, Math.round((waterLiters * WATER_LITER_POUNDS + emptyPackWeight + extraWeight) * 10) / 10)

export const ruckLoadNotice = (discomfort?: number) => {
  if ((discomfort ?? 0) >= 4) {
    return 'Reduce load or duration next time. Stop for pain, numbness, tingling, gait change, or sharp hotspots.'
  }
  return 'Build gradually. A 12L rucksack is capacity, not a target load.'
}
