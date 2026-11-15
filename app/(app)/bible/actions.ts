"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { lessonAbsences, lessonLogs } from "@/lib/db/schema";
import { getActiveIntake } from "@/lib/intake";
import { logActivity } from "@/lib/activity";
import { daysSince } from "@/lib/format";

export type BibleClassState = {
  ok: boolean;
  error?: string;
  values?: {
    date?: string;
    topic?: string;
    notes?: string;
    absentIds?: string[];
  };
};

const EDIT_WINDOW_DAYS = 7;

function parse(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const topic = String(formData.get("topic") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const absentIds: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("absent_") && String(value) === "on")
      absentIds.push(key.slice(7));
  }
  let error: string | undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) error = "Choose a date.";
  else if (!topic) error = "Enter the scripture or topic.";
  return { date, topic, notes, absentIds, error };
}

function revalidate() {
  revalidatePath("/bible");
  revalidatePath("/bible/log");
  revalidatePath("/admin/lessons");
}

/** One Bible class per day: is there already one on this date? */
async function dateTaken(intakeId: string, date: string, exceptId?: string) {
  const rows = await getDb()
    .select({ id: lessonLogs.id })
    .from(lessonLogs)
    .where(
      and(
        eq(lessonLogs.intakeId, intakeId),
        eq(lessonLogs.session, "bible"),
        eq(lessonLogs.date, date),
        isNull(lessonLogs.archivedAt),
        exceptId ? ne(lessonLogs.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function createBibleClass(
  _prev: BibleClassState,
  formData: FormData,
): Promise<BibleClassState> {
  const me = await requireRole("bible_teacher", "admin");
  const p = parse(formData);
  const values = {
    date: p.date,
    topic: p.topic,
    notes: p.notes,
    absentIds: p.absentIds,
  };
  if (p.error) return { ok: false, error: p.error, values };

  const intake = await getActiveIntake();
  if (!intake) return { ok: false, error: "No active intake.", values };
  if (await dateTaken(intake.id, p.date))
    return {
      ok: false,
      error: "A Bible class is already logged for that date. Edit it instead.",
      values,
    };

  const newId = await getDb().transaction(async (tx) => {
    const [log] = await tx
      .insert(lessonLogs)
      .values({
        intakeId: intake.id,
        teacherId: me.id,
        date: p.date,
        session: "bible",
        topic: p.topic,
        notes: p.notes || null,
        createdBy: me.id,
        updatedBy: me.id,
      })
      .returning({ id: lessonLogs.id });

    if (p.absentIds.length)
      await tx.insert(lessonAbsences).values(
        p.absentIds.map((sid) => ({
          lessonLogId: log.id,
          studentId: sid,
          createdBy: me.id,
          updatedBy: me.id,
        })),
      );
    return log.id;
  });

  // Outside the transaction: logActivity uses its own connection.
  await logActivity({
    actorId: me.id,
    action: "bible.class_create",
    entityType: "lesson_log",
    entityId: newId,
    details: { absent: p.absentIds.length },
  });

  revalidate();
  redirect(me.role === "admin" ? "/admin/lessons" : "/bible");
}

export async function updateBibleClass(
  _prev: BibleClassState,
  formData: FormData,
): Promise<BibleClassState> {
  const me = await requireRole("bible_teacher", "admin");
  const logId = String(formData.get("logId") ?? "");
  const existing = logId
    ? (
        await getDb()
          .select()
          .from(lessonLogs)
          .where(eq(lessonLogs.id, logId))
          .limit(1)
      )[0]
    : undefined;
  if (!existing || existing.session !== "bible")
    return { ok: false, error: "Class not found." };

  const canEdit =
    me.role === "admin" ||
    (existing.teacherId === me.id &&
      daysSince(existing.createdAt) < EDIT_WINDOW_DAYS);
  if (!canEdit)
    return { ok: false, error: "You can no longer edit this class (7-day limit)." };

  const p = parse(formData);
  const values = {
    date: p.date,
    topic: p.topic,
    notes: p.notes,
    absentIds: p.absentIds,
  };
  if (p.error) return { ok: false, error: p.error, values };
  if (await dateTaken(existing.intakeId, p.date, logId))
    return {
      ok: false,
      error: "Another Bible class is already logged for that date.",
      values,
    };

  await getDb().transaction(async (tx) => {
    await tx
      .update(lessonLogs)
      .set({
        date: p.date,
        topic: p.topic,
        notes: p.notes || null,
        updatedAt: new Date(),
        updatedBy: me.id,
      })
      .where(eq(lessonLogs.id, logId));
    await tx.delete(lessonAbsences).where(eq(lessonAbsences.lessonLogId, logId));
    if (p.absentIds.length)
      await tx.insert(lessonAbsences).values(
        p.absentIds.map((sid) => ({
          lessonLogId: logId,
          studentId: sid,
          createdBy: me.id,
          updatedBy: me.id,
        })),
      );
  });

  await logActivity({
    actorId: me.id,
    action: "bible.class_update",
    entityType: "lesson_log",
    entityId: logId,
  });

  revalidate();
  return { ok: true };
}
