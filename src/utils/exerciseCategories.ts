import type { Exercise } from '../types'

export const functionalCategories = [
  'mobility prep',
  'core / anti-rotation',
  'hinge / posterior chain',
  'single-leg leg strength',
  'upper-back / posture / pulling',
  'carries / conditioning',
  'cycling-specific',
  'Burley / loaded trailer',
  'recovery',
] as const

export type FunctionalCategory = (typeof functionalCategories)[number]

export const getExerciseCategory = (exercise: Pick<Exercise, 'name' | 'group' | 'targetAreas' | 'equipment' | 'bikeTourPurpose'>): FunctionalCategory => {
  const text = [
    exercise.name,
    exercise.group ?? '',
    exercise.targetAreas.join(' '),
    exercise.equipment.join(' '),
    exercise.bikeTourPurpose?.join(' ') ?? '',
  ]
    .join(' ')
    .toLowerCase()

  if (/burley|trailer|towed|tow|dog carrier/.test(text)) {
    return 'Burley / loaded trailer'
  }
  if (/ride|bike|cycling|climb|hill|gravel|endurance|spin/.test(text)) {
    return 'cycling-specific'
  }
  if (/anti-rotation|anti-extension|pallof|dead bug|bird dog|plank|mcgill|hollow|bear crawl/.test(text)) {
    return 'core / anti-rotation'
  }
  if (/recovery|gentle|soreness|prehab/.test(text)) {
    return 'recovery'
  }
  if (/mobility|stretch|ankle|hip flexor|90\/90|thoracic|yoga|cat-cow|open book|sphinx|cobra|downward/.test(text)) {
    return 'mobility prep'
  }
  if (/carry|conditioning|walk|hike|swing/.test(text)) {
    return 'carries / conditioning'
  }
  if (/row|pull|upper back|posture|scapular|face pull|pull-apart|rotation|shoulder/.test(text)) {
    return 'upper-back / posture / pulling'
  }
  if (/split squat|lunge|step-up|single-leg|wall sit|calf|soleus/.test(text)) {
    return 'single-leg leg strength'
  }
  if (/hinge|deadlift|posterior|glute|hamstring|bridge|hip thrust/.test(text)) {
    return 'hinge / posterior chain'
  }

  return 'core / anti-rotation'
}
