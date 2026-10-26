import Link from "next/link";
import { requireRole } from "@/lib/permissions";
import { loadStudentProfile } from "@/lib/students-data";
import { StudentProfileView } from "@/components/students/StudentProfileView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Student profile — Kazo Technical School" };

export default async function TeacherStudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("teacher", "admin");
  const { id } = await params;

  // Teacher view: view-only and strictly WITHOUT any fee queries or fee UI.
  const data = await loadStudentProfile(id, { includeFees: false });
  if (!data) {
    return (
      <div className="space-y-4">
        <Link
          href="/teacher/students"
          className="text-xs font-semibold text-brand hover:underline"
        >
          ← Back to students
        </Link>
        <div className="card text-sm text-neutral-500">Student not found.</div>
      </div>
    );
  }

  return (
    <StudentProfileView
      data={data}
      basePath="/teacher/students"
      showFees={false}
      isAdmin={false}
    />
  );
}
