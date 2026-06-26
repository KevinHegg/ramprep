import type { EquipmentKind } from '../types'

export type ExerciseGuideContract = {
  exerciseId: string
  requiredConcepts: string[]
  forbiddenConcepts: string[]
  expectedEquipment: EquipmentKind[]
  expectedBodyPosition: string[]
  expectedSourceVariant: string[]
}

export const exerciseGuideContracts: ExerciseGuideContract[] = [
  {
    exerciseId: 'dead-bug',
    requiredConcepts: ['back', 'arms', 'knees', 'low back', 'opposite leg'],
    forbiddenConcepts: ['bench', 'standing', 'walk'],
    expectedEquipment: ['bodyweight', 'yoga mat'],
    expectedBodyPosition: ['lying on back', 'knees over hips'],
    expectedSourceVariant: ['floor dead bug', 'opposite arm and leg'],
  },
  {
    exerciseId: 'bird-dog',
    requiredConcepts: ['hands and knees', 'opposite arm', 'leg', 'hips stay square'],
    forbiddenConcepts: ['lying on back', 'bench', 'walking'],
    expectedEquipment: ['bodyweight', 'yoga mat'],
    expectedBodyPosition: ['quadruped', 'hands and knees'],
    expectedSourceVariant: ['bird dog', 'opposite-arm/opposite-leg'],
  },
  {
    exerciseId: 'side-plank',
    requiredConcepts: ['elbow', 'shoulder', 'hips', 'straight line'],
    forbiddenConcepts: ['hands and knees', 'bench', 'squat'],
    expectedEquipment: ['bodyweight', 'yoga mat'],
    expectedBodyPosition: ['side-lying', 'elbow plank'],
    expectedSourceVariant: ['side plank', 'hips lifted'],
  },
  {
    exerciseId: 'pallof-press',
    requiredConcepts: ['band', 'anchor', 'pressing', 'rotate'],
    forbiddenConcepts: ['floor', 'bench', 'hips back'],
    expectedEquipment: ['band'],
    expectedBodyPosition: ['standing sideways', 'anti-rotation'],
    expectedSourceVariant: ['Pallof press', 'band/cable anti-rotation press'],
  },
  {
    exerciseId: 'bench-supported-one-arm-row',
    requiredConcepts: ['bench', 'dumbbell', 'row', 'elbow', 'torso'],
    forbiddenConcepts: ['squat', 'hips upward', 'knees bent on back'],
    expectedEquipment: ['dumbbell', 'bench'],
    expectedBodyPosition: ['one hand and one knee supported', 'bench support'],
    expectedSourceVariant: ['one-arm dumbbell row', 'bench-supported'],
  },
  {
    exerciseId: 'band-pull-apart',
    requiredConcepts: ['band', 'shoulder height', 'pull hands apart', 'shoulder blades'],
    forbiddenConcepts: ['face pull', 'squat', 'bench'],
    expectedEquipment: ['band'],
    expectedBodyPosition: ['shoulder height', 'arms at shoulder height'],
    expectedSourceVariant: ['band pull-apart', 'upper-back posture'],
  },
  {
    exerciseId: 'band-face-pull',
    requiredConcepts: ['band', 'face', 'elbows high', 'shoulder blades'],
    forbiddenConcepts: ['pull-apart', 'squat', 'deadlift'],
    expectedEquipment: ['band'],
    expectedBodyPosition: ['standing', 'band around face height'],
    expectedSourceVariant: ['banded face pull', 'elbows high'],
  },
  {
    exerciseId: 'kettlebell-deadlift',
    requiredConcepts: ['bell', 'feet', 'hips back', 'brace', 'stand'],
    forbiddenConcepts: ['upper back on bench', 'shoulders, hips, and knees', 'neck on bench'],
    expectedEquipment: ['kettlebell'],
    expectedBodyPosition: ['standing hinge', 'bell between your feet'],
    expectedSourceVariant: ['two-hand kettlebell deadlift', 'bell between the feet'],
  },
  {
    exerciseId: 'dumbbell-romanian-deadlift',
    requiredConcepts: ['dumbbells', 'soft knees', 'hinge', 'hamstrings', 'glutes'],
    forbiddenConcepts: ['upper back on bench', 'back on floor', 'step'],
    expectedEquipment: ['dumbbell'],
    expectedBodyPosition: ['standing hinge', 'weights near the legs'],
    expectedSourceVariant: ['dumbbell Romanian deadlift', 'soft knees'],
  },
  {
    exerciseId: 'floor-glute-bridge',
    requiredConcepts: ['back', 'knees bent', 'feet flat', 'lift your hips'],
    forbiddenConcepts: ['upper back on bench', 'car door', 'load close', 'finish tall'],
    expectedEquipment: ['bodyweight', 'yoga mat'],
    expectedBodyPosition: ['back on floor', 'feet flat'],
    expectedSourceVariant: ['floor glute bridge', 'back-on-floor'],
  },
  {
    exerciseId: 'bench-hip-thrust',
    requiredConcepts: ['bench', 'upper back', 'feet', 'hips', 'glutes', 'straight line'],
    forbiddenConcepts: ['car door', 'send hips back', 'keep the load close', 'finish tall', 'spine rounds', 'drive the floor away'],
    expectedEquipment: ['bodyweight', 'bench'],
    expectedBodyPosition: ['upper back supported', 'feet on floor'],
    expectedSourceVariant: ['bench hip thrust', 'upper back supported on a bench'],
  },
  {
    exerciseId: 'goblet-squat',
    requiredConcepts: ['weight at chest', 'sit between hips', 'knees', 'toes', 'whole foot'],
    forbiddenConcepts: ['bench', 'lying', 'walk'],
    expectedEquipment: ['dumbbell', 'kettlebell'],
    expectedBodyPosition: ['standing squat', 'weight at chest'],
    expectedSourceVariant: ['goblet squat', 'weight at chest'],
  },
  {
    exerciseId: 'step-up',
    requiredConcepts: ['foot', 'step', 'rise', 'lower'],
    forbiddenConcepts: ['rear foot elevated', 'floor bridge', 'carry'],
    expectedEquipment: ['bodyweight', 'dumbbell'],
    expectedBodyPosition: ['standing facing step', 'working foot on the step'],
    expectedSourceVariant: ['forward step-up', 'raised platform'],
  },
  {
    exerciseId: 'split-squat',
    requiredConcepts: ['long stance', 'back knee', 'front foot', 'rise'],
    forbiddenConcepts: ['rear-foot elevation', 'step', 'bench hip thrust'],
    expectedEquipment: ['bodyweight', 'dumbbell'],
    expectedBodyPosition: ['long stance', 'feet on floor'],
    expectedSourceVariant: ['static split squat', 'no rear-foot elevation'],
  },
  {
    exerciseId: 'calf-raise',
    requiredConcepts: ['feet', 'heels', 'balls of your feet', 'lower heels'],
    forbiddenConcepts: ['bench', 'row'],
    expectedEquipment: ['bodyweight', 'dumbbell'],
    expectedBodyPosition: ['standing', 'heels lifting'],
    expectedSourceVariant: ['standing calf raise', 'heels lifting and lowering'],
  },
  {
    exerciseId: 'farmer-carry',
    requiredConcepts: ['matching loads', 'sides', 'walk', 'shoulders level'],
    forbiddenConcepts: ['floor', 'bench', 'knees bent'],
    expectedEquipment: ['dumbbell', 'kettlebell', 'carry'],
    expectedBodyPosition: ['standing walk', 'loads at both sides'],
    expectedSourceVariant: ['farmer carry', 'matching loads'],
  },
  {
    exerciseId: 'suitcase-carry',
    requiredConcepts: ['one weight', 'suitcase', 'walk', 'switch sides'],
    forbiddenConcepts: ['matching loads', 'floor', 'bench'],
    expectedEquipment: ['dumbbell', 'kettlebell', 'carry'],
    expectedBodyPosition: ['standing walk', 'one load at one side'],
    expectedSourceVariant: ['suitcase carry', 'one load at one side'],
  },
  {
    exerciseId: '90-90-hip-switch',
    requiredConcepts: ['90/90', 'knees', 'rotate', 'hip'],
    forbiddenConcepts: ['bench', 'deadlift', 'carry'],
    expectedEquipment: ['bodyweight', 'yoga mat'],
    expectedBodyPosition: ['seated', '90/90 positions'],
    expectedSourceVariant: ['90/90 hip switch', 'seated 90/90'],
  },
  {
    exerciseId: 'thoracic-open-book',
    requiredConcepts: ['side', 'knees bent', 'top arm', 'open', 'eyes'],
    forbiddenConcepts: ['standing', 'deadlift', 'bench'],
    expectedEquipment: ['bodyweight', 'yoga mat'],
    expectedBodyPosition: ['side-lying', 'knees stacked'],
    expectedSourceVariant: ['thoracic open book', 'side-lying rotation'],
  },
  {
    exerciseId: 'ankle-rocks',
    requiredConcepts: ['half-kneeling', 'front heel', 'front knee', 'toes'],
    forbiddenConcepts: ['bench', 'hip thrust', 'row'],
    expectedEquipment: ['bodyweight'],
    expectedBodyPosition: ['half-kneeling', 'front heel down'],
    expectedSourceVariant: ['ankle rocks', 'half-kneeling ankle mobility'],
  },
  {
    exerciseId: 'low-lunge-hip-flexor-stretch',
    requiredConcepts: ['lunge', 'rear knee', 'pelvis', 'rear glute', 'hip stretches'],
    forbiddenConcepts: ['bench', 'deadlift', 'row'],
    expectedEquipment: ['bodyweight', 'yoga mat'],
    expectedBodyPosition: ['lunge position', 'rear knee down'],
    expectedSourceVariant: ['hip flexor stretch', 'lunge position'],
  },
  {
    exerciseId: 'dumbbell-bench-press',
    requiredConcepts: ['bench', 'dumbbells', 'elbows', 'press', 'lower'],
    forbiddenConcepts: ['row', 'squat', 'hips'],
    expectedEquipment: ['dumbbell', 'bench'],
    expectedBodyPosition: ['lying on bench', 'feet planted'],
    expectedSourceVariant: ['dumbbell bench press', 'flat bench'],
  },
]

export const exerciseGuideContractById = new Map(
  exerciseGuideContracts.map((contract) => [contract.exerciseId, contract]),
)
