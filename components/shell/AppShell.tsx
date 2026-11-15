"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type LucideIcon,
  BookOpen,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  NotebookPen,
  Package,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import type { StaffRole } from "@/lib/db/schema";
import { signOut } from "@/lib/auth/actions";
import { setPreviewRole } from "@/lib/preview-actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { navForRole, roleLabel } from "./nav";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  applications: ClipboardList,
  students: Users,
  lessons: NotebookPen,
  syllabus: CalendarRange,
  inventory: Package,
  equipment: Wrench,
  settings: Settings,
  staff: ShieldCheck,
  bible: BookOpen,
  intakes: GraduationCap,
};

function PreviewBanner({
  role,
  aboveTabBar,
}: {
  role: StaffRole;
  aboveTabBar: boolean;
}) {
  const roles: StaffRole[] = [
    "admin",
    "teacher",
    "bible_teacher",
    "store_keeper",
  ];
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-20 flex flex-wrap items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 md:bottom-0 md:left-64 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
        aboveTabBar ? "bottom-16" : "bottom-0",
      )}
    >
      <span className="font-semibold">Preview mode</span>
      <span>· sample data, no sign-in · viewing as {roleLabel[role]}</span>
      <span className="ml-auto flex items-center gap-1">
        Switch:
        {roles.map((r) => (
          <form key={r} action={setPreviewRole} className="inline">
            <input type="hidden" name="role" value={r} />
            <button
              type="submit"
              className={cn(
                "rounded px-2 py-0.5 font-medium",
                r === role
                  ? "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-50"
                  : "hover:bg-amber-100 dark:hover:bg-amber-900",
              )}
            >
              {roleLabel[r]}
            </button>
          </form>
        ))}
      </span>
    </div>
  );
}

export function AppShell({
  role,
  name,
  preview = false,
  children,
}: {
  role: StaffRole;
  name: string;
  email: string;
  preview?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = navForRole(role);

  const isActive = (href: string) => {
    // Each role's home is the first nav item; it only matches exactly.
    if (href === items[0]?.href) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Phones get a bottom tab bar when the role has few enough destinations.
  const tabBar = items.length <= 5;

  const nav = (
    <nav
      aria-label="Main"
      className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3"
    >
      {items.map((item, i) => {
        const I = ICONS[item.icon] ?? Home;
        const heading =
          item.group && item.group !== items[i - 1]?.group ? (
            <div
              key={`group-${item.group}`}
              className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/80"
            >
              {item.group}
            </div>
          ) : null;
        if (!item.implemented) {
          return (
            <span
              key={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-muted/60"
            >
              <I className="size-4" />
              {item.label}
              <span className="ml-auto rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sidebar-muted">
                Soon
              </span>
            </span>
          );
        }
        return [
          heading,
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]"
                : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
            )}
          >
            <I className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>,
        ];
      })}
    </nav>
  );

  const userCard = (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 px-2 py-2">
        <Avatar className="size-9">
          <AvatarFallback className="bg-sidebar-primary font-semibold text-sidebar-primary-foreground">
            {name.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">
            {name}
          </div>
          <div className="truncate text-xs text-sidebar-muted">
            {roleLabel[role]}
          </div>
        </div>
      </div>
      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          className="mt-1 w-full justify-start gap-3 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </form>
    </div>
  );

  const sidebarInner = (
    <>
      <div className="flex items-center justify-between px-5 py-5">
        <Logo onSidebar />
        <ThemeToggle className="text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
      </div>
      {nav}
      {userCard}
    </>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        {sidebarInner}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-2.5 backdrop-blur-md md:hidden">
        <Logo compact />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </header>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="flex w-72 flex-col gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebarInner}
        </SheetContent>
      </Sheet>

      {/* Content */}
      <div className="md:pl-64">
        <main
          className={cn(
            "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10",
            tabBar && "pb-24 md:pb-8",
            preview && (tabBar ? "pb-40 md:pb-20" : "pb-24 md:pb-20"),
          )}
        >
          {children}
        </main>
        {preview && <PreviewBanner role={role} aboveTabBar={tabBar} />}

        {/* Phone tab bar: navigation only, never actions. */}
        {tabBar && (
          <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-30 grid h-16 auto-cols-fr grid-flow-col border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
          >
            {items.map((item) => {
              const I = ICONS[item.icon] ?? Home;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <I
                    className="size-5"
                    strokeWidth={active ? 2.4 : 1.8}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
