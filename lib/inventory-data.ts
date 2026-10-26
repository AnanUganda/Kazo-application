import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  consumables,
  equipment,
  equipmentFaults,
  lessonIssues,
  lessonLogs,
  staff,
  stockMovements,
  students,
  type Consumable,
  type Equipment,
  type EquipmentFault,
  type StockMovement,
} from "@/lib/db/schema";
import { getActiveIntake } from "@/lib/intake";
import { computeStockLevel, isLowStock } from "@/lib/inventory";

export const STANDARD_BOOTHS = [
  "Booth 1",
  "Booth 2",
  "Booth 3",
  "Booth 4",
  "Booth 5",
  "Booth 6",
  "Booth 7",
  "Booth 8",
] as const;

export type ConsumableWithStock = {
  consumable: Consumable;
  stockLevel: number;
  lowStock: boolean;
  movements: StockMovement[];
};

export type UnlinkedLessonFault = {
  lessonIssueId: string;
  date: string;
  machineLabel: string | null;
  problem: string;
  reportedBy: string;
  status: "open" | "resolved";
};

export type EquipmentWithDetails = {
  item: Equipment;
  assignedStudentName: string | null;
  assignedStudentBooth: string | null;
  faults: EquipmentFault[];
  openFaultCount: number;
};

export type StudentRosterOption = {
  id: string;
  fullName: string;
  booth: string | null;
};

/** Load all non-archived consumables with their movement-derived stock levels. */
export async function loadConsumables(): Promise<ConsumableWithStock[]> {
  const db = getDb();

  const items = await db
    .select()
    .from(consumables)
    .where(isNull(consumables.archivedAt))
    .orderBy(asc(consumables.category), asc(consumables.name));

  if (items.length === 0) return [];

  const ids = items.map((c) => c.id);
  const movements = await db
    .select()
    .from(stockMovements)
    .where(
      and(
        inArray(stockMovements.consumableId, ids),
        isNull(stockMovements.archivedAt),
      ),
    )
    .orderBy(desc(stockMovements.date), desc(stockMovements.createdAt));

  const byConsumable = new Map<string, StockMovement[]>();
  for (const m of movements) {
    let list = byConsumable.get(m.consumableId);
    if (!list) {
      list = [];
      byConsumable.set(m.consumableId, list);
    }
    list.push(m);
  }

  return items.map((consumable) => {
    const itemMovements = byConsumable.get(consumable.id) ?? [];
    const stockLevel = computeStockLevel(itemMovements);
    return {
      consumable,
      stockLevel,
      lowStock: isLowStock(stockLevel, consumable.reorderLevel),
      movements: itemMovements,
    };
  });
}

/**
 * Load the equipment register, fault logs, active-intake student assignment
 * options (names + booths only — no personal/fee data), unlinked lesson-log
 * machine issues, and unassigned booths.
 */
export async function loadEquipmentRegister(): Promise<{
  equipmentList: EquipmentWithDetails[];
  unlinkedLessonFaults: UnlinkedLessonFault[];
  studentOptions: StudentRosterOption[];
  allBooths: string[];
  unassignedBooths: string[];
}> {
  const db = getDb();
  const activeIntake = await getActiveIntake();

  const items = await db
    .select()
    .from(equipment)
    .where(isNull(equipment.archivedAt))
    .orderBy(asc(equipment.assetCode));

  const studentOptions: StudentRosterOption[] = activeIntake
    ? await db
        .select({
          id: students.id,
          fullName: students.fullName,
          booth: students.booth,
        })
        .from(students)
        .where(
          and(
            eq(students.intakeId, activeIntake.id),
            inArray(students.status, ["active", "suspended"]),
            isNull(students.archivedAt),
          ),
        )
        .orderBy(asc(students.fullName))
    : [];

  const assignedStudentIds = items
    .map((i) => i.assignedStudentId)
    .filter((id): id is string => Boolean(id));

  const assignedStudentRows =
    assignedStudentIds.length > 0
      ? await db
          .select({
            id: students.id,
            fullName: students.fullName,
            booth: students.booth,
          })
          .from(students)
          .where(inArray(students.id, assignedStudentIds))
      : [];
  const studentById = new Map(assignedStudentRows.map((s) => [s.id, s]));

  const eqIds = items.map((i) => i.id);
  const faultRows =
    eqIds.length > 0
      ? await db
          .select()
          .from(equipmentFaults)
          .where(
            and(
              inArray(equipmentFaults.equipmentId, eqIds),
              isNull(equipmentFaults.archivedAt),
            ),
          )
          .orderBy(
            desc(equipmentFaults.reportedAt),
            desc(equipmentFaults.createdAt),
          )
      : [];

  const linkedLessonIssueIds = new Set(
    faultRows
      .map((f) => f.lessonIssueId)
      .filter((id): id is string => Boolean(id)),
  );

  // Also check lesson_issues where is_machine_issue = true.
  const machineIssueRows = await db
    .select({
      id: lessonIssues.id,
      description: lessonIssues.description,
      machineLabel: lessonIssues.machineLabel,
      status: lessonIssues.status,
      date: lessonLogs.date,
      teacherName: staff.fullName,
    })
    .from(lessonIssues)
    .innerJoin(lessonLogs, eq(lessonIssues.lessonLogId, lessonLogs.id))
    .innerJoin(staff, eq(lessonLogs.teacherId, staff.id))
    .where(
      and(
        eq(lessonIssues.isMachineIssue, true),
        isNull(lessonIssues.archivedAt),
      ),
    )
    .orderBy(desc(lessonLogs.date), desc(lessonIssues.createdAt));

  const unlinkedLessonFaults: UnlinkedLessonFault[] = machineIssueRows
    .filter((row) => !linkedLessonIssueIds.has(row.id))
    .map((row) => ({
      lessonIssueId: row.id,
      date: row.date,
      machineLabel: row.machineLabel,
      problem: row.description,
      reportedBy: row.teacherName,
      status: row.status,
    }));

  const faultsByEq = new Map<string, EquipmentFault[]>();
  for (const f of faultRows) {
    let list = faultsByEq.get(f.equipmentId);
    if (!list) {
      list = [];
      faultsByEq.set(f.equipmentId, list);
    }
    list.push(f);
  }

  const equipmentList: EquipmentWithDetails[] = items.map((item) => {
    const stu = item.assignedStudentId
      ? (studentById.get(item.assignedStudentId) ?? null)
      : null;
    const itemFaults = faultsByEq.get(item.id) ?? [];
    const openFaultCount = itemFaults.filter((f) => f.status === "open").length;
    return {
      item,
      assignedStudentName: stu?.fullName ?? null,
      assignedStudentBooth: stu?.booth ?? null,
      faults: itemFaults,
      openFaultCount,
    };
  });

  // Compute all known booths and which booths have no assigned equipment.
  const boothSet = new Set<string>(STANDARD_BOOTHS);
  for (const s of studentOptions) {
    if (s.booth?.trim()) boothSet.add(s.booth.trim());
  }
  for (const eqItem of items) {
    if (eqItem.booth?.trim()) boothSet.add(eqItem.booth.trim());
  }
  const allBooths = Array.from(boothSet).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  const coveredBooths = new Set(
    items
      .filter((i) => i.booth && i.status !== "out_of_service")
      .map((i) => i.booth!.trim().toLowerCase()),
  );
  const unassignedBooths = allBooths.filter(
    (b) => !coveredBooths.has(b.toLowerCase()),
  );

  return {
    equipmentList,
    unlinkedLessonFaults,
    studentOptions,
    allBooths,
    unassignedBooths,
  };
}
