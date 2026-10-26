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

/** Term milestone dates for the calendar, for the given intake (or none). */
export function intakeEvents(
  intake: Intake | null,
): { date: string; label: string }[] {
  if (!intake) return [];
  return [
    { date: intake.startDate, label: "Intake starts" },
    { date: intake.semester1Start, label: "Semester 1 starts" },
    { date: intake.semester1End, label: "Semester 1 ends" },
    { date: intake.semester2Start, label: "Semester 2 starts" },
    { date: intake.semester2End, label: "Semester 2 ends" },
    { date: intake.endDate, label: "Intake ends" },
  ];
}
