"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createStaff, type CreateStaffState } from "./actions";

const initial: CreateStaffState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Creating…" : "Create staff account"}
    </button>
  );
}

export function CreateStaffForm() {
  const [state, formAction] = useActionState(createStaff, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="alert-error"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="alert-success">
          Staff account created.
        </p>
      )}

      <div>
        <label htmlFor="fullName" className="field-label">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          required
          defaultValue={state.values?.fullName}
          className="field-input"
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={state.values?.email}
          className="field-input"
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="role" className="field-label">
          Role
        </label>
        <select
          id="role"
          name="role"
          defaultValue={state.values?.role ?? "teacher"}
          className="field-input"
        >
          <option value="admin">Administrator</option>
          <option value="teacher">Teacher</option>
          <option value="store_keeper">Store keeper</option>
          <option value="bible_teacher">Bible teacher</option>
        </select>
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Temporary password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="field-input"
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          At least 8 characters. Share it with the staff member privately.
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}
