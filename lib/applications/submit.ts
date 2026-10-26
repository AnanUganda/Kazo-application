import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { applications, applyThrottle, intakes } from "@/lib/db/schema";
import { logActivity } from "@/lib/activity";

// Static salt: this hash exists only to avoid storing raw IPs for throttling,
// not for secrecy.
const IP_SALT = "kts-apply-throttle-v1";
const WINDOW_SHORT_SECONDS = 60;
const MAX_PER_SHORT_WINDOW = 3;
const WINDOW_HOUR_SECONDS = 3600;
const MAX_PER_HOUR = 15;

const optional = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter the applicant's full name.").max(120),
  phone: z.string().trim().min(5, "Enter a WhatsApp phone number.").max(30),
  email: z.union([z.string().trim().email().max(160), z.literal("")]).optional(),
  dob: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
    .optional(),
  location: optional(160),
  educationLevel: optional(120),
  priorExperience: optional(1000),
  heardAbout: optional(200),
  nextOfKinName: optional(120),
  nextOfKinPhone: optional(30),
  nextOfKinRelationship: optional(60),
  // Honeypot: must stay empty. Bots fill it.
  website: optional(200),
});

export type SubmitResult =
  | { ok: true }
  | { ok: false; error: string; status?: number };

const nullIfEmpty = (v: string | undefined) => (v && v !== "" ? v : null);

export async function submitApplication(
  input: Record<string, unknown>,
  ip: string,
): Promise<SubmitResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form.",
    };
  }
  const data = parsed.data;

  // Honeypot tripped: pretend success, insert nothing.
  if (data.website && data.website.trim() !== "") {
    return { ok: true };
  }

  const db = getDb();
  const ipHash = createHash("sha256").update(ip + IP_SALT).digest("hex");

  // Rate limit by hashed IP.
  const shortSince = new Date(Date.now() - WINDOW_SHORT_SECONDS * 1000);
  const hourSince = new Date(Date.now() - WINDOW_HOUR_SECONDS * 1000);

  const [{ count: recentCount } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applyThrottle)
    .where(
      and(eq(applyThrottle.ipHash, ipHash), gte(applyThrottle.createdAt, shortSince)),
    );
  const [{ count: hourCount } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applyThrottle)
    .where(
      and(eq(applyThrottle.ipHash, ipHash), gte(applyThrottle.createdAt, hourSince)),
    );

  if (recentCount >= MAX_PER_SHORT_WINDOW || hourCount >= MAX_PER_HOUR) {
    return {
      ok: false,
      error: "Too many submissions. Please try again in a few minutes.",
      status: 429,
    };
  }

  // Attach to the active intake if there is one.
  const activeIntake = (
    await db
      .select({ id: intakes.id })
      .from(intakes)
      .where(eq(intakes.status, "active"))
      .limit(1)
  )[0];

  const [created] = await db
    .insert(applications)
    .values({
      intakeId: activeIntake?.id ?? null,
      fullName: data.fullName,
      phone: data.phone,
      email: nullIfEmpty(data.email),
      dob: nullIfEmpty(data.dob),
      location: nullIfEmpty(data.location),
      educationLevel: nullIfEmpty(data.educationLevel),
      priorExperience: nullIfEmpty(data.priorExperience),
      heardAbout: nullIfEmpty(data.heardAbout),
      nextOfKinName: nullIfEmpty(data.nextOfKinName),
      nextOfKinPhone: nullIfEmpty(data.nextOfKinPhone),
      nextOfKinRelationship: nullIfEmpty(data.nextOfKinRelationship),
    })
    .returning({ id: applications.id });

  await db.insert(applyThrottle).values({ ipHash });
  // Opportunistic prune of throttle rows older than a day.
  await db
    .delete(applyThrottle)
    .where(sql`${applyThrottle.createdAt} < now() - interval '1 day'`);

  await logActivity({
    actorId: null,
    action: "application.submit",
    entityType: "application",
    entityId: created.id,
    details: { source: "public_form" },
  });

  return { ok: true };
}
