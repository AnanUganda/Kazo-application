"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type SignInState } from "./actions";

const initial: SignInState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function SignInForm() {
  const [state, formAction] = useActionState(signIn, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="alert-error"
        >
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.email}
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field-input"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
