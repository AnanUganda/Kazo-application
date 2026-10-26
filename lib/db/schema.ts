import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
