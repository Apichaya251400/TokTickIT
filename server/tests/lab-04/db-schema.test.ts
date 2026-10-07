import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("LAB4-03 / TEST-DB-01: Database Schema, Foreign Keys & Relation Integrity", () => {
  const prisma = getPrisma();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("enforces ActionTaken 1:N relation under Ticket", async () => {
    const sampleTicket = await prisma.ticket.findFirstOrThrow({
      include: { actionsTaken: true },
    });
    expect(sampleTicket).toHaveProperty("actionsTaken");
    expect(Array.isArray(sampleTicket.actionsTaken)).toBe(true);
  });

  it("rejects creating ActionTaken with invalid ticketId foreign key", async () => {
    const invalidTicketId = "00000000-0000-0000-0000-000000000000";
    const staffUser = await prisma.user.findFirstOrThrow({
      where: { role: "IT_STAFF", isActive: true },
    });

    await expect(
      prisma.actionTaken.create({
        data: {
          ticketId: invalidTicketId,
          performedById: staffUser.id,
          description: "Test action invalid ticket",
          result: "Failed FK test",
          status: "PENDING",
        },
      })
    ).rejects.toThrow();
  });

  it("enforces IdempotencyRecord unique constraint (userId, ticketId, endpoint, idempotencyKey)", async () => {
    const sampleTicket = await prisma.ticket.findFirstOrThrow();
    const staffUser = await prisma.user.findFirstOrThrow({
      where: { role: "IT_STAFF", isActive: true },
    });
    const key = `test-unique-key-${Date.now()}`;

    // First insert succeeds
    const rec1 = await prisma.idempotencyRecord.create({
      data: {
        userId: staffUser.id,
        ticketId: sampleTicket.id,
        endpoint: "/api/tickets/:id/actions",
        idempotencyKey: key,
        requestHash: "hash-123",
        responseStatus: 201,
        responseBody: JSON.stringify({ ok: true }),
      },
    });
    expect(rec1).toBeDefined();

    // Duplicate unique key insert throws constraint error
    await expect(
      prisma.idempotencyRecord.create({
        data: {
          userId: staffUser.id,
          ticketId: sampleTicket.id,
          endpoint: "/api/tickets/:id/actions",
          idempotencyKey: key,
          requestHash: "hash-123",
          responseStatus: 201,
          responseBody: JSON.stringify({ ok: true }),
        },
      })
    ).rejects.toThrow();

    // Cleanup test idempotency record
    await prisma.idempotencyRecord.delete({ where: { id: rec1.id } });
  });
});
