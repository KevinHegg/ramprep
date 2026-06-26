import { describe, expect, it } from 'vitest'
import { approvedMovementVideoByExerciseId } from './approvedMovementVideos'
import { buildRoutineVariationProposal, routineVariationPools } from './routineVariation'
import { seedEquipment, seedExercises, seedRoutineExercises, seedRoutines } from './seed'

const ownedEquipment = seedEquipment.map((item) => ({ ...item, owned: true }))

describe('routine variation rules', () => {
  it('adds the two new rotation routines once with expected exercises', () => {
    expect(seedRoutines.filter((routine) => routine.id === 'routine-g-bench-posture-core')).toHaveLength(1)
    expect(seedRoutines.filter((routine) => routine.id === 'routine-h-hill-armor-load')).toHaveLength(1)

    const gExercises = seedRoutineExercises
      .filter((entry) => entry.routineId === 'routine-g-bench-posture-core')
      .map((entry) => entry.exerciseId)
    const hExercises = seedRoutineExercises
      .filter((entry) => entry.routineId === 'routine-h-hill-armor-load')
      .map((entry) => entry.exerciseId)

    expect(gExercises).toEqual([
      'thoracic-open-book',
      'step-up',
      'bench-supported-one-arm-row',
      'dumbbell-bench-press',
      'bench-hip-thrust',
      'band-face-pull',
      'pallof-press',
      'suitcase-carry',
    ])
    expect(hExercises).toEqual([
      'ankle-rocks',
      'goblet-squat',
      'dumbbell-romanian-deadlift',
      'split-squat',
      'calf-raise',
      'farmer-carry',
      'dead-bug',
    ])
  })

  it('previews no more than two same-slot video-backed accessory substitutions', () => {
    const proposal = buildRoutineVariationProposal({
      routineId: 'routine-g-bench-posture-core',
      routineExercises: seedRoutineExercises.filter((entry) => entry.routineId === 'routine-g-bench-posture-core'),
      exercises: seedExercises,
      equipment: ownedEquipment,
      overrides: [],
      nowISO: '2026-06-25T12:00:00.000Z',
    })

    expect(proposal).toBeTruthy()
    expect(proposal!.replacements.length).toBeLessThanOrEqual(2)

    const originalIds = new Set(seedRoutineExercises.filter((entry) => entry.routineId === proposal!.routineId).map((entry) => entry.exerciseId))
    const selectedIds = new Set<string>()

    proposal!.replacements.forEach((replacement) => {
      const slot = seedRoutineExercises.find((entry) => entry.id === replacement.slotId)

      expect(slot?.anchor).not.toBe(true)
      expect(slot?.slotKind).toBe(replacement.slotKind)
      expect(routineVariationPools[replacement.slotKind]).toContain(replacement.selectedExerciseId)
      expect(approvedMovementVideoByExerciseId.has(replacement.selectedExerciseId)).toBe(true)
      expect(originalIds.has(replacement.selectedExerciseId)).toBe(false)
      expect(selectedIds.has(replacement.selectedExerciseId)).toBe(false)
      selectedIds.add(replacement.selectedExerciseId)
    })
  })

  it('keeps anchor slots fixed automatically', () => {
    const anchorIds = seedRoutineExercises
      .filter((entry) => entry.routineId === 'routine-h-hill-armor-load' && entry.anchor)
      .map((entry) => entry.id)
    const proposal = buildRoutineVariationProposal({
      routineId: 'routine-h-hill-armor-load',
      routineExercises: seedRoutineExercises.filter((entry) => entry.routineId === 'routine-h-hill-armor-load'),
      exercises: seedExercises,
      equipment: ownedEquipment,
      overrides: [],
      nowISO: '2026-06-25T12:00:00.000Z',
    })

    expect(anchorIds).toHaveLength(2)
    expect(proposal?.replacements.some((replacement) => anchorIds.includes(replacement.slotId))).toBe(false)
  })
})
