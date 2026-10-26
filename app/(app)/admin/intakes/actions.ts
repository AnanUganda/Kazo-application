"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { intakes } from "@/lib/db/schema";
import { logActivity } from "@/lib/activity";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter an intake name."),
  startDate: dateStr,
  endDate: dateStr,
  semester1Start: dateStr,
  semester1End: dateStr,
  semester2Start: dateStr,
  semester2End: dateStr,
});

export type CreateIntakeState = {
  ok: boolean;
  error?: string;
  values?: Record<string, string>;
};

function orderingError(d: Record<string, string>): string | null {
  // start <= s1Start < s1End < s2Start < s2End <= end
  const order = [
    ["Start date", d.startDate],
    ["Semester 1 start", d.semester1Start],
    ["Semester 1 end", d.semester1End],
    ["Semester 2 start", d.semester2Start],
    ["Semester 2 end", d.semester2End],
    ["End date", d.endDate],
  ] as const;
  for (let i = 1; i < order.length; i++) {
    if (order[i][1] < order[i - 1][1]) {
      return `${order[i][0]} must be on or after ${order[i - 1][0].toLowerCase()}.`;
    }
  }
  return null;
}

export async function createIntake(
  _prev: CreateIntakeState,
  formData: FormData,
): Promise<CreateIntakeState> {
  const admin = await requireRole("admin");

  const raw = {
    name: String(formData.get("name") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    semester1Start: String(formData.get("semester1Start") ?? ""),
    semester1End: String(formData.get("semester1End") ?? ""),
    semester2Start: String(formData.get("semester2Start") ?? ""),
    semester2End: String(formData.get("semester2End") ?? ""),
  };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form.",
      values: raw,
    };
  }

  const orderErr = orderingError(parsed.data);
  if (orderErr) return { ok: false, error: orderErr, values: raw };

  const db = getDb();

  // One active intake at a time.
  const active = await db
    .select({ id: intakes.id })
    .from(intakes)
    .where(eq(intakes.status, "active"))
    .limit(1);
  if (active[0]) {
    return {
      ok: false,
      error:
        "There is already an active intake. Close it before creating a new one.",
      values: raw,
    };
  }

  try {
    const [created] = await db
      .insert(intakes)
      .values({
        name: parsed.data.name,
        status: "active",
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        semester1Start: parsed.data.semester1Start,
        semester1End: parsed.data.semester1End,
        semester2Start: parsed.data.semester2Start,
        semester2End: parsed.data.semester2End,
        createdBy: admin.id,
        updatedBy: admin.id,
      })
      .returning({ id: intakes.id });

    await logActivity({
      actorId: admin.id,
      action: "intake.create",
      entityType: "intake",
      entityId: created.id,
      details: { name: parsed.data.name },
    });
  } catch {
    // Partial unique index is the backstop if two creates race.
    return {
      ok: false,
      error: "Could not create the intake (an active intake may already exist).",
      values: raw,
    };
  }

  revalidatePath("/admin/intakes");
  return { ok: true };
}

export async function closeIntake(formData: FormData): Promise<void> {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const now = new Date();
  await getDb()
    .update(intakes)
    .set({
      status: "archived",
      archivedAt: now,
      archivedBy: admin.id,
      updatedAt: now,
      updatedBy: admin.id,
    })
    .where(and(eq(intakes.id, id), eq(intakes.status, "active")));

  await logActivity({
    actorId: admin.id,
    action: "intake.close",
    entityType: "intake",
    entityId: id,
  });

  revalidatePath("/admin/intakes");
}
