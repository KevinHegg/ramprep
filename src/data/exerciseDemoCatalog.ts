import type { ExerciseDemoMedia } from '../types'

export const demoCatalogReviewedAtISO = '2026-06-23T16:30:00.000Z'
export const demoCatalogReviewer = 'RampRep manual review'

export const priorityExerciseIds = [
  'downward-dog',
  '90-90-hip-switch',
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
  'kettlebell-deadlift',
  'goblet-squat',
  'dumbbell-romanian-deadlift',
  'step-up',
  'split-squat',
  'reverse-lunge',
  'one-arm-dumbbell-row',
  'band-pull-apart',
  'band-face-pull',
  'band-external-rotation',
  'push-up',
  'dumbbell-floor-press',
  'farmer-carry',
  'suitcase-carry',
  'dead-bug',
  'bird-dog',
  'side-plank',
  'glute-bridge',
  'glute-bridge-march',
  'pallof-press',
  'calf-raise',
  'soleus-raise',
  'tibialis-raise',
  'wall-sit',
  'single-leg-romanian-deadlift',
  'burley-loaded-trailer-ride',
  'hill-repeat-ride',
  'low-cadence-climb-intervals',
] as const

export type PriorityExerciseId = (typeof priorityExerciseIds)[number]

const sourcePolicyUrls = {
  ace: 'https://www.acefitness.org/resources/everyone/exercise-library/',
  nasm: 'https://www.nasm.org/resource-center/exercise-library',
  yogaJournal: 'https://www.yogajournal.com/poses/',
  wger: 'https://wger.de/en/exercise/overview/',
  freeExerciseDb: 'https://github.com/yuhonas/free-exercise-db',
  youtube: 'https://www.youtube.com/',
  burley: 'https://burley.com/pages/safety',
}

const needsReview = (exerciseId: PriorityExerciseId, title: string, provider: string, url: string): ExerciseDemoMedia => ({
  id: `demo-${exerciseId}-needs-review`,
  exerciseId,
  kind: 'none',
  title,
  provider,
  url,
  sourcePageUrl: url,
  attributionText: `No reviewed in-app motion demo yet. Use ${provider} as a source-review starting point before embedding or importing media.`,
  reviewedBy: demoCatalogReviewer,
  reviewedAtISO: demoCatalogReviewedAtISO,
  qualityStatus: 'needsReview',
  rejectionReason: 'Needs manual review for movement match, provider reputation, embedding rights, and license metadata.',
  offlineAvailable: false,
})

const yogaNeedsReview = (exerciseId: PriorityExerciseId, title: string) => needsReview(exerciseId, title, 'Yoga Journal pose library', sourcePolicyUrls.yogaJournal)
const aceNeedsReview = (exerciseId: PriorityExerciseId, title: string) => needsReview(exerciseId, title, 'ACE Exercise Library', sourcePolicyUrls.ace)
const nasmNeedsReview = (exerciseId: PriorityExerciseId, title: string) => needsReview(exerciseId, title, 'NASM Exercise Library', sourcePolicyUrls.nasm)
const wgerNeedsReview = (exerciseId: PriorityExerciseId, title: string) => needsReview(exerciseId, title, 'wger exercise database', sourcePolicyUrls.wger)

export const exerciseDemoCatalog: ExerciseDemoMedia[] = [
  {
    id: 'demo-downward-dog-yoga-journal-youtube',
    exerciseId: 'downward-dog',
    kind: 'youtubeEmbed',
    title: 'Downward Facing Dog',
    provider: 'Yoga Journal',
    url: 'https://www.youtube.com/watch?v=JmW6Ofblhtk',
    embedUrl: 'https://www.youtube-nocookie.com/embed/JmW6Ofblhtk?controls=1&playsinline=1&rel=0',
    youtubeVideoId: 'JmW6Ofblhtk',
    sourcePageUrl: 'https://www.yogajournal.com/poses/downward-facing-dog/',
    attributionText: 'Embedded from YouTube via Yoga Journal. Video is linked/embedded only; RampRep does not download or cache YouTube media.',
    reviewedBy: demoCatalogReviewer,
    reviewedAtISO: demoCatalogReviewedAtISO,
    qualityStatus: 'verified',
    offlineAvailable: false,
  },
  {
    id: 'demo-90-90-hip-switch-rehab-hero',
    exerciseId: '90-90-hip-switch',
    kind: 'externalHowTo',
    title: '90/90 Hip Switch',
    provider: 'Rehab Hero',
    url: 'https://www.rehabhero.ca/exercise/9090-hip-switch',
    sourcePageUrl: 'https://www.rehabhero.ca/exercise/9090-hip-switch',
    attributionText: 'External how-to reference from Rehab Hero. RampRep links out and paraphrases its own instructions.',
    reviewedBy: demoCatalogReviewer,
    reviewedAtISO: demoCatalogReviewedAtISO,
    qualityStatus: 'verified',
    offlineAvailable: false,
  },
  {
    id: 'demo-goblet-squat-nasm',
    exerciseId: 'goblet-squat',
    kind: 'externalHowTo',
    title: 'Goblet Squat',
    provider: 'NASM Exercise Library',
    url: 'https://www.nasm.org/resource-center/exercise-library/goblet-squat',
    sourcePageUrl: 'https://www.nasm.org/resource-center/exercise-library/goblet-squat',
    attributionText: 'External how-to reference from NASM. RampRep links out and paraphrases its own instructions.',
    reviewedBy: demoCatalogReviewer,
    reviewedAtISO: demoCatalogReviewedAtISO,
    qualityStatus: 'verified',
    offlineAvailable: false,
  },
  {
    id: 'demo-bird-dog-ace',
    exerciseId: 'bird-dog',
    kind: 'externalHowTo',
    title: 'Bird Dog',
    provider: 'ACE Exercise Library',
    url: 'https://www.acefitness.org/resources/everyone/exercise-library/14/bird-dog/',
    sourcePageUrl: 'https://www.acefitness.org/resources/everyone/exercise-library/14/bird-dog/',
    attributionText: 'External how-to reference from ACE Exercise Library. RampRep links out and paraphrases its own instructions.',
    reviewedBy: demoCatalogReviewer,
    reviewedAtISO: demoCatalogReviewedAtISO,
    qualityStatus: 'verified',
    offlineAvailable: false,
  },
  yogaNeedsReview('cat-cow', 'Cat-Cow'),
  yogaNeedsReview('childs-pose-side-reach', "Child's Pose With Side Reach"),
  yogaNeedsReview('low-lunge-hip-flexor-stretch', 'Low Lunge Hip-Flexor Stretch'),
  yogaNeedsReview('figure-four-stretch', 'Figure-Four Stretch'),
  yogaNeedsReview('hamstring-stretch', 'Hamstring Stretch'),
  aceNeedsReview('thoracic-open-book', 'Thoracic Open Book'),
  yogaNeedsReview('sphinx-pose', 'Sphinx Pose'),
  yogaNeedsReview('cobra-pose', 'Cobra Pose'),
  yogaNeedsReview('couch-stretch', 'Couch Stretch'),
  aceNeedsReview('ankle-rocks', 'Ankle Dorsiflexion Rocks'),
  aceNeedsReview('kettlebell-deadlift', 'Kettlebell Deadlift'),
  nasmNeedsReview('dumbbell-romanian-deadlift', 'Dumbbell Romanian Deadlift'),
  aceNeedsReview('step-up', 'Step-Up'),
  aceNeedsReview('split-squat', 'Split Squat'),
  aceNeedsReview('reverse-lunge', 'Reverse Lunge'),
  aceNeedsReview('one-arm-dumbbell-row', 'One-Arm Dumbbell Row'),
  aceNeedsReview('band-pull-apart', 'Band Pull-Apart'),
  aceNeedsReview('band-face-pull', 'Band Face Pull'),
  aceNeedsReview('band-external-rotation', 'Band External Rotation'),
  aceNeedsReview('push-up', 'Push-Up'),
  aceNeedsReview('dumbbell-floor-press', 'Dumbbell Floor Press'),
  aceNeedsReview('farmer-carry', 'Farmer Carry'),
  aceNeedsReview('suitcase-carry', 'Suitcase Carry'),
  aceNeedsReview('dead-bug', 'Dead Bug'),
  aceNeedsReview('side-plank', 'Side Plank'),
  aceNeedsReview('glute-bridge', 'Glute Bridge'),
  aceNeedsReview('glute-bridge-march', 'Glute Bridge March'),
  aceNeedsReview('pallof-press', 'Pallof Press'),
  aceNeedsReview('calf-raise', 'Calf Raise'),
  aceNeedsReview('soleus-raise', 'Soleus Raise'),
  wgerNeedsReview('tibialis-raise', 'Tibialis Raise'),
  aceNeedsReview('wall-sit', 'Wall Sit'),
  aceNeedsReview('single-leg-romanian-deadlift', 'Single-Leg Romanian Deadlift'),
  needsReview('burley-loaded-trailer-ride', 'Burley Loaded Trailer Ride', 'Burley safety guidance', sourcePolicyUrls.burley),
  needsReview('hill-repeat-ride', 'Hill Repeat Ride', 'RampRep ride source review queue', sourcePolicyUrls.ace),
  needsReview('low-cadence-climb-intervals', 'Low-Cadence Climb Intervals', 'RampRep ride source review queue', sourcePolicyUrls.ace),
]

const demoByExerciseId = new Map(exerciseDemoCatalog.map((media) => [media.exerciseId, media]))

export const getExerciseDemoMedia = (exerciseId: string) => demoByExerciseId.get(exerciseId)

export const isVerifiedDemoMedia = (media?: ExerciseDemoMedia) =>
  Boolean(media && media.qualityStatus === 'verified' && media.kind !== 'none' && media.kind !== 'freeExerciseDbImage')

export const verifiedExerciseDemoMedia = exerciseDemoCatalog.filter(isVerifiedDemoMedia)
export const needsReviewExerciseDemoMedia = exerciseDemoCatalog.filter((media) => media.qualityStatus === 'needsReview')
