import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import {
  lessonLogs,
  lessonTopicProgress,
  staff,
  syllabusTopics,
} from "@/lib/db/schema";
import { getActiveIntake } from "@/lib/intake";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lessons — Kazo Technical School" };

export default async function AdminLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ teacher?: string; topic?: string }>;
}) {
  await requireRole("admin");
  const { teacher = "", topic = "" } = await searchParams;
  const db = getDb();
  const intake = await getActiveIntake();

  const teachers = await db
    .select({ id: staff.id, fullName: staff.fullName })
    .from(staff)
    .where(inArray(staff.role, ["teacher", "admin"]))
    .orderBy(staff.fullName);

  const topics = intake
    ? await db
        .select({ id: syllabusTopics.id, title: syllabusTopics.title })
        .from(syllabusTopics)
        .where(eq(syllabusTopics.intakeId, intake.id))
        .orderBy(syllabusTopics.sortOrder)
    : [];

  const filters = [];
  if (teacher) filters.push(eq(lessonLogs.teacherId, teacher));
  if (topic) {
    const logIds = (
      await db
        .select({ id: lessonTopicProgress.lessonLogId })
        .from(lessonTopicProgress)
        .where(eq(lessonTopicProgress.topicId, topic))
    ).map((r) => r.id);
    // inArray with an empty list returns nothing — guard it.
    filters.push(
      logIds.length ? inArray(lessonLogs.id, logIds) : eq(lessonLogs.id, "00000000-0000-0000-0000-000000000000"),
    );
  }

  const logs = await db
    .select({
      id: lessonLogs.id,
      date: lessonLogs.date,
      session: lessonLogs.session,
      notes: lessonLogs.notes,
      teacherName: staff.fullName,
    })
    .from(lessonLogs)
    .innerJoin(staff, eq(lessonLogs.teacherId, staff.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(lessonLogs.date), desc(lessonLogs.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">Lessons</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Every lesson log. You can edit any log.
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="teacher" className="field-label">Teacher</label>
          <select id="teacher" name="teacher" defaultValue={teacher} className="field-input">
            <option value="">All teachers</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.fullName}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="topic" className="field-label">Topic</label>
          <select id="topic" name="topic" defaultValue={topic} className="field-input">
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">Filter</button>
      </form>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="card text-sm text-neutral-400">No lesson logs found.</div>
        ) : (
          logs.map((log) => (
            <Link
              key={log.id}
              href={`/lessons/${log.id}/edit`}
              className="card flex items-center justify-between gap-3 p-4 transition hover:border-brand-200"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-neutral-800">
                  {formatDate(log.date)} ·{" "}
                  <span className="capitalize">{log.session}</span>
                </div>
                <div className="truncate text-xs text-neutral-400">
                  {log.teacherName}
                  {log.notes ? ` · ${log.notes}` : ""}
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium text-brand">Edit →</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
