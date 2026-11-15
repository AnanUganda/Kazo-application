/**
 * Preview mode: runs the real app against an in-memory Postgres (pglite) with
 * seeded sample data and sign-in bypassed, so the UI can be clicked through
 * without a database or an account. Enabled only when PREVIEW_MODE=1.
 * This is a demo/testing harness and must never be enabled in production.
 */
// Hard-off in production builds: preview bypasses sign-in, so a stray
// PREVIEW_MODE=1 on the host must never expose the app.
export const IS_PREVIEW =
  process.env.PREVIEW_MODE === "1" && process.env.NODE_ENV !== "production";

export const PREVIEW_IDS = {
  admin: "11111111-1111-4111-8111-111111111111",
  teacher: "22222222-2222-4222-8222-222222222222",
  store_keeper: "33333333-3333-4333-8333-333333333333",
  bible_teacher: "44444444-4444-4444-8444-444444444444",
} as const;

export type PreviewRole = keyof typeof PREVIEW_IDS;

export function previewRoleFromCookie(value: string | undefined): PreviewRole {
  if (
    value === "teacher" ||
    value === "store_keeper" ||
    value === "bible_teacher" ||
    value === "admin"
  ) {
    return value;
  }
  return "admin";
}
