import { approvedMovementVideoByExerciseId } from './approvedMovementVideos'
import { isActivitySessionExercise } from './trainingTaxonomy'
import type {
  Equipment,
  Exercise,
  RoutineExercise,
  RoutineSessionOverride,
  RoutineSlotKind,
} from '../types'

export interface RoutineVariationReplacementPreview {
  slotId: string
  slotKind: RoutineSlotKind
  originalExerciseId: string
  selectedExerciseId: string
}

export interface RoutineVariationProposal {
  id: string
  routineId: string
  replacements: RoutineVariationReplacementPreview[]
  changedCount: number
  totalSlots: number
  createdAtISO: string
}

export const routineVariationPools: Record<RoutineSlotKind, string[]> = {
  mobility: ['90-90-hip-switch', 'thoracic-open-book', 'ankle-rocks', 'low-lunge-hip-flexor-stretch'],
  kneeDominant: ['goblet-squat', 'step-up', 'split-squat'],
  hingeGlute: ['kettlebell-deadlift', 'dumbbell-romanian-deadlift', 'floor-glute-bridge', 'bench-hip-thrust'],
  pullPosture: ['bench-supported-one-arm-row', 'band-pull-apart', 'band-face-pull'],
  core: ['dead-bug', 'bird-dog', 'pallof-press', 'side-plank'],
  carry: ['farmer-carry', 'suitcase-carry'],
  push: ['dumbbell-bench-press'],
  calf: ['calf-raise'],
}

export const slotKindLabels: Record<RoutineSlotKind, string> = {
  mobility: 'Mobility',
  kneeDominant: 'Knee-dominant',
  hingeGlute: 'Hinge / glute',
  pullPosture: 'Pull / posture',
  push: 'Push',
  core: 'Core',
  carry: 'Carry',
  calf: 'Calf',
}

const alwaysAvailableEquipment = new Set(['bodyweight', 'yoga mat'])

export const exerciseHasApprovedVideo = (exerciseId: string) =>
  Boolean(approvedMovementVideoByExerciseId.get(exerciseId))

export const exerciseMatchesOwnedEquipment = (exercise: Exercise, equipment: Equipment[]) => {
  const ownedKinds = new Set(equipment.filter((item) => item.owned).map((item) => item.kind))
  return exercise.equipment.every((kind) => alwaysAvailableEquipment.has(kind) || ownedKinds.has(kind))
}

const latestSelectedBySlot = (overrides: RoutineSessionOverride[]) => {
  const selections = new Map<string, string[]>()
  overrides
    .slice()
    .sort((left, right) => left.createdAtISO.localeCompare(right.createdAtISO))
    .forEach((override) => {
      override.replacements.forEach((replacement) => {
        selections.set(replacement.slotId, [
          ...(selections.get(replacement.slotId) ?? []),
          replacement.selectedExerciseId,
        ])
      })
    })
  return selections
}

export const buildRoutineVariationProposal = ({
  routineId,
  routineExercises,
  exercises,
  equipment,
  overrides,
  nowISO,
}: {
  routineId: string
  routineExercises: RoutineExercise[]
  exercises: Exercise[]
  equipment: Equipment[]
  overrides: RoutineSessionOverride[]
  nowISO: string
}): RoutineVariationProposal | null => {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const usedExerciseIds = new Set(routineExercises.map((entry) => entry.exerciseId))
  const recentBySlot = latestSelectedBySlot(overrides.filter((override) => override.routineId === routineId))
  const replacements: RoutineVariationReplacementPreview[] = []
  const candidates = routineExercises
    .filter((entry) => entry.routineId === routineId && entry.slotKind && !entry.anchor)
    .sort((left, right) => left.order - right.order)

  for (const entry of candidates) {
    if (!entry.slotKind || replacements.length >= 2) {
      break
    }

    const pool = entry.allowedExerciseIds?.length ? entry.allowedExerciseIds : routineVariationPools[entry.slotKind]
    const recentSelections = recentBySlot.get(entry.id) ?? []
    const orderedPool = pool.slice().sort((left, right) => {
      const leftRecent = recentSelections.lastIndexOf(left)
      const rightRecent = recentSelections.lastIndexOf(right)
      return leftRecent - rightRecent
    })

    const selectedExerciseId = orderedPool.find((exerciseId) => {
      const exercise = exerciseById.get(exerciseId)
      return (
        exercise &&
        exerciseId !== entry.exerciseId &&
        !usedExerciseIds.has(exerciseId) &&
        !isActivitySessionExercise(exercise) &&
        exerciseHasApprovedVideo(exerciseId) &&
        exerciseMatchesOwnedEquipment(exercise, equipment)
      )
    })

    if (!selectedExerciseId) {
      continue
    }

    replacements.push({
      slotId: entry.id,
      slotKind: entry.slotKind,
      originalExerciseId: entry.exerciseId,
      selectedExerciseId,
    })
    usedExerciseIds.add(selectedExerciseId)
  }

  if (!replacements.length) {
    return null
  }

  return {
    id: `variation-${routineId}-${nowISO}`,
    routineId,
    replacements,
    changedCount: replacements.length,
    totalSlots: routineExercises.filter((entry) => entry.routineId === routineId).length,
    createdAtISO: nowISO,
  }
}
