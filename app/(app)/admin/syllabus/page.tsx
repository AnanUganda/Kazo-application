import { desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { intakes, syllabusTopics, type SyllabusTopic } from "@/lib/db/schema";
import { getActiveIntake } from "@/lib/intake";
import { loadSyllabus } from "@/lib/syllabus-data";
import { SyllabusTimeline } from "@/components/syllabus/SyllabusTimeline";
import { AddTopicForm } from "./AddTopicForm";
import {
  updateTopic,
  archiveTopic,
  copyFromIntake,
  loadDefaultKtsSyllabus,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syllabus — Kazo Technical School" };

function EditTopic({ topic }: { topic: SyllabusTopic }) {
  return (
    <details className="group rounded-lg border border-neutral-200">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm">
        <span className="truncate font-medium text-neutral-800">
          {topic.title}
        </span>
        <span className="shrink-0 text-xs text-neutral-400">
          Wk {topic.targetWeek} · {topic.type === "theory" ? "Theory" : "Practical"}
        </span>
      </summary>
      <div className="space-y-3 border-t border-neutral-100 p-3">
        <form action={updateTopic} className="space-y-3">
          <input type="hidden" name="id" value={topic.id} />
          <input
            name="title"
            defaultValue={topic.title}
            className="field-input py-2"
          />
          <div className="grid grid-cols-3 gap-2">
            <select name="semester" defaultValue={topic.semester} className="field-input py-2">
              <option value="1">Sem 1</option>
              <option value="2">Sem 2</option>
            </select>
            <select name="type" defaultValue={topic.type} className="field-input py-2">
              <option value="theory">Theory</option>
              <option value="practical">Practical</option>
            </select>
            <input
              name="targetWeek"
              type="number"
              min={1}
              max={52}
              defaultValue={topic.targetWeek}
              className="field-input py-2"
            />
          </div>
          <textarea
            name="description"
            rows={2}
            defaultValue={topic.description ?? ""}
            className="field-input py-2"
          />
          <button type="submit" className="btn-secondary py-2">Save changes</button>
        </form>
        <form action={archiveTopic}>
          <input type="hidden" name="id" value={topic.id} />
          <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
            Archive topic
          </button>
        </form>
      </div>
    </details>
  );
}

export default async function SyllabusPage() {
  await requireRole("admin");
  const intake = await getActiveIntake();

  if (!intake) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-neutral-900">Syllabus</h1>
        <div className="card text-sm text-neutral-500">
          There is no active intake. Create one in Intakes before building the
          syllabus plan.
        </div>
      </div>
    );
  }

  const { topics, completed, started } = await loadSyllabus(intake.id);
  const archivedIntakes = await getDb()
    .select({ id: intakes.id, name: intakes.name })
    .from(intakes)
    .where(eq(intakes.status, "archived"))
    .orderBy(desc(intakes.startDate));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Syllabus</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Plan for <span className="font-medium">{intake.name}</span> (2
            semesters · 13 weeks per semester · 18 KTS modules). Track status:
            0–1 overdue green, 2 amber, 3+ red.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={loadDefaultKtsSyllabus}>
            <button type="submit" className="btn-secondary py-2">
              Load KTS 18-module syllabus
            </button>
          </form>
          <a
            href="/admin/export/syllabus"
            download
            className="btn-secondary py-2"
          >
            Export CSV
          </a>
        </div>
      </header>

      {topics.length === 0 && archivedIntakes.length > 0 && (
        <div className="card max-w-xl">
          <h2 className="text-sm font-semibold text-neutral-900">
            Copy a plan from a previous intake
          </h2>
          <form action={copyFromIntake} className="mt-3 flex items-end gap-2">
            <select name="sourceIntakeId" className="field-input">
              {archivedIntakes.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-secondary">Copy topics</button>
          </form>
        </div>
      )}

      {/* Timeline + progress */}
      <SyllabusTimeline
        intake={intake}
        topics={topics}
        completed={completed}
        started={started}
      />

      {/* Plan editor */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-1">
          <div className="card">
            <h2 className="mb-4 text-sm font-semibold text-neutral-900">
              Add a topic
            </h2>
            <AddTopicForm />
          </div>
        </section>
        <section className="space-y-4 lg:col-span-2">
          {[1, 2].map((sem) => {
            const semTopics = topics.filter((t) => t.semester === sem);
            return (
              <div key={sem} className="card">
                <h2 className="mb-3 text-sm font-semibold text-neutral-900">
                  Semester {sem} topics
                </h2>
                {semTopics.length === 0 ? (
                  <p className="text-sm text-neutral-400">No topics yet.</p>
                ) : (
                  <div className="space-y-2">
                    {semTopics.map((t) => (
                      <EditTopic key={t.id} topic={t} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
