import type {
  BikeTourPurpose,
  Equipment,
  EquipmentKind,
  Exercise,
  ExerciseDefaults,
  ExerciseGroup,
  ExerciseMedia,
  Routine,
  RoutineExercise,
  SchedulePreference,
  TourRoadmap,
  UserSettings,
} from '../types'
import { instructionReviewForExercise } from './exerciseInstructionCatalog'

const seedTimestamp = '2026-01-01T12:00:00.000Z'
const localAttribution = 'Original local seed data created for RampRep.'

interface ExerciseSeed {
  id: string
  name: string
  description: string
  purpose?: string
  setup?: string
  instructions: string[]
  formCues: string[]
  commonMistakes: string[]
  regressions?: string[]
  progressions?: string[]
  dose?: string
  safety?: string[]
  sourceReferences?: Exercise['sourceReferences']
  targetAreas: string[]
  equipment: EquipmentKind[]
  difficulty: Exercise['difficulty']
  group?: ExerciseGroup
  bikeTourPurpose?: BikeTourPurpose[]
  defaults: ExerciseDefaults
  videoUrl?: string
  imageUrl?: string
  attribution?: string
}

interface ExerciseGuidance {
  instructions: string[]
  formCues: string[]
  commonMistakes: string[]
}

const quickExerciseGuidance = (
  id: string,
  group: ExerciseGroup,
  equipment: EquipmentKind[],
  bikeTourPurpose: BikeTourPurpose[],
): ExerciseGuidance => {
  if (id === 'downward-dog') {
    return {
      instructions: [
        'Start on hands and knees with hands slightly forward of shoulders.',
        'Tuck toes, lift hips up and back, and make an inverted V shape.',
        'Bend knees as needed so the spine can lengthen before chasing straight legs.',
        'Press the floor away, breathe slowly, and alternate gentle heel drops if calves are tight.',
      ],
      formCues: ['Long spine first', 'Hands spread wide', 'Shoulders away from ears', 'Knees may stay bent'],
      commonMistakes: ['Forcing heels down', 'Rounding the upper back', 'Shrugging into the neck', 'Holding breath'],
    }
  }

  if (id.includes('trailer') || id.includes('burley') || bikeTourPurpose.includes('trailer handling')) {
    return {
      instructions: [
        'Start with an easy route, low speed, and a quick equipment and comfort check.',
        'Practice smooth starts, wide turns, gentle braking, and stopping before adding distance.',
        'Keep effort conversational and stop early if handling, traffic, heat, or dog comfort changes.',
      ],
      formCues: ['Smooth steering', 'Extra braking distance', 'Quiet upper body', 'Comfort checks first'],
      commonMistakes: ['Riding too fast too soon', 'Turning sharply', 'Skipping comfort checks', 'Adding hills before handling is easy'],
    }
  }

  if (group === 'Walk & Ruck') {
    const ruck = equipment.includes('rucksack')
    return {
      instructions: ruck
        ? [
            'Start with an easy route and a pack load you could repeat tomorrow.',
            'Keep shoulders down, ribs stacked, and stride quiet.',
            'Stop or reduce load for numbness, sharp pain, or next-day soreness that changes your gait.',
          ]
        : [
            'Start at an easy pace and keep the walk conversational.',
            'Stand tall, breathe steadily, and let the walk build base without becoming a workout test.',
            'Stop with enough energy that tomorrow still feels available.',
          ],
      formCues: ruck
        ? ['Tall posture', 'Pack snug, not bouncing', 'Quiet stride', 'No numbness or sharp pain']
        : ['Easy pace', 'Tall posture', 'Relaxed shoulders', 'Comfortable stride'],
      commonMistakes: ruck
        ? ['Filling the whole pack too soon', 'Letting straps dig or bounce', 'Chasing hills while sore', 'Ignoring tingling or hot spots']
        : ['Turning every walk hard', 'Overstriding', 'Skipping water in heat', 'Ignoring foot discomfort'],
    }
  }

  if (group === 'Ride Sessions') {
    return {
      instructions: [
        'Warm up easily before adding distance, grade, or effort.',
        'Settle into a smooth pace you could repeat tomorrow.',
        'Finish with a few easy minutes and note comfort, fueling, and soreness.',
      ],
      formCues: ['Quiet shoulders', 'Steady breathing', 'Even pedal stroke or stride', 'Finish with control'],
      commonMistakes: ['Starting too hard', 'Ignoring comfort signals', 'Turning every ride into a test', 'Skipping cooldown notes'],
    }
  }

  if (group === 'Mobility & Yoga') {
    return {
      instructions: [
        'Move into a comfortable stretch or mobility position without forcing end range.',
        'Breathe slowly and let the target area relax before increasing range.',
        'Ease out of the position gradually and repeat on the other side when needed.',
      ],
      formCues: ['Slow nasal breaths', 'No pinching', 'Gentle pressure', 'Control the exit'],
      commonMistakes: ['Bouncing', 'Chasing pain', 'Holding the breath', 'Letting joints collapse'],
    }
  }

  if (group === 'Core Stability') {
    return {
      instructions: [
        'Set ribs down, pelvis neutral, and brace as if preparing for a gentle cough.',
        'Move slowly while keeping the trunk quiet and breathing behind the brace.',
        'Stop the set when the low back, hips, or shoulders start compensating.',
      ],
      formCues: ['Ribs stacked over pelvis', 'Slow exhale', 'No low-back arch', 'Small clean range'],
      commonMistakes: ['Moving too fast', 'Holding breath', 'Letting the back arch', 'Continuing after control is gone'],
    }
  }

  if (group === 'Upper Back & Posture') {
    const banded = equipment.includes('band')
    return {
      instructions: banded
        ? [
            'Anchor or hold the band so resistance is light enough to move cleanly.',
            'Start with ribs down and neck relaxed, then move from the shoulder blades.',
            'Pause briefly at the strongest position and return slowly.',
          ]
        : [
            'Set the chest, ribs, and hips so the torso stays quiet.',
            'Pull by moving the shoulder blade and elbow, not by shrugging.',
            'Pause briefly, then lower with control through the full range.',
          ],
      formCues: ['Neck relaxed', 'Shoulder blades move first', 'Ribs down', 'Slow return'],
      commonMistakes: ['Shrugging', 'Arching the back', 'Using momentum', 'Cutting the range short'],
    }
  }

  if (group === 'Single-Leg Strength') {
    return {
      instructions: [
        'Set the working foot firmly and find balance before starting the rep.',
        'Lower or rise under control while the knee tracks over the middle toes.',
        'Use a range that keeps hips level and pressure through the whole foot.',
      ],
      formCues: ['Whole foot heavy', 'Knee tracks toes', 'Level hips', 'Quiet tempo'],
      commonMistakes: ['Knee collapsing inward', 'Pushing only through toes', 'Rushing the lower', 'Using more load than control allows'],
    }
  }

  if (group === 'Hinge & Posterior Chain') {
    return {
      instructions: [
        'Brace, soften the knees, and send hips back as if closing a car door.',
        'Keep the load close and stop the descent before the spine rounds.',
        'Drive the floor away and finish tall without leaning back.',
      ],
      formCues: ['Hips move back', 'Long spine', 'Load stays close', 'Glutes finish the rep'],
      commonMistakes: ['Squatting the hinge', 'Reaching load forward', 'Rounding low back', 'Overextending at the top'],
    }
  }

  if (group === 'Carry & Load Transfer') {
    return {
      instructions: [
        'Pick up the load with a hinge and stand tall before walking.',
        'Take slow, quiet steps while keeping ribs stacked and shoulders level.',
        'Set the load down with control before grip or posture breaks.',
      ],
      formCues: ['Tall posture', 'Quiet steps', 'Shoulders level', 'Brace before moving'],
      commonMistakes: ['Rushing', 'Leaning away from the load', 'Shrugging', 'Dropping the load carelessly'],
    }
  }

  return {
    instructions: [
      'Set up in a stable position and choose a range you can control.',
      'Move slowly enough that breathing, posture, and joint position stay steady.',
      'Stop the set when form changes or discomfort appears.',
    ],
    formCues: ['Move deliberately', 'Keep joints stacked', 'Use a controlled range', 'Leave 1-2 reps in reserve'],
    commonMistakes: ['Rushing reps', 'Chasing range before control', 'Holding breath', 'Ignoring soreness signals'],
  }
}

const inferExerciseGroup = (seed: ExerciseSeed): ExerciseGroup => {
  const text = [seed.id, seed.name, seed.description, seed.targetAreas.join(' '), seed.equipment.join(' '), seed.bikeTourPurpose?.join(' ') ?? '']
    .join(' ')
    .toLowerCase()

  if (/burley|trailer|tow/.test(text)) {
    return 'Burley & Trailer Work'
  }
  if (/ride|bike|cycling|gravel|cadence|spin|tour/.test(text)) {
    return 'Ride Sessions'
  }
  if (/balance|tibialis|reach/.test(text)) {
    return 'Balance & Control'
  }
  if (/stretch|mobility|yoga|cat-cow|open book|sphinx|cobra|downward|hip|ankle/.test(text)) {
    return 'Mobility & Yoga'
  }
  if (/row|pull|posture|scapular|shoulder|face pull/.test(text)) {
    return 'Upper Back & Posture'
  }
  if (/carry|load/.test(text)) {
    return 'Carry & Load Transfer'
  }
  if (/split squat|lunge|step-up|single-leg|calf|soleus|wall sit|squat/.test(text)) {
    return 'Single-Leg Strength'
  }
  if (/hinge|deadlift|posterior|hamstring|glute|bridge|swing/.test(text)) {
    return 'Hinge & Posterior Chain'
  }
  if (/recovery|prehab/.test(text)) {
    return 'Recovery'
  }

  return 'Core Stability'
}

const doseText = (defaults: ExerciseDefaults) => {
  const pieces = [
    defaults.sets ? `${defaults.sets} sets` : '',
    defaults.reps ?? '',
    defaults.durationSeconds ? `${Math.round(defaults.durationSeconds / 60) || defaults.durationSeconds}${defaults.durationSeconds >= 60 ? ' min' : ' sec'}` : '',
    defaults.distance ?? '',
  ].filter(Boolean)

  return pieces.length ? pieces.join(' / ') : 'Use a short, crisp set and stop before form fades.'
}

const structuredGuidance = (seed: ExerciseSeed, group: ExerciseGroup) => ({
  purpose: seed.purpose ?? seed.description,
  setup: seed.setup ?? seed.instructions[0] ?? 'Choose a stable start position and a range you can control.',
  regressions:
    seed.regressions ??
    (group === 'Ride Sessions' || group === 'Burley & Trailer Work'
      ? ['Shorten the route, flatten the terrain, or reduce load until handling stays calm.']
      : ['Reduce range, load, or time until each rep is clean.']),
  progressions:
    seed.progressions ??
    (group === 'Ride Sessions' || group === 'Burley & Trailer Work'
      ? ['Add distance, gentle grade, or load only after the previous version feels repeatable.']
      : ['Add a small amount of load, time, or range after form is repeatable.']),
  dose: seed.dose ?? doseText(seed.defaults),
  safety:
    seed.safety ??
    (group === 'Burley & Trailer Work'
      ? ['Stop for heat, traffic, handling issues, or any dog discomfort.', 'Use extra braking distance and avoid sharp turns.']
      : ['Stop if pain, numbness, dizziness, or sharp joint discomfort appears.']),
})

const makeExercise = (seed: ExerciseSeed, index: number): Exercise => {
  void index
  const group = seed.group ?? inferExerciseGroup(seed)
  const guidance = structuredGuidance(seed, group)
  const reviewed = instructionReviewForExercise(seed.id)

  return {
    ...seed,
    group,
    ...guidance,
    ...reviewed,
    imageUrl: seed.imageUrl,
    attribution: seed.attribution ?? localAttribution,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  }
}

const exerciseSeeds: ExerciseSeed[] = [
  {
    id: 'kettlebell-deadlift',
    name: 'kettlebell deadlift',
    description: 'A hinge pattern that builds posterior chain strength for climbing, carrying, and long days on the bike.',
    instructions: [
      'Stand with feet about hip width and the kettlebell between your arches.',
      'Push hips back, bend knees slightly, and grip the handle with both hands.',
      'Brace your trunk, drive the floor away, and stand tall without leaning back.',
      'Return the bell by sending hips back until it settles between your feet.',
    ],
    formCues: ['Ribs stacked over pelvis', 'Shins nearly vertical', 'Bell stays close', 'Stand by squeezing glutes'],
    commonMistakes: ['Squatting too low', 'Rounding the lower back', 'Shrugging the shoulders', 'Finishing with a backbend'],
    targetAreas: ['glutes', 'hamstrings', 'back', 'core'],
    equipment: ['kettlebell'],
    difficulty: 'beginner',
    defaults: { sets: 3, reps: '8' },
  },
  {
    id: 'goblet-squat',
    name: 'goblet squat',
    description: 'A loaded squat that supports knee, hip, and trunk strength for repeated climbs.',
    instructions: [
      'Hold a kettlebell or dumbbell close to the chest.',
      'Set feet just outside hip width and point toes slightly out.',
      'Sit between the hips while keeping the chest proud.',
      'Drive through the whole foot to stand tall.',
    ],
    formCues: ['Elbows track inside knees', 'Heels stay planted', 'Knees follow toes', 'Keep the load close'],
    commonMistakes: ['Collapsing knees inward', 'Rising onto toes', 'Relaxing the brace at the bottom'],
    targetAreas: ['quads', 'glutes', 'core'],
    equipment: ['dumbbell', 'kettlebell'],
    difficulty: 'beginner',
    defaults: { sets: 3, reps: '8' },
  },
  {
    id: 'dumbbell-romanian-deadlift',
    name: 'dumbbell Romanian deadlift',
    description: 'A hip hinge that trains hamstrings and glutes while reinforcing a strong back position.',
    instructions: [
      'Hold dumbbells in front of your thighs with soft knees.',
      'Push hips back until hamstrings feel loaded.',
      'Keep dumbbells close to legs and spine long.',
      'Squeeze glutes to return to standing.',
    ],
    formCues: ['Reach hips back', 'Long neck', 'Weights skim thighs', 'Stop before the back rounds'],
    commonMistakes: ['Turning it into a squat', 'Lowering past available mobility', 'Letting weights drift forward'],
    targetAreas: ['hamstrings', 'glutes', 'back'],
    equipment: ['dumbbell'],
    difficulty: 'beginner',
    defaults: { sets: 3, reps: '8' },
  },
  {
    id: 'step-up',
    name: 'step-up',
    description: 'Single-leg strength work for hips, knees, and climbing resilience.',
    instructions: [
      'Place one foot fully on a stable box or step.',
      'Lean slightly forward and press through the working foot.',
      'Stand tall on top without bouncing from the rear leg.',
      'Lower with control and repeat before switching sides.',
    ],
    formCues: ['Whole foot on step', 'Quiet lower down', 'Knee tracks over middle toes', 'Level hips'],
    commonMistakes: ['Pushing off the back foot', 'Letting knee cave in', 'Using a step that is too high'],
    targetAreas: ['glutes', 'quads', 'calves'],
    equipment: ['bodyweight', 'dumbbell'],
    difficulty: 'beginner',
    defaults: { sets: 3, reps: '8 each leg' },
  },
  {
    id: 'split-squat',
    name: 'split squat',
    description: 'A stable single-leg pattern for hip strength, balance, and knee control.',
    instructions: [
      'Set a long stance with feet on train tracks rather than a tightrope.',
      'Lower the back knee toward the floor while staying tall.',
      'Pause briefly, then press through the front foot to rise.',
      'Complete all reps before switching legs.',
    ],
    formCues: ['Front heel heavy', 'Torso tall', 'Back knee drops down', 'Steady breath'],
    commonMistakes: ['Too narrow a stance', 'Front knee collapsing inward', 'Pushing through the toes only'],
    targetAreas: ['glutes', 'quads', 'hip stabilizers'],
    equipment: ['bodyweight', 'dumbbell'],
    difficulty: 'intermediate',
    defaults: { sets: 3, reps: '8 each leg' },
  },
  {
    id: 'one-arm-dumbbell-row',
    name: 'one-arm dumbbell row',
    description: 'Upper-back pulling strength to offset cycling posture and support carrying.',
    instructions: [
      'Support one hand on a bench, chair, or thigh.',
      'Let the dumbbell hang below the shoulder.',
      'Pull elbow toward the hip while keeping torso steady.',
      'Lower fully without twisting.',
    ],
    formCues: ['Pull shoulder blade back and down', 'Elbow to back pocket', 'Quiet hips', 'Long spine'],
    commonMistakes: ['Shrugging', 'Rotating the torso', 'Cutting the range short'],
    targetAreas: ['lats', 'mid back', 'biceps', 'core'],
    equipment: ['dumbbell'],
    difficulty: 'beginner',
    defaults: { sets: 3, reps: '10 each side' },
  },
  {
    id: 'band-pull-apart',
    name: 'band pull-apart',
    description: 'Light posterior shoulder and upper-back work for posture and shoulder health.',
    instructions: [
      'Hold a band at shoulder height with straight but soft elbows.',
      'Pull hands apart until the band reaches the chest.',
      'Pause and feel shoulder blades move together.',
      'Return slowly without letting the band snap back.',
    ],
    formCues: ['Ribs down', 'Neck relaxed', 'Hands level', 'Move from shoulder blades'],
    commonMistakes: ['Arching the back', 'Bending elbows too much', 'Using a band that is too heavy'],
    targetAreas: ['rear delts', 'upper back', 'shoulders'],
    equipment: ['band'],
    difficulty: 'beginner',
    defaults: { sets: 3, reps: '15' },
  },
  {
    id: 'push-up',
    name: 'push-up',
    description: 'Bodyweight pressing that builds trunk stiffness and upper-body support.',
    instructions: [
      'Start in a strong plank with hands under shoulders.',
      'Lower chest toward the floor with elbows angled back.',
      'Press the floor away while keeping hips and ribs aligned.',
      'Elevate hands if full floor reps are not crisp.',
    ],
    formCues: ['Body moves as one piece', 'Hands grip the floor', 'Elbows about 45 degrees', 'Exhale as you press'],
    commonMistakes: ['Sagging hips', 'Flaring elbows', 'Craning the neck', 'Rushing partial reps'],
    targetAreas: ['chest', 'triceps', 'core', 'shoulders'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    defaults: { sets: 3, reps: '8-12' },
  },
  {
    id: 'dumbbell-floor-press',
    name: 'dumbbell floor press',
    description: 'A joint-friendly press that strengthens chest and triceps without needing a bench.',
    instructions: [
      'Lie on the floor with knees bent and dumbbells above elbows.',
      'Brace lightly and press dumbbells toward the ceiling.',
      'Lower until upper arms touch the floor with control.',
      'Keep wrists stacked over elbows.',
    ],
    formCues: ['Shoulders gently packed', 'Forearms vertical', 'Slow lower', 'Feet planted'],
    commonMistakes: ['Bouncing arms off the floor', 'Letting wrists bend back', 'Overarching the back'],
    targetAreas: ['chest', 'triceps', 'shoulders'],
    equipment: ['dumbbell'],
    difficulty: 'beginner',
    defaults: { sets: 3, reps: '8-12' },
  },
  {
    id: 'farmer-carry',
    name: 'farmer carry',
    description: 'Loaded carry for grip, trunk stiffness, and total-body conditioning.',
    instructions: [
      'Hold matching weights by your sides.',
      'Stand tall with shoulders level and ribs down.',
      'Walk smoothly for the target time or distance.',
      'Set weights down with a hinge.',
    ],
    formCues: ['Tall posture', 'Quiet steps', 'Crush the handles', 'Do not lean back'],
    commonMistakes: ['Rushing', 'Shrugging', 'Letting weights swing', 'Dropping weights carelessly'],
    targetAreas: ['grip', 'traps', 'core', 'hips'],
    equipment: ['dumbbell', 'kettlebell', 'carry'],
    difficulty: 'beginner',
    defaults: { sets: 4, durationSeconds: 45 },
  },
  {
    id: 'suitcase-carry',
    name: 'suitcase carry',
    description: 'Single-sided carry that trains anti-lean core strength and hip control.',
    instructions: [
      'Hold one weight at your side like a suitcase.',
      'Stand tall without leaning away from the load.',
      'Walk smoothly for time, then switch sides.',
      'Hinge to set the weight down.',
    ],
    formCues: ['Shoulders level', 'Slow steady steps', 'Free hand relaxed', 'Brace before walking'],
    commonMistakes: ['Leaning to one side', 'Letting the weight rest on the leg', 'Taking rushed uneven steps'],
    targetAreas: ['obliques', 'grip', 'hips', 'back'],
    equipment: ['dumbbell', 'kettlebell', 'carry'],
    difficulty: 'beginner',
    defaults: { sets: 4, durationSeconds: 45 },
  },
  {
    id: 'dead-bug',
    name: 'dead bug',
    description: 'Low-back friendly core control for resisting extension and keeping the pelvis steady.',
    instructions: [
      'Lie on your back with arms up and hips and knees bent.',
      'Gently press low back toward the floor.',
      'Reach opposite arm and leg away without losing contact.',
      'Return and alternate sides.',
    ],
    formCues: ['Slow tempo', 'Exhale on reach', 'Back stays quiet', 'Move only as far as control allows'],
    commonMistakes: ['Arching the back', 'Moving too fast', 'Holding breath', 'Reaching too far'],
    targetAreas: ['core', 'hip flexors', 'pelvic control'],
    equipment: ['bodyweight', 'yoga mat'],
    difficulty: 'beginner',
    defaults: { sets: 2, reps: '8 each side' },
  },
  {
    id: 'bird-dog',
    name: 'bird dog',
    description: 'Anti-rotation core and back endurance with a gentle hip extension pattern.',
    instructions: [
      'Start on hands and knees with a neutral spine.',
      'Reach opposite arm and leg long.',
      'Pause without shifting hips.',
      'Return with control and alternate sides.',
    ],
    formCues: ['Hips stay square', 'Reach long, not high', 'Neck neutral', 'Slow pause'],
    commonMistakes: ['Rotating open', 'Kicking too high', 'Sagging through the low back'],
    targetAreas: ['core', 'back', 'glutes', 'shoulders'],
    equipment: ['bodyweight', 'yoga mat'],
    difficulty: 'beginner',
    defaults: { sets: 2, reps: '8 each side' },
  },
  {
    id: 'side-plank',
    name: 'side plank',
    description: 'Lateral core endurance for hips, back support, and loaded carrying.',
    instructions: [
      'Set elbow under shoulder and stack or stagger feet.',
      'Lift hips until body forms a straight line.',
      'Breathe calmly while holding.',
      'Lower and switch sides.',
    ],
    formCues: ['Push floor away', 'Hips forward', 'Long line from head to heels', 'Steady nasal breaths'],
    commonMistakes: ['Shoulder shrugging', 'Hips drifting back', 'Holding too long after form fades'],
    targetAreas: ['obliques', 'glute medius', 'shoulders'],
    equipment: ['bodyweight', 'yoga mat'],
    difficulty: 'beginner',
    defaults: { sets: 2, durationSeconds: 30 },
  },
  {
    id: 'glute-bridge',
    name: 'glute bridge',
    description: 'Hip extension activation for glutes and low-back support.',
    instructions: [
      'Lie on your back with knees bent and feet flat.',
      'Lightly brace and press through heels.',
      'Lift hips until ribs, hips, and knees line up.',
      'Lower with control.',
    ],
    formCues: ['Ribs down', 'Drive through heels', 'Squeeze glutes at top', 'Do not overarch'],
    commonMistakes: ['Pushing from toes', 'Overextending low back', 'Feet too far away'],
    targetAreas: ['glutes', 'hamstrings', 'core'],
    equipment: ['bodyweight', 'yoga mat'],
    difficulty: 'beginner',
    defaults: { sets: 2, reps: '12' },
  },
  {
    id: 'glute-bridge-march',
    name: 'glute bridge march',
    description: 'A bridge variation that challenges hip stability and trunk control.',
    instructions: [
      'Lift into a solid glute bridge.',
      'Keep hips level as one knee lifts a few inches.',
      'Set the foot down softly and switch sides.',
      'Stop if the low back takes over.',
    ],
    formCues: ['Small controlled lift', 'Hips stay level', 'Slow exhale', 'Glutes stay active'],
    commonMistakes: ['Rocking side to side', 'Lifting the knee too high', 'Arching the lower back'],
    targetAreas: ['glutes', 'hamstrings', 'core', 'hip stabilizers'],
    equipment: ['bodyweight', 'yoga mat'],
    difficulty: 'intermediate',
    defaults: { sets: 2, reps: '10 each side' },
  },
  {
    id: 'cat-cow',
    name: 'cat-cow',
    description: 'Gentle spinal motion to warm up the back and hips.',
    instructions: [
      'Start on hands and knees.',
      'Round your spine up while exhaling.',
      'Reverse into a gentle arch while inhaling.',
      'Move slowly through comfortable range.',
    ],
    formCues: ['Move segment by segment', 'Keep elbows soft', 'Match breath to motion'],
    commonMistakes: ['Forcing end range', 'Moving too quickly', 'Letting shoulders creep to ears'],
    targetAreas: ['spine', 'back', 'hips'],
    equipment: ['bodyweight', 'yoga mat'],
    difficulty: 'beginner',
    defaults: { durationSeconds: 60 },
  },
  {
    id: 'childs-pose-side-reach',
    name: "child's pose with side reach",
    description: 'A relaxing lat, rib, and back stretch for recovery and prehab.',
    instructions: [
      'Sit hips toward heels with arms forward.',
      'Walk hands to one side and breathe into the opposite ribs.',
      'Hold, then switch sides.',
      'Keep the stretch easy and calm.',
    ],
    formCues: ['Long exhale', 'Hips heavy', 'Reach fingertips away', 'No pinching'],
    commonMistakes: ['Forcing shoulder range', 'Holding breath', 'Letting hips lift high'],
    targetAreas: ['lats', 'back', 'shoulders'],
    equipment: ['bodyweight', 'yoga mat'],
    difficulty: 'beginner',
    defaults: { durationSeconds: 60 },
  },
  {
    id: 'low-lunge-hip-flexor-stretch',
    name: 'low lunge hip-flexor stretch',
    description: 'Hip-flexor mobility to balance long periods in a cycling position.',
    instructions: [
      'Step into a half-kneeling lunge on a mat.',
      'Tuck pelvis gently and squeeze the rear glute.',
      'Shift forward slightly until the front of the rear hip opens.',
      'Breathe, then switch sides.',
    ],
    formCues: ['Glute on rear leg engaged', 'Ribs stacked', 'Small forward shift', 'Pad the knee'],
    commonMistakes: ['Arching the back', 'Pushing too far forward', 'Losing glute tension'],
    targetAreas: ['hip flexors', 'quads', 'core'],
    equipment: ['bodyweight', 'yoga mat'],
    difficulty: 'beginner',
    defaults: { durationSeconds: 60 },
  },
  {
    id: 'figure-four-stretch',
    name: 'figure-four stretch',
    description: 'A glute and hip stretch that helps ease post-ride tightness.',
    instructions: [
      'Lie on your back and cross one ankle over the opposite thigh.',
      'Thread hands behind the thigh or shin.',
      'Pull gently until the outer hip stretches.',
      'Breathe and switch sides.',
    ],
    formCues: ['Flex crossed foot', 'Shoulders relaxed', 'Gentle pressure', 'No knee pain'],
    commonMistakes: ['Yanking the leg', 'Letting the head strain', 'Forcing the knee angle'],
    targetAreas: ['glutes', 'piriformis', 'hips'],
    equipment: ['bodyweight', 'yoga mat'],
    difficulty: 'beginner',
    defaults: { durationSeconds: 60 },
  },
  {
    id: 'hamstring-stretch',
    name: 'hamstring stretch',
    description: 'A controlled posterior thigh stretch for recovery and hinge mobility.',
    instructions: [
      'Lie on your back or sit tall with one leg extended.',
      'Keep spine long and gently bring toes toward you.',
      'Hold at a mild stretch without bouncing.',
      'Switch sides.',
    ],
    formCues: ['Gentle knee bend is fine', 'Long spine', 'Slow breathing', 'No numbness or tingling'],
    commonMistakes: ['Rounding hard through the back', 'Bouncing', 'Chasing max range'],
    targetAreas: ['hamstrings', 'calves', 'back'],
    equipment: ['bodyweight', 'yoga mat'],
    difficulty: 'beginner',
    defaults: { durationSeconds: 60 },
  },
  {
    id: 'thoracic-open-book',
    name: 'thoracic open book',
    description: 'Upper-back rotation mobility for posture and comfortable breathing.',
    instructions: [
      'Lie on your side with knees bent and arms stacked.',
      'Open the top arm across your body toward the floor behind you.',
      'Follow the hand with your eyes while knees stay stacked.',
      'Return and repeat before switching sides.',
    ],
    formCues: ['Knees stay together', 'Rotate through upper back', 'Breathe into ribs', 'Move slowly'],
    commonMistakes: ['Letting knees separate', 'Forcing the shoulder down', 'Moving through low back only'],
    targetAreas: ['thoracic spine', 'chest', 'ribs'],
    equipment: ['bodyweight', 'yoga mat'],
    difficulty: 'beginner',
    defaults: { reps: '8 each side' },
  },
  {
    id: 'sphinx-pose',
    name: 'sphinx pose',
    description: 'A gentle prone back extension for easing flexed posture.',
    instructions: [
      'Lie on your stomach with elbows under shoulders.',
      'Press forearms down and lift chest gently.',
      'Keep glutes relaxed and breathe into the front body.',
      'Lower if the low back pinches.',
    ],
    formCues: ['Shoulders away from ears', 'Forearms heavy', 'Gentle extension', 'Breathe steadily'],
    commonMistakes: ['Jamming the low back', 'Shrugging', 'Holding too much tension'],
    targetAreas: ['spine', 'chest', 'abdominals'],
    equipment: ['bodyweight', 'yoga mat'],
    difficulty: 'beginner',
    defaults: { durationSeconds: 60 },
  },
  {
    id: 'cobra-pose',
    name: 'cobra pose',
    description: 'A stronger prone extension option for the front body and spine.',
    instructions: [
      'Lie on your stomach with hands under shoulders.',
      'Press lightly through hands and lift chest.',
      'Keep elbows slightly bent and shoulders down.',
      'Lower with control.',
    ],
    formCues: ['Chest forward', 'Shoulders down', 'Pubic bone grounded', 'Comfortable range only'],
    commonMistakes: ['Locking elbows', 'Forcing height', 'Letting shoulders creep up'],
    targetAreas: ['spine', 'chest', 'hip flexors'],
    equipment: ['bodyweight', 'yoga mat'],
    difficulty: 'beginner',
    defaults: { durationSeconds: 60 },
  },
  {
    id: 'hip-circles',
    name: 'hip circles',
    description: 'A simple dynamic warmup for hip joints before hinging and squatting.',
    instructions: [
      'Stand tall with hands on hips or hold support.',
      'Draw slow circles with one knee.',
      'Reverse direction, then switch legs.',
      'Keep the trunk quiet.',
    ],
    formCues: ['Small smooth circles', 'Tall posture', 'Control the pelvis'],
    commonMistakes: ['Rushing', 'Twisting the whole torso', 'Forcing range'],
    targetAreas: ['hips', 'glutes'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    defaults: { durationSeconds: 60 },
  },
  {
    id: 'bodyweight-squat',
    name: 'bodyweight squat',
    description: 'A warmup squat pattern for knees, ankles, hips, and trunk position.',
    instructions: [
      'Stand with feet slightly wider than hip width.',
      'Sit hips down and back while reaching arms forward.',
      'Keep heels down and chest proud.',
      'Stand tall and repeat smoothly.',
    ],
    formCues: ['Knees follow toes', 'Whole foot pressure', 'Comfortable depth'],
    commonMistakes: ['Rushing reps', 'Knees collapsing inward', 'Rounding hard at the bottom'],
    targetAreas: ['quads', 'glutes', 'ankles'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    defaults: { sets: 2, reps: '8' },
  },
  {
    id: 'kettlebell-swing',
    name: 'kettlebell swing',
    description: 'A ballistic hinge for conditioning when hinge mechanics are already solid.',
    instructions: [
      'Set the bell slightly in front and hike it back like a football.',
      'Snap hips forward to float the bell to chest height.',
      'Let the bell fall and hinge back for the next rep.',
      'Stop before fatigue changes the hinge.',
    ],
    formCues: ['Hips power the bell', 'Arms are hooks', 'Bell floats, not lifted', 'Neutral spine'],
    commonMistakes: ['Squatting the swing', 'Lifting with shoulders', 'Overextending at the top'],
    targetAreas: ['glutes', 'hamstrings', 'core', 'conditioning'],
    equipment: ['kettlebell'],
    difficulty: 'intermediate',
    defaults: { reps: '10' },
  },
]

const quickExercise = (
  id: string,
  name: string,
  group: ExerciseGroup,
  equipment: EquipmentKind[],
  targetAreas: string[],
  defaults: ExerciseDefaults,
  bikeTourPurpose: BikeTourPurpose[],
  description: string,
): ExerciseSeed => {
  const guidance = quickExerciseGuidance(id, group, equipment, bikeTourPurpose)

  return {
    id,
    name,
    group,
    equipment,
    targetAreas,
    defaults,
    bikeTourPurpose,
    difficulty: 'beginner',
    description,
    instructions: guidance.instructions,
    formCues: guidance.formCues,
    commonMistakes: guidance.commonMistakes,
  }
}

const extraExerciseSeeds: ExerciseSeed[] = [
  quickExercise('front-plank', 'front plank', 'Core Stability', ['bodyweight', 'yoga mat'], ['core', 'shoulders'], { sets: 3, durationSeconds: 30 }, ['anti-extension'], 'Anti-extension core endurance for long seated climbs.'),
  quickExercise('pallof-press', 'Pallof press', 'Core Stability', ['band'], ['obliques', 'core'], { sets: 3, reps: '10 each side' }, ['anti-rotation'], 'Band anti-rotation work for loaded-bike stability.'),
  quickExercise('mcgill-curl-up', 'McGill curl-up', 'Core Stability', ['bodyweight', 'yoga mat'], ['core', 'back'], { sets: 2, reps: '6 each side' }, ['anti-extension'], 'Back-friendly core stiffness drill.'),
  quickExercise('hollow-hold', 'hollow hold', 'Core Stability', ['bodyweight', 'yoga mat'], ['core', 'hip flexors'], { sets: 3, durationSeconds: 20 }, ['anti-extension'], 'Progression from dead bugs for trunk endurance.'),
  quickExercise('bear-crawl-hold', 'bear crawl hold', 'Core Stability', ['bodyweight', 'yoga mat'], ['core', 'shoulders', 'hips'], { sets: 3, durationSeconds: 20 }, ['anti-rotation'], 'Quadruped core stiffness and shoulder support.'),
  quickExercise('band-face-pull', 'band face pull', 'Upper Back & Posture', ['band'], ['upper back', 'rear delts'], { sets: 3, reps: '15' }, ['upper back'], 'Upper-back and shoulder posture work for cycling position.'),
  quickExercise('band-external-rotation', 'band external rotation', 'Upper Back & Posture', ['band'], ['rotator cuff', 'shoulders'], { sets: 2, reps: '12 each side' }, ['upper back'], 'Light shoulder prehab for healthy pulling and posture.'),
  quickExercise('prone-y-t-w', 'prone Y-T-W', 'Upper Back & Posture', ['bodyweight', 'yoga mat'], ['upper back', 'shoulders'], { sets: 2, reps: '6 each shape' }, ['upper back'], 'Low-load scapular control series.'),
  quickExercise('scapular-push-up', 'scapular push-up', 'Upper Back & Posture', ['bodyweight'], ['serratus', 'shoulders'], { sets: 2, reps: '10' }, ['upper back'], 'Shoulder blade control for pressing and riding posture.'),
  quickExercise('chest-supported-dumbbell-row', 'chest-supported dumbbell row', 'Upper Back & Posture', ['dumbbell', 'chair'], ['upper back', 'lats'], { sets: 3, reps: '10' }, ['upper back'], 'Supported row option when a bench or sturdy chair is available.'),
  quickExercise('reverse-lunge', 'reverse lunge', 'Single-Leg Strength', ['bodyweight', 'dumbbell'], ['glutes', 'quads'], { sets: 3, reps: '8 each leg' }, ['hill climbing'], 'Single-leg strength for steep hill starts and climbs.'),
  quickExercise('lateral-lunge', 'lateral lunge', 'Single-Leg Strength', ['bodyweight', 'dumbbell'], ['adductors', 'glutes'], { sets: 2, reps: '8 each side' }, ['hill climbing'], 'Side-to-side hip strength for uneven gravel and handling.'),
  quickExercise('calf-raise', 'calf raise', 'Single-Leg Strength', ['bodyweight', 'dumbbell'], ['calves'], { sets: 3, reps: '12' }, ['hill climbing'], 'Calf capacity for standing efforts and long climbs.'),
  quickExercise('soleus-raise', 'soleus raise', 'Single-Leg Strength', ['bodyweight', 'dumbbell', 'chair'], ['soleus', 'calves'], { sets: 3, reps: '15' }, ['hill climbing'], 'Bent-knee calf work for climbing endurance.'),
  quickExercise('tibialis-raise', 'tibialis raise', 'Balance & Control', ['bodyweight'], ['tibialis anterior', 'ankles'], { sets: 2, reps: '15' }, ['hill climbing'], 'Front-shin strength for descents, hike-a-bike control, and ankle balance.'),
  quickExercise('wall-sit', 'wall sit', 'Single-Leg Strength', ['bodyweight'], ['quads', 'glutes'], { sets: 3, durationSeconds: 30 }, ['hill climbing'], 'Quad endurance for sustained grades.'),
  quickExercise('single-leg-romanian-deadlift', 'single-leg Romanian deadlift', 'Hinge & Posterior Chain', ['bodyweight', 'dumbbell'], ['hamstrings', 'glutes', 'balance'], { sets: 3, reps: '8 each side' }, ['posterior chain'], 'Single-leg hinge control for hips and back durability.'),
  quickExercise('single-leg-balance-reach', 'single-leg balance reach', 'Balance & Control', ['bodyweight'], ['balance', 'feet', 'hips'], { sets: 2, reps: '6 each side' }, ['lateral stability'], 'Quiet single-leg reaching drill for trail stops, clip-ins, and uneven ground.'),
  quickExercise('heel-to-toe-walk', 'heel-to-toe walk', 'Balance & Control', ['bodyweight'], ['balance', 'feet', 'ankles'], { sets: 2, distance: '20 ft' }, ['lateral stability'], 'Narrow-stance walking balance for loaded-bike handling and dismounts.'),
  quickExercise('box-squat-to-chair', 'box squat to chair', 'Single-Leg Strength', ['bodyweight', 'dumbbell', 'chair'], ['quads', 'glutes'], { sets: 3, reps: '8' }, ['hill climbing'], 'Squat strength with a consistent depth target.'),
  quickExercise('couch-stretch', 'couch stretch', 'Mobility & Yoga', ['bodyweight', 'yoga mat'], ['hip flexors', 'quads'], { durationSeconds: 60 }, ['mobility'], 'Deep hip-flexor and quad opener after rides.'),
  quickExercise('downward-dog', 'downward dog', 'Mobility & Yoga', ['bodyweight', 'yoga mat'], ['calves', 'hamstrings', 'shoulders'], { durationSeconds: 60 }, ['mobility'], 'Posterior chain and shoulder mobility reset.'),
  quickExercise('90-90-hip-switch', '90/90 hip switch', 'Mobility & Yoga', ['bodyweight', 'yoga mat'], ['hips'], { sets: 2, reps: '8 each side' }, ['mobility'], 'Hip rotation mobility for saddle comfort.'),
  quickExercise('ankle-rocks', 'ankle dorsiflexion rocks', 'Mobility & Yoga', ['bodyweight'], ['ankles', 'calves'], { sets: 2, reps: '10 each side' }, ['mobility'], 'Ankle mobility for squats, stairs, and hike-a-bike moments.'),
  quickExercise('standing-calf-stretch', 'standing calf stretch', 'Mobility & Yoga', ['bodyweight'], ['calves'], { durationSeconds: 60 }, ['mobility', 'recovery'], 'Simple calf recovery after hills.'),
  quickExercise('thoracic-extension-roller', 'thoracic extension over rolled towel', 'Mobility & Yoga', ['foam roller', 'yoga mat'], ['thoracic spine', 'chest'], { durationSeconds: 60 }, ['mobility'], 'Upper-back extension to counter riding posture.'),
  quickExercise('easy-endurance-ride', 'easy endurance ride', 'Ride Sessions', ['bike'], ['aerobic base'], { durationSeconds: 3600, distance: '10 mi', effort: 4 }, ['ride conditioning'], 'Comfortable endurance riding for aerobic base.'),
  quickExercise('hill-repeat-ride', 'hill repeat ride', 'Ride Sessions', ['bike'], ['quads', 'glutes', 'lungs'], { durationSeconds: 2700, effort: 8 }, ['hill climbing'], 'Short controlled hill repeats around Harrisonburg-style grades.'),
  quickExercise('low-cadence-climb-intervals', 'low-cadence climb intervals', 'Ride Sessions', ['bike'], ['glutes', 'quads', 'core'], { durationSeconds: 2400, effort: 7 }, ['hill climbing'], 'Low-cadence hill strength intervals without sprinting.'),
  quickExercise('loaded-gravel-ride', 'loaded gravel ride', 'Ride Sessions', ['bike'], ['aerobic base', 'trunk'], { durationSeconds: 5400, distance: '20 mi', effort: 6 }, ['loaded-bike durability'], 'Practice handling and pacing with bags or load.'),
  quickExercise('recovery-spin', 'recovery spin', 'Recovery', ['bike'], ['recovery'], { durationSeconds: 1800, effort: 2 }, ['recovery'], 'Easy spin to move blood without adding fatigue.'),
  quickExercise('walk-hike', 'walk/hike', 'Walk & Ruck', ['bodyweight'], ['aerobic base', 'hips'], { durationSeconds: 2700, effort: 3 }, ['walking base'], 'Low-stress outdoor conditioning for busy weeks.'),
  quickExercise('commute-walk', 'commute walk', 'Walk & Ruck', ['bodyweight'], ['aerobic base'], { durationSeconds: 1500, distance: '1.2 mi', effort: 2 }, ['walking base'], 'Default 1.2 mile commute walk for easy consistency.'),
  quickExercise('dog-walk', 'dog walk', 'Walk & Ruck', ['bodyweight'], ['aerobic base', 'hips'], { durationSeconds: 3000, distance: '2.5 mi', effort: 2 }, ['walking base', 'recovery'], 'Default 2.5 mile dog walk that supports base without hard training stress.'),
  quickExercise('dog-walk-light-ruck', 'dog walk with light ruck', 'Walk & Ruck', ['bodyweight', 'rucksack'], ['aerobic base', 'posture'], { durationSeconds: 3000, distance: '2.5 mi', effort: 3 }, ['walking base', 'ruck tolerance'], 'Dog walk with a deliberately light hydration ruck. Dog comfort and posture stay first.'),
  quickExercise('hydration-ruck-walk', 'hydration ruck walk', 'Walk & Ruck', ['bodyweight', 'rucksack'], ['aerobic base', 'posture', 'trunk'], { durationSeconds: 2100, distance: '2 mi', effort: 4 }, ['ruck tolerance', 'loaded-bike durability'], 'Easy pack-carrying walk using a hydration rucksack. Capacity is not the target.'),
  quickExercise('ruck-commute', 'ruck commute', 'Walk & Ruck', ['bodyweight', 'rucksack'], ['aerobic base', 'posture'], { durationSeconds: 1500, distance: '1.2 mi', effort: 3 }, ['ruck tolerance', 'walking base'], 'Short commute walk with a light hydration ruck for gradual load exposure.'),
  quickExercise('easy-posture-ruck', 'easy posture ruck', 'Walk & Ruck', ['bodyweight', 'rucksack'], ['posture', 'trunk', 'aerobic base'], { durationSeconds: 1800, distance: '1.5 mi', effort: 3 }, ['ruck tolerance'], 'Short posture-focused ruck kept easy enough to recover from quickly.'),
  quickExercise('ruck-hill-walk', 'ruck hill walk', 'Walk & Ruck', ['bodyweight', 'rucksack'], ['glutes', 'calves', 'trunk'], { durationSeconds: 1800, distance: '1.5 mi', effort: 5 }, ['ruck tolerance', 'hill climbing'], 'Later-stage gentle hill ruck only when flat rucks feel boringly comfortable.'),
  quickExercise('burley-loaded-trailer-ride', 'Burley loaded trailer ride', 'Burley & Trailer Work', ['bike', 'trailer'], ['aerobic base', 'trunk', 'handling'], { durationSeconds: 2700, distance: '8 mi', effort: 5 }, ['trailer handling', 'loaded-bike durability'], 'Gentle trailer conditioning with dog comfort as the first constraint.'),
  quickExercise('trailer-walk', 'trailer walk', 'Burley & Trailer Work', ['trailer', 'bodyweight'], ['handling', 'aerobic base'], { durationSeconds: 1200, effort: 3 }, ['trailer handling', 'recovery'], 'Low-speed trailer handling practice on foot before dog-loaded riding.'),
  quickExercise('trailer-hill-starts', 'trailer hill starts', 'Burley & Trailer Work', ['bike', 'trailer'], ['handling', 'braking', 'hill starts'], { durationSeconds: 1500, distance: '3 mi', effort: 5 }, ['trailer handling', 'hill climbing'], 'Controlled trailer hill starts and stops on a gentle grade before loaded climbs.'),
  quickExercise('loaded-carry-for-trailer-days', 'loaded carry for trailer days', 'Carry & Load Transfer', ['carry', 'dumbbell', 'kettlebell'], ['trunk', 'grip', 'load tolerance'], { sets: 4, durationSeconds: 45, effort: 6 }, ['loaded-bike durability'], 'Carry work that builds trunk stiffness for loaded bike and trailer handling.'),
  quickExercise('controlled-trailer-towing-workout', 'controlled trailer towing workout', 'Burley & Trailer Work', ['bike', 'trailer'], ['handling', 'aerobic base', 'trunk'], { durationSeconds: 2400, distance: '5 mi', effort: 4 }, ['trailer handling', 'loaded-bike durability'], 'Short controlled towing session with stops, turns, braking practice, and comfort checks.'),
  quickExercise('easy-tour-specificity-session', 'easy tour specificity session', 'Ride Sessions', ['bike'], ['aerobic base', 'pacing'], { durationSeconds: 3600, distance: '12 mi', effort: 4 }, ['ride conditioning', 'loaded-bike durability'], 'Easy touring-specific session for pacing, gear checks, nutrition notes, and steady effort.'),
  quickExercise('dumbbell-bench-press', 'dumbbell bench press', 'Upper Back & Posture', ['dumbbell', 'bench'], ['chest', 'triceps', 'shoulders'], { sets: 3, reps: '8-12' }, ['bench strength'], 'Flat-bench dumbbell press option when the portable bench is available.'),
  quickExercise('bench-supported-one-arm-row', 'bench-supported one-arm row', 'Upper Back & Posture', ['dumbbell', 'bench'], ['lats', 'mid back', 'core'], { sets: 3, reps: '10 each side' }, ['upper back', 'bench strength'], 'More supported one-arm row variation for less low-back fatigue.'),
  quickExercise('bench-hip-thrust', 'bench hip thrust/glute bridge', 'Hinge & Posterior Chain', ['bodyweight', 'bench'], ['glutes', 'hamstrings'], { sets: 3, reps: '10' }, ['posterior chain', 'bench strength'], 'Bench-supported glute bridge or hip thrust for stronger hip extension.'),
  quickExercise('bench-supported-rear-delt-raise', 'bench-supported rear delt raise', 'Upper Back & Posture', ['dumbbell', 'bench'], ['rear delts', 'upper back'], { sets: 2, reps: '12' }, ['upper back', 'bench strength'], 'Bench-supported rear-delt work that keeps the trunk quiet.'),
  quickExercise('rear-foot-elevated-split-squat', 'rear-foot elevated split squat', 'Single-Leg Strength', ['bodyweight', 'dumbbell', 'bench'], ['glutes', 'quads'], { sets: 2, reps: '6 each leg' }, ['hill climbing', 'bench strength'], 'Optional advanced split squat using the bench as rear-foot support.'),
  quickExercise('step-up-to-bench', 'step-up to bench', 'Single-Leg Strength', ['bodyweight', 'dumbbell', 'bench'], ['glutes', 'quads', 'calves'], { sets: 2, reps: '6 each leg' }, ['hill climbing', 'bench strength'], 'Only use when the bench is specifically rated and marked safe for step-ups.'),
]

export const seedExercises = [...exerciseSeeds, ...extraExerciseSeeds].map(makeExercise)

export const seedExerciseMedia: ExerciseMedia[] = []

const routineBase = (id: string, name: string, type: Routine['type'], order: number, estimatedMinutes: number, notes?: string): Routine => ({
  id,
  name,
  type,
  enabled: true,
  order,
  estimatedMinutes,
  notes,
  createdAt: seedTimestamp,
  updatedAt: seedTimestamp,
})

export const seedRoutines: Routine[] = [
  routineBase('routine-a-back-hinge-core', 'Back + Hinge + Core', 'strength', 1, 45),
  routineBase('routine-b-legs-cycling-support', 'Legs + Cycling Support', 'strength', 2, 45),
  routineBase('routine-c-conditioning-circuit', 'Conditioning Circuit', 'conditioning', 3, 30, '4-6 controlled rounds with 60-90 seconds rest. Choose swing only when hinge form is crisp.'),
  routineBase('routine-d-10-minute-mat-mobility', '10-Minute Mat Mobility', 'mobility', 4, 10),
  routineBase('routine-e-recovery-core-back', 'Recovery Core and Back', 'recovery', 5, 20),
  routineBase('routine-f-burley-loaded-trailer-ride', 'Burley Loaded Trailer Ride', 'bike', 6, 60, 'Conditioning ride with dog comfort as mandatory. Start with empty trailer practice before dog-loaded rides. Avoid heat, traffic, excessive speed, and hard hill repeats with the dog.'),
]

const exerciseIdByName = new Map(seedExercises.map((exercise) => [exercise.name, exercise.id]))

const routineExercise = (
  routineId: string,
  name: string,
  section: RoutineExercise['section'],
  order: number,
  details: Omit<Partial<RoutineExercise>, 'id' | 'routineId' | 'exerciseId' | 'section' | 'order'> = {},
): RoutineExercise => ({
  id: `${routineId}-${order}-${exerciseIdByName.get(name)}`,
  routineId,
  exerciseId: exerciseIdByName.get(name) ?? name,
  section,
  order,
  ...details,
})

export const seedRoutineExercises: RoutineExercise[] = [
  routineExercise('routine-a-back-hinge-core', 'cat-cow', 'warmup', 1, { durationSeconds: 60 }),
  routineExercise('routine-a-back-hinge-core', 'hip circles', 'warmup', 2, { durationSeconds: 60 }),
  routineExercise('routine-a-back-hinge-core', 'glute bridge', 'warmup', 3, { sets: 2, reps: '10' }),
  routineExercise('routine-a-back-hinge-core', 'bodyweight squat', 'warmup', 4, { sets: 2, reps: '8' }),
  routineExercise('routine-a-back-hinge-core', 'kettlebell deadlift', 'main', 5, { sets: 3, reps: '8' }),
  routineExercise('routine-a-back-hinge-core', 'goblet squat', 'main', 6, { sets: 3, reps: '8' }),
  routineExercise('routine-a-back-hinge-core', 'one-arm dumbbell row', 'main', 7, { sets: 3, reps: '10 each side', side: 'each', variationKey: 'row-option', variationOptions: ['one-arm dumbbell row', 'bench-supported one-arm row'] }),
  routineExercise('routine-a-back-hinge-core', 'suitcase carry', 'main', 8, { sets: 4, durationSeconds: 45, side: 'each', notes: 'Build toward 60 seconds each side.' }),
  routineExercise('routine-a-back-hinge-core', 'dead bug', 'main', 9, { sets: 2, reps: '8 each side', side: 'each' }),
  routineExercise('routine-a-back-hinge-core', 'side plank', 'main', 10, { sets: 2, durationSeconds: 30, side: 'each', notes: 'Add a third set when 40 seconds is clean.' }),

  routineExercise('routine-b-legs-cycling-support', 'step-up', 'main', 1, { sets: 3, reps: '8 each leg', side: 'each' }),
  routineExercise('routine-b-legs-cycling-support', 'dumbbell Romanian deadlift', 'main', 2, { sets: 3, reps: '8' }),
  routineExercise('routine-b-legs-cycling-support', 'split squat', 'main', 3, { sets: 3, reps: '8 each leg', side: 'each', notes: 'Use 2 sets on lower-energy days.' }),
  routineExercise('routine-b-legs-cycling-support', 'dumbbell floor press', 'main', 4, { sets: 3, reps: '8-12', variationKey: 'press-option', variationOptions: ['dumbbell floor press', 'push-up', 'dumbbell bench press'] }),
  routineExercise('routine-b-legs-cycling-support', 'band pull-apart', 'main', 5, { sets: 3, reps: '15' }),
  routineExercise('routine-b-legs-cycling-support', 'bird dog', 'main', 6, { sets: 2, reps: '8 each side', side: 'each' }),
  routineExercise('routine-b-legs-cycling-support', 'glute bridge march', 'main', 7, { sets: 2, reps: '10 each side', side: 'each', variationKey: 'glute-option', variationOptions: ['glute bridge march', 'bench hip thrust/glute bridge'] }),

  routineExercise('routine-c-conditioning-circuit', 'kettlebell swing', 'circuit', 1, { reps: '10', variationKey: 'hinge-option', variationOptions: ['kettlebell swing', 'kettlebell deadlift'], notes: 'Use deadlift if swings are not feeling crisp.' }),
  routineExercise('routine-c-conditioning-circuit', 'push-up', 'circuit', 2, { reps: '8-12' }),
  routineExercise('routine-c-conditioning-circuit', 'goblet squat', 'circuit', 3, { reps: '8' }),
  routineExercise('routine-c-conditioning-circuit', 'one-arm dumbbell row', 'circuit', 4, { reps: '8 each side', side: 'each' }),
  routineExercise('routine-c-conditioning-circuit', 'farmer carry', 'circuit', 5, { durationSeconds: 45 }),

  routineExercise('routine-d-10-minute-mat-mobility', 'cat-cow', 'mobility', 1, { durationSeconds: 60 }),
  routineExercise('routine-d-10-minute-mat-mobility', "child's pose with side reach", 'mobility', 2, { durationSeconds: 120, side: 'each' }),
  routineExercise('routine-d-10-minute-mat-mobility', 'low lunge hip-flexor stretch', 'mobility', 3, { durationSeconds: 120, side: 'each' }),
  routineExercise('routine-d-10-minute-mat-mobility', 'figure-four stretch', 'mobility', 4, { durationSeconds: 120, side: 'each' }),
  routineExercise('routine-d-10-minute-mat-mobility', 'hamstring stretch', 'mobility', 5, { durationSeconds: 120, side: 'each' }),
  routineExercise('routine-d-10-minute-mat-mobility', 'thoracic open book', 'mobility', 6, { reps: '8 each side', side: 'each' }),
  routineExercise('routine-d-10-minute-mat-mobility', 'sphinx pose', 'mobility', 7, { durationSeconds: 60, variationKey: 'extension-option', variationOptions: ['sphinx pose', 'cobra pose'] }),

  routineExercise('routine-e-recovery-core-back', 'bird dog', 'recovery', 1, { sets: 2, reps: '8 each side', side: 'each' }),
  routineExercise('routine-e-recovery-core-back', 'dead bug', 'recovery', 2, { sets: 2, reps: '8 each side', side: 'each' }),
  routineExercise('routine-e-recovery-core-back', 'side plank', 'recovery', 3, { sets: 2, durationSeconds: 25, side: 'each' }),
  routineExercise('routine-e-recovery-core-back', 'glute bridge', 'recovery', 4, { sets: 2, reps: '12' }),
  routineExercise('routine-e-recovery-core-back', 'thoracic open book', 'recovery', 5, { reps: '8 each side', side: 'each' }),
  routineExercise('routine-e-recovery-core-back', "child's pose with side reach", 'recovery', 6, { durationSeconds: 60 }),

  routineExercise('routine-f-burley-loaded-trailer-ride', 'Burley loaded trailer ride', 'precheck', 1, { notes: 'Pre-check tires, hitch, leash/harness, water, route, weather, and dog comfort.' }),
  routineExercise('routine-f-burley-loaded-trailer-ride', 'easy endurance ride', 'warmup', 2, { durationSeconds: 600, notes: '10 min easy warmup before adding any climbing.' }),
  routineExercise('routine-f-burley-loaded-trailer-ride', 'Burley loaded trailer ride', 'ride', 3, { durationSeconds: 2700, distance: '8 mi', notes: '20-45 min easy loaded ride. Optional 3-5 gentle climbs only if dog is comfortable.' }),
  routineExercise('routine-f-burley-loaded-trailer-ride', 'recovery spin', 'cooldown', 4, { durationSeconds: 600, notes: '5-10 min cooldown and dog comfort check.' }),
]

export const seedEquipment: Equipment[] = [
  { id: 'yoga-mat', name: 'yoga mat', kind: 'yoga mat', owned: true, recommended: true, notes: 'Useful for mobility, core work, and kneeling lunges.' },
  { id: 'kettlebell-25-35', name: 'kettlebell: 25-35 lb starter', kind: 'kettlebell', owned: false, recommended: true },
  { id: 'kettlebell-45-53', name: 'kettlebell: 45-53 lb later', kind: 'kettlebell', owned: false, recommended: true },
  { id: 'adjustable-dumbbells', name: 'adjustable dumbbells or 20/30/40 lb pairs', kind: 'dumbbell', owned: false, recommended: true },
  { id: 'portable-flat-bench', name: 'portable flat bench', kind: 'bench', owned: false, recommended: true, notes: 'For pressing, supported rows, hip thrusts, and rear delt raises. Step-ups need a separate safety toggle.' },
  { id: 'hydration-rucksack-12l', name: 'hydration rucksack 12L', kind: 'rucksack', owned: false, recommended: true, notes: 'Use as a light ruck. Capacity is not the target load.' },
  { id: 'loop-bands', name: 'loop resistance bands', kind: 'band', owned: false, recommended: true },
  { id: 'suspension-trainer', name: 'optional suspension trainer/TRX', kind: 'suspension trainer', owned: false, recommended: false },
  { id: 'pull-up-bar', name: 'optional pull-up bar', kind: 'pull-up bar', owned: false, recommended: false },
]

export const seedSettings: UserSettings = {
  id: 'default',
  units: 'lb',
  bodyweight: undefined,
  durationPreference: 30,
  googleAppsScriptUrl: '',
  commuteDefaultMiles: 1.2,
  dogWalkDefaultMiles: 2.5,
  ruckDefaultWaterLiters: 1,
  ruckDefaultExtraWeight: 0,
  ruckEmptyPackWeight: 2,
  benchStepUpsSafe: false,
  darkMode: 'system',
  seededAt: seedTimestamp,
  updatedAt: seedTimestamp,
}

export const seedSchedule: SchedulePreference = {
  id: 'default',
  weeklyFrequency: 3,
  preferredDays: [1, 3, 5],
  dayAssignments: {
    '1': 'routine-a-back-hinge-core',
    '3': 'routine-b-legs-cycling-support',
    '5': 'routine-c-conditioning-circuit',
  },
  temporaryChanges: [],
  travelMode: false,
  busyWorkWeek: false,
  hillFocusWeek: false,
  recoveryWeek: false,
  deloadEveryFourthWeek: true,
  updatedAt: seedTimestamp,
}

export const seedRoadmap: TourRoadmap = {
  id: 'default',
  updatedAt: seedTimestamp,
  phases: [
    { id: 'phase-foundation', title: 'Base', months: 'Months 1-3', order: 1, focus: ['build consistency', 'core/back durability', 'hip/glute strength', 'mobility habit', 'easy rides and walks'] },
    { id: 'phase-hill-strength', title: 'Build + Hill Support', months: 'Months 4-6', order: 2, focus: ['step-ups', 'split squats', 'loaded carries', 'low-cadence hill riding', 'longer weekend rides'] },
    { id: 'phase-loaded-gravel', title: 'Tour Specificity', months: 'Months 7-9', order: 3, focus: ['longer rides', 'back-to-back ride days', 'bags/trailer/load practice', 'Harrisonburg hill routes', 'recovery routines'] },
    { id: 'phase-tour-simulation', title: 'Tour Simulation', months: 'Months 10-11', order: 4, focus: ['multi-hour rides', 'back-to-back long days', 'loaded climbs', 'nutrition/hydration notes', 'soreness tracking'] },
    { id: 'phase-taper', title: 'Taper / Departure Prep', months: 'Month 12', order: 5, focus: ['reduce volume', 'preserve mobility and core', 'short sharp hill efforts', 'bike fit/equipment checklist'] },
  ],
  milestones: [
    { id: 'mile-foundation-1', phaseId: 'phase-foundation', title: 'Complete 3 consistent weeks', description: 'Hit the planned weekly frequency without forcing missed days.', targetMonth: 1, order: 1, completed: false },
    { id: 'mile-foundation-2', phaseId: 'phase-foundation', title: 'Own the core baseline', description: 'Dead bug, bird dog, side plank, and glute bridge feel crisp.', targetMonth: 2, order: 2, completed: false },
    { id: 'mile-foundation-3', phaseId: 'phase-foundation', title: 'Mobility habit is automatic', description: 'Use 10-minute mat mobility at least twice per week.', targetMonth: 3, order: 3, completed: false },
    { id: 'mile-hills-1', phaseId: 'phase-hill-strength', title: 'Hill strength week', description: 'Add step-ups, split squats, and low-cadence climbing in the same week.', targetMonth: 4, order: 4, completed: false },
    { id: 'mile-hills-2', phaseId: 'phase-hill-strength', title: 'Longer weekend ride', description: 'Build a sustainable weekend ride without back or hip flare-ups.', targetMonth: 6, order: 5, completed: false },
    { id: 'mile-loaded-1', phaseId: 'phase-loaded-gravel', title: 'Loaded handling practice', description: 'Ride with bags, load, or empty trailer on mixed surface.', targetMonth: 7, order: 6, completed: false },
    { id: 'mile-loaded-2', phaseId: 'phase-loaded-gravel', title: 'Back-to-back ride days', description: 'Two consecutive ride days with recovery routine afterward.', targetMonth: 9, order: 7, completed: false },
    { id: 'mile-sim-1', phaseId: 'phase-tour-simulation', title: 'Tour simulation weekend', description: 'Multi-hour loaded ride plus next-day endurance ride.', targetMonth: 10, order: 8, completed: false },
    { id: 'mile-sim-2', phaseId: 'phase-tour-simulation', title: 'Nutrition and soreness notes', description: 'Track fueling, hydration, soreness, and recovery after long efforts.', targetMonth: 11, order: 9, completed: false },
    { id: 'mile-taper-1', phaseId: 'phase-taper', title: 'Equipment and bike fit check', description: 'Confirm fit, bags/trailer, lights, bottles, repair kit, and comfort items.', targetMonth: 12, order: 10, completed: false },
  ],
  conflicts: [],
}
