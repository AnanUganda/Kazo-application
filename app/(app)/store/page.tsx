import Link from "next/link";
import { desc, isNull } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { stockMovements } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import { loadConsumables, loadEquipmentRegister } from "@/lib/inventory-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Store Home — Kazo Technical School" };

export default async function StoreHome() {
  const storeKeeper = await requireRole("store_keeper");
  const db = getDb();

  const [consumablesList, equipmentData, recentMovements] = await Promise.all([
    loadConsumables(),
    loadEquipmentRegister(),
    db
      .select()
      .from(stockMovements)
      .where(isNull(stockMovements.archivedAt))
      .orderBy(desc(stockMovements.date), desc(stockMovements.createdAt))
      .limit(10),
  ]);

  const consumableById = new Map(
    consumablesList.map((c) => [c.consumable.id, c.consumable]),
  );

  // 1. Low-stock items
  const lowStockItems = consumablesList.filter((c) => c.lowStock);

  // 2. Open faults newest first (both equipment_faults and unlinked lesson machine issues)
  const openEquipmentFaults = equipmentData.equipmentList.flatMap(
    ({ item, faults }) =>
      faults
        .filter((f) => f.status === "open")
        .map((f) => ({
          id: f.id,
          date: f.reportedAt,
          assetLabel: `${item.assetCode} · ${item.type}`,
          booth: item.booth,
          problem: f.problem,
          reportedBy: f.reportedBy,
          fromLessonLog: Boolean(f.lessonIssueId),
        })),
  );

  const unlinkedOpenFaults = equipmentData.unlinkedLessonFaults
    .filter((u) => u.status === "open")
    .map((u) => ({
      id: u.lessonIssueId,
      date: u.date,
      assetLabel: u.machineLabel
        ? `Unlinked (${u.machineLabel})`
        : "Unlinked lesson machine issue",
      booth: null as string | null,
      problem: u.problem,
      reportedBy: u.reportedBy,
      fromLessonLog: true,
    }));

  const openFaultsNewestFirst = [
    ...openEquipmentFaults,
    ...unlinkedOpenFaults,
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Store Keeper Workspace · Workshop &amp; Consumables
          </p>
          <h1 className="mt-1 text-xl font-bold text-neutral-900">
            Welcome, {storeKeeper.fullName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Low-stock consumables, open machine faults, and the latest stock
            movements. Every number opens its filtered list.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/store/consumables" className="btn-primary py-2">
            Consumables &amp; stock
          </Link>
          <Link href="/store/equipment" className="btn-secondary py-2">
            Equipment &amp; faults
          </Link>
        </div>
      </header>

      {/* Top 3 KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/store/consumables?filter=low"
          className="card group block transition hover:border-brand"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Low-Stock Items
            </span>
            {lowStockItems.length > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                Reorder needed
              </span>
            )}
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-700">
            {lowStockItems.length}
          </p>
          <p className="mt-1 text-xs text-neutral-500 group-hover:text-brand">
            Out of {consumablesList.length} consumable lines →
          </p>
        </Link>

        <Link
          href="/store/equipment?filter=broken"
          className="card group block transition hover:border-brand"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Open Equipment Faults
            </span>
            {openFaultsNewestFirst.length > 0 && (
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                Needs repair
              </span>
            )}
          </div>
          <p className="mt-3 text-2xl font-bold text-red-700">
            {openFaultsNewestFirst.length}
          </p>
          <p className="mt-1 text-xs text-neutral-500 group-hover:text-brand">
            Open broken &amp; faulted machines →
          </p>
        </Link>

        <Link
          href="/store/consumables"
          className="card group block transition hover:border-brand"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Latest Movements
          </span>
          <p className="mt-3 text-2xl font-bold text-neutral-900">
            {recentMovements.length}
          </p>
          <p className="mt-1 text-xs text-neutral-500 group-hover:text-brand">
            Record stock in, stock out, or physical count →
          </p>
        </Link>
      </div>

      {/* Main 2-column panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low-stock items */}
        <section className="card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Low-Stock Items ({lowStockItems.length})
              </h2>
              <p className="text-xs text-neutral-500">
                Consumables where computed stock is at or below reorder level.
              </p>
            </div>
            <Link
              href="/store/consumables?filter=low"
              className="text-xs font-semibold text-brand hover:underline"
            >
              Filter low stock →
            </Link>
          </div>

          {lowStockItems.length === 0 ? (
            <p className="text-sm text-neutral-500">
              All consumables are stocked above their reorder threshold.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {lowStockItems.map(({ consumable, stockLevel }) => (
                <li
                  key={consumable.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div>
                    <Link
                      href="/store/consumables?filter=low"
                      className="font-medium text-neutral-900 hover:text-brand hover:underline"
                    >
                      {consumable.name}
                    </Link>
                    <div className="text-xs text-neutral-500">
                      Category: {consumable.category} · Reorder level:{" "}
                      {consumable.reorderLevel} {consumable.unit}
                    </div>
                  </div>
                  <Link
                    href="/store/consumables?filter=low"
                    className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
                  >
                    {stockLevel} {consumable.unit}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Open faults newest first */}
        <section className="card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Open Faults — Newest First ({openFaultsNewestFirst.length})
              </h2>
              <p className="text-xs text-neutral-500">
                Includes faults reported directly and machine issues logged in
                lessons.
              </p>
            </div>
            <Link
              href="/store/equipment?filter=broken"
              className="text-xs font-semibold text-brand hover:underline"
            >
              Resolve faults →
            </Link>
          </div>

          {openFaultsNewestFirst.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No open equipment faults.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {openFaultsNewestFirst.map((f) => (
                <li key={f.id} className="space-y-1 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href="/store/equipment?filter=broken"
                      className="font-medium text-neutral-900 hover:text-brand hover:underline"
                    >
                      {f.assetLabel}
                      {f.booth ? ` (${f.booth})` : ""}
                    </Link>
                    <span className="text-xs text-neutral-500">
                      {formatDate(f.date)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-700">{f.problem}</p>
                  <p className="text-[11px] text-neutral-400">
                    Reported by {f.reportedBy}
                    {f.fromLessonLog ? " · From lesson log" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Latest stock movements */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Latest Stock Movements
            </h2>
            <p className="text-xs text-neutral-500">
              Append-only movement ledger (stock in, stock out, and physical
              count adjustments).
            </p>
          </div>
          <Link
            href="/store/consumables"
            className="text-xs font-semibold text-brand hover:underline"
          >
            All consumables →
          </Link>
        </div>

        {recentMovements.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No stock movements recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Consumable</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Quantity Delta</th>
                  <th className="py-2 pr-3">Details</th>
                  <th className="py-2">Who</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentMovements.map((m) => {
                  const item = consumableById.get(m.consumableId);
                  const sign = m.quantityDelta > 0 ? `+${m.quantityDelta}` : `${m.quantityDelta}`;
                  const badgeClass =
                    m.type === "in"
                      ? "bg-emerald-50 text-emerald-700"
                      : m.type === "out"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-neutral-100 text-neutral-700";
                  return (
                    <tr key={m.id}>
                      <td className="py-2 pr-3 text-xs text-neutral-600">
                        {formatDate(m.date)}
                      </td>
                      <td className="py-2 pr-3 font-medium text-neutral-900">
                        {item?.name ?? "Consumable"}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${badgeClass}`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs font-semibold">
                        {sign} {item?.unit ?? ""}
                      </td>
                      <td className="py-2 pr-3 text-xs text-neutral-500">
                        {m.type === "in"
                          ? m.supplier
                            ? `Supplier: ${m.supplier}`
                            : "Stock received"
                          : m.type === "out"
                            ? `Purpose: ${m.purpose?.replace("_", " ") ?? "practice"}`
                            : `Adjustment (${m.adjustmentReason ?? "count"})`}
                      </td>
                      <td className="py-2 text-xs text-neutral-500">
                        {m.receivedBy || m.takenBy || "Store keeper"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
