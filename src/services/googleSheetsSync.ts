import type { ExerciseLogEntry, WorkoutLog } from '../types'

export interface GoogleSheetsPayloadRow {
  workoutDate: string
  routineName: string
  exerciseName: string
  sets?: number
  reps?: string
  weight?: number
  durationSeconds?: number
  effort?: number
  notes?: string
}

export const buildGoogleSheetsPayload = (log: WorkoutLog, entries: ExerciseLogEntry[]): GoogleSheetsPayloadRow[] =>
  entries.map((entry) => ({
    workoutDate: log.completedAt,
    routineName: log.routineName,
    exerciseName: entry.exerciseName,
    sets: entry.sets,
    reps: entry.reps,
    weight: entry.weight,
    durationSeconds: entry.durationSeconds,
    effort: entry.effort,
    notes: entry.notes ?? log.notes,
  }))

export const validateGoogleAppsScriptUrl = (url?: string) => {
  if (!url?.trim()) {
    return { ok: false, message: 'Google Sheets sync is not configured.' }
  }

  try {
    const parsed = new URL(url)
    const ok = parsed.protocol === 'https:' && parsed.hostname.endsWith('script.google.com')
    return {
      ok,
      message: ok ? 'Google Apps Script URL is configured.' : 'Use an HTTPS Google Apps Script web app URL.',
    }
  } catch {
    return { ok: false, message: 'The sync URL is not valid.' }
  }
}

// Future Google Sheets sync can POST buildGoogleSheetsPayload(log, entries)
// to a deployed Google Apps Script web app URL after the user configures it.
