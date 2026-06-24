import { describe, expect, it } from 'vitest'
import { exerciseMediaSources, type ExerciseMediaSource } from '../data/verifiedExerciseSources'
import { validateExerciseSources, behaviorForExerciseSource } from './validateExerciseSources'

const baseSource: ExerciseMediaSource = {
  id: 'media-test',
  exerciseId: 'dead-bug',
  sourceKind: 'externalArticle',
  provider: 'Test',
  title: 'Test source',
  directUrl: 'https://example.com/exercises/dead-bug',
  reviewedBy: 'test',
  reviewedAtISO: '2026-06-24T12:00:00.000Z',
  qualityStatus: 'verified',
  statusReason: 'Test source',
  attributionText: 'Test attribution',
  licenseNote: 'Linked only',
  isDefaultLearningSource: true,
  lastCheckedAtISO: '2026-06-24T12:00:00.000Z',
}

describe('exercise source validation', () => {
  it('passes the curated RampRep media catalog', () => {
    expect(validateExerciseSources(exerciseMediaSources)).toEqual([])
  })

  it('rejects generic ACE roots, YouTube search, and provider homepages as verified media', () => {
    const badSources = [
      { ...baseSource, id: 'bad-ace', directUrl: 'https://www.acefitness.org/resources/everyone/exercise-library/' },
      { ...baseSource, id: 'bad-youtube', directUrl: 'https://www.youtube.com/results?search_query=dead+bug' },
      { ...baseSource, id: 'bad-homepage', directUrl: 'https://www.nasm.org/' },
    ]

    const issues = validateExerciseSources(badSources, { defaultExerciseIds: [], optionalExerciseIds: [] })

    expect(issues.filter((issue) => issue.field === 'directUrl')).toHaveLength(3)
  })

  it('requires YouTube video IDs and embed URLs for verified YouTube sources', () => {
    const issues = validateExerciseSources(
      [
        {
          ...baseSource,
          sourceKind: 'youtubeVideo',
          directUrl: 'https://www.youtube.com/watch?v=abc123',
          youtubeVideoId: '',
          embedUrl: '',
        },
      ],
      { defaultExerciseIds: [], optionalExerciseIds: [] },
    )

    expect(issues.map((issue) => issue.field)).toEqual(expect.arrayContaining(['youtubeVideoId', 'embedUrl']))
  })

  it('maps Watch only to video, Read only to article, and Checklist only to checklist', () => {
    expect(behaviorForExerciseSource({ sourceKind: 'youtubeVideo', qualityStatus: 'verified' })).toBe('Watch')
    expect(behaviorForExerciseSource({ sourceKind: 'externalVideo', qualityStatus: 'verified' })).toBe('Watch')
    expect(behaviorForExerciseSource({ sourceKind: 'externalArticle', qualityStatus: 'verified' })).toBe('Read')
    expect(behaviorForExerciseSource({ sourceKind: 'checklist', qualityStatus: 'verified' })).toBe('Checklist')
    expect(behaviorForExerciseSource({ sourceKind: 'none', qualityStatus: 'needsReview' })).toBe('Needs review')
  })
})
