import { auditExerciseGuides } from '../src/utils/exerciseGuideAudit.ts'

const issues = auditExerciseGuides()

if (issues.length) {
  console.error(`Exercise guide audit failed with ${issues.length} issue(s).`)
  for (const issue of issues) {
    const details = [
      issue.offendingPhrase ? `phrase: ${issue.offendingPhrase}` : '',
      issue.likelySourceExercise ? `likely source/template: ${issue.likelySourceExercise}` : '',
    ]
      .filter(Boolean)
      .join(' | ')
    console.error(`${issue.exerciseId} ${issue.field}: ${issue.message}${details ? ` (${details})` : ''}`)
  }
  process.exit(1)
}

console.log('Exercise guide audit passed.')
