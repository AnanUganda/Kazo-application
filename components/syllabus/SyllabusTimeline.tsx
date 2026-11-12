import type { Intake, SyllabusTopic } from "@/lib/db/schema";
import { topicState, weekNumber, type TopicState } from "@/lib/track-status";
import { KTS_COURSE_POLICY } from "@/lib/syllabus-defaults";
import { todayKampala } from "@/lib/format";
import { StatusTag, type StatusTone } from "@/components/status-tag";

const SEMESTERS = [
  {
    n: 1,
    title: "Semester 1 (13 weeks · 455 hrs)",
    subtitle:
      "Modules 1–10 · Safety, SMAW, Scale & Maths, Basic Joints, Hand Tools, OFW, Brazing, GMAW & Fabrication",
  },
  {
    n: 2,
    title: "Semester 2 (13 weeks · 455 hrs)",
    subtitle:
      "Modules 11–18 · Electricity, Blueprints, AWS Symbols, GTAW (TIG), Metallurgy, Entrepreneurship & DIT Exams",
  },
];

const STATE_STYLE: Record<TopicState, { label: string; tone: StatusTone }> = {
  done: { label: "Done", tone: "success" },
  in_progress: { label: "In progress", tone: "info" },
  overdue: { label: "Overdue", tone: "danger" },
  upcoming: { label: "Upcoming", tone: "neutral" },
};

function weeksBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.max(1, Math.ceil((b - a) / (7 * 86_400_000)));
}

function Bar({ label, pct, tone }: { label: string; pct: number; tone: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct * 100)));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{clamped}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${tone}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export function SyllabusTimeline({
  intake,
  topics,
  completed,
  started,
}: {
  intake: Intake;
  topics: SyllabusTopic[];
  completed: Set<string>;
  started: Set<string>;
}) {
  const today = todayKampala();
  const weekBySemester: Record<number, number | null> = {
    1: weekNumber(intake.semester1Start, today),
    2: weekNumber(intake.semester2Start, today),
  };
  const bounds: Record<number, { start: string; end: string }> = {
    1: { start: intake.semester1Start, end: intake.semester1End },
    2: { start: intake.semester2Start, end: intake.semester2End },
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-2 border bg-muted/70 p-4 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-foreground">
            {KTS_COURSE_POLICY.courseName}
          </span>
          <span className="rounded-full bg-background px-2.5 py-0.5 font-medium text-foreground border border">
            {KTS_COURSE_POLICY.duration} · Max {KTS_COURSE_POLICY.classSizeLimit}{" "}
            students
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
          <span>Schedule: {KTS_COURSE_POLICY.schedule}</span>
          <span>
            Graduation: ≥{KTS_COURSE_POLICY.attendanceRequirementPct}%
            attendance &amp; ≥{KTS_COURSE_POLICY.passMarkPct}% theory/practical
          </span>
          <span>Certification: {KTS_COURSE_POLICY.certification}</span>
        </div>
      </div>

      {SEMESTERS.map((sem) => {
        const semTopics = topics.filter((t) => t.semester === sem.n);
        const total = semTopics.length;
        const doneCount = semTopics.filter((t) => completed.has(t.id)).length;
        const currentWeek = weekBySemester[sem.n];
        const totalWeeks = weeksBetween(bounds[sem.n].start, bounds[sem.n].end);
        const elapsed = currentWeek === null ? 0 : currentWeek / totalWeeks;

        return (
          <section key={sem.n} className="card">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                {sem.title}
                <span className="ml-2 font-normal text-muted-foreground">
                  {sem.subtitle}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {currentWeek === null
                  ? "Not started yet"
                  : `Week ${currentWeek} of ${totalWeeks}`}
              </p>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Bar
                label={`Topics complete (${doneCount}/${total})`}
                pct={total ? doneCount / total : 0}
                tone="bg-brand"
              />
              <Bar label="Semester elapsed" pct={elapsed} tone="bg-muted-foreground" />
            </div>

            {total === 0 ? (
              <p className="text-sm text-muted-foreground">No topics in this semester.</p>
            ) : (
              <ul className="divide-y divide-border">
                {semTopics.map((t) => {
                  const state = topicState(
                    t,
                    completed,
                    started,
                    currentWeek,
                  );
                  const style = STATE_STYLE[state];
                  return (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">
                          {t.title}
                        </div>
                        {t.description && (
                          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {t.description}
                          </div>
                        )}
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Week {t.targetWeek} ·{" "}
                          {t.type === "theory" ? "Theory" : "Practical"}
                        </div>
                      </div>
                      <StatusTag tone={style.tone} className="shrink-0">
                        {style.label}
                      </StatusTag>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
