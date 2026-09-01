import { PrismaClient } from "@prisma/client";

/**
 * Generates official backend ticket number matching TKT-YYYY-XXXXXX format.
 * Example: TKT-2026-000001
 */
export function generateTicketNumber(sequenceNumber: number, date: Date = new Date()): string {
  const year = date.getFullYear();
  const sequenceStr = String(sequenceNumber).padStart(6, "0");
  return `TKT-${year}-${sequenceStr}`;
}

/**
 * Obtains the next database-safe sequence number for ticket creation.
 * Uses PostgreSQL nextval('ticket_number_seq') for atomic, concurrent-safe sequence generation (BR-01).
 * Auto-initializes sequence if not yet created.
 */
export async function getNextTicketSequence(prisma: PrismaClient): Promise<number> {
  try {
    const result = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('ticket_number_seq') as nextval`;
    return Number(result[0].nextval);
  } catch (error) {
    const count = await prisma.ticket.count();
    const startVal = count + 1;
    await prisma.$executeRawUnsafe(
      `CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH ${startVal};`
    );
    const result = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('ticket_number_seq') as nextval`;
    return Number(result[0].nextval);
  }
}
