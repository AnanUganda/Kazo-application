import "server-only";
import { StackServerApp } from "@stackframe/stack";

/**
 * Neon Auth (Stack Auth) server app. Keys are read from env:
 *   NEXT_PUBLIC_STACK_PROJECT_ID
 *   NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
 *   STACK_SECRET_SERVER_KEY
 *
 * Public self sign-up is disabled in the Neon Auth dashboard; accounts are
 * created only by an Admin (see app/(app)/admin/staff) or the seed script.
 */
export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    signIn: "/sign-in",
    afterSignIn: "/",
    afterSignOut: "/sign-in",
    home: "/",
  },
});
