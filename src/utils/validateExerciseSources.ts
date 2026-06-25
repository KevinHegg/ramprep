import {
  exerciseMediaSources,
  type ExerciseMediaSource,
  type ExerciseMediaSourceKind,
} from '../data/verifiedExerciseSources'
import {
  defaultLibraryExerciseIds,
  optionalSearchOnlyExerciseIds,
  trainingItemKindForExerciseId,
  type LearningBehavior,
} from '../data/trainingTaxonomy'

export interface ExerciseSourceValidationIssue {
  exerciseId: string
  field: string
  message: string
}

export type ExerciseSourceBehavior = LearningBehavior

const verifiedMovementCoverageKinds = new Set<ExerciseMediaSourceKind>(['youtubeVideo', 'externalVideo', 'externalArticle'])
const videoKinds = new Set<ExerciseMediaSourceKind>(['youtubeVideo', 'externalVideo'])

export const behaviorForExerciseSource = (source?: Pick<ExerciseMediaSource, 'sourceKind' | 'qualityStatus'>): ExerciseSourceBehavior => {
  if (!source || source.qualityStatus !== 'verified') {
    return 'needsReview'
  }
  if (videoKinds.has(source.sourceKind)) {
    return 'watch'
  }
  if (source.sourceKind === 'externalArticle') {
    return 'read'
  }
  if (source.sourceKind === 'checklist') {
    return 'checklist'
  }
  return 'needsReview'
}

export const isGenericVerifiedUrl = (url: string) => {
  const trimmed = url.trim()
  if (!trimmed) {
    return false
  }
  if (/youtube\.com\/results/i.test(trimmed) || /search_query=/i.test(trimmed) || /google\.[^/]+\/search/i.test(trimmed)) {
    return true
  }
  if (/acefitness\.org\/resources\/everyone\/exercise-library\/?$/i.test(trimmed)) {
    return true
  }
  if (/acefitness\.org\/resources\/everyone\/exercise-library\/(?!\d+\/[^/?#]+\/?)/i.test(trimmed)) {
    return true
  }
  if (/nasm\.org\/resource-center\/exercise-library\/?$/i.test(trimmed)) {
    return true
  }
  if (/youtube\.com\/(channel|user|c)\/[^/?#]+\/?$/i.test(trimmed)) {
    return true
  }

  try {
    const parsed = new URL(trimmed)
    const path = parsed.pathname.replace(/\/+$/, '')
    return path === '' || path === '/'
  } catch {
    return true
  }
}

export const validateExerciseSources = (
  sources: ExerciseMediaSource[] = exerciseMediaSources,
  options: {
    defaultExerciseIds?: Iterable<string>
    optionalExerciseIds?: Iterable<string>
  } = {},
): ExerciseSourceValidationIssue[] => {
  const issues: ExerciseSourceValidationIssue[] = []
  const defaultIds = new Set(options.defaultExerciseIds ?? defaultLibraryExerciseIds)
  const optionalIds = new Set(options.optionalExerciseIds ?? optionalSearchOnlyExerciseIds)

  for (const source of sources) {
    const behavior = behaviorForExerciseSource(source)
    const itemKind = trainingItemKindForExerciseId(source.exerciseId)

    if (behavior === 'watch' && !videoKinds.has(source.sourceKind)) {
      issues.push({ exerciseId: source.exerciseId, field: 'sourceKind', message: 'Watch behavior requires video media.' })
    }

    if (itemKind === 'movementExercise' && source.sourceKind === 'checklist' && source.isDefaultLearningSource) {
      issues.push({ exerciseId: source.exerciseId, field: 'sourceKind', message: 'Movement exercises cannot use a local checklist as primary media; add a direct video/article or mark needsReview.' })
    }

    if (itemKind === 'activitySession' && source.isDefaultLearningSource && source.sourceKind !== 'checklist') {
      issues.push({ exerciseId: source.exerciseId, field: 'sourceKind', message: 'Activity sessions use local checklists/logging only, not Watch or Read media.' })
    }

    if (source.qualityStatus !== 'verified') {
      continue
    }

    if (source.sourceKind !== 'checklist' && !source.directUrl.trim()) {
      issues.push({ exerciseId: source.exerciseId, field: 'directUrl', message: 'Verified external sources need a direct URL.' })
    }

    if (source.directUrl && isGenericVerifiedUrl(source.directUrl)) {
      issues.push({ exerciseId: source.exerciseId, field: 'directUrl', message: 'Verified URL must identify one specific exercise or video.' })
    }

    if (source.sourceKind === 'youtubeVideo') {
      if (!source.youtubeVideoId) {
        issues.push({ exerciseId: source.exerciseId, field: 'youtubeVideoId', message: 'Verified YouTube videos need a video ID.' })
      }
      if (!source.embedUrl?.startsWith(`https://www.youtube.com/embed/${source.youtubeVideoId ?? ''}`)) {
        issues.push({ exerciseId: source.exerciseId, field: 'embedUrl', message: 'Verified YouTube videos need the official embed URL.' })
      }
      if (!source.directUrl.includes('watch?v=')) {
        issues.push({ exerciseId: source.exerciseId, field: 'directUrl', message: 'Verified YouTube videos need an exact watch URL.' })
      }
    }
  }

  for (const exerciseId of defaultIds) {
    if (optionalIds.has(exerciseId)) {
      const optionalSource = sources.find((source) => source.exerciseId === exerciseId)
      if (!optionalSource?.statusReason) {
        issues.push({ exerciseId, field: 'statusReason', message: 'Optional/search-only exercises need a demotion reason.' })
      }
      continue
    }

    const itemKind = trainingItemKindForExerciseId(exerciseId)
    const defaultSource = sources.find((source) => source.exerciseId === exerciseId && source.isDefaultLearningSource)

    if (itemKind === 'activitySession') {
      const hasActivityChecklist = Boolean(defaultSource?.qualityStatus === 'verified' && defaultSource.sourceKind === 'checklist')

      if (!hasActivityChecklist) {
        issues.push({ exerciseId, field: 'sourceKind', message: 'Default visible activity sessions need verified local checklist/logging coverage.' })
      }
      continue
    }

    const hasMovementCoverage = Boolean(
      defaultSource &&
        defaultSource.qualityStatus === 'verified' &&
        verifiedMovementCoverageKinds.has(defaultSource.sourceKind),
    )

    if (!hasMovementCoverage) {
      issues.push({ exerciseId, field: 'sourceKind', message: 'Default visible movement exercises need verified direct video or article coverage.' })
    }
  }

  return issues
}
