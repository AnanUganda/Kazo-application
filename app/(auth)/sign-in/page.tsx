import { Logo } from "@/components/shell/Logo";
import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in — Kazo Technical School" };

// Branded sign-in. There is no public sign-up; accounts are created by an Admin.
export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 px-4 py-10">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-neutral-900">
          Staff sign in
        </h1>
        <p className="mb-5 text-sm text-neutral-500">
          Use the email and password your administrator gave you.
        </p>
        <SignInForm />
      </div>
      <p className="mt-6 text-center text-xs text-neutral-500">
        Kazo Technical School · Staff access only
      </p>
    </main>
  );
}
