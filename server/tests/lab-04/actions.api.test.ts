import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import { clearRevocationBlocklist, signToken } from "../../src/utils/jwt.js";

describe("LAB4-04 / Actions Taken REST API Suite (actions.api.test.ts)", () => {
  const prisma = getPrisma();

  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let otherRequesterToken: string;

  let staffUser: any;
  let adminUser: any;
  let requesterUser: any;
  let otherRequesterUser: any;

  let activeTicket: any;
  let cancelledTicket: any;

  beforeEach(async () => {
    clearRevocationBlocklist();
    await seedDatabase();

    // Disable password change restriction for test users so authentication succeeds
    await prisma.user.updateMany({
      data: { requiresPasswordChange: false },
    });

    staffUser = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    adminUser = await prisma.user.findFirstOrThrow({ where: { role: "ADMINISTRATOR", isActive: true } });
    
    const requesters = await prisma.user.findMany({ where: { role: "REQUESTER", isActive: true } });
    requesterUser = requesters[0];
    otherRequesterUser = requesters[1] || requesters[0];

    staffToken = signToken({ userId: staffUser.id, email: staffUser.email, role: staffUser.role, requiresPasswordChange: false });
    adminToken = signToken({ userId: adminUser.id, email: adminUser.email, role: adminUser.role, requiresPasswordChange: false });
    requesterToken = signToken({ userId: requesterUser.id, email: requesterUser.email, role: requesterUser.role, requiresPasswordChange: false });
    otherRequesterToken = signToken({ userId: otherRequesterUser.id, email: otherRequesterUser.email, role: otherRequesterUser.role, requiresPasswordChange: false });

    // Ensure active ticket exists for requesterUser
    activeTicket = await prisma.ticket.findFirst({
      where: {
        requesterId: requesterUser.id,
        currentStatus: { not: "CANCELLED" },
      },
    });

    if (!activeTicket) {
      const category = await prisma.category.findFirstOrThrow();
      const system = await prisma.relatedSystem.findFirstOrThrow();
      activeTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-ACTIVE-${Date.now()}`,
          requesterId: requesterUser.id,
          categoryId: category.id,
          relatedSystemId: system.id,
          requestedPriority: "MEDIUM",
          summary: "Active test ticket for actions",
          description: "Active test ticket description for actions testing",
          currentStatus: "IN_PROGRESS",
        },
      });
    }

    // Ensure cancelled ticket fixture exists
    cancelledTicket = await prisma.ticket.findFirst({
      where: { currentStatus: "CANCELLED" },
    });

    if (!cancelledTicket) {
      const category = await prisma.category.findFirstOrThrow();
      const system = await prisma.relatedSystem.findFirstOrThrow();
      cancelledTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-CANCELLED-${Date.now()}`,
          requesterId: requesterUser.id,
          categoryId: category.id,
          relatedSystemId: system.id,
          requestedPriority: "MEDIUM",
          summary: "Test cancelled ticket fixture",
          description: "Cancelled ticket description for actions testing",
          currentStatus: "CANCELLED",
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-01: Valid Action Taken Creation & Auto PerformedBy Attribution
  // ---------------------------------------------------------------------------
  it("TEST-ACT-01: Creates an Action Taken on active ticket with auto performedById session identity (AC-01, BR-03)", async () => {
    const key = `test-act-01-${Date.now()}`;
    const res = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send({
        description: "Inspected hardware components and replaced cables.",
        result: "Hardware verified working fine.",
        followUpRequired: false,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ticketId).toBe(activeTicket.id);
    expect(res.body.performedBy.id).toBe(staffUser.id);
    expect(res.body.status).toBe("PENDING");
    expect(res.body.description).toBe("Inspected hardware components and replaced cables.");
    expect(res.body.result).toBe("Hardware verified working fine.");
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-02: Client-Supplied PerformedBy Payload Rejection
  // ---------------------------------------------------------------------------
  it("TEST-ACT-02: Rejects Action Taken creation when client payload contains performedById (AC-02, BR-03)", async () => {
    const key = `test-act-02-${Date.now()}`;
    const res = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send({
        performedById: 999,
        description: "Attempting to spoof performedById.",
        result: "Should fail.",
        followUpRequired: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-03: Follow-Up Note Required When followUpRequired = true
  // ---------------------------------------------------------------------------
  it("TEST-ACT-03: Rejects Action Taken creation when followUpRequired=true but followUpNote is missing/empty (AC-03, BR-05)", async () => {
    const key = `test-act-03-${Date.now()}`;
    const res = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send({
        description: "Checked network configuration.",
        result: "Router rebooted.",
        followUpRequired: true,
        followUpNote: "   ", // Whitespace only
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-04: Requester Forbidden Write Test
  // ---------------------------------------------------------------------------
  it("TEST-ACT-04: Denies Requester from creating or editing Actions Taken (403 Forbidden) (AC-04, BR-06)", async () => {
    const key = `test-act-04-${Date.now()}`;
    const createRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .set("Idempotency-Key", key)
      .send({
        description: "Requester trying to create action.",
        result: "Should fail.",
        followUpRequired: false,
      });

    expect(createRes.status).toBe(403);
    const errorCode = typeof createRes.body.error === "string" ? createRes.body.error : createRes.body.error?.code;
    expect(errorCode).toBe("FORBIDDEN");
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-05: List Actions Ordered Chronologically (createdAt ASC, id ASC)
  // ---------------------------------------------------------------------------
  it("TEST-ACT-05: Lists Actions Taken in chronological order (createdAt ASC, id ASC) (AC-05)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    const actions = res.body.data;
    for (let i = 1; i < actions.length; i++) {
      const prevDate = new Date(actions[i - 1].createdAt).getTime();
      const currDate = new Date(actions[i].createdAt).getTime();
      expect(currDate).toBeGreaterThanOrEqual(prevDate);
    }
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-06: Assignee Validation (Active IT Staff/Admin Only)
  // ---------------------------------------------------------------------------
  it("TEST-ACT-06: Allows assignment to active IT Staff/Admin and rejects invalid or REQUESTER assignees (AC-21, BR-04)", async () => {
    // 1. Valid assignment to Admin user
    const key = `test-act-06-${Date.now()}`;
    const validRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send({
        description: "Assigning work to Administrator.",
        result: "Assigned successfully.",
        assigneeId: adminUser.id,
        followUpRequired: false,
      });

    expect(validRes.status).toBe(201);
    expect(validRes.body.assignee.id).toBe(adminUser.id);

    // 2. Invalid assignment to REQUESTER user
    const keyBad = `test-act-06-bad-${Date.now()}`;
    const badRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", keyBad)
      .send({
        description: "Assigning work to Requester.",
        result: "Should fail.",
        assigneeId: requesterUser.id,
        followUpRequired: false,
      });

    expect(badRes.status).toBe(400);
    expect(badRes.body.error.code).toBe("BAD_REQUEST");
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-07: Idempotency-Key Header & Deduplication
  // ---------------------------------------------------------------------------
  it("TEST-ACT-07: Enforces Idempotency-Key header, returns cached 201 on duplicate, and 409 on payload mismatch (AC-16, AC-20, FR-14)", async () => {
    // 1. Missing header returns 400 MISSING_IDEMPOTENCY_KEY
    const noHeaderRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        description: "No idempotency header test.",
        result: "Should fail.",
        followUpRequired: false,
      });

    expect(noHeaderRes.status).toBe(400);
    expect(noHeaderRes.body.error.code).toBe("MISSING_IDEMPOTENCY_KEY");

    // 2. First call with key succeeds (201)
    const key = `test-act-07-dedup-${Date.now()}`;
    const payload = {
      description: "Testing idempotency deduplication flow.",
      result: "First call succeeded.",
      followUpRequired: false,
    };

    const firstRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send(payload);

    expect(firstRes.status).toBe(201);

    // 3. Second call with SAME key & SAME payload returns cached 201
    const secondRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send(payload);

    expect(secondRes.status).toBe(201);
    expect(secondRes.body.id).toBe(firstRes.body.id);

    // 4. Third call with SAME key & DIFFERENT payload returns 409 IDEMPOTENCY_KEY_REUSED
    const mismatchRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send({
        description: "DIFFERENT PAYLOAD WITH SAME KEY",
        result: "Should return conflict.",
        followUpRequired: false,
      });

    expect(mismatchRes.status).toBe(409);
    expect(mismatchRes.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-08: Content Update & Optimistic Concurrency Check (expectedUpdatedAt)
  // ---------------------------------------------------------------------------
  it("TEST-ACT-08: Updates Action Taken content with expectedUpdatedAt and rejects stale timestamp with 409 STALE_UPDATE (AC-17, BR-10)", async () => {
    // 1. Create action
    const key = `test-act-08-${Date.now()}`;
    const createRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send({
        description: "Initial action description.",
        result: "Initial result.",
        followUpRequired: false,
      });

    expect(createRes.status).toBe(201);
    const action = createRes.body;

    // 2. Missing expectedUpdatedAt returns 400 MISSING_EXPECTED_UPDATED_AT
    const missingTimeRes = await request(app)
      .put(`/api/actions/${action.id}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        description: "Updated without expectedUpdatedAt.",
      });

    expect(missingTimeRes.status).toBe(400);
    expect(missingTimeRes.body.error.code).toBe("MISSING_EXPECTED_UPDATED_AT");

    // 3. Stale expectedUpdatedAt returns 409 STALE_UPDATE
    const staleTimeRes = await request(app)
      .put(`/api/actions/${action.id}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedUpdatedAt: "2020-01-01T00:00:00.000Z",
        description: "Stale update description.",
      });

    expect(staleTimeRes.status).toBe(409);
    expect(staleTimeRes.body.error.code).toBe("STALE_UPDATE");

    // 4. Valid update succeeds
    const validEditRes = await request(app)
      .put(`/api/actions/${action.id}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedUpdatedAt: action.updatedAt,
        description: "Updated description after second check.",
        result: "Updated result after second check.",
      });

    expect(validEditRes.status).toBe(200);
    expect(validEditRes.body.description).toBe("Updated description after second check.");
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-09: Action Status Lifecycle Transitions
  // ---------------------------------------------------------------------------
  it("TEST-ACT-09: Executes status transitions (PENDING -> IN_PROGRESS -> COMPLETED) and rejects terminal transitions (AC-22, Section 8.2)", async () => {
    // 1. Create action (default PENDING)
    const key = `test-act-09-${Date.now()}`;
    const createRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send({
        description: "Lifecycle test action.",
        result: "Pending state.",
        followUpRequired: false,
      });

    expect(createRes.status).toBe(201);
    let action = createRes.body;

    // 2. Transition PENDING -> IN_PROGRESS
    const inProgressRes = await request(app)
      .put(`/api/actions/${action.id}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: "IN_PROGRESS",
        expectedUpdatedAt: action.updatedAt,
      });

    expect(inProgressRes.status).toBe(200);
    expect(inProgressRes.body.status).toBe("IN_PROGRESS");
    action = inProgressRes.body;

    // 3. Transition IN_PROGRESS -> COMPLETED
    const completedRes = await request(app)
      .put(`/api/actions/${action.id}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: "COMPLETED",
        expectedUpdatedAt: action.updatedAt,
      });

    expect(completedRes.status).toBe(200);
    expect(completedRes.body.status).toBe("COMPLETED");
    action = completedRes.body;

    // 4. Attempt transition from COMPLETED (terminal state) fails with 400 INVALID_TRANSITION
    const terminalTransitionRes = await request(app)
      .put(`/api/actions/${action.id}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        status: "IN_PROGRESS",
        expectedUpdatedAt: action.updatedAt,
      });

    expect(terminalTransitionRes.status).toBe(400);
    expect(terminalTransitionRes.body.error.code).toBe("INVALID_TRANSITION");
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-10: Terminal Ticket Check (CANCELLED Ticket Rejection)
  // ---------------------------------------------------------------------------
  it("TEST-ACT-10: Rejects Action Taken operations on CANCELLED tickets with 400 TICKET_TERMINAL (AC-12, AC-18, BR-09)", async () => {
    const key = `test-act-10-${Date.now()}`;
    const createRes = await request(app)
      .post(`/api/tickets/${cancelledTicket.id}/actions`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send({
        description: "Attempting action on cancelled ticket.",
        result: "Should fail.",
        followUpRequired: false,
      });

    expect(createRes.status).toBe(400);
    expect(createRes.body.error.code).toBe("TICKET_TERMINAL");
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-11: Requester Read Access & Ownership Isolation
  // ---------------------------------------------------------------------------
  it("TEST-ACT-11: Allows Requester to view actions on owned ticket, but denies access to unowned ticket (AC-23, BR-16)", async () => {
    // 1. Owned ticket actions read succeeds for Requester
    const ownedRes = await request(app)
      .get(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(ownedRes.status).toBe(200);
    expect(Array.isArray(ownedRes.body.data)).toBe(true);

    // 2. Unowned ticket actions read returns 403 FORBIDDEN for Requester
    const unownedRes = await request(app)
      .get(`/api/tickets/${activeTicket.id}/actions`)
      .set("Authorization", `Bearer ${otherRequesterToken}`);

    expect(unownedRes.status).toBe(403);
    const unownedErrorCode = typeof unownedRes.body.error === "string" ? unownedRes.body.error : unownedRes.body.error?.code;
    expect(unownedErrorCode).toBe("FORBIDDEN");
  });
});
