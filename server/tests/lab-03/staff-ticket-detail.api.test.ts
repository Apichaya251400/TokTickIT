import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import { clearRevocationBlocklist, signToken } from "../../src/utils/jwt.js";

function makeTestTicketNumber(): string {
  const rand = Math.floor(100000 + Math.random() * 899999);
  return `TKT-2026-${rand}`;
}

describe("Issue 8: Staff Ticket Detail & Operations API Suite (staff-ticket-detail.api.test.ts)", () => {
  const prisma = getPrisma();
  let staffToken: string;
  let secondStaffToken: string;
  let adminToken: string;
  let aliceToken: string;
  let bobToken: string;
  let staffUserId: number;
  let secondStaffUserId: number;
  let adminUserId: number;

  beforeEach(async () => {
    clearRevocationBlocklist();
    await seedDatabase();

    await prisma.user.updateMany({
      where: { email: { in: ["john.staff@toktick.it", "sarah.staff@toktick.it", "admin@toktick.it", "alice@example.com", "bob@example.com"] } },
      data: { requiresPasswordChange: false },
    });

    const staff1 = await prisma.user.findUniqueOrThrow({ where: { email: "john.staff@toktick.it" } });
    const staff2 = await prisma.user.findUniqueOrThrow({ where: { email: "sarah.staff@toktick.it" } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@toktick.it" } });
    const alice = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    const bob = await prisma.user.findUniqueOrThrow({ where: { email: "bob@example.com" } });

    staffUserId = staff1.id;
    secondStaffUserId = staff2.id;
    adminUserId = admin.id;

    staffToken = signToken({ userId: staff1.id, email: staff1.email, role: staff1.role, requiresPasswordChange: false });
    secondStaffToken = signToken({ userId: staff2.id, email: staff2.email, role: staff2.role, requiresPasswordChange: false });
    adminToken = signToken({ userId: admin.id, email: admin.email, role: admin.role, requiresPasswordChange: false });
    aliceToken = signToken({ userId: alice.id, email: alice.email, role: alice.role, requiresPasswordChange: false });
    bobToken = signToken({ userId: bob.id, email: bob.email, role: bob.role, requiresPasswordChange: false });
  });

  describe("GET /api/tickets/:id Authorization & Response Details", () => {
    it("allows IT Staff to view any ticket detail", async () => {
      const ticket = await prisma.ticket.findFirstOrThrow();
      const res = await request(app)
        .get(`/api/tickets/${ticket.id}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ticket.id);
      expect(res.body.ticketNumber).toBe(ticket.ticketNumber);
      expect(res.body.requestedPriority).toBeDefined();
      expect(res.body.currentStatus).toBeDefined();
      expect(res.body.requester).toBeDefined();
    });

    it("allows Administrator to view ticket detail in read-only capacity", async () => {
      const ticket = await prisma.ticket.findFirstOrThrow();
      const res = await request(app)
        .get(`/api/tickets/${ticket.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ticket.id);
    });

    it("allows Requester to view ONLY owned ticket detail", async () => {
      const alice = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
      const aliceTicket = await prisma.ticket.findFirstOrThrow({ where: { requesterId: alice.id } });

      const res = await request(app)
        .get(`/api/tickets/${aliceTicket.id}`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(aliceTicket.id);
    });

    it("prevents Requester from viewing another user's ticket (403 Forbidden without leakage)", async () => {
      const bob = await prisma.user.findUniqueOrThrow({ where: { email: "bob@example.com" } });
      const bobTicket = await prisma.ticket.findFirstOrThrow({ where: { requesterId: bob.id } });

      const res = await request(app)
        .get(`/api/tickets/${bobTicket.id}`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("rejects unauthenticated GET /api/tickets/:id request (401 Unauthorized)", async () => {
      const ticket = await prisma.ticket.findFirstOrThrow();
      const res = await request(app).get(`/api/tickets/${ticket.id}`);

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/users/assignees", () => {
    it("returns list of active IT Staff and Administrator users for ticket assignment", async () => {
      const res = await request(app)
        .get("/api/users/assignees")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.assignees)).toBe(true);
      expect(res.body.assignees.every((u: any) => u.role === "IT_STAFF" || u.role === "ADMINISTRATOR")).toBe(true);
    });
  });

  describe("POST /api/tickets/:id/claim (Atomic Concurrency & Double-Claim Protection / BR-16)", () => {
    it("allows IT Staff to claim an unassigned ticket", async () => {
      const unassigned = await prisma.ticket.create({
        data: {
          ticketNumber: makeTestTicketNumber(),
          requesterId: (await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } })).id,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Unassigned ticket for testing claim action",
          description: "Testing claim functionality.",
          currentStatus: "NEW",
          ownerId: null,
        },
      });

      const res = await request(app)
        .post(`/api/tickets/${unassigned.id}/claim`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ticket.ownerId).toBe(staffUserId);

      const dbTicket = await prisma.ticket.findUnique({ where: { id: unassigned.id } });
      expect(dbTicket?.ownerId).toBe(staffUserId);
    });

    it("rejects second claim attempt on already claimed ticket with 409 Conflict (STATE_CONFLICT)", async () => {
      const unassigned = await prisma.ticket.create({
        data: {
          ticketNumber: makeTestTicketNumber(),
          requesterId: (await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } })).id,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Unassigned ticket for testing double claim",
          description: "Testing atomic double-claim conflict.",
          currentStatus: "NEW",
          ownerId: null,
        },
      });

      // First IT Staff claims ticket
      const firstRes = await request(app)
        .post(`/api/tickets/${unassigned.id}/claim`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(firstRes.status).toBe(200);

      // Second IT Staff attempts to claim the same ticket concurrently
      const secondRes = await request(app)
        .post(`/api/tickets/${unassigned.id}/claim`)
        .set("Authorization", `Bearer ${secondStaffToken}`);

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.error).toBe("STATE_CONFLICT");

      // Verify ownerId remains staffUserId (first claimant)
      const dbTicket = await prisma.ticket.findUnique({ where: { id: unassigned.id } });
      expect(dbTicket?.ownerId).toBe(staffUserId);
    });
  });

  describe("PUT /api/tickets/:id/assign", () => {
    it("reassigns ticket to active IT Staff user", async () => {
      const ticket = await prisma.ticket.findFirstOrThrow();
      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/assign`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: secondStaffUserId });

      expect(res.status).toBe(200);
      expect(res.body.ticket.ownerId).toBe(secondStaffUserId);
    });

    it("rejects reassignment to invalid or Requester user with 400 Bad Request", async () => {
      const ticket = await prisma.ticket.findFirstOrThrow();
      const alice = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/assign`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: alice.id });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_ASSIGNEE");
    });
  });

  describe("PUT /api/tickets/:id/priority (IT Staff Only / FR-10)", () => {
    it("allows IT Staff to update IT priority", async () => {
      const ticket = await prisma.ticket.findFirstOrThrow();
      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/priority`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ itPriority: "URGENT" });

      expect(res.status).toBe(200);
      expect(res.body.ticket.itPriority).toBe("URGENT");
    });

    it("denies Administrator attempt to update IT priority with 403 Forbidden", async () => {
      const ticket = await prisma.ticket.findFirstOrThrow();
      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/priority`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ itPriority: "URGENT" });

      expect(res.status).toBe(403);
    });

    it("rejects invalid IT priority value with 400 Bad Request", async () => {
      const ticket = await prisma.ticket.findFirstOrThrow();
      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/priority`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ itPriority: "SUPER_HIGH" });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/tickets/:id/status (Status Transition Matrix / FR-10)", () => {
    it("verifies permitted status transitions in the Status Transition Matrix", async () => {
      const alice = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
      const testTicket = await prisma.ticket.create({
        data: {
          ticketNumber: makeTestTicketNumber(),
          requesterId: alice.id,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Ticket for status transition matrix validation",
          description: "Validating permitted status transitions.",
          currentStatus: "NEW",
        },
      });

      // NEW -> OPEN
      const t1 = await request(app)
        .put(`/api/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "OPEN" });
      expect(t1.status).toBe(200);

      // OPEN -> IN_PROGRESS
      const t2 = await request(app)
        .put(`/api/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "IN_PROGRESS" });
      expect(t2.status).toBe(200);

      // IN_PROGRESS -> WAITING_FOR_REQUESTER
      const t3 = await request(app)
        .put(`/api/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "WAITING_FOR_REQUESTER" });
      expect(t3.status).toBe(200);

      // WAITING_FOR_REQUESTER -> RESOLVED
      const t4 = await request(app)
        .put(`/api/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "RESOLVED" });
      expect(t4.status).toBe(200);

      // RESOLVED -> REOPENED
      const t5 = await request(app)
        .put(`/api/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "REOPENED" });
      expect(t5.status).toBe(200);
    });

    it("rejects invalid status transitions with 400 Bad Request (INVALID_TRANSITION)", async () => {
      const alice = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
      const testTicket = await prisma.ticket.create({
        data: {
          ticketNumber: makeTestTicketNumber(),
          requesterId: alice.id,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Ticket for invalid transition testing",
          description: "Testing invalid status transition rejection.",
          currentStatus: "NEW",
        },
      });

      // NEW -> RESOLVED is invalid
      const res = await request(app)
        .put(`/api/tickets/${testTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("INVALID_TRANSITION");
    });

    it("verifies CANCELLED terminal state has no permitted outgoing transitions", async () => {
      const alice = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
      const cancelledTicket = await prisma.ticket.create({
        data: {
          ticketNumber: makeTestTicketNumber(),
          requesterId: alice.id,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Cancelled ticket",
          description: "Testing terminal state.",
          currentStatus: "CANCELLED",
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${cancelledTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "OPEN" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("INVALID_TRANSITION");
    });

    it("denies Administrator attempt to perform status transition with 403 Forbidden", async () => {
      const ticket = await prisma.ticket.findFirstOrThrow();
      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "OPEN" });

      expect(res.status).toBe(403);
    });
  });
});
