import "server-only";
import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  applications,
  appSettings,
  equipment,
  feeCharges,
  feeTypes,
  intakes,
  lessonAbsences,
  lessonLogs,
  payments,
  practicalAssessments,
  staff,
  students,
  syllabusTopics,
  type Application,
  type Equipment,
  type FeeCharge,
  type Intake,
  type LessonSession,
  type Payment,
  type Student,
} from "@/lib/db/schema";
import { computeAttendance, type AttendanceSummary } from "@/lib/attendance";
import { DEFAULT_FEE_TYPES } from "@/lib/fees";
import { toKampalaDate } from "@/lib/format";
import { ledgerBalance } from "@/lib/ledger";

export type StudentListItem = {
  student: Student;
  attendance: AttendanceSummary;
  /** Strictly null when loaded for a non-admin role (Teacher never sees fees). */
  fees: { totalDue: number; paid: number; balance: number } | null;
};

export type StudentAbsenceRecord = {
  lessonLogId: string;
  date: string;
  session: LessonSession;
  teacherName: string;
  notes: string | null;
};

export type StudentPaymentEntry = Payment & {
  isReversed: boolean;
  recordedByName: string | null;
};

export type StudentFeeLine = {
  code: string;
  name: string;
  appliesToSemester: number | null;
  defaultAmount: number;
  charge: FeeCharge | null;
  billed: boolean;
  amountDue: number;
  paid: number;
  balance: number;
  payments: StudentPaymentEntry[];
};

export type StudentFeesProfile = {
  totals: { totalDue: number; paid: number; balance: number };
  lines: StudentFeeLine[];
};

export type StudentPracticalAttempt = {
  id: string;
  date: string;
  result: "pass" | "redo";
  score: number | null;
  notes: string | null;
  assessorName: string | null;
};

/** One practical syllabus module with this student's attempts, newest first. */
export type StudentPractical = {
  topicId: string;
  title: string;
  semester: number;
  attempts: StudentPracticalAttempt[];
};

export type StudentProfileData = {
  student: Student;
  intake: Intake;
  threshold: number;
  attendance: AttendanceSummary;
  absences: StudentAbsenceRecord[];
  application: Application | null;
  assignedEquipment: Equipment[];
  practicals: StudentPractical[];
  /** Strictly null when loaded for a non-admin role. */
  fees: StudentFeesProfile | null;
};

/** Load the student list for an intake, with derived attendance and (admin-only) fee balances. */
export async function loadStudentList(
  intakeId: string,
  options: { includeFees: boolean },
): Promise<{ items: StudentListItem[]; threshold: number }> {
  const db = getDb();

  const settingsRow = (
    await db
      .select({ attendanceThreshold: appSettings.attendanceThreshold })
      .from(appSettings)
      .where(eq(appSettings.id, "global"))
      .limit(1)
  )[0];
  const threshold = settingsRow?.attendanceThreshold ?? 85;

  const roster = await db
    .select()
    .from(students)
    .where(and(eq(students.intakeId, intakeId), isNull(students.archivedAt)))
    .orderBy(asc(students.fullName));

  if (roster.length === 0) {
    return { items: [], threshold };
  }

  const sessions = await db
    .select({ id: lessonLogs.id, date: lessonLogs.date })
    .from(lessonLogs)
    .where(
      and(eq(lessonLogs.intakeId, intakeId), isNull(lessonLogs.archivedAt)),
    );

  const studentIds = roster.map((s) => s.id);
  const absenceRows = await db
    .select({
      studentId: lessonAbsences.studentId,
      lessonLogId: lessonAbsences.lessonLogId,
    })
    .from(lessonAbsences)
    .where(
      and(
        inArray(lessonAbsences.studentId, studentIds),
        isNull(lessonAbsences.archivedAt),
      ),
    );

  const absencesByStudent = new Map<string, Set<string>>();
  for (const row of absenceRows) {
    let set = absencesByStudent.get(row.studentId);
    if (!set) {
      set = new Set();
      absencesByStudent.set(row.studentId, set);
    }
    set.add(row.lessonLogId);
  }

  let feesByStudent: Map<
    string,
    { totalDue: number; paid: number; balance: number }
  > | null = null;

  if (options.includeFees) {
    feesByStudent = new Map();
    const appIds = roster
      .map((s) => s.applicationId)
      .filter((id): id is string => Boolean(id));

    const partyFilter =
      appIds.length > 0
        ? or(
            inArray(feeCharges.studentId, studentIds),
            inArray(feeCharges.applicationId, appIds),
          )!
        : inArray(feeCharges.studentId, studentIds);

    const charges = await db
      .select()
      .from(feeCharges)
      .where(and(partyFilter, isNull(feeCharges.archivedAt)));

    const chargeIds = charges.map((c) => c.id);
    const paymentRows =
      chargeIds.length > 0
        ? await db
            .select()
            .from(payments)
            .where(
              and(
                inArray(payments.feeChargeId, chargeIds),
                isNull(payments.archivedAt),
              ),
            )
        : [];

    for (const s of roster) {
      const sCharges = charges.filter(
        (c) =>
          c.studentId === s.id ||
          (s.applicationId !== null && c.applicationId === s.applicationId),
      );
      const sChargeIds = new Set(sCharges.map((c) => c.id));
      const sPayments = paymentRows.filter((p) => sChargeIds.has(p.feeChargeId));
      feesByStudent.set(s.id, ledgerBalance(sCharges, sPayments));
    }
  }

  const items: StudentListItem[] = roster.map((s) => {
    const absentSet = absencesByStudent.get(s.id) ?? new Set<string>();
    const attendance = computeAttendance(
      sessions,
      absentSet,
      toKampalaDate(s.createdAt),
      threshold,
    );
    const fees = feesByStudent
      ? (feesByStudent.get(s.id) ?? { totalDue: 0, paid: 0, balance: 0 })
      : null;
    return { student: s, attendance, fees };
  });

  return { items, threshold };
}

/** Load a single student's full profile. Excludes fee queries when includeFees is false. */
export async function loadStudentProfile(
  studentId: string,
  options: { includeFees: boolean },
): Promise<StudentProfileData | null> {
  const db = getDb();

  const student = (
    await db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), isNull(students.archivedAt)))
      .limit(1)
  )[0];
  if (!student) return null;

  const intake = (
    await db
      .select()
      .from(intakes)
      .where(eq(intakes.id, student.intakeId))
      .limit(1)
  )[0];
  if (!intake) return null;

  const settingsRow = (
    await db
      .select({ attendanceThreshold: appSettings.attendanceThreshold })
      .from(appSettings)
      .where(eq(appSettings.id, "global"))
      .limit(1)
  )[0];
  const threshold = settingsRow?.attendanceThreshold ?? 85;

  const application = student.applicationId
    ? ((
        await db
          .select()
          .from(applications)
          .where(eq(applications.id, student.applicationId))
          .limit(1)
      )[0] ?? null)
    : null;

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
    .where(
      and(
        eq(lessonLogs.intakeId, student.intakeId),
        isNull(lessonLogs.archivedAt),
      ),
    )
    .orderBy(desc(lessonLogs.date), desc(lessonLogs.createdAt));

  const absenceRows = await db
    .select({ lessonLogId: lessonAbsences.lessonLogId })
    .from(lessonAbsences)
    .where(
      and(
        eq(lessonAbsences.studentId, student.id),
        isNull(lessonAbsences.archivedAt),
      ),
    );
  const absentIds = new Set(absenceRows.map((a) => a.lessonLogId));

  const attendance = computeAttendance(
    logs.map((l) => ({ id: l.id, date: l.date })),
    absentIds,
    toKampalaDate(student.createdAt),
    threshold,
  );

  const absences: StudentAbsenceRecord[] = logs
    .filter((l) => absentIds.has(l.id))
    .map((l) => ({
      lessonLogId: l.id,
      date: l.date,
      session: l.session,
      teacherName: l.teacherName,
      notes: l.notes,
    }));

  const eqFilter = student.booth
    ? or(
        eq(equipment.assignedStudentId, student.id),
        eq(equipment.booth, student.booth),
      )!
    : eq(equipment.assignedStudentId, student.id);

  const assignedEquipment = await db
    .select()
    .from(equipment)
    .where(and(eqFilter, isNull(equipment.archivedAt)))
    .orderBy(asc(equipment.assetCode));

  let fees: StudentFeesProfile | null = null;
  if (options.includeFees) {
    const catalogueRows = await db
      .select()
      .from(feeTypes)
      .where(isNull(feeTypes.archivedAt))
      .orderBy(asc(feeTypes.sortOrder));

    const catalogue =
      catalogueRows.length > 0
        ? catalogueRows.map((f) => ({
            code: f.code,
            name: f.name,
            defaultAmount: f.defaultAmount,
            appliesToSemester: f.appliesToSemester,
            sortOrder: f.sortOrder,
          }))
        : DEFAULT_FEE_TYPES.map((f) => ({
            code: f.code,
            name: f.name,
            defaultAmount: f.defaultAmount,
            appliesToSemester: f.appliesToSemester,
            sortOrder: f.sortOrder,
          }));

    const partyFilter = student.applicationId
      ? or(
          eq(feeCharges.studentId, student.id),
          eq(feeCharges.applicationId, student.applicationId),
        )!
      : eq(feeCharges.studentId, student.id);

    const charges = await db
      .select()
      .from(feeCharges)
      .where(and(partyFilter, isNull(feeCharges.archivedAt)));

    const chargeIds = charges.map((c) => c.id);
    const paymentRows =
      chargeIds.length > 0
        ? await db
            .select()
            .from(payments)
            .where(
              and(
                inArray(payments.feeChargeId, chargeIds),
                isNull(payments.archivedAt),
              ),
            )
            .orderBy(desc(payments.paidAt), desc(payments.createdAt))
        : [];

    const staffRows = await db
      .select({ id: staff.id, fullName: staff.fullName })
      .from(staff);
    const staffNameById = new Map(staffRows.map((s) => [s.id, s.fullName]));

    const reversedIds = new Set(
      paymentRows
        .filter((p) => p.entryType === "reversal" && p.reversesPaymentId)
        .map((p) => p.reversesPaymentId as string),
    );

    const chargeByCode = new Map<string, FeeCharge>();
    for (const c of charges) {
      chargeByCode.set(c.feeTypeCode, c);
    }

    const lines: StudentFeeLine[] = catalogue.map((item) => {
      const charge = chargeByCode.get(item.code) ?? null;
      const itemPayments: StudentPaymentEntry[] = charge
        ? paymentRows
            .filter((p) => p.feeChargeId === charge.id)
            .map((p) => ({
              ...p,
              isReversed: reversedIds.has(p.id),
              recordedByName: p.createdBy
                ? (staffNameById.get(p.createdBy) ?? null)
                : null,
            }))
        : [];
      const summary = charge
        ? ledgerBalance([charge], itemPayments)
        : { totalDue: item.defaultAmount, paid: 0, balance: 0 };

      return {
        code: item.code,
        name: item.name,
        appliesToSemester: item.appliesToSemester,
        defaultAmount: item.defaultAmount,
        charge,
        billed: Boolean(charge),
        amountDue: charge ? charge.amountDue : item.defaultAmount,
        paid: summary.paid,
        balance: summary.balance,
        payments: itemPayments,
      };
    });

    const totals = ledgerBalance(charges, paymentRows);
    fees = { totals, lines };
  }

  const practicalTopics = await db
    .select({
      id: syllabusTopics.id,
      title: syllabusTopics.title,
      semester: syllabusTopics.semester,
    })
    .from(syllabusTopics)
    .where(
      and(
        eq(syllabusTopics.intakeId, student.intakeId),
        eq(syllabusTopics.type, "practical"),
        isNull(syllabusTopics.archivedAt),
      ),
    )
    .orderBy(asc(syllabusTopics.sortOrder));
  const attemptRows = await db
    .select({
      id: practicalAssessments.id,
      topicId: practicalAssessments.topicId,
      date: practicalAssessments.date,
      result: practicalAssessments.result,
      score: practicalAssessments.score,
      notes: practicalAssessments.notes,
      assessorName: staff.fullName,
    })
    .from(practicalAssessments)
    .leftJoin(staff, eq(practicalAssessments.createdBy, staff.id))
    .where(
      and(
        eq(practicalAssessments.studentId, student.id),
        isNull(practicalAssessments.archivedAt),
      ),
    )
    .orderBy(desc(practicalAssessments.date), desc(practicalAssessments.createdAt));
  const practicals: StudentPractical[] = practicalTopics.map((t) => ({
    topicId: t.id,
    title: t.title,
    semester: t.semester,
    attempts: attemptRows.filter((a) => a.topicId === t.id),
  }));

  return {
    student,
    intake,
    threshold,
    attendance,
    absences,
    application,
    assignedEquipment,
    practicals,
    fees,
  };
}
