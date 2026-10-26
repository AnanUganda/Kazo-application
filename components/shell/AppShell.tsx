"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type LucideIcon,
  CalendarRange,
  ClipboardList,
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
};

function PreviewBanner({ role }: { role: StaffRole }) {
  const roles: StaffRole[] = ["admin", "teacher", "store_keeper"];
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
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
                r === role ? "bg-amber-200 text-amber-900" : "hover:bg-amber-100",
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
    if (href === "/admin" || href === "/teacher" || href === "/store") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
      {items.map((item) => {
        const I = ICONS[item.icon] ?? Home;
        if (!item.implemented) {
          return (
            <span
              key={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/50"
            >
              <I className="size-4" />
              {item.label}
              <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                Soon
              </span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <I className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userCard = (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 px-2 py-2">
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {name.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {name}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {roleLabel[role]}
          </div>
        </div>
      </div>
      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          className="mt-1 w-full justify-start gap-3 text-muted-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </form>
    </div>
  );

  const sidebarInner = (
    <>
      <div className="px-5 py-5">
        <Logo />
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
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
        <Logo compact />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
      </header>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebarInner}
        </SheetContent>
      </Sheet>

      {/* Content */}
      <div className="md:pl-64">
        {preview && <PreviewBanner role={role} />}
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
