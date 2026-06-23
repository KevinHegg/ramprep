import { priorityExerciseIds } from '../data/exerciseDemoCatalog'
import type { Exercise } from '../types'

export const bannedInstructionPatterns = [
  /position yourself in the .+ position/i,
  /move into a comfortable stretch/i,
  /perform the exercise/i,
  /repeat as needed/i,
  /hold the position\.?$/i,
]

export interface InstructionLintIssue {
  exerciseId: string
  field: string
  message: string
}

const textFieldsFor = (exercise: Exercise) => [
  exercise.description,
  exercise.purpose ?? '',
  exercise.setup ?? '',
  ...exercise.instructions,
  ...exercise.formCues,
  ...exercise.commonMistakes,
  ...(exercise.regressions ?? []),
  ...(exercise.progressions ?? []),
  exercise.dose ?? '',
  ...(exercise.safety ?? []),
]

export const lintExerciseInstructions = (exercise: Exercise, options: { priority?: boolean } = {}): InstructionLintIssue[] => {
  const issues: InstructionLintIssue[] = []
  const priority = options.priority ?? priorityExerciseIds.includes(exercise.id as (typeof priorityExerciseIds)[number])

  textFieldsFor(exercise).forEach((fieldText, index) => {
    bannedInstructionPatterns.forEach((pattern) => {
      if (pattern.test(fieldText)) {
        issues.push({
          exerciseId: exercise.id,
          field: `text[${index}]`,
          message: `Banned generic instruction: ${pattern}`,
        })
      }
    })
  })

  if (priority && exercise.instructions.length < 3) {
    issues.push({ exerciseId: exercise.id, field: 'instructions', message: 'Priority exercises need at least 3 steps.' })
  }

  if (priority && exercise.commonMistakes.length < 3) {
    issues.push({ exerciseId: exercise.id, field: 'commonMistakes', message: 'Priority exercises need at least 3 common mistakes.' })
  }

  if (priority && !exercise.sourceReferences?.length) {
    issues.push({ exerciseId: exercise.id, field: 'sourceReferences', message: 'Priority exercises need at least one source/reference.' })
  }

  return issues
}

export const lintPriorityExerciseInstructions = (exercises: Exercise[]) =>
  exercises
    .filter((exercise) => priorityExerciseIds.includes(exercise.id as (typeof priorityExerciseIds)[number]))
    .flatMap((exercise) => lintExerciseInstructions(exercise, { priority: true }))
