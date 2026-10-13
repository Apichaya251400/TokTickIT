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
    let seq = Number(result[0].nextval);

    // If sequence is lagging behind existing tickets (e.g. freshly created sequence after static seed),
    // synchronize sequence forward past the highest existing ticket number.
    const year = new Date().getFullYear();
    const maxTicket = await prisma.ticket.findFirst({
      where: { ticketNumber: { startsWith: `TKT-${year}-` } },
      orderBy: { ticketNumber: "desc" },
      select: { ticketNumber: true },
    });

    if (maxTicket?.ticketNumber) {
      const match = maxTicket.ticketNumber.match(/(\d+)$/);
      if (match) {
        const maxSeq = parseInt(match[1], 10);
        if (seq <= maxSeq) {
          const nextVal = maxSeq + 1;
          await prisma.$executeRawUnsafe(
            `SELECT setval('ticket_number_seq', ${nextVal}, true);`
          );
          return nextVal;
        }
      }
    }

    return seq;
  } catch (error) {
    const maxTicket = await prisma.ticket.findFirst({
      orderBy: { ticketNumber: "desc" },
      select: { ticketNumber: true },
    });
    let startVal = 1;
    if (maxTicket?.ticketNumber) {
      const match = maxTicket.ticketNumber.match(/(\d+)$/);
      if (match) {
        startVal = parseInt(match[1], 10) + 1;
      }
    }
    await prisma.$executeRawUnsafe(
      `CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH ${startVal};`
    );
    const result = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('ticket_number_seq') as nextval`;
    return Number(result[0].nextval);
  }
}
