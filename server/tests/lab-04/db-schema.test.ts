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

  it("rejects creating ActionTaken with invalid performedById foreign key", async () => {
    const sampleTicket = await prisma.ticket.findFirstOrThrow();
    const invalidUserId = 999999;

    await expect(
      prisma.actionTaken.create({
        data: {
          ticketId: sampleTicket.id,
          performedById: invalidUserId,
          description: "Test action invalid actor",
          result: "Failed FK test",
          status: "PENDING",
        },
      })
    ).rejects.toThrow();
  });

  it("rejects creating ActionTaken with invalid assigneeId foreign key", async () => {
    const sampleTicket = await prisma.ticket.findFirstOrThrow();
    const staffUser = await prisma.user.findFirstOrThrow({
      where: { role: "IT_STAFF", isActive: true },
    });
    const invalidAssigneeId = 999999;

    await expect(
      prisma.actionTaken.create({
        data: {
          ticketId: sampleTicket.id,
          performedById: staffUser.id,
          assigneeId: invalidAssigneeId,
          description: "Test action invalid assignee",
          result: "Failed FK test",
          status: "PENDING",
        },
      })
    ).rejects.toThrow();
  });

  it("rejects creating IdempotencyRecord with invalid userId or ticketId foreign key", async () => {
    const sampleTicket = await prisma.ticket.findFirstOrThrow();
    const staffUser = await prisma.user.findFirstOrThrow({
      where: { role: "IT_STAFF", isActive: true },
    });
    const invalidUserId = 999999;
    const invalidTicketId = "00000000-0000-0000-0000-000000000000";

    // Invalid userId FK
    await expect(
      prisma.idempotencyRecord.create({
        data: {
          userId: invalidUserId,
          ticketId: sampleTicket.id,
          endpoint: "/api/tickets/:id/actions",
          idempotencyKey: "key-bad-user",
          requestHash: "hash-123",
          responseStatus: 200,
          responseBody: JSON.stringify({ ok: true }),
        },
      })
    ).rejects.toThrow();

    // Invalid ticketId FK
    await expect(
      prisma.idempotencyRecord.create({
        data: {
          userId: staffUser.id,
          ticketId: invalidTicketId,
          endpoint: "/api/tickets/:id/actions",
          idempotencyKey: "key-bad-ticket",
          requestHash: "hash-123",
          responseStatus: 200,
          responseBody: JSON.stringify({ ok: true }),
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
