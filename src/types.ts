export type ID = string

export type EquipmentKind =
  | 'bodyweight'
  | 'dumbbell'
  | 'kettlebell'
  | 'band'
  | 'yoga mat'
  | 'carry'
  | 'bike'
  | 'trailer'
  | 'chair'
  | 'foam roller'
  | 'suspension trainer'
  | 'pull-up bar'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type RoutineType = 'strength' | 'conditioning' | 'mobility' | 'recovery' | 'bike'
export type WorkoutStatus = 'completed' | 'skipped'
export type SkipReason =
  | 'work'
  | 'travel'
  | 'fatigue'
  | 'soreness'
  | 'illness'
  | 'no time'
  | 'other'
export type Units = 'lb' | 'kg'
export type CarbMealSlot =
  | 'breakfast'
  | 'morningSnack'
  | 'lunch'
  | 'afternoonSnack'
  | 'dinner'
  | 'eveningSnack'
export type CarbSourceType = 'manual' | 'preset' | 'usda' | 'openFoodFacts'
export type PreferredNutritionSource = 'manual' | 'usda' | 'openFoodFacts'

export interface ExerciseDefaults {
  sets?: number
  reps?: string
  durationSeconds?: number
  distance?: string
  weight?: number
  effort?: number
}

export type ExerciseGroup =
  | 'Mobility & Yoga'
  | 'Core Stability'
  | 'Upper Back & Posture'
  | 'Hinge & Posterior Chain'
  | 'Single-Leg Strength'
  | 'Carry & Load Transfer'
  | 'Balance & Control'
  | 'Recovery'
  | 'Burley & Trailer Work'
  | 'Ride Sessions'

export type BikeTourPurpose =
  | 'anti-extension'
  | 'anti-rotation'
  | 'lateral stability'
  | 'upper back'
  | 'posterior chain'
  | 'hill climbing'
  | 'loaded-bike durability'
  | 'mobility'
  | 'recovery'
  | 'ride conditioning'
  | 'trailer handling'

export interface Exercise {
  id: ID
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
  targetAreas: string[]
  equipment: EquipmentKind[]
  difficulty: Difficulty
  group?: ExerciseGroup
  bikeTourPurpose?: BikeTourPurpose[]
  defaults: ExerciseDefaults
  videoUrl?: string
  imageUrl?: string
  attribution?: string
  createdAt: string
  updatedAt: string
}

export interface Routine {
  id: ID
  name: string
  type: RoutineType
  enabled: boolean
  order: number
  estimatedMinutes: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface RoutineExercise {
  id: ID
  routineId: ID
  exerciseId: ID
  section: 'warmup' | 'main' | 'circuit' | 'mobility' | 'recovery' | 'precheck' | 'ride' | 'cooldown'
  order: number
  sets?: number
  reps?: string
  durationSeconds?: number
  distance?: string
  side?: 'left' | 'right' | 'each' | 'none'
  notes?: string
  variationKey?: string
  variationOptions?: string[]
}

export interface ExerciseLogEntry {
  id: ID
  workoutLogId: ID
  routineExerciseId?: ID
  exerciseId: ID
  equipmentKey?: string
  exerciseName: string
  sets?: number
  reps?: string
  weight?: number
  durationSeconds?: number
  distance?: string
  effort?: number
  notes?: string
  customFields?: Record<string, string | number | boolean | undefined>
}

export interface WorkoutLog {
  id: ID
  routineId?: ID
  routineName: string
  completedAt: string
  status: WorkoutStatus
  skipReason?: SkipReason
  notes?: string
  totalMinutes?: number
  travelMode?: boolean
  deloadApplied?: boolean
  createdAt: string
  updatedAt: string
}

export interface UserSettings {
  id: 'default'
  units: Units
  bodyweight?: number
  durationPreference: 20 | 30 | 45 | 60
  googleAppsScriptUrl?: string
  darkMode: 'system' | 'light' | 'dark'
  seededAt: string
  updatedAt: string
}

export interface CarbEntry {
  id: ID
  dateISO: string
  mealSlot: CarbMealSlot
  netCarbs: number
  sourceType: CarbSourceType
  sourceLabel?: string
  savedFoodName?: string
  goalGramsAtEntry: number
  createdAt: string
  updatedAt: string
}

export interface CarbSettings {
  id: 'default'
  dailyNetCarbGoalGrams: number
  saveFoodNamesInLog: boolean
  subtractSugarAlcoholsWhenAvailable: boolean
  foodDataCentralApiKey?: string
  preferredNutritionSource: PreferredNutritionSource
  updatedAt: string
}

export interface CarbGoalHistory {
  id: ID
  effectiveDateISO: string
  goalGrams: number
  createdAt: string
}

export interface CarbPreset {
  id: ID
  name: string
  netCarbs: number
  servingDescription?: string
  sourceType?: CarbSourceType
  sourceId?: string
  useCount: number
  lastUsedAt?: string
  createdAt: string
  updatedAt: string
}

export interface FoodLookupCache {
  id: ID
  source: 'usda' | 'openFoodFacts'
  queryOrSourceId: string
  resultJson: string
  cachedAt: string
  expiresAt: string
}

export interface Equipment {
  id: ID
  name: string
  kind: EquipmentKind
  owned: boolean
  recommended: boolean
  notes?: string
}

export interface TemporaryScheduleChange {
  id: ID
  startsOn: string
  endsOn: string
  note: string
  routineIds: ID[]
}

export interface SchedulePreference {
  id: 'default'
  weeklyFrequency: 2 | 3 | 4 | 5
  preferredDays: number[]
  dayAssignments: Record<string, ID>
  temporaryChanges: TemporaryScheduleChange[]
  travelMode: boolean
  busyWorkWeek: boolean
  hillFocusWeek: boolean
  recoveryWeek: boolean
  deloadEveryFourthWeek: boolean
  updatedAt: string
}

export interface PersonalExerciseDefault extends ExerciseDefaults {
  id: ID
  exerciseId: ID
  equipmentKey?: string
  updatedAt: string
  source: 'user' | 'last-log'
  reuseLastNote?: boolean
  noteTemplate?: string
}

export type ExerciseMediaType = 'svg-animation' | 'wger-video' | 'wger-image' | 'youtube-link' | 'external-link'

export interface ExerciseMedia {
  id: ID
  exerciseId: ID
  type: ExerciseMediaType
  url?: string
  thumbnailUrl?: string
  localSvgKey?: string
  sourceName: string
  sourceUrl?: string
  author?: string
  licenseName?: string
  licenseUrl?: string
  attributionText: string
  importedAt: string
  isOfflineCapable: boolean
  isTrusted: boolean
}

export interface RoadmapMilestone {
  id: ID
  phaseId: ID
  title: string
  description: string
  targetMonth: number
  order: number
  completed: boolean
  completedAt?: string
}

export interface RoadmapConflict {
  id: ID
  startsOn: string
  endsOn: string
  note: string
  lighterWeekSuggested: boolean
}

export interface RoadmapPhase {
  id: ID
  title: string
  months: string
  focus: string[]
  order: number
}

export interface TourRoadmap {
  id: 'default'
  phases: RoadmapPhase[]
  milestones: RoadmapMilestone[]
  conflicts: RoadmapConflict[]
  updatedAt: string
}

export interface AppData {
  exercises: Exercise[]
  routines: Routine[]
  routineExercises: RoutineExercise[]
  workoutLogs: WorkoutLog[]
  exerciseLogEntries: ExerciseLogEntry[]
  personalExerciseDefaults: PersonalExerciseDefault[]
  exerciseMedia: ExerciseMedia[]
  roadmap: TourRoadmap
  settings: UserSettings
  equipment: Equipment[]
  schedule: SchedulePreference
  carbEntries: CarbEntry[]
  carbSettings: CarbSettings
  carbGoalHistory: CarbGoalHistory[]
  carbPresets: CarbPreset[]
  foodLookupCache: FoodLookupCache[]
}

export interface WorkoutDraftEntry {
  routineExerciseId?: ID
  exerciseId: ID
  equipmentKey?: string
  exerciseName: string
  sets?: number
  reps?: string
  weight?: number
  durationSeconds?: number
  distance?: string
  effort?: number
  notes?: string
  lastSummary?: string
  customFields?: Record<string, string | number | boolean | undefined>
}
