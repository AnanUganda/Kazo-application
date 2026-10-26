import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { lessonLogs, lessonTopicProgress, syllabusTopics } from "@/lib/db/schema";

/** Topics (non-archived) for an intake plus which are started/completed. */
export async function loadSyllabus(intakeId: string) {
  const db = getDb();

  const topics = await db
    .select()
    .from(syllabusTopics)
    .where(
      and(
        eq(syllabusTopics.intakeId, intakeId),
        isNull(syllabusTopics.archivedAt),
      ),
    )
    .orderBy(
      asc(syllabusTopics.semester),
      asc(syllabusTopics.targetWeek),
      asc(syllabusTopics.sortOrder),
    );

  const progress = await db
    .select({
      topicId: lessonTopicProgress.topicId,
      status: lessonTopicProgress.status,
    })
    .from(lessonTopicProgress)
    .innerJoin(lessonLogs, eq(lessonTopicProgress.lessonLogId, lessonLogs.id))
    .where(eq(lessonLogs.intakeId, intakeId));

  const completed = new Set(
    progress.filter((p) => p.status === "completed").map((p) => p.topicId),
  );
  const started = new Set(
    progress.filter((p) => p.status === "started").map((p) => p.topicId),
  );

  return { topics, completed, started };
}
