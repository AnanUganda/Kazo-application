"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({
  className,
  variant = "ghost",
}: {
  className?: string;
  variant?: "ghost" | "outline";
}) {
  const toggle = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      title="Toggle theme"
      className={className}
    >
      {/* Icon follows the current theme via the `dark` class — no React state. */}
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  );
}
