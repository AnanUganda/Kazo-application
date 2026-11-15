"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  recordAssessment,
  type AssessmentState,
} from "@/app/(app)/assessments/actions";

const initial: AssessmentState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : "Record assessment"}
    </button>
  );
}

export function AssessmentForm({
  studentId,
  modules,
  today,
}: {
  studentId: string;
  modules: { id: string; title: string; semester: number }[];
  today: string;
}) {
  const [state, action] = useActionState(recordAssessment, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const v = state.ok ? undefined : state.values;

  return (
    <form ref={ref} action={action} className="space-y-4">
      <input type="hidden" name="studentId" value={studentId} />
      {state.error && (
        <p role="alert" className="alert-error">
          {state.error}
        </p>
      )}
      {state.ok && <p className="alert-success">Assessment recorded.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="as-topic" className="field-label">
            Practical module
          </label>
          <select
            id="as-topic"
            name="topicId"
            required
            defaultValue={v?.topicId ?? ""}
            className="field-input"
          >
            <option value="" disabled>
              Choose a module
            </option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                S{m.semester} · {m.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="as-date" className="field-label">
            Date
          </label>
          <input
            id="as-date"
            name="date"
            type="date"
            required
            defaultValue={v?.date ?? today}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="as-score" className="field-label">
            Score out of 100{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="as-score"
            name="score"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            defaultValue={v?.score}
            className="field-input"
          />
        </div>
      </div>

      <fieldset>
        <legend className="field-label">Result</legend>
        <div className="flex gap-2">
          {(
            [
              ["pass", "Pass"],
              ["redo", "Redo"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="result"
                value={value}
                required
                defaultChecked={v?.result === value}
                className="peer sr-only"
              />
              <span className="chip-choice">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="as-notes" className="field-label">
          Notes{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="as-notes"
          name="notes"
          rows={2}
          placeholder="e.g. Undercut on the vertical run"
          defaultValue={v?.notes}
          className="field-input"
        />
      </div>

      <Submit />
    </form>
  );
}
