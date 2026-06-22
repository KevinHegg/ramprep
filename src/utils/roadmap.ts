import type { TourRoadmap } from '../types'

export const toggleRoadmapMilestone = (roadmap: TourRoadmap, milestoneId: string, completed: boolean, completedAt: string) => ({
  ...roadmap,
  milestones: roadmap.milestones.map((milestone) =>
    milestone.id === milestoneId
      ? {
          ...milestone,
          completed,
          completedAt: completed ? completedAt : undefined,
        }
      : milestone,
  ),
})

export const shouldSuggestLighterWeek = ({
  missedSessions,
  soreness,
  conflicts,
}: {
  missedSessions: number
  soreness: boolean
  conflicts: number
}) => missedSessions >= 2 || soreness || conflicts > 0
