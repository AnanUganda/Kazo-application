import Link from "next/link";
import { desc } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { intakes, type Intake } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import { CreateIntakeForm } from "./CreateIntakeForm";
import { closeIntake } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Intakes — Kazo Technical School" };

function IntakeDates({ intake }: { intake: Intake }) {
  const row = (label: string, from: string, to: string) => (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">
        {formatDate(from)} – {formatDate(to)}
      </span>
    </div>
  );
  return (
    <div className="mt-3 divide-y divide-border">
      {row("Intake", intake.startDate, intake.endDate)}
      {row("Semester 1", intake.semester1Start, intake.semester1End)}
      {row("Semester 2", intake.semester2Start, intake.semester2End)}
    </div>
  );
}

export default async function IntakesPage() {
  await requireRole("admin");

  const all = await getDb()
    .select()
    .from(intakes)
    .orderBy(desc(intakes.startDate));

  const active = all.find((i) => i.status === "active") ?? null;
  const archived = all.filter((i) => i.status === "archived");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Intakes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One intake is active at a time.
          </p>
        </div>
        <Link
          href="/admin/export/intakes"
          className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-xs font-medium hover:bg-[color:var(--color-surface-muted)]"
        >
          Export CSV
        </Link>
      </header>

      {/* Active intake */}
      {active ? (
        <section className="card border-primary/30">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="section-title">
                  {active.name}
                </h2>
                <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400 dark:bg-green-950">
                  Active
                </span>
              </div>
              <IntakeDates intake={active} />
            </div>
            <form action={closeIntake}>
              <input type="hidden" name="id" value={active.id} />
              <button type="submit" className="btn-secondary">
                Close intake
              </button>
            </form>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Closing can&apos;t be undone. Its records become read-only.
          </p>
        </section>
      ) : (
        <section className="card max-w-2xl">
          <h2 className="mb-1 section-title">
            Create a new intake
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            There is no active intake. Create one to begin.
          </p>
          <CreateIntakeForm />
        </section>
      )}

      {active && (
        <p className="text-sm text-muted-foreground">
          To start a new intake, close the current one first.
        </p>
      )}

      {/* Archived intakes */}
      <section className="space-y-3">
        <h2 className="section-title">
          Archived intakes
        </h2>
        {archived.length === 0 ? (
          <div className="card text-sm text-muted-foreground">
            No archived intakes yet.
          </div>
        ) : (
          archived.map((intake) => (
            <div key={intake.id} className="card">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">
                  {intake.name}
                </h3>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  Archived
                </span>
              </div>
              <IntakeDates intake={intake} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
