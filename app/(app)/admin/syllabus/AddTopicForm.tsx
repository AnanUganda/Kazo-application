"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { addTopic, type TopicState } from "./actions";

const initial: TopicState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Adding…" : "Add topic"}
    </button>
  );
}

export function AddTopicForm() {
  const [state, action] = useActionState(addTopic, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const v = state.values ?? {};

  return (
    <form ref={ref} action={action} className="space-y-4">
      {state.error && (
        <p role="alert" className="alert-error">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="alert-success">
          Topic added.
        </p>
      )}
      <div>
        <label htmlFor="title" className="field-label">Topic title</label>
        <input id="title" name="title" required defaultValue={v.title} className="field-input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="semester" className="field-label">Semester</label>
          <select id="semester" name="semester" defaultValue={v.semester ?? "1"} className="field-input">
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>
        </div>
        <div>
          <label htmlFor="type" className="field-label">Type</label>
          <select id="type" name="type" defaultValue={v.type ?? "theory"} className="field-input">
            <option value="theory">Theory</option>
            <option value="practical">Practical</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="targetWeek" className="field-label">Target week</label>
        <input id="targetWeek" name="targetWeek" type="number" min={1} max={52} defaultValue={v.targetWeek} className="field-input w-28" />
      </div>
      <div>
        <label htmlFor="description" className="field-label">Short description</label>
        <textarea id="description" name="description" rows={2} defaultValue={v.description} className="field-input" />
      </div>
      <SubmitButton />
    </form>
  );
}
