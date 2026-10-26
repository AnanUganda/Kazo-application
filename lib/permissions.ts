import "server-only";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import type { Staff, StaffRole } from "@/lib/db/schema";

/**
 * Server-side role gate. Every protected page loader and server action calls
 * this (or requireStaff) first — hiding nav in the UI is never the permission
 * boundary. Redirects to /no-access when the role is not permitted.
 */
export async function requireRole(...roles: StaffRole[]): Promise<Staff> {
  const current = await requireStaff();
  if (!roles.includes(current.role)) redirect("/no-access");
  return current;
}

/** Default landing path for each role after sign-in. */
export function homePathForRole(role: StaffRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "store_keeper":
      return "/store";
  }
}
