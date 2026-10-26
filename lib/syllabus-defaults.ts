import type { TopicType } from "@/lib/db/schema";

/**
 * Official Kazo Technical School Welding & Fabrication Course Syllabus (2024 Version).
 * 2 semesters · 13 weeks per semester (455 hours/semester) · Mon–Fri 8:30 AM – 4:00 PM
 * (~1/3 classroom theory, ~2/3 welding booth practical · max 15 students per class).
 */
export const KTS_COURSE_POLICY = {
  courseName: "Welding and Fabrication Course (Lincoln Welding Curricula)",
  schedule: "Mon–Fri 8:30 AM – 4:00 PM (1/3 classroom theory, 2/3 booth practical)",
  duration: "2 semesters · 13 weeks (455 hours) per semester",
  classSizeLimit: 15,
  attendanceRequirementPct: 85,
  consecutiveAbsenceTerminationDays: 5,
  passMarkPct: 75,
  certification:
    "KTS Certificate of Completion + Directorate of Industrial Training (DIT) Level 1 & Level 2 testing centre",
  gradingAreas: [
    "Work Ethics (attendance, punctuality, behaviour, preparedness, participation, productivity, PPE)",
    "Skills (practical weld quality tested to American Welding Society — AWS standards)",
    "Knowledge (written assignments, quizzes, tests, and final exams)",
  ],
} as const;

export type DefaultSyllabusModule = {
  moduleNumber: number;
  semester: 1 | 2;
  targetWeek: number;
  title: string;
  type: TopicType;
  description: string;
};

/**
 * The 18 modules from `kts syllabus.docx` mapped across the two 13-week semesters:
 * - Semester 1: Modules 1–10 (Weeks 1–13)
 * - Semester 2: Modules 11–18 (Weeks 1–13)
 */
export const KTS_SYLLABUS_MODULES: readonly DefaultSyllabusModule[] = [
  // Semester 1 (13 weeks)
  {
    moduleNumber: 1,
    semester: 1,
    targetWeek: 1,
    title: "Module 1: Safety in Welding",
    type: "theory",
    description:
      "Safety standards, hazards in the metalworking industry, and proper use of Personal Protective Equipment (PPE).",
  },
  {
    moduleNumber: 2,
    semester: 1,
    targetWeek: 2,
    title: "Module 2: SMAW Fundamentals",
    type: "practical",
    description:
      "Shielded Metal Arc Welding (SMAW) process and equipment setup, applied to welding common joints.",
  },
  {
    moduleNumber: 3,
    semester: 1,
    targetWeek: 4,
    title: "Module 3: Scale reading & Maths in welding",
    type: "theory",
    description:
      "Reading and converting Metric and Imperial scales, fractional maths, and geometry applied to project fabrication.",
  },
  {
    moduleNumber: 4,
    semester: 1,
    targetWeek: 5,
    title: "Module 4: Basic Joints",
    type: "theory",
    description:
      "General terminology of the metalworking industry including the five basic joint types and technical terms.",
  },
  {
    moduleNumber: 5,
    semester: 1,
    targetWeek: 6,
    title: "Module 5: Metalworking hand tools",
    type: "practical",
    description:
      "Proper use of hacksaw, metal files, cold punch, centre punch, bench vise, anvil, and hammers to remove and shape material.",
  },
  {
    moduleNumber: 6,
    semester: 1,
    targetWeek: 8,
    title: "Module 6: Oxy Fuel Cutting and Welding",
    type: "practical",
    description:
      "Oxy-Fuel Welding (OFW) theory applied to safely set up, cut, and weld with oxy-fuel cutting and welding equipment.",
  },
  {
    moduleNumber: 7,
    semester: 1,
    targetWeek: 9,
    title: "Module 7: Brazing",
    type: "practical",
    description:
      "Brazing common metal joints using Oxy-Fuel welding equipment.",
  },
  {
    moduleNumber: 8,
    semester: 1,
    targetWeek: 10,
    title: "Module 8: GMAW Fundamentals",
    type: "practical",
    description:
      "Gas Metal Arc Welding (MIG) equipment and processes applied to welding basic thin-metal joints with short-circuit GMAW.",
  },
  {
    moduleNumber: 9,
    semester: 1,
    targetWeek: 12,
    title: "Module 9: Principles of Fabrication",
    type: "practical",
    description:
      "Accurate measurement and layout using rulers, squares, tape measure, callipers, compass, and protractor to mark cuts and holes.",
  },
  {
    moduleNumber: 10,
    semester: 1,
    targetWeek: 13,
    title: "Module 10: Semester One exams",
    type: "practical",
    description:
      "End of Semester 1 written theory examination and AWS practical piecework testing.",
  },

  // Semester 2 (13 weeks)
  {
    moduleNumber: 11,
    semester: 2,
    targetWeek: 1,
    title: "Module 11: Principles of electricity",
    type: "theory",
    description:
      "Basic electrical principles and components, practical soldering, and diagnosing electrical shorts and faults.",
  },
  {
    moduleNumber: 12,
    semester: 2,
    targetWeek: 3,
    title: "Module 12: Blueprint reading",
    type: "theory",
    description:
      "Interpreting engineering blueprints, developments, and sketches to build practical welded projects.",
  },
  {
    moduleNumber: 13,
    semester: 2,
    targetWeek: 4,
    title: "Module 13: Welding symbols",
    type: "theory",
    description:
      "Understanding and performing welds according to American Welding Society (AWS) blueprint welding symbols.",
  },
  {
    moduleNumber: 14,
    semester: 2,
    targetWeek: 6,
    title: "Module 14: GTAW Fundamentals",
    type: "practical",
    description:
      "Gas Tungsten Arc Welding (TIG) equipment, consumables, stainless steel plate/pipe joints, and wave/foot-pedal/pulse controls.",
  },
  {
    moduleNumber: 15,
    semester: 2,
    targetWeek: 8,
    title: "Module 15: Metallurgy",
    type: "practical",
    description:
      "Introductory material science, identifying common metals for weldability and process selection, plus practical hardening and annealing.",
  },
  {
    moduleNumber: 16,
    semester: 2,
    targetWeek: 10,
    title: "Module 16: Entrepreneurship & Cost Accounting",
    type: "theory",
    description:
      "Material and cost calculations, accounting skills, and entrepreneurship for Uganda's metalworking industry.",
  },
  {
    moduleNumber: 17,
    semester: 2,
    targetWeek: 12,
    title: "Module 17: DIT preparation and exams",
    type: "practical",
    description:
      "Preparation and examination for Directorate of Industrial Training (DIT) Welding Level 1 and Level 2 certification.",
  },
  {
    moduleNumber: 18,
    semester: 2,
    targetWeek: 13,
    title: "Module 18: Final exams",
    type: "practical",
    description:
      "Final theory and AWS practical examinations at Kazo Technical School.",
  },
] as const;
