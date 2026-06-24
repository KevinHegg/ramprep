import { describe, expect, it } from 'vitest'
import {
  exerciseDemoCatalog,
  getExerciseDemoMedia,
  isVerifiedDemoMedia,
  isVerifiedVideoDemoMedia,
  needsReviewExerciseDemoMedia,
  priorityExerciseIds,
} from './exerciseDemoCatalog'
import {
  isGenericSourceUrl,
  needsReviewExerciseSources,
  verifiedExerciseDemoSources,
  verifiedExerciseSources,
} from './verifiedExerciseSources'
import { seedExercises } from './seed'
import { defaultLibraryExerciseIds } from './trainingTaxonomy'

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

  it('uses direct source URLs and never generic provider/search roots for verified sources', () => {
    const verifiedSources = verifiedExerciseSources.filter((source) => source.qualityStatus === 'verified')

    expect(verifiedSources.every((source) => source.directUrl && !isGenericSourceUrl(source.directUrl))).toBe(true)
    expect(verifiedSources.every((source) => !source.directUrl.includes('/results?search_query='))).toBe(true)
    expect(
      verifiedSources
        .filter((source) => source.sourceKind === 'youtubeVideo')
        .every((source) => source.youtubeVideoId && source.embedUrl?.startsWith('https://www.youtube.com/embed/')),
    ).toBe(true)
  })

  it('has working Watch media for multiple exercises and explicit disabled states for unreviewed demos', () => {
    expect(isVerifiedVideoDemoMedia(getExerciseDemoMedia('downward-dog'))).toBe(true)
    expect(isVerifiedVideoDemoMedia(getExerciseDemoMedia('dead-bug'))).toBe(true)
    expect(isVerifiedVideoDemoMedia(getExerciseDemoMedia('step-up'))).toBe(true)
    expect(getExerciseDemoMedia('tibialis-raise')?.qualityStatus).toBe('needsReview')
    expect(getExerciseDemoMedia('tibialis-raise')?.url).toBe('')
  })

  it('does not seed generic source references on default library exercises', () => {
    const defaultExercises = seedExercises.filter((exercise) => defaultLibraryExerciseIds.has(exercise.id))
    const urls = defaultExercises.flatMap((exercise) => exercise.sourceReferences?.map((source) => source.url) ?? [])

    expect(urls.every((url) => !isGenericSourceUrl(url))).toBe(true)
  })
})
