import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/auth/supabase/server";
import { getDb } from "@/lib/db";
import { staff, type Staff } from "@/lib/db/schema";
import { IS_PREVIEW, PREVIEW_IDS, previewRoleFromCookie } from "@/lib/preview";

// Preview mode: resolve the pretend signed-in staff from the preview_role cookie.
async function previewStaff(): Promise<Staff | null> {
  const role = previewRoleFromCookie((await cookies()).get("preview_role")?.value);
  const rows = await getDb()
    .select()
    .from(staff)
    .where(eq(staff.id, PREVIEW_IDS[role]))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve the signed-in Supabase user to an active staff record.
 * Returns null when nobody is signed in, or the signed-in user has no active
 * staff row. Use this where a missing session is a valid state.
 */
export async function getSessionStaff(): Promise<Staff | null> {
  if (IS_PREVIEW) return previewStaff();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await getDb()
    .select()
    .from(staff)
    .where(eq(staff.id, user.id))
    .limit(1);

  const record = rows[0];
  if (!record || !record.isActive) return null;
  return record;
}

/**
 * Require an active staff session. Redirects to sign-in when not signed in, and
 * to /no-access when signed in without an active staff record (e.g. deactivated).
 */
export async function requireStaff(): Promise<Staff> {
  if (IS_PREVIEW) {
    const s = await previewStaff();
    if (!s) redirect("/no-access");
    return s;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const rows = await getDb()
    .select()
    .from(staff)
    .where(eq(staff.id, user.id))
    .limit(1);

  const record = rows[0];
  if (!record || !record.isActive) redirect("/no-access");
  return record;
}
