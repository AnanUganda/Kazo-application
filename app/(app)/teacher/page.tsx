import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { AlertTriangle, ListChecks, Plus, UserX } from "lucide-react";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { lessonAbsences, lessonLogs, staff } from "@/lib/db/schema";
import { displayFirstName, formatDate, todayKampala } from "@/lib/format";
import { getActiveIntake, intakeEvents } from "@/lib/intake";
import { loadStudentList } from "@/lib/students-data";
import { loadSyllabus } from "@/lib/syllabus-data";
import { KTS_COURSE_POLICY } from "@/lib/syllabus-defaults";
import {
  countOverdue,
  topicState,
  trackColor,
  weekNumber,
} from "@/lib/track-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard, type StatBadgeVariant } from "@/components/stat-card";
import { HomeCalendar } from "@/components/home-calendar";

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

  const trackVariant: StatBadgeVariant =
    tone === "green" ? "success" : tone === "amber" ? "warning" : "destructive";
  const badgeLabel =
    tone === "green"
      ? "On track"
      : tone === "amber"
        ? "Slightly behind"
        : "Behind schedule";

  return (
    <div className="space-y-6">
      {/* CTA header */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Teacher Workspace · {KTS_COURSE_POLICY.courseName}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Welcome, {displayFirstName(teacher.fullName)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {KTS_COURSE_POLICY.schedule} ·{" "}
              {activeIntake
                ? `${activeIntake.name} (Semester ${currentSemester}, Week ${Math.min(13, currentWeek)} of 13)`
                : "No active intake"}
            </p>
          </div>
          <Button size="lg" asChild>
            <Link href="/teacher/log">
              <Plus /> Log today&apos;s lesson
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          href="/teacher/syllabus"
          label="Track status"
          icon={ListChecks}
          value={`${syllabusData.completed.size}/${syllabusData.topics.length} done`}
          hint="Open the full syllabus timeline"
          badge={{ variant: trackVariant, label: badgeLabel }}
        />
        <StatCard
          href="/teacher/syllabus"
          label="Overdue topics"
          icon={AlertTriangle}
          value={String(overdueTopics.length)}
          valueClassName="text-red-700 dark:text-red-400"
          hint={`${dueThisAndNextWeek.length} due this week & next`}
        />
        <StatCard
          href="/teacher/students?filter=under_threshold"
          label={`Under ${studentListData.threshold}% attendance`}
          icon={UserX}
          value={String(studentsUnderThreshold.length)}
          hint={`Out of ${activeStudents.length} active students`}
        />
      </div>

      {/* Calendar */}
      <HomeCalendar events={intakeEvents(activeIntake)} />

      {/* Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Topics due this week & next */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>
                Topics due this &amp; next week (Wks {currentWeek}–
                {Math.min(13, currentWeek + 1)})
              </CardTitle>
              <CardDescription>
                Semester {currentSemester} targets from the KTS syllabus.
              </CardDescription>
            </div>
            <Link
              href="/teacher/syllabus"
              className="shrink-0 text-xs font-semibold text-primary hover:underline"
            >
              Full timeline →
            </Link>
          </CardHeader>
          <CardContent>
            {dueThisAndNextWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All topics scheduled for this week and next are completed.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {dueThisAndNextWeek.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{t.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Sem {t.semester} · Week {t.targetWeek} ·{" "}
                        {t.type === "theory" ? "Classroom theory" : "Booth practical"}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/teacher/log">Log lesson</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Overdue topics */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Overdue topics ({overdueTopics.length})</CardTitle>
              <CardDescription>Past their target week</CardDescription>
            </div>
            <Link
              href="/teacher/log"
              className="shrink-0 text-xs font-semibold text-primary hover:underline"
            >
              Record progress →
            </Link>
          </CardHeader>
          <CardContent>
            {overdueTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Zero overdue topics — syllabus is on schedule.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {overdueTopics.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{t.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Sem {t.semester} · Target Week {t.targetWeek} (
                        {t.type === "theory" ? "Theory" : "Practical"})
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                      Overdue
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/teacher/log">Log now</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent lesson logs */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Recent lesson logs</CardTitle>
              <CardDescription>Editable for 7 days</CardDescription>
            </div>
            <Link
              href="/teacher/log"
              className="shrink-0 text-xs font-semibold text-primary hover:underline"
            >
              + Log lesson →
            </Link>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No lessons logged yet.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {recentLogs.map((log) => {
                  const absCount = absentCountByLog.get(log.id) ?? 0;
                  return (
                    <li
                      key={log.id}
                      className="flex items-start justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">
                          {formatDate(log.date)} ·{" "}
                          <span className="capitalize">{log.session}</span>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {log.teacherName}
                          {log.notes ? ` — ${log.notes}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-xs text-muted-foreground">
                          {absCount === 0 ? "All present" : `${absCount} absent`}
                        </span>
                        {log.teacherId === teacher.id && (
                          <div>
                            <Link
                              href={`/lessons/${log.id}/edit`}
                              className="text-xs font-semibold text-primary hover:underline"
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
          </CardContent>
        </Card>

        {/* Students under threshold (no fee data) */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>
                Under {studentListData.threshold}% attendance
              </CardTitle>
              <CardDescription>
                {KTS_COURSE_POLICY.consecutiveAbsenceTerminationDays} absences in
                a row triggers review
              </CardDescription>
            </div>
            <Link
              href="/teacher/students?filter=under_threshold"
              className="shrink-0 text-xs font-semibold text-primary hover:underline"
            >
              Filter roster →
            </Link>
          </CardHeader>
          <CardContent>
            {studentsUnderThreshold.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All active students are above the {studentListData.threshold}%
                threshold.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {studentsUnderThreshold.map(({ student, attendance }) => (
                  <li
                    key={student.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <Link
                      href={`/teacher/students/${student.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {student.fullName}
                      {student.booth && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({student.booth})
                        </span>
                      )}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {attendance.presentCount}/{attendance.sessionsHeld}
                      </span>
                      <Badge variant="destructive">{attendance.rate}%</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
