import { exerciseMediaSources } from '../src/data/verifiedExerciseSources.ts'
import { validateExerciseSources } from '../src/utils/validateExerciseSources.ts'

const issues = validateExerciseSources(exerciseMediaSources)

if (issues.length) {
  console.error(`Exercise media audit failed with ${issues.length} issue(s).`)
  for (const issue of issues) {
    console.error(`${issue.exerciseId} ${issue.field}: ${issue.message}`)
  }
  process.exit(1)
}

console.log(`Exercise media audit passed for ${exerciseMediaSources.length} source records.`)
