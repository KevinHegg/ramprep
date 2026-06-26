import { describe, expect, it } from 'vitest'
import {
  defaultVisibleMediaCoverageRows,
  mediaCoverageRows,
  mediaCoverageSummary,
  needsReviewMediaCoverageRows,
  defaultMovementVideoCoveragePercent,
} from './mediaCoverageMatrix'

describe('media coverage matrix', () => {
  it('covers default-visible movements with verified videos and activities with checklists', () => {
    expect(defaultVisibleMediaCoverageRows.length).toBeGreaterThan(30)
    expect(
      defaultVisibleMediaCoverageRows
        .filter((row) => row.kind === 'movementExercise')
        .every((row) => row.behavior === 'watch' && row.sourceType === 'youtubeVideo'),
    ).toBe(true)
    expect(
      defaultVisibleMediaCoverageRows
        .filter((row) => row.kind === 'activitySession')
        .every((row) => row.behavior === 'checklist'),
    ).toBe(true)
    expect(defaultVisibleMediaCoverageRows.every((row) => row.status === 'verified')).toBe(true)
    expect(defaultMovementVideoCoveragePercent).toBe(100)
    expect(mediaCoverageSummary.defaultMovementVideoCount).toBe(mediaCoverageSummary.defaultMovementCount)
    expect(mediaCoverageSummary.movementMissingSourceCount).toBe(0)
    expect(mediaCoverageSummary.movementArticleCount).toBe(0)
    expect(mediaCoverageSummary.genericUrlCount).toBe(0)
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
      const row = mediaCoverageRows.find((row) => row.exerciseId === exerciseId)

      expect(row?.kind).toBe('activitySession')
      expect(row?.behavior).toBe('checklist')
      expect(row?.sourceType).toBe('checklist')
    }
  })

  it('keeps remaining needs-review rows optional or search-only', () => {
    expect(needsReviewMediaCoverageRows.length).toBeGreaterThan(0)
    expect(needsReviewMediaCoverageRows.every((row) => !row.defaultVisible)).toBe(true)
    expect(needsReviewMediaCoverageRows.every((row) => row.kind === 'movementExercise')).toBe(true)
  })
})
