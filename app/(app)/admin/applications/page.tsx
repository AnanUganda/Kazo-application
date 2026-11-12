import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import {
  applications,
  type Application,
  type ApplicationStage,
} from "@/lib/db/schema";
import { daysSince, formatDate } from "@/lib/format";
import { StageActions } from "./StageActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Applications — Kazo Technical School" };

const COLUMNS: { key: ApplicationStage; title: string }[] = [
  { key: "applied_unpaid", title: "Applied (unpaid)" },
  { key: "registered", title: "Registered" },
  { key: "test_interview", title: "Test & interview" },
  { key: "enrolled", title: "Enrolled" },
];

const STAGE_LABEL: Record<ApplicationStage, string> = {
  applied_unpaid: "Applied (unpaid)",
  registered: "Registered",
  test_interview: "Test & interview",
  enrolled: "Enrolled",
  not_accepted: "Not accepted",
  withdrew: "Withdrew",
};

function ApplicationCard({ app }: { app: Application }) {
  const days = daysSince(app.stageEnteredAt);
  const stuck = days >= 14;
  return (
    <div className="card p-4">
      <div className="font-semibold text-neutral-900">{app.fullName}</div>
      <div className="text-sm text-neutral-500">{app.phone}</div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        <span>Applied {formatDate(app.createdAt)}</span>
        <span
          className={`inline-flex items-center gap-1 ${
            stuck ? "font-semibold text-amber-700 dark:text-amber-400" : ""
          }`}
        >
          {stuck && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
          {days} day{days === 1 ? "" : "s"} in stage
        </span>
      </div>
      <StageActions id={app.id} stage={app.stage} />
    </div>
  );
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; stuck?: string }>;
}) {
  await requireRole("admin");
  const { q = "", stage = "", stuck = "" } = await searchParams;

  const filters = [isNull(applications.archivedAt)];
  const query = q.trim();
  if (query) {
    filters.push(
      or(
        ilike(applications.fullName, `%${query}%`),
        ilike(applications.phone, `%${query}%`),
      )!,
    );
  }
  const validStage = COLUMNS.some((c) => c.key === stage) ||
    stage === "not_accepted" ||
    stage === "withdrew";
  if (validStage) {
    filters.push(eq(applications.stage, stage as ApplicationStage));
  }

  const allRows = await getDb()
    .select()
    .from(applications)
    .where(and(...filters))
    .orderBy(desc(applications.createdAt));

  const rows =
    stuck === "1"
      ? allRows.filter((r) => daysSince(r.stageEnteredAt) >= 14)
      : allRows;

  const byStage = (s: ApplicationStage) => rows.filter((r) => r.stage === s);
  const exits = rows.filter(
    (r) => r.stage === "not_accepted" || r.stage === "withdrew",
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Applications</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Moving to Registered confirms the registration fee.
          </p>
        </div>
        <a
          href="/admin/export/applications"
          download
          className="btn-secondary py-2"
        >
          Export CSV
        </a>
      </header>

      {/* Search & filter */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="q" className="field-label">
            Search name or phone
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="e.g. Amina or 0772…"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="stage" className="field-label">
            Stage
          </label>
          <select
            id="stage"
            name="stage"
            defaultValue={stage}
            className="field-input"
          >
            <option value="">All stages</option>
            {Object.entries(STAGE_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="stuck" className="field-label">
            Duration
          </label>
          <select
            id="stuck"
            name="stuck"
            defaultValue={stuck}
            className="field-input"
          >
            <option value="">Any duration</option>
            <option value="1">Stuck 14+ days only</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Apply
        </button>
      </form>

      {/* Board */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = byStage(col.key);
          return (
            <section key={col.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-700">
                  {col.title}
                </h2>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">
                  {items.length}
                </span>
              </div>
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-xs text-neutral-500">
                  None
                </p>
              ) : (
                items.map((app) => <ApplicationCard key={app.id} app={app} />)
              )}
            </section>
          );
        })}
      </div>

      {/* Exits */}
      <details className="rounded-2xl border border-neutral-200 bg-white">
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-neutral-700">
          Exits — not accepted & withdrew ({exits.length})
        </summary>
        <div className="space-y-2 border-t border-neutral-100 p-4">
          {exits.length === 0 ? (
            <p className="text-sm text-neutral-500">No exited applications.</p>
          ) : (
            exits.map((app) => (
              <div
                key={app.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2"
              >
                <div>
                  <span className="font-medium text-neutral-800">
                    {app.fullName}
                  </span>
                  <span className="ml-2 text-xs text-neutral-500">
                    {app.phone}
                  </span>
                  {app.stage === "withdrew" && app.withdrewReason && (
                    <span className="ml-2 text-xs text-neutral-500">
                      · {app.withdrewReason}
                    </span>
                  )}
                </div>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">
                  {STAGE_LABEL[app.stage]}
                </span>
              </div>
            ))
          )}
        </div>
      </details>
    </div>
  );
}
