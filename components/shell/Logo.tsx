import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  onSidebar = false,
}: {
  compact?: boolean;
  /** Light text and a white backing for the crest on the maroon sidebar. */
  onSidebar?: boolean;
}) {
  const crest = (
    <Image
      src="/kazo-crest.svg"
      alt="Kazo Technical School crest"
      width={onSidebar ? 30 : 36}
      height={onSidebar ? 30 : 36}
      priority
    />
  );

  return (
    <div className="flex items-center gap-2.5">
      {onSidebar ? (
        <span className="rounded-lg bg-card p-1 shadow-sm">{crest}</span>
      ) : (
        crest
      )}
      {!compact && (
        <div className="leading-tight">
          <div
            className={cn(
              "text-sm font-bold",
              onSidebar ? "text-white" : "text-foreground",
            )}
          >
            Kazo Technical School
          </div>
          <div
            className={cn(
              "text-[11px] font-medium",
              onSidebar ? "text-sidebar-muted" : "text-primary",
            )}
          >
            Staff Dashboard
          </div>
        </div>
      )}
    </div>
  );
}
