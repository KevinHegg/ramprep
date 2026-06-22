import Dexie, { type Table } from 'dexie'
import type {
  Equipment,
  Exercise,
  ExerciseLogEntry,
  Routine,
  RoutineExercise,
  SchedulePreference,
  UserSettings,
  WorkoutLog,
} from '../types'

export class RampRepDatabase extends Dexie {
  exercises!: Table<Exercise, string>
  routines!: Table<Routine, string>
  routineExercises!: Table<RoutineExercise, string>
  workoutLogs!: Table<WorkoutLog, string>
  exerciseLogEntries!: Table<ExerciseLogEntry, string>
  settings!: Table<UserSettings, string>
  equipment!: Table<Equipment, string>
  schedulePreferences!: Table<SchedulePreference, string>

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
  }
}

export const db = new RampRepDatabase()
