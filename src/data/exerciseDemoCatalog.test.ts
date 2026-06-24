import { describe, expect, it } from 'vitest'
import {
  exerciseDemoCatalog,
  getExerciseDemoMedia,
  isVerifiedDemoMedia,
  needsReviewExerciseDemoMedia,
  priorityExerciseIds,
} from './exerciseDemoCatalog'
import { needsReviewExerciseSources, verifiedExerciseDemoSources, verifiedExerciseSources } from './verifiedExerciseSources'

describe('exercise demo catalog', () => {
  it('has a catalog entry for every priority exercise', () => {
    const catalogIds = new Set(exerciseDemoCatalog.map((media) => media.exerciseId))

    expect(priorityExerciseIds.every((exerciseId) => catalogIds.has(exerciseId))).toBe(true)
  })

  it('does not use fake SVG media as primary demo media', () => {
    const primaryKinds = exerciseDemoCatalog.map((media) => media.kind)

    expect(primaryKinds).not.toContain('freeExerciseDbImage')
    expect(exerciseDemoCatalog.some((media) => media.id.includes('svg') || media.url.includes('svg'))).toBe(false)
  })

  it('shows missing media as needing review', () => {
    const tibialisRaise = getExerciseDemoMedia('tibialis-raise')

    expect(tibialisRaise?.qualityStatus).toBe('needsReview')
    expect(isVerifiedDemoMedia(tibialisRaise)).toBe(false)
    expect(tibialisRaise?.attributionText).toContain('No reviewed in-app motion demo yet')
    expect(needsReviewExerciseDemoMedia.length).toBeGreaterThan(0)
  })

  it('publishes curated source records without upgrading unreviewed media', () => {
    const sourceIds = new Set(verifiedExerciseSources.map((source) => source.exerciseId))

    expect(priorityExerciseIds.every((exerciseId) => sourceIds.has(exerciseId))).toBe(true)
    expect(verifiedExerciseDemoSources.every((source) => source.qualityStatus === 'verified')).toBe(true)
    expect(needsReviewExerciseSources.some((source) => source.exerciseId === 'tibialis-raise')).toBe(true)
  })
})
