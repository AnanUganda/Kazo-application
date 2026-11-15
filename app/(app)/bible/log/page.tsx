import { and, eq, isNull } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { getActiveIntake } from "@/lib/intake";
import { PageHeader } from "@/components/page-header";
import { BibleClassForm } from "../BibleClassForm";
import { createBibleClass } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log Bible class — Kazo Technical School" };

export default async function LogBibleClassPage() {
  await requireRole("bible_teacher", "admin");
  const intake = await getActiveIntake();

  if (!intake) {
    return (
      <div className="space-y-6">
        <PageHeader title="Log Bible class" />
        <div className="card text-sm text-muted-foreground">
          There is no active intake yet.
        </div>
      </div>
    );
  }

  const roster = await getDb()
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log Bible class"
        subtitle={`${intake.name} · daily morning class, one hour`}
      />
      <div className="card max-w-2xl">
        <BibleClassForm action={createBibleClass} students={roster} />
      </div>
    </div>
  );
}
