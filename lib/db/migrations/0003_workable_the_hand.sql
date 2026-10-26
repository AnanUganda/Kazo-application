CREATE TYPE "public"."issue_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."lesson_session" AS ENUM('morning', 'afternoon');--> statement-breakpoint
CREATE TYPE "public"."topic_progress_status" AS ENUM('started', 'completed');--> statement-breakpoint
CREATE TYPE "public"."topic_type" AS ENUM('theory', 'practical');--> statement-breakpoint
CREATE TABLE "lesson_absences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_log_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid
);
--> statement-breakpoint
CREATE TABLE "lesson_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_log_id" uuid NOT NULL,
	"description" text NOT NULL,
	"is_machine_issue" boolean DEFAULT false NOT NULL,
	"machine_label" text,
	"status" "issue_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid
);
--> statement-breakpoint
CREATE TABLE "lesson_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intake_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"date" date NOT NULL,
	"session" "lesson_session" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid
);
--> statement-breakpoint
CREATE TABLE "lesson_topic_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_log_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"status" "topic_progress_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid
);
--> statement-breakpoint
CREATE TABLE "syllabus_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intake_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"title" text NOT NULL,
	"type" "topic_type" NOT NULL,
	"target_week" integer NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid
);
--> statement-breakpoint
ALTER TABLE "lesson_absences" ADD CONSTRAINT "lesson_absences_lesson_log_id_lesson_logs_id_fk" FOREIGN KEY ("lesson_log_id") REFERENCES "public"."lesson_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_absences" ADD CONSTRAINT "lesson_absences_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_issues" ADD CONSTRAINT "lesson_issues_lesson_log_id_lesson_logs_id_fk" FOREIGN KEY ("lesson_log_id") REFERENCES "public"."lesson_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_logs" ADD CONSTRAINT "lesson_logs_intake_id_intakes_id_fk" FOREIGN KEY ("intake_id") REFERENCES "public"."intakes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_logs" ADD CONSTRAINT "lesson_logs_teacher_id_staff_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_topic_progress" ADD CONSTRAINT "lesson_topic_progress_lesson_log_id_lesson_logs_id_fk" FOREIGN KEY ("lesson_log_id") REFERENCES "public"."lesson_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_topic_progress" ADD CONSTRAINT "lesson_topic_progress_topic_id_syllabus_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."syllabus_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syllabus_topics" ADD CONSTRAINT "syllabus_topics_intake_id_intakes_id_fk" FOREIGN KEY ("intake_id") REFERENCES "public"."intakes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_lesson_absence" ON "lesson_absences" USING btree ("lesson_log_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_lesson_topic" ON "lesson_topic_progress" USING btree ("lesson_log_id","topic_id");