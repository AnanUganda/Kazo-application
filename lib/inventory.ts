/**
 * Pure inventory stock maths (no DB/server imports — unit-testable).
 * Stock level is ALWAYS derived by summing append-only stock_movements,
 * never stored or edited directly on the consumable item.
 */

export type StockMovementDelta = {
  quantityDelta: number;
};

/** Current stock level from all movement deltas. */
export function computeStockLevel(movements: StockMovementDelta[]): number {
  return movements.reduce((sum, m) => sum + m.quantityDelta, 0);
}

/** Low-stock rule: stock level <= reorder level. */
export function isLowStock(currentStock: number, reorderLevel: number): boolean {
  return currentStock <= reorderLevel;
}

/** Signed adjustment delta required to bring currentStock to physicalCount. */
export function computeAdjustmentDelta(
  currentStock: number,
  physicalCount: number,
): number {
  return physicalCount - currentStock;
}
