import { requireRole } from "@/lib/permissions";
import { loadConsumables } from "@/lib/inventory-data";
import { ConsumablesView } from "@/components/inventory/ConsumablesView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Consumables — Kazo Technical School" };

export default async function StoreConsumablesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; filter?: string }>;
}) {
  const me = await requireRole("store_keeper", "admin");
  const { q = "", category = "", filter = "" } = await searchParams;
  const items = await loadConsumables();

  return (
    <ConsumablesView
      items={items}
      actorName={me.fullName}
      q={q}
      category={category}
      filter={filter}
    />
  );
}
