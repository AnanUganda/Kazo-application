"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  equipment,
  equipmentFaults,
  lessonAbsences,
  lessonIssues,
  lessonLogs,
  lessonTopicProgress,
} from "@/lib/db/schema";
import { getActiveIntake } from "@/lib/intake";
import { logActivity } from "@/lib/activity";
import { daysSince } from "@/lib/format";

export type ActionState = {
  ok: boolean;
  error?: string;
  values?: {
    date?: string;
    session?: "morning" | "afternoon";
    notes?: string;
    progress?: Record<string, "started" | "completed">;
    absentIds?: string[];
    issue?: {
      description: string;
      isMachine: boolean;
      machineLabel?: string | null;
    };
  };
};

const EDIT_WINDOW_DAYS = 7;

type Parsed = {
  date: string;
  session: "morning" | "afternoon";
  notes: string | null;
  progress: { topicId: string; status: "started" | "completed" }[];
  absentIds: string[];
  issue: { description: string; isMachine: boolean; machineLabel: string | null } | null;
  error?: string;
};

function toValues(p: Parsed): NonNullable<ActionState["values"]> {
  const progressMap: Record<string, "started" | "completed"> = {};
  for (const pr of p.progress) {
    progressMap[pr.topicId] = pr.status;
  }
  return {
    date: p.date,
    session: p.session,
    notes: p.notes ?? "",
    progress: progressMap,
    absentIds: p.absentIds,
    issue: p.issue ?? undefined,
  };
}

function parseForm(formData: FormData): Parsed {
  const date = String(formData.get("date") ?? "");
  const session = String(formData.get("session") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  const base: Parsed = {
    date,
    session: session as "morning" | "afternoon",
    notes: notes || null,
    progress: [],
    absentIds: [],
    issue: null,
  };

  for (const [key, value] of formData.entries()) {
    const v = String(value);
    if (key.startsWith("topic_")) {
      if (v === "started" || v === "completed")
        base.progress.push({ topicId: key.slice(6), status: v });
    } else if (key.startsWith("absent_")) {
      if (v === "on" || v === "true") base.absentIds.push(key.slice(7));
    }
  }

  const issueDesc = String(formData.get("issueDescription") ?? "").trim();
  if (issueDesc) {
    base.issue = {
      description: issueDesc,
      isMachine: String(formData.get("issueMachine") ?? "") === "on",
      machineLabel: String(formData.get("issueMachineLabel") ?? "").trim() || null,
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ...base, error: "Choose a date." };
  if (session !== "morning" && session !== "afternoon")
    return { ...base, error: "Choose a session." };

  return base;
}

export async function createLessonLog(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireRole("teacher", "admin");
  const p = parseForm(formData);
  const values = toValues(p);
  const intake = await getActiveIntake();
  if (!intake) return { ok: false, error: "No active intake.", values };

  if (p.error) return { ok: false, error: p.error, values };

  const db = getDb();
  await db.transaction(async (tx) => {
    const [log] = await tx
      .insert(lessonLogs)
      .values({
        intakeId: intake.id,
        teacherId: me.id,
        date: p.date,
        session: p.session,
        notes: p.notes,
        createdBy: me.id,
        updatedBy: me.id,
      })
      .returning({ id: lessonLogs.id });

    if (p.progress.length)
      await tx.insert(lessonTopicProgress).values(
        p.progress.map((pr) => ({
          lessonLogId: log.id,
          topicId: pr.topicId,
          status: pr.status,
          createdBy: me.id,
          updatedBy: me.id,
        })),
      );

    if (p.absentIds.length)
      await tx.insert(lessonAbsences).values(
        p.absentIds.map((sid) => ({
          lessonLogId: log.id,
          studentId: sid,
          createdBy: me.id,
          updatedBy: me.id,
        })),
      );

    if (p.issue) {
      const [insertedIssue] = await tx
        .insert(lessonIssues)
        .values({
          lessonLogId: log.id,
          description: p.issue.description,
          isMachineIssue: p.issue.isMachine,
          machineLabel: p.issue.machineLabel,
          createdBy: me.id,
          updatedBy: me.id,
        })
        .returning({ id: lessonIssues.id });

      if (p.issue.isMachine && p.issue.machineLabel) {
        const matchedEq = (
          await tx
            .select()
            .from(equipment)
            .where(
              and(
                ilike(equipment.assetCode, p.issue.machineLabel),
                isNull(equipment.archivedAt),
              ),
            )
            .limit(1)
        )[0];

        if (matchedEq) {
          await tx.insert(equipmentFaults).values({
            equipmentId: matchedEq.id,
            lessonIssueId: insertedIssue.id,
            reportedAt: p.date,
            problem: p.issue.description,
            reportedBy: me.fullName,
            status: "open",
            createdBy: me.id,
            updatedBy: me.id,
          });
          if (matchedEq.status === "working") {
            await tx
              .update(equipment)
              .set({
                status: "needs_repair",
                updatedAt: new Date(),
                updatedBy: me.id,
              })
              .where(eq(equipment.id, matchedEq.id));
          }
        }
      }
    }

    await logActivity({
      actorId: me.id,
      action: "lesson.log_create",
      entityType: "lesson_log",
      entityId: log.id,
      details: { absent: p.absentIds.length, topics: p.progress.length },
    });
  });

  revalidatePath("/teacher/log");
  revalidatePath("/admin/lessons");
  revalidatePath("/admin/equipment");
  revalidatePath("/store/equipment");
  redirect("/teacher/log");
}

export async function updateLessonLog(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireStaff();
  const logId = String(formData.get("logId") ?? "");
  if (!logId) return { ok: false, error: "Missing log." };

  const existing = (
    await getDb().select().from(lessonLogs).where(eq(lessonLogs.id, logId)).limit(1)
  )[0];
  if (!existing) return { ok: false, error: "Log not found." };

  const canEdit =
    me.role === "admin" ||
    (existing.teacherId === me.id &&
      daysSince(existing.createdAt) < EDIT_WINDOW_DAYS);
  if (!canEdit)
    return { ok: false, error: "You can no longer edit this log (7-day limit)." };

  const p = parseForm(formData);
  const values = toValues(p);
  if (p.error) return { ok: false, error: p.error, values };

  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(lessonLogs)
      .set({
        date: p.date,
        session: p.session,
        notes: p.notes,
        updatedAt: new Date(),
        updatedBy: me.id,
      })
      .where(eq(lessonLogs.id, logId));

    // Replace children.
    await tx.delete(lessonTopicProgress).where(eq(lessonTopicProgress.lessonLogId, logId));
    await tx.delete(lessonAbsences).where(eq(lessonAbsences.lessonLogId, logId));
    await tx.delete(lessonIssues).where(eq(lessonIssues.lessonLogId, logId));

    if (p.progress.length)
      await tx.insert(lessonTopicProgress).values(
        p.progress.map((pr) => ({
          lessonLogId: logId,
          topicId: pr.topicId,
          status: pr.status,
          createdBy: me.id,
          updatedBy: me.id,
        })),
      );
    if (p.absentIds.length)
      await tx.insert(lessonAbsences).values(
        p.absentIds.map((sid) => ({
          lessonLogId: logId,
          studentId: sid,
          createdBy: me.id,
          updatedBy: me.id,
        })),
      );
    if (p.issue)
      await tx.insert(lessonIssues).values({
        lessonLogId: logId,
        description: p.issue.description,
        isMachineIssue: p.issue.isMachine,
        machineLabel: p.issue.machineLabel,
        createdBy: me.id,
        updatedBy: me.id,
      });

    await logActivity({
      actorId: me.id,
      action: "lesson.log_update",
      entityType: "lesson_log",
      entityId: logId,
    });
  });

  revalidatePath("/teacher/log");
  revalidatePath("/admin/lessons");
  return { ok: true };
}
