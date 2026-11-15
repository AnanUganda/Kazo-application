import { Logo } from "@/components/shell/Logo";
import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in — Kazo Technical School" };

// Branded sign-in. There is no public sign-up; accounts are created by an Admin.
export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-10">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-foreground">
          Staff sign in
        </h1>
        <p className="mb-5 text-sm text-muted-foreground">
          Use the email and password your administrator gave you.
        </p>
        <SignInForm />
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Kazo Technical School · Staff access only
      </p>
    </main>
  );
}
