import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Root: send each signed-in staff member to their role home.
export default async function Index() {
  const me = await requireStaff();
  redirect(homePathForRole(me.role));
}
