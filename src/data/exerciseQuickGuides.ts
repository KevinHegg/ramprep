export type ExerciseQuickGuide = {
  exerciseId: string
  cues: string[]
  mistakes: string[]
  status: 'approved' | 'draft' | 'missing'
  sourceVideoId: string
  reviewedAtISO?: string
  reviewNotes?: string
}

const reviewedAtISO = '2026-06-25T12:00:00.000Z'

export const exerciseQuickGuides: ExerciseQuickGuide[] = [
  {
    exerciseId: 'dead-bug',
    sourceVideoId: 'xtTIb6dC-vI',
    status: 'approved',
    reviewedAtISO,
    cues: ['Lie on your back with arms up and knees over hips.', 'Press low back gently toward the floor before reaching.', 'Move one arm and the opposite leg only as far as control holds.'],
    mistakes: ['Do not let the low back arch off the floor.', 'Do not rush or hold your breath.', 'Do not reach farther than your trunk can control.'],
  },
  {
    exerciseId: 'bird-dog',
    sourceVideoId: 'xEDnlOxeJH4',
    status: 'approved',
    reviewedAtISO,
    cues: ['Start on hands and knees with wrists under shoulders.', 'Reach opposite arm and leg long, not high.', 'Pause while hips stay square, then return with control.'],
    mistakes: ['Do not rotate your hips open.', 'Do not kick the leg high and arch your back.', 'Do not shrug into your neck.'],
  },
  {
    exerciseId: 'side-plank',
    sourceVideoId: 'qbuqsJ9CuQA',
    status: 'approved',
    reviewedAtISO,
    cues: ['Set elbow under shoulder and stack or stagger feet.', 'Lift hips into a straight line from head to ankles.', 'Push the floor away and breathe while holding.'],
    mistakes: ['Do not let hips sag or drift backward.', 'Do not shrug the shoulder toward your ear.', 'Do not keep holding after alignment breaks.'],
  },
  {
    exerciseId: 'pallof-press',
    sourceVideoId: 'n8ZZG9gElhs',
    status: 'approved',
    reviewedAtISO,
    cues: ['Stand sideways to the band or cable anchor.', 'Brace ribs over pelvis before pressing hands forward.', 'Keep chest quiet as the band tries to rotate you.'],
    mistakes: ['Do not let shoulders twist toward the anchor.', 'Do not lock knees or lean back.', 'Do not choose resistance that pulls you out of stance.'],
  },
  {
    exerciseId: 'bench-supported-one-arm-row',
    sourceVideoId: 'PgpQ4-jHiq4',
    status: 'approved',
    reviewedAtISO,
    cues: ['Place one hand and knee on the bench for support.', 'Let the dumbbell hang under your shoulder.', 'Row elbow toward your hip while torso stays quiet.'],
    mistakes: ['Do not twist your chest to lift the weight.', 'Do not shrug the shoulder toward your ear.', 'Do not cut the lower range short.'],
  },
  {
    exerciseId: 'band-pull-apart',
    sourceVideoId: 'bYsgk9SrJ48',
    status: 'approved',
    reviewedAtISO,
    cues: ['Hold the band at shoulder height with soft elbows.', 'Pull hands apart until the band reaches your chest.', 'Pause with shoulder blades moving together, then return slowly.'],
    mistakes: ['Do not arch your back to finish the pull.', 'Do not bend elbows into a row.', 'Do not use a band that forces neck tension.'],
  },
  {
    exerciseId: 'band-face-pull',
    sourceVideoId: 'AlTGQrDOd98',
    status: 'approved',
    reviewedAtISO,
    cues: ['Anchor the band around face height.', 'Pull hands toward your face with elbows high.', 'Finish with shoulder blades back and neck relaxed.'],
    mistakes: ['Do not pull from a low anchor.', 'Do not flare ribs or lean backward.', 'Do not turn it into a biceps curl.'],
  },
  {
    exerciseId: 'kettlebell-deadlift',
    sourceVideoId: 'LDfnyt0Rmaw',
    status: 'approved',
    reviewedAtISO,
    cues: ['Stand with the bell between your feet.', 'Brace, send hips back, and grip the handle.', 'Drive through feet to stand while the bell stays close.'],
    mistakes: ['Do not set up with the bell far in front.', 'Do not round your spine at the bottom.', 'Do not finish by leaning backward.'],
  },
  {
    exerciseId: 'dumbbell-romanian-deadlift',
    sourceVideoId: 'IJdUtnxAmNo',
    status: 'approved',
    reviewedAtISO,
    cues: ['Hold dumbbells in front of thighs with soft knees.', 'Hinge hips back until hamstrings feel loaded.', 'Keep weights close and squeeze glutes to stand.'],
    mistakes: ['Do not turn the hinge into a squat.', 'Do not let dumbbells drift away from legs.', 'Do not lower past a long-spine position.'],
  },
  {
    exerciseId: 'floor-glute-bridge',
    sourceVideoId: 'PhTDzR0TpZs',
    status: 'approved',
    reviewedAtISO,
    cues: ['Lie on your back with knees bent and feet flat near your hips.', 'Brace gently, press through your feet, and lift your hips.', 'Finish with shoulders, hips, and knees aligned; lower slowly.'],
    mistakes: ['Do not push through your neck.', 'Do not flare ribs or arch the lower back.', 'Do not let knees collapse inward.'],
  },
  {
    exerciseId: 'bench-hip-thrust',
    sourceVideoId: 'Ns8pTamaGGg',
    status: 'approved',
    reviewedAtISO,
    cues: ['Rest your upper back on the bench edge; plant both feet flat.', 'Brace ribs down, tuck chin slightly, and drive hips upward through your feet.', 'Stop when shoulders, hips, and knees form a straight line; squeeze glutes.'],
    mistakes: ['Do not finish by arching your lower back.', 'Do not place the bench against your neck.', 'Do not let knees collapse inward or feet slide.'],
  },
  {
    exerciseId: 'goblet-squat',
    sourceVideoId: 'vP1aAzDdVDM',
    status: 'approved',
    reviewedAtISO,
    cues: ['Hold the weight at chest height with elbows down.', 'Sit between hips while knees track over toes.', 'Drive through the whole foot to stand tall.'],
    mistakes: ['Do not let knees collapse inward.', 'Do not tip onto your toes.', 'Do not lose the brace at the bottom.'],
  },
  {
    exerciseId: 'step-up',
    sourceVideoId: 'buDRJkcqnVs',
    status: 'approved',
    reviewedAtISO,
    cues: ['Place the whole working foot on the step.', 'Press through that foot to rise without bouncing.', 'Lower with control before switching sides.'],
    mistakes: ['Do not push mostly from the rear foot.', 'Do not let the front knee cave inward.', 'Do not use a step too high for control.'],
  },
  {
    exerciseId: 'split-squat',
    sourceVideoId: 'qW5OGJ62ZjY',
    status: 'approved',
    reviewedAtISO,
    cues: ['Set a long stance with feet on train tracks.', 'Lower the back knee while front foot stays planted.', 'Press through the front foot to rise.'],
    mistakes: ['Do not balance on a tightrope stance.', 'Do not let the front knee collapse inward.', 'Do not push only through the toes.'],
  },
  {
    exerciseId: 'calf-raise',
    sourceVideoId: 'k8ipHzKeAkQ',
    status: 'approved',
    reviewedAtISO,
    cues: ['Stand tall with feet about hip width.', 'Rise onto the balls of your feet under control.', 'Pause briefly, then lower heels slowly.'],
    mistakes: ['Do not roll ankles outward or inward.', 'Do not bounce through the bottom.', 'Do not let hips drift forward.'],
  },
  {
    exerciseId: 'farmer-carry',
    sourceVideoId: 'z7E_YU9P1jU',
    status: 'approved',
    reviewedAtISO,
    cues: ['Hold matching loads at your sides.', 'Stand tall with ribs stacked and shoulders level.', 'Walk with slow, quiet steps until posture fades.'],
    mistakes: ['Do not shrug the weights upward.', 'Do not rush or let weights swing.', 'Do not drop the weights carelessly.'],
  },
  {
    exerciseId: 'suitcase-carry',
    sourceVideoId: 'y-hn_Ha1-RE',
    status: 'approved',
    reviewedAtISO,
    cues: ['Hold one weight at your side like a suitcase.', 'Walk tall without leaning away from the load.', 'Switch sides after the target time or distance.'],
    mistakes: ['Do not let the weight rest on your leg.', 'Do not tilt shoulders away from the load.', 'Do not rush with uneven steps.'],
  },
  {
    exerciseId: '90-90-hip-switch',
    sourceVideoId: 'm51AZSXMvEA',
    status: 'approved',
    reviewedAtISO,
    cues: ['Sit tall with both knees bent in 90/90 positions.', 'Rotate knees toward the other side while feet stay close.', 'Use hands for support before forcing hip range.'],
    mistakes: ['Do not collapse backward through your spine.', 'Do not drag feet far around the floor.', 'Do not force through hip or knee pinching.'],
  },
  {
    exerciseId: 'thoracic-open-book',
    sourceVideoId: 'OW6YHlxY6JI',
    status: 'approved',
    reviewedAtISO,
    cues: ['Lie on your side with knees bent and stacked.', 'Open the top arm across your body toward the floor.', 'Follow your hand with your eyes while knees stay together.'],
    mistakes: ['Do not let knees separate to fake rotation.', 'Do not force the shoulder to the floor.', 'Do not twist only from the lower back.'],
  },
  {
    exerciseId: 'ankle-rocks',
    sourceVideoId: 'Hm_Iu72bJJg',
    status: 'approved',
    reviewedAtISO,
    cues: ['Set a half-kneeling stance with front heel down.', 'Rock the front knee toward the middle toes.', 'Return with control while the heel stays planted.'],
    mistakes: ['Do not let the heel lift.', 'Do not collapse the knee inward.', 'Do not bounce into a pinchy ankle range.'],
  },
  {
    exerciseId: 'low-lunge-hip-flexor-stretch',
    sourceVideoId: 'tsGPYSQbZx4',
    status: 'approved',
    reviewedAtISO,
    cues: ['Start in a lunge with the rear knee padded.', 'Tuck pelvis slightly and squeeze the rear glute.', 'Shift forward until the front of the rear hip stretches.'],
    mistakes: ['Do not arch the low back for range.', 'Do not put the rear knee on hard floor.', 'Do not hold through sharp hip or knee pain.'],
  },
  {
    exerciseId: 'dumbbell-bench-press',
    sourceVideoId: 'f3Ai0EBA4nQ',
    status: 'approved',
    reviewedAtISO,
    cues: ['Lie on the bench with dumbbells over elbows.', 'Set shoulders gently and keep feet planted.', 'Press dumbbells upward, then lower with control.'],
    mistakes: ['Do not flare elbows straight out.', 'Do not bounce at the bottom.', 'Do not overarch the low back.'],
  },
  {
    exerciseId: 'feet-elevated-glute-bridge',
    sourceVideoId: '',
    status: 'draft',
    reviewNotes: 'Search-only variant; draft cues are intentionally hidden until source review is complete.',
    cues: ['Draft content hidden from normal users.'],
    mistakes: ['Draft content hidden from normal users.'],
  },
]

export const quickGuideByExerciseId = new Map(exerciseQuickGuides.map((guide) => [guide.exerciseId, guide]))

export const getExerciseQuickGuide = (exerciseId: string) => quickGuideByExerciseId.get(exerciseId)

export const getApprovedExerciseQuickGuide = (exerciseId: string) => {
  const guide = getExerciseQuickGuide(exerciseId)
  return guide?.status === 'approved' ? guide : undefined
}
