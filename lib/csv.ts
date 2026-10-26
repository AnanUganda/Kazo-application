/**
 * Pure RFC 4180 CSV serializer (no DB/server imports — unit-testable).
 * Quotes cells that contain commas, double-quotes, or newlines, and escapes
 * leading formula characters (=, +, @) on untrusted strings.
 */

export type CsvValue = string | number | boolean | null | undefined;

function escapeCsvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  let text = String(value);
  if (/^[=+@]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return lines.join("\r\n") + "\r\n";
}
