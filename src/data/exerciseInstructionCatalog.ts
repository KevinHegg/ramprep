import { getExerciseDemoMedia, priorityExerciseIds } from './exerciseDemoCatalog'
import type { Exercise, ExerciseSourceReference } from '../types'

type InstructionOverride = Partial<Pick<Exercise, 'purpose' | 'setup' | 'instructions' | 'formCues' | 'commonMistakes' | 'regressions' | 'progressions' | 'dose' | 'safety'>>

const reviewedAtISO = '2026-06-23T16:30:00.000Z'

const fallbackSources: Record<string, ExerciseSourceReference> = {
  ace: {
    title: 'ACE Exercise Library',
    provider: 'ACE Fitness',
    url: 'https://www.acefitness.org/resources/everyone/exercise-library/',
    reviewedAtISO,
  },
  nasm: {
    title: 'NASM Exercise Library',
    provider: 'NASM',
    url: 'https://www.nasm.org/resource-center/exercise-library',
    reviewedAtISO,
  },
  yoga: {
    title: 'Yoga Journal Pose Library',
    provider: 'Yoga Journal',
    url: 'https://www.yogajournal.com/poses/',
    reviewedAtISO,
  },
  wger: {
    title: 'wger Exercise Database',
    provider: 'wger',
    url: 'https://wger.de/en/exercise/overview/',
    reviewedAtISO,
  },
  burley: {
    title: 'Burley safety guidance',
    provider: 'Burley',
    url: 'https://burley.com/pages/safety',
    reviewedAtISO,
  },
}

const yogaIds = new Set([
  'downward-dog',
  'cat-cow',
  'childs-pose-side-reach',
  'low-lunge-hip-flexor-stretch',
  'figure-four-stretch',
  'hamstring-stretch',
  'thoracic-open-book',
  'sphinx-pose',
  'cobra-pose',
  'couch-stretch',
  'ankle-rocks',
])

const rideIds = new Set(['burley-loaded-trailer-ride', 'hill-repeat-ride', 'low-cadence-climb-intervals'])

export const sourceReferencesForExercise = (exerciseId: string): ExerciseSourceReference[] => {
  const demoMedia = getExerciseDemoMedia(exerciseId)
  const demoSource =
    demoMedia?.sourcePageUrl || demoMedia?.url
      ? [
          {
            title: demoMedia.title,
            provider: demoMedia.provider,
            url: demoMedia.sourcePageUrl ?? demoMedia.url,
            reviewedAtISO: demoMedia.reviewedAtISO,
          },
        ]
      : []

  if (demoSource.length) {
    return demoSource
  }

  if (rideIds.has(exerciseId)) {
    return [fallbackSources.burley, fallbackSources.ace]
  }

  if (yogaIds.has(exerciseId)) {
    return [fallbackSources.yoga]
  }

  if (exerciseId === 'tibialis-raise') {
    return [fallbackSources.wger, fallbackSources.ace]
  }

  return [fallbackSources.ace, fallbackSources.nasm]
}

export const priorityExerciseInstructionOverrides: Partial<Record<(typeof priorityExerciseIds)[number], InstructionOverride>> = {
  'downward-dog': {
    purpose: 'Posterior chain, shoulder, and spine mobility reset after cycling or desk time.',
    setup:
      'Start on hands and knees. Hands slightly forward of shoulders. Spread fingers. Press knuckles and the base of each index finger into the mat. Tuck toes.',
    instructions: [
      'Exhale and lift knees from the floor.',
      'Send hips up and back to make an upside-down V.',
      'Keep knees bent if tight hamstrings pull the low back round.',
      'Push the floor away so shoulders stay broad and away from ears.',
      'Keep head between upper arms and lengthen spine before trying to straighten legs.',
      'Let heels get heavy but do not force them to the floor.',
      'Hold 3-6 slow breaths, then lower knees before wrists or shoulders get irritated.',
    ],
    formCues: ['Long spine before straight legs', 'Hands active and fingers spread', 'Ribs gently drawn in', 'Heels heavy, not forced'],
    commonMistakes: [
      'Forcing heels down and rounding the low back.',
      'Shrugging shoulders into ears.',
      'Dumping all weight into wrists.',
      'Locking knees when hamstrings are tight.',
    ],
    regressions: ['Bend knees more.', 'Place hands on a wall or chair.', 'Shorten the hold to 1-2 breaths.'],
    progressions: ['Hold longer with smooth breathing.', 'Pedal calves slowly.', 'Add slow plank-to-down-dog transitions.'],
    dose: '3-6 slow breaths or 30-60 seconds.',
    safety: ['Stop if wrists, shoulders, or head pressure feel sharp or escalating.', 'Avoid long holds if dizziness or uncontrolled high blood pressure symptoms appear.'],
  },
  '90-90-hip-switch': {
    purpose: 'Hip internal and external rotation practice for saddle comfort and easier low-speed bike handling.',
    setup:
      'Sit tall on the floor. Bend both knees so the front shin and back shin each form roughly 90 degrees. Place fingertips lightly behind you if balance or hip mobility is limited.',
    instructions: [
      'Start with ribs stacked over hips and both sit bones heavy.',
      'Press the outside edges of both feet into the floor.',
      'Rotate both knees slowly toward the opposite side while keeping feet close to their starting spots.',
      'Let hips rotate first; avoid yanking from the low back.',
      'Arrive in the opposite 90/90 shape, pause, and breathe into the hips.',
      'Switch back with the same slow control.',
    ],
    formCues: ['Tall ribs over pelvis', 'Feet stay close to planted', 'Knees move like windshield wipers', 'Use hands for support before forcing range'],
    commonMistakes: [
      'Collapsing backward and losing the tall spine.',
      'Dragging feet around instead of rotating through the hips.',
      'Twisting through the low back to fake hip range.',
      'Forcing knee angle when the hip feels pinchy.',
    ],
    regressions: ['Keep hands behind you.', 'Widen the knees.', 'Move only halfway between sides.'],
    progressions: ['Lift hands from the floor.', 'Add a tall-kneeling hip lift between switches.', 'Slow the switch to a 3-second count each direction.'],
    dose: '2 sets of 5-8 slow switches each direction.',
    safety: ['Stop if either hip pinches sharply or knee pressure builds.', 'Use a higher seat or support if sitting on the floor rounds the back.'],
  },
  'couch-stretch': {
    setup: 'Pad the rear knee near a wall, couch, or bench. Place the rear shin up the support and bring the front foot forward into a half-kneeling stance.',
    instructions: [
      'Squeeze the rear glute and tuck the pelvis slightly before shifting.',
      'Keep ribs stacked over hips instead of arching the low back.',
      'Move the torso upright only as far as the front of the rear hip and thigh can tolerate.',
      'Breathe slowly for the target hold, then step out carefully and switch sides.',
    ],
    commonMistakes: ['Arching the low back to chase range.', 'Putting the rear knee directly on a hard floor.', 'Letting the front knee collapse inward.', 'Holding through knee pain.'],
    regressions: ['Move farther from the wall.', 'Use a lower couch height.', 'Hold a chair for balance.'],
    safety: ['Stop if the rear knee or front of the hip feels sharp or nervy.'],
  },
  'ankle-rocks': {
    setup: 'Stand in a short split stance near a wall or hold support. Keep the front heel fully down.',
    instructions: [
      'Drive the front knee toward the middle toes while the heel stays planted.',
      'Pause when the ankle or calf gives a mild stretch.',
      'Return the knee back over the ankle with control.',
      'Repeat smoothly before switching sides.',
    ],
    commonMistakes: ['Letting the heel lift.', 'Collapsing the knee inward.', 'Bouncing into the end range.', 'Turning the foot far outward to fake motion.'],
    regressions: ['Shorten the stance.', 'Use both hands on a wall.', 'Reduce range until the heel stays heavy.'],
    safety: ['Stop if the front of the ankle pinches sharply.'],
  },
  'tibialis-raise': {
    setup: 'Stand with back against a wall and feet 6-12 inches forward. Keep heels on the floor.',
    instructions: [
      'Brace lightly and keep knees soft.',
      'Lift toes and the balls of the feet toward shins while heels stay planted.',
      'Pause at the top until the front of the shins work.',
      'Lower slowly without letting feet slap the floor.',
    ],
    commonMistakes: ['Rocking the whole body.', 'Letting heels lift.', 'Rushing the lowering phase.', 'Continuing after shin cramping changes the motion.'],
    regressions: ['Move feet closer to the wall.', 'Use smaller toe lifts.', 'Do fewer reps.'],
    safety: ['Stop if shin pain feels sharp or lingers after the set.'],
  },
  'burley-loaded-trailer-ride': {
    setup: 'Inspect tires, hitch, safety strap, trailer flag, harness/leash setup, water, route, weather, and dog comfort before rolling.',
    instructions: [
      'Start on flat, quiet pavement or packed gravel before adding hills or traffic.',
      'Roll out with two hands on the bars and several smooth starts and stops.',
      'Use wide turns and extra braking distance because the trailer changes bike handling.',
      'Keep effort conversational and check dog comfort before adding distance.',
      'End early if heat, traffic, surface, braking, or dog behavior changes.',
    ],
    commonMistakes: ['Adding hills before low-speed handling is automatic.', 'Turning sharply with the trailer loaded.', 'Braking late.', 'Ignoring dog heat, stress, or position changes.'],
    regressions: ['Practice with an empty trailer.', 'Shorten to 10-15 minutes.', 'Use a flat loop with no traffic.'],
    progressions: ['Add a small load.', 'Add gentle hills.', 'Extend duration only after dog comfort stays consistent.'],
    safety: ['Stop for dog discomfort, heat, traffic risk, handling instability, or braking uncertainty.'],
  },
  'hill-repeat-ride': {
    setup: 'Choose a quiet, familiar hill with safe turnaround space. Warm up 10-15 minutes before the first effort.',
    instructions: [
      'Begin each repeat seated with hands secure and cadence smooth.',
      'Ride uphill at a hard but controlled effort, leaving one repeat in reserve.',
      'Keep shoulders relaxed and ribs quiet while pressure stays even through both pedals.',
      'Recover by spinning easily downhill or on flat ground before the next repeat.',
    ],
    commonMistakes: ['Sprinting the first repeat.', 'Grinding until form falls apart.', 'Skipping recovery spin.', 'Choosing a hill with unsafe traffic or turns.'],
    regressions: ['Use fewer repeats.', 'Choose a gentler grade.', 'Cap effort at RPE 6-7.'],
    safety: ['Stop if traffic, dizziness, chest pain, or handling changes appear.'],
  },
  'low-cadence-climb-intervals': {
    setup: 'Warm up first, then choose a steady grade or trainer resistance where low cadence is controlled rather than maximal.',
    instructions: [
      'Shift to a gear that lets you pedal around 55-70 rpm without rocking hips.',
      'Keep hands light, chest quiet, and pressure even through left and right pedals.',
      'Hold the interval at a strong, repeatable effort rather than a sprint.',
      'Spin easily between intervals until breathing settles.',
    ],
    commonMistakes: ['Using a gear so heavy the hips rock.', 'Holding breath.', 'Letting knees dive inward.', 'Turning strength intervals into all-out sprints.'],
    regressions: ['Raise cadence.', 'Shorten intervals.', 'Use flatter terrain.'],
    safety: ['Stop if knees, low back, or chest symptoms appear.'],
  },
}

export const instructionReviewForExercise = (exerciseId: string) => ({
  ...(priorityExerciseInstructionOverrides[exerciseId as (typeof priorityExerciseIds)[number]] ?? {}),
  sourceReferences: sourceReferencesForExercise(exerciseId),
})
