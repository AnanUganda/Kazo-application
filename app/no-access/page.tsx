import Link from "next/link";
import { Logo } from "@/components/shell/Logo";

export const metadata = { title: "No access — Kazo Technical School" };

export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-100 px-4 text-center">
      <Logo />
      <div className="max-w-sm">
        <h1 className="text-lg font-semibold text-neutral-900">
          No access
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Your account is signed in but has no active staff role on this
          dashboard. Please contact your administrator.
        </p>
      </div>
      <Link href="/handler/sign-out" className="btn-secondary">
        Sign out
      </Link>
    </main>
  );
}
