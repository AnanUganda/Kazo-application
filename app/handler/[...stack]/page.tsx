import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/lib/auth/stack";

// Neon Auth (Stack) routes: sign-in, sign-out, password reset, etc.
export default function Handler(props: {
  params: Promise<{ stack: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <StackHandler fullPage app={stackServerApp} routeProps={props} />;
}
