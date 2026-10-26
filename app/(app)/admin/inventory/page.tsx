import { requireRole } from "@/lib/permissions";
import { loadConsumables } from "@/lib/inventory-data";
import { ConsumablesView } from "@/components/inventory/ConsumablesView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventory — Kazo Technical School" };

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; filter?: string }>;
}) {
  const admin = await requireRole("admin");
  const { q = "", category = "", filter = "" } = await searchParams;
  const items = await loadConsumables();

  return (
    <ConsumablesView
      items={items}
      actorName={admin.fullName}
      q={q}
      category={category}
      filter={filter}
    />
  );
}
