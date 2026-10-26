import { and, eq, isNull } from "drizzle-orm";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  lessonAbsences,
  lessonIssues,
  lessonLogs,
  lessonTopicProgress,
  students,
} from "@/lib/db/schema";
import { loadSyllabus } from "@/lib/syllabus-data";
import { daysSince, formatDate } from "@/lib/format";
import { LessonLogForm, type LessonLogInitial } from "@/app/(app)/teacher/log/LessonLogForm";
import { updateLessonLog } from "@/app/(app)/teacher/log/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit lesson log — Kazo Technical School" };

export default async function EditLessonLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireStaff();
  const { id } = await params;
  const db = getDb();

  const log = (
    await db.select().from(lessonLogs).where(eq(lessonLogs.id, id)).limit(1)
  )[0];

  if (!log) {
    return (
      <div className="card text-sm text-neutral-500">Lesson log not found.</div>
    );
  }

  const canEdit =
    me.role === "admin" ||
    (log.teacherId === me.id && daysSince(log.createdAt) < 7);

  if (!canEdit) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-neutral-900">Lesson log</h1>
        <div className="card text-sm text-neutral-500">
          This log is from {formatDate(log.date)} and can no longer be edited
          (teachers may edit their own logs for 7 days). Ask an admin if a change
          is needed.
        </div>
      </div>
    );
  }

  const { topics } = await loadSyllabus(log.intakeId);
  const roster = await db
    .select({ id: students.id, fullName: students.fullName })
    .from(students)
    .where(and(eq(students.intakeId, log.intakeId), isNull(students.archivedAt)))
    .orderBy(students.fullName);

  const progressRows = await db
    .select({ topicId: lessonTopicProgress.topicId, status: lessonTopicProgress.status })
    .from(lessonTopicProgress)
    .where(eq(lessonTopicProgress.lessonLogId, id));
  const absentRows = await db
    .select({ studentId: lessonAbsences.studentId })
    .from(lessonAbsences)
    .where(eq(lessonAbsences.lessonLogId, id));
  const issue = (
    await db.select().from(lessonIssues).where(eq(lessonIssues.lessonLogId, id)).limit(1)
  )[0];

  const initial: LessonLogInitial = {
    logId: log.id,
    date: log.date,
    session: log.session,
    notes: log.notes ?? undefined,
    progress: Object.fromEntries(
      progressRows.map((p) => [p.topicId, p.status]),
    ) as Record<string, "started" | "completed">,
    absentIds: absentRows.map((a) => a.studentId),
    issue: issue
      ? {
          description: issue.description,
          isMachine: issue.isMachineIssue,
          machineLabel: issue.machineLabel,
        }
      : undefined,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">Edit lesson log</h1>
        <p className="mt-1 text-sm text-neutral-500">{formatDate(log.date)}</p>
      </header>
      <div className="card max-w-2xl">
        <LessonLogForm
          action={updateLessonLog}
          topics={topics.map((t) => ({
            id: t.id,
            title: t.title,
            semester: t.semester,
            type: t.type,
          }))}
          students={roster}
          initial={initial}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
