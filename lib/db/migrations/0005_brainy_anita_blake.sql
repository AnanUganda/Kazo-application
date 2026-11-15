CREATE TYPE "public"."assessment_result" AS ENUM('pass', 'redo');--> statement-breakpoint
ALTER TYPE "public"."lesson_session" ADD VALUE 'bible';--> statement-breakpoint
ALTER TYPE "public"."staff_role" ADD VALUE 'bible_teacher';--> statement-breakpoint
CREATE TABLE "practical_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"date" date NOT NULL,
	"result" "assessment_result" NOT NULL,
	"score" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	CONSTRAINT "assessment_score_range" CHECK ("practical_assessments"."score" IS NULL OR ("practical_assessments"."score" >= 0 AND "practical_assessments"."score" <= 100))
);
--> statement-breakpoint
ALTER TABLE "lesson_logs" ADD COLUMN "topic" text;--> statement-breakpoint
ALTER TABLE "practical_assessments" ADD CONSTRAINT "practical_assessments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practical_assessments" ADD CONSTRAINT "practical_assessments_topic_id_syllabus_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."syllabus_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_assessment_student" ON "practical_assessments" USING btree ("student_id");