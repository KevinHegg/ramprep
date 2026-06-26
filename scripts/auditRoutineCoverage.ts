import { approvedMovementVideoByExerciseId } from '../src/data/approvedMovementVideos'
import { routineVariationPools } from '../src/data/routineVariation'
import {
  retiredExerciseRecords,
  seedExercises,
  seedRoutineExercises,
  seedRoutines,
} from '../src/data/seed'
import {
  activitySessionExerciseIds,
  defaultLibraryExerciseIds,
  isDefaultVisibleExerciseId,
  trainingItemKindForExerciseId,
} from '../src/data/trainingTaxonomy'
import { normalizeRoutineRole } from '../src/data/routineRotation'
import type { RoutineSlotKind } from '../src/types'

const issues: string[] = []
const exerciseById = new Map(seedExercises.map((exercise) => [exercise.id, exercise]))
const routineById = new Map(seedRoutines.map((routine) => [routine.id, routine]))
const retiredNames = new Set(retiredExerciseRecords.map((record) => record.retiredName.toLowerCase()))
const retiredIds = new Set(
  retiredExerciseRecords
    .filter((record) => !record.replacementExerciseIds.includes(record.id))
    .map((record) => record.id),
)

const defaultVisibleMovementIds = [...defaultLibraryExerciseIds]
  .filter((exerciseId) => isDefaultVisibleExerciseId(exerciseId))
  .filter((exerciseId) => trainingItemKindForExerciseId(exerciseId) === 'movementExercise')
  .sort()

const usage = new Map<string, { rotation: number; supplemental: number; ride: number; total: number }>()
defaultVisibleMovementIds.forEach((exerciseId) => usage.set(exerciseId, { rotation: 0, supplemental: 0, ride: 0, total: 0 }))

for (const routineExercise of seedRoutineExercises) {
  const routine = routineById.get(routineExercise.routineId)
  const exercise = exerciseById.get(routineExercise.exerciseId)
  const role = routine ? normalizeRoutineRole(routine) : undefined

  if (!routine) {
    issues.push(`${routineExercise.id}: references missing routine ${routineExercise.routineId}.`)
    continue
  }
  if (!exercise) {
    issues.push(`${routineExercise.id}: references missing exercise ${routineExercise.exerciseId}.`)
    continue
  }
  if (retiredIds.has(exercise.id) || retiredNames.has(exercise.name.toLowerCase())) {
    issues.push(`${routineExercise.id}: references retired exercise ${exercise.name}.`)
  }

  const kind = trainingItemKindForExerciseId(exercise.id)
  if ((role === 'rotation' || role === 'supplemental') && kind === 'activitySession') {
    issues.push(`${routine.name}: activity session ${exercise.name} is used as a strength-routine exercise.`)
  }
  if ((role === 'rotation' || role === 'supplemental') && kind === 'movementExercise' && !approvedMovementVideoByExerciseId.has(exercise.id)) {
    issues.push(`${routine.name}: movement ${exercise.name} has no approved video.`)
  }

  if (usage.has(exercise.id)) {
    const item = usage.get(exercise.id)!
    item.total += 1
    if (role === 'rotation') {
      item.rotation += 1
    } else if (role === 'supplemental') {
      item.supplemental += 1
    } else if (role === 'ride') {
      item.ride += 1
    }
  }
}

Object.entries(routineVariationPools).forEach(([slotKind, exerciseIds]) => {
  exerciseIds.forEach((exerciseId) => {
    const exercise = exerciseById.get(exerciseId)
    if (!exercise) {
      issues.push(`Variation pool ${slotKind}: missing exercise ${exerciseId}.`)
      return
    }
    if (activitySessionExerciseIds.has(exerciseId)) {
      issues.push(`Variation pool ${slotKind}: activity session ${exercise.name} cannot be a strength substitution.`)
    }
    if (!approvedMovementVideoByExerciseId.has(exerciseId)) {
      issues.push(`Variation pool ${slotKind}: ${exercise.name} has no approved video.`)
    }
    const routineSlots = seedRoutineExercises.filter((entry) => entry.allowedExerciseIds?.includes(exerciseId))
    const incompatibleSlots = routineSlots.filter((entry) => entry.slotKind !== (slotKind as RoutineSlotKind))
    if (incompatibleSlots.length) {
      issues.push(`Variation pool ${slotKind}: ${exercise.name} appears in incompatible slot metadata.`)
    }
  })
})

const unused = defaultVisibleMovementIds.filter((exerciseId) => (usage.get(exerciseId)?.total ?? 0) === 0)
unused.forEach((exerciseId) => {
  const exercise = exerciseById.get(exerciseId)
  issues.push(`${exercise?.name ?? exerciseId}: default-visible movement is unused and has no library-only reason.`)
})

const rotationUsed = defaultVisibleMovementIds.filter((exerciseId) => (usage.get(exerciseId)?.rotation ?? 0) > 0)
const supplementalOnly = defaultVisibleMovementIds.filter((exerciseId) => {
  const item = usage.get(exerciseId)
  return item && item.rotation === 0 && item.supplemental > 0
})

const lines = [
  `default-visible movement exercises: ${defaultVisibleMovementIds.length}`,
  `used in regular rotation routines: ${rotationUsed.length}`,
  `used only in supplemental routines: ${supplementalOnly.length}`,
  `marked library-only: 0`,
  `unused without explanation: ${unused.length}`,
  '',
  'routine usage count per exercise:',
  ...defaultVisibleMovementIds.map((exerciseId) => {
    const exercise = exerciseById.get(exerciseId)
    const item = usage.get(exerciseId)!
    return `- ${exercise?.name ?? exerciseId}: rotation ${item.rotation}, supplemental ${item.supplemental}, ride ${item.ride}, total ${item.total}`
  }),
]

if (issues.length) {
  console.error(['Routine coverage audit failed:', ...issues.map((issue) => `- ${issue}`), '', ...lines].join('\n'))
  process.exit(1)
}

console.log(['Routine coverage audit passed.', ...lines].join('\n'))
