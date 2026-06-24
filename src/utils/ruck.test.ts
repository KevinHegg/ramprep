import { describe, expect, it } from 'vitest'
import { calculateRuckLoadPounds, ruckLoadNotice, WATER_LITER_POUNDS } from './ruck'

describe('ruck utilities', () => {
  it('converts water liters to pounds and includes pack plus extra load', () => {
    expect(WATER_LITER_POUNDS).toBe(2.2)
    expect(calculateRuckLoadPounds({ waterLiters: 2, emptyPackWeight: 2, extraWeight: 5 })).toBe(11.4)
  })

  it('raises a caution notice when discomfort is elevated', () => {
    expect(ruckLoadNotice(4)).toContain('Reduce load')
    expect(ruckLoadNotice(1)).toContain('capacity, not a target load')
  })
})
