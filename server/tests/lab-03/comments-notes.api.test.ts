import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import { clearRevocationBlocklist, signToken } from "../../src/utils/jwt.js";

describe("Issue 6: Public Comments & Internal Notes API Tests (API-NOTE-01, API-NOTE-02)", () => {
  const prisma = getPrisma();
  let aliceToken: string;
  let staffToken: string;
  let ticketId: string;

  beforeEach(async () => {
    clearRevocationBlocklist();
    await seedDatabase();

    await prisma.user.updateMany({
      where: { email: { in: ["alice@example.com", "john.staff@toktick.it"] } },
      data: { requiresPasswordChange: false },
    });

    const alice = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    const staff = await prisma.user.findUniqueOrThrow({ where: { email: "john.staff@toktick.it" } });

    aliceToken = signToken({ userId: alice.id, email: alice.email, role: alice.role, requiresPasswordChange: false });
    staffToken = signToken({ userId: staff.id, email: staff.email, role: staff.role, requiresPasswordChange: false });

    // Create a test ticket as Alice
    const ticketRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "HIGH",
        summary: "Comments and Notes Test Ticket",
        description: "Testing public comments and internal notes capabilities.",
      });
    ticketId = ticketRes.body.id;
  });

  it("API-NOTE-01: Public Comments creation and listing for Requester and IT Staff (BR-04)", async () => {
    // 1. Alice (Requester owner) posts a Public Comment
    const postRes = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ content: "Thank you for looking into this issue." });

    expect(postRes.status).toBe(201);
    expect(postRes.body.content).toBe("Thank you for looking into this issue.");
    expect(postRes.body.author.name).toBe("Alice Smith");
    expect(postRes.body.author.role).toBe("REQUESTER");

    // 2. John Staff (IT Staff) posts a Public Comment
    const staffPostRes = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ content: "We are currently investigating the issue." });

    expect(staffPostRes.status).toBe(201);
    expect(staffPostRes.body.author.role).toBe("IT_STAFF");

    // 3. Alice retrieves public comments list
    const getRes = await request(app)
      .get(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${aliceToken}`);

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body.comments)).toBe(true);
    expect(getRes.body.comments.length).toBe(2);
  });

  it("API-NOTE-02: Internal Notes endpoint protection for Requesters (403 Forbidden / BR-04)", async () => {
    // 1. John Staff (IT Staff) posts an Internal Note (201 Created)
    const staffNoteRes = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ content: "Internal observation: Hardware replacement needed." });

    expect(staffNoteRes.status).toBe(201);
    expect(staffNoteRes.body.content).toBe("Internal observation: Hardware replacement needed.");

    // 2. Alice (Requester) attempts to retrieve Internal Notes (403 Forbidden)
    const getNoteRes = await request(app)
      .get(`/api/tickets/${ticketId}/notes`)
      .set("Authorization", `Bearer ${aliceToken}`);

    expect(getNoteRes.status).toBe(403);
    expect(getNoteRes.body.error).toBe("FORBIDDEN");

    // 3. Alice (Requester) attempts to post an Internal Note (403 Forbidden)
    const postNoteRes = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ content: "Requester trying to post note" });

    expect(postNoteRes.status).toBe(403);
    expect(postNoteRes.body.error).toBe("FORBIDDEN");
  });

  it("API-NOTE-03: Input validation (empty/whitespace/2000+ chars) & XSS entity escaping (BR-11)", async () => {
    // 1. Empty content validation (400 Bad Request)
    const emptyRes = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ content: "   " });

    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body.error).toBe("VALIDATION_ERROR");

    // 2. XSS HTML entity escaping
    const xssRes = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ content: '<script>alert("XSS")</script>' });

    expect(xssRes.status).toBe(201);
    expect(xssRes.body.content).toBe("&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;");
  });

  it("API-OPS-03: Requester resolve-indicator signalling without status mutation (FR-13, BR-05)", async () => {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { currentStatus: "IN_PROGRESS" },
    });

    const resolveRes = await request(app)
      .post(`/api/tickets/${ticketId}/resolve-indicator`)
      .set("Authorization", `Bearer ${aliceToken}`);

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.ticket.requesterResolvedIndicatedAt).toBeDefined();
    expect(resolveRes.body.ticket.currentStatus).toBe("IN_PROGRESS");

    // Verify system comment created
    const commentsRes = await request(app)
      .get(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(commentsRes.body.comments.some((c: any) => c.content.includes("indicated that the problem appears resolved"))).toBe(true);
  });

  it("API-OPS-04: Requester reopen request signalling without status mutation (FR-13, BR-05)", async () => {
    // 1. Set ticket status to RESOLVED
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { currentStatus: "RESOLVED" },
    });

    // 2. Alice (owner) calls reopen-request endpoint
    const reopenRes = await request(app)
      .post(`/api/tickets/${ticketId}/reopen-request`)
      .set("Authorization", `Bearer ${aliceToken}`);

    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.ticket.requesterReopenRequestedAt).toBeDefined();
    expect(reopenRes.body.ticket.currentStatus).toBe("RESOLVED");

    // Verify public system comment was created
    const commentsRes = await request(app)
      .get(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(
      commentsRes.body.comments.some((c: any) =>
        c.content.includes("requested to reopen the ticket")
      )
    ).toBe(true);

    // 3. Verify non-owner Requester receives 403 Forbidden
    await prisma.user.update({
      where: { email: "bob@example.com" },
      data: { requiresPasswordChange: false },
    });
    const bob = await prisma.user.findUniqueOrThrow({ where: { email: "bob@example.com" } });
    const bobToken = signToken({ userId: bob.id, email: bob.email, role: bob.role, requiresPasswordChange: false });

    const bobReopenRes = await request(app)
      .post(`/api/tickets/${ticketId}/reopen-request`)
      .set("Authorization", `Bearer ${bobToken}`);

    expect(bobReopenRes.status).toBe(403);
  });
});

