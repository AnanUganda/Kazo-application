import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { lessonAbsences, lessonLogs, staff } from "@/lib/db/schema";
import { formatDate, todayKampala } from "@/lib/format";
import { getActiveIntake } from "@/lib/intake";
import { loadStudentList } from "@/lib/students-data";
import { loadSyllabus } from "@/lib/syllabus-data";
import { KTS_COURSE_POLICY } from "@/lib/syllabus-defaults";
import {
  countOverdue,
  topicState,
  trackColor,
  weekNumber,
} from "@/lib/track-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Teacher Home — Kazo Technical School" };

export default async function TeacherHome() {
  const teacher = await requireRole("teacher");
  const db = getDb();
  const today = todayKampala();
  const activeIntake = await getActiveIntake();

  const [syllabusData, studentListData, recentLogs] = await Promise.all([
    activeIntake
      ? loadSyllabus(activeIntake.id)
      : Promise.resolve({
          topics: [],
          completed: new Set<string>(),
          started: new Set<string>(),
        }),
    activeIntake
      ? loadStudentList(activeIntake.id, { includeFees: false })
      : Promise.resolve({ items: [], threshold: 85 }),
    activeIntake
      ? db
          .select({
            id: lessonLogs.id,
            date: lessonLogs.date,
            session: lessonLogs.session,
            notes: lessonLogs.notes,
            teacherId: lessonLogs.teacherId,
            teacherName: staff.fullName,
          })
          .from(lessonLogs)
          .innerJoin(staff, eq(lessonLogs.teacherId, staff.id))
          .where(
            and(
              eq(lessonLogs.intakeId, activeIntake.id),
              isNull(lessonLogs.archivedAt),
            ),
          )
          .orderBy(desc(lessonLogs.date), desc(lessonLogs.createdAt))
          .limit(6)
      : Promise.resolve([]),
  ]);

  const absRows = activeIntake
    ? await db
        .select({ lessonLogId: lessonAbsences.lessonLogId })
        .from(lessonAbsences)
        .where(isNull(lessonAbsences.archivedAt))
    : [];
  const absentCountByLog = new Map<string, number>();
  for (const r of absRows) {
    absentCountByLog.set(
      r.lessonLogId,
      (absentCountByLog.get(r.lessonLogId) ?? 0) + 1,
    );
  }

  // Track status + topics due this week & next + overdue topics
  const wk1 = activeIntake ? weekNumber(activeIntake.semester1Start, today) : null;
  const wk2 = activeIntake ? weekNumber(activeIntake.semester2Start, today) : null;
  const currentSemester = wk2 !== null ? 2 : 1;
  const currentWeek = (currentSemester === 2 ? wk2 : wk1) ?? 1;

  const overdueCount = activeIntake
    ? countOverdue(syllabusData.topics, syllabusData.completed, {
        1: wk1,
        2: wk2,
      })
    : 0;
  const tone = trackColor(overdueCount);

  const topicsWithState = syllabusData.topics.map((t) => {
    const semWk = t.semester === 1 ? wk1 : wk2;
    return {
      ...t,
      state: topicState(t, syllabusData.completed, syllabusData.started, semWk),
    };
  });

  const overdueTopics = topicsWithState.filter((t) => t.state === "overdue");
  const dueThisAndNextWeek = topicsWithState.filter(
    (t) =>
      t.state !== "done" &&
      t.semester === currentSemester &&
      (t.targetWeek === currentWeek || t.targetWeek === currentWeek + 1),
  );

  // Students under attendance threshold (strictly no fee data)
  const activeStudents = studentListData.items.filter(
    (i) => i.student.status !== "dropped_out",
  );
  const studentsUnderThreshold = activeStudents.filter(
    (i) => i.attendance.belowThreshold,
  );

  const badgeToneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-700";

  const badgeLabel =
    tone === "green"
      ? "On track"
      : tone === "amber"
        ? "Slightly behind"
        : "Behind schedule";

  return (
    <div className="space-y-6">
      {/* Big CTA header */}
      <header className="card flex flex-wrap items-center justify-between gap-4 border-brand-200 bg-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Teacher Workspace · {KTS_COURSE_POLICY.courseName}
          </p>
          <h1 className="mt-1 text-xl font-bold text-neutral-900">
            Welcome, {teacher.fullName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {KTS_COURSE_POLICY.schedule} ·{" "}
            {activeIntake
              ? `${activeIntake.name} (Semester ${currentSemester}, Week ${Math.min(13, currentWeek)} of 13)`
              : "No active intake"}
          </p>
        </div>
        <Link
          href="/teacher/log"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
        >
          + Log today&apos;s lesson
        </Link>
      </header>

      {/* Top 3 KPI cards — every number opens its filtered view */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/teacher/syllabus"
          className="card group block transition hover:border-brand"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Track Status
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeToneClass}`}
            >
              {badgeLabel}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-neutral-900">
            {syllabusData.completed.size} / {syllabusData.topics.length} done
          </p>
          <p className="mt-1 text-xs text-neutral-500 group-hover:text-brand">
            Open full 18-module syllabus timeline →
          </p>
        </Link>

        <Link
          href="/teacher/syllabus"
          className="card group block transition hover:border-brand"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Overdue Topics
          </span>
          <p className="mt-3 text-2xl font-bold text-red-700">
            {overdueTopics.length}
          </p>
          <p className="mt-1 text-xs text-neutral-500 group-hover:text-brand">
            {dueThisAndNextWeek.length} due this week &amp; next →
          </p>
        </Link>

        <Link
          href="/teacher/students?filter=under_threshold"
          className="card group block transition hover:border-brand"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Under {studentListData.threshold}% Attendance
          </span>
          <p className="mt-3 text-2xl font-bold text-neutral-900">
            {studentsUnderThreshold.length}
          </p>
          <p className="mt-1 text-xs text-neutral-500 group-hover:text-brand">
            Out of {activeStudents.length} active students →
          </p>
        </Link>
      </div>

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Topics due this week & next */}
        <section className="card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Topics Due This Week &amp; Next (Wks {currentWeek}–
                {Math.min(13, currentWeek + 1)})
              </h2>
              <p className="text-xs text-neutral-500">
                Semester {currentSemester} targets from the KTS syllabus.
              </p>
            </div>
            <Link
              href="/teacher/syllabus"
              className="text-xs font-semibold text-brand hover:underline"
            >
              Full timeline →
            </Link>
          </div>

          {dueThisAndNextWeek.length === 0 ? (
            <p className="text-sm text-neutral-500">
              All topics scheduled for this week and next week are completed!
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {dueThisAndNextWeek.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-neutral-900">
                      {t.title}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Sem {t.semester} · Week {t.targetWeek} ·{" "}
                      {t.type === "theory" ? "Classroom theory" : "Booth practical"}
                    </div>
                  </div>
                  <Link
                    href="/teacher/log"
                    className="btn-secondary shrink-0 py-1.5 text-xs"
                  >
                    Log lesson
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Overdue topics */}
        <section className="card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Overdue Topics ({overdueTopics.length})
              </h2>
              <p className="text-xs text-neutral-500">
                Topics whose target week has passed without being marked
                completed.
              </p>
            </div>
            <Link
              href="/teacher/log"
              className="text-xs font-semibold text-brand hover:underline"
            >
              Record progress →
            </Link>
          </div>

          {overdueTopics.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Zero overdue topics — syllabus is right on schedule.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {overdueTopics.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-red-700">
                      {t.title}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Sem {t.semester} · Target Week {t.targetWeek} (
                      {t.type === "theory" ? "Theory" : "Practical"})
                    </div>
                  </div>
                  <Link
                    href="/teacher/log"
                    className="btn-secondary shrink-0 py-1.5 text-xs"
                  >
                    Log now
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent lesson logs */}
        <section className="card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Recent Lesson Logs
              </h2>
              <p className="text-xs text-neutral-500">
                You can edit your own logs within 7 days of the lesson date.
              </p>
            </div>
            <Link
              href="/teacher/log"
              className="text-xs font-semibold text-brand hover:underline"
            >
              + Log lesson →
            </Link>
          </div>

          {recentLogs.length === 0 ? (
            <p className="text-sm text-neutral-500">No lessons logged yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {recentLogs.map((log) => {
                const absCount = absentCountByLog.get(log.id) ?? 0;
                return (
                  <li
                    key={log.id}
                    className="flex items-start justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-neutral-900">
                        {formatDate(log.date)} ·{" "}
                        <span className="capitalize">{log.session}</span>
                      </div>
                      <div className="truncate text-xs text-neutral-500">
                        {log.teacherName}
                        {log.notes ? ` — ${log.notes}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-xs text-neutral-600">
                        {absCount === 0
                          ? "All present"
                          : `${absCount} absent`}
                      </span>
                      {log.teacherId === teacher.id && (
                        <div>
                          <Link
                            href={`/lessons/${log.id}/edit`}
                            className="text-xs font-semibold text-brand hover:underline"
                          >
                            Edit
                          </Link>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Students under threshold (strictly no fee data) */}
        <section className="card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Students Under {studentListData.threshold}% Attendance
              </h2>
              <p className="text-xs text-neutral-500">
                KTS requires ≥{KTS_COURSE_POLICY.attendanceRequirementPct}%
                attendance; {KTS_COURSE_POLICY.consecutiveAbsenceTerminationDays}{" "}
                consecutive days absent triggers termination review.
              </p>
            </div>
            <Link
              href="/teacher/students?filter=under_threshold"
              className="text-xs font-semibold text-brand hover:underline"
            >
              Filter roster →
            </Link>
          </div>

          {studentsUnderThreshold.length === 0 ? (
            <p className="text-sm text-neutral-500">
              All active students are above the {studentListData.threshold}%
              attendance threshold.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {studentsUnderThreshold.map(({ student, attendance }) => (
                <li
                  key={student.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div>
                    <Link
                      href={`/teacher/students/${student.id}`}
                      className="font-medium text-neutral-900 hover:text-brand hover:underline"
                    >
                      {student.fullName}
                    </Link>
                    {student.booth && (
                      <span className="ml-2 text-xs text-neutral-500">
                        ({student.booth})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">
                      {attendance.presentCount}/{attendance.sessionsHeld}{" "}
                      present
                    </span>
                    <Link
                      href={`/teacher/students/${student.id}`}
                      className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700"
                    >
                      {attendance.rate}%
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
