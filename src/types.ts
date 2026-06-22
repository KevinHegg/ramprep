export type ID = string

export type EquipmentKind =
  | 'bodyweight'
  | 'dumbbell'
  | 'kettlebell'
  | 'band'
  | 'yoga mat'
  | 'carry'
  | 'suspension trainer'
  | 'pull-up bar'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type RoutineType = 'strength' | 'conditioning' | 'mobility' | 'recovery'
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

export interface ExerciseDefaults {
  sets?: number
  reps?: string
  durationSeconds?: number
  distance?: string
  weight?: number
}

export interface Exercise {
  id: ID
  name: string
  description: string
  instructions: string[]
  formCues: string[]
  commonMistakes: string[]
  targetAreas: string[]
  equipment: EquipmentKind[]
  difficulty: Difficulty
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
  section: 'warmup' | 'main' | 'circuit' | 'mobility' | 'recovery'
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
  exerciseName: string
  sets?: number
  reps?: string
  weight?: number
  durationSeconds?: number
  distance?: string
  effort?: number
  notes?: string
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
  deloadEveryFourthWeek: boolean
  updatedAt: string
}

export interface AppData {
  exercises: Exercise[]
  routines: Routine[]
  routineExercises: RoutineExercise[]
  workoutLogs: WorkoutLog[]
  exerciseLogEntries: ExerciseLogEntry[]
  settings: UserSettings
  equipment: Equipment[]
  schedule: SchedulePreference
}

export interface WorkoutDraftEntry {
  routineExerciseId?: ID
  exerciseId: ID
  exerciseName: string
  sets?: number
  reps?: string
  weight?: number
  durationSeconds?: number
  distance?: string
  effort?: number
  notes?: string
}
