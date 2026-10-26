import { describe, it, expect, beforeAll } from "vitest";
import { and, eq, isNull, or } from "drizzle-orm";
import { initPreviewDb } from "../lib/db/preview";
import { getDb } from "../lib/db";
import {
  applications,
  feeCharges,
  intakes,
  payments,
  students,
} from "../lib/db/schema";
import { ledgerBalance } from "../lib/ledger";
import { computeAttendance } from "../lib/attendance";
import {
  computeAdjustmentDelta,
  computeStockLevel,
  isLowStock,
} from "../lib/inventory";
import { countOverdue, topicState, trackColor, weekNumber } from "../lib/track-status";
import { KTS_COURSE_POLICY, KTS_SYLLABUS_MODULES } from "../lib/syllabus-defaults";
import { toCsv } from "../lib/csv";
import { navForRole, roleLabel } from "../components/shell/nav";
import { PREVIEW_IDS, previewRoleFromCookie } from "../lib/preview";
import { loadStudentList, loadStudentProfile } from "../lib/students-data";
import { loadEquipmentRegister } from "../lib/inventory-data";
import { homePathForRole } from "../lib/permissions";

describe("Phase 8 Hardening — Ledger, Permissions, Attendance, Inventory & KTS Syllabus", () => {
  beforeAll(async () => {
    await initPreviewDb();
  });

  describe("1. Fee Ledger Invariant (ledgerBalance + pglite SQL)", () => {
    it("proves fee balance always equals the sum of ledger entries across all seeded students", async () => {
      const db = getDb();
      const allStudents = await db
        .select()
        .from(students)
        .where(isNull(students.archivedAt));

      expect(allStudents.length).toBeGreaterThan(0);

      for (const s of allStudents) {
        const partyFilter = s.applicationId
          ? or(
              eq(feeCharges.studentId, s.id),
              eq(feeCharges.applicationId, s.applicationId),
            )!
          : eq(feeCharges.studentId, s.id);

        const charges = await db
          .select()
          .from(feeCharges)
          .where(and(partyFilter, isNull(feeCharges.archivedAt)));

        const allPayments = await db
          .select()
          .from(payments)
          .where(isNull(payments.archivedAt));

        const chargeIds = new Set(charges.map((c) => c.id));
        const studentPayments = allPayments.filter((p) =>
          chargeIds.has(p.feeChargeId),
        );

        const computed = ledgerBalance(charges, studentPayments);

        // Manual sum from raw SQL rows:
        const expectedTotalDue = charges.reduce(
          (sum, c) => sum + c.amountDue,
          0,
        );
        const expectedPaid = studentPayments.reduce(
          (sum, p) =>
            sum + (p.entryType === "payment" ? p.amount : -p.amount),
          0,
        );
        const expectedBalance = expectedTotalDue - expectedPaid;

        expect(computed.totalDue).toBe(expectedTotalDue);
        expect(computed.paid).toBe(expectedPaid);
        expect(computed.balance).toBe(expectedBalance);
      }
    });

    it("maintains exact ledger balance through partial payments and append-only reversals in pglite", async () => {
      const db = getDb();
      const activeIntake = (
        await db
          .select()
          .from(intakes)
          .where(eq(intakes.status, "active"))
          .limit(1)
      )[0];
      expect(activeIntake).toBeDefined();

      // Create an isolated test student in pglite
      const [testStudent] = await db
        .insert(students)
        .values({
          intakeId: activeIntake.id,
          fullName: "Ledger Invariant Test Student",
          phone: "0770999888",
          booth: "Booth 8",
          status: "active",
          createdBy: PREVIEW_IDS.admin,
          updatedBy: PREVIEW_IDS.admin,
        })
        .returning();

      // 1. Bill Semester 1 (800,000 UGX) and Semester 2 (800,000 UGX)
      const [sem1Charge, sem2Charge] = await db
        .insert(feeCharges)
        .values([
          {
            studentId: testStudent.id,
            feeTypeCode: "semester_1",
            amountDue: 800_000,
            semester: 1,
            createdBy: PREVIEW_IDS.admin,
            updatedBy: PREVIEW_IDS.admin,
          },
          {
            studentId: testStudent.id,
            feeTypeCode: "semester_2",
            amountDue: 800_000,
            semester: 2,
            createdBy: PREVIEW_IDS.admin,
            updatedBy: PREVIEW_IDS.admin,
          },
        ])
        .returning();

      // 2. Record partial payment #1 (500,000), accidental duplicate #2 (300,000),
      //    reversal of #2 (-300,000), and partial payment #3 (250,000)
      const [p1, p2] = await db
        .insert(payments)
        .values([
          {
            studentId: testStudent.id,
            feeChargeId: sem1Charge.id,
            entryType: "payment",
            amount: 500_000,
            method: "mtn",
            reference: "MTN-TEST-1",
            paidAt: "2026-03-01",
            confirmedBy: "Bursar",
            createdBy: PREVIEW_IDS.admin,
            updatedBy: PREVIEW_IDS.admin,
          },
          {
            studentId: testStudent.id,
            feeChargeId: sem1Charge.id,
            entryType: "payment",
            amount: 300_000,
            method: "airtel",
            reference: "AIR-DUP-2",
            paidAt: "2026-03-02",
            confirmedBy: "Bursar",
            createdBy: PREVIEW_IDS.admin,
            updatedBy: PREVIEW_IDS.admin,
          },
        ])
        .returning();

      await db.insert(payments).values([
        {
          studentId: testStudent.id,
          feeChargeId: sem1Charge.id,
          entryType: "reversal",
          reversesPaymentId: p2.id,
          reason: "Entered on wrong student account",
          amount: 300_000,
          method: "airtel",
          reference: "REV-AIR-DUP-2",
          paidAt: "2026-03-03",
          confirmedBy: "Admin",
          createdBy: PREVIEW_IDS.admin,
          updatedBy: PREVIEW_IDS.admin,
        },
        {
          studentId: testStudent.id,
          feeChargeId: sem2Charge.id,
          entryType: "payment",
          amount: 250_000,
          method: "cash",
          reference: "RCPT-TEST-3",
          paidAt: "2026-03-04",
          confirmedBy: "Bursar",
          createdBy: PREVIEW_IDS.admin,
          updatedBy: PREVIEW_IDS.admin,
        },
      ]);

      // Fetch back from Postgres and verify ledgerBalance
      const chargesFromDb = await db
        .select()
        .from(feeCharges)
        .where(eq(feeCharges.studentId, testStudent.id));
      const paymentsFromDb = await db
        .select()
        .from(payments)
        .where(eq(payments.studentId, testStudent.id));

      expect(paymentsFromDb).toHaveLength(4);
      const summary = ledgerBalance(chargesFromDb, paymentsFromDb);

      // Total due = 800,000 + 800,000 = 1,600,000
      // Net paid = +500,000 + 300,000 - 300,000 + 250,000 = 750,000
      // Balance = 1,600,000 - 750,000 = 850,000
      expect(summary.totalDue).toBe(1_600_000);
      expect(summary.paid).toBe(750_000);
      expect(summary.balance).toBe(850_000);

      // Also verify per-line balance on Semester 1
      const sem1Payments = paymentsFromDb.filter(
        (p) => p.feeChargeId === sem1Charge.id,
      );
      const sem1Summary = ledgerBalance([sem1Charge], sem1Payments);
      expect(sem1Summary.totalDue).toBe(800_000);
      expect(sem1Summary.paid).toBe(500_000);
      expect(sem1Summary.balance).toBe(300_000);
      expect(ledgerBalance([], [p1]).paid).toBe(500_000);
    });

    it("enforces Postgres CHECK constraint that a fee charge belongs to exactly one of application or student", async () => {
      const db = getDb();
      const someApp = (await db.select().from(applications).limit(1))[0];
      const someStudent = (await db.select().from(students).limit(1))[0];

      // Attempt to insert a charge with BOTH applicationId and studentId -> must fail CHECK constraint
      await expect(
        db.insert(feeCharges).values({
          applicationId: someApp.id,
          studentId: someStudent.id,
          feeTypeCode: "registration",
          amountDue: 35_000,
        }),
      ).rejects.toThrow();

      // Attempt to insert a charge with NEITHER applicationId nor studentId -> must fail CHECK constraint
      await expect(
        db.insert(feeCharges).values({
          feeTypeCode: "registration",
          amountDue: 35_000,
        }),
      ).rejects.toThrow();
    });
  });

  describe("2. Role Permissions & Navigation Isolation", () => {
    it("restricts navigation items strictly by role (Admin, Teacher, Store keeper)", () => {
      const adminNav = navForRole("admin").map((n) => n.href);
      const teacherNav = navForRole("teacher").map((n) => n.href);
      const storeNav = navForRole("store_keeper").map((n) => n.href);

      // Admin has full access
      expect(adminNav).toContain("/admin/applications");
      expect(adminNav).toContain("/admin/students");
      expect(adminNav).toContain("/admin/staff");
      expect(adminNav).toContain("/admin/settings");

      // Teacher only sees Home, Log lesson, Syllabus, Students (never Applications, Inventory, Staff, or Settings)
      expect(teacherNav).toEqual([
        "/teacher",
        "/teacher/log",
        "/teacher/syllabus",
        "/teacher/students",
      ]);

      // Store keeper only sees Home, Consumables, Equipment (never Students, Applications, or Syllabus)
      expect(storeNav).toEqual([
        "/store",
        "/store/consumables",
        "/store/equipment",
      ]);

      expect(roleLabel.admin).toBe("Administrator");
      expect(roleLabel.teacher).toBe("Teacher");
      expect(roleLabel.store_keeper).toBe("Store keeper");
    });

    it("normalizes preview role cookies safely and defaults unknown values to admin", () => {
      expect(previewRoleFromCookie("teacher")).toBe("teacher");
      expect(previewRoleFromCookie("store_keeper")).toBe("store_keeper");
      expect(previewRoleFromCookie("admin")).toBe("admin");
      expect(previewRoleFromCookie("hacker")).toBe("admin");
      expect(previewRoleFromCookie(undefined)).toBe("admin");
      expect(homePathForRole("admin")).toBe("/admin");
      expect(homePathForRole("teacher")).toBe("/teacher");
      expect(homePathForRole("store_keeper")).toBe("/store");
    });

    it("enforces data isolation: Teacher student loaders never return fee data, and Store keeper equipment loader never exposes personal/fee data", async () => {
      const db = getDb();
      const activeIntake = (
        await db
          .select()
          .from(intakes)
          .where(eq(intakes.status, "active"))
          .limit(1)
      )[0];
      expect(activeIntake).toBeDefined();

      // Teacher view: includeFees = false -> fees must be strictly null on list and profile
      const teacherList = await loadStudentList(activeIntake.id, {
        includeFees: false,
      });
      expect(teacherList.items.length).toBeGreaterThan(0);
      for (const item of teacherList.items) {
        expect(item.fees).toBeNull();
      }

      const firstStudentId = teacherList.items[0].student.id;
      const teacherProfile = await loadStudentProfile(firstStudentId, {
        includeFees: false,
      });
      expect(teacherProfile).not.toBeNull();
      expect(teacherProfile!.fees).toBeNull();

      // Admin view: includeFees = true -> fees must be populated and match ledgerBalance
      const adminProfile = await loadStudentProfile(firstStudentId, {
        includeFees: true,
      });
      expect(adminProfile).not.toBeNull();
      expect(adminProfile!.fees).not.toBeNull();
      expect(typeof adminProfile!.fees!.totals.balance).toBe("number");

      // Store keeper equipment register: studentOptions only contain id, fullName, booth
      const storeEq = await loadEquipmentRegister();
      expect(storeEq.studentOptions.length).toBeGreaterThan(0);
      for (const opt of storeEq.studentOptions) {
        expect(Object.keys(opt).sort()).toEqual(["booth", "fullName", "id"]);
      }
    });
  });

  describe("3. Attendance, Inventory & KTS 18-Module Syllabus Rules", () => {
    it("computes attendance rate strictly from lesson_absences since enrolment and flags < 85%", () => {
      const sessions = [
        { id: "s1", date: "2026-02-01" },
        { id: "s2", date: "2026-02-02" },
        { id: "s3", date: "2026-02-03" },
        { id: "s4", date: "2026-02-04" },
        { id: "s5", date: "2026-02-05" },
      ];
      // Absent in 1 of 5 sessions -> 80% (< 85% threshold -> red flag)
      const attBelow = computeAttendance(
        sessions,
        new Set(["s3"]),
        "2026-01-15",
        85,
      );
      expect(attBelow.sessionsHeld).toBe(5);
      expect(attBelow.presentCount).toBe(4);
      expect(attBelow.absencesCount).toBe(1);
      expect(attBelow.rate).toBe(80);
      expect(attBelow.belowThreshold).toBe(true);

      // Present in all 5 sessions -> 100% (>= 85% -> not flagged)
      const attOk = computeAttendance(sessions, new Set(), "2026-01-15", 85);
      expect(attOk.rate).toBe(100);
      expect(attOk.belowThreshold).toBe(false);
    });

    it("computes stock levels strictly from movements and calculates physical count adjustments", () => {
      const movements = [
        { quantityDelta: 20 }, // stock in
        { quantityDelta: -14 }, // stock out
        { quantityDelta: -2 }, // adjustment
      ];
      const level = computeStockLevel(movements);
      expect(level).toBe(4);
      expect(isLowStock(level, 5)).toBe(true);
      expect(isLowStock(level, 3)).toBe(false);
      expect(computeAdjustmentDelta(10, 8)).toBe(-2);
    });

    it("includes all 18 official KTS syllabus modules across two 13-week semesters", () => {
      expect(KTS_COURSE_POLICY.attendanceRequirementPct).toBe(85);
      expect(KTS_COURSE_POLICY.passMarkPct).toBe(75);
      expect(KTS_SYLLABUS_MODULES).toHaveLength(18);

      const sem1 = KTS_SYLLABUS_MODULES.filter((m) => m.semester === 1);
      const sem2 = KTS_SYLLABUS_MODULES.filter((m) => m.semester === 2);
      expect(sem1).toHaveLength(10);
      expect(sem2).toHaveLength(8);

      for (const m of KTS_SYLLABUS_MODULES) {
        expect(m.targetWeek).toBeGreaterThanOrEqual(1);
        expect(m.targetWeek).toBeLessThanOrEqual(13);
      }

      expect(trackColor(0)).toBe("green");
      expect(trackColor(1)).toBe("green");
      expect(trackColor(2)).toBe("amber");
      expect(trackColor(3)).toBe("red");
      expect(weekNumber("2026-02-01", "2026-02-08")).toBe(2);
      expect(
        countOverdue(
          [{ id: "t1", semester: 1, targetWeek: 1 }],
          new Set(),
          { 1: 3, 2: null },
        ),
      ).toBe(1);
      expect(
        topicState(
          { id: "t1", semester: 1, targetWeek: 1 },
          new Set(),
          new Set(),
          3,
        ),
      ).toBe("overdue");
    });

    it("serializes CSV exports with proper RFC 4180 escaping", () => {
      const csv = toCsv(
        ["Name", "Notes"],
        [
          ["Namukasa Grace", 'Passed "AWS" 1G, 2G & 3G'],
          ["Okello Brian", "Line 1\nLine 2"],
        ],
      );
      expect(csv).toContain('"Passed ""AWS"" 1G, 2G & 3G"');
      expect(csv).toContain('"Line 1\nLine 2"');
    });
  });
});
