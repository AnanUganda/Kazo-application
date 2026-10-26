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
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
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
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">
          Topics covered
        </h3>
        {topics.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No syllabus topics yet. Ask an admin to build the plan.
          </p>
        ) : (
          <div className="space-y-2">
            {topics.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-3">
                <div className="min-w-0 flex-1 text-sm">
                  <span className="text-neutral-800">{t.title}</span>
                  <span className="ml-1 text-xs text-neutral-500">
                    (S{t.semester} · {t.type === "theory" ? "Theory" : "Practical"})
                  </span>
                </div>
                <select
                  name={`topic_${t.id}`}
                  defaultValue={progress[t.id] ?? "none"}
                  className="field-input w-full py-1.5 sm:w-36"
                >
                  <option value="none">—</option>
                  <option value="started">Started</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            ))}
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
        <h3 className="mb-1 text-sm font-semibold text-neutral-900">Attendance</h3>
        <p className="mb-2 text-xs text-neutral-500">
          Everyone is present by default. Tap anyone who was absent.
        </p>
        {students.length === 0 ? (
          <p className="text-sm text-neutral-500">No active students in this intake.</p>
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
                <span className="inline-block rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 peer-checked:border-red-200 peer-checked:bg-red-50 peer-checked:text-red-700">
                  {s.fullName}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Issue */}
      <fieldset className="rounded-xl border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-semibold text-neutral-700">
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
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="issueMachine"
              defaultChecked={v?.issue?.isMachine}
              className="h-4 w-4 rounded border-neutral-300"
            />
            This is a machine issue (sends a fault report to the store keeper)
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
