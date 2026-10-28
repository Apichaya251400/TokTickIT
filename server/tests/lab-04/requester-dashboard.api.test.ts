import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import { clearRevocationBlocklist, signToken } from "../../src/utils/jwt.js";
import { getBangkokDaysAgoBoundaries } from "../../src/utils/timezone.js";

describe("LAB4-08 / Requester Dashboard REST API Suite (requester-dashboard.api.test.ts)", () => {
  const prisma = getPrisma();

  let requesterUser: any;
  let otherRequesterUser: any;
  let staffUser: any;
  let adminUser: any;

  let requesterToken: string;
  let otherRequesterToken: string;
  let staffToken: string;
  let adminToken: string;

  let testCategory: any;
  let testSystem: any;

  beforeEach(async () => {
    clearRevocationBlocklist();
    await seedDatabase();

    staffUser = await prisma.user.findFirstOrThrow({ where: { email: "staff@toktick.it" } });
    adminUser = await prisma.user.findFirstOrThrow({ where: { email: "admin@toktick.it" } });
    requesterUser = await prisma.user.findFirstOrThrow({ where: { email: "alice@example.com" } });

    // Find or create a second requester user for ownership-scoped testing
    otherRequesterUser = await prisma.user.findFirst({
      where: { role: "REQUESTER", id: { not: requesterUser.id }, isActive: true },
    });
    if (!otherRequesterUser) {
      otherRequesterUser = await prisma.user.create({
        data: {
          name: "Second Requester",
          email: "requester2@example.com",
          passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
          role: "REQUESTER",
          isActive: true,
          requiresPasswordChange: false,
        },
      });
    }

    await prisma.user.updateMany({
      where: {
        email: { in: [staffUser.email, adminUser.email, requesterUser.email, otherRequesterUser.email] },
      },
      data: { requiresPasswordChange: false },
    });

    requesterToken = signToken({
      userId: requesterUser.id,
      email: requesterUser.email,
      role: requesterUser.role,
      requiresPasswordChange: false,
    });
    otherRequesterToken = signToken({
      userId: otherRequesterUser.id,
      email: otherRequesterUser.email,
      role: otherRequesterUser.role,
      requiresPasswordChange: false,
    });
    staffToken = signToken({
      userId: staffUser.id,
      email: staffUser.email,
      role: staffUser.role,
      requiresPasswordChange: false,
    });
    adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      requiresPasswordChange: false,
    });

    testCategory = await prisma.category.findFirstOrThrow();
    testSystem = await prisma.relatedSystem.findFirstOrThrow();
  });

  afterEach(async () => {
    await prisma.user.updateMany({
      data: { requiresPasswordChange: true },
    });
  });

  afterAll(async () => {
    await prisma.ticket.deleteMany({
      where: {
        summary: { startsWith: "[TEST-REQDASH]" },
      },
    });
    await prisma.user.deleteMany({
      where: { email: "zero_requester@example.com" },
    });
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-REQ-01: Accurate calculation of operational metrics & workload lists
  // ---------------------------------------------------------------------------
  it("TEST-DASH-REQ-01: Accurately calculates 4 operational metrics and recent lists for Requester (AC-07, BR-11, BR-12, BR-13)", async () => {
    const { startOfDay, startOfNextDay } = getBangkokDaysAgoBoundaries(29);

    // 1. Create an open ticket (NEW) owned by requesterUser
    const openTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-REQDASH01`,
        requesterId: requesterUser.id,
        ownerId: null,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "MEDIUM",
        summary: "[TEST-REQDASH] Open ticket",
        description: "Testing open tickets count metric",
        currentStatus: "NEW",
      },
    });

    // 2. Create a ticket in WAITING_FOR_REQUESTER owned by requesterUser
    const waitingTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-REQDASH02`,
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "HIGH",
        summary: "[TEST-REQDASH] Waiting for requester ticket",
        description: "Testing waiting for requester count and attention list",
        currentStatus: "WAITING_FOR_REQUESTER",
      },
    });

    // 3. Create a ticket in IN_PROGRESS owned by requesterUser
    const inProgressTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-REQDASH03`,
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "URGENT",
        summary: "[TEST-REQDASH] In progress ticket",
        description: "Testing in progress count metric",
        currentStatus: "IN_PROGRESS",
      },
    });

    // 4. Create a ticket resolved today owned by requesterUser
    const resolvedRecentTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-REQDASH04`,
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "LOW",
        summary: "[TEST-REQDASH] Recently resolved ticket",
        description: "Testing recently resolved count metric within 30 days",
        currentStatus: "RESOLVED",
        updatedAt: new Date(startOfDay.getTime() + 10 * 86400 * 1000), // Within past 30 days window
      },
    });

    // 5. Create a ticket resolved 35 days ago (should NOT count in recentlyResolvedCount)
    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-REQDASH05`,
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "LOW",
        summary: "[TEST-REQDASH] Old resolved ticket",
        description: "Testing exclusion of tickets resolved > 30 days ago",
        currentStatus: "RESOLVED",
        updatedAt: new Date(startOfDay.getTime() - 5 * 86400 * 1000), // 34-35 days ago
      },
    });

    // Authoritative direct DB counts
    const expectedOpenCount = await prisma.ticket.count({
      where: {
        requesterId: requesterUser.id,
        currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
      },
    });
    const expectedWaitingCount = await prisma.ticket.count({
      where: {
        requesterId: requesterUser.id,
        currentStatus: "WAITING_FOR_REQUESTER",
      },
    });
    const expectedInProgressCount = await prisma.ticket.count({
      where: {
        requesterId: requesterUser.id,
        currentStatus: "IN_PROGRESS",
      },
    });
    const expectedRecentlyResolvedCount = await prisma.ticket.count({
      where: {
        requesterId: requesterUser.id,
        currentStatus: "RESOLVED",
        updatedAt: {
          gte: startOfDay,
          lt: startOfNextDay,
        },
      },
    });

    const res = await request(app)
      .get("/api/dashboards/requester")
      .set("Cookie", `token=${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body.metrics.openTicketsCount).toBe(expectedOpenCount);
    expect(res.body.metrics.waitingForRequesterCount).toBe(expectedWaitingCount);
    expect(res.body.metrics.inProgressCount).toBe(expectedInProgressCount);
    expect(res.body.metrics.recentlyResolvedCount).toBe(expectedRecentlyResolvedCount);

    // Verify recent tickets list shape
    expect(Array.isArray(res.body.recentTickets)).toBe(true);
    expect(res.body.recentTickets.length).toBeLessThanOrEqual(5);
    const foundRecent = res.body.recentTickets.find((t: any) => t.id === inProgressTicket.id);
    expect(foundRecent).toBeDefined();
    expect(foundRecent.ticketNumber).toBe("TKT-2026-REQDASH03");
    expect(foundRecent.currentStatus).toBe("IN_PROGRESS");
    expect(foundRecent.requestedPriority).toBe("URGENT");
    expect(typeof foundRecent.updatedAt).toBe("string");

    // Verify attention required tickets list shape
    expect(Array.isArray(res.body.attentionRequiredTickets)).toBe(true);
    expect(res.body.attentionRequiredTickets.length).toBeLessThanOrEqual(5);
    const foundAttention = res.body.attentionRequiredTickets.find((t: any) => t.id === waitingTicket.id);
    expect(foundAttention).toBeDefined();
    expect(foundAttention.ticketNumber).toBe("TKT-2026-REQDASH02");
    expect(foundAttention.currentStatus).toBe("WAITING_FOR_REQUESTER");
    expect(foundAttention.requestedPriority).toBe("HIGH");
    expect(typeof foundAttention.updatedAt).toBe("string");
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-REQ-02: Zero-count metrics and empty lists
  // ---------------------------------------------------------------------------
  it("TEST-DASH-REQ-02: Returns zero-count metrics and empty arrays for requester with no tickets (AC-15, BR-14, FR-08)", async () => {
    const zeroRequester = await prisma.user.create({
      data: {
        name: "Zero Workload Requester",
        email: "zero_requester@example.com",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
        role: "REQUESTER",
        isActive: true,
        requiresPasswordChange: false,
      },
    });

    const zeroToken = signToken({
      userId: zeroRequester.id,
      email: zeroRequester.email,
      role: zeroRequester.role,
      requiresPasswordChange: false,
    });

    const res = await request(app)
      .get("/api/dashboards/requester")
      .set("Cookie", `token=${zeroToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics.openTicketsCount).toBe(0);
    expect(res.body.metrics.waitingForRequesterCount).toBe(0);
    expect(res.body.metrics.inProgressCount).toBe(0);
    expect(res.body.metrics.recentlyResolvedCount).toBe(0);
    expect(res.body.recentTickets).toEqual([]);
    expect(res.body.attentionRequiredTickets).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-REQ-03: Server-side aggregate calculation without raw collection leakage
  // ---------------------------------------------------------------------------
  it("TEST-DASH-REQ-03: Provides aggregate counts without leaking full raw ticket datasets (BR-11)", async () => {
    const res = await request(app)
      .get("/api/dashboards/requester")
      .set("Cookie", `token=${requesterToken}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.metrics.openTicketsCount).toBe("number");
    expect(typeof res.body.metrics.waitingForRequesterCount).toBe("number");
    expect(typeof res.body.metrics.inProgressCount).toBe("number");
    expect(typeof res.body.metrics.recentlyResolvedCount).toBe("number");

    // Must NOT contain full collections of all tickets
    expect(res.body).not.toHaveProperty("allTickets");
    expect(res.body).not.toHaveProperty("openTickets");
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-REQ-04: Ownership-scoped filtering strictly by authenticated user ID
  // ---------------------------------------------------------------------------
  it("TEST-DASH-REQ-04: Ownership-scoped metrics strictly filter by authenticated user ID and reject query overrides (BR-13)", async () => {
    // Create a ticket owned by otherRequesterUser
    const otherTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-REQDASH06`,
        requesterId: otherRequesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "HIGH",
        summary: "[TEST-REQDASH] Ticket for second requester",
        description: "Testing ownership isolation",
        currentStatus: "WAITING_FOR_REQUESTER",
      },
    });

    // Query dashboard as requesterUser with malicious query params trying to inspect otherRequesterUser
    const resRequester1 = await request(app)
      .get(`/api/dashboards/requester?requesterId=${otherRequesterUser.id}&userId=${otherRequesterUser.id}`)
      .set("Cookie", `token=${requesterToken}`);

    // Query dashboard as otherRequesterUser
    const resRequester2 = await request(app)
      .get("/api/dashboards/requester")
      .set("Cookie", `token=${otherRequesterToken}`);

    expect(resRequester1.status).toBe(200);
    expect(resRequester2.status).toBe(200);

    // Requester 1 must NOT see Requester 2's ticket
    const req1HasOtherTicket = resRequester1.body.recentTickets.some((t: any) => t.id === otherTicket.id);
    expect(req1HasOtherTicket).toBe(false);

    const req1HasOtherAttention = resRequester1.body.attentionRequiredTickets.some((t: any) => t.id === otherTicket.id);
    expect(req1HasOtherAttention).toBe(false);

    // Requester 2 DOES see their own ticket
    const req2HasOtherTicket = resRequester2.body.recentTickets.some((t: any) => t.id === otherTicket.id);
    expect(req2HasOtherTicket).toBe(true);

    const req2HasOtherAttention = resRequester2.body.attentionRequiredTickets.some((t: any) => t.id === otherTicket.id);
    expect(req2HasOtherAttention).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-REQ-05: Recently resolved boundary isolation
  // ---------------------------------------------------------------------------
  it("TEST-DASH-REQ-05: Recently resolved count strictly respects Asia/Bangkok 30-day boundaries", async () => {
    const { startOfDay } = getBangkokDaysAgoBoundaries(29);

    const countBefore = (
      await request(app).get("/api/dashboards/requester").set("Cookie", `token=${requesterToken}`)
    ).body.metrics.recentlyResolvedCount;

    // Ticket resolved exactly 1 hour inside the 30-day window
    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-REQDASH07`,
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "MEDIUM",
        summary: "[TEST-REQDASH] Just inside boundary",
        description: "Window check",
        currentStatus: "RESOLVED",
        updatedAt: new Date(startOfDay.getTime() + 3600 * 1000),
      },
    });

    // Ticket resolved 1 hour outside the 30-day window (older)
    await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-REQDASH08`,
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "MEDIUM",
        summary: "[TEST-REQDASH] Just outside boundary",
        description: "Window check outside",
        currentStatus: "RESOLVED",
        updatedAt: new Date(startOfDay.getTime() - 3600 * 1000),
      },
    });

    const countAfter = (
      await request(app).get("/api/dashboards/requester").set("Cookie", `token=${requesterToken}`)
    ).body.metrics.recentlyResolvedCount;

    // Only the ticket inside the window should increment the count
    expect(countAfter).toBe(countBefore + 1);
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-REQ-06: Deterministic ordering of recent tickets (updatedAt DESC, id ASC)
  // ---------------------------------------------------------------------------
  it("TEST-DASH-REQ-06: Orders recent tickets by updatedAt DESC, id ASC", async () => {
    const futureTime = new Date(Date.now() + 200000);

    const t1 = await prisma.ticket.create({
      data: {
        id: "11111111-1111-4111-b111-111111111111",
        ticketNumber: "TKT-2026-REQSORT01",
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "LOW",
        summary: "[TEST-REQDASH] Sort Ticket 1 (older)",
        description: "Sort testing",
        currentStatus: "OPEN",
        updatedAt: new Date(futureTime.getTime() - 20000),
      },
    });

    const t2 = await prisma.ticket.create({
      data: {
        id: "22222222-2222-4222-b222-222222222222",
        ticketNumber: "TKT-2026-REQSORT02",
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "MEDIUM",
        summary: "[TEST-REQDASH] Sort Ticket 2 (same timestamp A)",
        description: "Sort testing",
        currentStatus: "IN_PROGRESS",
        updatedAt: futureTime,
      },
    });

    const t3 = await prisma.ticket.create({
      data: {
        id: "22222222-2222-4222-b222-222222222223",
        ticketNumber: "TKT-2026-REQSORT03",
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "HIGH",
        summary: "[TEST-REQDASH] Sort Ticket 3 (same timestamp B)",
        description: "Sort testing",
        currentStatus: "NEW",
        updatedAt: futureTime,
      },
    });

    const res = await request(app)
      .get("/api/dashboards/requester")
      .set("Cookie", `token=${requesterToken}`);

    expect(res.status).toBe(200);

    const idx1 = res.body.recentTickets.findIndex((t: any) => t.id === t1.id);
    const idx2 = res.body.recentTickets.findIndex((t: any) => t.id === t2.id);
    const idx3 = res.body.recentTickets.findIndex((t: any) => t.id === t3.id);

    expect(idx1).toBeGreaterThan(-1);
    expect(idx2).toBeGreaterThan(-1);
    expect(idx3).toBeGreaterThan(-1);

    // t2 and t3 are newer than t1
    expect(idx2).toBeLessThan(idx1);
    expect(idx3).toBeLessThan(idx1);

    // For same timestamp, sorted by id ASC ('...2222' before '...2223')
    expect(idx2).toBeLessThan(idx3);
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-REQ-07: Role authorization checks
  // ---------------------------------------------------------------------------
  it("TEST-DASH-REQ-07: Rejects non-requester roles with 403 Forbidden and unauthenticated with 401 Unauthorized", async () => {
    // IT Staff denied
    const resStaff = await request(app)
      .get("/api/dashboards/requester")
      .set("Cookie", `token=${staffToken}`);
    expect(resStaff.status).toBe(403);
    expect(resStaff.body.error).toBe("FORBIDDEN");

    // Administrator denied
    const resAdmin = await request(app)
      .get("/api/dashboards/requester")
      .set("Cookie", `token=${adminToken}`);
    expect(resAdmin.status).toBe(403);
    expect(resAdmin.body.error).toBe("FORBIDDEN");

    // Unauthenticated denied
    const resNoAuth = await request(app).get("/api/dashboards/requester");
    expect(resNoAuth.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-REQ-08: 500 error handling
  // ---------------------------------------------------------------------------
  it("TEST-DASH-REQ-08: Returns 500 INTERNAL_ERROR on unhandled database failure", async () => {
    const originalCount = prisma.ticket.count;
    (prisma.ticket as any).count = vi.fn().mockRejectedValue(new Error("Database connection loss"));

    const res = await request(app)
      .get("/api/dashboards/requester")
      .set("Cookie", `token=${requesterToken}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again.",
      },
    });

    (prisma.ticket as any).count = originalCount;
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-REQ-09: My Tickets currentStatus=open query returns all active tickets
  // ---------------------------------------------------------------------------
  it("TEST-DASH-REQ-09: My Tickets currentStatus=open query returns only active non-terminal tickets (AC-08, BR-15)", async () => {
    const resOpen = await request(app)
      .get("/api/tickets/my-tickets?currentStatus=open")
      .set("Cookie", `token=${requesterToken}`);

    expect(resOpen.status).toBe(200);
    expect(Array.isArray(resOpen.body.data)).toBe(true);

    // Every ticket in the open view must NOT be RESOLVED, CLOSED, or CANCELLED
    const invalidStatuses = ["RESOLVED", "CLOSED", "CANCELLED"];
    for (const ticket of resOpen.body.data) {
      expect(invalidStatuses.includes(ticket.currentStatus)).toBe(false);
    }
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-REQ-10: My Tickets currentStatus=RESOLVED&resolvedWithinDays=30 semantics
  // ---------------------------------------------------------------------------
  it("TEST-DASH-REQ-10: Enforces 30-day semantics for resolvedWithinDays parameter (Issue #79)", async () => {
    // 1. Create a ticket resolved today (within 30 days window)
    const recentResolved = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-RESREC01",
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "LOW",
        summary: "[TEST-REQDASH] Resolved within 30 days",
        description: "Resolved recently",
        currentStatus: "RESOLVED",
        updatedAt: new Date(),
      },
    });

    // 2. Create a ticket resolved 35 days ago (outside 30 days window)
    const oldResolved = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-RESOLD01",
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "MEDIUM",
        summary: "[TEST-REQDASH] Resolved 35 days ago",
        description: "Resolved long ago",
        currentStatus: "RESOLVED",
        updatedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      },
    });

    // 3. Query with currentStatus=RESOLVED&resolvedWithinDays=30
    const resFiltered = await request(app)
      .get("/api/tickets/my-tickets?currentStatus=RESOLVED&resolvedWithinDays=30")
      .set("Cookie", `token=${requesterToken}`);

    expect(resFiltered.status).toBe(200);
    const ids = resFiltered.body.data.map((t: any) => t.id);
    expect(ids).toContain(recentResolved.id);
    expect(ids).not.toContain(oldResolved.id);

    // 4. Query with currentStatus=RESOLVED without resolvedWithinDays returns both
    const resAllResolved = await request(app)
      .get("/api/tickets/my-tickets?currentStatus=RESOLVED")
      .set("Cookie", `token=${requesterToken}`);

    expect(resAllResolved.status).toBe(200);
    const allIds = resAllResolved.body.data.map((t: any) => t.id);
    expect(allIds).toContain(recentResolved.id);
    expect(allIds).toContain(oldResolved.id);

    // 5. Query with invalid resolvedWithinDays values returns 400
    const resInvalidVal = await request(app)
      .get("/api/tickets/my-tickets?currentStatus=RESOLVED&resolvedWithinDays=15")
      .set("Cookie", `token=${requesterToken}`);
    expect(resInvalidVal.status).toBe(400);
    expect(resInvalidVal.body).toEqual({
      error: {
        code: "INVALID_QUERY_PARAMETER",
        message: "Invalid query parameter value.",
      },
    });

    // 6. Query with resolvedWithinDays=30 but currentStatus != RESOLVED returns 400
    const resWrongStatus = await request(app)
      .get("/api/tickets/my-tickets?currentStatus=open&resolvedWithinDays=30")
      .set("Cookie", `token=${requesterToken}`);
    expect(resWrongStatus.status).toBe(400);
    expect(resWrongStatus.body).toEqual({
      error: {
        code: "INVALID_QUERY_PARAMETER",
        message: "Invalid query parameter value.",
      },
    });

    // Clean up created tickets
    await prisma.ticket.deleteMany({
      where: { id: { in: [recentResolved.id, oldResolved.id] } },
    });
  });
});
