"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, or } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import {
  feeCharges,
  feeTypes,
  intakes,
  payments,
  students,
  type PaymentMethod,
} from "@/lib/db/schema";
import { logActivity } from "@/lib/activity";
import { DEFAULT_FEE_TYPES } from "@/lib/fees";
import { parseAmountToInt, todayKampala } from "@/lib/format";

export type StudentActionState = {
  ok: boolean;
  error?: string;
};

export type StudentDetailsValues = {
  fullName?: string;
  phone?: string;
  email?: string;
  dob?: string;
  location?: string;
  booth?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  nextOfKinRelationship?: string;
};

export type StudentDetailsState = {
  ok: boolean;
  error?: string;
  values?: StudentDetailsValues;
};

export type PaymentFormValues = {
  amount?: string;
  method?: string;
  reference?: string;
  paidAt?: string;
  confirmedBy?: string;
};

export type PaymentFormState = {
  ok: boolean;
  error?: string;
  values?: PaymentFormValues;
};

export type ReversalFormValues = {
  reason?: string;
  confirmedBy?: string;
};

export type ReversalFormState = {
  ok: boolean;
  error?: string;
  values?: ReversalFormValues;
};

async function loadEditableStudent(studentId: string) {
  const db = getDb();
  const student = (
    await db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), isNull(students.archivedAt)))
      .limit(1)
  )[0];
  if (!student) return { student: null, error: "Student not found." };

  const intake = (
    await db
      .select({ status: intakes.status })
      .from(intakes)
      .where(eq(intakes.id, student.intakeId))
      .limit(1)
  )[0];
  if (!intake || intake.status !== "active") {
    return {
      student: null,
      error: "This intake is closed (archived) and its student records are read-only.",
    };
  }
  return { student, error: null };
}

function revalidateStudentPaths(studentId: string) {
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/teacher/students");
  revalidatePath(`/teacher/students/${studentId}`);
}

/** Change student status (Active / Suspended / Dropped out). */
export async function updateStudentStatus(
  _prev: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const admin = await requireRole("admin");
  const studentId = String(formData.get("studentId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!studentId) return { ok: false, error: "Missing student." };
  if (!["active", "suspended", "dropped_out"].includes(status)) {
    return { ok: false, error: "Choose a valid student status." };
  }

  const { student, error } = await loadEditableStudent(studentId);
  if (!student) return { ok: false, error: error ?? "Student not found." };

  await getDb()
    .update(students)
    .set({
      status: status as "active" | "suspended" | "dropped_out",
      updatedAt: new Date(),
      updatedBy: admin.id,
    })
    .where(eq(students.id, studentId));

  await logActivity({
    actorId: admin.id,
    action: "student.status_change",
    entityType: "student",
    entityId: studentId,
    details: { previousStatus: student.status, status },
  });

  revalidateStudentPaths(studentId);
  return { ok: true };
}

/** Update student contact details, next of kin, and booth assignment. */
export async function updateStudentDetails(
  _prev: StudentDetailsState,
  formData: FormData,
): Promise<StudentDetailsState> {
  const admin = await requireRole("admin");
  const studentId = String(formData.get("studentId") ?? "");

  const values: StudentDetailsValues = {
    fullName: String(formData.get("fullName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    dob: String(formData.get("dob") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    booth: String(formData.get("booth") ?? "").trim(),
    nextOfKinName: String(formData.get("nextOfKinName") ?? "").trim(),
    nextOfKinPhone: String(formData.get("nextOfKinPhone") ?? "").trim(),
    nextOfKinRelationship: String(
      formData.get("nextOfKinRelationship") ?? "",
    ).trim(),
  };

  if (!studentId) return { ok: false, error: "Missing student.", values };
  if (!values.fullName)
    return { ok: false, error: "Enter the student's full name.", values };
  if (!values.phone)
    return { ok: false, error: "Enter the student's phone number.", values };
  if (values.dob && !/^\d{4}-\d{2}-\d{2}$/.test(values.dob)) {
    return {
      ok: false,
      error: "Date of birth must be YYYY-MM-DD.",
      values,
    };
  }

  const { student, error } = await loadEditableStudent(studentId);
  if (!student) return { ok: false, error: error ?? "Student not found.", values };

  await getDb()
    .update(students)
    .set({
      fullName: values.fullName,
      phone: values.phone,
      email: values.email || null,
      dob: values.dob || null,
      location: values.location || null,
      booth: values.booth || null,
      nextOfKinName: values.nextOfKinName || null,
      nextOfKinPhone: values.nextOfKinPhone || null,
      nextOfKinRelationship: values.nextOfKinRelationship || null,
      updatedAt: new Date(),
      updatedBy: admin.id,
    })
    .where(eq(students.id, studentId));

  await logActivity({
    actorId: admin.id,
    action: "student.update",
    entityType: "student",
    entityId: studentId,
    details: { fullName: values.fullName, booth: values.booth || null },
  });

  revalidateStudentPaths(studentId);
  return { ok: true };
}

async function resolveFeeDefinition(code: string) {
  const row = (
    await getDb()
      .select()
      .from(feeTypes)
      .where(eq(feeTypes.code, code))
      .limit(1)
  )[0];
  if (row) {
    return {
      code: row.code,
      name: row.name,
      defaultAmount: row.defaultAmount,
      appliesToSemester: row.appliesToSemester,
    };
  }
  const fallback = DEFAULT_FEE_TYPES.find((f) => f.code === code);
  return fallback ?? null;
}

/** Add a fee charge line to the student's ledger using the Settings catalogue amount. */
export async function billFeeItem(
  _prev: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const admin = await requireRole("admin");
  const studentId = String(formData.get("studentId") ?? "");
  const feeTypeCode = String(formData.get("feeTypeCode") ?? "");

  if (!studentId || !feeTypeCode) {
    return { ok: false, error: "Missing student or fee item." };
  }

  const { student, error } = await loadEditableStudent(studentId);
  if (!student) return { ok: false, error: error ?? "Student not found." };

  const feeDef = await resolveFeeDefinition(feeTypeCode);
  if (!feeDef) return { ok: false, error: "Unknown fee item." };

  const db = getDb();
  const partyMatch = student.applicationId
    ? or(
        eq(feeCharges.studentId, student.id),
        eq(feeCharges.applicationId, student.applicationId),
      )!
    : eq(feeCharges.studentId, student.id);

  const existing = (
    await db
      .select()
      .from(feeCharges)
      .where(
        and(
          partyMatch,
          eq(feeCharges.feeTypeCode, feeTypeCode),
          isNull(feeCharges.archivedAt),
        ),
      )
      .limit(1)
  )[0];

  if (existing) {
    return { ok: true };
  }

  const [created] = await db
    .insert(feeCharges)
    .values({
      studentId: student.id,
      feeTypeCode: feeDef.code,
      amountDue: feeDef.defaultAmount,
      semester: feeDef.appliesToSemester,
      createdBy: admin.id,
      updatedBy: admin.id,
    })
    .returning();

  await logActivity({
    actorId: admin.id,
    action: "fee_charge.create",
    entityType: "fee_charge",
    entityId: created.id,
    details: {
      studentId: student.id,
      feeTypeCode: feeDef.code,
      amountDue: feeDef.defaultAmount,
    },
  });

  revalidateStudentPaths(studentId);
  return { ok: true };
}

/**
 * Record a student fee payment (partial or full) into the append-only ledger.
 * Automatically creates the fee_charge row if the fee item was not billed yet.
 */
export async function recordStudentPayment(
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const admin = await requireRole("admin");
  const studentId = String(formData.get("studentId") ?? "");
  const feeTypeCode = String(formData.get("feeTypeCode") ?? "");

  const values: PaymentFormValues = {
    amount: String(formData.get("amount") ?? "").trim(),
    method: String(formData.get("method") ?? "mtn"),
    reference: String(formData.get("reference") ?? "").trim(),
    paidAt: String(formData.get("paidAt") ?? "").trim() || todayKampala(),
    confirmedBy: String(formData.get("confirmedBy") ?? "").trim(),
  };

  if (!studentId || !feeTypeCode) {
    return { ok: false, error: "Missing student or fee item.", values };
  }

  const amount = parseAmountToInt(values.amount ?? "");
  if (amount === null || amount <= 0) {
    return { ok: false, error: "Enter a valid amount in UGX.", values };
  }
  if (!["mtn", "airtel", "cash"].includes(values.method ?? "")) {
    return { ok: false, error: "Choose a payment method.", values };
  }
  if (!values.reference) {
    return {
      ok: false,
      error: "Enter the transaction or receipt reference.",
      values,
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.paidAt ?? "")) {
    return { ok: false, error: "Enter a valid payment date.", values };
  }
  if (!values.confirmedBy) {
    return { ok: false, error: "Enter who confirmed the payment.", values };
  }

  const { student, error } = await loadEditableStudent(studentId);
  if (!student) return { ok: false, error: error ?? "Student not found.", values };

  const feeDef = await resolveFeeDefinition(feeTypeCode);
  if (!feeDef) return { ok: false, error: "Unknown fee item.", values };

  const db = getDb();
  let paymentId = "";

  await db.transaction(async (tx) => {
    const partyMatch = student.applicationId
      ? or(
          eq(feeCharges.studentId, student.id),
          eq(feeCharges.applicationId, student.applicationId),
        )!
      : eq(feeCharges.studentId, student.id);

    let charge = (
      await tx
        .select()
        .from(feeCharges)
        .where(
          and(
            partyMatch,
            eq(feeCharges.feeTypeCode, feeTypeCode),
            isNull(feeCharges.archivedAt),
          ),
        )
        .limit(1)
    )[0];

    if (!charge) {
      charge = (
        await tx
          .insert(feeCharges)
          .values({
            studentId: student.id,
            feeTypeCode: feeDef.code,
            amountDue: feeDef.defaultAmount,
            semester: feeDef.appliesToSemester,
            createdBy: admin.id,
            updatedBy: admin.id,
          })
          .returning()
      )[0];
    }

    const [inserted] = await tx
      .insert(payments)
      .values({
        studentId: charge.studentId,
        applicationId: charge.applicationId,
        feeChargeId: charge.id,
        entryType: "payment",
        amount,
        method: values.method as PaymentMethod,
        reference: values.reference,
        paidAt: values.paidAt!,
        confirmedBy: values.confirmedBy,
        createdBy: admin.id,
        updatedBy: admin.id,
      })
      .returning({ id: payments.id });

    paymentId = inserted.id;
  });

  await logActivity({
    actorId: admin.id,
    action: "payment.record",
    entityType: "payment",
    entityId: paymentId,
    details: {
      studentId: student.id,
      feeTypeCode,
      amount,
      method: values.method,
      reference: values.reference,
      paidAt: values.paidAt,
      confirmedBy: values.confirmedBy,
    },
  });

  revalidateStudentPaths(studentId);
  return { ok: true };
}

/**
 * Append a reversal entry for an existing payment. Payments are never edited
 * or deleted; a mistake is offset by a reversal recording reason + who.
 */
export async function reverseStudentPayment(
  _prev: ReversalFormState,
  formData: FormData,
): Promise<ReversalFormState> {
  const admin = await requireRole("admin");
  const studentId = String(formData.get("studentId") ?? "");
  const paymentId = String(formData.get("paymentId") ?? "");

  const values: ReversalFormValues = {
    reason: String(formData.get("reason") ?? "").trim(),
    confirmedBy: String(formData.get("confirmedBy") ?? "").trim(),
  };

  if (!studentId || !paymentId) {
    return { ok: false, error: "Missing payment to reverse.", values };
  }
  if (!values.reason) {
    return {
      ok: false,
      error: "A reason is required to reverse a payment.",
      values,
    };
  }
  if (!values.confirmedBy) {
    return {
      ok: false,
      error: "Enter who confirmed this reversal.",
      values,
    };
  }

  const { student, error } = await loadEditableStudent(studentId);
  if (!student) return { ok: false, error: error ?? "Student not found.", values };

  const db = getDb();
  const original = (
    await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, paymentId), isNull(payments.archivedAt)))
      .limit(1)
  )[0];

  if (!original) {
    return { ok: false, error: "Original payment not found.", values };
  }
  const belongsToStudent =
    original.studentId === student.id ||
    (student.applicationId !== null &&
      original.applicationId === student.applicationId);
  if (!belongsToStudent) {
    return {
      ok: false,
      error: "Payment does not belong to this student.",
      values,
    };
  }
  if (original.entryType !== "payment") {
    return { ok: false, error: "A reversal entry cannot be reversed.", values };
  }

  const existingReversal = (
    await db
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(
          eq(payments.reversesPaymentId, original.id),
          isNull(payments.archivedAt),
        ),
      )
      .limit(1)
  )[0];
  if (existingReversal) {
    return {
      ok: false,
      error: "This payment has already been reversed.",
      values,
    };
  }

  const [reversal] = await db
    .insert(payments)
    .values({
      studentId: original.studentId,
      applicationId: original.applicationId,
      feeChargeId: original.feeChargeId,
      entryType: "reversal",
      amount: original.amount,
      method: original.method,
      reference: original.reference,
      paidAt: todayKampala(),
      confirmedBy: values.confirmedBy,
      reversesPaymentId: original.id,
      reason: values.reason,
      createdBy: admin.id,
      updatedBy: admin.id,
    })
    .returning({ id: payments.id });

  await logActivity({
    actorId: admin.id,
    action: "payment.reverse",
    entityType: "payment",
    entityId: reversal.id,
    details: {
      studentId: student.id,
      reversesPaymentId: original.id,
      amount: original.amount,
      reason: values.reason,
      confirmedBy: values.confirmedBy,
    },
  });

  revalidateStudentPaths(studentId);
  return { ok: true };
}
