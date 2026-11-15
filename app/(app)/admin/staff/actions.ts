"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/permissions";
import { createAdminClient } from "@/lib/auth/supabase/admin";
import { getDb } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { logActivity } from "@/lib/activity";

const roleEnum = z.enum(["admin", "teacher", "store_keeper", "bible_teacher"]);

const createSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  role: roleEnum,
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type CreateStaffState = {
  ok: boolean;
  error?: string;
  values?: { fullName: string; email: string; role: string };
};

export async function createStaff(
  _prev: CreateStaffState,
  formData: FormData,
): Promise<CreateStaffState> {
  const admin = await requireRole("admin");

  const raw = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  // Preserve non-secret values so the form can refill on failure.
  const keep = { fullName: raw.fullName, email: raw.email, role: raw.role };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form.",
      values: keep,
    };
  }
  const data = parsed.data;

  let userId: string;
  try {
    const supabaseAdmin = createAdminClient();
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw error ?? new Error("No user returned");
    userId = created.user.id;
  } catch {
    return {
      ok: false,
      error:
        "Could not create the sign-in account (the email may already be in use).",
      values: keep,
    };
  }

  try {
    await getDb().insert(staff).values({
      id: userId,
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      createdBy: admin.id,
      updatedBy: admin.id,
    });
  } catch (err) {
    return {
      ok: false,
      error: "The account was created but saving the staff record failed.",
      values: keep,
    };
  }

  await logActivity({
    actorId: admin.id,
    action: "staff.create",
    entityType: "staff",
    entityId: userId,
    details: { email: data.email, role: data.role },
  });

  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function setStaffActive(formData: FormData): Promise<void> {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";

  if (!id) return;
  // Guard: an admin cannot deactivate their own account (avoids lock-out).
  if (id === admin.id && !active) return;

  await getDb()
    .update(staff)
    .set({ isActive: active, updatedAt: new Date(), updatedBy: admin.id })
    .where(eq(staff.id, id));

  await logActivity({
    actorId: admin.id,
    action: active ? "staff.reactivate" : "staff.deactivate",
    entityType: "staff",
    entityId: id,
  });

  revalidatePath("/admin/staff");
}

export async function changeStaffRole(formData: FormData): Promise<void> {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const parsed = roleEnum.safeParse(String(formData.get("role") ?? ""));
  if (!id || !parsed.success) return;
  // Guard: an admin cannot change their own role (avoids removing the last admin).
  if (id === admin.id) return;

  await getDb()
    .update(staff)
    .set({ role: parsed.data, updatedAt: new Date(), updatedBy: admin.id })
    .where(eq(staff.id, id));

  await logActivity({
    actorId: admin.id,
    action: "staff.role_change",
    entityType: "staff",
    entityId: id,
    details: { role: parsed.data },
  });

  revalidatePath("/admin/staff");
}
