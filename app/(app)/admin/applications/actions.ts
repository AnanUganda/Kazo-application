"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import {
  applications,
  feeCharges,
  feeTypes,
  intakes,
  payments,
  students,
} from "@/lib/db/schema";
import { logActivity } from "@/lib/activity";
import { parseAmountToInt, todayKampala } from "@/lib/format";

export type ActionState = { ok: boolean; error?: string };

const REGISTRATION_FALLBACK = 35_000;

async function loadApplication(id: string) {
  const rows = await getDb()
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Applied (unpaid) -> Registered. Records the registration payment. */
export async function moveToRegistered(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("admin");

  const id = String(formData.get("applicationId") ?? "");
  const amount = parseAmountToInt(String(formData.get("amount") ?? ""));
  const method = String(formData.get("method") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  const confirmedBy = String(formData.get("confirmedBy") ?? "").trim();

  if (!id) return { ok: false, error: "Missing application." };
  if (amount === null || amount <= 0)
    return { ok: false, error: "Enter the amount paid." };
  if (!["mtn", "airtel", "cash"].includes(method))
    return { ok: false, error: "Choose a payment method." };
  if (!reference)
    return { ok: false, error: "Enter the transaction or receipt reference." };
  if (!confirmedBy)
    return { ok: false, error: "Enter who confirmed the payment." };

  const app = await loadApplication(id);
  if (!app) return { ok: false, error: "Application not found." };
  if (app.stage !== "applied_unpaid")
    return { ok: false, error: "This application is no longer awaiting registration." };

  const regFee =
    (
      await getDb()
        .select({ amount: feeTypes.defaultAmount })
        .from(feeTypes)
        .where(eq(feeTypes.code, "registration"))
        .limit(1)
    )[0]?.amount ?? REGISTRATION_FALLBACK;

  const db = getDb();
  await db.transaction(async (tx) => {
    let charge = (
      await tx
        .select()
        .from(feeCharges)
        .where(
          and(
            eq(feeCharges.applicationId, id),
            eq(feeCharges.feeTypeCode, "registration"),
          ),
        )
        .limit(1)
    )[0];

    if (!charge) {
      charge = (
        await tx
          .insert(feeCharges)
          .values({
            applicationId: id,
            feeTypeCode: "registration",
            amountDue: regFee,
            createdBy: admin.id,
            updatedBy: admin.id,
          })
          .returning()
      )[0];
    }

    await tx.insert(payments).values({
      applicationId: id,
      feeChargeId: charge.id,
      entryType: "payment",
      amount,
      method: method as "mtn" | "airtel" | "cash",
      reference,
      paidAt: todayKampala(),
      confirmedBy,
      createdBy: admin.id,
      updatedBy: admin.id,
    });

    await tx
      .update(applications)
      .set({
        stage: "registered",
        stageEnteredAt: new Date(),
        updatedAt: new Date(),
        updatedBy: admin.id,
      })
      .where(eq(applications.id, id));
  });

  await logActivity({
    actorId: admin.id,
    action: "application.register",
    entityType: "application",
    entityId: id,
    details: { amount, method, reference, confirmedBy },
  });

  revalidatePath("/admin/applications");
  return { ok: true };
}

/** Registered -> Test & interview. */
export async function moveToTestInterview(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("admin");

  const id = String(formData.get("applicationId") ?? "");
  const testDate = String(formData.get("testDate") ?? "");
  const result = String(formData.get("testResult") ?? "");
  const notes = String(formData.get("interviewNotes") ?? "").trim();

  if (!id) return { ok: false, error: "Missing application." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(testDate))
    return { ok: false, error: "Enter the test/interview date." };
  if (!["pass", "fail"].includes(result))
    return { ok: false, error: "Choose pass or fail." };

  const app = await loadApplication(id);
  if (!app) return { ok: false, error: "Application not found." };
  if (app.stage !== "registered")
    return { ok: false, error: "This application is not at the registered stage." };

  await getDb()
    .update(applications)
    .set({
      stage: "test_interview",
      testDate,
      testResult: result as "pass" | "fail",
      interviewNotes: notes || null,
      stageEnteredAt: new Date(),
      updatedAt: new Date(),
      updatedBy: admin.id,
    })
    .where(eq(applications.id, id));

  await logActivity({
    actorId: admin.id,
    action: "application.test_interview",
    entityType: "application",
    entityId: id,
    details: { testDate, result },
  });

  revalidatePath("/admin/applications");
  return { ok: true };
}

/** Test & interview -> Enrolled. Auto-creates the student in the active intake. */
export async function moveToEnrolled(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("admin");
  const id = String(formData.get("applicationId") ?? "");
  if (!id) return { ok: false, error: "Missing application." };

  const app = await loadApplication(id);
  if (!app) return { ok: false, error: "Application not found." };
  if (app.stage !== "test_interview")
    return { ok: false, error: "This application is not ready to enrol." };

  const activeIntake = (
    await getDb()
      .select({ id: intakes.id })
      .from(intakes)
      .where(eq(intakes.status, "active"))
      .limit(1)
  )[0];
  if (!activeIntake)
    return { ok: false, error: "No active intake. Create one first." };

  const sem1Fee =
    (
      await getDb()
        .select({ amount: feeTypes.defaultAmount })
        .from(feeTypes)
        .where(eq(feeTypes.code, "semester_1"))
        .limit(1)
    )[0]?.amount ?? 800_000;

  const db = getDb();
  let studentId = "";
  await db.transaction(async (tx) => {
    const [student] = await tx
      .insert(students)
      .values({
        applicationId: app.id,
        intakeId: activeIntake.id,
        fullName: app.fullName,
        phone: app.phone,
        email: app.email,
        dob: app.dob,
        location: app.location,
        nextOfKinName: app.nextOfKinName,
        nextOfKinPhone: app.nextOfKinPhone,
        nextOfKinRelationship: app.nextOfKinRelationship,
        createdBy: admin.id,
        updatedBy: admin.id,
      })
      .returning({ id: students.id });
    studentId = student.id;

    await tx.insert(feeCharges).values({
      studentId: student.id,
      feeTypeCode: "semester_1",
      amountDue: sem1Fee,
      semester: 1,
      createdBy: admin.id,
      updatedBy: admin.id,
    });

    await tx
      .update(applications)
      .set({
        stage: "enrolled",
        stageEnteredAt: new Date(),
        updatedAt: new Date(),
        updatedBy: admin.id,
      })
      .where(eq(applications.id, id));
  });

  await logActivity({
    actorId: admin.id,
    action: "application.enrol",
    entityType: "student",
    entityId: studentId,
    details: { applicationId: id, intakeId: activeIntake.id },
  });

  revalidatePath("/admin/applications");
  revalidatePath("/admin/students");
  revalidatePath("/teacher/students");
  return { ok: true };
}

/** Exit: Not accepted. */
export async function markNotAccepted(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("admin");
  const id = String(formData.get("applicationId") ?? "");
  if (!id) return { ok: false, error: "Missing application." };

  const app = await loadApplication(id);
  if (!app) return { ok: false, error: "Application not found." };
  if (["enrolled", "not_accepted", "withdrew"].includes(app.stage))
    return { ok: false, error: "This application can no longer be changed." };

  await getDb()
    .update(applications)
    .set({
      stage: "not_accepted",
      stageEnteredAt: new Date(),
      updatedAt: new Date(),
      updatedBy: admin.id,
    })
    .where(eq(applications.id, id));

  await logActivity({
    actorId: admin.id,
    action: "application.not_accepted",
    entityType: "application",
    entityId: id,
  });

  revalidatePath("/admin/applications");
  return { ok: true };
}

/** Exit: Withdrew (reason required). */
export async function markWithdrew(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("admin");
  const id = String(formData.get("applicationId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return { ok: false, error: "Missing application." };
  if (!reason) return { ok: false, error: "A reason is required to withdraw." };

  const app = await loadApplication(id);
  if (!app) return { ok: false, error: "Application not found." };
  if (["enrolled", "not_accepted", "withdrew"].includes(app.stage))
    return { ok: false, error: "This application can no longer be changed." };

  await getDb()
    .update(applications)
    .set({
      stage: "withdrew",
      withdrewReason: reason,
      stageEnteredAt: new Date(),
      updatedAt: new Date(),
      updatedBy: admin.id,
    })
    .where(eq(applications.id, id));

  await logActivity({
    actorId: admin.id,
    action: "application.withdrew",
    entityType: "application",
    entityId: id,
    details: { reason },
  });

  revalidatePath("/admin/applications");
  return { ok: true };
}
