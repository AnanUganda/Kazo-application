"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ApplicationStage } from "@/lib/db/schema";
import {
  moveToRegistered,
  moveToTestInterview,
  moveToEnrolled,
  markNotAccepted,
  markWithdrew,
  type ActionState,
} from "./actions";

const initial: ActionState = { ok: false };

function SubmitButton({ label, full = false }: { label: string; full?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`btn-primary py-2 ${full ? "w-full" : ""}`}
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

function ErrorLine({ state }: { state: ActionState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="text-xs font-medium text-red-700">
      {state.error}
    </p>
  );
}

function Disclosure({
  summary,
  tone = "primary",
  children,
}: {
  summary: string;
  tone?: "primary" | "muted";
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-neutral-200">
      <summary
        className={`cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-medium ${
          tone === "primary"
            ? "text-brand hover:bg-brand-50"
            : "text-neutral-500 hover:bg-neutral-50"
        }`}
      >
        {summary}
      </summary>
      <div className="space-y-3 border-t border-neutral-100 p-3">{children}</div>
    </details>
  );
}

function RegisterForm({ id }: { id: string }) {
  const [state, action] = useActionState(moveToRegistered, initial);
  const v = state.values ?? {};
  return (
    <Disclosure summary="Register (record fee)">
      <form action={action} className="space-y-3">
        <input type="hidden" name="applicationId" value={id} />
        <div>
          <label className="field-label">Amount paid (UGX)</label>
          <input
            name="amount"
            inputMode="numeric"
            defaultValue={v.amount ?? "35000"}
            className="field-input py-2"
          />
        </div>
        <div>
          <label className="field-label">Method</label>
          <select
            name="method"
            className="field-input py-2"
            defaultValue={v.method ?? "mtn"}
          >
            <option value="mtn">MTN</option>
            <option value="airtel">Airtel</option>
            <option value="cash">Cash</option>
          </select>
        </div>
        <div>
          <label className="field-label">Transaction / receipt reference</label>
          <input
            name="reference"
            defaultValue={v.reference ?? ""}
            className="field-input py-2"
          />
        </div>
        <div>
          <label className="field-label">Confirmed by</label>
          <input
            name="confirmedBy"
            defaultValue={v.confirmedBy ?? ""}
            className="field-input py-2"
          />
        </div>
        <ErrorLine state={state} />
        <SubmitButton label="Confirm registration" full />
      </form>
    </Disclosure>
  );
}

function TestInterviewForm({ id }: { id: string }) {
  const [state, action] = useActionState(moveToTestInterview, initial);
  const v = state.values ?? {};
  return (
    <Disclosure summary="Record test & interview">
      <form action={action} className="space-y-3">
        <input type="hidden" name="applicationId" value={id} />
        <div>
          <label className="field-label">Date</label>
          <input
            name="testDate"
            type="date"
            defaultValue={v.testDate ?? ""}
            className="field-input py-2"
          />
        </div>
        <div>
          <label className="field-label">Result</label>
          <select
            name="testResult"
            className="field-input py-2"
            defaultValue={v.testResult ?? "pass"}
          >
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
        </div>
        <div>
          <label className="field-label">Interview notes</label>
          <textarea
            name="interviewNotes"
            rows={2}
            defaultValue={v.interviewNotes ?? ""}
            className="field-input py-2"
          />
        </div>
        <ErrorLine state={state} />
        <SubmitButton label="Save result" full />
      </form>
    </Disclosure>
  );
}

function EnrolForm({ id }: { id: string }) {
  const [state, action] = useActionState(moveToEnrolled, initial);
  return (
    <Disclosure summary="Enrol (create student)">
      <form action={action} className="space-y-3">
        <input type="hidden" name="applicationId" value={id} />
        <p className="text-xs text-neutral-500">
          Creates the student profile in the active intake.
        </p>
        <ErrorLine state={state} />
        <SubmitButton label="Enrol applicant" full />
      </form>
    </Disclosure>
  );
}

function ExitForms({ id }: { id: string }) {
  const [waState, waAction] = useActionState(markWithdrew, initial);
  const [naState, naAction] = useActionState(markNotAccepted, initial);
  return (
    <div className="space-y-2">
      <Disclosure summary="Mark as withdrew" tone="muted">
        <form action={waAction} className="space-y-3">
          <input type="hidden" name="applicationId" value={id} />
          <div>
            <label className="field-label">Reason (required)</label>
            <input
              name="reason"
              defaultValue={waState.values?.reason ?? ""}
              className="field-input py-2"
            />
          </div>
          <ErrorLine state={waState} />
          <SubmitButton label="Withdraw" full />
        </form>
      </Disclosure>
      <Disclosure summary="Mark as not accepted" tone="muted">
        <form action={naAction} className="space-y-3">
          <input type="hidden" name="applicationId" value={id} />
          <ErrorLine state={naState} />
          <SubmitButton label="Not accepted" full />
        </form>
      </Disclosure>
    </div>
  );
}

export function StageActions({
  id,
  stage,
}: {
  id: string;
  stage: ApplicationStage;
}) {
  if (stage === "enrolled" || stage === "not_accepted" || stage === "withdrew") {
    return null;
  }
  return (
    <div className="mt-3 space-y-2">
      {stage === "applied_unpaid" && <RegisterForm id={id} />}
      {stage === "registered" && <TestInterviewForm id={id} />}
      {stage === "test_interview" && <EnrolForm id={id} />}
      <ExitForms id={id} />
    </div>
  );
}
