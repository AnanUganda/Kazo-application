import Link from "next/link";
import type { Student } from "@/lib/db/schema";
import type { StudentListItem } from "@/lib/students-data";
import { formatUGX } from "@/lib/format";
import { StatusTag, type StatusTone } from "@/components/status-tag";

export const STUDENT_STATUS_LABEL: Record<Student["status"], string> = {
  active: "Active",
  suspended: "Suspended",
  dropped_out: "Dropped out",
};

export function StudentStatusBadge({ status }: { status: Student["status"] }) {
  const tone: StatusTone =
    status === "active"
      ? "success"
      : status === "suspended"
        ? "warning"
        : "neutral";
  return <StatusTag tone={tone}>{STUDENT_STATUS_LABEL[status]}</StatusTag>;
}

export function AttendanceBadge({
  rate,
  belowThreshold,
  threshold,
}: {
  rate: number | null;
  belowThreshold: boolean;
  threshold: number;
}) {
  if (rate === null) {
    return <span className="text-xs text-muted-foreground">No sessions yet</span>;
  }
  if (belowThreshold) {
    return (
      <span className="text-xs font-semibold text-red-700 dark:text-red-400">
        {rate}% · below {threshold}%
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-muted-foreground">{rate}%</span>
  );
}

export function StudentListView({
  intakeName,
  items,
  threshold,
  basePath,
  showFees,
  q = "",
  status = "",
  filter = "",
}: {
  intakeName: string;
  items: StudentListItem[];
  threshold: number;
  basePath: "/admin/students" | "/teacher/students";
  showFees: boolean;
  q?: string;
  status?: string;
  filter?: string;
}) {
  const query = q.trim().toLowerCase();
  const matchesQuery = (item: StudentListItem) => {
    if (!query) return true;
    const s = item.student;
    return (
      s.fullName.toLowerCase().includes(query) ||
      s.phone.toLowerCase().includes(query) ||
      (s.booth ?? "").toLowerCase().includes(query)
    );
  };

  const searched = items.filter(matchesQuery).filter((item) => {
    if (filter === "under_threshold") return item.attendance.belowThreshold;
    if (filter === "owing" && showFees) return (item.fees?.balance ?? 0) > 0;
    return true;
  });

  const mainItems = searched.filter((item) => {
    if (status === "active") return item.student.status === "active";
    if (status === "suspended") return item.student.status === "suspended";
    if (status === "dropped_out") return item.student.status === "dropped_out";
    // Default: active + suspended; dropped-out leaves the main list.
    return item.student.status !== "dropped_out";
  });

  const droppedOutItems = searched.filter(
    (item) => item.student.status === "dropped_out",
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{intakeName}</span> ·
            attendance threshold {threshold}%
          </p>
        </div>
        {showFees && (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/admin/export/students"
              download
              className="btn-secondary py-2"
            >
              Export students CSV
            </a>
            <a
              href="/admin/export/payments"
              download
              className="btn-secondary py-2"
            >
              Export fee ledger CSV
            </a>
          </div>
        )}
      </header>

      {/* Search & filter */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="student-q" className="field-label">
            Search name, phone, or booth
          </label>
          <input
            id="student-q"
            name="q"
            defaultValue={q}
            placeholder="e.g. Amina, 0772, or Booth 1"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="student-status" className="field-label">
            Status
          </label>
          <select
            id="student-status"
            name="status"
            defaultValue={status}
            className="field-input"
          >
            <option value="">Active &amp; suspended</option>
            <option value="active">Active only</option>
            <option value="suspended">Suspended only</option>
            <option value="dropped_out">Dropped out</option>
          </select>
        </div>
        <div>
          <label htmlFor="student-filter" className="field-label">
            Focus filter
          </label>
          <select
            id="student-filter"
            name="filter"
            defaultValue={filter}
            className="field-input"
          >
            <option value="">All students</option>
            <option value="under_threshold">
              Below {threshold}% attendance
            </option>
            {showFees && <option value="owing">With fee balance due</option>}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Filter
        </button>
      </form>

      {/* Main student list (responsive cards + desktop columns) */}
      {mainItems.length === 0 ? (
        <div className="card text-sm text-muted-foreground">
          No students match the current filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border bg-background shadow-sm">
          <div
            className={`hidden border-b border bg-muted/50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid md:items-center md:gap-4 ${
              showFees
                ? "md:grid-cols-[2fr_1fr_1.2fr_1.3fr_1fr]"
                : "md:grid-cols-[2fr_1fr_1.3fr_1fr]"
            }`}
          >
            <div>Student</div>
            <div>Booth</div>
            <div>Attendance</div>
            {showFees && <div>Fee balance</div>}
            <div className="text-right">Status</div>
          </div>

          <div className="divide-y divide-border">
            {mainItems.map(({ student, attendance, fees }) => (
              <Link
                key={student.id}
                href={`${basePath}/${student.id}`}
                className={`block px-4 py-4 transition hover:bg-muted/50 sm:px-5 md:grid md:items-center md:gap-4 ${
                  showFees
                    ? "md:grid-cols-[2fr_1fr_1.2fr_1.3fr_1fr]"
                    : "md:grid-cols-[2fr_1fr_1.3fr_1fr]"
                }`}
              >
                <div className="flex items-start justify-between gap-2 md:block">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-foreground">
                      {student.fullName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {student.phone}
                    </div>
                  </div>
                  <div className="md:hidden">
                    <StudentStatusBadge status={student.status} />
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-foreground md:mt-0 md:block">
                  <span className="text-xs text-muted-foreground md:hidden">
                    Booth:
                  </span>
                  <span className="font-medium text-foreground">
                    {student.booth || (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 md:mt-0 md:block">
                  <span className="text-xs text-muted-foreground md:hidden">
                    Attendance:
                  </span>
                  <AttendanceBadge
                    rate={attendance.rate}
                    belowThreshold={attendance.belowThreshold}
                    threshold={threshold}
                  />
                </div>

                {showFees && fees !== null && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 md:mt-0 md:block">
                    <span className="text-xs text-muted-foreground md:hidden">
                      Fee balance:
                    </span>
                    {fees.totalDue === 0 && fees.paid === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        Not billed yet
                      </span>
                    ) : fees.balance <= 0 ? (
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatUGX(0)} · Paid
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-foreground">
                        {formatUGX(fees.balance)}
                      </span>
                    )}
                  </div>
                )}

                <div className="hidden text-right md:block">
                  <StudentStatusBadge status={student.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Dropped-out records (kept outside the active list unless filtered directly) */}
      {status !== "dropped_out" && (
        <details className="rounded-2xl border border bg-background">
          <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-foreground">
            Dropped out — records kept ({droppedOutItems.length})
          </summary>
          <div className="space-y-2 border-t border p-4">
            {droppedOutItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No dropped-out students in this intake.
              </p>
            ) : (
              droppedOutItems.map(({ student, attendance, fees }) => (
                <Link
                  key={student.id}
                  href={`${basePath}/${student.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border px-3 py-2.5 transition hover:border-primary/40"
                >
                  <div>
                    <span className="font-medium text-foreground">
                      {student.fullName}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {student.phone}
                    </span>
                    {student.booth && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        · {student.booth}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AttendanceBadge
                      rate={attendance.rate}
                      belowThreshold={attendance.belowThreshold}
                      threshold={threshold}
                    />
                    {showFees && fees !== null && (
                      <span className="text-xs font-semibold text-foreground">
                        Balance {formatUGX(fees.balance)}
                      </span>
                    )}
                    <StudentStatusBadge status={student.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </details>
      )}
    </div>
  );
}
