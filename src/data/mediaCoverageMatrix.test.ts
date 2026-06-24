import { describe, expect, it } from 'vitest'
import { defaultVisibleMediaCoverageRows, mediaCoverageRows, needsReviewMediaCoverageRows } from './mediaCoverageMatrix'

describe('media coverage matrix', () => {
  it('covers every default-visible exercise with video, article, or checklist behavior', () => {
    expect(defaultVisibleMediaCoverageRows.length).toBeGreaterThan(30)
    expect(defaultVisibleMediaCoverageRows.every((row) => ['Watch', 'Read', 'Checklist'].includes(row.behavior))).toBe(true)
    expect(defaultVisibleMediaCoverageRows.every((row) => row.status === 'verified')).toBe(true)
  })

  it('keeps ride, walk, ruck, and trailer activities on checklist behavior', () => {
    const checklistIds = [
      'easy-endurance-ride',
      'recovery-spin',
      'hill-repeat-ride',
      'low-cadence-climb-intervals',
      'loaded-gravel-ride',
      'commute-walk',
      'dog-walk',
      'hydration-ruck-walk',
      'ruck-commute',
      'burley-loaded-trailer-ride',
      'controlled-trailer-towing-workout',
    ]

    for (const exerciseId of checklistIds) {
      expect(mediaCoverageRows.find((row) => row.exerciseId === exerciseId)?.behavior).toBe('Checklist')
    }
  })

  it('keeps remaining needs-review rows optional or search-only', () => {
    expect(needsReviewMediaCoverageRows.length).toBeGreaterThan(0)
    expect(needsReviewMediaCoverageRows.every((row) => !row.defaultVisible)).toBe(true)
  })
})
