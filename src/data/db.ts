import Dexie, { type Table } from 'dexie'
import type {
  CarbEntry,
  CarbGoalHistory,
  CarbPreset,
  CarbSettings,
  Equipment,
  Exercise,
  ExerciseLogEntry,
  ExerciseMedia,
  FoodLookupCache,
  PersonalExerciseDefault,
  PrivateSetting,
  TourRoadmap,
  Routine,
  RoutineExercise,
  RoutineRotationState,
  RoutineSessionOverride,
  SchedulePreference,
  UserSettings,
  WorkoutLog,
} from '../types'

export class RAMprepDatabase extends Dexie {
  exercises!: Table<Exercise, string>
  routines!: Table<Routine, string>
  routineExercises!: Table<RoutineExercise, string>
  workoutLogs!: Table<WorkoutLog, string>
  exerciseLogEntries!: Table<ExerciseLogEntry, string>
  personalExerciseDefaults!: Table<PersonalExerciseDefault, string>
  exerciseMedia!: Table<ExerciseMedia, string>
  tourRoadmaps!: Table<TourRoadmap, string>
  routineRotationStates!: Table<RoutineRotationState, string>
  routineSessionOverrides!: Table<RoutineSessionOverride, string>
  settings!: Table<UserSettings, string>
  equipment!: Table<Equipment, string>
  schedulePreferences!: Table<SchedulePreference, string>
  carbEntries!: Table<CarbEntry, string>
  carbSettings!: Table<CarbSettings, string>
  carbGoalHistory!: Table<CarbGoalHistory, string>
  carbPresets!: Table<CarbPreset, string>
  foodLookupCache!: Table<FoodLookupCache, string>
  privateSettings!: Table<PrivateSetting, string>

  constructor() {
    super('ramprep')

    this.version(1).stores({
      exercises: '&id, name, difficulty',
      routines: '&id, enabled, order, type',
      routineExercises: '&id, routineId, exerciseId, section, order',
      workoutLogs: '&id, completedAt, routineId, status',
      exerciseLogEntries: '&id, workoutLogId, exerciseId',
      settings: '&id',
      equipment: '&id, owned, recommended',
      schedulePreferences: '&id',
    })

    this.version(2).stores({
      exercises: '&id, name, difficulty, group',
      routines: '&id, enabled, order, type',
      routineExercises: '&id, routineId, exerciseId, section, order',
      workoutLogs: '&id, completedAt, routineId, status',
      exerciseLogEntries: '&id, workoutLogId, exerciseId',
      personalExerciseDefaults: '&id, exerciseId, updatedAt, source',
      exerciseMedia: '&id, exerciseId, type, isOfflineCapable, isTrusted',
      tourRoadmaps: '&id',
      settings: '&id',
      equipment: '&id, owned, recommended',
      schedulePreferences: '&id',
    })

    this.version(3).stores({
      exercises: '&id, name, difficulty, group',
      routines: '&id, enabled, order, type',
      routineExercises: '&id, routineId, exerciseId, section, order',
      workoutLogs: '&id, completedAt, routineId, status',
      exerciseLogEntries: '&id, workoutLogId, exerciseId',
      personalExerciseDefaults: '&id, exerciseId, updatedAt, source',
      exerciseMedia: '&id, exerciseId, type, isOfflineCapable, isTrusted',
      tourRoadmaps: '&id',
      settings: '&id',
      equipment: '&id, owned, recommended',
      schedulePreferences: '&id',
      carbEntries: '&id, dateISO, mealSlot, createdAt, sourceType',
      carbSettings: '&id',
      carbGoalHistory: '&id, effectiveDateISO',
      carbPresets: '&id, name, lastUsedAt, useCount',
      foodLookupCache: '&id, source, queryOrSourceId, expiresAt',
    })

    this.version(4).stores({
      exercises: '&id, name, difficulty, group',
      routines: '&id, enabled, order, type',
      routineExercises: '&id, routineId, exerciseId, section, order',
      workoutLogs: '&id, completedAt, routineId, status',
      exerciseLogEntries: '&id, workoutLogId, exerciseId, equipmentKey',
      personalExerciseDefaults: '&id, exerciseId, equipmentKey, updatedAt, source',
      exerciseMedia: '&id, exerciseId, type, isOfflineCapable, isTrusted',
      tourRoadmaps: '&id',
      settings: '&id',
      equipment: '&id, owned, recommended',
      schedulePreferences: '&id',
      carbEntries: '&id, dateISO, mealSlot, createdAt, sourceType',
      carbSettings: '&id',
      carbGoalHistory: '&id, effectiveDateISO',
      carbPresets: '&id, name, lastUsedAt, useCount',
      foodLookupCache: '&id, source, queryOrSourceId, expiresAt',
    })

    this.version(5).stores({
      exercises: '&id, name, difficulty, group',
      routines: '&id, enabled, order, type',
      routineExercises: '&id, routineId, exerciseId, section, order',
      workoutLogs: '&id, completedAt, routineId, status',
      exerciseLogEntries: '&id, workoutLogId, exerciseId, equipmentKey',
      personalExerciseDefaults: '&id, exerciseId, equipmentKey, updatedAt, source',
      exerciseMedia: '&id, exerciseId, type, isOfflineCapable, isTrusted',
      tourRoadmaps: '&id',
      settings: '&id',
      equipment: '&id, owned, recommended',
      schedulePreferences: '&id',
      carbEntries: '&id, dateISO, mealSlot, createdAt, sourceType',
      carbSettings: '&id',
      carbGoalHistory: '&id, effectiveDateISO',
      carbPresets: '&id, name, lastUsedAt, useCount',
      foodLookupCache: '&id, source, queryOrSourceId, expiresAt',
      privateSettings: '&key, updatedAt',
    })

    this.version(6).stores({
      exercises: '&id, name, difficulty, group',
      routines: '&id, enabled, order, type, role',
      routineExercises: '&id, routineId, exerciseId, section, order, slotKind',
      routineRotationStates: '&id, updatedAtISO',
      routineSessionOverrides: '&id, routineId, sessionDateISO, scope, createdAtISO',
      workoutLogs: '&id, completedAt, routineId, status',
      exerciseLogEntries: '&id, workoutLogId, exerciseId, equipmentKey',
      personalExerciseDefaults: '&id, exerciseId, equipmentKey, updatedAt, source',
      exerciseMedia: '&id, exerciseId, type, isOfflineCapable, isTrusted',
      tourRoadmaps: '&id',
      settings: '&id',
      equipment: '&id, owned, recommended',
      schedulePreferences: '&id',
      carbEntries: '&id, dateISO, mealSlot, createdAt, sourceType',
      carbSettings: '&id',
      carbGoalHistory: '&id, effectiveDateISO',
      carbPresets: '&id, name, lastUsedAt, useCount',
      foodLookupCache: '&id, source, queryOrSourceId, expiresAt',
      privateSettings: '&key, updatedAt',
    })
  }
}

export const db = new RAMprepDatabase()
