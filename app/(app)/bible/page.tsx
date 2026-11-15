import Link from "next/link";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { BookOpen, CalendarCheck, Plus, Users } from "lucide-react";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { lessonAbsences, lessonLogs, students } from "@/lib/db/schema";
import { getActiveIntake } from "@/lib/intake";
import { daysSince, displayFirstName, formatDate, todayKampala } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusTag } from "@/components/status-tag";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bible class — Kazo Technical School" };

export default async function BibleHomePage() {
  const me = await requireRole("bible_teacher", "admin");
  const intake = await getActiveIntake();
  const db = getDb();
  const today = todayKampala();

  const classes = intake
    ? await db
        .select()
        .from(lessonLogs)
        .where(
          and(
            eq(lessonLogs.intakeId, intake.id),
            eq(lessonLogs.session, "bible"),
            isNull(lessonLogs.archivedAt),
          ),
        )
        .orderBy(desc(lessonLogs.date))
    : [];

  const absentRows = classes.length
    ? await db
        .select({ logId: lessonAbsences.lessonLogId, n: count() })
        .from(lessonAbsences)
        .where(
          inArray(
            lessonAbsences.lessonLogId,
            classes.map((c) => c.id),
          ),
        )
        .groupBy(lessonAbsences.lessonLogId)
    : [];
  const absentByLog = new Map(absentRows.map((r) => [r.logId, Number(r.n)]));

  const rosterSize = intake
    ? Number(
        (
          await db
            .select({ n: count() })
            .from(students)
            .where(
              and(
                eq(students.intakeId, intake.id),
                eq(students.status, "active"),
                isNull(students.archivedAt),
              ),
            )
        )[0]?.n ?? 0,
      )
    : 0;

  const todayClass = classes.find((c) => c.date === today);
  const thisMonth = classes.filter((c) => c.date.slice(0, 7) === today.slice(0, 7));
  const totalAbsences = classes.reduce(
    (sum, c) => sum + (absentByLog.get(c.id) ?? 0),
    0,
  );
  const seats = classes.length * rosterSize;
  const attendanceRate =
    seats > 0 ? Math.round(((seats - totalAbsences) / seats) * 100) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Morning Bible class"
        title={`Welcome, ${displayFirstName(me.fullName)}`}
        subtitle={
          intake
            ? `${intake.name} · every morning, one hour`
            : "No active intake yet"
        }
        actions={
          <Button asChild>
            <Link href={todayClass ? `/lessons/${todayClass.id}/edit` : "/bible/log"}>
              {todayClass ? (
                "Edit today's class"
              ) : (
                <>
                  <Plus aria-hidden /> Log today&apos;s class
                </>
              )}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            Today <CalendarCheck className="size-4" aria-hidden />
          </div>
          <p className="mt-2 text-xl font-bold tracking-tight">
            {todayClass ? "Logged" : "Not logged yet"}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {todayClass?.topic ?? formatDate(today)}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            Classes this month <BookOpen className="size-4" aria-hidden />
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums tracking-tight">
            {thisMonth.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {classes.length} this intake
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            Attendance <Users className="size-4" aria-hidden />
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums tracking-tight">
            {attendanceRate === null ? "—" : `${attendanceRate}%`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {rosterSize} students on the roll
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent classes</CardTitle>
          <CardDescription>You can edit a class for 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No classes logged yet. Log today&apos;s class to start the record.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {classes.slice(0, 12).map((c) => {
                const absent = absentByLog.get(c.id) ?? 0;
                const editable =
                  me.role === "admin" ||
                  (c.teacherId === me.id && daysSince(c.createdAt) < 7);
                return (
                  <li key={c.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {c.topic ?? "Bible class"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(c.date)}
                      </div>
                    </div>
                    <StatusTag tone={absent ? "warning" : "success"}>
                      {absent ? `${absent} absent` : "All present"}
                    </StatusTag>
                    {editable && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/lessons/${c.id}/edit`}>Edit</Link>
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
