"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "./actions";

type TopicLite = { id: string; title: string; semester: number; type: string };
type StudentLite = { id: string; fullName: string };

export type LessonLogInitial = {
  logId?: string;
  date?: string;
  session?: "morning" | "afternoon";
  notes?: string;
  progress?: Record<string, "started" | "completed">;
  absentIds?: string[];
  issue?: { description: string; isMachine: boolean; machineLabel?: string | null };
};

const initialState: ActionState = { ok: false };

function todayISO() {
  return new Date().toLocaleDateString("en-CA");
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function LessonLogForm({
  action,
  topics,
  students,
  initial,
  submitLabel = "Save lesson log",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  topics: TopicLite[];
  students: StudentLite[];
  initial?: LessonLogInitial;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const v = state.values ?? initial;
  const progress = v?.progress ?? {};
  const absentSet = new Set(v?.absentIds ?? []);

  return (
    <form action={formAction} className="space-y-6">
      {initial?.logId && <input type="hidden" name="logId" value={initial.logId} />}

      {state.error && (
        <p role="alert" className="alert-error">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="alert-success">
          Lesson log saved.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="field-label">Date</label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={v?.date ?? todayISO()}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="session" className="field-label">Session</label>
          <select id="session" name="session" defaultValue={v?.session ?? "morning"} className="field-input">
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
          </select>
        </div>
      </div>

      {/* Topics */}
      <div>
        <h3 className="section-title mb-2">
          Topics covered
        </h3>
        {topics.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No syllabus topics yet. Ask an admin to build the plan.
          </p>
        ) : (
          <div className="space-y-2">
            {[...new Set(topics.map((t) => t.semester))].map((sem, idx) => {
              const list = topics.filter((t) => t.semester === sem);
              const touched = list.filter((t) => progress[t.id]).length;
              return (
                <details
                  key={sem}
                  open={idx === 0 || touched > 0}
                  className="group rounded-xl border"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
                    Semester {sem}
                    <span className="text-xs font-medium text-muted-foreground">
                      {list.length} modules
                      <span className="ml-2 inline-block transition-transform group-open:rotate-90">
                        ›
                      </span>
                    </span>
                  </summary>
                  <ul className="divide-y border-t">
                    {list.map((t) => (
                      <li
                        key={t.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:flex-nowrap sm:gap-3"
                      >
                        <label
                          htmlFor={`topic_${t.id}`}
                          className="min-w-0 flex-1 text-sm"
                        >
                          {t.title}
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {t.type === "theory" ? "Theory" : "Practical"}
                          </span>
                        </label>
                        <select
                          id={`topic_${t.id}`}
                          name={`topic_${t.id}`}
                          defaultValue={progress[t.id] ?? "none"}
                          className="field-input w-full sm:w-40"
                        >
                          <option value="none">Not covered</option>
                          <option value="started">Started</option>
                          <option value="completed">Completed</option>
                        </select>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="field-label">Notes</label>
        <textarea id="notes" name="notes" rows={2} defaultValue={v?.notes} className="field-input" />
      </div>

      {/* Attendance */}
      <div>
        <h3 className="section-title mb-1">Attendance</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Tap anyone who was absent.
        </p>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active students in this intake.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {students.map((s) => (
              <label key={s.id} className="cursor-pointer">
                <input
                  type="checkbox"
                  name={`absent_${s.id}`}
                  defaultChecked={absentSet.has(s.id)}
                  className="peer sr-only"
                />
                <span className="chip-toggle">
                  {s.fullName}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Issue */}
      <fieldset className="rounded-xl border p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">
          Report an issue (optional)
        </legend>
        <div className="space-y-3">
          <textarea
            name="issueDescription"
            rows={2}
            placeholder="What went wrong?"
            defaultValue={v?.issue?.description}
            className="field-input"
          />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="issueMachine"
              defaultChecked={v?.issue?.isMachine}
              className="size-5 rounded accent-[hsl(var(--primary))]"
            />
            Machine issue (notifies the store keeper)
          </label>
          <input
            name="issueMachineLabel"
            placeholder="Machine / booth (e.g. KTS-WM-07)"
            defaultValue={v?.issue?.machineLabel ?? ""}
            className="field-input"
          />
        </div>
      </fieldset>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
