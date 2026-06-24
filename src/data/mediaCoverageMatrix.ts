import { seedExercises } from './seed'
import { exerciseMediaSources, priorityExerciseIds, type ExerciseMediaSource } from './verifiedExerciseSources'
import { defaultLibraryExerciseIds, optionalSearchOnlyExerciseIds } from './trainingTaxonomy'
import { behaviorForExerciseSource, type ExerciseSourceBehavior } from '../utils/validateExerciseSources'

export interface MediaCoverageRow {
  exerciseId: string
  exerciseName: string
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
}

const exerciseNameById = new Map(seedExercises.map((exercise) => [exercise.id, exercise.name]))
const sourceByExerciseId = new Map(exerciseMediaSources.map((source) => [source.exerciseId, source]))
const matrixExerciseIds = Array.from(
  new Set([
    ...priorityExerciseIds,
    ...defaultLibraryExerciseIds,
  ]),
).sort((left, right) => (exerciseNameById.get(left) ?? left).localeCompare(exerciseNameById.get(right) ?? right))

export const mediaCoverageRows: MediaCoverageRow[] = matrixExerciseIds.map((exerciseId) => {
  const source = sourceByExerciseId.get(exerciseId)
  const defaultVisible = defaultLibraryExerciseIds.has(exerciseId) && !optionalSearchOnlyExerciseIds.has(exerciseId)

  return {
    exerciseId,
    exerciseName: exerciseNameById.get(exerciseId) ?? exerciseId,
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
  }
})

export const defaultVisibleMediaCoverageRows = mediaCoverageRows.filter((row) => row.defaultVisible)
export const needsReviewMediaCoverageRows = mediaCoverageRows.filter((row) => row.status === 'needsReview')
