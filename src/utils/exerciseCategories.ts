import type { Exercise } from '../types'

export const functionalCategories = [
  'Mobility & Yoga',
  'Core Stability',
  'Upper Back & Posture',
  'Hinge & Posterior Chain',
  'Single-Leg Strength',
  'Carry & Load Transfer',
  'Balance & Control',
  'Recovery',
  'Burley & Trailer Work',
  'Ride Sessions',
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

  if (exercise.group && functionalCategories.includes(exercise.group as FunctionalCategory)) {
    return exercise.group as FunctionalCategory
  }
  if (/burley|trailer|towed|tow|dog carrier/.test(text)) {
    return 'Burley & Trailer Work'
  }
  if (/ride|bike|cycling|climb|hill|gravel|endurance|spin/.test(text)) {
    return 'Ride Sessions'
  }
  if (/anti-rotation|anti-extension|pallof|dead bug|bird dog|plank|mcgill|hollow|bear crawl/.test(text)) {
    return 'Core Stability'
  }
  if (/recovery|gentle|soreness|prehab/.test(text)) {
    return 'Recovery'
  }
  if (/mobility|stretch|ankle|hip flexor|90\/90|thoracic|yoga|cat-cow|open book|sphinx|cobra|downward/.test(text)) {
    return 'Mobility & Yoga'
  }
  if (/balance|tibialis|single-leg balance|reach/.test(text)) {
    return 'Balance & Control'
  }
  if (/carry|loaded|load transfer|conditioning|walk|hike|swing/.test(text)) {
    return 'Carry & Load Transfer'
  }
  if (/row|pull|upper back|posture|scapular|face pull|pull-apart|rotation|shoulder/.test(text)) {
    return 'Upper Back & Posture'
  }
  if (/split squat|lunge|step-up|single-leg|wall sit|calf|soleus/.test(text)) {
    return 'Single-Leg Strength'
  }
  if (/hinge|deadlift|posterior|glute|hamstring|bridge|hip thrust/.test(text)) {
    return 'Hinge & Posterior Chain'
  }

  return 'Core Stability'
}
