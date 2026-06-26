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

  it('maps source records to lowercase learning behavior contracts', () => {
    expect(behaviorForExerciseSource({ sourceKind: 'youtubeVideo', qualityStatus: 'verified' })).toBe('watch')
    expect(behaviorForExerciseSource({ sourceKind: 'externalVideo', qualityStatus: 'verified' })).toBe('watch')
    expect(behaviorForExerciseSource({ sourceKind: 'externalArticle', qualityStatus: 'verified' })).toBe('read')
    expect(behaviorForExerciseSource({ sourceKind: 'checklist', qualityStatus: 'verified' })).toBe('checklist')
    expect(behaviorForExerciseSource({ sourceKind: 'none', qualityStatus: 'needsReview' })).toBe('needsReview')
  })

  it('rejects article-only coverage for default movement exercises', () => {
    const issues = validateExerciseSources([baseSource], { defaultExerciseIds: ['dead-bug'], optionalExerciseIds: [] })

    expect(issues.some((issue) => issue.message.includes('Default visible movement exercises need verified direct video coverage'))).toBe(true)
  })

  it('rejects local checklists as movement exercise media', () => {
    const issues = validateExerciseSources(
      [
        {
          ...baseSource,
          sourceKind: 'checklist',
          directUrl: '',
        },
      ],
      { defaultExerciseIds: ['dead-bug'], optionalExerciseIds: [] },
    )

    expect(issues.some((issue) => issue.message.includes('Movement exercises cannot use a local checklist'))).toBe(true)
    expect(issues.some((issue) => issue.message.includes('Default visible movement exercises need verified direct video coverage'))).toBe(true)
  })

  it('rejects Watch or Read sources for activity sessions', () => {
    const issues = validateExerciseSources(
      [
        {
          ...baseSource,
          exerciseId: 'commute-walk',
        },
      ],
      { defaultExerciseIds: ['commute-walk'], optionalExerciseIds: [] },
    )

    expect(issues.some((issue) => issue.message.includes('Activity sessions use local checklists/logging only'))).toBe(true)
    expect(issues.some((issue) => issue.message.includes('Default visible activity sessions need verified local checklist/logging coverage'))).toBe(true)
  })
})
