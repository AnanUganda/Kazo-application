import { asc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { appSettings, feeTypes } from "@/lib/db/schema";
import { formatUGX } from "@/lib/format";
import {
  updateAttendanceThreshold,
  updateFeeAmount,
  restoreDefaultFeeTypes,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — Kazo Technical School" };

const semesterLabel = (n: number | null) =>
  n === 1 ? "Semester 1" : n === 2 ? "Semester 2" : "Any time";

export default async function SettingsPage() {
  await requireRole("admin");
  const db = getDb();

  const settingsRow = (
    await db.select().from(appSettings).where(eq(appSettings.id, "global")).limit(1)
  )[0];
  const threshold = settingsRow?.attendanceThreshold ?? 85;

  const fees = await db.select().from(feeTypes).orderBy(asc(feeTypes.sortOrder));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Fees and attendance threshold.
        </p>
      </header>

      {/* Attendance threshold */}
      <section className="card max-w-xl">
        <h2 className="text-sm font-semibold text-neutral-900">
          Attendance threshold
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Students below this attendance percentage are flagged.
        </p>
        <form
          action={updateAttendanceThreshold}
          className="mt-4 flex items-end gap-3"
        >
          <div>
            <label htmlFor="attendanceThreshold" className="field-label">
              Threshold (%)
            </label>
            <input
              id="attendanceThreshold"
              name="attendanceThreshold"
              type="number"
              min={1}
              max={100}
              defaultValue={threshold}
              required
              className="field-input w-32"
            />
          </div>
          <button type="submit" className="btn-primary">
            Save
          </button>
        </form>
      </section>

      {/* Fee amounts */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-neutral-900">Fee amounts</h2>
          {fees.length === 0 && (
            <form action={restoreDefaultFeeTypes}>
              <button type="submit" className="btn-secondary py-2">
                Load default fee items
              </button>
            </form>
          )}
        </div>

        {fees.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            No fee items yet. Load the defaults (Registration 35,000; Semester 1
            800,000; Semester 2 800,000; Industrial tour 35,000) to get started.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {fees.map((fee) => (
              <div
                key={fee.code}
                className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="font-medium text-neutral-900">{fee.name}</div>
                  <div className="text-xs text-neutral-500">
                    {semesterLabel(fee.appliesToSemester)} · current{" "}
                    {formatUGX(fee.defaultAmount)}
                  </div>
                </div>
                <form
                  action={updateFeeAmount}
                  className="flex items-end gap-2"
                >
                  <input type="hidden" name="code" value={fee.code} />
                  <div>
                    <label
                      htmlFor={`amount-${fee.code}`}
                      className="field-label"
                    >
                      Amount (UGX)
                    </label>
                    <input
                      id={`amount-${fee.code}`}
                      name="amount"
                      inputMode="numeric"
                      defaultValue={fee.defaultAmount}
                      className="field-input w-40 py-2"
                    />
                  </div>
                  <button type="submit" className="btn-secondary py-2">
                    Save
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
