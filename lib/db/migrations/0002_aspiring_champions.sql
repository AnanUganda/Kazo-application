CREATE TYPE "public"."application_stage" AS ENUM('applied_unpaid', 'registered', 'test_interview', 'enrolled', 'not_accepted', 'withdrew');--> statement-breakpoint
CREATE TYPE "public"."payment_entry_type" AS ENUM('payment', 'reversal');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('mtn', 'airtel', 'cash');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('active', 'suspended', 'dropped_out');--> statement-breakpoint
CREATE TYPE "public"."test_result" AS ENUM('pass', 'fail');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intake_id" uuid,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"dob" date,
	"location" text,
	"education_level" text,
	"prior_experience" text,
	"heard_about" text,
	"next_of_kin_name" text,
	"next_of_kin_phone" text,
	"next_of_kin_relationship" text,
	"stage" "application_stage" DEFAULT 'applied_unpaid' NOT NULL,
	"stage_entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"test_date" date,
	"test_result" "test_result",
	"interview_notes" text,
	"withdrew_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid
);
--> statement-breakpoint
CREATE TABLE "apply_throttle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid,
	"student_id" uuid,
	"fee_type_code" text NOT NULL,
	"amount_due" integer NOT NULL,
	"semester" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	CONSTRAINT "fee_charge_one_party" CHECK (("fee_charges"."application_id" is not null) <> ("fee_charges"."student_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid,
	"student_id" uuid,
	"fee_charge_id" uuid NOT NULL,
	"entry_type" "payment_entry_type" DEFAULT 'payment' NOT NULL,
	"amount" integer NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"paid_at" date NOT NULL,
	"confirmed_by" text,
	"reverses_payment_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	CONSTRAINT "payment_one_party" CHECK (("payments"."application_id" is not null) <> ("payments"."student_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid,
	"intake_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"dob" date,
	"location" text,
	"next_of_kin_name" text,
	"next_of_kin_phone" text,
	"next_of_kin_relationship" text,
	"booth" text,
	"status" "student_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_intake_id_intakes_id_fk" FOREIGN KEY ("intake_id") REFERENCES "public"."intakes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_charges" ADD CONSTRAINT "fee_charges_fee_type_code_fee_types_code_fk" FOREIGN KEY ("fee_type_code") REFERENCES "public"."fee_types"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_fee_charge_id_fee_charges_id_fk" FOREIGN KEY ("fee_charge_id") REFERENCES "public"."fee_charges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reverses_payment_id_payments_id_fk" FOREIGN KEY ("reverses_payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_intake_id_intakes_id_fk" FOREIGN KEY ("intake_id") REFERENCES "public"."intakes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_apply_throttle_hash_time" ON "apply_throttle" USING btree ("ip_hash","created_at");