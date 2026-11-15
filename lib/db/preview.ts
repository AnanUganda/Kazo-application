import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";
import { DEFAULT_FEE_TYPES } from "@/lib/fees";
import { KTS_SYLLABUS_MODULES } from "@/lib/syllabus-defaults";
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
    { id: PREVIEW_IDS.admin, email: "admin@preview.local", fullName: "Tumuhairwe Timothy Kirabo (Principal)", role: "admin" },
    { id: PREVIEW_IDS.teacher, email: "teacher@preview.local", fullName: "Opio Joel (Instructor)", role: "teacher" },
    { id: PREVIEW_IDS.store_keeper, email: "store@preview.local", fullName: "Musasizi Tonny (Store / Asst. Instructor)", role: "store_keeper" },
    { id: PREVIEW_IDS.bible_teacher, email: "bible@preview.local", fullName: "Ssemakula Daniel (Bible teacher)", role: "bible_teacher" },
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

  // KTS syllabus: 2 semesters x 13 weeks (91 days per semester).
  const [intake] = await db
    .insert(schema.intakes)
    .values({
      name: "2026 Intake",
      status: "active",
      startDate: iso(-50),
      endDate: iso(140),
      semester1Start: iso(-49), // Currently in Week 8 of 13 in Semester 1
      semester1End: iso(42),
      semester2Start: iso(49),
      semester2End: iso(140),
    })
    .returning();

  const topics = await db
    .insert(schema.syllabusTopics)
    .values(
      KTS_SYLLABUS_MODULES.map((m) => ({
        intakeId: intake.id,
        semester: m.semester,
        title: m.title,
        type: m.type,
        targetWeek: m.targetWeek,
        description: m.description,
        sortOrder: m.moduleNumber,
      })),
    )
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

  // Lesson logs by the teacher (Modules 1-4 completed, Module 5 started, Module 6 due this week).
  const [log1] = await db
    .insert(schema.lessonLogs)
    .values({ intakeId: intake.id, teacherId: PREVIEW_IDS.teacher, date: iso(-28), session: "morning", notes: "Safety in Welding & SMAW fundamentals completed.", createdBy: PREVIEW_IDS.teacher })
    .returning();
  await db.insert(schema.lessonTopicProgress).values([
    { lessonLogId: log1.id, topicId: topics[0].id, status: "completed" },
    { lessonLogId: log1.id, topicId: topics[1].id, status: "completed" },
    { lessonLogId: log1.id, topicId: topics[2].id, status: "completed" },
    { lessonLogId: log1.id, topicId: topics[3].id, status: "completed" },
  ]);
  await db.insert(schema.lessonAbsences).values({ lessonLogId: log1.id, studentId: studs[2].id });

  const [log2] = await db
    .insert(schema.lessonLogs)
    .values({ intakeId: intake.id, teacherId: PREVIEW_IDS.teacher, date: iso(-1), session: "afternoon", notes: "Hand tools & Oxy-Fuel setup; KTS-WM-03 power issue.", createdBy: PREVIEW_IDS.teacher })
    .returning();
  await db.insert(schema.lessonTopicProgress).values([
    { lessonLogId: log2.id, topicId: topics[4].id, status: "started" },
    { lessonLogId: log2.id, topicId: topics[5].id, status: "started" },
  ]);
  await db.insert(schema.lessonAbsences).values({ lessonLogId: log2.id, studentId: studs[3].id });
  const [machineIssue] = await db
    .insert(schema.lessonIssues)
    .values({
      lessonLogId: log2.id,
      description: "Welding machine not powering on.",
      isMachineIssue: true,
      machineLabel: "KTS-WM-03",
      status: "open",
      createdBy: PREVIEW_IDS.teacher,
    })
    .returning();

  // Daily morning Bible class (one hour) — logged by the Bible teacher.
  const bibleTopics = [
    "Proverbs 22:29 · Skill in your work",
    "Colossians 3:23 · Working with all your heart",
    "Proverbs 3:5–6 · Trust",
    "Psalm 90:17 · Establish the work of our hands",
    "Exodus 31:1–5 · Bezalel, the craftsman",
    "Matthew 7:24–27 · Building on rock",
    "Philippians 4:13 · Strength",
    "James 1:2–4 · Perseverance",
  ];
  const bibleLogs = await db
    .insert(schema.lessonLogs)
    .values(
      bibleTopics.map((topic, i) => ({
        intakeId: intake.id,
        teacherId: PREVIEW_IDS.bible_teacher,
        date: iso(-(i + 1)),
        session: "bible" as const,
        topic,
        createdBy: PREVIEW_IDS.bible_teacher,
        createdAt: ts(-(i + 1)),
      })),
    )
    .returning();
  await db.insert(schema.lessonAbsences).values([
    { lessonLogId: bibleLogs[1].id, studentId: studs[3].id },
    { lessonLogId: bibleLogs[4].id, studentId: studs[1].id },
  ]);

  // Practical weld assessments (latest attempt per module is the standing).
  const practicals = topics.filter((t) => t.type === "practical");
  if (practicals.length >= 2) {
    await db.insert(schema.practicalAssessments).values([
      { studentId: studs[0].id, topicId: practicals[0].id, date: iso(-20), result: "pass", score: 82, notes: "Clean stringer beads, good arc length.", createdBy: PREVIEW_IDS.teacher },
      { studentId: studs[0].id, topicId: practicals[1].id, date: iso(-6), result: "redo", score: 48, notes: "Undercut on the vertical run — repeat.", createdBy: PREVIEW_IDS.teacher },
      { studentId: studs[1].id, topicId: practicals[0].id, date: iso(-20), result: "pass", score: 74, createdBy: PREVIEW_IDS.teacher },
      { studentId: studs[2].id, topicId: practicals[0].id, date: iso(-20), result: "redo", score: 41, notes: "Porosity; slow travel speed.", createdBy: PREVIEW_IDS.teacher },
    ]);
  }

  // Phase 6: Consumables + stock movements (stock level derived from movements).
  const [rods, discs, plate, argon] = await db
    .insert(schema.consumables)
    .values([
      { name: "E6013 2.5mm Welding Electrodes", category: "electrodes", unit: "box", reorderLevel: 5, createdBy: PREVIEW_IDS.store_keeper },
      { name: "4.5\" Grinding Discs", category: "discs", unit: "piece", reorderLevel: 15, createdBy: PREVIEW_IDS.store_keeper },
      { name: "Mild Steel Flat Bar 50x6mm", category: "steel", unit: "length", reorderLevel: 10, createdBy: PREVIEW_IDS.store_keeper },
      { name: "Argon / CO2 Shielding Gas", category: "gas", unit: "cylinder", reorderLevel: 2, createdBy: PREVIEW_IDS.store_keeper },
    ])
    .returning();

  await db.insert(schema.stockMovements).values([
    // E6013 rods: +20 in, -8 out -> 12 boxes in stock (OK)
    { consumableId: rods.id, type: "in", date: iso(-45), quantityDelta: 20, supplier: "Roofings Ltd", cost: 900_000, receivedBy: "Mary Atim", createdBy: PREVIEW_IDS.store_keeper },
    { consumableId: rods.id, type: "out", date: iso(-20), quantityDelta: -8, purpose: "class_practice", takenBy: "John Okello", createdBy: PREVIEW_IDS.store_keeper },
    // Grinding discs: +30 in, -18 out, -2 damaged adjustment -> 10 pcs in stock (LOW STOCK <= 15)
    { consumableId: discs.id, type: "in", date: iso(-40), quantityDelta: 30, supplier: "Hardware World Kampala", cost: 240_000, receivedBy: "Mary Atim", createdBy: PREVIEW_IDS.store_keeper },
    { consumableId: discs.id, type: "out", date: iso(-14), quantityDelta: -18, purpose: "class_practice", takenBy: "John Okello", createdBy: PREVIEW_IDS.store_keeper },
    { consumableId: discs.id, type: "adjustment", date: iso(-5), quantityDelta: -2, physicalCount: 10, adjustmentReason: "damaged", notes: "2 cracked discs discarded", createdBy: PREVIEW_IDS.store_keeper },
    // Mild steel bar: +25 in, -10 out -> 15 lengths in stock (OK)
    { consumableId: plate.id, type: "in", date: iso(-50), quantityDelta: 25, supplier: "Steel & Tube Industries", cost: 1_125_000, receivedBy: "Mary Atim", createdBy: PREVIEW_IDS.store_keeper },
    { consumableId: plate.id, type: "out", date: iso(-12), quantityDelta: -10, purpose: "class_practice", takenBy: "John Okello", createdBy: PREVIEW_IDS.store_keeper },
    // Shielding gas: +4 in, -2 out -> 2 cylinders in stock (LOW STOCK <= 2)
    { consumableId: argon.id, type: "in", date: iso(-35), quantityDelta: 4, supplier: "Tolagas Uganda", cost: 680_000, receivedBy: "Mary Atim", createdBy: PREVIEW_IDS.store_keeper },
    { consumableId: argon.id, type: "out", date: iso(-10), quantityDelta: -2, purpose: "workshop_job", takenBy: "John Okello", createdBy: PREVIEW_IDS.store_keeper },
  ]);

  // Phase 6: Equipment register + fault log (linked two-way with students & lesson_issues).
  const eqRows = await db
    .insert(schema.equipment)
    .values([
      { assetCode: "KTS-WM-01", type: "MIG Welder", makeModel: "Lincoln PowerMIG 210", status: "working", booth: "Booth 1", assignedStudentId: studs[0].id, createdBy: PREVIEW_IDS.store_keeper },
      { assetCode: "KTS-WM-02", type: "MIG Welder", makeModel: "Lincoln PowerMIG 210", status: "working", booth: "Booth 2", assignedStudentId: studs[1].id, createdBy: PREVIEW_IDS.store_keeper },
      { assetCode: "KTS-WM-03", type: "MMA Inverter Welder", makeModel: "Miller Maxstar 161", status: "needs_repair", booth: "Booth 3", assignedStudentId: studs[2].id, createdBy: PREVIEW_IDS.store_keeper },
      { assetCode: "KTS-WM-04", type: "MMA Inverter Welder", makeModel: "Miller Maxstar 161", status: "working", booth: "Booth 4", assignedStudentId: studs[3].id, createdBy: PREVIEW_IDS.store_keeper },
      { assetCode: "KTS-AG-01", type: "Angle Grinder", makeModel: "Bosch GWS 750", status: "out_of_service", booth: null, assignedStudentId: null, createdBy: PREVIEW_IDS.store_keeper },
    ])
    .returning();

  await db.insert(schema.equipmentFaults).values([
    {
      equipmentId: eqRows[2].id, // KTS-WM-03
      lessonIssueId: machineIssue.id,
      reportedAt: iso(-7),
      problem: machineIssue.description,
      reportedBy: "John Okello (Teacher)",
      status: "open",
      createdBy: PREVIEW_IDS.teacher,
    },
    {
      equipmentId: eqRows[0].id, // KTS-WM-01 historical resolved fault
      reportedAt: iso(-32),
      problem: "Loose earth clamp cable.",
      reportedBy: "John Okello (Teacher)",
      status: "resolved",
      fix: "Replaced earth clamp lug and re-crimped cable.",
      fixedAt: iso(-30),
      cost: 25_000,
      createdBy: PREVIEW_IDS.store_keeper,
    },
    {
      equipmentId: eqRows[4].id, // KTS-AG-01 out of service
      reportedAt: iso(-3),
      problem: "Worn armature bearings causing heavy vibration.",
      reportedBy: "Mary Atim (Store)",
      status: "open",
      createdBy: PREVIEW_IDS.store_keeper,
    },
  ]);
}
