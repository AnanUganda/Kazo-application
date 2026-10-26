const KAMPALA = "Africa/Kampala";

/** Format an integer UGX amount, e.g. 800000 -> "UGX 800,000". */
export function formatUGX(amount: number): string {
  return `UGX ${new Intl.NumberFormat("en-UG").format(amount)}`;
}

/**
 * Parse a user-typed amount into an integer (UGX). Strips spaces/commas/currency
 * text. Returns null when there is no number.
 */
export function parseAmountToInt(input: string): number | null {
  const digits = input.replace(/[^0-9]/g, "");
  if (digits === "") return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

/** Format a stored date (YYYY-MM-DD string or Date) in Africa/Kampala. */
export function formatDate(value: string | Date): string {
  const d =
    typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: KAMPALA,
  }).format(d);
}
