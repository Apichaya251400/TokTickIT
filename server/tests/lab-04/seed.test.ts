import { describe, it, expect, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";

describe("LAB4-03 / TEST-DB-03: Idempotent Seed & Fixture Verification", () => {
  const prisma = getPrisma();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("executes seed database idempotently without creating duplicate records", async () => {
    const seededEmails = [
      "alice@example.com",
      "requester@toktick.it",
      "bob@example.com",
      "charlie@example.com",
      "eve@example.com",
      "diana@example.com",
      "staff@toktick.it",
      "john.staff@toktick.it",
      "sarah.staff@toktick.it",
      "inactive.staff@toktick.it",
      "admin@toktick.it",
      "admin2@toktick.it",
    ];
    const seededTicketNumbers = [
      "TKT-2026-000001",
      "TKT-2026-000002",
      "TKT-2026-000003",
      "TKT-2026-000004",
      "TKT-2026-000005",
      "TKT-2026-000006",
      "TKT-2026-000007",
      "TKT-2026-000008",
    ];
    const seededActionIds = [
      "act-seed-000001",
      "act-seed-000002",
      "act-seed-000003",
      "act-seed-000004",
      "act-seed-000005",
    ];

    // Run seed first time
    await seedDatabase();
    const userCount1 = await prisma.user.count({ where: { email: { in: seededEmails } } });
    const ticketCount1 = await prisma.ticket.count({ where: { ticketNumber: { in: seededTicketNumbers } } });
    const actionCount1 = await prisma.actionTaken.count({ where: { id: { in: seededActionIds } } });

    // Run seed second time
    await seedDatabase();
    const userCount2 = await prisma.user.count({ where: { email: { in: seededEmails } } });
    const ticketCount2 = await prisma.ticket.count({ where: { ticketNumber: { in: seededTicketNumbers } } });
    const actionCount2 = await prisma.actionTaken.count({ where: { id: { in: seededActionIds } } });

    // Counts MUST be identical after second seed run
    expect(userCount1).toBe(12);
    expect(ticketCount1).toBe(8);
    expect(actionCount1).toBe(5);
    expect(userCount2).toBe(userCount1);
    expect(ticketCount2).toBe(ticketCount1);
    expect(actionCount2).toBe(actionCount1);
  });

  it("verifies seed data contains 0, 1, and multiple Actions Taken scenarios", async () => {
    const ticketWithZeroActions = await prisma.ticket.findUniqueOrThrow({
      where: { ticketNumber: "TKT-2026-000001" },
      include: { actionsTaken: true },
    });
    expect(ticketWithZeroActions.actionsTaken.length).toBe(0);

    const ticketWithOneAction = await prisma.ticket.findUniqueOrThrow({
      where: { ticketNumber: "TKT-2026-000003" },
      include: { actionsTaken: true },
    });
    expect(ticketWithOneAction.actionsTaken.length).toBe(1);

    const ticketWithMultipleActions = await prisma.ticket.findUniqueOrThrow({
      where: { ticketNumber: "TKT-2026-000002" },
      include: { actionsTaken: true },
    });
    expect(ticketWithMultipleActions.actionsTaken.length).toBeGreaterThanOrEqual(2);
  });

  it("verifies seed data contains assigned and unassigned tickets across required workflow statuses and priorities", async () => {
    const unassignedTicket = await prisma.ticket.findFirst({ where: { ownerId: null } });
    const assignedTicket = await prisma.ticket.findFirst({ where: { ownerId: { not: null } } });
    expect(unassignedTicket).not.toBeNull();
    expect(assignedTicket).not.toBeNull();

    // Verify all 8 currentStatus values exist in seed tickets
    const requiredStatuses = [
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
      "CLOSED",
      "REOPENED",
      "CANCELLED",
    ];

    for (const status of requiredStatuses) {
      const ticket = await prisma.ticket.findFirst({ where: { currentStatus: status as any } });
      expect(ticket).not.toBeNull();
    }

    // Verify all 4 priority values exist
    const requiredPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    for (const priority of requiredPriorities) {
      const ticket = await prisma.ticket.findFirst({ where: { requestedPriority: priority as any } });
      expect(ticket).not.toBeNull();
    }
  });

  it("TEST-DB-SEQ-01: verifies ticket_number_seq is dynamically synchronized to the max ticket number suffix and subsequent nextval() produces the next integer", async () => {
    await seedDatabase();

    // Query max numeric suffix directly from seeded baseline tickets
    const seededTicketNumbers = [
      "TKT-2026-000001",
      "TKT-2026-000002",
      "TKT-2026-000003",
      "TKT-2026-000004",
      "TKT-2026-000005",
      "TKT-2026-000006",
      "TKT-2026-000007",
      "TKT-2026-000008",
    ];
    const maxSuffixResult = await prisma.$queryRaw<Array<{ max_suffix: bigint | number | null }>>`
      SELECT MAX(CAST(SUBSTRING("ticketNumber" FROM '([0-9]+)$') AS BIGINT)) AS max_suffix
      FROM "Ticket"
      WHERE "ticketNumber" = ANY(${seededTicketNumbers});
    `;
    const expectedMax = Number(maxSuffixResult[0]?.max_suffix || 8);
    expect(expectedMax).toBeGreaterThanOrEqual(8);

    // Call nextval and verify it produces expectedMax + 1
    const nextValResult = await prisma.$queryRaw<Array<{ next_val: bigint | number }>>`
      SELECT nextval('ticket_number_seq') AS next_val;
    `;
    const nextVal = Number(nextValResult[0]?.next_val);
    expect(nextVal).toBe(expectedMax + 1);

    // Re-running seedDatabase should re-synchronize the sequence
    await seedDatabase();
    const nextValAfterReseed = await prisma.$queryRaw<Array<{ next_val: bigint | number }>>`
      SELECT nextval('ticket_number_seq') AS next_val;
    `;
    expect(Number(nextValAfterReseed[0]?.next_val)).toBe(expectedMax + 1);
  });
});
