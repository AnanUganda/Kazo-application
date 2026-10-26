import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";
import { DEFAULT_FEE_TYPES } from "@/lib/fees";
import { PREVIEW_IDS } from "@/lib/preview";

type PreviewDb = PgliteDatabase<typeof schema>;

const g = globalThis as typeof globalThis & { __previewDb?: PreviewDb };

/** Create the in-memory DB, run migrations, seed sample data. Runs once. */
export async function initPreviewDb(): Promise<PreviewDb> {
  if (g.__previewDb) return g.__previewDb;
  const client = new PGlite();
  const db = drizzle(client, { schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: "lib/db/migrations" });
  await seed(db);
  g.__previewDb = db;
  return db;
}

async function seed(db: PreviewDb) {
  const day = 86_400_000;
  const now = Date.now();
  const iso = (offset: number) =>
    new Date(now + offset * day).toISOString().slice(0, 10);
  const ts = (offset: number) => new Date(now + offset * day);

  await db.insert(schema.staff).values([
    { id: PREVIEW_IDS.admin, email: "admin@preview.local", fullName: "Aisha N. (Admin)", role: "admin" },
    { id: PREVIEW_IDS.teacher, email: "teacher@preview.local", fullName: "John Okello (Teacher)", role: "teacher" },
    { id: PREVIEW_IDS.store_keeper, email: "store@preview.local", fullName: "Mary Atim (Store)", role: "store_keeper" },
  ]);

  await db.insert(schema.appSettings).values({ id: "global", attendanceThreshold: 85 });
  await db.insert(schema.feeTypes).values(
    DEFAULT_FEE_TYPES.map((f) => ({
      code: f.code,
      name: f.name,
      defaultAmount: f.defaultAmount,
      appliesToSemester: f.appliesToSemester,
      sortOrder: f.sortOrder,
    })),
  );

  const [intake] = await db
    .insert(schema.intakes)
    .values({
      name: "2026 Intake",
      status: "active",
      startDate: iso(-60),
      endDate: iso(300),
      semester1Start: iso(-55),
      semester1End: iso(35),
      semester2Start: iso(40),
      semester2End: iso(130),
    })
    .returning();

  const topicDefs: {
    semester: number;
    title: string;
    type: "theory" | "practical";
    targetWeek: number;
  }[] = [
    { semester: 1, title: "Workshop safety & PPE", type: "theory", targetWeek: 1 },
    { semester: 1, title: "Striking an arc", type: "practical", targetWeek: 2 },
    { semester: 1, title: "Running beads", type: "practical", targetWeek: 4 },
    { semester: 1, title: "Joint types & fit-up", type: "theory", targetWeek: 6 },
    { semester: 1, title: "Fillet welds", type: "practical", targetWeek: 10 },
    { semester: 1, title: "Weld inspection basics", type: "theory", targetWeek: 12 },
    { semester: 2, title: "Reading engineering drawings", type: "theory", targetWeek: 2 },
    { semester: 2, title: "Sheet-metal fabrication", type: "practical", targetWeek: 5 },
  ];
  const topics = await db
    .insert(schema.syllabusTopics)
    .values(topicDefs.map((t, i) => ({ ...t, intakeId: intake.id, sortOrder: i })))
    .returning();

  const studentDefs: {
    fullName: string;
    phone: string;
    email: string;
    dob: string;
    location: string;
    booth: string;
    nextOfKinName: string;
    nextOfKinPhone: string;
    nextOfKinRelationship: string;
    educationLevel: string;
    priorExperience: string;
    heardAbout: string;
    interviewNotes: string;
  }[] = [
    {
      fullName: "Amina Nakato",
      phone: "0772111111",
      email: "amina.nakato@example.com",
      dob: "2003-04-12",
      location: "Kawempe, Kampala",
      booth: "Booth 1",
      nextOfKinName: "Hajjat Mariam Nakato",
      nextOfKinPhone: "0772900100",
      nextOfKinRelationship: "Mother",
      educationLevel: "S.4 (UCE)",
      priorExperience: "Assisted at a local metal fabrication workshop for 3 months.",
      heardAbout: "Graduate referral",
      interviewNotes: "Very steady hand during bench test; strong safety awareness.",
    },
    {
      fullName: "Brian Ssali",
      phone: "0772222222",
      email: "brian.ssali@example.com",
      dob: "2001-11-23",
      location: "Nansana, Wakiso",
      booth: "Booth 2",
      nextOfKinName: "Peter Ssali",
      nextOfKinPhone: "0772900200",
      nextOfKinRelationship: "Father",
      educationLevel: "S.6 (UACE)",
      priorExperience: "None",
      heardAbout: "Facebook / Website",
      interviewNotes: "Eager learner, passed practical measurement test.",
    },
    {
      fullName: "Carol Achan",
      phone: "0772333333",
      email: "carol.achan@example.com",
      dob: "2004-02-08",
      location: "Bwaise, Kampala",
      booth: "Booth 3",
      nextOfKinName: "Beatrice Oroma",
      nextOfKinPhone: "0772900300",
      nextOfKinRelationship: "Aunt",
      educationLevel: "S.4 (UCE)",
      priorExperience: "Basic grinding & cutting.",
      heardAbout: "Community outreach",
      interviewNotes: "Good practical score; commutes from Bwaise.",
    },
    {
      fullName: "David Mugisha",
      phone: "0772444444",
      email: "david.mugisha@example.com",
      dob: "2002-07-19",
      location: "Kazo Central, Kampala",
      booth: "Booth 4",
      nextOfKinName: "Moses Mugisha",
      nextOfKinPhone: "0772900400",
      nextOfKinRelationship: "Brother",
      educationLevel: "S.4 (UCE)",
      priorExperience: "None",
      heardAbout: "Walk-in",
      interviewNotes: "Lives nearby in Kazo; passed entrance interview.",
    },
  ];

  const enrolledApps = await db
    .insert(schema.applications)
    .values(
      studentDefs.map((s) => ({
        intakeId: intake.id,
        fullName: s.fullName,
        phone: s.phone,
        email: s.email,
        dob: s.dob,
        location: s.location,
        educationLevel: s.educationLevel,
        priorExperience: s.priorExperience,
        heardAbout: s.heardAbout,
        nextOfKinName: s.nextOfKinName,
        nextOfKinPhone: s.nextOfKinPhone,
        nextOfKinRelationship: s.nextOfKinRelationship,
        stage: "enrolled" as const,
        stageEnteredAt: ts(-55),
        testDate: iso(-58),
        testResult: "pass" as const,
        interviewNotes: s.interviewNotes,
        createdAt: ts(-62),
      })),
    )
    .returning();

  const studs = await db
    .insert(schema.students)
    .values(
      studentDefs.map((s, idx) => ({
        applicationId: enrolledApps[idx].id,
        intakeId: intake.id,
        fullName: s.fullName,
        phone: s.phone,
        email: s.email,
        dob: s.dob,
        location: s.location,
        nextOfKinName: s.nextOfKinName,
        nextOfKinPhone: s.nextOfKinPhone,
        nextOfKinRelationship: s.nextOfKinRelationship,
        booth: s.booth,
        status: "active" as const,
        createdAt: ts(-55),
      })),
    )
    .returning();

  // Also seed one dropped-out student so the kept-records section is visible in preview.
  await db.insert(schema.students).values({
    intakeId: intake.id,
    fullName: "Samuel Otim",
    phone: "0772555555",
    location: "Matugga",
    nextOfKinName: "Richard Otim",
    nextOfKinPhone: "0772900500",
    nextOfKinRelationship: "Uncle",
    status: "dropped_out",
    createdAt: ts(-55),
  });

  const apps = await db
    .insert(schema.applications)
    .values([
      { intakeId: intake.id, fullName: "Esther Auma", phone: "0700111222", stage: "applied_unpaid", stageEnteredAt: ts(-3) },
      { intakeId: intake.id, fullName: "Francis Opio", phone: "0700333444", stage: "applied_unpaid", stageEnteredAt: ts(-20) },
      { intakeId: intake.id, fullName: "Grace Nabirye", phone: "0700555666", stage: "registered", stageEnteredAt: ts(-6) },
      { intakeId: intake.id, fullName: "Henry Kato", phone: "0700777888", stage: "test_interview", stageEnteredAt: ts(-2), testDate: iso(-2), testResult: "pass", interviewNotes: "Strong practical aptitude." },
      { intakeId: intake.id, fullName: "Irene Apio", phone: "0700999000", stage: "withdrew", withdrewReason: "Relocated", stageEnteredAt: ts(-10) },
    ])
    .returning();

  // Registration payment for the registered applicant.
  const grace = apps[2];
  const [regCharge] = await db
    .insert(schema.feeCharges)
    .values({ applicationId: grace.id, feeTypeCode: "registration", amountDue: 35_000 })
    .returning();
  await db.insert(schema.payments).values({
    applicationId: grace.id,
    feeChargeId: regCharge.id,
    entryType: "payment",
    amount: 35_000,
    method: "mtn",
    reference: "MTN-7788",
    paidAt: iso(-6),
    confirmedBy: "Bursar",
  });

  // Amina: semester 1 partial payment + a reversed duplicate (shows the ledger).
  const amina = studs[0];
  const [s1Charge] = await db
    .insert(schema.feeCharges)
    .values({ studentId: amina.id, feeTypeCode: "semester_1", amountDue: 800_000, semester: 1 })
    .returning();
  await db.insert(schema.payments).values({
    studentId: amina.id, feeChargeId: s1Charge.id, entryType: "payment",
    amount: 500_000, method: "cash", reference: "RC-1001", paidAt: iso(-30), confirmedBy: "Bursar",
  });
  const [dup] = await db
    .insert(schema.payments)
    .values({
      studentId: amina.id, feeChargeId: s1Charge.id, entryType: "payment",
      amount: 200_000, method: "airtel", reference: "AIR-55", paidAt: iso(-20), confirmedBy: "Bursar",
    })
    .returning();
  await db.insert(schema.payments).values({
    studentId: amina.id, feeChargeId: s1Charge.id, entryType: "reversal",
    amount: 200_000, method: "airtel", reference: "AIR-55", paidAt: iso(-19),
    confirmedBy: "Bursar", reversesPaymentId: dup.id, reason: "Duplicate entry",
  });

  // Brian: semester 1 fully paid.
  const brian = studs[1];
  const [s1b] = await db
    .insert(schema.feeCharges)
    .values({ studentId: brian.id, feeTypeCode: "semester_1", amountDue: 800_000, semester: 1 })
    .returning();
  await db.insert(schema.payments).values({
    studentId: brian.id, feeChargeId: s1b.id, entryType: "payment",
    amount: 800_000, method: "mtn", reference: "MTN-200", paidAt: iso(-25), confirmedBy: "Bursar",
  });

  // Carol: semester 1 partial payment (UGX 300,000 paid, UGX 500,000 balance).
  const carol = studs[2];
  const [s1c] = await db
    .insert(schema.feeCharges)
    .values({ studentId: carol.id, feeTypeCode: "semester_1", amountDue: 800_000, semester: 1 })
    .returning();
  await db.insert(schema.payments).values({
    studentId: carol.id, feeChargeId: s1c.id, entryType: "payment",
    amount: 300_000, method: "mtn", reference: "MTN-412", paidAt: iso(-18), confirmedBy: "Bursar",
  });

  // David: semester 1 billed, no payments yet (UGX 800,000 balance).
  const david = studs[3];
  await db
    .insert(schema.feeCharges)
    .values({ studentId: david.id, feeTypeCode: "semester_1", amountDue: 800_000, semester: 1 });

  // Lesson logs by the teacher.
  const [log1] = await db
    .insert(schema.lessonLogs)
    .values({ intakeId: intake.id, teacherId: PREVIEW_IDS.teacher, date: iso(-28), session: "morning", notes: "Safety induction completed.", createdBy: PREVIEW_IDS.teacher })
    .returning();
  await db.insert(schema.lessonTopicProgress).values([
    { lessonLogId: log1.id, topicId: topics[0].id, status: "completed" },
    { lessonLogId: log1.id, topicId: topics[1].id, status: "completed" },
  ]);
  await db.insert(schema.lessonAbsences).values({ lessonLogId: log1.id, studentId: studs[2].id });

  const [log2] = await db
    .insert(schema.lessonLogs)
    .values({ intakeId: intake.id, teacherId: PREVIEW_IDS.teacher, date: iso(-7), session: "afternoon", notes: "Bead practice; a machine was faulty.", createdBy: PREVIEW_IDS.teacher })
    .returning();
  await db.insert(schema.lessonTopicProgress).values({ lessonLogId: log2.id, topicId: topics[2].id, status: "started" });
  await db.insert(schema.lessonAbsences).values({ lessonLogId: log2.id, studentId: studs[3].id });
  await db.insert(schema.lessonIssues).values({
    lessonLogId: log2.id, description: "Welding machine not powering on.",
    isMachineIssue: true, machineLabel: "KTS-WM-03", status: "open", createdBy: PREVIEW_IDS.teacher,
  });
}
