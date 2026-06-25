import { seedExercises } from './seed'
import { exerciseMediaSources, priorityExerciseIds, type ExerciseMediaSource } from './verifiedExerciseSources'
import {
  defaultLibraryExerciseIds,
  isDefaultVisibleExerciseId,
  optionalSearchOnlyExerciseIds,
  trainingItemKindForExercise,
  trainingItemKindForExerciseId,
  type TrainingItemKind,
} from './trainingTaxonomy'
import {
  behaviorForExerciseSource,
  isGenericVerifiedUrl,
  validateExerciseSources,
  type ExerciseSourceBehavior,
} from '../utils/validateExerciseSources'

export interface MediaCoverageRow {
  exerciseId: string
  exerciseName: string
  kind: TrainingItemKind
  defaultVisible: boolean
  sourceType: ExerciseMediaSource['sourceKind']
  provider: string
  title: string
  behavior: ExerciseSourceBehavior
  directUrl: string
  reviewedAtISO: string
  lastCheckedAtISO: string
  status: ExerciseMediaSource['qualityStatus']
  statusReason: string
  issue: string
}

const exerciseById = new Map(seedExercises.map((exercise) => [exercise.id, exercise]))
const exerciseNameById = new Map(seedExercises.map((exercise) => [exercise.id, exercise.name]))
const sourceByExerciseId = new Map(exerciseMediaSources.map((source) => [source.exerciseId, source]))
const issueByExerciseId = new Map<string, string[]>()

for (const issue of validateExerciseSources(exerciseMediaSources)) {
  issueByExerciseId.set(issue.exerciseId, [...(issueByExerciseId.get(issue.exerciseId) ?? []), issue.message])
}

const matrixExerciseIds = Array.from(
  new Set([
    ...priorityExerciseIds,
    ...defaultLibraryExerciseIds,
  ]),
).sort((left, right) => (exerciseNameById.get(left) ?? left).localeCompare(exerciseNameById.get(right) ?? right))

export const mediaCoverageRows: MediaCoverageRow[] = matrixExerciseIds.map((exerciseId) => {
  const source = sourceByExerciseId.get(exerciseId)
  const exercise = exerciseById.get(exerciseId)
  const kind = exercise ? trainingItemKindForExercise(exercise) : trainingItemKindForExerciseId(exerciseId)
  const defaultVisible = isDefaultVisibleExerciseId(exerciseId)

  return {
    exerciseId,
    exerciseName: exerciseNameById.get(exerciseId) ?? exerciseId,
    kind,
    defaultVisible,
    sourceType: source?.sourceKind ?? 'none',
    provider: source?.provider ?? 'RampRep review queue',
    title: source?.title ?? 'No source attached',
    behavior: behaviorForExerciseSource(source),
    directUrl: source?.directUrl ?? '',
    reviewedAtISO: source?.reviewedAtISO ?? '',
    lastCheckedAtISO: source?.lastCheckedAtISO ?? '',
    status: source?.qualityStatus ?? 'needsReview',
    statusReason: source?.statusReason ?? 'No source record exists yet.',
    issue: issueByExerciseId.get(exerciseId)?.join(' ') ?? '',
  }
})

export const defaultVisibleMediaCoverageRows = mediaCoverageRows.filter((row) => row.defaultVisible)
export const movementMediaCoverageRows = mediaCoverageRows.filter((row) => row.kind === 'movementExercise' && !optionalSearchOnlyExerciseIds.has(row.exerciseId))
export const activitySessionMediaCoverageRows = mediaCoverageRows.filter((row) => row.kind === 'activitySession')
export const optionalSearchOnlyMediaCoverageRows = mediaCoverageRows.filter((row) => optionalSearchOnlyExerciseIds.has(row.exerciseId))
export const needsReviewMediaCoverageRows = mediaCoverageRows.filter((row) => row.status === 'needsReview')

export const mediaCoverageSummary = {
  movementVideoCount: mediaCoverageRows.filter((row) => row.kind === 'movementExercise' && (row.sourceType === 'youtubeVideo' || row.sourceType === 'externalVideo')).length,
  movementArticleCount: mediaCoverageRows.filter((row) => row.kind === 'movementExercise' && row.sourceType === 'externalArticle').length,
  movementMissingSourceCount: defaultVisibleMediaCoverageRows.filter((row) => row.kind === 'movementExercise' && row.behavior === 'needsReview').length,
  activityChecklistCount: mediaCoverageRows.filter((row) => row.kind === 'activitySession' && row.sourceType === 'checklist').length,
  genericUrlCount: mediaCoverageRows.filter((row) => row.directUrl && isGenericVerifiedUrl(row.directUrl)).length,
}
