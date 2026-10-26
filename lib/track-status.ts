/**
 * Pure syllabus track-status maths (no DB/server imports — unit-testable).
 * A topic is overdue when its target week has passed and it isn't Completed.
 * 0–1 overdue = Green, 2 = Amber, 3+ = Red.
 */

export type TrackColor = "green" | "amber" | "red";
export type TopicState = "done" | "in_progress" | "overdue" | "upcoming";

export function trackColor(overdueCount: number): TrackColor {
  if (overdueCount >= 3) return "red";
  if (overdueCount === 2) return "amber";
  return "green";
}

/**
 * 1-based week number for `today` within a period starting at `startDate`
 * (both YYYY-MM-DD). Returns null if the period has not started yet.
 */
export function weekNumber(startDate: string, today: string): number | null {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const now = new Date(`${today}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || now < start) return null;
  return Math.floor((now - start) / (7 * 86_400_000)) + 1;
}

export type TopicForStatus = {
  id: string;
  semester: number;
  targetWeek: number;
};

/** State of one topic for the timeline. */
export function topicState(
  topic: TopicForStatus,
  completedIds: Set<string>,
  startedIds: Set<string>,
  currentWeek: number | null,
): TopicState {
  if (completedIds.has(topic.id)) return "done";
  if (currentWeek !== null && currentWeek > topic.targetWeek) return "overdue";
  if (startedIds.has(topic.id)) return "in_progress";
  return "upcoming";
}

/** Count overdue topics across the plan. */
export function countOverdue(
  topics: TopicForStatus[],
  completedIds: Set<string>,
  currentWeekBySemester: Record<number, number | null>,
): number {
  let overdue = 0;
  for (const t of topics) {
    if (completedIds.has(t.id)) continue;
    const wk = currentWeekBySemester[t.semester];
    if (wk != null && wk > t.targetWeek) overdue++;
  }
  return overdue;
}
