import { requireStaff } from "@/lib/auth/session";
import { AppShell } from "@/components/shell/AppShell";
import { IS_PREVIEW } from "@/lib/preview";

// Authenticated area: every page under here is behind an active staff session.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireStaff();
  return (
    <AppShell
      role={me.role}
      name={me.fullName}
      email={me.email}
      preview={IS_PREVIEW}
    >
      {children}
    </AppShell>
  );
}
