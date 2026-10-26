/**
 * Pure attendance maths (no DB/server imports — unit-testable).
 * Attendance has ONE source: `lesson_absences` (everyone present by default;
 * a row means absent). Rate = present sessions / sessions held since the
 * student enrolled.
 */

export type AttendanceSession = {
  id: string;
  date: string; // YYYY-MM-DD
};

export type AttendanceSummary = {
  sessionsHeld: number;
  presentCount: number;
  absencesCount: number;
  /** Integer percentage (0–100), or null when no sessions have been held yet. */
  rate: number | null;
  /** True when at least one session was held and rate < threshold. */
  belowThreshold: boolean;
};

/**
 * Compute attendance for a student given all intake sessions, the set of
 * lessonLogIds the student missed, their enrolment date (YYYY-MM-DD), and the
 * percentage threshold (default 85).
 */
export function computeAttendance(
  sessions: AttendanceSession[],
  absentLessonIds: ReadonlySet<string>,
  enrolledDate?: string,
  threshold = 85,
): AttendanceSummary {
  const eligible = sessions.filter(
    (s) => !enrolledDate || s.date >= enrolledDate || absentLessonIds.has(s.id),
  );
  const sessionsHeld = eligible.length;
  if (sessionsHeld === 0) {
    return {
      sessionsHeld: 0,
      presentCount: 0,
      absencesCount: 0,
      rate: null,
      belowThreshold: false,
    };
  }

  let absencesCount = 0;
  for (const s of eligible) {
    if (absentLessonIds.has(s.id)) absencesCount++;
  }
  const presentCount = Math.max(0, sessionsHeld - absencesCount);
  const rate = Math.round((presentCount / sessionsHeld) * 100);

  return {
    sessionsHeld,
    presentCount,
    absencesCount,
    rate,
    belowThreshold: rate < threshold,
  };
}
