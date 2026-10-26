import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Phase 1 schema: identity (staff + roles) and the cross-cutting activity trail.
 * The full schema was approved in Phase 0; the remaining tables (intakes,
 * settings, applications, students, fees, syllabus, lessons, inventory,
 * equipment) are added in their own phases so unanswered design questions
 * (e.g. booths) are not locked in prematurely.
 *
 * Conventions:
 *  - Money is stored as integer UGX (no decimals) — introduced from Phase 3.
 *  - Timestamps are `timestamptz`; local time (Africa/Kampala) is computed in
 *    the app layer, never read from the server clock.
 *  - Audit columns (created/updated/archived by+at) are on every table.
 *  - No hard deletes: rows are archived via `archived_at` / `archived_by`.
 */

export const staffRole = pgEnum("staff_role", [
  "admin",
  "teacher",
  "store_keeper",
]);

/**
 * Reusable audit + archive columns. A fresh object is returned on each call so
 * column builders are never shared between tables.
 * created_by / updated_by / archived_by reference `staff.id` (no DB-level FK to
 * avoid a self-referential constraint; integrity is enforced in the app layer).
 */
export function auditColumns() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: uuid("updated_by"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedBy: uuid("archived_by"),
  };
}

/**
 * Application-side account record. `id` equals the Neon Auth (Stack) user id, so
 * authentication (passwords, sessions) lives entirely in Neon Auth and never
 * here. Deactivating an account sets `is_active = false` and keeps the record.
 */
export const staff = pgTable("staff", {
  id: uuid("id").primaryKey(), // = Neon Auth user id (not auto-generated)
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: staffRole("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...auditColumns(),
});

/**
 * Append-only activity trail (the cross-cutting "who did what, when").
 * Per-row audit columns cover most needs; this gives a single readable log,
 * used especially for payments from Phase 3 onward.
 */
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id"), // staff.id, null for system/public actions
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  details: jsonb("details"),
});

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
export type StaffRole = (typeof staffRole.enumValues)[number];

/* ------------------------------------------------------------------ *
 * Phase 2: settings, fee catalogue, and intakes.
 * ------------------------------------------------------------------ */

/**
 * Single-row global settings. The row id is always 'global'. Fee amounts live
 * in fee_types; reorder levels and the syllabus plan arrive in their phases.
 */
export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey().default("global"),
  attendanceThreshold: integer("attendance_threshold").notNull().default(85),
  ...auditColumns(),
});

/**
 * Editable fee catalogue. `default_amount` is the amount charged to new
 * students (integer UGX). `applies_to_semester` is null (registration / any),
 * 1, or 2. Codes are stable identifiers; amounts are edited in Settings.
 */
export const feeTypes = pgTable("fee_types", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  defaultAmount: integer("default_amount").notNull(),
  appliesToSemester: integer("applies_to_semester"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...auditColumns(),
});

export const intakeStatus = pgEnum("intake_status", ["active", "archived"]);

/**
 * Intakes. At most ONE may be active at a time (enforced by a partial unique
 * index). Closing an intake sets status = 'archived' and stamps archived_at/by;
 * its students and syllabus progress then become read-only (enforced in the
 * phases that own those tables).
 */
export const intakes = pgTable(
  "intakes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    status: intakeStatus("status").notNull().default("active"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    semester1Start: date("semester1_start").notNull(),
    semester1End: date("semester1_end").notNull(),
    semester2Start: date("semester2_start").notNull(),
    semester2End: date("semester2_end").notNull(),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("uniq_one_active_intake")
      .on(t.status)
      .where(sql`${t.status} = 'active'`),
  ],
);

export type AppSettings = typeof appSettings.$inferSelect;
export type FeeType = typeof feeTypes.$inferSelect;
export type Intake = typeof intakes.$inferSelect;
export type NewIntake = typeof intakes.$inferInsert;
export type IntakeStatus = (typeof intakeStatus.enumValues)[number];

/* ------------------------------------------------------------------ *
 * Phase 3: applications, students (created on enrolment), and the
 * append-only payment ledger (fee_charges + payments).
 * ------------------------------------------------------------------ */

export const applicationStage = pgEnum("application_stage", [
  "applied_unpaid",
  "registered",
  "test_interview",
  "enrolled",
  "not_accepted",
  "withdrew",
]);

export const testResult = pgEnum("test_result", ["pass", "fail"]);

export const studentStatus = pgEnum("student_status", [
  "active",
  "suspended",
  "dropped_out",
]);

export const paymentMethod = pgEnum("payment_method", [
  "mtn",
  "airtel",
  "cash",
]);

export const paymentEntryType = pgEnum("payment_entry_type", [
  "payment",
  "reversal",
]);

/** Applications. `stage_entered_at` drives days-in-stage and the 14-day marker. */
export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  intakeId: uuid("intake_id").references(() => intakes.id),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  dob: date("dob"),
  location: text("location"),
  educationLevel: text("education_level"),
  priorExperience: text("prior_experience"),
  heardAbout: text("heard_about"),
  nextOfKinName: text("next_of_kin_name"),
  nextOfKinPhone: text("next_of_kin_phone"),
  nextOfKinRelationship: text("next_of_kin_relationship"),
  stage: applicationStage("stage").notNull().default("applied_unpaid"),
  stageEnteredAt: timestamp("stage_entered_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  testDate: date("test_date"),
  testResult: testResult("test_result"),
  interviewNotes: text("interview_notes"),
  withdrewReason: text("withdrew_reason"),
  ...auditColumns(),
});

/**
 * Students — created automatically when an application reaches Enrolled.
 * The list/profile UI, fees and attendance come in Phase 5; booth/equipment
 * assignment links in from Phase 6.
 */
export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").references(() => applications.id),
  intakeId: uuid("intake_id")
    .notNull()
    .references(() => intakes.id),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  dob: date("dob"),
  location: text("location"),
  nextOfKinName: text("next_of_kin_name"),
  nextOfKinPhone: text("next_of_kin_phone"),
  nextOfKinRelationship: text("next_of_kin_relationship"),
  booth: text("booth"),
  status: studentStatus("status").notNull().default("active"),
  ...auditColumns(),
});

/**
 * Fee charges — what is owed. Exactly one of application_id / student_id is set
 * (registration is charged to the application before a student exists).
 */
export const feeCharges = pgTable(
  "fee_charges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id").references(() => applications.id),
    studentId: uuid("student_id").references(() => students.id),
    feeTypeCode: text("fee_type_code")
      .notNull()
      .references(() => feeTypes.code),
    amountDue: integer("amount_due").notNull(),
    semester: integer("semester"),
    ...auditColumns(),
  },
  (t) => [
    check(
      "fee_charge_one_party",
      sql`(${t.applicationId} is not null) <> (${t.studentId} is not null)`,
    ),
  ],
);

/**
 * Payments — the reusable, append-only ledger record. Never updated or deleted;
 * a mistake is corrected with a `reversal` entry (reason + who). A future mobile
 * money integration inserts rows here with no redesign.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id").references(() => applications.id),
    studentId: uuid("student_id").references(() => students.id),
    feeChargeId: uuid("fee_charge_id")
      .notNull()
      .references(() => feeCharges.id),
    entryType: paymentEntryType("entry_type").notNull().default("payment"),
    amount: integer("amount").notNull(),
    method: paymentMethod("method").notNull(),
    reference: text("reference"),
    paidAt: date("paid_at").notNull(),
    confirmedBy: text("confirmed_by"),
    reversesPaymentId: uuid("reverses_payment_id").references(
      (): AnyPgColumn => payments.id,
    ),
    reason: text("reason"),
    ...auditColumns(),
  },
  (t) => [
    check(
      "payment_one_party",
      sql`(${t.applicationId} is not null) <> (${t.studentId} is not null)`,
    ),
  ],
);

/** Hashed-IP throttle for the public application form (spam protection). */
export const applyThrottle = pgTable(
  "apply_throttle",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("idx_apply_throttle_hash_time").on(t.ipHash, t.createdAt)],
);

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type ApplicationStage = (typeof applicationStage.enumValues)[number];
export type Student = typeof students.$inferSelect;
export type FeeCharge = typeof feeCharges.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type PaymentMethod = (typeof paymentMethod.enumValues)[number];
