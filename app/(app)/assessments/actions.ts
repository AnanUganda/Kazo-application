"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { practicalAssessments, students, syllabusTopics } from "@/lib/db/schema";
import { logActivity } from "@/lib/activity";

export type AssessmentState = {
  ok: boolean;
  error?: string;
  values?: {
    topicId?: string;
    date?: string;
    result?: string;
    score?: string;
    notes?: string;
  };
};

/** Record one practical weld assessment attempt (Teacher or Admin). */
export async function recordAssessment(
  _prev: AssessmentState,
  formData: FormData,
): Promise<AssessmentState> {
  const me = await requireRole("teacher", "admin");
  const studentId = String(formData.get("studentId") ?? "");
  const values = {
    topicId: String(formData.get("topicId") ?? ""),
    date: String(formData.get("date") ?? ""),
    result: String(formData.get("result") ?? ""),
    score: String(formData.get("score") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };

  if (!values.topicId) return { ok: false, error: "Choose a module.", values };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date))
    return { ok: false, error: "Choose a date.", values };
  if (values.result !== "pass" && values.result !== "redo")
    return { ok: false, error: "Choose a result.", values };
  let score: number | null = null;
  if (values.score) {
    score = Number(values.score);
    if (!Number.isInteger(score) || score < 0 || score > 100)
      return { ok: false, error: "Score must be a whole number from 0 to 100.", values };
  }

  const db = getDb();
  const student = (
    await db.select().from(students).where(eq(students.id, studentId)).limit(1)
  )[0];
  if (!student) return { ok: false, error: "Student not found.", values };

  // The module must be a practical topic of the student's own intake.
  const topic = (
    await db
      .select({ id: syllabusTopics.id })
      .from(syllabusTopics)
      .where(
        and(
          eq(syllabusTopics.id, values.topicId),
          eq(syllabusTopics.intakeId, student.intakeId),
          eq(syllabusTopics.type, "practical"),
        ),
      )
      .limit(1)
  )[0];
  if (!topic) return { ok: false, error: "Choose a practical module.", values };

  const [row] = await db
    .insert(practicalAssessments)
    .values({
      studentId,
      topicId: topic.id,
      date: values.date,
      result: values.result,
      score,
      notes: values.notes || null,
      createdBy: me.id,
      updatedBy: me.id,
    })
    .returning({ id: practicalAssessments.id });

  await logActivity({
    actorId: me.id,
    action: "assessment.record",
    entityType: "practical_assessment",
    entityId: row.id,
    details: { studentId, result: values.result, score },
  });

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/teacher/students/${studentId}`);
  return { ok: true };
}
