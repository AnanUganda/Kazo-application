import Link from "next/link";
import { requireRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin home — Kazo Technical School" };

export default async function AdminHome() {
  const me = await requireRole("admin");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">
          Welcome, {me.fullName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Administrator home. Summary cards (syllabus status, applications, fees,
          attendance, stock) arrive in Phase 7.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          "Syllabus status",
          "Applications by stage",
          "Fees outstanding",
          "Attendance this week",
          "Low stock & repairs",
        ].map((title) => (
          <div key={title} className="card">
            <div className="text-sm font-semibold text-neutral-700">{title}</div>
            <div className="mt-6 text-xs font-medium uppercase tracking-wide text-neutral-300">
              Coming in Phase 7
            </div>
          </div>
        ))}
        <Link
          href="/admin/staff"
          className="card flex flex-col justify-between transition hover:border-brand-200 hover:shadow"
        >
          <div className="text-sm font-semibold text-brand">Manage staff</div>
          <div className="mt-6 text-xs font-medium text-neutral-500">
            Create accounts, assign roles, deactivate →
          </div>
        </Link>
      </div>
    </div>
  );
}
