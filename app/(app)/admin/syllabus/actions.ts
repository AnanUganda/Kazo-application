"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { syllabusTopics } from "@/lib/db/schema";
import { getActiveIntake } from "@/lib/intake";
import { logActivity } from "@/lib/activity";
import { KTS_SYLLABUS_MODULES } from "@/lib/syllabus-defaults";

export type TopicState = {
  ok: boolean;
  error?: string;
  values?: Record<string, string>;
};

const topicSchema = z.object({
  semester: z.coerce.number().int().min(1).max(2),
  title: z.string().trim().min(2, "Enter a topic title.").max(200),
  type: z.enum(["theory", "practical"]),
  targetWeek: z.coerce.number().int().min(1, "Target week must be 1+").max(52),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function addTopic(
  _prev: TopicState,
  formData: FormData,
): Promise<TopicState> {
  const admin = await requireRole("admin");
  const intake = await getActiveIntake();
  if (!intake)
    return { ok: false, error: "No active intake. Create one first." };

  const raw = {
    semester: String(formData.get("semester") ?? ""),
    title: String(formData.get("title") ?? ""),
    type: String(formData.get("type") ?? ""),
    targetWeek: String(formData.get("targetWeek") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
  const parsed = topicSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the form.",
      values: raw,
    };
  }

  const [created] = await getDb()
    .insert(syllabusTopics)
    .values({
      intakeId: intake.id,
      semester: parsed.data.semester,
      title: parsed.data.title,
      type: parsed.data.type,
      targetWeek: parsed.data.targetWeek,
      description: parsed.data.description || null,
      createdBy: admin.id,
      updatedBy: admin.id,
    })
    .returning({ id: syllabusTopics.id });

  await logActivity({
    actorId: admin.id,
    action: "syllabus.topic_add",
    entityType: "syllabus_topic",
    entityId: created.id,
    details: { title: parsed.data.title, semester: parsed.data.semester },
  });

  revalidatePath("/admin/syllabus");
  return { ok: true };
}

export async function updateTopic(formData: FormData): Promise<void> {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = topicSchema.safeParse({
    semester: String(formData.get("semester") ?? ""),
    title: String(formData.get("title") ?? ""),
    type: String(formData.get("type") ?? ""),
    targetWeek: String(formData.get("targetWeek") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  if (!id || !parsed.success) return;

  await getDb()
    .update(syllabusTopics)
    .set({
      semester: parsed.data.semester,
      title: parsed.data.title,
      type: parsed.data.type,
      targetWeek: parsed.data.targetWeek,
      description: parsed.data.description || null,
      updatedAt: new Date(),
      updatedBy: admin.id,
    })
    .where(eq(syllabusTopics.id, id));

  // Mid-semester changes are logged.
  await logActivity({
    actorId: admin.id,
    action: "syllabus.topic_update",
    entityType: "syllabus_topic",
    entityId: id,
    details: { title: parsed.data.title },
  });

  revalidatePath("/admin/syllabus");
}

export async function archiveTopic(formData: FormData): Promise<void> {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const now = new Date();
  await getDb()
    .update(syllabusTopics)
    .set({ archivedAt: now, archivedBy: admin.id, updatedAt: now, updatedBy: admin.id })
    .where(eq(syllabusTopics.id, id));

  await logActivity({
    actorId: admin.id,
    action: "syllabus.topic_archive",
    entityType: "syllabus_topic",
    entityId: id,
  });

  revalidatePath("/admin/syllabus");
}

/** Copy a previous intake's (non-archived) topics into the active intake. */
export async function copyFromIntake(formData: FormData): Promise<void> {
  const admin = await requireRole("admin");
  const sourceId = String(formData.get("sourceIntakeId") ?? "");
  if (!sourceId) return;

  const intake = await getActiveIntake();
  if (!intake || sourceId === intake.id) return;

  const db = getDb();
  const source = await db
    .select()
    .from(syllabusTopics)
    .where(
      and(
        eq(syllabusTopics.intakeId, sourceId),
        isNull(syllabusTopics.archivedAt),
      ),
    );
  if (source.length === 0) return;

  await db.insert(syllabusTopics).values(
    source.map((t) => ({
      intakeId: intake.id,
      semester: t.semester,
      title: t.title,
      type: t.type,
      targetWeek: t.targetWeek,
      description: t.description,
      sortOrder: t.sortOrder,
      createdBy: admin.id,
      updatedBy: admin.id,
    })),
  );

  await logActivity({
    actorId: admin.id,
    action: "syllabus.copy_plan",
    entityType: "intake",
    entityId: intake.id,
    details: { from: sourceId, topics: source.length },
  });

  revalidatePath("/admin/syllabus");
}

/** Load the official 18-module Kazo Technical School syllabus (2 semesters x 13 weeks). */
export async function loadDefaultKtsSyllabus(): Promise<void> {
  const admin = await requireRole("admin");
  const intake = await getActiveIntake();
  if (!intake) return;

  const db = getDb();
  const existing = await db
    .select({ title: syllabusTopics.title })
    .from(syllabusTopics)
    .where(
      and(
        eq(syllabusTopics.intakeId, intake.id),
        isNull(syllabusTopics.archivedAt),
      ),
    );
  const existingTitles = new Set(existing.map((e) => e.title.toLowerCase()));

  const toInsert = KTS_SYLLABUS_MODULES.filter(
    (m) => !existingTitles.has(m.title.toLowerCase()),
  );
  if (toInsert.length === 0) return;

  await db.insert(syllabusTopics).values(
    toInsert.map((m) => ({
      intakeId: intake.id,
      semester: m.semester,
      title: m.title,
      type: m.type,
      targetWeek: m.targetWeek,
      description: m.description,
      sortOrder: m.moduleNumber,
      createdBy: admin.id,
      updatedBy: admin.id,
    })),
  );

  await logActivity({
    actorId: admin.id,
    action: "syllabus.load_kts_defaults",
    entityType: "intake",
    entityId: intake.id,
    details: { modulesLoaded: toInsert.length },
  });

  revalidatePath("/admin/syllabus");
  revalidatePath("/teacher/syllabus");
  revalidatePath("/admin");
  revalidatePath("/teacher");
}
