/**
 * Pure fee-ledger maths. A fee balance is ALWAYS derived from the append-only
 * ledger — never stored as an editable number. A reversal entry offsets a
 * payment. This file has no DB or server imports so it is unit-testable.
 */

export type LedgerPayment = {
  amount: number;
  entryType: "payment" | "reversal";
};

export type LedgerCharge = { amountDue: number };

/** totalDue, net paid (payments minus reversals), and the remaining balance. */
export function ledgerBalance(
  charges: LedgerCharge[],
  payments: LedgerPayment[],
): { totalDue: number; paid: number; balance: number } {
  const totalDue = charges.reduce((sum, c) => sum + c.amountDue, 0);
  const paid = payments.reduce(
    (sum, p) => sum + (p.entryType === "payment" ? p.amount : -p.amount),
    0,
  );
  return { totalDue, paid, balance: totalDue - paid };
}
