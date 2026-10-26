"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { previewRoleFromCookie } from "@/lib/preview";
import { homePathForRole } from "@/lib/permissions";

/** Preview-only: switch the pretend signed-in role. */
export async function setPreviewRole(formData: FormData): Promise<void> {
  const role = previewRoleFromCookie(String(formData.get("role") ?? ""));
  (await cookies()).set("preview_role", role, { path: "/" });
  redirect(homePathForRole(role));
}
