import { requireRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Store keeper home — Kazo Technical School" };

export default async function StoreHome() {
  const me = await requireRole("store_keeper");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">
          Welcome, {me.fullName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Store keeper home. Low-stock items, open faults and latest stock
          movements arrive in Phase 7.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {["Low-stock items", "Open faults", "Latest stock movements"].map(
          (title) => (
            <div key={title} className="card">
              <div className="text-sm font-semibold text-neutral-700">
                {title}
              </div>
              <div className="mt-6 text-xs font-medium uppercase tracking-wide text-neutral-300">
                Coming in Phase 7
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
