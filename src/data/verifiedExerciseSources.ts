export const demoCatalogReviewedAtISO = '2026-06-24T12:00:00.000Z'
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
  'bench-supported-one-arm-row',
  'band-pull-apart',
  'band-face-pull',
  'band-external-rotation',
  'prone-y-t-w',
  'push-up',
  'dumbbell-floor-press',
  'dumbbell-bench-press',
  'bench-hip-thrust',
  'bench-supported-rear-delt-raise',
  'rear-foot-elevated-split-squat',
  'step-up-to-bench',
  'farmer-carry',
  'suitcase-carry',
  'dead-bug',
  'bird-dog',
  'side-plank',
  'front-plank',
  'glute-bridge',
  'glute-bridge-march',
  'pallof-press',
  'mcgill-curl-up',
  'calf-raise',
  'soleus-raise',
  'tibialis-raise',
  'wall-sit',
  'single-leg-romanian-deadlift',
  'easy-endurance-ride',
  'recovery-spin',
  'hill-repeat-ride',
  'low-cadence-climb-intervals',
  'loaded-gravel-ride',
  'commute-walk',
  'dog-walk',
  'dog-walk-light-ruck',
  'hydration-ruck-walk',
  'ruck-commute',
  'easy-posture-ruck',
  'ruck-hill-walk',
  'burley-loaded-trailer-ride',
  'controlled-trailer-towing-workout',
  'trailer-walk',
  'trailer-hill-starts',
  'loaded-carry-for-trailer-days',
  'easy-tour-specificity-session',
] as const

export type PriorityExerciseId = (typeof priorityExerciseIds)[number]

export type ExerciseMediaSourceKind = 'youtubeVideo' | 'externalVideo' | 'externalArticle' | 'checklist' | 'none'
export type ExerciseMediaQualityStatus = 'verified' | 'needsReview' | 'rejected'

export interface ExerciseMediaSource {
  id: string
  exerciseId: string
  sourceKind: ExerciseMediaSourceKind
  provider: string
  title: string
  directUrl: string
  embedUrl?: string
  youtubeVideoId?: string
  channelName?: string
  author?: string
  reviewedBy: string
  reviewedAtISO: string
  qualityStatus: ExerciseMediaQualityStatus
  statusReason: string
  attributionText: string
  licenseNote: string
  isDefaultLearningSource: boolean
  lastCheckedAtISO: string
}

const youtubeEmbed = (videoId: string) => `https://www.youtube.com/embed/${videoId}?controls=1&playsinline=1&rel=0`

const youtubeSource = (
  exerciseId: PriorityExerciseId,
  title: string,
  youtubeVideoId: string,
  channelName: string,
  provider = 'YouTube',
): ExerciseMediaSource => ({
  id: `media-${exerciseId}-youtube-${youtubeVideoId}`,
  exerciseId,
  sourceKind: 'youtubeVideo',
  provider,
  title,
  directUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
  embedUrl: youtubeEmbed(youtubeVideoId),
  youtubeVideoId,
  channelName,
  reviewedBy: demoCatalogReviewer,
  reviewedAtISO: demoCatalogReviewedAtISO,
  qualityStatus: 'verified',
  statusReason: 'Direct YouTube video reviewed for movement match and embedded with the official iframe URL.',
  attributionText: `Video linked and embedded from ${channelName} on YouTube. RampRep does not download, cache, or rehost the video.`,
  licenseNote: 'Linked/embedded only; creator/platform terms apply',
  isDefaultLearningSource: true,
  lastCheckedAtISO: demoCatalogReviewedAtISO,
})

const articleSource = (
  exerciseId: PriorityExerciseId,
  title: string,
  provider: string,
  directUrl: string,
): ExerciseMediaSource => ({
  id: `media-${exerciseId}-${provider.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  exerciseId,
  sourceKind: 'externalArticle',
  provider,
  title,
  directUrl,
  reviewedBy: demoCatalogReviewer,
  reviewedAtISO: demoCatalogReviewedAtISO,
  qualityStatus: 'verified',
  statusReason: 'Direct exercise page reviewed for movement match. RampRep links out and uses its own short coaching text.',
  attributionText: `External how-to reference from ${provider}. RampRep links out and paraphrases its own instructions.`,
  licenseNote: 'Linked only; provider terms apply',
  isDefaultLearningSource: true,
  lastCheckedAtISO: demoCatalogReviewedAtISO,
})

const externalVideoSource = (
  exerciseId: PriorityExerciseId,
  title: string,
  provider: string,
  directUrl: string,
): ExerciseMediaSource => ({
  id: `media-${exerciseId}-${provider.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  exerciseId,
  sourceKind: 'externalVideo',
  provider,
  title,
  directUrl,
  reviewedBy: demoCatalogReviewer,
  reviewedAtISO: demoCatalogReviewedAtISO,
  qualityStatus: 'verified',
  statusReason: 'Direct exercise video page reviewed; no in-app embed is used.',
  attributionText: `External video reference from ${provider}. RampRep opens the source in a new tab.`,
  licenseNote: 'Linked only; provider terms apply',
  isDefaultLearningSource: true,
  lastCheckedAtISO: demoCatalogReviewedAtISO,
})

const checklistSource = (
  exerciseId: PriorityExerciseId,
  title: string,
  statusReason = 'RampRep local checklist reviewed for purpose, setup, safety, dose, and logging. No external media is shown for this item.',
): ExerciseMediaSource => ({
  id: `media-${exerciseId}-ramprep-checklist`,
  exerciseId,
  sourceKind: 'checklist',
  provider: 'RampRep checklist',
  title,
  directUrl: '',
  reviewedBy: demoCatalogReviewer,
  reviewedAtISO: demoCatalogReviewedAtISO,
  qualityStatus: 'verified',
  statusReason,
  attributionText: 'Local RampRep checklist. No third-party media is embedded, copied, cached, or downloaded.',
  licenseNote: 'Original RampRep coaching checklist',
  isDefaultLearningSource: true,
  lastCheckedAtISO: demoCatalogReviewedAtISO,
})

const needsReviewSource = (
  exerciseId: PriorityExerciseId,
  title: string,
  statusReason = 'Needs direct exercise-specific source review before RampRep shows a Watch or Source action.',
): ExerciseMediaSource => ({
  id: `media-${exerciseId}-needs-review`,
  exerciseId,
  sourceKind: 'none',
  provider: 'RampRep review queue',
  title,
  directUrl: '',
  reviewedBy: demoCatalogReviewer,
  reviewedAtISO: demoCatalogReviewedAtISO,
  qualityStatus: 'needsReview',
  statusReason,
  attributionText: 'No reviewed in-app motion demo yet. This exercise will not show a Watch button until a direct source is approved.',
  licenseNote: 'No external media attached.',
  isDefaultLearningSource: false,
  lastCheckedAtISO: demoCatalogReviewedAtISO,
})

export const exerciseMediaSources: ExerciseMediaSource[] = [
  youtubeSource('downward-dog', 'Downward Facing Dog', 'JmW6Ofblhtk', 'Yoga Journal', 'Yoga Journal'),
  articleSource('90-90-hip-switch', '90/90 Hip Switch', 'Rehab Hero', 'https://www.rehabhero.ca/exercise/9090-hip-switch'),
  articleSource('goblet-squat', 'Goblet Squat', 'NASM Exercise Library', 'https://www.nasm.org/resource-center/exercise-library/goblet-squat'),
  articleSource('bird-dog', 'Bird Dog', 'ACE Exercise Library', 'https://www.acefitness.org/resources/everyone/exercise-library/14/bird-dog/'),
  articleSource('glute-bridge', 'Glute Bridge', 'ACE Exercise Library', 'https://www.acefitness.org/resources/everyone/exercise-library/49/glute-bridge/'),
  articleSource('front-plank', 'Front Plank', 'ACE Exercise Library', 'https://www.acefitness.org/resources/everyone/exercise-library/32/front-plank/'),
  articleSource('side-plank', 'Side Plank', 'ACE Exercise Library', 'https://www.acefitness.org/resources/everyone/exercise-library/303/side-plank/'),
  articleSource('bench-supported-one-arm-row', 'Single Arm Row', 'ACE Exercise Library', 'https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/'),
  articleSource('dumbbell-bench-press', 'Dumbbell Chest Press', 'ACE Exercise Library', 'https://www.acefitness.org/resources/everyone/exercise-library/19/chest-press/'),
  articleSource('rear-foot-elevated-split-squat', 'Bulgarian Split Squat', 'ACE Exercise Library', 'https://www.acefitness.org/resources/everyone/exercise-library/366/bulgarian-split-squat/'),
  youtubeSource('dead-bug', 'How To Do a Dead Bug Exercise', 'xtTIb6dC-vI', 'AskDoctorJo'),
  youtubeSource('one-arm-dumbbell-row', 'DB One Arm Row Exercise Library', '2AUbzsDCgaQ', 'Exercise Library'),
  externalVideoSource('step-up', 'Step-up Exercise', 'Mayo Clinic', 'https://www.mayoclinic.org/healthy-lifestyle/fitness/multimedia/step-up/vid-20084661'),
  checklistSource('cat-cow', 'Cat-Cow checklist'),
  needsReviewSource('childs-pose-side-reach', "Child's Pose With Side Reach"),
  checklistSource('low-lunge-hip-flexor-stretch', 'Low Lunge Hip-Flexor Stretch checklist'),
  checklistSource('figure-four-stretch', 'Figure-Four Stretch checklist'),
  checklistSource('hamstring-stretch', 'Hamstring Stretch checklist'),
  checklistSource('thoracic-open-book', 'Thoracic Open Book checklist'),
  needsReviewSource('sphinx-pose', 'Sphinx Pose'),
  needsReviewSource('cobra-pose', 'Cobra Pose'),
  checklistSource('couch-stretch', 'Couch Stretch checklist'),
  checklistSource('ankle-rocks', 'Ankle Dorsiflexion Rocks checklist'),
  checklistSource('kettlebell-deadlift', 'Kettlebell Deadlift checklist'),
  checklistSource('dumbbell-romanian-deadlift', 'Dumbbell Romanian Deadlift checklist'),
  checklistSource('split-squat', 'Split Squat checklist'),
  checklistSource('reverse-lunge', 'Reverse Lunge checklist'),
  checklistSource('band-pull-apart', 'Band Pull-Apart checklist'),
  checklistSource('band-face-pull', 'Band Face Pull checklist'),
  checklistSource('band-external-rotation', 'Band External Rotation checklist'),
  checklistSource('prone-y-t-w', 'Prone Y-T-W checklist'),
  needsReviewSource('push-up', 'Push-Up'),
  needsReviewSource('dumbbell-floor-press', 'Dumbbell Floor Press'),
  checklistSource('bench-hip-thrust', 'Bench Hip Thrust checklist'),
  checklistSource('bench-supported-rear-delt-raise', 'Bench-Supported Rear Delt Raise checklist'),
  checklistSource('step-up-to-bench', 'Step-Up to Bench checklist', 'Local bench-safety checklist only. This exercise stays hidden until the portable bench is marked safe for step-ups.'),
  checklistSource('farmer-carry', 'Farmer Carry checklist'),
  checklistSource('suitcase-carry', 'Suitcase Carry checklist'),
  checklistSource('glute-bridge-march', 'Glute Bridge March checklist'),
  checklistSource('pallof-press', 'Pallof Press checklist'),
  checklistSource('mcgill-curl-up', 'McGill Curl-Up checklist'),
  checklistSource('calf-raise', 'Calf Raise checklist'),
  checklistSource('soleus-raise', 'Soleus Raise checklist'),
  checklistSource('tibialis-raise', 'Tibialis Raise checklist'),
  checklistSource('wall-sit', 'Wall Sit checklist'),
  checklistSource('single-leg-romanian-deadlift', 'Single-Leg Romanian Deadlift checklist'),
  checklistSource('easy-endurance-ride', 'Easy Endurance Ride checklist'),
  checklistSource('recovery-spin', 'Recovery Spin checklist'),
  checklistSource('hill-repeat-ride', 'Hill Repeat Ride checklist'),
  checklistSource('low-cadence-climb-intervals', 'Low-Cadence Climb Intervals checklist'),
  checklistSource('loaded-gravel-ride', 'Loaded Gravel Ride checklist'),
  checklistSource('commute-walk', 'Commute Walk checklist'),
  checklistSource('dog-walk', 'Dog Walk checklist'),
  checklistSource('dog-walk-light-ruck', 'Dog Walk With Light Ruck checklist'),
  checklistSource('hydration-ruck-walk', 'Hydration Ruck Walk checklist'),
  checklistSource('ruck-commute', 'Ruck Commute checklist'),
  checklistSource('easy-posture-ruck', 'Easy Posture Ruck checklist'),
  checklistSource('ruck-hill-walk', 'Ruck Hill Walk checklist'),
  checklistSource('burley-loaded-trailer-ride', 'Burley Loaded Trailer Ride checklist'),
  checklistSource('controlled-trailer-towing-workout', 'Controlled Trailer Towing Workout checklist'),
  checklistSource('trailer-walk', 'Trailer Walk checklist'),
  checklistSource('trailer-hill-starts', 'Trailer Hill Starts checklist'),
  checklistSource('loaded-carry-for-trailer-days', 'Loaded Carry for Trailer Days checklist'),
  checklistSource('easy-tour-specificity-session', 'Easy Tour Specificity Session checklist'),
]

export const verifiedExerciseSources = exerciseMediaSources
export const verifiedExerciseDemoSources = verifiedExerciseSources.filter((source) => source.qualityStatus === 'verified')
export const needsReviewExerciseSources = verifiedExerciseSources.filter((source) => source.qualityStatus === 'needsReview')

export const genericSourceUrlPatterns = [
  /^https:\/\/www\.acefitness\.org\/resources\/everyone\/exercise-library\/?$/i,
  /^https:\/\/www\.nasm\.org\/resource-center\/exercise-library\/?$/i,
  /^https:\/\/www\.yogajournal\.com\/poses\/?$/i,
  /^https:\/\/www\.youtube\.com\/results/i,
  /search_query=/i,
  /^https:\/\/www\.google\.com\/search/i,
  /^https:\/\/www\.youtube\.com\/?$/i,
  /^https:\/\/www\.youtube\.com\/channel\/[^/?#]+\/?$/i,
  /^https:\/\/wger\.de\/en\/exercise\/overview\/?$/i,
]

export const isGenericSourceUrl = (url: string) =>
  Boolean(url) && genericSourceUrlPatterns.some((pattern) => pattern.test(url.trim()))
