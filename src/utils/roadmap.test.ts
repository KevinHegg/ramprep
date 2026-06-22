import { describe, expect, it } from 'vitest'
import { seedRoadmap } from '../data/seed'
import { shouldSuggestLighterWeek, toggleRoadmapMilestone } from './roadmap'

describe('roadmap utilities', () => {
  it('marks milestones complete without changing other milestones', () => {
    const updated = toggleRoadmapMilestone(seedRoadmap, 'mile-foundation-1', true, '2026-06-22T12:00:00.000Z')

    expect(updated.milestones.find((milestone) => milestone.id === 'mile-foundation-1')).toMatchObject({
      completed: true,
      completedAt: '2026-06-22T12:00:00.000Z',
    })
    expect(updated.milestones.find((milestone) => milestone.id === 'mile-foundation-2')?.completed).toBe(false)
  })

  it('suggests a lighter week after missed sessions, soreness, or conflicts', () => {
    expect(shouldSuggestLighterWeek({ missedSessions: 2, soreness: false, conflicts: 0 })).toBe(true)
    expect(shouldSuggestLighterWeek({ missedSessions: 0, soreness: true, conflicts: 0 })).toBe(true)
    expect(shouldSuggestLighterWeek({ missedSessions: 0, soreness: false, conflicts: 1 })).toBe(true)
    expect(shouldSuggestLighterWeek({ missedSessions: 1, soreness: false, conflicts: 0 })).toBe(false)
  })

  it('keeps new export fields JSON-serializable', () => {
    const exported = JSON.parse(
      JSON.stringify({
        schemaVersion: 2,
        data: {
          personalExerciseDefaults: [],
          exerciseMedia: [],
          roadmap: seedRoadmap,
        },
      }),
    )

    expect(exported.data).toHaveProperty('personalExerciseDefaults')
    expect(exported.data).toHaveProperty('exerciseMedia')
    expect(exported.data.roadmap.milestones.length).toBeGreaterThan(0)
  })
})
