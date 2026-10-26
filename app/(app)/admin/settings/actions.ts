"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { appSettings, feeTypes } from "@/lib/db/schema";
import { logActivity } from "@/lib/activity";
import { parseAmountToInt } from "@/lib/format";
import { DEFAULT_FEE_TYPES } from "@/lib/fees";

export async function updateAttendanceThreshold(
  formData: FormData,
): Promise<void> {
  const admin = await requireRole("admin");
  const value = Number(formData.get("attendanceThreshold"));
  if (!Number.isInteger(value) || value < 1 || value > 100) return;

  await getDb()
    .insert(appSettings)
    .values({
      id: "global",
      attendanceThreshold: value,
      createdBy: admin.id,
      updatedBy: admin.id,
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: {
        attendanceThreshold: value,
        updatedAt: new Date(),
        updatedBy: admin.id,
      },
    });

  await logActivity({
    actorId: admin.id,
    action: "settings.attendance_threshold",
    entityType: "app_settings",
    entityId: "global",
    details: { attendanceThreshold: value },
  });

  revalidatePath("/admin/settings");
}

export async function updateFeeAmount(formData: FormData): Promise<void> {
  const admin = await requireRole("admin");
  const code = String(formData.get("code") ?? "");
  const amount = parseAmountToInt(String(formData.get("amount") ?? ""));
  if (!code || amount === null || amount < 0) return;

  await getDb()
    .update(feeTypes)
    .set({ defaultAmount: amount, updatedAt: new Date(), updatedBy: admin.id })
    .where(eq(feeTypes.code, code));

  await logActivity({
    actorId: admin.id,
    action: "settings.fee_amount",
    entityType: "fee_type",
    entityId: code,
    details: { defaultAmount: amount },
  });

  revalidatePath("/admin/settings");
}

export async function restoreDefaultFeeTypes(): Promise<void> {
  const admin = await requireRole("admin");

  await getDb()
    .insert(feeTypes)
    .values(
      DEFAULT_FEE_TYPES.map((f) => ({
        code: f.code,
        name: f.name,
        defaultAmount: f.defaultAmount,
        appliesToSemester: f.appliesToSemester,
        sortOrder: f.sortOrder,
        createdBy: admin.id,
        updatedBy: admin.id,
      })),
    )
    .onConflictDoNothing({ target: feeTypes.code });

  await logActivity({
    actorId: admin.id,
    action: "settings.fee_types_restore_defaults",
    entityType: "fee_type",
  });

  revalidatePath("/admin/settings");
}
