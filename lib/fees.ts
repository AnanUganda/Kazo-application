/** Default fee catalogue (all amounts integer UGX). Edited later in Settings. */
export const DEFAULT_FEE_TYPES = [
  {
    code: "registration",
    name: "Registration",
    defaultAmount: 35_000,
    appliesToSemester: null,
    sortOrder: 1,
  },
  {
    code: "semester_1",
    name: "Semester 1",
    defaultAmount: 800_000,
    appliesToSemester: 1,
    sortOrder: 2,
  },
  {
    code: "semester_2",
    name: "Semester 2",
    defaultAmount: 800_000,
    appliesToSemester: 2,
    sortOrder: 3,
  },
  {
    code: "industrial_tour",
    name: "Industrial tour",
    defaultAmount: 35_000,
    appliesToSemester: 2,
    sortOrder: 4,
  },
] as const;
