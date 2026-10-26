import Link from "next/link";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import {
  applications,
  lessonAbsences,
  lessonLogs,
  type ApplicationStage,
} from "@/lib/db/schema";
import { daysSince, formatDate, formatUGX, todayKampala } from "@/lib/format";
import { getActiveIntake } from "@/lib/intake";
import { loadConsumables, loadEquipmentRegister } from "@/lib/inventory-data";
import { loadStudentList } from "@/lib/students-data";
import { loadSyllabus } from "@/lib/syllabus-data";
import { KTS_COURSE_POLICY } from "@/lib/syllabus-defaults";
import { countOverdue, trackColor, weekNumber } from "@/lib/track-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Home — Kazo Technical School" };

const STAGES: { key: ApplicationStage; label: string }[] = [
  { key: "applied_unpaid", label: "Applied (unpaid)" },
  { key: "registered", label: "Registered" },
  { key: "test_interview", label: "Test & interview" },
  { key: "enrolled", label: "Enrolled" },
  { key: "not_accepted", label: "Not accepted" },
  { key: "withdrew", label: "Withdrew" },
];

export default async function AdminHome() {
  const admin = await requireRole("admin");
  const db = getDb();
  const today = todayKampala();
  const activeIntake = await getActiveIntake();

  const [allApps, consumablesList, equipmentData, syllabusData, studentListData] =
    await Promise.all([
      db
        .select()
        .from(applications)
        .where(isNull(applications.archivedAt))
        .orderBy(desc(applications.createdAt)),
      loadConsumables(),
      loadEquipmentRegister(),
      activeIntake
        ? loadSyllabus(activeIntake.id)
        : Promise.resolve({
            topics: [],
            completed: new Set<string>(),
            started: new Set<string>(),
          }),
      activeIntake
        ? loadStudentList(activeIntake.id, { includeFees: true })
        : Promise.resolve({ items: [], threshold: 85 }),
    ]);

  // 1. Syllabus status badge + overdue count
  const wk1 = activeIntake ? weekNumber(activeIntake.semester1Start, today) : null;
  const wk2 = activeIntake ? weekNumber(activeIntake.semester2Start, today) : null;
  const overdueCount = activeIntake
    ? countOverdue(syllabusData.topics, syllabusData.completed, {
        1: wk1,
        2: wk2,
      })
    : 0;
  const syllabusTone = trackColor(overdueCount);
  const completedTopicsCount = syllabusData.topics.filter((t) =>
    syllabusData.completed.has(t.id),
  ).length;

  // 2. Applications per stage + unpaid & stuck (14+ days)
  const stageCounts: Record<ApplicationStage, number> = {
    applied_unpaid: 0,
    registered: 0,
    test_interview: 0,
    enrolled: 0,
    not_accepted: 0,
    withdrew: 0,
  };
  let unpaidCount = 0;
  let stuckCount = 0;
  let unpaidAndStuckCount = 0;

  for (const a of allApps) {
    stageCounts[a.stage] = (stageCounts[a.stage] ?? 0) + 1;
    const isStuck = daysSince(a.stageEnteredAt) >= 14;
    if (a.stage === "applied_unpaid") {
      unpaidCount++;
      if (isStuck) unpaidAndStuckCount++;
    }
    if (
      isStuck &&
      a.stage !== "enrolled" &&
      a.stage !== "not_accepted" &&
      a.stage !== "withdrew"
    ) {
      stuckCount++;
    }
  }

  // 3. Total fees outstanding + top 5 balances (active intake roster)
  const activeRoster = studentListData.items.filter(
    (i) => i.student.status !== "dropped_out",
  );
  const studentsOwing = activeRoster
    .filter((i) => (i.fees?.balance ?? 0) > 0)
    .sort((a, b) => (b.fees?.balance ?? 0) - (a.fees?.balance ?? 0));
  const totalFeesOutstanding = studentsOwing.reduce(
    (sum, i) => sum + (i.fees?.balance ?? 0),
    0,
  );
  const top5Balances = studentsOwing.slice(0, 5);

  // 4. Absentees this week + students under threshold
  const sevenDaysAgo = new Date(
    new Date(`${today}T00:00:00Z`).getTime() - 6 * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);

  const recentAbsenceRows = activeIntake
    ? await db
        .select({
          studentId: lessonAbsences.studentId,
          date: lessonLogs.date,
        })
        .from(lessonAbsences)
        .innerJoin(lessonLogs, eq(lessonAbsences.lessonLogId, lessonLogs.id))
        .where(
          and(
            eq(lessonLogs.intakeId, activeIntake.id),
            gte(lessonLogs.date, sevenDaysAgo),
            isNull(lessonAbsences.archivedAt),
            isNull(lessonLogs.archivedAt),
          ),
        )
    : [];
  const absenteesThisWeekCount = new Set(
    recentAbsenceRows.map((r) => r.studentId),
  ).size;
  const studentsUnderThreshold = activeRoster.filter(
    (i) => i.attendance.belowThreshold,
  );

  // 5. Low-stock items + equipment needing repair
  const lowStockItems = consumablesList.filter((c) => c.lowStock);
  const equipmentNeedingRepair = equipmentData.equipmentList.filter(
    (e) =>
      e.item.status === "needs_repair" ||
      e.item.status === "out_of_service" ||
      e.openFaultCount > 0,
  );

  const badgeToneClass =
    syllabusTone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : syllabusTone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-700";

  const badgeLabel =
    syllabusTone === "green"
      ? "On track"
      : syllabusTone === "amber"
        ? "Slightly behind"
        : "Behind schedule";

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Administrator Overview · {KTS_COURSE_POLICY.courseName}
          </p>
          <h1 className="mt-1 text-xl font-bold text-neutral-900">
            Welcome, {admin.fullName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {activeIntake
              ? `Active intake: ${activeIntake.name} (${formatDate(activeIntake.startDate)} – ${formatDate(activeIntake.endDate)}).`
              : "No active intake set."}{" "}
            Every number below opens its filtered list.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/applications" className="btn-secondary py-2">
            Applications board
          </Link>
          <Link href="/admin/students" className="btn-primary py-2">
            Students &amp; fees
          </Link>
        </div>
      </header>

      {/* Top 5 KPI cards — every number links to its filtered list */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* 1. Syllabus status */}
        <Link
          href="/admin/syllabus"
          className="card group block transition hover:border-brand"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Syllabus Track
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeToneClass}`}
            >
              {badgeLabel}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-neutral-900">
            {overdueCount} overdue
          </p>
          <p className="mt-1 text-xs text-neutral-500 group-hover:text-brand">
            {completedTopicsCount}/{syllabusData.topics.length} modules done →
          </p>
        </Link>

        {/* 2. Applications */}
        <Link
          href={
            unpaidAndStuckCount > 0
              ? "/admin/applications?stage=applied_unpaid&stuck=1"
              : "/admin/applications"
          }
          className="card group block transition hover:border-brand"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Applications
            </span>
            {stuckCount > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                {stuckCount} stuck 14d+
              </span>
            )}
          </div>
          <p className="mt-3 text-2xl font-bold text-neutral-900">
            {allApps.length}
          </p>
          <p className="mt-1 text-xs text-neutral-500 group-hover:text-brand">
            {unpaidCount} unpaid · {unpaidAndStuckCount} unpaid &amp; stuck →
          </p>
        </Link>

        {/* 3. Total fees outstanding */}
        <Link
          href="/admin/students?filter=owing"
          className="card group block transition hover:border-brand"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Fees Outstanding
          </span>
          <p className="mt-3 text-2xl font-bold text-amber-700">
            {formatUGX(totalFeesOutstanding)}
          </p>
          <p className="mt-1 text-xs text-neutral-500 group-hover:text-brand">
            {studentsOwing.length} student{studentsOwing.length === 1 ? "" : "s"} owing balance →
          </p>
        </Link>

        {/* 4. Attendance */}
        <Link
          href="/admin/students?filter=under_threshold"
          className="card group block transition hover:border-brand"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Below {studentListData.threshold}% Attendance
            </span>
            {studentsUnderThreshold.length > 0 && (
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                Red flag
              </span>
            )}
          </div>
          <p className="mt-3 text-2xl font-bold text-neutral-900">
            {studentsUnderThreshold.length}
          </p>
          <p className="mt-1 text-xs text-neutral-500 group-hover:text-brand">
            {absenteesThisWeekCount} absentee{absenteesThisWeekCount === 1 ? "" : "s"} this week →
          </p>
        </Link>

        {/* 5. Store & Equipment */}
        <Link
          href={
            lowStockItems.length > 0
              ? "/admin/inventory?filter=low"
              : "/admin/equipment?filter=broken"
          }
          className="card group block transition hover:border-brand"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Workshop &amp; Store
          </span>
          <p className="mt-3 text-2xl font-bold text-neutral-900">
            {lowStockItems.length} low · {equipmentNeedingRepair.length} repair
          </p>
          <p className="mt-1 text-xs text-neutral-500 group-hover:text-brand">
            Open inventory &amp; equipment alerts →
          </p>
        </Link>
      </div>

      {/* Main 2-column summary panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Applications per stage + unpaid & stuck */}
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Applications by Stage
              </h2>
              <p className="text-xs text-neutral-500">
                Click any stage count to open its filtered list.
              </p>
            </div>
            <a
              href="/admin/export/applications"
              download
              className="btn-secondary py-1.5 text-xs"
            >
              Export CSV
            </a>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {STAGES.map((s) => (
              <Link
                key={s.key}
                href={`/admin/applications?stage=${s.key}`}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 transition hover:border-brand hover:bg-white"
              >
                <div className="text-xl font-bold text-neutral-900">
                  {stageCounts[s.key] ?? 0}
                </div>
                <div className="mt-0.5 text-xs text-neutral-600">{s.label}</div>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900">
            <div className="space-x-3">
              <Link
                href="/admin/applications?stage=applied_unpaid"
                className="font-semibold underline-offset-2 hover:underline"
              >
                Unpaid applications: {unpaidCount}
              </Link>
              <span>·</span>
              <Link
                href="/admin/applications?stuck=1"
                className="font-semibold underline-offset-2 hover:underline"
              >
                Stuck 14+ days: {stuckCount}
              </Link>
              <span>·</span>
              <Link
                href="/admin/applications?stage=applied_unpaid&stuck=1"
                className="font-semibold underline-offset-2 hover:underline"
              >
                Unpaid &amp; stuck (14d+): {unpaidAndStuckCount}
              </Link>
            </div>
            <Link
              href="/admin/applications?stuck=1"
              className="font-semibold text-brand hover:underline"
            >
              Filter stuck →
            </Link>
          </div>
        </section>

        {/* Total fees outstanding + top 5 balances */}
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Top 5 Fee Balances Owing
              </h2>
              <p className="text-xs text-neutral-500">
                Total outstanding across active intake:{" "}
                <Link
                  href="/admin/students?filter=owing"
                  className="font-semibold text-amber-700 hover:underline"
                >
                  {formatUGX(totalFeesOutstanding)}
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/students?filter=owing"
                className="text-xs font-semibold text-brand hover:underline"
              >
                All {studentsOwing.length} owing →
              </Link>
              <a
                href="/admin/export/payments"
                download
                className="btn-secondary py-1.5 text-xs"
              >
                Payments CSV
              </a>
            </div>
          </div>

          {top5Balances.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No active students have an outstanding fee balance.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {top5Balances.map(({ student, fees }) => (
                <li
                  key={student.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="font-medium text-neutral-900 hover:text-brand hover:underline"
                    >
                      {student.fullName}
                    </Link>
                    {student.booth && (
                      <span className="ml-2 text-xs text-neutral-500">
                        ({student.booth})
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="font-semibold text-amber-700 hover:underline"
                    >
                      {formatUGX(fees?.balance ?? 0)}
                    </Link>
                    <div className="text-[11px] text-neutral-400">
                      Paid {formatUGX(fees?.paid ?? 0)} of{" "}
                      {formatUGX(fees?.totalDue ?? 0)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Absentees this week + students under threshold */}
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Attendance Watchlist
              </h2>
              <p className="text-xs text-neutral-500">
                <Link
                  href="/admin/lessons?week=current"
                  className="font-semibold text-neutral-800 hover:text-brand hover:underline"
                >
                  {absenteesThisWeekCount} absentee
                  {absenteesThisWeekCount === 1 ? "" : "s"} this week
                </Link>{" "}
                ·{" "}
                <Link
                  href="/admin/students?filter=under_threshold"
                  className="font-semibold text-red-700 hover:underline"
                >
                  {studentsUnderThreshold.length} below{" "}
                  {studentListData.threshold}% threshold
                </Link>
              </p>
            </div>
            <Link
              href="/admin/lessons?week=current"
              className="text-xs font-semibold text-brand hover:underline"
            >
              This week&apos;s logs →
            </Link>
          </div>

          {studentsUnderThreshold.length === 0 ? (
            <p className="text-sm text-neutral-500">
              All active students are meeting the ≥{studentListData.threshold}%
              KTS attendance requirement.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {studentsUnderThreshold.map(({ student, attendance }) => (
                <li
                  key={student.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div>
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="font-medium text-neutral-900 hover:text-brand hover:underline"
                    >
                      {student.fullName}
                    </Link>
                    {student.booth && (
                      <span className="ml-2 text-xs text-neutral-500">
                        ({student.booth})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">
                      {attendance.presentCount}/{attendance.sessionsHeld}{" "}
                      sessions
                    </span>
                    <Link
                      href="/admin/students?filter=under_threshold"
                      className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700"
                    >
                      {attendance.rate}%
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Low-stock items + equipment needing repair */}
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Low Stock &amp; Equipment Needing Repair
              </h2>
              <p className="text-xs text-neutral-500">
                <Link
                  href="/admin/inventory?filter=low"
                  className="font-semibold text-amber-700 hover:underline"
                >
                  {lowStockItems.length} low-stock item
                  {lowStockItems.length === 1 ? "" : "s"}
                </Link>{" "}
                ·{" "}
                <Link
                  href="/admin/equipment?filter=broken"
                  className="font-semibold text-red-700 hover:underline"
                >
                  {equipmentNeedingRepair.length} machine
                  {equipmentNeedingRepair.length === 1 ? "" : "s"} needing
                  repair
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-brand">
              <Link href="/admin/inventory?filter=low" className="hover:underline">
                Inventory →
              </Link>
              <Link
                href="/admin/equipment?filter=broken"
                className="hover:underline"
              >
                Equipment →
              </Link>
            </div>
          </div>

          {lowStockItems.length === 0 && equipmentNeedingRepair.length === 0 ? (
            <p className="text-sm text-neutral-500">
              All consumables are above reorder level and all machines are
              working.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              {lowStockItems.slice(0, 4).map(({ consumable, stockLevel }) => (
                <Link
                  key={consumable.id}
                  href="/admin/inventory?filter=low"
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 transition hover:border-amber-400"
                >
                  <div>
                    <span className="font-medium text-neutral-900">
                      {consumable.name}
                    </span>
                    <span className="ml-2 text-xs text-neutral-500">
                      (reorder ≤ {consumable.reorderLevel} {consumable.unit})
                    </span>
                  </div>
                  <span className="font-semibold text-amber-800">
                    {stockLevel} {consumable.unit}
                  </span>
                </Link>
              ))}
              {equipmentNeedingRepair
                .slice(0, 4)
                .map(({ item, openFaultCount }) => (
                  <Link
                    key={item.id}
                    href="/admin/equipment?filter=broken"
                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 transition hover:border-red-400"
                  >
                    <div>
                      <span className="font-medium text-neutral-900">
                        {item.assetCode} · {item.type}
                      </span>
                      {item.booth && (
                        <span className="ml-2 text-xs text-neutral-500">
                          ({item.booth})
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-red-700">
                      {item.status === "out_of_service"
                        ? "Out of service"
                        : "Needs repair"}{" "}
                      ({openFaultCount} open fault
                      {openFaultCount === 1 ? "" : "s"})
                    </span>
                  </Link>
                ))}
            </div>
          )}
        </section>
      </div>

      {/* Admin CSV Export Hub */}
      <section className="card space-y-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">
            CSV Exports (Admin Only)
          </h2>
          <p className="text-xs text-neutral-500">
            Download any school list as a UTF-8 CSV spreadsheet for board
            reporting, accounting, or monthly backups.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { slug: "students", label: "Students & Fee Balances" },
            { slug: "payments", label: "Payments Ledger" },
            { slug: "applications", label: "Applications" },
            { slug: "syllabus", label: "KTS 18-Module Syllabus" },
            { slug: "lessons", label: "Lesson Logs" },
            { slug: "consumables", label: "Consumables Stock" },
            { slug: "stock-movements", label: "Stock Movements" },
            { slug: "equipment", label: "Equipment Register" },
            { slug: "faults", label: "Equipment Faults" },
            { slug: "staff", label: "Staff Accounts" },
            { slug: "intakes", label: "Intakes" },
          ].map((exp) => (
            <a
              key={exp.slug}
              href={`/admin/export/${exp.slug}`}
              download
              className="btn-secondary py-1.5 text-xs"
            >
              ⬇ {exp.label} CSV
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
