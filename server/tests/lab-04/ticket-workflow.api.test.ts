import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import { clearRevocationBlocklist, signToken } from "../../src/utils/jwt.js";

let seqCounter = 0;
function makeWorkflowTicketNumber(): string {
  seqCounter = (seqCounter + 1) % 1000;
  const num = ((Date.now() + seqCounter) % 890000 + 100000).toString().padStart(6, "0");
  return `TKT-2026-${num}`;
}

describe("LAB4-06 / Ticket Workflow & Resolution Gate REST API Suite (ticket-workflow.api.test.ts)", () => {
  const prisma = getPrisma();
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let staffUserId: number;
  let requesterUserId: number;

  beforeEach(async () => {
    clearRevocationBlocklist();
    await seedDatabase();

    await prisma.user.updateMany({
      where: { email: { in: ["john.staff@toktick.it", "sarah.staff@toktick.it", "admin@toktick.it", "alice@example.com", "bob@example.com"] } },
      data: { requiresPasswordChange: false },
    });

    const staff = await prisma.user.findUniqueOrThrow({ where: { email: "john.staff@toktick.it" } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@toktick.it" } });
    const requester = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });

    staffUserId = staff.id;
    requesterUserId = requester.id;

    staffToken = signToken({
      userId: staff.id,
      email: staff.email,
      role: staff.role,
      requiresPasswordChange: false,
    });

    adminToken = signToken({
      userId: admin.id,
      email: admin.email,
      role: admin.role,
      requiresPasswordChange: false,
    });

    requesterToken = signToken({
      userId: requester.id,
      email: requester.email,
      role: requester.role,
      requiresPasswordChange: false,
    });
  });

  describe("Ticket Status Transition Matrix (Section 8.1 / FR-09 / AC-09)", () => {
    it("TEST-FLOW-01: Permits valid status transition NEW -> OPEN (AC-09, FR-09)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "New ticket for valid transition test",
          description: "Testing NEW -> OPEN transition.",
          currentStatus: "NEW",
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({
          status: "OPEN",
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.ticket.currentStatus).toBe("OPEN");

      const dbTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(dbTicket.currentStatus).toBe("OPEN");
    });

    it("TEST-FLOW-02: Rejects invalid direct transition NEW -> IN_PROGRESS with 400 INVALID_TRANSITION (AC-09, FR-11)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "HIGH",
          summary: "New ticket for invalid jump test",
          description: "Testing NEW -> IN_PROGRESS illegal jump.",
          currentStatus: "NEW",
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({
          status: "IN_PROGRESS",
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_TRANSITION");
      expect(res.body.error.message).toContain("Transition from NEW to IN_PROGRESS is not allowed");
    });

    it("TEST-FLOW-06: Permits valid transition IN_PROGRESS -> CANCELLED (AC-09)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "LOW",
          summary: "In progress ticket to cancel",
          description: "Testing cancellation from in progress.",
          currentStatus: "IN_PROGRESS",
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({
          status: "CANCELLED",
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.ticket.currentStatus).toBe("CANCELLED");
    });

    it("TEST-FLOW-07 (TEST-TERM-01): Rejects transition attempts from CANCELLED terminal state with 400 TICKET_TERMINAL (AC-12, BR-09)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Terminal cancelled ticket",
          description: "Testing terminal state rejection.",
          currentStatus: "CANCELLED",
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({
          status: "OPEN",
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("TICKET_TERMINAL");
      expect(res.body.error.message).toContain("terminal state (CANCELLED)");
    });

    it("TEST-FLOW-08: Rejects Action Taken creation on CANCELLED terminal ticket with 400 TICKET_TERMINAL (AC-12, BR-09)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Terminal cancelled ticket for action creation",
          description: "Testing terminal state rejection on action creation.",
          currentStatus: "CANCELLED",
        },
      });

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Cookie", `token=${staffToken}`)
        .set("Idempotency-Key", `idem-cancel-${Date.now()}`)
        .send({
          description: "Attempted action on cancelled ticket",
          result: "Should fail immediately",
          status: "PENDING",
          followUpRequired: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("TICKET_TERMINAL");
    });

    describe.each([
      ["NEW", "OPEN", false],
      ["NEW", "CANCELLED", false],
      ["OPEN", "IN_PROGRESS", false],
      ["OPEN", "CANCELLED", false],
      ["IN_PROGRESS", "WAITING_FOR_REQUESTER", false],
      ["IN_PROGRESS", "RESOLVED", true],
      ["IN_PROGRESS", "CANCELLED", false],
      ["WAITING_FOR_REQUESTER", "IN_PROGRESS", false],
      ["WAITING_FOR_REQUESTER", "RESOLVED", true],
      ["WAITING_FOR_REQUESTER", "CANCELLED", false],
      ["RESOLVED", "CLOSED", false],
      ["RESOLVED", "REOPENED", false],
      ["CLOSED", "REOPENED", false],
      ["REOPENED", "IN_PROGRESS", false],
      ["REOPENED", "CANCELLED", false],
    ])("Parameterized Permitted Matrix Edge: %s -> %s", (fromStatus, toStatus, needsGateNote) => {
      it(`successfully transitions ${fromStatus} -> ${toStatus}`, async () => {
        const ticket = await prisma.ticket.create({
          data: {
            ticketNumber: makeWorkflowTicketNumber(),
            requesterId: requesterUserId,
            categoryId: 1,
            relatedSystemId: 1,
            requestedPriority: "MEDIUM",
            summary: `Matrix edge ${fromStatus} to ${toStatus}`,
            description: "Testing permitted edge.",
            currentStatus: fromStatus as any,
          },
        });

        const payload: any = {
          status: toStatus,
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        };
        if (needsGateNote) {
          payload.resolutionNote = "Resolution gate satisfied by formal test note.";
        }

        const res = await request(app)
          .put(`/api/tickets/${ticket.id}/status`)
          .set("Cookie", `token=${staffToken}`)
          .send(payload);

        expect(res.status).toBe(200);
        expect(res.body.ticket.currentStatus).toBe(toStatus);
      });
    });

    describe.each([
      ["NEW", "IN_PROGRESS"],
      ["NEW", "RESOLVED"],
      ["NEW", "CLOSED"],
      ["NEW", "REOPENED"],
      ["OPEN", "RESOLVED"],
      ["OPEN", "CLOSED"],
      ["OPEN", "REOPENED"],
      ["RESOLVED", "OPEN"],
      ["RESOLVED", "IN_PROGRESS"],
      ["CLOSED", "OPEN"],
      ["CLOSED", "IN_PROGRESS"],
      ["CLOSED", "CANCELLED"],
    ])("Parameterized Forbidden Jumps: %s -> %s", (fromStatus, toStatus) => {
      it(`rejects invalid transition ${fromStatus} -> ${toStatus} with 400 INVALID_TRANSITION`, async () => {
        const ticket = await prisma.ticket.create({
          data: {
            ticketNumber: makeWorkflowTicketNumber(),
            requesterId: requesterUserId,
            categoryId: 1,
            relatedSystemId: 1,
            requestedPriority: "MEDIUM",
            summary: `Forbidden jump ${fromStatus} to ${toStatus}`,
            description: "Testing forbidden jump.",
            currentStatus: fromStatus as any,
          },
        });

        const res = await request(app)
          .put(`/api/tickets/${ticket.id}/status`)
          .set("Cookie", `token=${staffToken}`)
          .send({
            status: toStatus,
            expectedUpdatedAt: ticket.updatedAt.toISOString(),
          });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INVALID_TRANSITION");
      });
    });

    it("Executes full lifecycle sequence: OPEN -> IN_PROGRESS -> WAITING_FOR_REQUESTER -> RESOLVED -> CLOSED -> REOPENED -> IN_PROGRESS", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Full lifecycle sequence ticket",
          description: "Testing complete lifecycle loop.",
          currentStatus: "OPEN",
        },
      });

      // 1. OPEN -> IN_PROGRESS
      let current = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      let res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({ status: "IN_PROGRESS", expectedUpdatedAt: current.updatedAt.toISOString() });
      expect(res.status).toBe(200);

      // 2. IN_PROGRESS -> WAITING_FOR_REQUESTER
      current = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({ status: "WAITING_FOR_REQUESTER", expectedUpdatedAt: current.updatedAt.toISOString() });
      expect(res.status).toBe(200);

      // 3. WAITING_FOR_REQUESTER -> RESOLVED (with resolutionNote)
      current = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({
          status: "RESOLVED",
          resolutionNote: "Formal resolution note to satisfy gate.",
          expectedUpdatedAt: current.updatedAt.toISOString(),
        });
      expect(res.status).toBe(200);

      // 4. RESOLVED -> CLOSED
      current = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({ status: "CLOSED", expectedUpdatedAt: current.updatedAt.toISOString() });
      expect(res.status).toBe(200);

      // 5. CLOSED -> REOPENED
      current = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({ status: "REOPENED", expectedUpdatedAt: current.updatedAt.toISOString() });
      expect(res.status).toBe(200);

      // 6. REOPENED -> IN_PROGRESS
      current = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({ status: "IN_PROGRESS", expectedUpdatedAt: current.updatedAt.toISOString() });
      expect(res.status).toBe(200);
      expect(res.body.ticket.currentStatus).toBe("IN_PROGRESS");
    });
  });

  describe("Server-Side Resolution Gate Enforcement (FR-10, BR-08 / AC-09)", () => {
    it("TEST-FLOW-03: Blocks transition to RESOLVED when 0 completed actions exist and resolutionNote is omitted (AC-09, FR-10)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Gate test with zero actions and empty note",
          description: "Must fail resolution gate.",
          currentStatus: "IN_PROGRESS",
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({
          status: "RESOLVED",
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
      expect(res.body.error.message).toContain("Cannot resolve ticket without at least one completed Action Taken or formal resolution note");

      const dbTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(dbTicket.currentStatus).toBe("IN_PROGRESS");
    });

    it("TEST-GATE-01: Rejects whitespace-only resolutionNote when 0 completed actions exist (BR-08, BR-17)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Gate test whitespace note",
          description: "Must fail whitespace validation.",
          currentStatus: "IN_PROGRESS",
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({
          status: "RESOLVED",
          resolutionNote: "    ",
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("TEST-FLOW-04: Permits transition to RESOLVED when 0 completed actions exist but non-empty resolutionNote is provided (AC-09, BR-08)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Gate test resolution note only",
          description: "Satisfies gate via staff note.",
          currentStatus: "IN_PROGRESS",
        },
      });

      const formalNote = "Rebooted access point switch and verified connectivity for requester.";
      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({
          status: "RESOLVED",
          resolutionNote: formalNote,
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.ticket.currentStatus).toBe("RESOLVED");
      expect(res.body.ticket.resolutionNote).toBe(formalNote);

      const dbTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(dbTicket.currentStatus).toBe("RESOLVED");
      expect(dbTicket.resolutionNote).toBe(formalNote);
    });

    it("TEST-FLOW-05: Permits transition to RESOLVED when >= 1 completed ActionTaken exists, with or without resolutionNote (AC-09, BR-08)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Gate test with completed action",
          description: "Satisfies gate via completed action.",
          currentStatus: "IN_PROGRESS",
        },
      });

      // Create a COMPLETED action linked to ticket
      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUserId,
          description: "Replaced faulty Ethernet RJ45 jack.",
          result: "Port link restored at 1Gbps.",
          status: "COMPLETED",
          followUpRequired: false,
        },
      });

      // Transition to RESOLVED with empty resolutionNote
      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({
          status: "RESOLVED",
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.ticket.currentStatus).toBe("RESOLVED");

      const dbTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(dbTicket.currentStatus).toBe("RESOLVED");
    });

    it("Rejects resolution when ticket only has PENDING or IN_PROGRESS actions and no resolutionNote", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Incomplete actions gate test",
          description: "PENDING action does not satisfy gate.",
          currentStatus: "IN_PROGRESS",
        },
      });

      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUserId,
          description: "Work in progress action.",
          result: "In progress.",
          status: "IN_PROGRESS",
          followUpRequired: false,
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .send({
          status: "RESOLVED",
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });
  });

  describe("Role Authorization & Security Boundaries (Section 6 / BR-04 / AC-04)", () => {
    it("TEST-SEC-04: Denies Requester attempt to perform status transition with 403 Forbidden", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Requester rbac test",
          description: "Testing requester forbidden status transition.",
          currentStatus: "OPEN",
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${requesterToken}`)
        .send({
          status: "IN_PROGRESS",
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(403);
    });

    it("Denies unauthenticated status transition attempt with 401 Unauthorized", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Unauthenticated test",
          description: "Testing unauthenticated status transition.",
          currentStatus: "OPEN",
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .send({
          status: "IN_PROGRESS",
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(401);
    });

    it("TEST-SEC-ADMIN-01: Administrator can perform valid Ticket status transition (Specification Section 6 / Handout §4.3)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Admin valid transition test",
          description: "Testing Administrator transition from OPEN to IN_PROGRESS.",
          currentStatus: "OPEN",
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${adminToken}`)
        .send({
          status: "IN_PROGRESS",
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.ticket.currentStatus).toBe("IN_PROGRESS");

      const dbTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(dbTicket.currentStatus).toBe("IN_PROGRESS");
    });

    it("TEST-SEC-ADMIN-02: Administrator can satisfy Resolution Gate and transition to RESOLVED (Specification Section 6 / Handout §4.3)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "HIGH",
          summary: "Admin resolution gate test",
          description: "Testing Administrator resolving ticket with formal resolution note.",
          currentStatus: "IN_PROGRESS",
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", `token=${adminToken}`)
        .send({
          status: "RESOLVED",
          resolutionNote: "Administrator verified server hardware and confirmed stable operation.",
          expectedUpdatedAt: ticket.updatedAt.toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.ticket.currentStatus).toBe("RESOLVED");
      expect(res.body.ticket.resolutionNote).toBe("Administrator verified server hardware and confirmed stable operation.");

      const dbTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(dbTicket.currentStatus).toBe("RESOLVED");
      expect(dbTicket.resolutionNote).toBe("Administrator verified server hardware and confirmed stable operation.");
    });
  });

  describe("Requester Advisory Indicator (BR-07 / AC-10)", () => {
    it("TEST-GATE-02: Requester 'Problem Appears Resolved' sets requesterResolvedIndicatedAt without mutating ticket status (AC-10, BR-07)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: makeWorkflowTicketNumber(),
          requesterId: requesterUserId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Requester indicator test",
          description: "Testing advisory signalling.",
          currentStatus: "IN_PROGRESS",
        },
      });

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/resolve-indicator`)
        .set("Cookie", `token=${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ticket.requesterResolvedIndicatedAt).toBeDefined();
      expect(res.body.ticket.currentStatus).toBe("IN_PROGRESS");

      const dbTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(dbTicket.currentStatus).toBe("IN_PROGRESS");
      expect(dbTicket.requesterResolvedIndicatedAt).not.toBeNull();
    });
  });
});
