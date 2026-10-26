"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StaffRole } from "@/lib/db/schema";
import { navForRole, roleLabel } from "./nav";
import { Icon } from "./icons";
import { Logo } from "./Logo";

export function AppShell({
  role,
  name,
  email,
  children,
}: {
  role: StaffRole;
  name: string;
  email: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = navForRole(role);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {items.map((item) =>
        item.implemented ? (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive(item.href)
                ? "bg-brand-50 text-brand"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }`}
          >
            <Icon name={item.icon} />
            {item.label}
          </Link>
        ) : (
          <span
            key={item.href}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-300"
            title="Coming in a later phase"
          >
            <Icon name={item.icon} />
            {item.label}
            <span className="ml-auto rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
              Soon
            </span>
          </span>
        ),
      )}
    </nav>
  );

  const userCard = (
    <div className="border-t border-neutral-200 p-3">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-neutral-900">
            {name}
          </div>
          <div className="truncate text-xs text-neutral-500">
            {roleLabel[role]}
          </div>
        </div>
      </div>
      {/* Full-page navigation to the Neon Auth sign-out handler (intentional for
          an auth boundary, not client-side routing). */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/handler/sign-out"
        className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
      >
        <Icon name="logout" />
        Sign out
      </a>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-neutral-200 bg-white md:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>
        {nav}
        {userCard}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
        <Logo compact />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100"
        >
          <Icon name="menu" className="h-6 w-6" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-5">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100"
              >
                <Icon name="close" />
              </button>
            </div>
            {nav}
            {userCard}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="md:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
