import type { StaffRole } from "@/lib/db/schema";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  /** Pages not yet built in this phase render disabled with a "Soon" tag. */
  implemented: boolean;
  /** Sidebar section heading; items with the same group sit together. */
  group?: string;
};

const NAV: Record<StaffRole, NavItem[]> = {
  admin: [
    { label: "Home", href: "/admin", icon: "home", implemented: true },
    { label: "Applications", href: "/admin/applications", icon: "applications", implemented: true, group: "People" },
    { label: "Students", href: "/admin/students", icon: "students", implemented: true, group: "People" },
    { label: "Lessons", href: "/admin/lessons", icon: "lessons", implemented: true, group: "Teaching" },
    { label: "Syllabus", href: "/admin/syllabus", icon: "syllabus", implemented: true, group: "Teaching" },
    { label: "Intakes", href: "/admin/intakes", icon: "intakes", implemented: true, group: "Teaching" },
    { label: "Inventory", href: "/admin/inventory", icon: "inventory", implemented: true, group: "Workshop" },
    { label: "Equipment", href: "/admin/equipment", icon: "equipment", implemented: true, group: "Workshop" },
    { label: "Staff", href: "/admin/staff", icon: "staff", implemented: true, group: "School" },
    { label: "Settings", href: "/admin/settings", icon: "settings", implemented: true, group: "School" },
  ],
  teacher: [
    { label: "Home", href: "/teacher", icon: "home", implemented: true },
    { label: "Log lesson", href: "/teacher/log", icon: "lessons", implemented: true },
    { label: "Syllabus", href: "/teacher/syllabus", icon: "syllabus", implemented: true },
    { label: "Students", href: "/teacher/students", icon: "students", implemented: true },
  ],
  store_keeper: [
    { label: "Home", href: "/store", icon: "home", implemented: true },
    { label: "Consumables", href: "/store/consumables", icon: "inventory", implemented: true },
    { label: "Equipment", href: "/store/equipment", icon: "equipment", implemented: true },
  ],
  bible_teacher: [
    { label: "Home", href: "/bible", icon: "home", implemented: true },
    { label: "Log class", href: "/bible/log", icon: "bible", implemented: true },
  ],
};

export function navForRole(role: StaffRole): NavItem[] {
  return NAV[role];
}

export const roleLabel: Record<StaffRole, string> = {
  admin: "Administrator",
  teacher: "Teacher",
  store_keeper: "Store keeper",
  bible_teacher: "Bible teacher",
};
