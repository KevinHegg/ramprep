import type { Exercise } from '../types'

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
  'sphinx-pose',
  'cobra-pose',
  'childs-pose-side-reach',
])

export const defaultLibraryExerciseGroups: Record<SweatModeLibraryGroup, string[]> = {
  'Core Armor': ['dead-bug', 'bird-dog', 'side-plank', 'front-plank', 'pallof-press', 'mcgill-curl-up'],
  'Back & Posture': [
    'one-arm-dumbbell-row',
    'bench-supported-one-arm-row',
    'band-pull-apart',
    'band-face-pull',
    'band-external-rotation',
    'thoracic-open-book',
    'prone-y-t-w',
    'bench-supported-rear-delt-raise',
  ],
  'Hips & Glutes': [
    'glute-bridge',
    'bench-hip-thrust',
    'glute-bridge-march',
    'single-leg-romanian-deadlift',
    '90-90-hip-switch',
    'couch-stretch',
    'figure-four-stretch',
  ],
  'Hill Legs': ['step-up', 'split-squat', 'reverse-lunge', 'goblet-squat', 'calf-raise', 'soleus-raise', 'tibialis-raise', 'wall-sit', 'rear-foot-elevated-split-squat', 'step-up-to-bench'],
  'Carries & Load': ['suitcase-carry', 'farmer-carry', 'kettlebell-deadlift', 'dumbbell-romanian-deadlift', 'loaded-carry-for-trailer-days'],
  'Mobility Reset': ['cat-cow', 'low-lunge-hip-flexor-stretch', 'hamstring-stretch', 'ankle-rocks', 'thoracic-open-book'],
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
