import type { Exercise } from '../types'

export interface WgerExerciseSummary {
  id: number
  name: string
  description?: string
  category?: string
  muscles?: string[]
  equipment?: string[]
  license_author?: string
}

export const mapWgerExerciseToExercise = (item: WgerExerciseSummary): Omit<Exercise, 'createdAt' | 'updatedAt'> => ({
  id: `wger-${item.id}`,
  name: item.name.toLowerCase(),
  description: item.description?.replace(/<[^>]*>/g, '').trim() || 'Imported exercise metadata.',
  instructions: item.description ? [item.description.replace(/<[^>]*>/g, '').trim()] : [],
  formCues: [],
  commonMistakes: [],
  targetAreas: item.muscles ?? [],
  equipment: [],
  difficulty: 'beginner',
  defaults: {},
  attribution: item.license_author ? `wger exercise data, author: ${item.license_author}` : 'wger exercise data',
})

export const fetchWgerExercises = async () => {
  throw new Error('wger import is a future adapter. RAMprep currently runs fully offline.')
}
