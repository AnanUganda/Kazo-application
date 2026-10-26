import { requireRole } from "@/lib/permissions";
import { loadEquipmentRegister } from "@/lib/inventory-data";
import { EquipmentView } from "@/components/inventory/EquipmentView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Equipment — Kazo Technical School" };

export default async function StoreEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const me = await requireRole("store_keeper", "admin");
  const { q = "", filter = "" } = await searchParams;
  const data = await loadEquipmentRegister();

  return (
    <EquipmentView
      {...data}
      actorName={me.fullName}
      isAdmin={me.role === "admin"}
      q={q}
      filter={filter}
    />
  );
}
