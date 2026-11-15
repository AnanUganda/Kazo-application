import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { lessonLogs, students } from "@/lib/db/schema";
import { getActiveIntake } from "@/lib/intake";
import { loadSyllabus } from "@/lib/syllabus-data";
import { formatDate } from "@/lib/format";
import { LessonLogForm } from "./LessonLogForm";
import { createLessonLog } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log lesson — Kazo Technical School" };

export default async function LogLessonPage() {
  const me = await requireRole("teacher", "admin");
  const intake = await getActiveIntake();

  if (!intake) {
    return (
      <div className="space-y-4">
        <h1 className="page-title">Log a lesson</h1>
        <div className="card text-sm text-muted-foreground">
          There is no active intake yet.
        </div>
      </div>
    );
  }

  const db = getDb();
  const { topics } = await loadSyllabus(intake.id);
  const roster = await db
    .select({ id: students.id, fullName: students.fullName })
    .from(students)
    .where(
      and(
        eq(students.intakeId, intake.id),
        eq(students.status, "active"),
        isNull(students.archivedAt),
      ),
    )
    .orderBy(students.fullName);

  const myLogs = await db
    .select()
    .from(lessonLogs)
    .where(eq(lessonLogs.teacherId, me.id))
    .orderBy(desc(lessonLogs.date), desc(lessonLogs.createdAt))
    .limit(10);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">Log today&apos;s lesson</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {intake.name} · takes about a minute.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="card">
            <LessonLogForm
              action={createLessonLog}
              topics={topics.map((t) => ({
                id: t.id,
                title: t.title,
                semester: t.semester,
                type: t.type,
              }))}
              students={roster}
            />
          </div>
        </section>

        <section className="lg:col-span-1">
          <h2 className="mb-3 section-title">
            Your recent logs
          </h2>
          <div className="space-y-2">
            {myLogs.length === 0 ? (
              <div className="card text-sm text-muted-foreground">No logs yet.</div>
            ) : (
              myLogs.map((log) => (
                <Link
                  key={log.id}
                  href={`/lessons/${log.id}/edit`}
                  className="card flex items-center justify-between p-3 transition hover:border-primary/40"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {formatDate(log.date)}
                    </div>
                    <div className="text-xs capitalize text-muted-foreground">
                      {log.session}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-primary">Edit →</span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
