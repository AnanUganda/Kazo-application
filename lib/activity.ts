import "server-only";
import { getDb } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";

/** Append an entry to the cross-cutting activity trail. */
export async function logActivity(entry: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  await getDb()
    .insert(activityLog)
    .values({
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      details: entry.details ?? null,
    });
}
