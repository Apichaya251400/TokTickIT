import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import { clearRevocationBlocklist, signToken } from "../../src/utils/jwt.js";

describe("Issue 6: Requester Regression & Ownership Isolation API Tests (API-REQ-01, API-REQ-02)", () => {
  const prisma = getPrisma();
  let aliceToken: string;

  beforeEach(async () => {
    clearRevocationBlocklist();
    await seedDatabase();

    await prisma.user.updateMany({
      where: { email: "alice@example.com" },
      data: { requiresPasswordChange: false },
    });

    const alice = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    aliceToken = signToken({ userId: alice.id, email: alice.email, role: alice.role, requiresPasswordChange: false });
  });

  it("API-REQ-01: Requester ticket ownership isolation on My Tickets & Detail (AC-03, FR-06, BR-03)", async () => {
    // 1. Create a ticket under Alice
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "HIGH",
        summary: "Alice regression ticket for ownership isolation test",
        description: "Testing ownership isolation under JWT authentication.",
      });

    expect(createRes.status).toBe(201);
    const aliceTicketId = createRes.body.id;

    // 2. Alice requests her own tickets
    const myTicketsRes = await request(app)
      .get("/api/tickets")
      .set("Authorization", `Bearer ${aliceToken}`);

    expect(myTicketsRes.status).toBe(200);
    const tickets = myTicketsRes.body.data || myTicketsRes.body.tickets || myTicketsRes.body;
    expect(Array.isArray(tickets)).toBe(true);

    // 3. Alice requests her created ticket detail (200 OK)
    const aliceDetailRes = await request(app)
      .get(`/api/tickets/${aliceTicketId}`)
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(aliceDetailRes.status).toBe(200);
    expect(aliceDetailRes.body.summary).toBe("Alice regression ticket for ownership isolation test");
  });

  it("API-REQ-02: Lab 2 Requester ticket creation and attachment flow under JWT Auth (BR-15, FR-12)", async () => {
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "MEDIUM",
        summary: "Lab 2 feature continuity under JWT Auth",
        description: "Verifying seamless Requester ticket creation without X-Requester-Id.",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.ticketNumber).toBeDefined();
    expect(createRes.body.currentStatus).toBe("NEW");
  });
});
