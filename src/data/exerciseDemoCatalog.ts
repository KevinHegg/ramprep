import type { ExerciseDemoMedia } from '../types'
import {
  demoCatalogReviewedAtISO,
  demoCatalogReviewer,
  exerciseMediaSources,
  priorityExerciseIds,
  type ExerciseMediaSource,
} from './verifiedExerciseSources'

export { demoCatalogReviewedAtISO, demoCatalogReviewer, priorityExerciseIds }
export type { PriorityExerciseId } from './verifiedExerciseSources'

const kindForSource = (source: ExerciseMediaSource): ExerciseDemoMedia['kind'] => {
  if (source.qualityStatus !== 'verified') {
    return 'none'
  }
  if (source.sourceKind === 'youtubeVideo') {
    return 'youtubeEmbed'
  }
  if (source.sourceKind === 'externalVideo') {
    return 'externalVideo'
  }
  if (source.sourceKind === 'externalArticle') {
    return 'externalHowTo'
  }
  if (source.sourceKind === 'checklist') {
    return 'checklist'
  }
  return 'none'
}

export const exerciseDemoCatalog: ExerciseDemoMedia[] = exerciseMediaSources.map((source) => ({
  id: source.id.replace('media-', 'demo-'),
  exerciseId: source.exerciseId,
  kind: kindForSource(source),
  title: source.title,
  provider: source.provider,
  url: source.directUrl,
  embedUrl: source.embedUrl,
  youtubeVideoId: source.youtubeVideoId,
  sourcePageUrl: source.directUrl || undefined,
  licenseName: source.licenseNote,
  attributionText: source.attributionText,
  reviewedBy: source.reviewedBy,
  reviewedAtISO: source.reviewedAtISO,
  qualityStatus: source.qualityStatus,
  rejectionReason: source.qualityStatus === 'needsReview' ? source.statusReason : undefined,
  offlineAvailable: false,
}))

const demoByExerciseId = new Map(exerciseDemoCatalog.map((media) => [media.exerciseId, media]))

export const getExerciseDemoMedia = (exerciseId: string) => demoByExerciseId.get(exerciseId)

export const isVerifiedDemoMedia = (media?: ExerciseDemoMedia) =>
  Boolean(media && media.qualityStatus === 'verified' && media.kind !== 'none' && media.kind !== 'freeExerciseDbImage')

export const isVerifiedVideoDemoMedia = (media?: ExerciseDemoMedia) =>
  Boolean(isVerifiedDemoMedia(media) && (media?.kind === 'youtubeEmbed' || media?.kind === 'externalVideo'))

export const isVerifiedArticleDemoMedia = (media?: ExerciseDemoMedia) =>
  Boolean(isVerifiedDemoMedia(media) && media?.kind === 'externalHowTo')

export const isChecklistDemoMedia = (media?: ExerciseDemoMedia) =>
  Boolean(isVerifiedDemoMedia(media) && media?.kind === 'checklist')

export type DemoLearningAction = 'Watch' | 'Read' | 'Checklist' | 'How' | 'Needs review'

export const learningActionForDemoMedia = (media?: ExerciseDemoMedia, options: { allowLocalFallback?: boolean } = {}): DemoLearningAction => {
  if (isVerifiedVideoDemoMedia(media)) {
    return 'Watch'
  }
  if (isVerifiedArticleDemoMedia(media)) {
    return 'Read'
  }
  if (isChecklistDemoMedia(media)) {
    return 'Checklist'
  }
  return options.allowLocalFallback ? 'How' : 'Needs review'
}

export const verifiedExerciseDemoMedia = exerciseDemoCatalog.filter(isVerifiedDemoMedia)
export const needsReviewExerciseDemoMedia = exerciseDemoCatalog.filter((media) => media.qualityStatus === 'needsReview')
