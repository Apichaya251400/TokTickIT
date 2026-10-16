import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import { clearRevocationBlocklist, signToken } from "../../src/utils/jwt.js";

let seqCounter = 0;
function makeConcurrencyTicketNumber(): string {
  seqCounter = (seqCounter + 1) % 1000;
  const num = ((Date.now() + seqCounter) % 890000 + 100000).toString().padStart(6, "0");
  return `TKT-2026-${num}`;
}

describe("LAB4-06 / Optimistic Concurrency & Stale Update Protection (concurrency.api.test.ts)", () => {
  const prisma = getPrisma();
  let staffToken1: string;
  let staffToken2: string;
  let requesterToken: string;
  let staffUserId1: number;
  let staffUserId2: number;
  let requesterUserId: number;

  beforeEach(async () => {
    clearRevocationBlocklist();
    await seedDatabase();

    await prisma.user.updateMany({
      where: {
        email: { in: ["john.staff@toktick.it", "sarah.staff@toktick.it", "admin@toktick.it", "alice@example.com"] },
      },
      data: { requiresPasswordChange: false },
    });

    const staff1 = await prisma.user.findUniqueOrThrow({ where: { email: "john.staff@toktick.it" } });
    const staff2 = await prisma.user.findUniqueOrThrow({ where: { email: "sarah.staff@toktick.it" } });
    const requester = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });

    staffUserId1 = staff1.id;
    staffUserId2 = staff2.id;
    requesterUserId = requester.id;

    staffToken1 = signToken({
      userId: staff1.id,
      email: staff1.email,
      role: staff1.role,
      requiresPasswordChange: false,
    });

    staffToken2 = signToken({
      userId: staff2.id,
      email: staff2.email,
      role: staff2.role,
      requiresPasswordChange: false,
    });

    requesterToken = signToken({
      userId: requester.id,
      email: requester.email,
      role: requester.role,
      requiresPasswordChange: false,
    });
  });

  describe("Validation of expectedUpdatedAt (BR-10 / Section 4.1)", () => {
    it("Rejects PUT /status when expectedUpdatedAt is omitted with 400 MISSING_EXPECTED_UPDATED_AT", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeConcurrencyTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Missing timestamp ticket",
          description: "Testing missing timestamp.",
          currentStatus: "NEW",
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken1}`)
        .set("Authorization", `Bearer ${staffToken1}`)
        .send({ status: "OPEN" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_EXPECTED_UPDATED_AT");
      expect(res.body.error.message).toContain("expectedUpdatedAt timestamp is required");
    });

    it("Rejects PUT /status when expectedUpdatedAt is invalid format with 400 MISSING_EXPECTED_UPDATED_AT", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeConcurrencyTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Invalid timestamp ticket",
          description: "Testing invalid timestamp.",
          currentStatus: "NEW",
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken1}`)
        .set("Authorization", `Bearer ${staffToken1}`)
        .send({
          status: "OPEN",
          expectedUpdatedAt: "not-a-valid-iso-date",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_EXPECTED_UPDATED_AT");
    });
  });

  describe("Stale Update Detection (TEST-CONCUR-02 / BR-10 / AC-17)", () => {
    it("TEST-CONCUR-02: Rejects stale expectedUpdatedAt with 409 STALE_UPDATE and leaves ticket intact (AC-17, BR-10)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeConcurrencyTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Stale update ticket",
          description: "Testing stale timestamp rejection.",
          currentStatus: "OPEN",
        },
      });

      const oldTimestamp = ticket.updatedAt.toISOString();

      // First update moves the ticket and updates its updatedAt timestamp
      const advanceRes = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken1}`)
        .set("Authorization", `Bearer ${staffToken1}`)
        .send({
          status: "IN_PROGRESS",
          expectedUpdatedAt: oldTimestamp,
        });

      expect(advanceRes.status).toBe(200);

      // Second update uses the old stale timestamp
      const staleRes = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken2}`)
        .set("Authorization", `Bearer ${staffToken2}`)
        .send({
          status: "WAITING_FOR_REQUESTER",
          expectedUpdatedAt: oldTimestamp,
        });

      expect(staleRes.status).toBe(409);
      expect(staleRes.body.error.code).toBe("STALE_UPDATE");
      expect(staleRes.body.error.message).toContain("Ticket status was updated concurrently by another user");

      // Verify DB ticket remains IN_PROGRESS and was not modified by stale request
      const dbTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(dbTicket.currentStatus).toBe("IN_PROGRESS");
    });
  });

  describe("Concurrent Race Condition (TEST-CONCUR-01 / BR-10 / AC-11)", () => {
    it("TEST-CONCUR-01: Serializes concurrent resolution requests via Promise.all: exactly one succeeds with 200, one fails with 409 STALE_UPDATE, and DB state is verified (AC-11, EVD-WORKFLOW-06, EVD-WORKFLOW-07)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeConcurrencyTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "URGENT",
          summary: "Concurrent resolution race ticket",
          description: "Testing concurrent resolution race.",
          currentStatus: "IN_PROGRESS",
        },
      });

      // Provide a completed ActionTaken so Resolution Gate is satisfied for both
      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUserId1,
          description: "Diagnostic hardware check complete.",
          result: "Hardware OK.",
          status: "COMPLETED",
          followUpRequired: false,
        },
      });

      const sharedExpectedUpdatedAt = ticket.updatedAt.toISOString();

      // Launch two concurrent PUT /status requests with the SAME expectedUpdatedAt using Promise.all
      const [res1, res2] = await Promise.all([
        request(app)
          .put(`/api/tickets/${ticket.id}/status`)
          .set("Cookie", `token=${staffToken1}`)
          .set("Authorization", `Bearer ${staffToken1}`)
          .send({
            status: "RESOLVED",
            resolutionNote: "Staff 1 resolved the ticket.",
            expectedUpdatedAt: sharedExpectedUpdatedAt,
          }),
        request(app)
          .put(`/api/tickets/${ticket.id}/status`)
          .set("Cookie", `token=${staffToken2}`)
          .set("Authorization", `Bearer ${staffToken2}`)
          .send({
            status: "RESOLVED",
            resolutionNote: "Staff 2 resolved the ticket.",
            expectedUpdatedAt: sharedExpectedUpdatedAt,
          }),
      ]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(409);

      const successRes = res1.status === 200 ? res1 : res2;
      const conflictRes = res1.status === 409 ? res1 : res2;

      expect(successRes.body.ticket.currentStatus).toBe("RESOLVED");
      expect(conflictRes.body.error.code).toBe("STALE_UPDATE");
      expect(conflictRes.body.error.message).toContain("Ticket status was updated concurrently by another user");

      // Final database-state verification (EVD-WORKFLOW-07)
      const finalDbTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(finalDbTicket.currentStatus).toBe("RESOLVED");
      expect([
        "Staff 1 resolved the ticket.",
        "Staff 2 resolved the ticket.",
      ]).toContain(finalDbTicket.resolutionNote);
    });
  });
});
