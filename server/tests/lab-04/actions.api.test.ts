import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
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

    staffUser = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF", isActive: true } });
    adminUser = await prisma.user.findFirstOrThrow({ where: { role: "ADMINISTRATOR", isActive: true } });
    
    const requesters = await prisma.user.findMany({ where: { role: "REQUESTER", isActive: true } });
    requesterUser = requesters[0];
    otherRequesterUser = requesters[1] || requesters[0];

    // Disable password change restriction strictly for test users used in this suite
    await prisma.user.updateMany({
      where: {
        email: { in: [staffUser.email, adminUser.email, requesterUser.email, otherRequesterUser.email] },
      },
      data: { requiresPasswordChange: false },
    });

    staffToken = signToken({ userId: staffUser.id, email: staffUser.email, role: staffUser.role, requiresPasswordChange: false });
    adminToken = signToken({ userId: adminUser.id, email: adminUser.email, role: adminUser.role, requiresPasswordChange: false });
    requesterToken = signToken({ userId: requesterUser.id, email: requesterUser.email, role: requesterUser.role, requiresPasswordChange: false });
    otherRequesterToken = signToken({ userId: otherRequesterUser.id, email: otherRequesterUser.email, role: otherRequesterUser.role, requiresPasswordChange: false });

    // Always create a dedicated active test ticket for actions suite to avoid polluting seeded fixtures
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();
    const activeNum = (Date.now() % 700000 + 100000).toString().padStart(6, "0");
    activeTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-${activeNum}`,
        requesterId: requesterUser.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "MEDIUM",
        summary: "Active test ticket for actions",
        description: "Active test ticket description for actions testing",
        currentStatus: "IN_PROGRESS",
      },
    });

    // Ensure cancelled ticket fixture exists
    const cancelledNum = (Date.now() % 700000 + 200000).toString().padStart(6, "0");
    cancelledTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-${cancelledNum}`,
        requesterId: requesterUser.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "MEDIUM",
        summary: "Test cancelled ticket fixture",
        description: "Cancelled ticket description for actions testing",
        currentStatus: "CANCELLED",
      },
    });
  });

  afterEach(async () => {
    if (staffUser || adminUser || requesterUser || otherRequesterUser) {
      const userEmails = [staffUser?.email, adminUser?.email, requesterUser?.email, otherRequesterUser?.email].filter(Boolean);
      await prisma.user.updateMany({
        where: { email: { in: userEmails } },
        data: { requiresPasswordChange: true },
      });
    }
  });

  afterAll(async () => {
    // Clean up all ActionTaken records and custom tickets created during actions API tests
    const seededActionIds = ["act-seed-000001", "act-seed-000002", "act-seed-000003", "act-seed-000004", "act-seed-000005"];
    await prisma.actionTaken.deleteMany({
      where: { id: { notIn: seededActionIds } },
    });

    await prisma.idempotencyRecord.deleteMany({});

    await prisma.ticket.deleteMany({
      where: {
        ticketNumber: {
          notIn: [
            "TKT-2026-000001",
            "TKT-2026-000002",
            "TKT-2026-000003",
            "TKT-2026-000004",
            "TKT-2026-000005",
            "TKT-2026-000006",
            "TKT-2026-000007",
            "TKT-2026-000008",
          ],
        },
      },
    });

    await prisma.user.updateMany({
      data: { requiresPasswordChange: true },
    });

    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-01: Valid Action Taken Creation & Auto PerformedBy Attribution
  // ---------------------------------------------------------------------------
  it("TEST-ACT-01: Creates an Action Taken on active ticket with auto performedById session identity (AC-01, BR-03)", async () => {
    const key = `test-act-01-${Date.now()}`;
    const res = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Cookie", `token=${staffToken}`)
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
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send({
        description: "Attempting identity spoofing.",
        result: "Should fail.",
        performedById: 99999,
        followUpRequired: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-03: Follow-Up Note Requirement & Strict Type Validation (MUST FIX 2)
  // ---------------------------------------------------------------------------
  it("TEST-ACT-03: Rejects Action Taken creation when followUpRequired is missing note or is invalid type (AC-03, BR-05)", async () => {
    const keyMissing = `test-act-03-missing-${Date.now()}`;
    const resMissing = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", keyMissing)
      .send({
        description: "Follow up required test without note.",
        result: "Needs follow up.",
        followUpRequired: true,
      });

    expect(resMissing.status).toBe(400);
    expect(resMissing.body.error.code).toBe("BAD_REQUEST");

    // MUST FIX 2: Rejects string "false" for followUpRequired
    const keyTypeStr = `test-act-03-type-${Date.now()}`;
    const resTypeStr = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", keyTypeStr)
      .send({
        description: "Follow up type check.",
        result: "Testing string type.",
        followUpRequired: "false",
      });

    expect(resTypeStr.status).toBe(400);
    expect(resTypeStr.body.error.code).toBe("BAD_REQUEST");
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-04: Requester Forbidden Write & Edit Operations (AC-04, BR-06)
  // ---------------------------------------------------------------------------
  it("TEST-ACT-04: Denies Requester from creating, editing, or updating Action status (403 Forbidden) (AC-04, BR-06)", async () => {
    // 1. Create action attempt by Requester
    const key = `test-act-04-${Date.now()}`;
    const createRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Cookie", `token=${requesterToken}`)
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

    // Create a staff action to test Requester edit & status transition rejection
    const actionKey = `test-act-04-setup-${Date.now()}`;
    const setupRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", actionKey)
      .send({
        description: "Staff action for edit test.",
        result: "Setup action.",
        followUpRequired: false,
      });

    const actionId = setupRes.body.id;
    const updatedAt = setupRes.body.updatedAt;

    // 2. Edit action content attempt by Requester
    const editRes = await request(app)
      .put(`/api/actions/${actionId}`)
      .set("Cookie", `token=${requesterToken}`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        expectedUpdatedAt: updatedAt,
        description: "Requester editing staff action.",
      });

    expect(editRes.status).toBe(403);

    // 3. Update action status attempt by Requester
    const statusRes = await request(app)
      .put(`/api/actions/${actionId}/status`)
      .set("Cookie", `token=${requesterToken}`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        expectedUpdatedAt: updatedAt,
        status: "COMPLETED",
      });

    expect(statusRes.status).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-05: List Actions Ordered Chronologically (createdAt ASC, id ASC)
  // ---------------------------------------------------------------------------
  it("TEST-ACT-05: Lists Actions Taken in chronological order (createdAt ASC, id ASC) (AC-05)", async () => {
    const now = new Date();
    const stamp = Date.now().toString().slice(-8);
    const idB = `00000000-0000-4000-8000-00${stamp}02`;
    const idA = `00000000-0000-4000-8000-00${stamp}01`;

    await prisma.actionTaken.create({
      data: {
        id: idB,
        ticketId: activeTicket.id,
        performedById: staffUser.id,
        description: "Action B with forced timestamp",
        result: "Sorting verification",
        status: "PENDING",
        createdAt: now,
      },
    });

    await prisma.actionTaken.create({
      data: {
        id: idA,
        ticketId: activeTicket.id,
        performedById: staffUser.id,
        description: "Action A with forced timestamp",
        result: "Sorting verification",
        status: "PENDING",
        createdAt: now,
      },
    });

    const res = await request(app)
      .get(`/api/tickets/${activeTicket.id}/actions`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    const actions = res.body.data;
    for (let i = 1; i < actions.length; i++) {
      const prev = actions[i - 1];
      const curr = actions[i];
      const prevTime = new Date(prev.createdAt).getTime();
      const currTime = new Date(curr.createdAt).getTime();
      expect(currTime).toBeGreaterThanOrEqual(prevTime);

      if (currTime === prevTime) {
        expect(curr.id >= prev.id).toBe(true);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-06: Assignee Validation (Active IT Staff/Admin only)
  // ---------------------------------------------------------------------------
  it("TEST-ACT-06: Allows assignment to active IT Staff/Admin and rejects invalid or REQUESTER assignees (AC-21, BR-04)", async () => {
    // 1. Valid assignment to Administrator
    const key = `test-act-06-${Date.now()}`;
    const validRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Cookie", `token=${staffToken}`)
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
      .set("Cookie", `token=${staffToken}`)
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
  // TEST-ACT-07: Idempotency-Key Header & Deduplication (Sequential & Concurrent MUST FIX 3)
  // ---------------------------------------------------------------------------
  it("TEST-ACT-07: Enforces Idempotency-Key header, returns cached 201 on duplicate, and 409 on payload mismatch (AC-16, AC-20, FR-14)", async () => {
    // 1. Missing header returns 400 MISSING_IDEMPOTENCY_KEY
    const noHeaderRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        description: "No idempotency header test.",
        result: "Should fail.",
        followUpRequired: false,
      });

    expect(noHeaderRes.status).toBe(400);
    expect(noHeaderRes.body.error.code).toBe("MISSING_IDEMPOTENCY_KEY");

    // 2. Sequential duplicate replay returns cached 201 response
    const key = `test-act-07-seq-${Date.now()}`;
    const payload = {
      description: "Sequential idempotency test.",
      result: "Original result.",
      followUpRequired: false,
    };

    const res1 = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send(payload);

    expect(res1.status).toBe(201);

    const res2 = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send(payload);

    expect(res2.status).toBe(201);
    expect(res2.body.id).toBe(res1.body.id);

    // 3. Payload mismatch returns 409 IDEMPOTENCY_KEY_REUSED
    const resMismatch = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send({
        description: "Different payload with same key.",
        result: "Changed result.",
        followUpRequired: false,
      });

    expect(resMismatch.status).toBe(409);
    expect(resMismatch.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("TEST-ACT-07-CONCURRENT: Handles concurrent identical and mismatched idempotent requests via Promise.all (MUST FIX 3)", async () => {
    // 1. Concurrent identical requests (Promise.all)
    const concurrentKey = `test-act-07-conc-${Date.now()}`;
    const identicalPayload = {
      description: "Concurrent identical payload test.",
      result: "Concurrent result.",
      followUpRequired: false,
    };

    const [r1, r2] = await Promise.all([
      request(app)
        .post(`/api/tickets/${activeTicket.id}/actions`)
        .set("Cookie", `token=${staffToken}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .set("Idempotency-Key", concurrentKey)
        .send(identicalPayload),
      request(app)
        .post(`/api/tickets/${activeTicket.id}/actions`)
        .set("Cookie", `token=${staffToken}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .set("Idempotency-Key", concurrentKey)
        .send(identicalPayload),
    ]);

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r1.body.id).toBe(r2.body.id);

    // Assert database contains exactly ONE ActionTaken record for this idempotency key
    const dbRecordCount = await prisma.idempotencyRecord.count({
      where: { idempotencyKey: concurrentKey },
    });
    expect(dbRecordCount).toBe(1);

    // 2. Concurrent payload mismatch requests (Promise.all)
    const mismatchKey = `test-act-07-mismatch-${Date.now()}`;
    const payloadA = { description: "Payload A", result: "Result A", followUpRequired: false };
    const payloadB = { description: "Payload B", result: "Result B", followUpRequired: false };

    const [mA, mB] = await Promise.all([
      request(app)
        .post(`/api/tickets/${activeTicket.id}/actions`)
        .set("Cookie", `token=${staffToken}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .set("Idempotency-Key", mismatchKey)
        .send(payloadA),
      request(app)
        .post(`/api/tickets/${activeTicket.id}/actions`)
        .set("Cookie", `token=${staffToken}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .set("Idempotency-Key", mismatchKey)
        .send(payloadB),
    ]);

    const statuses = [mA.status, mB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const recordMismatchCount = await prisma.idempotencyRecord.count({
      where: { idempotencyKey: mismatchKey },
    });
    expect(recordMismatchCount).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-08: Action Update Content & Optimistic Concurrency Control
  // ---------------------------------------------------------------------------
  it("TEST-ACT-08: Updates Action Taken content with expectedUpdatedAt and rejects stale timestamp with 409 STALE_UPDATE (AC-17, BR-10)", async () => {
    // Create initial action
    const key = `test-act-08-${Date.now()}`;
    const setupRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send({
        description: "Initial action description.",
        result: "Initial result.",
        followUpRequired: false,
      });

    const actionId = setupRes.body.id;
    const updatedAt = setupRes.body.updatedAt;

    // 1. Stale update timestamp returns 409 STALE_UPDATE
    const staleDate = new Date(new Date(updatedAt).getTime() - 10000).toISOString();
    const staleRes = await request(app)
      .put(`/api/actions/${actionId}`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedUpdatedAt: staleDate,
        description: "Stale edit attempt.",
      });

    expect(staleRes.status).toBe(409);
    expect(staleRes.body.error.code).toBe("STALE_UPDATE");

    // 2. Valid update succeeds with correct expectedUpdatedAt
    const updateRes = await request(app)
      .put(`/api/actions/${actionId}`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedUpdatedAt: updatedAt,
        description: "Updated action description.",
        result: "Updated action result.",
        followUpRequired: true,
        followUpNote: "Please follow up tomorrow morning.",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.description).toBe("Updated action description.");
    expect(updateRes.body.followUpRequired).toBe(true);
    expect(updateRes.body.followUpNote).toBe("Please follow up tomorrow morning.");
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-09: Action Status Transition Matrix (PENDING -> IN_PROGRESS -> COMPLETED)
  // ---------------------------------------------------------------------------
  it("TEST-ACT-09: Executes status transitions (PENDING -> IN_PROGRESS -> COMPLETED) and rejects terminal transitions (AC-22, Section 8.2)", async () => {
    const key = `test-act-09-${Date.now()}`;
    const setupRes = await request(app)
      .post(`/api/tickets/${activeTicket.id}/actions`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", key)
      .send({
        description: "Status transition test action.",
        result: "Setup completed.",
        followUpRequired: false,
      });

    const actionId = setupRes.body.id;
    let updatedAt = setupRes.body.updatedAt;

    // 1. Transition PENDING -> IN_PROGRESS
    const res1 = await request(app)
      .put(`/api/actions/${actionId}/status`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedUpdatedAt: updatedAt,
        status: "IN_PROGRESS",
      });

    expect(res1.status).toBe(200);
    expect(res1.body.status).toBe("IN_PROGRESS");
    updatedAt = res1.body.updatedAt;

    // 2. Transition IN_PROGRESS -> COMPLETED
    const res2 = await request(app)
      .put(`/api/actions/${actionId}/status`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedUpdatedAt: updatedAt,
        status: "COMPLETED",
      });

    expect(res2.status).toBe(200);
    expect(res2.body.status).toBe("COMPLETED");
    updatedAt = res2.body.updatedAt;

    // 3. Attempt transition from terminal state COMPLETED -> PENDING (Rejection)
    const resTerminal = await request(app)
      .put(`/api/actions/${actionId}/status`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        expectedUpdatedAt: updatedAt,
        status: "PENDING",
      });

    expect(resTerminal.status).toBe(400);
    expect(resTerminal.body.error.code).toBe("INVALID_TRANSITION");
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-10: Operations on Cancelled Ticket Rejection (AC-12, AC-18, BR-09)
  // ---------------------------------------------------------------------------
  it("TEST-ACT-10: Rejects Action Taken operations on CANCELLED tickets with 400 TICKET_TERMINAL (AC-12, AC-18, BR-09)", async () => {
    const key = `test-act-10-${Date.now()}`;
    const createRes = await request(app)
      .post(`/api/tickets/${cancelledTicket.id}/actions`)
      .set("Cookie", `token=${staffToken}`)
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
    // Requester accessing actions on owned ticket -> 200 OK
    const ownedRes = await request(app)
      .get(`/api/tickets/${activeTicket.id}/actions`)
      .set("Cookie", `token=${requesterToken}`)
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(ownedRes.status).toBe(200);
    expect(Array.isArray(ownedRes.body.data)).toBe(true);

    // Requester accessing actions on unowned ticket (cancelledTicket belongs to requesterUser, let's create ticket for other user)
    const otherCategory = await prisma.category.findFirstOrThrow();
    const otherSystem = await prisma.relatedSystem.findFirstOrThrow();
    const unownedNum = (Date.now() % 700000 + 300000).toString().padStart(6, "0");
    const unownedTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-${unownedNum}`,
        requesterId: otherRequesterUser.id,
        categoryId: otherCategory.id,
        relatedSystemId: otherSystem.id,
        requestedPriority: "MEDIUM",
        summary: "Unowned ticket for ownership test",
        description: "Testing ownership isolation",
        currentStatus: "OPEN",
      },
    });

    const unownedRes = await request(app)
      .get(`/api/tickets/${unownedTicket.id}/actions`)
      .set("Cookie", `token=${requesterToken}`)
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(unownedRes.status).toBe(403);
    expect(unownedRes.body.error.code).toBe("FORBIDDEN");
  });

  // ---------------------------------------------------------------------------
  // TEST-ACT-12-RACE: Ticket-Cancel vs Action Creation Race Condition (MUST FIX 4)
  // ---------------------------------------------------------------------------
  it("TEST-ACT-12-RACE: Prevents Action creation on CANCELLED ticket under concurrent status cancellation race condition (MUST FIX 4)", async () => {
    const raceCategory = await prisma.category.findFirstOrThrow();
    const raceSystem = await prisma.relatedSystem.findFirstOrThrow();
    const raceNum = (Date.now() % 700000 + 400000).toString().padStart(6, "0");
    const raceTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-${raceNum}`,
        requesterId: requesterUser.id,
        categoryId: raceCategory.id,
        relatedSystemId: raceSystem.id,
        requestedPriority: "HIGH",
        summary: "Race condition test ticket",
        description: "Testing FOR UPDATE row locking during ticket cancellation",
        currentStatus: "IN_PROGRESS",
      },
    });

    const key = `test-act-race-${Date.now()}`;

    // Concurrently execute Ticket Status Cancellation AND Action Creation using Promise.all
    const [cancelRes, actionRes] = await Promise.all([
      request(app)
        .put(`/api/tickets/${raceTicket.id}/status`)
        .set("Cookie", `token=${staffToken}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "CANCELLED" }),
      request(app)
        .post(`/api/tickets/${raceTicket.id}/actions`)
        .set("Cookie", `token=${staffToken}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .set("Idempotency-Key", key)
        .send({
          description: "Concurrent action creation during ticket cancellation.",
          result: "Race condition verification.",
          followUpRequired: false,
        }),
    ]);

    expect(cancelRes.status).toBe(200);

    const finalTicket = await prisma.ticket.findUniqueOrThrow({
      where: { id: raceTicket.id },
      include: { actionsTaken: true },
    });

    expect(finalTicket.currentStatus).toBe("CANCELLED");

    // Prove transaction commit ordering under both concurrent execution outcomes:
    if (actionRes.status === 201) {
      // Case A: Action creation transaction acquired FOR UPDATE row lock FIRST while Ticket status was IN_PROGRESS.
      // Direct Transaction Commit Order Marker:
      // 1. HTTP 201 status code proves POST /actions acquired the PostgreSQL FOR UPDATE row lock when currentStatus was IN_PROGRESS,
      //    committing prior to PUT /status acquiring the lock. (If PUT /status had committed first, currentStatus would be CANCELLED,
      //    and POST /actions would have been rejected with 400 TICKET_TERMINAL).
      // 2. The persisted action record in DB matches actionRes.body.id.
      expect(actionRes.body).toHaveProperty("id");
      expect(finalTicket.actionsTaken.length).toBe(1);
      const createdAction = finalTicket.actionsTaken[0];
      expect(createdAction.id).toBe(actionRes.body.id);
      expect(createdAction.description).toBe("Concurrent action creation during ticket cancellation.");
    } else if (actionRes.status === 400) {
      // Case B: Ticket Cancellation transaction committed FIRST before Action creation.
      // Direct Transaction Commit Order Marker:
      // PUT /status committed CANCELLED state first. POST /actions acquired FOR UPDATE lock afterwards,
      // observed CANCELLED status, aborted transaction with 400 TICKET_TERMINAL, and persisted 0 actions.
      expect(actionRes.body.error.code).toBe("TICKET_TERMINAL");
      expect(finalTicket.actionsTaken.length).toBe(0);
    } else {
      throw new Error(`Unexpected action creation response status: ${actionRes.status}`);
    }

    // Phase 2: Post-Cancellation Verification (Guaranteed Ticket state = CANCELLED)
    // Any subsequent Action creation attempt on this CANCELLED ticket MUST be rejected with 400 TICKET_TERMINAL
    const postCancelKey = `test-act-race-post-${Date.now()}`;
    const postCancelRes = await request(app)
      .post(`/api/tickets/${raceTicket.id}/actions`)
      .set("Cookie", `token=${staffToken}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .set("Idempotency-Key", postCancelKey)
      .send({
        description: "Post-cancellation action creation attempt.",
        result: "Must be rejected.",
        followUpRequired: false,
      });

    expect(postCancelRes.status).toBe(400);
    expect(postCancelRes.body.error.code).toBe("TICKET_TERMINAL");

    // Re-verify action count on CANCELLED ticket did NOT change
    const postCancelTicket = await prisma.ticket.findUniqueOrThrow({
      where: { id: raceTicket.id },
      include: { actionsTaken: true },
    });
    expect(postCancelTicket.actionsTaken.length).toBe(finalTicket.actionsTaken.length);
  });
});
