"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { Equipment, EquipmentFault } from "@/lib/db/schema";
import type { StudentRosterOption } from "@/lib/inventory-data";
import {
  createEquipment,
  linkLessonIssueToEquipment,
  reportEquipmentFault,
  resolveEquipmentFault,
  updateEquipment,
  type InventoryFormState,
} from "@/app/(app)/store/actions";

const initial: InventoryFormState = { ok: false };

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

export function AddEquipmentForm({
  studentOptions,
  allBooths,
}: {
  studentOptions: StudentRosterOption[];
  allBooths: string[];
}) {
  const [state, action] = useActionState(createEquipment, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const v = state.values ?? {};

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          Equipment registered.
        </p>
      )}

      <div>
        <label htmlFor={`${uid}-code`} className="field-label">
          Asset ID
        </label>
        <input
          id={`${uid}-code`}
          name="assetCode"
          required
          defaultValue={v.assetCode ?? ""}
          placeholder="e.g. KTS-WM-07"
          className="field-input py-2"
        />
      </div>

      <div>
        <label htmlFor={`${uid}-type`} className="field-label">
          Type
        </label>
        <input
          id={`${uid}-type`}
          name="type"
          required
          defaultValue={v.type ?? ""}
          placeholder="e.g. MIG welder, MMA inverter, Angle grinder"
          className="field-input py-2"
        />
      </div>

      <div>
        <label htmlFor={`${uid}-model`} className="field-label">
          Make / model
        </label>
        <input
          id={`${uid}-model`}
          name="makeModel"
          defaultValue={v.makeModel ?? ""}
          placeholder="e.g. Lincoln PowerMIG 210"
          className="field-input py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${uid}-status`} className="field-label">
            Status
          </label>
          <select
            id={`${uid}-status`}
            name="status"
            defaultValue={v.status ?? "working"}
            className="field-input py-2"
          >
            <option value="working">Working</option>
            <option value="needs_repair">Needs repair</option>
            <option value="out_of_service">Out of service</option>
          </select>
        </div>

        <div>
          <label htmlFor={`${uid}-booth`} className="field-label">
            Booth
          </label>
          <input
            id={`${uid}-booth`}
            name="booth"
            list={`${uid}-booths`}
            defaultValue={v.booth ?? ""}
            placeholder="e.g. Booth 1"
            className="field-input py-2"
          />
          <datalist id={`${uid}-booths`}>
            {allBooths.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label htmlFor={`${uid}-student`} className="field-label">
          Assigned student (active intake)
        </label>
        <select
          id={`${uid}-student`}
          name="assignedStudentId"
          defaultValue={v.assignedStudentId ?? ""}
          className="field-input py-2"
        >
          <option value="">Unassigned</option>
          {studentOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
              {s.booth ? ` (${s.booth})` : ""}
            </option>
          ))}
        </select>
      </div>

      <SubmitButton label="Register equipment" full />
    </form>
  );
}

export function EditEquipmentForm({
  item,
  studentOptions,
  allBooths,
}: {
  item: Equipment;
  studentOptions: StudentRosterOption[];
  allBooths: string[];
}) {
  const [state, action] = useActionState(updateEquipment, initial);
  const uid = useId();
  const v = state.values ?? {};

  return (
    <details className="rounded-xl border border-neutral-200 bg-neutral-50/70">
      <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100">
        Update status / booth / student
      </summary>
      <form
        action={action}
        className="space-y-3 rounded-b-xl border-t border-neutral-200 bg-white p-3"
      >
        <input type="hidden" name="equipmentId" value={item.id} />
        {state.error && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {state.error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-status`} className="field-label text-xs">
              Status
            </label>
            <select
              id={`${uid}-status`}
              name="status"
              defaultValue={v.status ?? item.status}
              className="field-input py-1.5 text-xs"
            >
              <option value="working">Working</option>
              <option value="needs_repair">Needs repair</option>
              <option value="out_of_service">Out of service</option>
            </select>
          </div>

          <div>
            <label htmlFor={`${uid}-booth`} className="field-label text-xs">
              Assigned booth
            </label>
            <input
              id={`${uid}-booth`}
              name="booth"
              list={`${uid}-booths`}
              defaultValue={v.booth ?? item.booth ?? ""}
              placeholder="e.g. Booth 1"
              className="field-input py-1.5 text-xs"
            />
            <datalist id={`${uid}-booths`}>
              {allBooths.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor={`${uid}-student`} className="field-label text-xs">
              Assigned student
            </label>
            <select
              id={`${uid}-student`}
              name="assignedStudentId"
              defaultValue={
                v.assignedStudentId ?? item.assignedStudentId ?? ""
              }
              className="field-input py-1.5 text-xs"
            >
              <option value="">Unassigned</option>
              {studentOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                  {s.booth ? ` (${s.booth})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${uid}-type`} className="field-label text-xs">
              Equipment type
            </label>
            <input
              id={`${uid}-type`}
              name="type"
              required
              defaultValue={v.type ?? item.type}
              className="field-input py-1.5 text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-model`} className="field-label text-xs">
              Make / model
            </label>
            <input
              id={`${uid}-model`}
              name="makeModel"
              defaultValue={v.makeModel ?? item.makeModel ?? ""}
              className="field-input py-1.5 text-xs"
            />
          </div>
        </div>

        <SubmitButton label="Save assignment & status" variant="secondary" />
      </form>
    </details>
  );
}

export function ReportFaultForm({
  equipmentId,
  assetCode,
  defaultDate,
  defaultReportedBy,
}: {
  equipmentId: string;
  assetCode: string;
  defaultDate: string;
  defaultReportedBy: string;
}) {
  const [state, action] = useActionState(reportEquipmentFault, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const v = state.values ?? {};

  return (
    <details className="rounded-xl border border-neutral-200 bg-neutral-50/70">
      <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-xs font-semibold text-brand hover:bg-brand-50">
        + Log fault on {assetCode}
      </summary>
      <form
        ref={formRef}
        action={action}
        className="space-y-3 rounded-b-xl border-t border-neutral-200 bg-white p-3"
      >
        <input type="hidden" name="equipmentId" value={equipmentId} />
        {state.error && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {state.error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-date`} className="field-label text-xs">
              Date reported
            </label>
            <input
              id={`${uid}-date`}
              name="reportedAt"
              type="date"
              required
              defaultValue={v.reportedAt ?? defaultDate}
              className="field-input py-1.5 text-xs"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-by`} className="field-label text-xs">
              Reported by
            </label>
            <input
              id={`${uid}-by`}
              name="reportedBy"
              required
              defaultValue={v.reportedBy ?? defaultReportedBy}
              className="field-input py-1.5 text-xs"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-prob`} className="field-label text-xs">
              Problem description
            </label>
            <input
              id={`${uid}-prob`}
              name="problem"
              required
              defaultValue={v.problem ?? ""}
              placeholder="e.g. Wire feeder jamming or no arc output"
              className="field-input py-1.5 text-xs"
            />
          </div>
        </div>

        <SubmitButton label="Log fault" />
      </form>
    </details>
  );
}

export function ResolveFaultForm({
  fault,
  defaultDate,
}: {
  fault: EquipmentFault;
  defaultDate: string;
}) {
  const [state, action] = useActionState(resolveEquipmentFault, initial);
  const uid = useId();
  const v = state.values ?? {};

  return (
    <details className="mt-2 rounded-lg border border-neutral-200 bg-white">
      <summary className="cursor-pointer list-none px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
        Resolve fault (record fix &amp; cost)
      </summary>
      <form
        action={action}
        className="space-y-3 border-t border-neutral-100 p-3"
      >
        <input type="hidden" name="faultId" value={fault.id} />
        {state.error && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {state.error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-fix`} className="field-label text-xs">
              Fix / repair performed (required)
            </label>
            <input
              id={`${uid}-fix`}
              name="fix"
              required
              defaultValue={v.fix ?? ""}
              placeholder="e.g. Replaced power switch and tested output"
              className="field-input py-1.5 text-xs"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-fixedAt`} className="field-label text-xs">
              Date fixed
            </label>
            <input
              id={`${uid}-fixedAt`}
              name="fixedAt"
              type="date"
              required
              defaultValue={v.fixedAt ?? defaultDate}
              className="field-input py-1.5 text-xs"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-cost`} className="field-label text-xs">
              Repair cost (UGX, optional)
            </label>
            <input
              id={`${uid}-cost`}
              name="cost"
              inputMode="numeric"
              defaultValue={v.cost ?? ""}
              placeholder="e.g. 45000"
              className="field-input py-1.5 text-xs"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-neutral-700">
          <input
            type="checkbox"
            name="restoreWorking"
            defaultChecked
            className="rounded border-neutral-300 text-brand focus:ring-brand"
          />
          Set equipment status back to Working
        </label>

        <SubmitButton label="Mark fault resolved" />
      </form>
    </details>
  );
}

export function LinkLessonIssueForm({
  lessonIssueId,
  equipmentOptions,
}: {
  lessonIssueId: string;
  equipmentOptions: { id: string; assetCode: string; type: string }[];
}) {
  const [state, action] = useActionState(linkLessonIssueToEquipment, initial);
  const uid = useId();

  return (
    <form action={action} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="lessonIssueId" value={lessonIssueId} />
      <div>
        <label htmlFor={uid} className="field-label text-xs">
          Link to equipment asset
        </label>
        <select
          id={uid}
          name="equipmentId"
          required
          className="field-input py-1.5 text-xs"
        >
          <option value="">Select asset…</option>
          {equipmentOptions.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.assetCode} ({eq.type})
            </option>
          ))}
        </select>
      </div>
      <SubmitButton label="Link fault" variant="secondary" />
      {state.error && (
        <p role="alert" className="w-full text-xs font-medium text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
