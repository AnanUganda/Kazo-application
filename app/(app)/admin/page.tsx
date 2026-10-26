import Link from "next/link";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import {
  AlertTriangle,
  Banknote,
  ClipboardList,
  Download,
  GraduationCap,
  Wrench,
} from "lucide-react";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import {
  applications,
  lessonAbsences,
  lessonLogs,
  type ApplicationStage,
} from "@/lib/db/schema";
import {
  daysSince,
  displayLastName,
  formatDate,
  formatUGX,
  todayKampala,
} from "@/lib/format";
import { getActiveIntake, intakeEvents } from "@/lib/intake";
import { loadConsumables, loadEquipmentRegister } from "@/lib/inventory-data";
import { loadStudentList } from "@/lib/students-data";
import { loadSyllabus } from "@/lib/syllabus-data";
import { KTS_COURSE_POLICY } from "@/lib/syllabus-defaults";
import { countOverdue, trackColor, weekNumber } from "@/lib/track-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatCard, type StatBadgeVariant } from "@/components/stat-card";
import { HomeCalendar } from "@/components/home-calendar";
import { AdminAppsChart } from "./AdminAppsChart";

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

  // Applications received per week, last 8 weeks (trend chart)
  const nowMs = new Date(`${today}T00:00:00Z`).getTime();
  const weekSeries = Array.from({ length: 8 }, (_, idx) => {
    const i = 7 - idx;
    const start = nowMs - i * 7 * 86_400_000;
    const end = start + 7 * 86_400_000;
    const count = allApps.filter((a) => {
      const t = new Date(a.createdAt).getTime();
      return t >= start && t < end;
    }).length;
    return { week: `W${idx + 1}`, count };
  });

  const syllabusVariant: StatBadgeVariant =
    syllabusTone === "green"
      ? "success"
      : syllabusTone === "amber"
        ? "warning"
        : "destructive";
  const badgeLabel =
    syllabusTone === "green"
      ? "On track"
      : syllabusTone === "amber"
        ? "Slightly behind"
        : "Behind schedule";

  const CSV_EXPORTS = [
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
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Administrator Overview · {KTS_COURSE_POLICY.courseName}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Welcome, {displayLastName(admin.fullName)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeIntake
              ? `Active intake: ${activeIntake.name} (${formatDate(activeIntake.startDate)} – ${formatDate(activeIntake.endDate)}).`
              : "No active intake set."}{" "}
            Every number below opens its filtered list.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/applications">Applications board</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/students">Students &amp; fees</Link>
          </Button>
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          href="/admin/syllabus"
          label="Syllabus track"
          icon={GraduationCap}
          value={`${overdueCount} overdue`}
          hint={`${completedTopicsCount}/${syllabusData.topics.length} modules done`}
          badge={{ variant: syllabusVariant, label: badgeLabel }}
        />
        <StatCard
          href={
            unpaidAndStuckCount > 0
              ? "/admin/applications?stage=applied_unpaid&stuck=1"
              : "/admin/applications"
          }
          label="Applications"
          icon={ClipboardList}
          value={String(allApps.length)}
          hint={`${unpaidCount} unpaid · ${unpaidAndStuckCount} unpaid & stuck`}
          badge={
            stuckCount > 0
              ? { variant: "warning", label: `${stuckCount} stuck 14d+` }
              : undefined
          }
        />
        <StatCard
          href="/admin/students?filter=owing"
          label="Fees outstanding"
          icon={Banknote}
          value={formatUGX(totalFeesOutstanding)}
          valueClassName="text-amber-700"
          hint={`${studentsOwing.length} student${studentsOwing.length === 1 ? "" : "s"} owing balance`}
        />
        <StatCard
          href="/admin/students?filter=under_threshold"
          label={`Below ${studentListData.threshold}% attendance`}
          icon={AlertTriangle}
          value={String(studentsUnderThreshold.length)}
          hint={`${absenteesThisWeekCount} absentee${absenteesThisWeekCount === 1 ? "" : "s"} this week`}
          badge={
            studentsUnderThreshold.length > 0
              ? { variant: "destructive", label: "Red flag" }
              : undefined
          }
        />
        <StatCard
          href={
            lowStockItems.length > 0
              ? "/admin/inventory?filter=low"
              : "/admin/equipment?filter=broken"
          }
          label="Workshop & store"
          icon={Wrench}
          value={`${lowStockItems.length} low · ${equipmentNeedingRepair.length} repair`}
          hint="Open inventory & equipment alerts"
        />
      </div>

      {/* Applications trend chart */}
      <Card>
        <CardHeader>
          <CardTitle>Applications received</CardTitle>
          <CardDescription>
            New applications per week over the last eight weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAppsChart data={weekSeries} />
        </CardContent>
      </Card>

      {/* Calendar */}
      <HomeCalendar events={intakeEvents(activeIntake)} />

      {/* Two-column summary panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Applications by stage */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Applications by stage</CardTitle>
              <CardDescription>
                Click any stage count to open its filtered list.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/export/applications" download>
                <Download /> CSV
              </a>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {STAGES.map((s) => (
                <Link
                  key={s.key}
                  href={`/admin/applications?stage=${s.key}`}
                  className="rounded-lg border bg-muted/40 p-3 transition hover:border-primary hover:bg-card"
                >
                  <div className="text-xl font-bold tabular-nums">
                    {stageCounts[s.key] ?? 0}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {s.label}
                  </div>
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900">
              <div className="space-x-3">
                <Link
                  href="/admin/applications?stage=applied_unpaid"
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  Unpaid: {unpaidCount}
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
                  Unpaid &amp; stuck: {unpaidAndStuckCount}
                </Link>
              </div>
              <Link
                href="/admin/applications?stuck=1"
                className="font-semibold text-primary hover:underline"
              >
                Filter stuck →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 fee balances */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Top 5 fee balances owing</CardTitle>
              <CardDescription>
                Total outstanding:{" "}
                <Link
                  href="/admin/students?filter=owing"
                  className="font-semibold text-amber-700 hover:underline"
                >
                  {formatUGX(totalFeesOutstanding)}
                </Link>
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/export/payments" download>
                <Download /> CSV
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            {top5Balances.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active students have an outstanding fee balance.
              </p>
            ) : (
              <ul className="space-y-4">
                {top5Balances.map(({ student, fees }) => {
                  const total = fees?.totalDue ?? 0;
                  const paid = fees?.paid ?? 0;
                  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                  return (
                    <li key={student.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="truncate font-medium hover:text-primary hover:underline"
                        >
                          {student.fullName}
                          {student.booth && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({student.booth})
                            </span>
                          )}
                        </Link>
                        <span className="shrink-0 font-semibold text-amber-700">
                          {formatUGX(fees?.balance ?? 0)}
                        </span>
                      </div>
                      <Progress value={pct} aria-label={`${student.fullName} fees paid`} />
                      <p className="text-[11px] text-muted-foreground">
                        Paid {formatUGX(paid)} of {formatUGX(total)} ({pct}%)
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Attendance watchlist */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance watchlist</CardTitle>
            <CardDescription>
              <Link
                href="/admin/lessons?week=current"
                className="font-semibold text-foreground hover:text-primary hover:underline"
              >
                {absenteesThisWeekCount} absentee
                {absenteesThisWeekCount === 1 ? "" : "s"} this week
              </Link>{" "}
              ·{" "}
              <Link
                href="/admin/students?filter=under_threshold"
                className="font-semibold text-red-700 hover:underline"
              >
                {studentsUnderThreshold.length} below {studentListData.threshold}%
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {studentsUnderThreshold.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All active students meet the ≥{studentListData.threshold}%
                attendance requirement.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {studentsUnderThreshold.map(({ student, attendance }) => (
                  <li
                    key={student.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {student.fullName}
                      {student.booth && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({student.booth})
                        </span>
                      )}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {attendance.presentCount}/{attendance.sessionsHeld}
                      </span>
                      <Badge variant="destructive">{attendance.rate}%</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Low stock & equipment */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Low stock &amp; repairs</CardTitle>
              <CardDescription>
                <Link
                  href="/admin/inventory?filter=low"
                  className="font-semibold text-amber-700 hover:underline"
                >
                  {lowStockItems.length} low-stock
                </Link>{" "}
                ·{" "}
                <Link
                  href="/admin/equipment?filter=broken"
                  className="font-semibold text-red-700 hover:underline"
                >
                  {equipmentNeedingRepair.length} needing repair
                </Link>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 && equipmentNeedingRepair.length === 0 ? (
              <p className="text-sm text-muted-foreground">
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
                    <span className="font-medium">
                      {consumable.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        (≤ {consumable.reorderLevel} {consumable.unit})
                      </span>
                    </span>
                    <span className="font-semibold text-amber-800">
                      {stockLevel} {consumable.unit}
                    </span>
                  </Link>
                ))}
                {equipmentNeedingRepair.slice(0, 4).map(({ item, openFaultCount }) => (
                  <Link
                    key={item.id}
                    href="/admin/equipment?filter=broken"
                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 transition hover:border-red-400"
                  >
                    <span className="font-medium">
                      {item.assetCode} · {item.type}
                      {item.booth && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({item.booth})
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-semibold text-red-700">
                      {item.status === "out_of_service"
                        ? "Out of service"
                        : "Needs repair"}{" "}
                      ({openFaultCount})
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CSV export hub */}
      <Card>
        <CardHeader>
          <CardTitle>CSV exports</CardTitle>
          <CardDescription>
            Download any school list as a UTF-8 CSV for board reporting,
            accounting, or monthly backups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {CSV_EXPORTS.map((exp) => (
              <Button key={exp.slug} variant="outline" size="sm" asChild>
                <a href={`/admin/export/${exp.slug}`} download>
                  <Download /> {exp.label}
                </a>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

