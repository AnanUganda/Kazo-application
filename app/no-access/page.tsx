import { Logo } from "@/components/shell/Logo";
import { signOut } from "@/lib/auth/actions";

export const metadata = { title: "No access — Kazo Technical School" };

export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted px-4 text-center">
      <Logo />
      <div className="max-w-sm">
        <h1 className="text-lg font-semibold text-foreground">No access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account has no active staff role. Contact your administrator.
        </p>
      </div>
      <form action={signOut}>
        <button type="submit" className="btn-secondary">
          Sign out
        </button>
      </form>
    </main>
  );
}
