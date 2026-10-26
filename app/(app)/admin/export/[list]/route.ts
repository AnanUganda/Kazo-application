import { NextResponse } from "next/server";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import {
  applications,
  consumables,
  equipment,
  equipmentFaults,
  feeCharges,
  intakes,
  lessonAbsences,
  lessonLogs,
  payments,
  staff,
  stockMovements,
} from "@/lib/db/schema";
import { toCsv } from "@/lib/csv";
import { daysSince, todayKampala } from "@/lib/format";
import { getActiveIntake } from "@/lib/intake";
import { loadConsumables, loadEquipmentRegister } from "@/lib/inventory-data";
import { loadStudentList } from "@/lib/students-data";
import { loadSyllabus } from "@/lib/syllabus-data";
import { topicState, weekNumber } from "@/lib/track-status";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ list: string }> },
) {
  // Strictly Admin-only: redirects non-admins before any data is read.
  await requireRole("admin");

  const { list } = await params;
  const url = new URL(request.url);
  const db = getDb();
  const today = todayKampala();

  let csv = "";
  let filename = `kts-${list}-${today}.csv`;

  switch (list) {
    case "applications": {
      const stage = url.searchParams.get("stage") ?? "";
      const stuckOnly = url.searchParams.get("stuck") === "1";

      const rows = await db
        .select()
        .from(applications)
        .where(isNull(applications.archivedAt))
        .orderBy(desc(applications.createdAt));

      const filtered = rows.filter((a) => {
        if (stage && a.stage !== stage) return false;
        if (stuckOnly && daysSince(a.stageEnteredAt) < 14) return false;
        return true;
      });

      csv = toCsv(
        [
          "Full Name",
          "Phone",
          "Email",
          "Date of Birth",
          "Location",
          "Education Level",
          "Prior Experience",
          "Heard About KTS",
          "Next of Kin Name",
          "Next of Kin Phone",
          "Next of Kin Relationship",
          "Stage",
          "Days in Stage",
          "Test Date",
          "Test Result",
          "Interview Notes",
          "Withdrew Reason",
          "Applied At",
        ],
        filtered.map((a) => [
          a.fullName,
          a.phone,
          a.email,
          a.dob,
          a.location,
          a.educationLevel,
          a.priorExperience,
          a.heardAbout,
          a.nextOfKinName,
          a.nextOfKinPhone,
          a.nextOfKinRelationship,
          a.stage,
          daysSince(a.stageEnteredAt),
          a.testDate,
          a.testResult,
          a.interviewNotes,
          a.withdrewReason,
          a.createdAt.toISOString().slice(0, 10),
        ]),
      );
      break;
    }

    case "students": {
      const intake = await getActiveIntake();
      if (!intake) {
        csv = toCsv(["Message"], [["No active intake"]]);
        break;
      }
      const { items } = await loadStudentList(intake.id, { includeFees: true });
      csv = toCsv(
        [
          "Full Name",
          "Phone",
          "Email",
          "Date of Birth",
          "Location",
          "Booth",
          "Status",
          "Attendance %",
          "Sessions Held",
          "Present Sessions",
          "Absences",
          "Below Threshold",
          "Total Billed (UGX)",
          "Total Paid (UGX)",
          "Fee Balance (UGX)",
          "Next of Kin Name",
          "Next of Kin Phone",
          "Next of Kin Relationship",
        ],
        items.map(({ student: s, attendance: att, fees }) => [
          s.fullName,
          s.phone,
          s.email,
          s.dob,
          s.location,
          s.booth,
          s.status,
          att.rate !== null ? `${att.rate}%` : "N/A",
          att.sessionsHeld,
          att.presentCount,
          att.absencesCount,
          att.belowThreshold ? "Yes" : "No",
          fees?.totalDue ?? 0,
          fees?.paid ?? 0,
          fees?.balance ?? 0,
          s.nextOfKinName,
          s.nextOfKinPhone,
          s.nextOfKinRelationship,
        ]),
      );
      break;
    }

    case "payments": {
      const pRows = await db
        .select()
        .from(payments)
        .where(isNull(payments.archivedAt))
        .orderBy(desc(payments.paidAt), desc(payments.createdAt));

      const charges = await db.select().from(feeCharges);
      const chargeById = new Map(charges.map((c) => [c.id, c]));

      csv = toCsv(
        [
          "Date Paid",
          "Entry Type",
          "Fee Item",
          "Signed Amount (UGX)",
          "Method",
          "Reference",
          "Confirmed By",
          "Reversal Reason",
          "Student ID",
          "Application ID",
        ],
        pRows.map((p) => {
          const ch = chargeById.get(p.feeChargeId);
          const signed = p.entryType === "payment" ? p.amount : -p.amount;
          return [
            p.paidAt,
            p.entryType,
            ch?.feeTypeCode ?? "",
            signed,
            p.method,
            p.reference,
            p.confirmedBy,
            p.reason,
            p.studentId,
            p.applicationId,
          ];
        }),
      );
      break;
    }

    case "lessons": {
      const logs = await db
        .select({
          id: lessonLogs.id,
          date: lessonLogs.date,
          session: lessonLogs.session,
          notes: lessonLogs.notes,
          teacherName: staff.fullName,
        })
        .from(lessonLogs)
        .innerJoin(staff, eq(lessonLogs.teacherId, staff.id))
        .where(isNull(lessonLogs.archivedAt))
        .orderBy(desc(lessonLogs.date), desc(lessonLogs.createdAt));

      const abs = await db
        .select({ lessonLogId: lessonAbsences.lessonLogId })
        .from(lessonAbsences)
        .where(isNull(lessonAbsences.archivedAt));
      const absCount = new Map<string, number>();
      for (const a of abs) {
        absCount.set(a.lessonLogId, (absCount.get(a.lessonLogId) ?? 0) + 1);
      }

      csv = toCsv(
        ["Date", "Session", "Teacher", "Absentees Count", "Notes"],
        logs.map((l) => [
          l.date,
          l.session,
          l.teacherName,
          absCount.get(l.id) ?? 0,
          l.notes,
        ]),
      );
      break;
    }

    case "syllabus": {
      const intake = await getActiveIntake();
      if (!intake) {
        csv = toCsv(["Message"], [["No active intake"]]);
        break;
      }
      const { topics, completed, started } = await loadSyllabus(intake.id);
      const wk1 = weekNumber(intake.semester1Start, today);
      const wk2 = weekNumber(intake.semester2Start, today);

      csv = toCsv(
        [
          "Semester",
          "Target Week",
          "Title",
          "Type",
          "Status",
          "Educational Objectives",
        ],
        topics.map((t) => [
          t.semester,
          t.targetWeek,
          t.title,
          t.type,
          topicState(t, completed, started, t.semester === 1 ? wk1 : wk2),
          t.description,
        ]),
      );
      break;
    }

    case "consumables": {
      const items = await loadConsumables();
      csv = toCsv(
        [
          "Item Name",
          "Category",
          "Unit",
          "Current Stock (Derived)",
          "Reorder Level",
          "Low Stock Alert",
        ],
        items.map(({ consumable: c, stockLevel, lowStock }) => [
          c.name,
          c.category,
          c.unit,
          stockLevel,
          c.reorderLevel,
          lowStock ? "LOW STOCK" : "OK",
        ]),
      );
      break;
    }

    case "stock-movements": {
      const cons = await db.select().from(consumables);
      const nameById = new Map(cons.map((c) => [c.id, c.name]));
      const unitById = new Map(cons.map((c) => [c.id, c.unit]));
      const movs = await db
        .select()
        .from(stockMovements)
        .where(isNull(stockMovements.archivedAt))
        .orderBy(desc(stockMovements.date), desc(stockMovements.createdAt));

      csv = toCsv(
        [
          "Date",
          "Consumable",
          "Unit",
          "Movement Type",
          "Quantity Delta",
          "Supplier",
          "Cost (UGX)",
          "Received By",
          "Purpose",
          "Taken By",
          "Physical Count",
          "Adjustment Reason",
          "Notes",
        ],
        movs.map((m) => [
          m.date,
          nameById.get(m.consumableId) ?? m.consumableId,
          unitById.get(m.consumableId) ?? "",
          m.type,
          m.quantityDelta,
          m.supplier,
          m.cost,
          m.receivedBy,
          m.purpose,
          m.takenBy,
          m.physicalCount,
          m.adjustmentReason,
          m.notes,
        ]),
      );
      break;
    }

    case "equipment": {
      const { equipmentList } = await loadEquipmentRegister();
      csv = toCsv(
        [
          "Asset ID",
          "Type",
          "Make / Model",
          "Status",
          "Assigned Booth",
          "Assigned Student",
          "Open Faults",
        ],
        equipmentList.map(
          ({ item: e, assignedStudentName, openFaultCount }) => [
            e.assetCode,
            e.type,
            e.makeModel,
            e.status,
            e.booth,
            assignedStudentName,
            openFaultCount,
          ],
        ),
      );
      break;
    }

    case "faults": {
      const eqRows = await db.select().from(equipment);
      const codeById = new Map(eqRows.map((e) => [e.id, e.assetCode]));
      const flts = await db
        .select()
        .from(equipmentFaults)
        .where(isNull(equipmentFaults.archivedAt))
        .orderBy(
          desc(equipmentFaults.reportedAt),
          desc(equipmentFaults.createdAt),
        );

      csv = toCsv(
        [
          "Asset ID",
          "Reported Date",
          "Problem",
          "Reported By",
          "Status",
          "Fix",
          "Fixed Date",
          "Repair Cost (UGX)",
          "From Lesson Log",
        ],
        flts.map((f) => [
          codeById.get(f.equipmentId) ?? f.equipmentId,
          f.reportedAt,
          f.problem,
          f.reportedBy,
          f.status,
          f.fix,
          f.fixedAt,
          f.cost,
          f.lessonIssueId ? "Yes" : "No",
        ]),
      );
      break;
    }

    case "staff": {
      const sRows = await db
        .select()
        .from(staff)
        .where(isNull(staff.archivedAt))
        .orderBy(asc(staff.fullName));
      csv = toCsv(
        ["Full Name", "Email", "Role", "Active"],
        sRows.map((s) => [
          s.fullName,
          s.email,
          s.role,
          s.isActive ? "Active" : "Deactivated",
        ]),
      );
      break;
    }

    case "intakes": {
      const iRows = await db
        .select()
        .from(intakes)
        .orderBy(desc(intakes.startDate));
      csv = toCsv(
        [
          "Intake Name",
          "Status",
          "Start Date",
          "End Date",
          "Semester 1 Start",
          "Semester 1 End",
          "Semester 2 Start",
          "Semester 2 End",
        ],
        iRows.map((i) => [
          i.name,
          i.status,
          i.startDate,
          i.endDate,
          i.semester1Start,
          i.semester1End,
          i.semester2Start,
          i.semester2End,
        ]),
      );
      break;
    }

    default:
      return NextResponse.json(
        { error: `Unknown export list: ${list}` },
        { status: 400 },
      );
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
