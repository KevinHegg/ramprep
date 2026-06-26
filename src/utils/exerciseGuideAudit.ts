import { approvedMovementVideoByExerciseId } from '../data/approvedMovementVideos'
import { exerciseGuideContractById, exerciseGuideContracts } from '../data/exerciseGuideContracts'
import { exerciseQuickGuides, type ExerciseQuickGuide } from '../data/exerciseQuickGuides'
import { seedExercises } from '../data/seed'
import {
  defaultLibraryExerciseIds,
  isDefaultVisibleExerciseId,
  trainingItemKindForExerciseId,
} from '../data/trainingTaxonomy'

export type ExerciseGuideAuditIssue = {
  exerciseId: string
  field: string
  message: string
  offendingPhrase?: string
  likelySourceExercise?: string
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const textIncludes = (text: string, phrase: string) => normalize(text).includes(normalize(phrase))

const guideText = (guide: { cues: string[]; mistakes: string[] }) => [...guide.cues, ...guide.mistakes].join(' ')

const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length

const tokenSet = (value: string) => new Set(normalize(value).split(' ').filter((token) => token.length > 2))

const jaccardSimilarity = (left: string, right: string) => {
  const leftTokens = tokenSet(left)
  const rightTokens = tokenSet(right)
  const union = new Set([...leftTokens, ...rightTokens])
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token))

  return union.size ? intersection.length / union.size : 0
}

const genericPhrases = [
  'perform the exercise',
  'move into position',
  'repeat as needed',
  'keep good form',
  'engage the target muscles',
]

const hingeTemplatePhrase = 'brace, soften the knees, and send hips back'

const contaminationChecks = [
  {
    exerciseIds: ['bench-hip-thrust'],
    phrases: ['car door', 'send hips back', 'keep the load close', 'finish tall', 'stop the descent before the spine rounds', 'drive the floor away'],
    likelySourceExercise: 'hinge/deadlift template',
  },
  {
    exerciseIds: ['floor-glute-bridge'],
    phrases: ['stand tall', 'standing', 'hips back', 'load close', 'car door'],
    likelySourceExercise: 'standing hinge template',
  },
  {
    exerciseIds: ['bench-supported-one-arm-row'],
    phrases: ['knees track over toes', 'sit between hips', 'drive through the whole foot'],
    likelySourceExercise: 'squat template',
  },
  {
    exerciseIds: ['farmer-carry', 'suitcase-carry'],
    phrases: ['lie on your back', 'hands and knees', 'knees bent', 'back on floor'],
    likelySourceExercise: 'floor-position template',
  },
]

export const defaultMovementExerciseIds = [...defaultLibraryExerciseIds].filter(
  (exerciseId) => isDefaultVisibleExerciseId(exerciseId) && trainingItemKindForExerciseId(exerciseId) === 'movementExercise',
)

export const auditExerciseGuides = (): ExerciseGuideAuditIssue[] => {
  const issues: ExerciseGuideAuditIssue[] = []
  const exercisesById = new Map(seedExercises.map((exercise) => [exercise.id, exercise]))
  const guideById = new Map(exerciseQuickGuides.map((guide) => [guide.exerciseId, guide]))

  for (const exercise of seedExercises) {
    if (exercise.name.includes('/') && exercise.name !== '90/90 hip switch') {
      issues.push({
        exerciseId: exercise.id,
        field: 'name',
        message: 'Exercise names cannot combine distinct movements with a slash.',
        offendingPhrase: exercise.name,
        likelySourceExercise: 'combined exercise record',
      })
    }
    if (/\bor\b/i.test(exercise.name)) {
      issues.push({
        exerciseId: exercise.id,
        field: 'name',
        message: 'Exercise names cannot use "or" to combine distinct movements.',
        offendingPhrase: exercise.name,
        likelySourceExercise: 'combined exercise record',
      })
    }
  }

  for (const exerciseId of defaultMovementExerciseIds) {
    const exercise = exercisesById.get(exerciseId)
    const guide = guideById.get(exerciseId)
    const video = approvedMovementVideoByExerciseId.get(exerciseId)
    const contract = exerciseGuideContractById.get(exerciseId)

    if (!exercise) {
      issues.push({ exerciseId, field: 'exercise', message: 'Default movement exercise is missing from seed data.' })
      continue
    }
    if (!video) {
      issues.push({ exerciseId, field: 'video', message: 'Default movement exercise lacks a verified approved video.' })
    }
    if (!guide || guide.status !== 'approved') {
      issues.push({ exerciseId, field: 'guide', message: 'Default movement exercise lacks an approved quick guide.' })
      continue
    }
    if (!contract) {
      issues.push({ exerciseId, field: 'contract', message: 'Default movement exercise lacks a semantic guide contract.' })
      continue
    }

    if (guide.cues.length > 3 || guide.mistakes.length > 3) {
      issues.push({ exerciseId, field: 'guide', message: 'Quick guides must use at most three cues and three mistakes.' })
    }

    for (const item of [...guide.cues, ...guide.mistakes]) {
      if (wordCount(item) > 18) {
        issues.push({
          exerciseId,
          field: 'guide',
          message: 'Quick-guide cards must be 18 words or fewer.',
          offendingPhrase: item,
        })
      }
    }

    if (video?.youtubeVideoId && guide.sourceVideoId !== video.youtubeVideoId) {
      issues.push({
        exerciseId,
        field: 'sourceVideoId',
        message: 'Quick guide source video must match the approved movement video.',
        offendingPhrase: guide.sourceVideoId,
      })
    }

    const text = guideText(guide)
    for (const required of contract.requiredConcepts) {
      if (!textIncludes(text, required)) {
        issues.push({
          exerciseId,
          field: 'requiredConcepts',
          message: 'Guide is missing a required exercise-specific concept.',
          offendingPhrase: required,
        })
      }
    }
    for (const forbidden of contract.forbiddenConcepts) {
      if (textIncludes(text, forbidden)) {
        issues.push({
          exerciseId,
          field: 'forbiddenConcepts',
          message: 'Guide contains a forbidden concept for this exercise.',
          offendingPhrase: forbidden,
          likelySourceExercise: 'copied template or wrong movement family',
        })
      }
    }

    for (const equipment of contract.expectedEquipment) {
      if (!exercise.equipment.includes(equipment)) {
        issues.push({
          exerciseId,
          field: 'equipment',
          message: 'Exercise equipment does not match its semantic contract.',
          offendingPhrase: equipment,
        })
      }
    }

    const videoMatchText = [video?.exerciseMatchNotes ?? '', video?.videoTitle ?? ''].join(' ')
    if (!contract.expectedSourceVariant.some((phrase) => textIncludes(videoMatchText, phrase))) {
      issues.push({
        exerciseId,
        field: 'expectedSourceVariant',
        message: 'Approved video notes do not confirm the expected exercise variant.',
        offendingPhrase: contract.expectedSourceVariant.join(' | '),
      })
    }

    const bodyPositionText = [text, video?.exerciseMatchNotes ?? ''].join(' ')
    if (!contract.expectedBodyPosition.some((phrase) => textIncludes(bodyPositionText, phrase))) {
      issues.push({
        exerciseId,
        field: 'expectedBodyPosition',
        message: 'Guide/video notes do not confirm the expected body position.',
        offendingPhrase: contract.expectedBodyPosition.join(' | '),
      })
    }

    for (const phrase of genericPhrases) {
      if (textIncludes(text, phrase)) {
        issues.push({
          exerciseId,
          field: 'genericPhrase',
          message: 'Guide contains generic filler instead of exercise-specific coaching.',
          offendingPhrase: phrase,
          likelySourceExercise: 'generic instruction template',
        })
      }
    }

    if (!['kettlebell-deadlift', 'dumbbell-romanian-deadlift'].includes(exerciseId) && textIncludes(text, hingeTemplatePhrase)) {
      issues.push({
        exerciseId,
        field: 'genericPhrase',
        message: 'Non-hinge exercise contains hinge boilerplate.',
        offendingPhrase: hingeTemplatePhrase,
        likelySourceExercise: 'hinge/deadlift template',
      })
    }

    for (const check of contaminationChecks) {
      if (!check.exerciseIds.includes(exerciseId)) {
        continue
      }
      for (const phrase of check.phrases) {
        if (textIncludes(text, phrase)) {
          issues.push({
            exerciseId,
            field: 'templateContamination',
            message: 'Guide appears copied from another movement family.',
            offendingPhrase: phrase,
            likelySourceExercise: check.likelySourceExercise,
          })
        }
      }
    }
  }

  const defaultGuides = defaultMovementExerciseIds
    .map((exerciseId) => guideById.get(exerciseId))
    .filter((guide): guide is ExerciseQuickGuide => guide?.status === 'approved')

  for (let index = 0; index < defaultGuides.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < defaultGuides.length; compareIndex += 1) {
      const left = defaultGuides[index]
      const right = defaultGuides[compareIndex]
      const leftText = guideText(left)
      const rightText = guideText(right)
      const similarity = jaccardSimilarity(leftText, rightText)

      if (normalize(leftText) === normalize(rightText) || similarity >= 0.86) {
        issues.push({
          exerciseId: left.exerciseId,
          field: 'duplicateGuide',
          message: `Guide is too similar to ${right.exerciseId}.`,
          offendingPhrase: `${Math.round(similarity * 100)}% similarity`,
          likelySourceExercise: right.exerciseId,
        })
      }
    }
  }

  for (const contract of exerciseGuideContracts) {
    if (defaultMovementExerciseIds.includes(contract.exerciseId)) {
      continue
    }
    if (isDefaultVisibleExerciseId(contract.exerciseId)) {
      issues.push({
        exerciseId: contract.exerciseId,
        field: 'contract',
        message: 'Contract exists for a default-visible item that is not a movement exercise.',
      })
    }
  }

  return issues
}
