import type { Intake, SyllabusTopic } from "@/lib/db/schema";
import { topicState, weekNumber, type TopicState } from "@/lib/track-status";
import { todayKampala } from "@/lib/format";

const SEMESTERS = [
  { n: 1, title: "Semester 1", subtitle: "Arc welding fundamentals" },
  { n: 2, title: "Semester 2", subtitle: "Fabrication & drawings" },
];

const STATE_STYLE: Record<TopicState, { label: string; cls: string }> = {
  done: { label: "Done", cls: "bg-green-50 text-green-700" },
  in_progress: { label: "In progress", cls: "bg-blue-50 text-blue-700" },
  overdue: { label: "Overdue", cls: "bg-red-50 text-red-700" },
  upcoming: { label: "Upcoming", cls: "bg-neutral-100 text-neutral-500" },
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
      <div className="mb-1 flex justify-between text-xs text-neutral-500">
        <span>{label}</span>
        <span>{clamped}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
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
              <h3 className="text-sm font-semibold text-neutral-900">
                {sem.title}
                <span className="ml-2 font-normal text-neutral-400">
                  {sem.subtitle}
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
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
              <Bar label="Semester elapsed" pct={elapsed} tone="bg-neutral-400" />
            </div>

            {total === 0 ? (
              <p className="text-sm text-neutral-400">No topics in this semester.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
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
                        <div className="truncate text-sm font-medium text-neutral-800">
                          {t.title}
                        </div>
                        <div className="text-xs text-neutral-400">
                          Week {t.targetWeek} ·{" "}
                          {t.type === "theory" ? "Theory" : "Practical"}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.cls}`}
                      >
                        {style.label}
                      </span>
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
