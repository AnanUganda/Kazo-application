import { Logo } from "@/components/shell/Logo";
import { ApplyForm } from "./ApplyForm";

export const metadata = {
  title: "Apply — Kazo Technical School",
  description: "Apply to join the welding course at Kazo Technical School.",
};

// Public page — no sign-in required.
export default function ApplyPage() {
  return (
    <main className="min-h-screen bg-muted px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="page-title">
            Apply to Kazo Technical School
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill in your details below. After you apply, the school will contact
            you about the UGX 35,000 registration fee and the next steps.
          </p>
          <div className="mt-6">
            <ApplyForm />
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Kazo Technical School · Welding course application
        </p>
      </div>
    </main>
  );
}
