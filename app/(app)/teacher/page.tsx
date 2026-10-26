import { requireRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Teacher home — Kazo Technical School" };

export default async function TeacherHome() {
  const me = await requireRole("teacher");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">
          Welcome, {me.fullName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Teacher home. The “Log today’s lesson” button, track status and your
          recent logs arrive in Phase 7.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          "Log today's lesson",
          "Track status",
          "Topics due this week",
          "Students under threshold",
        ].map((title) => (
          <div key={title} className="card">
            <div className="text-sm font-semibold text-neutral-700">{title}</div>
            <div className="mt-6 text-xs font-medium uppercase tracking-wide text-neutral-300">
              Coming in Phase 7
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
