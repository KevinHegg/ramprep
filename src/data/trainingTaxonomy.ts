import type { Exercise } from '../types'

export type TrainingItemKind = 'movementExercise' | 'activitySession'
export type LearningBehavior = 'watch' | 'read' | 'localHow' | 'checklist' | 'needsReview'

export const sweatModeLibraryGroups = [
  'Core Armor',
  'Back & Posture',
  'Hips & Glutes',
  'Hill Legs',
  'Carries & Load',
  'Mobility Reset',
  'Ride Sessions',
  'Walk & Ruck',
  'Burley / Trailer',
] as const

export type SweatModeLibraryGroup = (typeof sweatModeLibraryGroups)[number]

export const optionalSearchOnlyExerciseIds = new Set([
  'downward-dog',
  'front-plank',
  'sphinx-pose',
  'cobra-pose',
  'childs-pose-side-reach',
  'rear-foot-elevated-split-squat',
  'cat-cow',
  'figure-four-stretch',
  'hamstring-stretch',
  'couch-stretch',
  'reverse-lunge',
  'band-external-rotation',
  'prone-y-t-w',
  'bench-supported-rear-delt-raise',
  'one-arm-dumbbell-row',
  'push-up',
  'dumbbell-floor-press',
  'glute-bridge',
  'glute-bridge-march',
  'feet-elevated-glute-bridge',
  'mcgill-curl-up',
  'step-up-to-bench',
  'soleus-raise',
  'tibialis-raise',
  'wall-sit',
  'single-leg-romanian-deadlift',
  'loaded-carry-for-trailer-days',
])

export const activitySessionExerciseIds = new Set([
  'easy-endurance-ride',
  'recovery-spin',
  'hill-repeat-ride',
  'low-cadence-climb-intervals',
  'loaded-gravel-ride',
  'easy-tour-specificity-session',
  'walk-hike',
  'commute-walk',
  'dog-walk',
  'dog-walk-light-ruck',
  'hydration-ruck-walk',
  'ruck-commute',
  'easy-posture-ruck',
  'ruck-hill-walk',
  'trailer-walk',
  'burley-loaded-trailer-ride',
  'trailer-hill-starts',
  'controlled-trailer-towing-workout',
])

export const defaultLibraryExerciseGroups: Record<SweatModeLibraryGroup, string[]> = {
  'Core Armor': ['dead-bug', 'bird-dog', 'side-plank', 'pallof-press'],
  'Back & Posture': [
    'bench-supported-one-arm-row',
    'band-pull-apart',
    'band-face-pull',
    'dumbbell-bench-press',
  ],
  'Hips & Glutes': [
    'floor-glute-bridge',
    'bench-hip-thrust',
    'kettlebell-deadlift',
    'dumbbell-romanian-deadlift',
  ],
  'Hill Legs': ['goblet-squat', 'step-up', 'split-squat', 'calf-raise'],
  'Carries & Load': ['farmer-carry', 'suitcase-carry'],
  'Mobility Reset': ['90-90-hip-switch', 'thoracic-open-book', 'ankle-rocks', 'low-lunge-hip-flexor-stretch'],
  'Ride Sessions': [
    'easy-endurance-ride',
    'recovery-spin',
    'hill-repeat-ride',
    'low-cadence-climb-intervals',
    'loaded-gravel-ride',
    'easy-tour-specificity-session',
  ],
  'Walk & Ruck': [
    'commute-walk',
    'dog-walk',
    'dog-walk-light-ruck',
    'hydration-ruck-walk',
    'ruck-commute',
    'easy-posture-ruck',
    'ruck-hill-walk',
  ],
  'Burley / Trailer': [
    'trailer-walk',
    'burley-loaded-trailer-ride',
    'trailer-hill-starts',
    'controlled-trailer-towing-workout',
  ],
}

export const defaultLibraryExerciseIds = new Set(Object.values(defaultLibraryExerciseGroups).flat())

const groupByExerciseId = new Map(
  Object.entries(defaultLibraryExerciseGroups).flatMap(([group, exerciseIds]) =>
    exerciseIds.map((exerciseId) => [exerciseId, group as SweatModeLibraryGroup] as const),
  ),
)

export const rampRepGroupForExercise = (exercise: Pick<Exercise, 'id' | 'group'>): SweatModeLibraryGroup => {
  const direct = groupByExerciseId.get(exercise.id)
  if (direct) {
    return direct
  }

  if (exercise.group === 'Ride Sessions') {
    return 'Ride Sessions'
  }
  if (exercise.group === 'Walk & Ruck') {
    return 'Walk & Ruck'
  }
  if (exercise.group === 'Burley & Trailer Work') {
    return 'Burley / Trailer'
  }
  if (exercise.group === 'Carry & Load Transfer') {
    return 'Carries & Load'
  }
  if (exercise.group === 'Upper Back & Posture') {
    return 'Back & Posture'
  }
  if (exercise.group === 'Single-Leg Strength') {
    return 'Hill Legs'
  }
  if (exercise.group === 'Hinge & Posterior Chain') {
    return 'Hips & Glutes'
  }
  if (exercise.group === 'Core Stability') {
    return 'Core Armor'
  }

  return 'Mobility Reset'
}

export const isDefaultLibraryExercise = (exercise: Pick<Exercise, 'id'>) =>
  defaultLibraryExerciseIds.has(exercise.id) && !optionalSearchOnlyExerciseIds.has(exercise.id)

export const isSearchOnlyExercise = (exercise: Pick<Exercise, 'id'>) => optionalSearchOnlyExerciseIds.has(exercise.id)

export const isDefaultVisibleExerciseId = (exerciseId: string) =>
  defaultLibraryExerciseIds.has(exerciseId) && !optionalSearchOnlyExerciseIds.has(exerciseId)

export const trainingItemKindForExercise = (exercise: Pick<Exercise, 'id' | 'group'>): TrainingItemKind =>
  activitySessionExerciseIds.has(exercise.id) ? 'activitySession' : 'movementExercise'

export const trainingItemKindForExerciseId = (exerciseId: string): TrainingItemKind =>
  activitySessionExerciseIds.has(exerciseId) ? 'activitySession' : 'movementExercise'

export const isActivitySessionExercise = (exercise: Pick<Exercise, 'id' | 'group'>) =>
  trainingItemKindForExercise(exercise) === 'activitySession'

export const isMovementExercise = (exercise: Pick<Exercise, 'id' | 'group'>) =>
  trainingItemKindForExercise(exercise) === 'movementExercise'
