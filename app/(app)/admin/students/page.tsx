import { requireRole } from "@/lib/permissions";
import { getActiveIntake } from "@/lib/intake";
import { loadStudentList } from "@/lib/students-data";
import { StudentListView } from "@/components/students/StudentListView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Students — Kazo Technical School" };

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; filter?: string }>;
}) {
  await requireRole("admin");
  const { q = "", status = "", filter = "" } = await searchParams;
  const intake = await getActiveIntake();

  if (!intake) {
    return (
      <div className="space-y-4">
        <h1 className="page-title">Students</h1>
        <div className="card text-sm text-muted-foreground">
          There is no active intake yet. Create one in Intakes before enrolling
          students.
        </div>
      </div>
    );
  }

  const { items, threshold } = await loadStudentList(intake.id, {
    includeFees: true,
  });

  return (
    <StudentListView
      intakeName={intake.name}
      items={items}
      threshold={threshold}
      basePath="/admin/students"
      showFees
      q={q}
      status={status}
      filter={filter}
    />
  );
}
