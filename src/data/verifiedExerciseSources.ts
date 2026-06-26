import { approvedMovementVideos, type ApprovedMovementVideo } from './approvedMovementVideos'

export const demoCatalogReviewedAtISO = '2026-06-25T12:00:00.000Z'
export const demoCatalogReviewer = 'Codex source check'

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
  'floor-glute-bridge',
  'glute-bridge',
  'glute-bridge-march',
  'pallof-press',
  'mcgill-curl-up',
  'calf-raise',
  'soleus-raise',
  'tibialis-raise',
  'wall-sit',
  'single-leg-romanian-deadlift',
  'feet-elevated-glute-bridge',
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

const approvedVideoSource = (video: ApprovedMovementVideo): ExerciseMediaSource => ({
  id: `media-${video.exerciseId}-youtube-${video.youtubeVideoId}`,
  exerciseId: video.exerciseId,
  sourceKind: 'youtubeVideo',
  provider: video.provider,
  title: video.videoTitle,
  directUrl: video.directVideoUrl,
  embedUrl: video.embedUrl,
  youtubeVideoId: video.youtubeVideoId,
  channelName: video.channelName,
  reviewedBy: video.checkedBy,
  reviewedAtISO: video.checkedAtISO,
  qualityStatus: video.status === 'verified' ? 'verified' : 'rejected',
  statusReason: video.exerciseMatchNotes,
  attributionText: `Video linked and embedded from ${video.channelName} on YouTube. RampRep does not download, cache, or rehost the video.`,
  licenseNote: 'Linked/embedded only; creator/platform terms apply',
  isDefaultLearningSource: video.status === 'verified',
  lastCheckedAtISO: video.checkedAtISO,
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
  ...approvedMovementVideos.map(approvedVideoSource),
  youtubeSource('downward-dog', 'Downward Facing Dog', 'JmW6Ofblhtk', 'Yoga Journal', 'Yoga Journal'),
  needsReviewSource('front-plank', 'Front Plank', 'Moved to optional/search-only until a direct exercise-specific video is approved.'),
  needsReviewSource('glute-bridge', 'Legacy Glute Bridge', 'Legacy floor-bridge seed retained for old log references; future routines use floor-glute-bridge.'),
  needsReviewSource('rear-foot-elevated-split-squat', 'Rear-Foot Elevated Split Squat', 'Moved to optional/search-only until a direct exercise-specific video is approved.'),
  needsReviewSource('push-up', 'Push-Up', 'Moved to optional/search-only until a direct exercise-specific video is approved.'),
  needsReviewSource('prone-y-t-w', 'Prone Y-T-W', 'Moved to optional/search-only until a direct exercise-specific video is approved.'),
  needsReviewSource('bench-supported-rear-delt-raise', 'Bench-Supported Rear Delt Raise', 'Moved to optional/search-only until a direct exercise-specific video is approved.'),
  needsReviewSource('single-leg-romanian-deadlift', 'Single-Leg Romanian Deadlift', 'Moved to optional/search-only until a direct exercise-specific video is approved.'),
  needsReviewSource('one-arm-dumbbell-row', 'One-Arm Dumbbell Row', 'Moved to optional/search-only; default row uses the bench-supported dumbbell variant.'),
  needsReviewSource('cat-cow', 'Cat-Cow', 'Moved to optional/search-only until a direct exercise-specific article or video is reviewed.'),
  needsReviewSource('childs-pose-side-reach', "Child's Pose With Side Reach"),
  needsReviewSource('figure-four-stretch', 'Figure-Four Stretch', 'Moved to optional/search-only until a direct exercise-specific article or video is reviewed.'),
  needsReviewSource('hamstring-stretch', 'Hamstring Stretch', 'Moved to optional/search-only until a direct exercise-specific article or video is reviewed.'),
  needsReviewSource('sphinx-pose', 'Sphinx Pose'),
  needsReviewSource('cobra-pose', 'Cobra Pose'),
  needsReviewSource('couch-stretch', 'Couch Stretch', 'Moved to optional/search-only until a direct exercise-specific article or video is reviewed.'),
  needsReviewSource('reverse-lunge', 'Reverse Lunge', 'Moved to optional/search-only until a direct exercise-specific article or video is reviewed.'),
  needsReviewSource('band-external-rotation', 'Band External Rotation', 'Moved to optional/search-only until a direct exercise-specific article or video is reviewed.'),
  needsReviewSource('dumbbell-floor-press', 'Dumbbell Floor Press'),
  needsReviewSource('step-up-to-bench', 'Step-Up to Bench', 'Bench step-ups stay hidden until the portable bench is marked safe and a direct exercise-specific source is reviewed.'),
  needsReviewSource('glute-bridge-march', 'Glute Bridge March', 'Moved to optional/search-only until a direct exercise-specific article or video is reviewed.'),
  needsReviewSource('feet-elevated-glute-bridge', 'Feet-Elevated Glute Bridge', 'Search-only bridge variant; not used in default routines until separately approved for default use.'),
  needsReviewSource('mcgill-curl-up', 'McGill Curl-Up', 'Moved to optional/search-only until a direct exercise-specific article or video is reviewed.'),
  needsReviewSource('soleus-raise', 'Soleus Raise', 'Moved to optional/search-only until a direct exercise-specific article or video is reviewed.'),
  needsReviewSource('tibialis-raise', 'Tibialis Raise', 'Moved to optional/search-only until a direct exercise-specific article or video is reviewed.'),
  needsReviewSource('wall-sit', 'Wall Sit', 'Moved to optional/search-only until a direct exercise-specific article or video is reviewed.'),
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
  needsReviewSource('loaded-carry-for-trailer-days', 'Loaded Carry for Trailer Days', 'Moved to optional/search-only until a direct exercise-specific article or video is reviewed.'),
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
