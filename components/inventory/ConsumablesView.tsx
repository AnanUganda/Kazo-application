import type {
  ConsumableCategory,
  ConsumableUnit,
  StockAdjustmentReason,
  StockOutPurpose,
} from "@/lib/db/schema";
import type { ConsumableWithStock } from "@/lib/inventory-data";
import { formatDate, formatUGX, todayKampala } from "@/lib/format";
import { StatusTag } from "@/components/status-tag";
import {
  AddConsumableForm,
  EditConsumableForm,
  StockCountForm,
  StockInForm,
  StockOutForm,
} from "./ConsumablesControls";

export const CATEGORY_LABEL: Record<ConsumableCategory, string> = {
  electrodes: "Electrodes",
  discs: "Discs",
  steel: "Steel",
  gas: "Gas",
  other: "Other",
};

export const UNIT_LABEL: Record<ConsumableUnit, string> = {
  box: "boxes",
  piece: "pcs",
  kg: "kg",
  length: "lengths",
  cylinder: "cylinders",
};

const PURPOSE_LABEL: Record<StockOutPurpose, string> = {
  class_practice: "Class practice",
  workshop_job: "Workshop job",
  other: "Other",
};

const REASON_LABEL: Record<StockAdjustmentReason, string> = {
  damaged: "Damaged",
  lost: "Lost",
  miscounted: "Miscounted",
};

export function ConsumablesView({
  items,
  actorName,
  isAdmin = false,
  q = "",
  category = "",
  filter = "",
}: {
  items: ConsumableWithStock[];
  actorName: string;
  isAdmin?: boolean;
  q?: string;
  category?: string;
  filter?: string;
}) {
  const today = todayKampala();
  const query = q.trim().toLowerCase();

  const filtered = items.filter(({ consumable, lowStock }) => {
    if (query && !consumable.name.toLowerCase().includes(query)) return false;
    if (category && consumable.category !== category) return false;
    if (filter === "low" && !lowStock) return false;
    return true;
  });

  const lowStockTotal = items.filter((i) => i.lowStock).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">
            Consumables &amp; stock
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record stock in, out, or a count to change levels.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lowStockTotal > 0 && (
            <span className="inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              {lowStockTotal} low-stock item{lowStockTotal === 1 ? "" : "s"}
            </span>
          )}
          {isAdmin && (
            <>
              <a
                href="/admin/export/consumables"
                download
                className="btn-secondary py-2"
              >
                Export stock CSV
              </a>
              <a
                href="/admin/export/stock-movements"
                download
                className="btn-secondary py-2"
              >
                Export movements CSV
              </a>
            </>
          )}
        </div>
      </header>

      {/* Search & filter bar */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="inv-q" className="field-label">
            Search item
          </label>
          <input
            id="inv-q"
            name="q"
            defaultValue={q}
            placeholder="e.g. E6013, grinding disc, mild steel…"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="inv-cat" className="field-label">
            Category
          </label>
          <select
            id="inv-cat"
            name="category"
            defaultValue={category}
            className="field-input"
          >
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="inv-filter" className="field-label">
            Stock level
          </label>
          <select
            id="inv-filter"
            name="filter"
            defaultValue={filter}
            className="field-input"
          >
            <option value="">All items</option>
            <option value="low">Low stock only (≤ reorder level)</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Filter
        </button>
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Add new consumable */}
        <section className="lg:col-span-1">
          <div className="card space-y-4">
            <h2 className="section-title">
              Add consumable item
            </h2>
            <AddConsumableForm />
          </div>
        </section>

        {/* Consumables list */}
        <section className="space-y-4 lg:col-span-2">
          {filtered.length === 0 ? (
            <div className="card text-sm text-muted-foreground">
              No consumable items match the current filter.
            </div>
          ) : (
            filtered.map(({ consumable, stockLevel, lowStock, movements }) => (
              <div key={consumable.id} className="card space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {consumable.name}
                      </h3>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {CATEGORY_LABEL[consumable.category]}
                      </span>
                      {lowStock && (
                        <StatusTag tone="warning">
                          Low stock (≤ {consumable.reorderLevel})
                        </StatusTag>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Unit: {consumable.unit} · Reorder level:{" "}
                      {consumable.reorderLevel} {UNIT_LABEL[consumable.unit]}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">In stock</div>
                    <div
                      className={`text-xl font-bold ${
                        lowStock ? "text-amber-700 dark:text-amber-400" : "text-foreground"
                      }`}
                    >
                      {stockLevel}{" "}
                      <span className="text-xs font-medium text-muted-foreground">
                        {UNIT_LABEL[consumable.unit]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action drawers: Stock in, Stock out, Physical count, Edit */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <StockInForm
                    consumable={consumable}
                    defaultDate={today}
                    defaultReceivedBy={actorName}
                  />
                  <StockOutForm consumable={consumable} defaultDate={today} />
                  <StockCountForm
                    consumable={consumable}
                    currentStock={stockLevel}
                  />
                  <EditConsumableForm consumable={consumable} />
                </div>

                {/* Movement history */}
                <details className="rounded-xl border border bg-muted/50">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted-foreground">
                    Movement log ({movements.length})
                  </summary>
                  <div className="space-y-1.5 border-t border p-3 text-xs">
                    {movements.length === 0 ? (
                      <p className="text-muted-foreground">No stock movements yet.</p>
                    ) : (
                      movements.slice(0, 20).map((m) => {
                        const sign = m.quantityDelta > 0 ? "+" : "";
                        const badgeColor =
                          m.type === "in"
                            ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                            : m.type === "out"
                              ? "text-primary font-semibold"
                              : "text-amber-800 dark:text-amber-400 font-semibold";
                        return (
                          <div
                            key={m.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border bg-background px-2.5 py-2"
                          >
                            <div>
                              <span className={badgeColor}>
                                {m.type === "in"
                                  ? "Stock in"
                                  : m.type === "out"
                                    ? "Stock out"
                                    : "Count adjustment"}{" "}
                                · {sign}
                                {m.quantityDelta} {consumable.unit}
                              </span>
                              {m.type === "in" && (
                                <span className="ml-2 text-muted-foreground">
                                  Supplier: {m.supplier}
                                  {m.cost !== null ? ` · ${formatUGX(m.cost)}` : ""}
                                  {m.receivedBy ? ` · Rcvd by ${m.receivedBy}` : ""}
                                </span>
                              )}
                              {m.type === "out" && (
                                <span className="ml-2 text-muted-foreground">
                                  {m.purpose ? PURPOSE_LABEL[m.purpose] : ""}
                                  {m.takenBy ? ` · Taken by ${m.takenBy}` : ""}
                                </span>
                              )}
                              {m.type === "adjustment" && (
                                <span className="ml-2 text-muted-foreground">
                                  Counted: {m.physicalCount} · Reason:{" "}
                                  {m.adjustmentReason
                                    ? REASON_LABEL[m.adjustmentReason]
                                    : "—"}
                                  {m.notes ? ` (${m.notes})` : ""}
                                </span>
                              )}
                            </div>
                            <span className="text-muted-foreground">
                              {formatDate(m.date)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </details>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
