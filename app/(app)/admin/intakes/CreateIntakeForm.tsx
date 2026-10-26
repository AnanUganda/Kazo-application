"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createIntake, type CreateIntakeState } from "./actions";

const initial: CreateIntakeState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Creating…" : "Create intake"}
    </button>
  );
}

function DateField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="date"
        required
        defaultValue={defaultValue}
        className="field-input"
      />
    </div>
  );
}

export function CreateIntakeForm() {
  const [state, formAction] = useActionState(createIntake, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const v = state.values ?? {};

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Intake created and set as active.
        </p>
      )}

      <div>
        <label htmlFor="name" className="field-label">
          Intake name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={v.name}
          placeholder="e.g. 2026 Intake"
          className="field-input"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateField name="startDate" label="Start date" defaultValue={v.startDate} />
        <DateField name="endDate" label="End date" defaultValue={v.endDate} />
        <DateField
          name="semester1Start"
          label="Semester 1 start"
          defaultValue={v.semester1Start}
        />
        <DateField
          name="semester1End"
          label="Semester 1 end"
          defaultValue={v.semester1End}
        />
        <DateField
          name="semester2Start"
          label="Semester 2 start"
          defaultValue={v.semester2Start}
        />
        <DateField
          name="semester2End"
          label="Semester 2 end"
          defaultValue={v.semester2End}
        />
      </div>

      <SubmitButton />
    </form>
  );
}
