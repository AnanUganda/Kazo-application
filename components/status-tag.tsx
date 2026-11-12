import { cn } from "@/lib/utils";

/**
 * A restrained status marker: small uppercase coloured text, no pill fill.
 * Replaces the pastel-filled badge pills so a status reads as a quiet label
 * rather than a highlighted block. The mid-tone colours (…-600) stay legible
 * in both light and dark mode.
 */
export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

// Light mode uses the …-700 stop so small (10–11px) text clears WCAG AA 4.5:1
// on a white card; dark mode drops to …-400 so it stays legible on a dark card.
const toneClass: Record<StatusTone, string> = {
  neutral: "text-muted-foreground",
  info: "text-blue-700 dark:text-blue-400",
  success: "text-emerald-700 dark:text-emerald-400",
  warning: "text-amber-700 dark:text-amber-400",
  danger: "text-red-700 dark:text-red-400",
};

export function StatusTag({
  tone = "neutral",
  className,
  children,
}: {
  tone?: StatusTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-wider",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
