import { describe, expect, it } from 'vitest'
import { approvedMovementVideoByExerciseId } from './approvedMovementVideos'
import { exerciseGuideContractById } from './exerciseGuideContracts'
import { exerciseQuickGuides, getApprovedExerciseQuickGuide } from './exerciseQuickGuides'
import { getExerciseDemoMedia, isVerifiedVideoDemoMedia } from './exerciseDemoCatalog'
import { retiredExerciseRecords, seedExercises, seedRoutineExercises } from './seed'
import {
  defaultLibraryExerciseIds,
  isDefaultVisibleExerciseId,
  trainingItemKindForExerciseId,
} from './trainingTaxonomy'
import { auditExerciseGuides, defaultMovementExerciseIds } from '../utils/exerciseGuideAudit'

const guideText = (exerciseId: string) => {
  const guide = getApprovedExerciseQuickGuide(exerciseId)
  return [...(guide?.cues ?? []), ...(guide?.mistakes ?? [])].join(' ').toLowerCase()
}

describe('approved exercise quick guides', () => {
  it('retires the combined bench hip thrust/glute bridge label and keeps distinct IDs', () => {
    const benchHipThrust = seedExercises.find((exercise) => exercise.id === 'bench-hip-thrust')
    const floorBridge = seedExercises.find((exercise) => exercise.id === 'floor-glute-bridge')
    const feetElevatedBridge = seedExercises.find((exercise) => exercise.id === 'feet-elevated-glute-bridge')

    expect(retiredExerciseRecords[0].retiredName).toBe('bench hip thrust/glute bridge')
    expect(benchHipThrust?.name).toBe('bench hip thrust')
    expect(floorBridge?.name).toBe('floor glute bridge')
    expect(feetElevatedBridge?.name).toBe('feet-elevated glute bridge')
    expect(benchHipThrust?.id).not.toBe(floorBridge?.id)
  })

  it('keeps combined slash exercise records out of future routines', () => {
    const routineText = seedRoutineExercises.flatMap((entry) => [entry.exerciseId, ...(entry.variationOptions ?? [])]).join(' ')

    expect(routineText).not.toContain('bench hip thrust/glute bridge')
    expect(seedExercises.filter((exercise) => exercise.name.includes('/') && exercise.name !== '90/90 hip switch')).toEqual([])
  })

  it('gives bench hip thrust and floor glute bridge distinct verified videos and cue sets', () => {
    expect(isVerifiedVideoDemoMedia(getExerciseDemoMedia('bench-hip-thrust'))).toBe(true)
    expect(isVerifiedVideoDemoMedia(getExerciseDemoMedia('floor-glute-bridge'))).toBe(true)
    expect(approvedMovementVideoByExerciseId.get('bench-hip-thrust')?.youtubeVideoId).not.toBe(
      approvedMovementVideoByExerciseId.get('floor-glute-bridge')?.youtubeVideoId,
    )
    expect(getApprovedExerciseQuickGuide('bench-hip-thrust')?.cues).not.toEqual(getApprovedExerciseQuickGuide('floor-glute-bridge')?.cues)
  })

  it('requires upper-back-on-bench hip thrust concepts and rejects hinge contamination', () => {
    const text = guideText('bench-hip-thrust')

    expect(text).toContain('upper back')
    expect(text).toContain('bench')
    expect(text).toContain('straight line')
    expect(text).not.toContain('closing a car door')
    expect(text).not.toContain('send hips back')
    expect(text).not.toContain('keep the load close')
    expect(text).not.toContain('finish tall')
    expect(text).not.toContain('drive the floor away')
  })

  it('requires floor glute bridge concepts and rejects bench setup', () => {
    const text = guideText('floor-glute-bridge')

    expect(text).toContain('back')
    expect(text).toContain('knees bent')
    expect(text).toContain('feet flat')
    expect(text).toContain('lift your hips')
    expect(text).not.toContain('upper back on the bench')
  })

  it('keeps every default movement video-backed with an approved guide and contract', () => {
    for (const exerciseId of defaultMovementExerciseIds) {
      expect(approvedMovementVideoByExerciseId.get(exerciseId)?.status).toBe('verified')
      expect(getApprovedExerciseQuickGuide(exerciseId)?.status).toBe('approved')
      expect(exerciseGuideContractById.get(exerciseId)).toBeDefined()
    }
  })

  it('does not expose draft guides as approved guides', () => {
    const draftGuide = exerciseQuickGuides.find((guide) => guide.exerciseId === 'feet-elevated-glute-bridge')

    expect(draftGuide?.status).toBe('draft')
    expect(getApprovedExerciseQuickGuide('feet-elevated-glute-bridge')).toBeUndefined()
  })

  it('keeps default movement guides semantically valid and non-duplicated', () => {
    expect(auditExerciseGuides()).toEqual([])
  })

  it('does not let optional or activity items distort default movement coverage', () => {
    const defaultVisibleIds = [...defaultLibraryExerciseIds].filter(isDefaultVisibleExerciseId)

    expect(defaultVisibleIds.filter((exerciseId) => trainingItemKindForExerciseId(exerciseId) === 'movementExercise')).toEqual(
      expect.arrayContaining(defaultMovementExerciseIds),
    )
    expect(defaultVisibleIds.filter((exerciseId) => trainingItemKindForExerciseId(exerciseId) === 'activitySession').length).toBeGreaterThan(0)
  })
})
