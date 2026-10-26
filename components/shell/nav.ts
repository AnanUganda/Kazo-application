import type { StaffRole } from "@/lib/db/schema";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  /** Pages not yet built in this phase render disabled with a "Soon" tag. */
  implemented: boolean;
};

const NAV: Record<StaffRole, NavItem[]> = {
  admin: [
    { label: "Home", href: "/admin", icon: "home", implemented: true },
    { label: "Applications", href: "/admin/applications", icon: "applications", implemented: false },
    { label: "Students", href: "/admin/students", icon: "students", implemented: false },
    { label: "Lessons", href: "/admin/lessons", icon: "lessons", implemented: false },
    { label: "Syllabus", href: "/admin/syllabus", icon: "syllabus", implemented: false },
    { label: "Inventory", href: "/admin/inventory", icon: "inventory", implemented: false },
    { label: "Equipment", href: "/admin/equipment", icon: "equipment", implemented: false },
    { label: "Staff", href: "/admin/staff", icon: "staff", implemented: true },
    { label: "Settings", href: "/admin/settings", icon: "settings", implemented: false },
  ],
  teacher: [
    { label: "Home", href: "/teacher", icon: "home", implemented: true },
    { label: "Log lesson", href: "/teacher/log", icon: "lessons", implemented: false },
    { label: "Syllabus", href: "/teacher/syllabus", icon: "syllabus", implemented: false },
    { label: "Students", href: "/teacher/students", icon: "students", implemented: false },
  ],
  store_keeper: [
    { label: "Home", href: "/store", icon: "home", implemented: true },
    { label: "Consumables", href: "/store/consumables", icon: "inventory", implemented: false },
    { label: "Equipment", href: "/store/equipment", icon: "equipment", implemented: false },
  ],
};

export function navForRole(role: StaffRole): NavItem[] {
  return NAV[role];
}

export const roleLabel: Record<StaffRole, string> = {
  admin: "Administrator",
  teacher: "Teacher",
  store_keeper: "Store keeper",
};
