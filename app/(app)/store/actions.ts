"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
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
  type ConsumableCategory,
  type ConsumableUnit,
  type EquipmentStatus,
  type StockAdjustmentReason,
  type StockOutPurpose,
} from "@/lib/db/schema";
import { logActivity } from "@/lib/activity";
import { parseAmountToInt, todayKampala } from "@/lib/format";
import { computeAdjustmentDelta, computeStockLevel } from "@/lib/inventory";

export type InventoryFormState = {
  ok: boolean;
  error?: string;
  values?: Record<string, string>;
};

const VALID_CATEGORIES: ConsumableCategory[] = [
  "electrodes",
  "discs",
  "steel",
  "gas",
  "other",
];

const VALID_UNITS: ConsumableUnit[] = [
  "box",
  "piece",
  "kg",
  "length",
  "cylinder",
];

const VALID_PURPOSES: StockOutPurpose[] = [
  "class_practice",
  "workshop_job",
  "other",
];

const VALID_REASONS: StockAdjustmentReason[] = [
  "damaged",
  "lost",
  "miscounted",
];

const VALID_EQ_STATUS: EquipmentStatus[] = [
  "working",
  "needs_repair",
  "out_of_service",
];

function revalidateInventoryPaths() {
  revalidatePath("/admin/inventory");
  revalidatePath("/store/consumables");
  revalidatePath("/admin");
  revalidatePath("/store");
}

function revalidateEquipmentPaths(studentId?: string | null) {
  revalidatePath("/admin/equipment");
  revalidatePath("/store/equipment");
  revalidatePath("/admin/students");
  revalidatePath("/teacher/students");
  if (studentId) {
    revalidatePath(`/admin/students/${studentId}`);
    revalidatePath(`/teacher/students/${studentId}`);
  }
  revalidatePath("/admin");
  revalidatePath("/store");
}

/** Add a new consumable item (with optional opening stock-in movement). */
export async function createConsumable(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const actor = await requireRole("store_keeper", "admin");

  const values = {
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "electrodes"),
    unit: String(formData.get("unit") ?? "box"),
    reorderLevel: String(formData.get("reorderLevel") ?? "5").trim(),
    initialQty: String(formData.get("initialQty") ?? "").trim(),
    supplier: String(formData.get("supplier") ?? "").trim(),
  };

  if (!values.name) {
    return { ok: false, error: "Enter the consumable name.", values };
  }
  if (!VALID_CATEGORIES.includes(values.category as ConsumableCategory)) {
    return { ok: false, error: "Choose a valid category.", values };
  }
  if (!VALID_UNITS.includes(values.unit as ConsumableUnit)) {
    return { ok: false, error: "Choose a valid unit.", values };
  }
  const reorder = Number(values.reorderLevel);
  if (!Number.isInteger(reorder) || reorder < 0) {
    return {
      ok: false,
      error: "Reorder level must be 0 or a positive whole number.",
      values,
    };
  }

  const initialQty = values.initialQty === "" ? 0 : Number(values.initialQty);
  if (!Number.isInteger(initialQty) || initialQty < 0) {
    return {
      ok: false,
      error: "Opening stock must be 0 or a positive whole number.",
      values,
    };
  }

  const db = getDb();
  let createdId = "";
  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(consumables)
      .values({
        name: values.name,
        category: values.category as ConsumableCategory,
        unit: values.unit as ConsumableUnit,
        reorderLevel: reorder,
        createdBy: actor.id,
        updatedBy: actor.id,
      })
      .returning({ id: consumables.id });
    createdId = created.id;

    if (initialQty > 0) {
      await tx.insert(stockMovements).values({
        consumableId: created.id,
        type: "in",
        date: todayKampala(),
        quantityDelta: initialQty,
        supplier: values.supplier || "Opening stock",
        receivedBy: actor.fullName,
        notes: "Initial stock on creation",
        createdBy: actor.id,
        updatedBy: actor.id,
      });
    }
  });

  await logActivity({
    actorId: actor.id,
    action: "consumable.create",
    entityType: "consumable",
    entityId: createdId,
    details: {
      name: values.name,
      category: values.category,
      unit: values.unit,
      reorderLevel: reorder,
      initialQty,
    },
  });

  revalidateInventoryPaths();
  return { ok: true };
}

/** Update consumable metadata (name, category, unit, reorder level). */
export async function updateConsumable(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const actor = await requireRole("store_keeper", "admin");
  const id = String(formData.get("consumableId") ?? "");

  const values = {
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "electrodes"),
    unit: String(formData.get("unit") ?? "box"),
    reorderLevel: String(formData.get("reorderLevel") ?? "0").trim(),
  };

  if (!id) return { ok: false, error: "Missing consumable.", values };
  if (!values.name)
    return { ok: false, error: "Enter the consumable name.", values };
  if (!VALID_CATEGORIES.includes(values.category as ConsumableCategory)) {
    return { ok: false, error: "Choose a valid category.", values };
  }
  if (!VALID_UNITS.includes(values.unit as ConsumableUnit)) {
    return { ok: false, error: "Choose a valid unit.", values };
  }
  const reorder = Number(values.reorderLevel);
  if (!Number.isInteger(reorder) || reorder < 0) {
    return {
      ok: false,
      error: "Reorder level must be 0 or a positive whole number.",
      values,
    };
  }

  await getDb()
    .update(consumables)
    .set({
      name: values.name,
      category: values.category as ConsumableCategory,
      unit: values.unit as ConsumableUnit,
      reorderLevel: reorder,
      updatedAt: new Date(),
      updatedBy: actor.id,
    })
    .where(eq(consumables.id, id));

  await logActivity({
    actorId: actor.id,
    action: "consumable.update",
    entityType: "consumable",
    entityId: id,
    details: { name: values.name, reorderLevel: reorder },
  });

  revalidateInventoryPaths();
  return { ok: true };
}

/** Record Stock In (date, qty, supplier, optional cost in UGX, received by). */
export async function recordStockIn(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const actor = await requireRole("store_keeper", "admin");
  const consumableId = String(formData.get("consumableId") ?? "");

  const values = {
    date: String(formData.get("date") ?? "").trim() || todayKampala(),
    quantity: String(formData.get("quantity") ?? "").trim(),
    supplier: String(formData.get("supplier") ?? "").trim(),
    cost: String(formData.get("cost") ?? "").trim(),
    receivedBy: String(formData.get("receivedBy") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };

  if (!consumableId)
    return { ok: false, error: "Missing consumable item.", values };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
    return { ok: false, error: "Enter a valid date.", values };
  }
  const qty = Number(values.quantity);
  if (!Number.isInteger(qty) || qty <= 0) {
    return {
      ok: false,
      error: "Quantity received must be a whole number greater than 0.",
      values,
    };
  }
  if (!values.supplier) {
    return { ok: false, error: "Enter the supplier name.", values };
  }
  if (!values.receivedBy) {
    return { ok: false, error: "Enter who received the stock.", values };
  }

  let parsedCost: number | null = null;
  if (values.cost !== "") {
    parsedCost = parseAmountToInt(values.cost);
    if (parsedCost === null || parsedCost < 0) {
      return { ok: false, error: "Enter a valid cost in UGX.", values };
    }
  }

  const [movement] = await getDb()
    .insert(stockMovements)
    .values({
      consumableId,
      type: "in",
      date: values.date,
      quantityDelta: qty,
      supplier: values.supplier,
      cost: parsedCost,
      receivedBy: values.receivedBy,
      notes: values.notes || null,
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    .returning({ id: stockMovements.id });

  await logActivity({
    actorId: actor.id,
    action: "stock.in",
    entityType: "stock_movement",
    entityId: movement.id,
    details: {
      consumableId,
      quantity: qty,
      supplier: values.supplier,
      cost: parsedCost,
      receivedBy: values.receivedBy,
    },
  });

  revalidateInventoryPaths();
  return { ok: true };
}

/** Record Stock Out (date, qty, purpose: class practice / workshop job / other, taken by). */
export async function recordStockOut(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const actor = await requireRole("store_keeper", "admin");
  const consumableId = String(formData.get("consumableId") ?? "");

  const values = {
    date: String(formData.get("date") ?? "").trim() || todayKampala(),
    quantity: String(formData.get("quantity") ?? "").trim(),
    purpose: String(formData.get("purpose") ?? "class_practice"),
    takenBy: String(formData.get("takenBy") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };

  if (!consumableId)
    return { ok: false, error: "Missing consumable item.", values };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
    return { ok: false, error: "Enter a valid date.", values };
  }
  const qty = Number(values.quantity);
  if (!Number.isInteger(qty) || qty <= 0) {
    return {
      ok: false,
      error: "Quantity taken must be a whole number greater than 0.",
      values,
    };
  }
  if (!VALID_PURPOSES.includes(values.purpose as StockOutPurpose)) {
    return { ok: false, error: "Choose a valid purpose.", values };
  }
  if (!values.takenBy) {
    return { ok: false, error: "Enter who took the stock.", values };
  }

  const db = getDb();
  const existing = await db
    .select({ quantityDelta: stockMovements.quantityDelta })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.consumableId, consumableId),
        isNull(stockMovements.archivedAt),
      ),
    );
  const currentStock = computeStockLevel(existing);
  if (qty > currentStock) {
    return {
      ok: false,
      error: `Cannot issue ${qty} — only ${currentStock} in stock.`,
      values,
    };
  }

  const [movement] = await db
    .insert(stockMovements)
    .values({
      consumableId,
      type: "out",
      date: values.date,
      quantityDelta: -qty,
      purpose: values.purpose as StockOutPurpose,
      takenBy: values.takenBy,
      notes: values.notes || null,
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    .returning({ id: stockMovements.id });

  await logActivity({
    actorId: actor.id,
    action: "stock.out",
    entityType: "stock_movement",
    entityId: movement.id,
    details: {
      consumableId,
      quantity: qty,
      purpose: values.purpose,
      takenBy: values.takenBy,
    },
  });

  revalidateInventoryPaths();
  return { ok: true };
}

/**
 * Physical stock count: enter physical count; difference is saved as an
 * append-only adjustment movement with a reason (damaged / lost / miscounted).
 */
export async function recordStockCount(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const actor = await requireRole("store_keeper", "admin");
  const consumableId = String(formData.get("consumableId") ?? "");

  const values = {
    physicalCount: String(formData.get("physicalCount") ?? "").trim(),
    adjustmentReason: String(formData.get("adjustmentReason") ?? "miscounted"),
    notes: String(formData.get("notes") ?? "").trim(),
  };

  if (!consumableId)
    return { ok: false, error: "Missing consumable item.", values };
  if (values.physicalCount === "") {
    return { ok: false, error: "Enter the physical count.", values };
  }
  const physicalCount = Number(values.physicalCount);
  if (!Number.isInteger(physicalCount) || physicalCount < 0) {
    return {
      ok: false,
      error: "Physical count must be 0 or a positive whole number.",
      values,
    };
  }
  if (!VALID_REASONS.includes(values.adjustmentReason as StockAdjustmentReason)) {
    return { ok: false, error: "Choose a valid adjustment reason.", values };
  }

  const db = getDb();
  let movementId = "";
  let delta = 0;
  let previousStock = 0;

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ quantityDelta: stockMovements.quantityDelta })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.consumableId, consumableId),
          isNull(stockMovements.archivedAt),
        ),
      );
    previousStock = computeStockLevel(existing);
    delta = computeAdjustmentDelta(previousStock, physicalCount);

    const [inserted] = await tx
      .insert(stockMovements)
      .values({
        consumableId,
        type: "adjustment",
        date: todayKampala(),
        quantityDelta: delta,
        physicalCount,
        adjustmentReason: values.adjustmentReason as StockAdjustmentReason,
        notes: values.notes || null,
        createdBy: actor.id,
        updatedBy: actor.id,
      })
      .returning({ id: stockMovements.id });
    movementId = inserted.id;
  });

  await logActivity({
    actorId: actor.id,
    action: "stock.adjustment",
    entityType: "stock_movement",
    entityId: movementId,
    details: {
      consumableId,
      previousStock,
      physicalCount,
      quantityDelta: delta,
      reason: values.adjustmentReason,
    },
  });

  revalidateInventoryPaths();
  return { ok: true };
}

/** Add a new machine/tool to the Equipment register. */
export async function createEquipment(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const actor = await requireRole("store_keeper", "admin");

  const values = {
    assetCode: String(formData.get("assetCode") ?? "").trim().toUpperCase(),
    type: String(formData.get("type") ?? "").trim(),
    makeModel: String(formData.get("makeModel") ?? "").trim(),
    status: String(formData.get("status") ?? "working"),
    booth: String(formData.get("booth") ?? "").trim(),
    assignedStudentId: String(formData.get("assignedStudentId") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };

  if (!values.assetCode) {
    return {
      ok: false,
      error: "Enter the asset ID (e.g. KTS-WM-07).",
      values,
    };
  }
  if (!values.type) {
    return {
      ok: false,
      error: "Enter the equipment type (e.g. MIG welder).",
      values,
    };
  }
  if (!VALID_EQ_STATUS.includes(values.status as EquipmentStatus)) {
    return { ok: false, error: "Choose a valid status.", values };
  }

  const db = getDb();
  const duplicate = (
    await db
      .select({ id: equipment.id })
      .from(equipment)
      .where(ilike(equipment.assetCode, values.assetCode))
      .limit(1)
  )[0];
  if (duplicate) {
    return {
      ok: false,
      error: `Asset ID ${values.assetCode} is already registered.`,
      values,
    };
  }

  const studentId = values.assignedStudentId || null;
  let resolvedBooth = values.booth || null;

  let createdId = "";
  await db.transaction(async (tx) => {
    if (studentId) {
      const stu = (
        await tx
          .select({ id: students.id, booth: students.booth })
          .from(students)
          .where(eq(students.id, studentId))
          .limit(1)
      )[0];
      if (stu) {
        if (!resolvedBooth && stu.booth) {
          resolvedBooth = stu.booth;
        } else if (resolvedBooth && stu.booth !== resolvedBooth) {
          await tx
            .update(students)
            .set({
              booth: resolvedBooth,
              updatedAt: new Date(),
              updatedBy: actor.id,
            })
            .where(eq(students.id, stu.id));
        }
      }
    }

    const [created] = await tx
      .insert(equipment)
      .values({
        assetCode: values.assetCode,
        type: values.type,
        makeModel: values.makeModel || null,
        status: values.status as EquipmentStatus,
        booth: resolvedBooth,
        assignedStudentId: studentId,
        notes: values.notes || null,
        createdBy: actor.id,
        updatedBy: actor.id,
      })
      .returning({ id: equipment.id });
    createdId = created.id;

    // Auto-link any open lesson_issues matching this asset code.
    const matchingIssues = await tx
      .select({
        id: lessonIssues.id,
        description: lessonIssues.description,
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
          ilike(lessonIssues.machineLabel, values.assetCode),
          isNull(lessonIssues.archivedAt),
        ),
      );

    for (const iss of matchingIssues) {
      await tx.insert(equipmentFaults).values({
        equipmentId: created.id,
        lessonIssueId: iss.id,
        reportedAt: iss.date,
        problem: iss.description,
        reportedBy: iss.teacherName,
        status: iss.status,
        createdBy: actor.id,
        updatedBy: actor.id,
      });
    }
  });

  await logActivity({
    actorId: actor.id,
    action: "equipment.create",
    entityType: "equipment",
    entityId: createdId,
    details: {
      assetCode: values.assetCode,
      type: values.type,
      booth: resolvedBooth,
      assignedStudentId: studentId,
    },
  });

  revalidateEquipmentPaths(studentId);
  return { ok: true };
}

/** Update equipment status, booth, student assignment (linked two-way), and details. */
export async function updateEquipment(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const actor = await requireRole("store_keeper", "admin");
  const equipmentId = String(formData.get("equipmentId") ?? "");

  const values = {
    type: String(formData.get("type") ?? "").trim(),
    makeModel: String(formData.get("makeModel") ?? "").trim(),
    status: String(formData.get("status") ?? "working"),
    booth: String(formData.get("booth") ?? "").trim(),
    assignedStudentId: String(formData.get("assignedStudentId") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };

  if (!equipmentId)
    return { ok: false, error: "Missing equipment item.", values };
  if (!values.type)
    return { ok: false, error: "Enter the equipment type.", values };
  if (!VALID_EQ_STATUS.includes(values.status as EquipmentStatus)) {
    return { ok: false, error: "Choose a valid status.", values };
  }

  const db = getDb();
  const existing = (
    await db
      .select()
      .from(equipment)
      .where(and(eq(equipment.id, equipmentId), isNull(equipment.archivedAt)))
      .limit(1)
  )[0];
  if (!existing) {
    return { ok: false, error: "Equipment not found.", values };
  }

  const studentId = values.assignedStudentId || null;
  let resolvedBooth = values.booth || null;

  await db.transaction(async (tx) => {
    if (studentId) {
      const stu = (
        await tx
          .select({ id: students.id, booth: students.booth })
          .from(students)
          .where(eq(students.id, studentId))
          .limit(1)
      )[0];
      if (stu) {
        if (!resolvedBooth && stu.booth) {
          resolvedBooth = stu.booth;
        } else if (resolvedBooth && stu.booth !== resolvedBooth) {
          await tx
            .update(students)
            .set({
              booth: resolvedBooth,
              updatedAt: new Date(),
              updatedBy: actor.id,
            })
            .where(eq(students.id, stu.id));
        }
      }
    }

    await tx
      .update(equipment)
      .set({
        type: values.type,
        makeModel: values.makeModel || null,
        status: values.status as EquipmentStatus,
        booth: resolvedBooth,
        assignedStudentId: studentId,
        notes: values.notes || null,
        updatedAt: new Date(),
        updatedBy: actor.id,
      })
      .where(eq(equipment.id, equipmentId));
  });

  await logActivity({
    actorId: actor.id,
    action: "equipment.update",
    entityType: "equipment",
    entityId: equipmentId,
    details: {
      assetCode: existing.assetCode,
      status: values.status,
      booth: resolvedBooth,
      assignedStudentId: studentId,
    },
  });

  revalidateEquipmentPaths(studentId ?? existing.assignedStudentId);
  return { ok: true };
}

/** Log a fault on an equipment item directly. */
export async function reportEquipmentFault(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const actor = await requireRole("store_keeper", "admin");
  const equipmentId = String(formData.get("equipmentId") ?? "");

  const values = {
    reportedAt: String(formData.get("reportedAt") ?? "").trim() || todayKampala(),
    problem: String(formData.get("problem") ?? "").trim(),
    reportedBy:
      String(formData.get("reportedBy") ?? "").trim() || actor.fullName,
  };

  if (!equipmentId)
    return { ok: false, error: "Missing equipment item.", values };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.reportedAt)) {
    return { ok: false, error: "Enter a valid date.", values };
  }
  if (!values.problem) {
    return { ok: false, error: "Describe the fault / problem.", values };
  }
  if (!values.reportedBy) {
    return { ok: false, error: "Enter who reported the fault.", values };
  }

  const db = getDb();
  let faultId = "";
  await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(equipmentFaults)
      .values({
        equipmentId,
        reportedAt: values.reportedAt,
        problem: values.problem,
        reportedBy: values.reportedBy,
        status: "open",
        createdBy: actor.id,
        updatedBy: actor.id,
      })
      .returning({ id: equipmentFaults.id });
    faultId = inserted.id;

    const eqRow = (
      await tx
        .select({ status: equipment.status })
        .from(equipment)
        .where(eq(equipment.id, equipmentId))
        .limit(1)
    )[0];
    if (eqRow && eqRow.status === "working") {
      await tx
        .update(equipment)
        .set({
          status: "needs_repair",
          updatedAt: new Date(),
          updatedBy: actor.id,
        })
        .where(eq(equipment.id, equipmentId));
    }
  });

  await logActivity({
    actorId: actor.id,
    action: "equipment.fault_report",
    entityType: "equipment_fault",
    entityId: faultId,
    details: {
      equipmentId,
      problem: values.problem,
      reportedBy: values.reportedBy,
    },
  });

  revalidateEquipmentPaths();
  return { ok: true };
}

/** Link a teacher's lesson-log machine issue to a specific equipment asset. */
export async function linkLessonIssueToEquipment(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const actor = await requireRole("store_keeper", "admin");
  const lessonIssueId = String(formData.get("lessonIssueId") ?? "");
  const equipmentId = String(formData.get("equipmentId") ?? "");

  if (!lessonIssueId || !equipmentId) {
    return {
      ok: false,
      error: "Select an equipment item to link this fault report.",
    };
  }

  const db = getDb();
  const issueRow = (
    await db
      .select({
        id: lessonIssues.id,
        description: lessonIssues.description,
        status: lessonIssues.status,
        date: lessonLogs.date,
        teacherName: staff.fullName,
      })
      .from(lessonIssues)
      .innerJoin(lessonLogs, eq(lessonIssues.lessonLogId, lessonLogs.id))
      .innerJoin(staff, eq(lessonLogs.teacherId, staff.id))
      .where(eq(lessonIssues.id, lessonIssueId))
      .limit(1)
  )[0];

  if (!issueRow) {
    return { ok: false, error: "Lesson fault report not found." };
  }

  let faultId = "";
  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(equipmentFaults)
      .values({
        equipmentId,
        lessonIssueId: issueRow.id,
        reportedAt: issueRow.date,
        problem: issueRow.description,
        reportedBy: issueRow.teacherName,
        status: issueRow.status,
        createdBy: actor.id,
        updatedBy: actor.id,
      })
      .returning({ id: equipmentFaults.id });
    faultId = created.id;

    if (issueRow.status === "open") {
      const eqRow = (
        await tx
          .select({ status: equipment.status })
          .from(equipment)
          .where(eq(equipment.id, equipmentId))
          .limit(1)
      )[0];
      if (eqRow && eqRow.status === "working") {
        await tx
          .update(equipment)
          .set({
            status: "needs_repair",
            updatedAt: new Date(),
            updatedBy: actor.id,
          })
          .where(eq(equipment.id, equipmentId));
      }
    }
  });

  await logActivity({
    actorId: actor.id,
    action: "equipment.fault_link_lesson_issue",
    entityType: "equipment_fault",
    entityId: faultId,
    details: { equipmentId, lessonIssueId },
  });

  revalidateEquipmentPaths();
  return { ok: true };
}

/** Resolve an open equipment fault (records fix, date fixed, optional cost in UGX). */
export async function resolveEquipmentFault(
  _prev: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const actor = await requireRole("store_keeper", "admin");
  const faultId = String(formData.get("faultId") ?? "");

  const values = {
    fix: String(formData.get("fix") ?? "").trim(),
    fixedAt: String(formData.get("fixedAt") ?? "").trim() || todayKampala(),
    cost: String(formData.get("cost") ?? "").trim(),
    restoreWorking: formData.get("restoreWorking") === "on" ? "on" : "",
  };

  if (!faultId) return { ok: false, error: "Missing fault record.", values };
  if (!values.fix) {
    return { ok: false, error: "Enter what was done to fix the fault.", values };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.fixedAt)) {
    return { ok: false, error: "Enter a valid date fixed.", values };
  }

  let parsedCost: number | null = null;
  if (values.cost !== "") {
    parsedCost = parseAmountToInt(values.cost);
    if (parsedCost === null || parsedCost < 0) {
      return { ok: false, error: "Enter a valid repair cost in UGX.", values };
    }
  }

  const db = getDb();
  const fault = (
    await db
      .select()
      .from(equipmentFaults)
      .where(and(eq(equipmentFaults.id, faultId), isNull(equipmentFaults.archivedAt)))
      .limit(1)
  )[0];
  if (!fault) {
    return { ok: false, error: "Fault record not found.", values };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(equipmentFaults)
      .set({
        status: "resolved",
        fix: values.fix,
        fixedAt: values.fixedAt,
        cost: parsedCost,
        updatedAt: new Date(),
        updatedBy: actor.id,
      })
      .where(eq(equipmentFaults.id, faultId));

    if (fault.lessonIssueId) {
      await tx
        .update(lessonIssues)
        .set({
          status: "resolved",
          updatedAt: new Date(),
          updatedBy: actor.id,
        })
        .where(eq(lessonIssues.id, fault.lessonIssueId));
    }

    if (values.restoreWorking === "on") {
      await tx
        .update(equipment)
        .set({
          status: "working",
          updatedAt: new Date(),
          updatedBy: actor.id,
        })
        .where(eq(equipment.id, fault.equipmentId));
    }
  });

  await logActivity({
    actorId: actor.id,
    action: "equipment.fault_resolve",
    entityType: "equipment_fault",
    entityId: faultId,
    details: {
      equipmentId: fault.equipmentId,
      fix: values.fix,
      fixedAt: values.fixedAt,
      cost: parsedCost,
    },
  });

  revalidateEquipmentPaths();
  return { ok: true };
}
