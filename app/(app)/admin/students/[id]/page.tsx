import Link from "next/link";
import { requireRole } from "@/lib/permissions";
import { loadStudentProfile } from "@/lib/students-data";
import { StudentProfileView } from "@/components/students/StudentProfileView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Student profile — Kazo Technical School" };

export default async function AdminStudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;

  const data = await loadStudentProfile(id, { includeFees: true });
  if (!data) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/students"
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
      basePath="/admin/students"
      showFees
      isAdmin
    />
  );
}
