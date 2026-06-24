import { exerciseDemoCatalog } from './exerciseDemoCatalog'

export type VerifiedExerciseSourceType = 'youtube' | 'externalPage' | 'both' | 'needsReview'

export interface VerifiedExerciseSource {
  exerciseId: string
  provider: string
  sourceType: VerifiedExerciseSourceType
  url: string
  embedUrl?: string
  title: string
  reviewer: string
  reviewedDate: string
  notes: string
  qualityStatus: 'verified' | 'needsReview' | 'rejected'
}

export const verifiedExerciseSources: VerifiedExerciseSource[] = exerciseDemoCatalog.map((media) => ({
  exerciseId: media.exerciseId,
  provider: media.provider,
  sourceType:
    media.qualityStatus === 'needsReview'
      ? 'needsReview'
      : media.kind === 'youtubeEmbed'
      ? 'youtube'
      : media.kind === 'externalHowTo'
      ? 'externalPage'
      : 'needsReview',
  url: media.sourcePageUrl ?? media.url,
  embedUrl: media.embedUrl,
  title: media.title,
  reviewer: media.reviewedBy,
  reviewedDate: media.reviewedAtISO,
  notes:
    media.qualityStatus === 'verified'
      ? media.attributionText
      : media.rejectionReason ?? 'Needs manual source review before embedding or recommending as primary media.',
  qualityStatus: media.qualityStatus,
}))

export const verifiedExerciseDemoSources = verifiedExerciseSources.filter((source) => source.qualityStatus === 'verified')
export const needsReviewExerciseSources = verifiedExerciseSources.filter((source) => source.qualityStatus === 'needsReview')
