export type ApprovedMovementVideo = {
  exerciseId: string
  provider: string
  channelName: string
  videoTitle: string
  youtubeVideoId?: string
  directVideoUrl: string
  embedUrl: string
  checkedAtISO: string
  checkedBy: string
  status: 'verified' | 'rejected'
  rejectionReason?: string
  exerciseMatchNotes: string
}

const checkedAtISO = '2026-06-25T12:00:00.000Z'
const checkedBy = 'Codex source check'
const youtubeWatch = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`
const youtubeEmbed = (videoId: string) => `https://www.youtube.com/embed/${videoId}?controls=1&playsinline=1&rel=0`

const youtubeVideo = (
  exerciseId: string,
  videoTitle: string,
  youtubeVideoId: string,
  channelName: string,
  exerciseMatchNotes: string,
): ApprovedMovementVideo => ({
  exerciseId,
  provider: 'YouTube',
  channelName,
  videoTitle,
  youtubeVideoId,
  directVideoUrl: youtubeWatch(youtubeVideoId),
  embedUrl: youtubeEmbed(youtubeVideoId),
  checkedAtISO,
  checkedBy,
  status: 'verified',
  exerciseMatchNotes,
})

export const approvedMovementVideos: ApprovedMovementVideo[] = [
  youtubeVideo(
    'dead-bug',
    'How to Do a Dead Bug Exercise | 30 Seconds | Physical Therapy | MedBridge',
    'xtTIb6dC-vI',
    'Medbridge',
    'Shows a floor dead bug with arms and legs moving while the low back stays controlled.',
  ),
  youtubeVideo(
    'bird-dog',
    'How to Do the Bird Dog Exercise: A Guide from Physical Therapists',
    'xEDnlOxeJH4',
    'Hinge Health',
    'Shows quadruped opposite-arm/opposite-leg reach for core and hip stability.',
  ),
  youtubeVideo(
    'side-plank',
    'How to do a Side Plank: A Guide from Physical Therapists',
    'qbuqsJ9CuQA',
    'Hinge Health',
    'Shows side-lying elbow plank setup with hips lifted in a straight line.',
  ),
  youtubeVideo(
    'pallof-press',
    'How to Do a Pallof Press: A Guide from Physical Therapists',
    'n8ZZG9gElhs',
    'Hinge Health',
    'Shows a band/cable anti-rotation press from a tall standing stance.',
  ),
  youtubeVideo(
    'bench-supported-one-arm-row',
    'One Arm Dumbbell Row - Back Exercise - Bodybuilding.com',
    'PgpQ4-jHiq4',
    'Bodybuilding.com',
    'Shows one hand and one knee supported on a flat bench while rowing a dumbbell.',
  ),
  youtubeVideo(
    'band-pull-apart',
    'How to Do Band Pull Aparts: A Guide from Physical Therapists',
    'bYsgk9SrJ48',
    'Hinge Health',
    'Shows shoulder-height resistance-band pull-aparts for upper-back posture.',
  ),
  youtubeVideo(
    'band-face-pull',
    'Banded Face Pulls Tutorial - Proper Form and Technique',
    'AlTGQrDOd98',
    'Runna',
    'Shows a banded face pull with hands pulling toward the face and elbows high.',
  ),
  youtubeVideo(
    'kettlebell-deadlift',
    'Kettlebell DEADLIFT',
    'LDfnyt0Rmaw',
    'Hardstyle Kettlebell Pro',
    'Shows a two-hand kettlebell deadlift from the floor between the feet.',
  ),
  youtubeVideo(
    'dumbbell-romanian-deadlift',
    'Dumbbell Romanian Deadlift | Exercise Technique Library',
    'IJdUtnxAmNo',
    'Dr. Jacob Goodin',
    'Shows a dumbbell Romanian deadlift hinge with soft knees and weights near the legs.',
  ),
  youtubeVideo(
    'floor-glute-bridge',
    'How to Do a Glute Bridge Exercise: A Guide from Physical Therapists',
    'PhTDzR0TpZs',
    'Hinge Health',
    'Shows a back-on-floor glute bridge with knees bent and feet flat.',
  ),
  youtubeVideo(
    'bench-hip-thrust',
    'How to correctly perform Hip Thrusts which is an exercise used to strengthen the Gluteus maximus',
    'Ns8pTamaGGg',
    'Physical Therapy First',
    'Shows upper back supported on a bench while hips drive upward from feet on the floor.',
  ),
  youtubeVideo(
    'goblet-squat',
    'Goblet Squat Demonstration',
    'vP1aAzDdVDM',
    'MOVE with Dr. Mike',
    'Shows a goblet squat holding a weight at the chest while squatting through the legs.',
  ),
  youtubeVideo(
    'step-up',
    'Step-Ups - Your Exercise Solution (YES)',
    'buDRJkcqnVs',
    'Arthritis Foundation',
    'Shows a forward step-up onto a raised platform with controlled ascent and descent.',
  ),
  youtubeVideo(
    'split-squat',
    'How to Do a Split Squat: A Guide from Physical Therapists',
    'qW5OGJ62ZjY',
    'Hinge Health',
    'Shows a static split-squat stance lowering and rising without rear-foot elevation.',
  ),
  youtubeVideo(
    'calf-raise',
    'Exercises with an Athletic Trainer: Standing Calf Raises',
    'k8ipHzKeAkQ',
    "Children's Hospital Colorado",
    'Shows standing calf raises with heels lifting and lowering under control.',
  ),
  youtubeVideo(
    'farmer-carry',
    "How to Perform the Farmer's Carry",
    'z7E_YU9P1jU',
    'Dr. Carl Baird',
    'Shows walking while carrying matching loads at both sides.',
  ),
  youtubeVideo(
    'suitcase-carry',
    'How To Perform The Suitcase Carry',
    'y-hn_Ha1-RE',
    'Dr. Carl Baird',
    'Shows walking while carrying one load at one side without leaning.',
  ),
  youtubeVideo(
    '90-90-hip-switch',
    '90 90 Hip Switch',
    'm51AZSXMvEA',
    'The Active Life',
    'Shows seated 90/90 hip switches between left and right hip positions.',
  ),
  youtubeVideo(
    'thoracic-open-book',
    'Open Book Stretch - Physical Therapy Exercises',
    'OW6YHlxY6JI',
    'TSAOG Orthopaedics & Spine',
    'Shows side-lying thoracic open-book rotation with knees bent and stacked.',
  ),
  youtubeVideo(
    'ankle-rocks',
    'Half Kneeling Ankle Rocks - Ankle Mobility',
    'Hm_Iu72bJJg',
    '80/20 Endurance',
    'Shows half-kneeling ankle rocks with the front heel down and knee tracking forward.',
  ),
  youtubeVideo(
    'low-lunge-hip-flexor-stretch',
    'Hip Flexor Stretch Lunge Position - Ask Doctor Jo',
    'tsGPYSQbZx4',
    'AskDoctorJo',
    'Shows a lunge-position hip-flexor stretch with the rear knee down.',
  ),
  youtubeVideo(
    'dumbbell-bench-press',
    'Dumbbell Bench Press Tutorial',
    'f3Ai0EBA4nQ',
    'Samson Physical Therapy',
    'Shows a flat-bench dumbbell bench press with both dumbbells moving from chest to lockout.',
  ),
]

export const approvedMovementVideoByExerciseId = new Map(
  approvedMovementVideos
    .filter((video) => video.status === 'verified')
    .map((video) => [video.exerciseId, video]),
)
