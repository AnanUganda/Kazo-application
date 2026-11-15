"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { BibleClassState } from "./actions";

type StudentLite = { id: string; fullName: string };

export type BibleClassInitial = {
  logId?: string;
  date?: string;
  topic?: string;
  notes?: string;
  absentIds?: string[];
};

const initialState: BibleClassState = { ok: false };

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

export function BibleClassForm({
  action,
  students,
  initial,
  submitLabel = "Save class",
}: {
  action: (
    prev: BibleClassState,
    formData: FormData,
  ) => Promise<BibleClassState>;
  students: StudentLite[];
  initial?: BibleClassInitial;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const v = state.values ?? initial;
  const absentSet = new Set(v?.absentIds ?? []);

  return (
    <form action={formAction} className="space-y-6">
      {initial?.logId && (
        <input type="hidden" name="logId" value={initial.logId} />
      )}

      {state.error && (
        <p role="alert" className="alert-error">
          {state.error}
        </p>
      )}
      {state.ok && <p className="alert-success">Class saved.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="field-label">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={v?.date ?? todayISO()}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="topic" className="field-label">
            Scripture or topic
          </label>
          <input
            id="topic"
            name="topic"
            required
            placeholder="e.g. Proverbs 3:5–6 · Trust"
            defaultValue={v?.topic}
            className="field-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="field-label">
          Notes <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={v?.notes}
          className="field-input"
        />
      </div>

      <fieldset>
        <legend className="field-label">Who was absent?</legend>
        <p className="mb-2 text-xs text-muted-foreground">
          Everyone is marked present unless you tap their name.
        </p>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active students in this intake.
          </p>
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
                <span className="chip-toggle">{s.fullName}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
