import Link from "next/link";
import type { EquipmentStatus } from "@/lib/db/schema";
import type {
  EquipmentWithDetails,
  StudentRosterOption,
  UnlinkedLessonFault,
} from "@/lib/inventory-data";
import { formatDate, formatUGX, todayKampala } from "@/lib/format";
import {
  AddEquipmentForm,
  EditEquipmentForm,
  LinkLessonIssueForm,
  ReportFaultForm,
  ResolveFaultForm,
} from "./EquipmentControls";

export const EQUIPMENT_STATUS_LABEL: Record<EquipmentStatus, string> = {
  working: "Working",
  needs_repair: "Needs repair",
  out_of_service: "Out of service",
};

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  const styles: Record<EquipmentStatus, string> = {
    working: "border-emerald-200 bg-emerald-50 text-emerald-700",
    needs_repair: "border-amber-200 bg-amber-50 text-amber-800",
    out_of_service: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {status !== "working" && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            status === "needs_repair" ? "bg-amber-500" : "bg-red-600"
          }`}
          aria-hidden
        />
      )}
      {EQUIPMENT_STATUS_LABEL[status]}
    </span>
  );
}

export function EquipmentView({
  equipmentList,
  unlinkedLessonFaults,
  studentOptions,
  allBooths,
  unassignedBooths,
  actorName,
  isAdmin,
  q = "",
  filter = "",
}: {
  equipmentList: EquipmentWithDetails[];
  unlinkedLessonFaults: UnlinkedLessonFault[];
  studentOptions: StudentRosterOption[];
  allBooths: string[];
  unassignedBooths: string[];
  actorName: string;
  isAdmin: boolean;
  q?: string;
  filter?: string;
}) {
  const today = todayKampala();
  const query = q.trim().toLowerCase();

  const filtered = equipmentList.filter(({ item, assignedStudentName }) => {
    if (query) {
      const hay = [
        item.assetCode,
        item.type,
        item.makeModel ?? "",
        item.booth ?? "",
        assignedStudentName ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(query)) return false;
    }

    if (filter === "broken") {
      return item.status === "needs_repair" || item.status === "out_of_service";
    }
    if (filter === "needs_repair") return item.status === "needs_repair";
    if (filter === "out_of_service") return item.status === "out_of_service";
    if (filter === "working") return item.status === "working";
    if (filter === "unassigned") return !item.booth;
    return true;
  });

  const brokenCount = equipmentList.filter(
    (e) => e.item.status !== "working",
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Equipment register &amp; faults
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Asset register, booth &amp; student assignments (linked two-way with
            student profiles), and fault logs from teacher lesson reports.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {brokenCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
              {brokenCount} needing repair / out of service
            </span>
          )}
          {unassignedBooths.length > 0 && (
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-600">
              {unassignedBooths.length} unassigned booth
              {unassignedBooths.length === 1 ? "" : "s"}
            </span>
          )}
          {isAdmin && (
            <>
              <a
                href="/admin/export/equipment"
                download
                className="btn-secondary py-2"
              >
                Export equipment CSV
              </a>
              <a
                href="/admin/export/faults"
                download
                className="btn-secondary py-2"
              >
                Export faults CSV
              </a>
            </>
          )}
        </div>
      </header>

      {/* Unlinked lesson-log machine fault reports queue */}
      {unlinkedLessonFaults.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-amber-900">
              Lesson-log machine fault reports to link (
              {unlinkedLessonFaults.length})
            </h2>
            <p className="text-xs text-amber-800">
              These machine issues were reported in teacher lesson logs. Link
              each report to its asset in the equipment register.
            </p>
          </div>
          <div className="space-y-2">
            {unlinkedLessonFaults.map((uf) => (
              <div
                key={uf.lessonIssueId}
                className="rounded-xl border border-amber-200 bg-white p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-neutral-900">
                    {uf.machineLabel ? `${uf.machineLabel}: ` : ""}
                    {uf.problem}
                  </div>
                  <span className="text-neutral-500">
                    {formatDate(uf.date)} · Reported by {uf.reportedBy}
                  </span>
                </div>
                <LinkLessonIssueForm
                  lessonIssueId={uf.lessonIssueId}
                  equipmentOptions={equipmentList.map((e) => ({
                    id: e.item.id,
                    assetCode: e.item.assetCode,
                    type: e.item.type,
                  }))}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search & filter bar */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="eq-q" className="field-label">
            Search asset ID, type, model, or booth
          </label>
          <input
            id="eq-q"
            name="q"
            defaultValue={q}
            placeholder="e.g. KTS-WM-03, MIG, Booth 1…"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="eq-filter" className="field-label">
            Filter
          </label>
          <select
            id="eq-filter"
            name="filter"
            defaultValue={filter}
            className="field-input"
          >
            <option value="">All equipment</option>
            <option value="broken">Broken (needs repair / out of service)</option>
            <option value="needs_repair">Needs repair only</option>
            <option value="out_of_service">Out of service only</option>
            <option value="working">Working only</option>
            <option value="unassigned">Unassigned to a booth</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Filter
        </button>
      </form>

      {/* Unassigned booths overview */}
      {(filter === "unassigned" || unassignedBooths.length > 0) && (
        <section className="card space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Workshop booths without a working machine ({unassignedBooths.length})
          </h2>
          {unassignedBooths.length === 0 ? (
            <p className="text-xs text-emerald-700">
              All workshop booths currently have a working machine assigned.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unassignedBooths.map((booth) => (
                <span
                  key={booth}
                  className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700"
                >
                  {booth}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Register new equipment */}
        <section className="lg:col-span-1">
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Register equipment
            </h2>
            <AddEquipmentForm
              studentOptions={studentOptions}
              allBooths={allBooths}
            />
          </div>
        </section>

        {/* Equipment list */}
        <section className="space-y-4 lg:col-span-2">
          {filtered.length === 0 ? (
            <div className="card text-sm text-neutral-500">
              No equipment items match the current filter.
            </div>
          ) : (
            filtered.map(
              ({ item, assignedStudentName, faults, openFaultCount }) => (
                <div
                  key={item.id}
                  className={`card space-y-4 ${
                    item.status !== "working" ? "border-amber-300" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">
                          {item.assetCode}
                        </span>
                        <h3 className="font-semibold text-neutral-900">
                          {item.type}
                        </h3>
                        <EquipmentStatusBadge status={item.status} />
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {item.makeModel ? `${item.makeModel} · ` : ""}
                        Booth:{" "}
                        <span className="font-medium text-neutral-800">
                          {item.booth || "Unassigned"}
                        </span>{" "}
                        · Student:{" "}
                        {item.assignedStudentId && assignedStudentName ? (
                          isAdmin ? (
                            <Link
                              href={`/admin/students/${item.assignedStudentId}`}
                              className="font-semibold text-brand hover:underline"
                            >
                              {assignedStudentName}
                            </Link>
                          ) : (
                            <span className="font-medium text-neutral-800">
                              {assignedStudentName}
                            </span>
                          )
                        ) : (
                          <span className="text-neutral-500">Unassigned</span>
                        )}
                      </div>
                    </div>

                    {openFaultCount > 0 && (
                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        {openFaultCount} open fault
                        {openFaultCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  {/* Actions: Update assignment/status + Report fault */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <EditEquipmentForm
                      item={item}
                      studentOptions={studentOptions}
                      allBooths={allBooths}
                    />
                    <ReportFaultForm
                      equipmentId={item.id}
                      assetCode={item.assetCode}
                      defaultDate={today}
                      defaultReportedBy={actorName}
                    />
                  </div>

                  {/* Fault log */}
                  <div className="space-y-2 border-t border-neutral-100 pt-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Fault log ({faults.length})
                    </div>
                    {faults.length === 0 ? (
                      <p className="text-xs text-neutral-500">
                        No faults logged for this asset.
                      </p>
                    ) : (
                      faults.map((f) => {
                        const isOpen = f.status === "open";
                        return (
                          <div
                            key={f.id}
                            className={`rounded-xl border p-3 text-xs ${
                              isOpen
                                ? "border-amber-200 bg-amber-50/40"
                                : "border-neutral-100 bg-neutral-50/60"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-semibold text-neutral-900">
                                {f.problem}
                                {f.lessonIssueId && (
                                  <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                                    From lesson log
                                  </span>
                                )}
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  isOpen
                                    ? "bg-amber-200/80 text-amber-900"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {isOpen ? "Open" : "Resolved"}
                              </span>
                            </div>
                            <div className="mt-1 text-neutral-500">
                              Reported {formatDate(f.reportedAt)} by{" "}
                              {f.reportedBy}
                            </div>

                            {!isOpen && (
                              <div className="mt-1.5 rounded-lg bg-white px-2.5 py-1.5 text-neutral-700 border border-neutral-100">
                                <span className="font-semibold text-emerald-800">
                                  Fix:
                                </span>{" "}
                                {f.fix}
                                {f.fixedAt
                                  ? ` · Fixed ${formatDate(f.fixedAt)}`
                                  : ""}
                                {f.cost !== null && f.cost !== undefined
                                  ? ` · Cost: ${formatUGX(f.cost)}`
                                  : ""}
                              </div>
                            )}

                            {isOpen && (
                              <ResolveFaultForm fault={f} defaultDate={today} />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ),
            )
          )}
        </section>
      </div>
    </div>
  );
}
