import Link from "next/link";
import { desc, isNull } from "drizzle-orm";
import { ArrowLeftRight, Package, Wrench } from "lucide-react";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { stockMovements } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import { loadConsumables, loadEquipmentRegister } from "@/lib/inventory-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";

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

  const lowStockItems = consumablesList.filter((c) => c.lowStock);

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
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Store Keeper Workspace · Workshop &amp; Consumables
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Welcome, {storeKeeper.fullName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Low-stock consumables, open machine faults, and the latest stock
            movements. Every number opens its filtered list.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/store/consumables">Consumables &amp; stock</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/store/equipment">Equipment &amp; faults</Link>
          </Button>
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          href="/store/consumables?filter=low"
          label="Low-stock items"
          icon={Package}
          value={String(lowStockItems.length)}
          valueClassName="text-amber-700"
          hint={`Out of ${consumablesList.length} consumable lines`}
          badge={
            lowStockItems.length > 0
              ? { variant: "warning", label: "Reorder needed" }
              : undefined
          }
        />
        <StatCard
          href="/store/equipment?filter=broken"
          label="Open equipment faults"
          icon={Wrench}
          value={String(openFaultsNewestFirst.length)}
          valueClassName="text-red-700"
          hint="Open broken & faulted machines"
          badge={
            openFaultsNewestFirst.length > 0
              ? { variant: "destructive", label: "Needs repair" }
              : undefined
          }
        />
        <StatCard
          href="/store/consumables"
          label="Latest movements"
          icon={ArrowLeftRight}
          value={String(recentMovements.length)}
          hint="Record stock in, stock out, or a count"
        />
      </div>

      {/* Two-column panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low-stock items */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Low-stock items ({lowStockItems.length})</CardTitle>
              <CardDescription>
                Computed stock at or below the reorder level.
              </CardDescription>
            </div>
            <Link
              href="/store/consumables?filter=low"
              className="shrink-0 text-xs font-semibold text-primary hover:underline"
            >
              Filter low stock →
            </Link>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All consumables are above their reorder threshold.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {lowStockItems.map(({ consumable, stockLevel }) => (
                  <li
                    key={consumable.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div>
                      <Link
                        href="/store/consumables?filter=low"
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {consumable.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {consumable.category} · reorder ≤ {consumable.reorderLevel}{" "}
                        {consumable.unit}
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      {stockLevel} {consumable.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Open faults */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>
                Open faults — newest first ({openFaultsNewestFirst.length})
              </CardTitle>
              <CardDescription>
                Faults reported directly and machine issues from lesson logs.
              </CardDescription>
            </div>
            <Link
              href="/store/equipment?filter=broken"
              className="shrink-0 text-xs font-semibold text-primary hover:underline"
            >
              Resolve faults →
            </Link>
          </CardHeader>
          <CardContent>
            {openFaultsNewestFirst.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open equipment faults.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {openFaultsNewestFirst.map((f) => (
                  <li key={f.id} className="space-y-1 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href="/store/equipment?filter=broken"
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {f.assetLabel}
                        {f.booth ? ` (${f.booth})` : ""}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(f.date)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80">{f.problem}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Reported by {f.reportedBy}
                      {f.fromLessonLog ? " · From lesson log" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest stock movements */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Latest stock movements</CardTitle>
            <CardDescription>
              Append-only ledger (stock in, stock out, count adjustments).
            </CardDescription>
          </div>
          <Link
            href="/store/consumables"
            className="shrink-0 text-xs font-semibold text-primary hover:underline"
          >
            All consumables →
          </Link>
        </CardHeader>
        <CardContent>
          {recentMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No stock movements recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Consumable</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Δ Qty</th>
                    <th className="py-2 pr-3">Details</th>
                    <th className="py-2">Who</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentMovements.map((m) => {
                    const item = consumableById.get(m.consumableId);
                    const sign =
                      m.quantityDelta > 0
                        ? `+${m.quantityDelta}`
                        : `${m.quantityDelta}`;
                    const badgeClass =
                      m.type === "in"
                        ? "bg-green-100 text-green-800"
                        : m.type === "out"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-muted text-muted-foreground";
                    return (
                      <tr key={m.id}>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {formatDate(m.date)}
                        </td>
                        <td className="py-2 pr-3 font-medium">
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
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {m.type === "in"
                            ? m.supplier
                              ? `Supplier: ${m.supplier}`
                              : "Stock received"
                            : m.type === "out"
                              ? `Purpose: ${m.purpose?.replace("_", " ") ?? "practice"}`
                              : `Adjustment (${m.adjustmentReason ?? "count"})`}
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">
                          {m.receivedBy || m.takenBy || "Store keeper"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
