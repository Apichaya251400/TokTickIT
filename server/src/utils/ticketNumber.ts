/**
 * Generates official backend ticket number matching TKT-YYYY-XXXXXX format.
 * Example: TKT-2026-000001
 */
export function generateTicketNumber(sequenceNumber: number, date: Date = new Date()): string {
  const year = date.getFullYear();
  const sequenceStr = String(sequenceNumber).padStart(6, "0");
  return `TKT-${year}-${sequenceStr}`;
}
