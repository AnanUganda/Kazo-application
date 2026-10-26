import { requireRole } from "@/lib/permissions";
import { loadEquipmentRegister } from "@/lib/inventory-data";
import { EquipmentView } from "@/components/inventory/EquipmentView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Equipment — Kazo Technical School" };

export default async function AdminEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const admin = await requireRole("admin");
  const { q = "", filter = "" } = await searchParams;
  const data = await loadEquipmentRegister();

  return (
    <EquipmentView
      {...data}
      actorName={admin.fullName}
      isAdmin
      q={q}
      filter={filter}
    />
  );
}
