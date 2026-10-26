"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "done" | "error";

export function ApplyForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    const form = e.currentTarget;
    const body = new FormData(form);
    try {
      const res = await fetch("/api/applications", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (res.ok && json.ok) {
        setStatus("done");
        form.reset();
      } else {
        setStatus("error");
        setError(json.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      // Keep the entered values so a flaky connection does not lose the form.
      setStatus("error");
      setError("Could not reach the server. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <h2 className="text-base font-semibold text-green-800">
          Application received
        </h2>
        <p className="mt-2 text-sm text-green-700">
          Thank you. The school will contact you on the phone number you
          provided. Keep your UGX 35,000 registration fee ready.
        </p>
        <button
          type="button"
          className="btn-secondary mt-4"
          onClick={() => setStatus("idle")}
        >
          Submit another application
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden className="hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Field name="fullName" label="Full name" required />
      <Field name="phone" label="Phone (WhatsApp)" required inputMode="tel" />
      <Field name="email" label="Email (optional)" type="email" />
      <Field name="dob" label="Date of birth" type="date" />
      <Field name="location" label="Location (village / town)" />
      <Field name="educationLevel" label="Highest education level" />

      <div>
        <label htmlFor="priorExperience" className="field-label">
          Any prior welding experience?
        </label>
        <textarea
          id="priorExperience"
          name="priorExperience"
          rows={3}
          className="field-input"
        />
      </div>

      <Field name="heardAbout" label="How did you hear about Kazo?" />

      <fieldset className="rounded-xl border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-semibold text-neutral-700">
          Next of kin
        </legend>
        <div className="space-y-4">
          <Field name="nextOfKinName" label="Name" />
          <Field name="nextOfKinPhone" label="Phone" inputMode="tel" />
          <Field name="nextOfKinRelationship" label="Relationship" />
        </div>
      </fieldset>

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  inputMode,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  inputMode?: "tel" | "text" | "email" | "numeric";
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        inputMode={inputMode}
        className="field-input"
      />
    </div>
  );
}
