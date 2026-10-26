import Image from "next/image";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/kazo-crest.svg"
        alt="Kazo Technical School crest"
        width={36}
        height={36}
        priority
      />
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-bold text-neutral-900">
            Kazo Technical School
          </div>
          <div className="text-[11px] font-medium text-brand">
            Staff Dashboard
          </div>
        </div>
      )}
    </div>
  );
}
