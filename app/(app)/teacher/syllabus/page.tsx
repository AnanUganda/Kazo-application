import { requireRole } from "@/lib/permissions";
import { getActiveIntake } from "@/lib/intake";
import { loadSyllabus } from "@/lib/syllabus-data";
import { SyllabusTimeline } from "@/components/syllabus/SyllabusTimeline";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syllabus — Kazo Technical School" };

export default async function TeacherSyllabusPage() {
  await requireRole("teacher", "admin");
  const intake = await getActiveIntake();

  if (!intake) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-neutral-900">Syllabus</h1>
        <div className="card text-sm text-neutral-500">
          There is no active intake yet.
        </div>
      </div>
    );
  }

  const { topics, completed, started } = await loadSyllabus(intake.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">Syllabus</h1>
        <p className="mt-1 text-sm text-neutral-500">{intake.name}</p>
      </header>
      <SyllabusTimeline
        intake={intake}
        topics={topics}
        completed={completed}
        started={started}
      />
    </div>
  );
}
