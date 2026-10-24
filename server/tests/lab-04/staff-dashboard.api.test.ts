import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import { clearRevocationBlocklist, signToken } from "../../src/utils/jwt.js";
import { getBangkokDayBoundaries } from "../../src/utils/timezone.js";

describe("LAB4-07 / Staff Dashboard REST API Suite (staff-dashboard.api.test.ts)", () => {
  const prisma = getPrisma();

  let staffUser: any;
  let otherStaffUser: any;
  let adminUser: any;
  let requesterUser: any;

  let staffToken: string;
  let otherStaffToken: string;
  let adminToken: string;
  let requesterToken: string;

  let testCategory: any;
  let testSystem: any;

  beforeEach(async () => {
    clearRevocationBlocklist();
    await seedDatabase();

    staffUser = await prisma.user.findFirstOrThrow({ where: { email: "staff@toktick.it" } });
    adminUser = await prisma.user.findFirstOrThrow({ where: { email: "admin@toktick.it" } });
    requesterUser = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true } });

    // Find or create a second staff user for ownership-scoped testing
    otherStaffUser = await prisma.user.findFirst({
      where: { role: "IT_STAFF", id: { not: staffUser.id }, isActive: true },
    });
    if (!otherStaffUser) {
      otherStaffUser = await prisma.user.create({
        data: {
          name: "Second Staff Member",
          email: "staff2@toktick.it",
          passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
          role: "IT_STAFF",
          isActive: true,
          requiresPasswordChange: false,
        },
      });
    }

    await prisma.user.updateMany({
      where: {
        email: { in: [staffUser.email, otherStaffUser.email, adminUser.email, requesterUser.email] },
      },
      data: { requiresPasswordChange: false },
    });

    staffToken = signToken({ userId: staffUser.id, email: staffUser.email, role: staffUser.role, requiresPasswordChange: false });
    otherStaffToken = signToken({ userId: otherStaffUser.id, email: otherStaffUser.email, role: otherStaffUser.role, requiresPasswordChange: false });
    adminToken = signToken({ userId: adminUser.id, email: adminUser.email, role: adminUser.role, requiresPasswordChange: false });
    requesterToken = signToken({ userId: requesterUser.id, email: requesterUser.email, role: requesterUser.role, requiresPasswordChange: false });

    testCategory = await prisma.category.findFirstOrThrow();
    testSystem = await prisma.relatedSystem.findFirstOrThrow();
  });

  afterEach(async () => {
    await prisma.user.updateMany({
      data: { requiresPasswordChange: true },
    });
  });

  afterAll(async () => {
    await prisma.actionTaken.deleteMany({
      where: {
        description: { startsWith: "[TEST-DASH]" },
      },
    });
    await prisma.ticket.deleteMany({
      where: {
        summary: { startsWith: "[TEST-DASH]" },
      },
    });
    await prisma.user.deleteMany({
      where: { email: "zero_staff@toktick.it" },
    });
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-01: Accurate calculation of operational metrics & workload lists
  // ---------------------------------------------------------------------------
  it("TEST-DASH-01: Accurately calculates 4 operational metrics and recent lists for IT Staff (AC-06, BR-11, BR-12, BR-13)", async () => {
    const { startOfDay, startOfNextDay } = getBangkokDayBoundaries();

    // 1. Create an unassigned open ticket
    const unassignedTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-DASH01`,
        requesterId: requesterUser.id,
        ownerId: null,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "MEDIUM",
        summary: "[TEST-DASH] Unassigned open ticket",
        description: "Testing unassigned count metric",
        currentStatus: "NEW",
      },
    });

    // 2. Create an assigned open ticket for staffUser
    const assignedTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-DASH02`,
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "HIGH",
        itPriority: "URGENT",
        summary: "[TEST-DASH] Staff assigned urgent ticket",
        description: "Testing assigned count and urgent workload count",
        currentStatus: "IN_PROGRESS",
      },
    });

    // 3. Create an action recorded today by staffUser
    const todayAction = await prisma.actionTaken.create({
      data: {
        ticketId: assignedTicket.id,
        performedById: staffUser.id,
        description: "[TEST-DASH] Action performed today",
        result: "Action executed successfully today",
        status: "COMPLETED",
        createdAt: new Date(startOfDay.getTime() + 3600 * 1000), // Within today UTC+7
      },
    });

    // 4. Create an action recorded yesterday by staffUser (should NOT count in todayActionsCount)
    await prisma.actionTaken.create({
      data: {
        ticketId: assignedTicket.id,
        performedById: staffUser.id,
        description: "[TEST-DASH] Action performed yesterday",
        result: "Old action",
        status: "COMPLETED",
        createdAt: new Date(startOfDay.getTime() - 3600 * 1000), // Yesterday in UTC+7
      },
    });

    // Compute exact authoritative expected metrics directly from database
    const expectedUnassignedCount = await prisma.ticket.count({
      where: {
        ownerId: null,
        currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
      },
    });
    const expectedMyAssignedCount = await prisma.ticket.count({
      where: {
        ownerId: staffUser.id,
        currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
      },
    });
    const expectedTodayActionsCount = await prisma.actionTaken.count({
      where: {
        performedById: staffUser.id,
        createdAt: {
          gte: startOfDay,
          lt: startOfNextDay,
        },
      },
    });
    const expectedUrgentCount = await prisma.ticket.count({
      where: {
        itPriority: "URGENT",
        currentStatus: { in: ["NEW", "OPEN", "IN_PROGRESS"] },
      },
    });

    const res = await request(app)
      .get("/api/dashboards/staff")
      .set("Cookie", `token=${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body.metrics.unassignedCount).toBe(expectedUnassignedCount);
    expect(res.body.metrics.myAssignedCount).toBe(expectedMyAssignedCount);
    expect(res.body.metrics.todayActionsCount).toBe(expectedTodayActionsCount);
    expect(res.body.metrics.urgentWorkloadCount).toBe(expectedUrgentCount);

    // Verify recent tickets shape
    expect(Array.isArray(res.body.myRecentTickets)).toBe(true);
    expect(res.body.myRecentTickets.length).toBeLessThanOrEqual(5);
    const foundRecentTicket = res.body.myRecentTickets.find((t: any) => t.id === assignedTicket.id);
    expect(foundRecentTicket).toBeDefined();
    expect(foundRecentTicket.ticketNumber).toBe("TKT-2026-DASH02");
    expect(foundRecentTicket.currentStatus).toBe("IN_PROGRESS");
    expect(foundRecentTicket.itPriority).toBe("URGENT");
    expect(typeof foundRecentTicket.updatedAt).toBe("string");

    // Verify recent actions shape
    expect(Array.isArray(res.body.currentStaffActions)).toBe(true);
    expect(res.body.currentStaffActions.length).toBeLessThanOrEqual(5);
    const foundAction = res.body.currentStaffActions.find((a: any) => a.id === todayAction.id);
    expect(foundAction).toBeDefined();
    expect(foundAction.ticketNumber).toBe("TKT-2026-DASH02");
    expect(foundAction.description).toBe("[TEST-DASH] Action performed today");
    expect(foundAction.result).toBe("Action executed successfully today");
    expect(typeof foundAction.createdAt).toBe("string");
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-04: Zero-count metrics and empty lists
  // ---------------------------------------------------------------------------
  it("TEST-DASH-04: Returns zero-count metrics and empty arrays for staff member with no workload (AC-15, BR-14, FR-08)", async () => {
    // Create a brand new active IT Staff user with no assigned tickets or actions
    const zeroStaff = await prisma.user.create({
      data: {
        name: "Zero Workload Staff",
        email: "zero_staff@toktick.it",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
        role: "IT_STAFF",
        isActive: true,
        requiresPasswordChange: false,
      },
    });

    const zeroStaffToken = signToken({
      userId: zeroStaff.id,
      email: zeroStaff.email,
      role: zeroStaff.role,
      requiresPasswordChange: false,
    });

    const res = await request(app)
      .get("/api/dashboards/staff")
      .set("Cookie", `token=${zeroStaffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics.myAssignedCount).toBe(0);
    expect(res.body.metrics.todayActionsCount).toBe(0);
    expect(res.body.myRecentTickets).toEqual([]);
    expect(res.body.currentStaffActions).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-05: Server-side aggregate calculation without raw collection leakage
  // ---------------------------------------------------------------------------
  it("TEST-DASH-05: Provides aggregate counts without leaking full raw ticket datasets (BR-11)", async () => {
    const res = await request(app)
      .get("/api/dashboards/staff")
      .set("Cookie", `token=${staffToken}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.metrics.unassignedCount).toBe("number");
    expect(typeof res.body.metrics.myAssignedCount).toBe("number");
    expect(typeof res.body.metrics.todayActionsCount).toBe("number");
    expect(typeof res.body.metrics.urgentWorkloadCount).toBe("number");

    // Must NOT contain full collections of all unassigned or all tickets
    expect(res.body).not.toHaveProperty("allTickets");
    expect(res.body).not.toHaveProperty("unassignedTickets");
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-06: Ownership-scoped filtering strictly by authenticated user ID
  // ---------------------------------------------------------------------------
  it("TEST-DASH-06: Ownership-scoped metrics strictly filter by authenticated user ID (BR-13)", async () => {
    const { startOfDay, startOfNextDay } = getBangkokDayBoundaries();

    // Create a ticket assigned to otherStaffUser
    const otherTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-DASH06`,
        requesterId: requesterUser.id,
        ownerId: otherStaffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "MEDIUM",
        summary: "[TEST-DASH] Ticket assigned to second staff",
        description: "Isolation test",
        currentStatus: "OPEN",
      },
    });

    // Create an action performed by otherStaffUser
    await prisma.actionTaken.create({
      data: {
        ticketId: otherTicket.id,
        performedById: otherStaffUser.id,
        description: "[TEST-DASH] Action by second staff",
        result: "Isolation test action",
        status: "COMPLETED",
        createdAt: new Date(startOfDay.getTime() + 2000 * 1000),
      },
    });

    const resStaff1 = await request(app)
      .get("/api/dashboards/staff")
      .set("Cookie", `token=${staffToken}`);

    const resStaff2 = await request(app)
      .get("/api/dashboards/staff")
      .set("Cookie", `token=${otherStaffToken}`);

    // Verify staffUser does NOT see otherStaffUser's ticket in myRecentTickets
    const staff1HasOtherTicket = resStaff1.body.myRecentTickets.some((t: any) => t.id === otherTicket.id);
    expect(staff1HasOtherTicket).toBe(false);

    // Verify otherStaffUser DOES see otherTicket in myRecentTickets
    const staff2HasOtherTicket = resStaff2.body.myRecentTickets.some((t: any) => t.id === otherTicket.id);
    expect(staff2HasOtherTicket).toBe(true);

    // Verify actions isolation
    const staff1HasOtherAction = resStaff1.body.currentStaffActions.some((a: any) => a.description === "[TEST-DASH] Action by second staff");
    expect(staff1HasOtherAction).toBe(false);

    const staff2HasOtherAction = resStaff2.body.currentStaffActions.some((a: any) => a.description === "[TEST-DASH] Action by second staff");
    expect(staff2HasOtherAction).toBe(true);

    // Verify ownership-scoped metric counts for Staff A vs Staff B (BR-13)
    const staff1Assigned = await prisma.ticket.count({
      where: { ownerId: staffUser.id, currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] } },
    });
    const staff2Assigned = await prisma.ticket.count({
      where: { ownerId: otherStaffUser.id, currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] } },
    });
    expect(resStaff1.body.metrics.myAssignedCount).toBe(staff1Assigned);
    expect(resStaff2.body.metrics.myAssignedCount).toBe(staff2Assigned);

    const staff1TodayActions = await prisma.actionTaken.count({
      where: { performedById: staffUser.id, createdAt: { gte: startOfDay, lt: startOfNextDay } },
    });
    const staff2TodayActions = await prisma.actionTaken.count({
      where: { performedById: otherStaffUser.id, createdAt: { gte: startOfDay, lt: startOfNextDay } },
    });
    expect(resStaff1.body.metrics.todayActionsCount).toBe(staff1TodayActions);
    expect(resStaff2.body.metrics.todayActionsCount).toBe(staff2TodayActions);
  });

  // ---------------------------------------------------------------------------
  // TEST-SEC-05: Rejects Requester role with 403 Forbidden
  // ---------------------------------------------------------------------------
  it("TEST-SEC-05: Rejects Requester role with 403 Forbidden (AC-06, BR-06, Matrix §6)", async () => {
    const res = await request(app)
      .get("/api/dashboards/staff")
      .set("Cookie", `token=${requesterToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("FORBIDDEN");
  });

  // ---------------------------------------------------------------------------
  // TEST-SEC-06: Rejects unauthenticated request with 401 Unauthorized
  // ---------------------------------------------------------------------------
  it("TEST-SEC-06: Rejects unauthenticated request with 401 Unauthorized", async () => {
    const res = await request(app).get("/api/dashboards/staff");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-07: Allows Administrator role
  // ---------------------------------------------------------------------------
  it("TEST-DASH-07: Allows Administrator role to access Staff Dashboard (Matrix §6)", async () => {
    const res = await request(app)
      .get("/api/dashboards/staff")
      .set("Cookie", `token=${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("myRecentTickets");
    expect(res.body).toHaveProperty("currentStaffActions");
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-08: Queue drill-down supports view=today_actions
  // ---------------------------------------------------------------------------
  it("TEST-DASH-08: Queue drill-down endpoint supports view=today_actions (AC-08, BR-15, api-spec §3.1)", async () => {
    const { startOfDay } = getBangkokDayBoundaries();

    // Create a ticket with an action performed by staffUser today
    const drilldownTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-DASH08`,
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "MEDIUM",
        summary: "[TEST-DASH] Drilldown today actions ticket",
        description: "Testing queue view=today_actions filter",
        currentStatus: "IN_PROGRESS",
      },
    });

    await prisma.actionTaken.create({
      data: {
        ticketId: drilldownTicket.id,
        performedById: staffUser.id,
        description: "[TEST-DASH] Action for queue drilldown",
        result: "Success",
        status: "COMPLETED",
        createdAt: new Date(startOfDay.getTime() + 1800 * 1000),
      },
    });

    // Query queue with view=today_actions
    const res = await request(app)
      .get("/api/tickets?view=today_actions")
      .set("Cookie", `token=${staffToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const foundTicket = res.body.data.find((t: any) => t.id === drilldownTicket.id);
    expect(foundTicket).toBeDefined();

    // Query with invalid view filter returns 400
    const resInvalid = await request(app)
      .get("/api/tickets?view=invalid_view")
      .set("Cookie", `token=${staffToken}`);

    expect(resInvalid.status).toBe(400);
    expect(resInvalid.body.error.code).toBe("INVALID_QUERY_PARAMETER");
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-09: Boundary testing for Urgent Workload count
  // ---------------------------------------------------------------------------
  it("TEST-DASH-09: Urgent Workload does not count URGENT tickets in WAITING_FOR_REQUESTER, RESOLVED, CLOSED, or CANCELLED", async () => {
    const initialRes = await request(app)
      .get("/api/dashboards/staff")
      .set("Cookie", `token=${staffToken}`);
    const initialUrgent = initialRes.body.metrics.urgentWorkloadCount;

    const statuses = ["WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "CANCELLED"] as const;
    for (let i = 0; i < statuses.length; i++) {
      await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-URG-BND-${i}-${Date.now() % 100000}`,
          requesterId: requesterUser.id,
          ownerId: staffUser.id,
          categoryId: testCategory.id,
          relatedSystemId: testSystem.id,
          requestedPriority: "URGENT",
          itPriority: "URGENT",
          summary: `[TEST-DASH] Non-counted urgent ticket in ${statuses[i]}`,
          description: "Boundary test for urgent workload count",
          currentStatus: statuses[i],
        },
      });
    }

    const afterRes = await request(app)
      .get("/api/dashboards/staff")
      .set("Cookie", `token=${staffToken}`);

    expect(afterRes.body.metrics.urgentWorkloadCount).toBe(initialUrgent);
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-10: Ordering and deterministic tie-breaker testing
  // ---------------------------------------------------------------------------
  it("TEST-DASH-10: Orders recent tickets by updatedAt DESC, id ASC and actions by createdAt DESC, id ASC", async () => {
    const futureTime = new Date(Date.now() + 100000);

    const tktOlder = await prisma.ticket.create({
      data: {
        id: "11111111-1111-4111-a111-111111111111",
        ticketNumber: "TKT-2026-ORD-01",
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "LOW",
        summary: "[TEST-DASH] Older ticket",
        description: "Ordering test",
        currentStatus: "OPEN",
        updatedAt: new Date(futureTime.getTime() - 10000),
      },
    });

    const tktSameTimeB = await prisma.ticket.create({
      data: {
        id: "22222222-2222-4222-a222-222222222223",
        ticketNumber: "TKT-2026-ORD-03",
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "LOW",
        summary: "[TEST-DASH] Same time ticket B",
        description: "Ordering test",
        currentStatus: "OPEN",
        updatedAt: futureTime,
      },
    });

    const tktSameTimeA = await prisma.ticket.create({
      data: {
        id: "22222222-2222-4222-a222-222222222222",
        ticketNumber: "TKT-2026-ORD-02",
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "LOW",
        summary: "[TEST-DASH] Same time ticket A",
        description: "Ordering test",
        currentStatus: "OPEN",
        updatedAt: futureTime,
      },
    });

    // Create actions with identical and differing createdAt
    const actOlder = await prisma.actionTaken.create({
      data: {
        id: "33333333-3333-4333-a333-333333333331",
        ticketId: tktSameTimeA.id,
        performedById: staffUser.id,
        description: "[TEST-DASH] Older action",
        result: "Older action result",
        status: "COMPLETED",
        createdAt: new Date(futureTime.getTime() - 10000),
      },
    });

    const actSameTimeB = await prisma.actionTaken.create({
      data: {
        id: "44444444-4444-4444-a444-444444444443",
        ticketId: tktSameTimeA.id,
        performedById: staffUser.id,
        description: "[TEST-DASH] Same time action B",
        result: "Action B result",
        status: "COMPLETED",
        createdAt: futureTime,
      },
    });

    const actSameTimeA = await prisma.actionTaken.create({
      data: {
        id: "44444444-4444-4444-a444-444444444442",
        ticketId: tktSameTimeA.id,
        performedById: staffUser.id,
        description: "[TEST-DASH] Same time action A",
        result: "Action A result",
        status: "COMPLETED",
        createdAt: futureTime,
      },
    });

    const res = await request(app)
      .get("/api/dashboards/staff")
      .set("Cookie", `token=${staffToken}`);

    expect(res.status).toBe(200);

    // 1. Tickets ordering
    const tickets = res.body.myRecentTickets;
    const idxA = tickets.findIndex((t: any) => t.id === tktSameTimeA.id);
    const idxB = tickets.findIndex((t: any) => t.id === tktSameTimeB.id);
    const idxOlder = tickets.findIndex((t: any) => t.id === tktOlder.id);

    expect(idxA).toBeGreaterThanOrEqual(0);
    expect(idxB).toBeGreaterThanOrEqual(0);
    expect(idxOlder).toBeGreaterThanOrEqual(0);

    // Both newer same-time tickets appear before older ticket
    expect(idxA).toBeLessThan(idxOlder);
    expect(idxB).toBeLessThan(idxOlder);

    // Deterministic tie-breaker: id ASC ('...2222' before '...2223')
    expect(idxA).toBeLessThan(idxB);

    // 2. Actions ordering
    const actions = res.body.currentStaffActions;
    const actIdxA = actions.findIndex((a: any) => a.id === actSameTimeA.id);
    const actIdxB = actions.findIndex((a: any) => a.id === actSameTimeB.id);
    const actIdxOlder = actions.findIndex((a: any) => a.id === actOlder.id);

    expect(actIdxA).toBeGreaterThanOrEqual(0);
    expect(actIdxB).toBeGreaterThanOrEqual(0);
    expect(actIdxOlder).toBeGreaterThanOrEqual(0);

    expect(actIdxA).toBeLessThan(actIdxOlder);
    expect(actIdxB).toBeLessThan(actIdxOlder);

    // Tie-breaker: id ASC ('...4442' before '...4443')
    expect(actIdxA).toBeLessThan(actIdxB);
  });

  // ---------------------------------------------------------------------------
  // TEST-DASH-11: Returns 500 INTERNAL_ERROR on unhandled database failure
  // ---------------------------------------------------------------------------
  it("TEST-DASH-11: Returns 500 INTERNAL_ERROR on unhandled database failure (api-spec §1)", async () => {
    const countSpy = vi.spyOn(prisma.ticket, "count").mockRejectedValueOnce(new Error("Database disconnected"));

    const res = await request(app)
      .get("/api/dashboards/staff")
      .set("Cookie", `token=${staffToken}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again.",
      },
    });

    countSpy.mockRestore();
  });
});
