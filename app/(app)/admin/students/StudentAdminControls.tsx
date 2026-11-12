"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { Student } from "@/lib/db/schema";
import { formatUGX } from "@/lib/format";
import {
  billFeeItem,
  recordStudentPayment,
  reverseStudentPayment,
  updateStudentDetails,
  updateStudentStatus,
  type PaymentFormState,
  type ReversalFormState,
  type StudentActionState,
  type StudentDetailsState,
} from "./actions";

const initialActionState: StudentActionState = { ok: false };
const initialDetailsState: StudentDetailsState = { ok: false };
const initialPaymentState: PaymentFormState = { ok: false };
const initialReversalState: ReversalFormState = { ok: false };

function SubmitButton({
  label,
  pendingLabel = "Saving…",
  variant = "primary",
  full = false,
}: {
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
  full?: boolean;
}) {
  const { pending } = useFormStatus();
  const base = variant === "primary" ? "btn-primary" : "btn-secondary";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${base} py-2 ${full ? "w-full" : ""}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function StudentStatusControl({
  studentId,
  currentStatus,
}: {
  studentId: string;
  currentStatus: Student["status"];
}) {
  const [state, action] = useActionState(
    updateStudentStatus,
    initialActionState,
  );
  const selectId = useId();

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="studentId" value={studentId} />
      <div>
        <label htmlFor={selectId} className="field-label">
          Status
        </label>
        <select
          id={selectId}
          name="status"
          defaultValue={currentStatus}
          className="field-input py-2"
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="dropped_out">Dropped out</option>
        </select>
      </div>
      <SubmitButton label="Update status" variant="secondary" />
      {state.error && (
        <p role="alert" className="w-full text-xs font-medium text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function EditStudentDetailsForm({ student }: { student: Student }) {
  const [state, action] = useActionState(
    updateStudentDetails,
    initialDetailsState,
  );
  const uid = useId();
  const v = state.values ?? {};

  return (
    <details className="group rounded-xl border border bg-muted/60">
      <summary className="cursor-pointer list-none rounded-xl px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-50">
        Edit student &amp; booth details
      </summary>
      <form
        action={action}
        className="space-y-4 border-t border bg-background p-4 rounded-b-xl"
      >
        <input type="hidden" name="studentId" value={student.id} />

        {state.error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
          >
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
            Student details saved.
          </p>
        )}

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contact &amp; booth
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-fullName`} className="field-label">
                Full name (required)
              </label>
              <input
                id={`${uid}-fullName`}
                name="fullName"
                required
                autoComplete="name"
                defaultValue={v.fullName ?? student.fullName}
                className="field-input py-2"
              />
            </div>
            <div>
              <label htmlFor={`${uid}-phone`} className="field-label">
                Phone (required)
              </label>
              <input
                id={`${uid}-phone`}
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                defaultValue={v.phone ?? student.phone}
                className="field-input py-2"
              />
            </div>
            <div>
              <label htmlFor={`${uid}-email`} className="field-label">
                Email
              </label>
              <input
                id={`${uid}-email`}
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={v.email ?? student.email ?? ""}
                className="field-input py-2"
              />
            </div>
            <div>
              <label htmlFor={`${uid}-dob`} className="field-label">
                Date of birth
              </label>
              <input
                id={`${uid}-dob`}
                name="dob"
                type="date"
                defaultValue={v.dob ?? student.dob ?? ""}
                className="field-input py-2"
              />
            </div>
            <div>
              <label htmlFor={`${uid}-location`} className="field-label">
                Location / residence
              </label>
              <input
                id={`${uid}-location`}
                name="location"
                autoComplete="street-address"
                defaultValue={v.location ?? student.location ?? ""}
                className="field-input py-2"
              />
            </div>
            <div>
              <label htmlFor={`${uid}-booth`} className="field-label">
                Assigned booth
              </label>
              <input
                id={`${uid}-booth`}
                name="booth"
                placeholder="e.g. Booth 1"
                defaultValue={v.booth ?? student.booth ?? ""}
                className="field-input py-2"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3 border-t border pt-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Next of kin
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor={`${uid}-nokName`} className="field-label">
                Full name
              </label>
              <input
                id={`${uid}-nokName`}
                name="nextOfKinName"
                defaultValue={v.nextOfKinName ?? student.nextOfKinName ?? ""}
                className="field-input py-2"
              />
            </div>
            <div>
              <label htmlFor={`${uid}-nokPhone`} className="field-label">
                Phone
              </label>
              <input
                id={`${uid}-nokPhone`}
                name="nextOfKinPhone"
                type="tel"
                defaultValue={v.nextOfKinPhone ?? student.nextOfKinPhone ?? ""}
                className="field-input py-2"
              />
            </div>
            <div>
              <label htmlFor={`${uid}-nokRel`} className="field-label">
                Relationship
              </label>
              <input
                id={`${uid}-nokRel`}
                name="nextOfKinRelationship"
                placeholder="e.g. Parent, Guardian"
                defaultValue={
                  v.nextOfKinRelationship ??
                  student.nextOfKinRelationship ??
                  ""
                }
                className="field-input py-2"
              />
            </div>
          </div>
        </fieldset>

        <SubmitButton label="Save details" />
      </form>
    </details>
  );
}

export function BillFeeItemForm({
  studentId,
  feeTypeCode,
  defaultAmount,
}: {
  studentId: string;
  feeTypeCode: string;
  defaultAmount: number;
}) {
  const [state, action] = useActionState(billFeeItem, initialActionState);
  return (
    <form action={action} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="feeTypeCode" value={feeTypeCode} />
      <SubmitButton
        label={`Bill item (${formatUGX(defaultAmount)})`}
        pendingLabel="Billing…"
        variant="secondary"
      />
      {state.error && (
        <p role="alert" className="text-xs font-medium text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function RecordPaymentForm({
  studentId,
  feeTypeCode,
  feeName,
  suggestedAmount,
  defaultDate,
}: {
  studentId: string;
  feeTypeCode: string;
  feeName: string;
  suggestedAmount: number;
  defaultDate: string;
}) {
  const [state, action] = useActionState(
    recordStudentPayment,
    initialPaymentState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const v = state.values ?? {};
  const defaultAmt =
    v.amount ?? (suggestedAmount > 0 ? String(suggestedAmount) : "");

  return (
    <details className="group rounded-xl border border bg-muted/60">
      <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-xs font-semibold text-brand hover:bg-brand-50">
        + Record payment for {feeName}
      </summary>
      <form
        ref={formRef}
        action={action}
        className="space-y-3 border-t border bg-background p-3 rounded-b-xl"
      >
        <input type="hidden" name="studentId" value={studentId} />
        <input type="hidden" name="feeTypeCode" value={feeTypeCode} />

        {state.error && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {state.error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-amount`} className="field-label">
              Amount paid (UGX)
            </label>
            <input
              id={`${uid}-amount`}
              name="amount"
              inputMode="numeric"
              required
              defaultValue={defaultAmt}
              placeholder="e.g. 400000"
              className="field-input py-2"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-method`} className="field-label">
              Method
            </label>
            <select
              id={`${uid}-method`}
              name="method"
              defaultValue={v.method ?? "mtn"}
              className="field-input py-2"
            >
              <option value="mtn">MTN Mobile Money</option>
              <option value="airtel">Airtel Money</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-ref`} className="field-label">
              Transaction / receipt reference
            </label>
            <input
              id={`${uid}-ref`}
              name="reference"
              required
              defaultValue={v.reference ?? ""}
              placeholder="e.g. MTN-99201 or RC-104"
              className="field-input py-2"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-date`} className="field-label">
              Date paid
            </label>
            <input
              id={`${uid}-date`}
              name="paidAt"
              type="date"
              required
              defaultValue={v.paidAt ?? defaultDate}
              className="field-input py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-confirmed`} className="field-label">
              Confirmed by
            </label>
            <input
              id={`${uid}-confirmed`}
              name="confirmedBy"
              required
              defaultValue={v.confirmedBy ?? ""}
              placeholder="e.g. Bursar"
              className="field-input py-2"
            />
          </div>
        </div>

        <SubmitButton label="Record payment" />
      </form>
    </details>
  );
}

export function ReversePaymentForm({
  studentId,
  paymentId,
  amount,
}: {
  studentId: string;
  paymentId: string;
  amount: number;
}) {
  const [state, action] = useActionState(
    reverseStudentPayment,
    initialReversalState,
  );
  const uid = useId();
  const v = state.values ?? {};

  return (
    <details className="mt-1 rounded-lg border border bg-muted/50">
      <summary className="cursor-pointer list-none px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-red-700">
        Reverse ({formatUGX(amount)})
      </summary>
      <form
        action={action}
        className="space-y-2 border-t border bg-background p-2.5 rounded-b-lg"
      >
        <input type="hidden" name="studentId" value={studentId} />
        <input type="hidden" name="paymentId" value={paymentId} />
        <p className="text-xs text-muted-foreground">
          Creates a reversal entry for {formatUGX(amount)}. Original payment
          remains in the audit log.
        </p>
        <div>
          <label htmlFor={`${uid}-reason`} className="field-label text-xs">
            Reason for reversal (required)
          </label>
          <input
            id={`${uid}-reason`}
            name="reason"
            required
            defaultValue={v.reason ?? ""}
            placeholder="e.g. Duplicate entry or wrong amount"
            className="field-input py-1.5 text-xs"
          />
        </div>
        <div>
          <label htmlFor={`${uid}-confirmedBy`} className="field-label text-xs">
            Confirmed by (required)
          </label>
          <input
            id={`${uid}-confirmedBy`}
            name="confirmedBy"
            required
            defaultValue={v.confirmedBy ?? ""}
            placeholder="e.g. Bursar"
            className="field-input py-1.5 text-xs"
          />
        </div>
        {state.error && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {state.error}
          </p>
        )}
        <SubmitButton
          label={`Confirm reversal (${formatUGX(amount)})`}
          pendingLabel="Reversing…"
          variant="secondary"
          full
        />
      </form>
    </details>
  );
}
