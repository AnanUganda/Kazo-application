"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { Consumable } from "@/lib/db/schema";
import {
  createConsumable,
  recordStockCount,
  recordStockIn,
  recordStockOut,
  updateConsumable,
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

export function AddConsumableForm() {
  const [state, action] = useActionState(createConsumable, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const v = state.values ?? {};

  return (
    <form ref={formRef} action={action} className="space-y-4">
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
          Consumable added.
        </p>
      )}

      <div>
        <label htmlFor={`${uid}-name`} className="field-label">
          Item name
        </label>
        <input
          id={`${uid}-name`}
          name="name"
          required
          defaultValue={v.name ?? ""}
          placeholder="e.g. E6013 2.5mm welding rods"
          className="field-input py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${uid}-category`} className="field-label">
            Category
          </label>
          <select
            id={`${uid}-category`}
            name="category"
            defaultValue={v.category ?? "electrodes"}
            className="field-input py-2"
          >
            <option value="electrodes">Electrodes</option>
            <option value="discs">Discs</option>
            <option value="steel">Steel</option>
            <option value="gas">Gas</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor={`${uid}-unit`} className="field-label">
            Unit
          </label>
          <select
            id={`${uid}-unit`}
            name="unit"
            defaultValue={v.unit ?? "box"}
            className="field-input py-2"
          >
            <option value="box">Box</option>
            <option value="piece">Piece</option>
            <option value="kg">kg</option>
            <option value="length">Length</option>
            <option value="cylinder">Cylinder</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${uid}-reorder`} className="field-label">
            Reorder level
          </label>
          <input
            id={`${uid}-reorder`}
            name="reorderLevel"
            inputMode="numeric"
            required
            defaultValue={v.reorderLevel ?? "5"}
            className="field-input py-2"
          />
        </div>
        <div>
          <label htmlFor={`${uid}-init`} className="field-label">
            Opening qty (optional)
          </label>
          <input
            id={`${uid}-init`}
            name="initialQty"
            inputMode="numeric"
            defaultValue={v.initialQty ?? ""}
            placeholder="0"
            className="field-input py-2"
          />
        </div>
      </div>

      <SubmitButton label="Add consumable" full />
    </form>
  );
}

export function StockInForm({
  consumable,
  defaultDate,
  defaultReceivedBy,
}: {
  consumable: Consumable;
  defaultDate: string;
  defaultReceivedBy: string;
}) {
  const [state, action] = useActionState(recordStockIn, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const v = state.values ?? {};

  return (
    <details className="rounded-xl border border bg-muted/70">
      <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
        + Stock in ({consumable.unit})
      </summary>
      <form
        ref={formRef}
        action={action}
        className="space-y-3 rounded-b-xl border-t border bg-background p-3"
      >
        <input type="hidden" name="consumableId" value={consumable.id} />
        {state.error && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {state.error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-date`} className="field-label text-xs">
              Date
            </label>
            <input
              id={`${uid}-date`}
              name="date"
              type="date"
              required
              defaultValue={v.date ?? defaultDate}
              className="field-input py-1.5 text-xs"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-qty`} className="field-label text-xs">
              Quantity ({consumable.unit})
            </label>
            <input
              id={`${uid}-qty`}
              name="quantity"
              inputMode="numeric"
              required
              defaultValue={v.quantity ?? ""}
              placeholder="e.g. 10"
              className="field-input py-1.5 text-xs"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-supplier`} className="field-label text-xs">
              Supplier
            </label>
            <input
              id={`${uid}-supplier`}
              name="supplier"
              required
              defaultValue={v.supplier ?? ""}
              placeholder="e.g. Roofings Ltd"
              className="field-input py-1.5 text-xs"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-cost`} className="field-label text-xs">
              Cost (UGX, optional)
            </label>
            <input
              id={`${uid}-cost`}
              name="cost"
              inputMode="numeric"
              defaultValue={v.cost ?? ""}
              placeholder="e.g. 150000"
              className="field-input py-1.5 text-xs"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor={`${uid}-receivedBy`}
              className="field-label text-xs"
            >
              Received by
            </label>
            <input
              id={`${uid}-receivedBy`}
              name="receivedBy"
              required
              defaultValue={v.receivedBy ?? defaultReceivedBy}
              className="field-input py-1.5 text-xs"
            />
          </div>
        </div>

        <SubmitButton label="Record stock in" />
      </form>
    </details>
  );
}

export function StockOutForm({
  consumable,
  defaultDate,
}: {
  consumable: Consumable;
  defaultDate: string;
}) {
  const [state, action] = useActionState(recordStockOut, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const v = state.values ?? {};

  return (
    <details className="rounded-xl border border bg-muted/70">
      <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-xs font-semibold text-brand hover:bg-brand-50">
        − Stock out ({consumable.unit})
      </summary>
      <form
        ref={formRef}
        action={action}
        className="space-y-3 rounded-b-xl border-t border bg-background p-3"
      >
        <input type="hidden" name="consumableId" value={consumable.id} />
        {state.error && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {state.error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-date`} className="field-label text-xs">
              Date
            </label>
            <input
              id={`${uid}-date`}
              name="date"
              type="date"
              required
              defaultValue={v.date ?? defaultDate}
              className="field-input py-1.5 text-xs"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-qty`} className="field-label text-xs">
              Quantity ({consumable.unit})
            </label>
            <input
              id={`${uid}-qty`}
              name="quantity"
              inputMode="numeric"
              required
              defaultValue={v.quantity ?? ""}
              placeholder="e.g. 2"
              className="field-input py-1.5 text-xs"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-purpose`} className="field-label text-xs">
              Purpose
            </label>
            <select
              id={`${uid}-purpose`}
              name="purpose"
              defaultValue={v.purpose ?? "class_practice"}
              className="field-input py-1.5 text-xs"
            >
              <option value="class_practice">Class practice</option>
              <option value="workshop_job">Workshop job</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-takenBy`} className="field-label text-xs">
              Taken by
            </label>
            <input
              id={`${uid}-takenBy`}
              name="takenBy"
              required
              defaultValue={v.takenBy ?? ""}
              placeholder="e.g. John Okello"
              className="field-input py-1.5 text-xs"
            />
          </div>
        </div>

        <SubmitButton label="Record stock out" />
      </form>
    </details>
  );
}

export function StockCountForm({
  consumable,
  currentStock,
}: {
  consumable: Consumable;
  currentStock: number;
}) {
  const [state, action] = useActionState(recordStockCount, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const v = state.values ?? {};

  return (
    <details className="rounded-xl border border bg-muted/70">
      <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
        Physical stock count
      </summary>
      <form
        ref={formRef}
        action={action}
        className="space-y-3 rounded-b-xl border-t border bg-background p-3"
      >
        <input type="hidden" name="consumableId" value={consumable.id} />
        <p className="text-xs text-muted-foreground">
          Current system stock is{" "}
          <span className="font-semibold text-foreground">
            {currentStock} {consumable.unit}
          </span>
          . Enter the physical count; any difference is recorded as an
          adjustment movement.
        </p>

        {state.error && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {state.error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-count`} className="field-label text-xs">
              Physical count ({consumable.unit})
            </label>
            <input
              id={`${uid}-count`}
              name="physicalCount"
              inputMode="numeric"
              required
              defaultValue={v.physicalCount ?? String(currentStock)}
              className="field-input py-1.5 text-xs"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-reason`} className="field-label text-xs">
              Reason for difference
            </label>
            <select
              id={`${uid}-reason`}
              name="adjustmentReason"
              defaultValue={v.adjustmentReason ?? "miscounted"}
              className="field-input py-1.5 text-xs"
            >
              <option value="miscounted">Miscounted</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-notes`} className="field-label text-xs">
              Notes (optional)
            </label>
            <input
              id={`${uid}-notes`}
              name="notes"
              defaultValue={v.notes ?? ""}
              placeholder="e.g. End-of-month shelf count"
              className="field-input py-1.5 text-xs"
            />
          </div>
        </div>

        <SubmitButton label="Save count adjustment" variant="secondary" />
      </form>
    </details>
  );
}

export function EditConsumableForm({ consumable }: { consumable: Consumable }) {
  const [state, action] = useActionState(updateConsumable, initial);
  const uid = useId();
  const v = state.values ?? {};

  return (
    <details className="rounded-xl border border bg-muted/70">
      <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">
        Edit item details
      </summary>
      <form
        action={action}
        className="space-y-3 rounded-b-xl border-t border bg-background p-3"
      >
        <input type="hidden" name="consumableId" value={consumable.id} />
        {state.error && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {state.error}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-name`} className="field-label text-xs">
              Item name
            </label>
            <input
              id={`${uid}-name`}
              name="name"
              required
              defaultValue={v.name ?? consumable.name}
              className="field-input py-1.5 text-xs"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-cat`} className="field-label text-xs">
              Category
            </label>
            <select
              id={`${uid}-cat`}
              name="category"
              defaultValue={v.category ?? consumable.category}
              className="field-input py-1.5 text-xs"
            >
              <option value="electrodes">Electrodes</option>
              <option value="discs">Discs</option>
              <option value="steel">Steel</option>
              <option value="gas">Gas</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-unit`} className="field-label text-xs">
              Unit
            </label>
            <select
              id={`${uid}-unit`}
              name="unit"
              defaultValue={v.unit ?? consumable.unit}
              className="field-input py-1.5 text-xs"
            >
              <option value="box">Box</option>
              <option value="piece">Piece</option>
              <option value="kg">kg</option>
              <option value="length">Length</option>
              <option value="cylinder">Cylinder</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-reorder`} className="field-label text-xs">
              Reorder level
            </label>
            <input
              id={`${uid}-reorder`}
              name="reorderLevel"
              inputMode="numeric"
              required
              defaultValue={v.reorderLevel ?? String(consumable.reorderLevel)}
              className="field-input py-1.5 text-xs"
            />
          </div>
        </div>
        <SubmitButton label="Save changes" variant="secondary" />
      </form>
    </details>
  );
}
