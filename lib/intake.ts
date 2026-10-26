import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { intakes, type Intake } from "@/lib/db/schema";

/** The single active intake, or null if none. */
export async function getActiveIntake(): Promise<Intake | null> {
  const rows = await getDb()
    .select()
    .from(intakes)
    .where(eq(intakes.status, "active"))
    .limit(1);
  return rows[0] ?? null;
}
