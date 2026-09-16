import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import { clearRevocationBlocklist, signToken } from "../../src/utils/jwt.js";

describe("Issue 4: Authorization Matrix & Resource Ownership Isolation API Tests", () => {
  const prisma = getPrisma();

  let aliceToken: string; // REQUESTER (Alice Smith - owns ticket TKT-2026-000002 & att-lab2-000002)
  let bobToken: string;   // REQUESTER (Bob Jones - owns ticket TKT-2026-000004)
  let staffToken: string; // IT_STAFF (John Staff)
  let adminToken: string; // ADMINISTRATOR (System Admin)

  beforeEach(async () => {
    clearRevocationBlocklist();
    await seedDatabase();

    await prisma.user.updateMany({
      where: {
        email: { in: ["alice@example.com", "bob@example.com", "john.staff@toktick.it", "admin@toktick.it"] },
      },
      data: { requiresPasswordChange: false },
    });

    const alice = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    const bob = await prisma.user.findUniqueOrThrow({ where: { email: "bob@example.com" } });
    const staff = await prisma.user.findUniqueOrThrow({ where: { email: "john.staff@toktick.it" } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@toktick.it" } });

    aliceToken = signToken({ userId: alice.id, email: alice.email, role: alice.role, requiresPasswordChange: false });
    bobToken = signToken({ userId: bob.id, email: bob.email, role: bob.role, requiresPasswordChange: false });
    staffToken = signToken({ userId: staff.id, email: staff.email, role: staff.role, requiresPasswordChange: false });
    adminToken = signToken({ userId: admin.id, email: admin.email, role: admin.role, requiresPasswordChange: false });
  });

  it("API-AUTH-07: Rejects unauthenticated requests with HTTP 401 Unauthorized", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  it("API-AUTH-08: Enforces server-side RBAC role authorization matrix (AC-11 / FR-05)", async () => {
    // 1. IT Staff attempting to create a ticket (REQUESTER role required) -> 403 Forbidden
    const resStaffCreate = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "LOW",
        summary: "Staff ticket creation attempt",
        description: "Testing RBAC restriction for non-requester user",
      });

    expect(resStaffCreate.status).toBe(403);
    expect(resStaffCreate.body.error).toBe("FORBIDDEN");

    // 2. Requester accessing ticket list -> 200 OK
    const resReqList = await request(app)
      .get("/api/tickets")
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(resReqList.status).toBe(200);
  });

  it("API-AUTH-09: Enforces Requester Ticket Resource Ownership Isolation on production routes (FR-06 / BR-03 / BR-15)", async () => {
    const ticket2 = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-2026-000002" } }); // Owned by Alice

    // 1. Alice (Owner) accesses Ticket 2 details -> 200 OK
    const resOwner = await request(app)
      .get(`/api/tickets/${ticket2.id}`)
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(resOwner.status).toBe(200);
    expect(resOwner.body.id).toBe(ticket2.id);

    // 2. Bob (Non-owner Requester) accesses Ticket 2 details -> 403 Forbidden
    const resNonOwner = await request(app)
      .get(`/api/tickets/${ticket2.id}`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(resNonOwner.status).toBe(403);
    expect(resNonOwner.body.error).toBe("FORBIDDEN");
    expect(resNonOwner.body.message).toContain("do not own this ticket");

    // 3. IT Staff accesses Ticket 2 details -> 200 OK (Bypasses requester ownership check)
    const resStaff = await request(app)
      .get(`/api/tickets/${ticket2.id}`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(resStaff.status).toBe(200);
  });

  it("API-AUTH-10: Enforces Requester Attachment Ownership Isolation on production routes (FR-06 / BR-03)", async () => {
    const attachment2 = await prisma.attachment.findUniqueOrThrow({ where: { id: "att-lab2-000002" } }); // Linked to TKT-2026-000002 (Alice's ticket)

    // 1. Bob (Non-owner Requester) attempts to download Alice's attachment -> 403 Forbidden
    const resNonOwnerDownload = await request(app)
      .get(`/api/attachments/${attachment2.id}/download`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(resNonOwnerDownload.status).toBe(403);
    expect(resNonOwnerDownload.body.error).toBe("FORBIDDEN");

    // 2. Bob (Non-owner Requester) attempts to delete Alice's attachment -> 403 Forbidden
    const resNonOwnerDelete = await request(app)
      .delete(`/api/attachments/${attachment2.id}`)
      .set("Authorization", `Bearer ${bobToken}`)
      .set("Content-Type", "application/json")
      .send({ removalReason: "Attempted unauthorized deletion" });
    expect(resNonOwnerDelete.status).toBe(403);
    expect(resNonOwnerDelete.body.error).toBe("FORBIDDEN");

    // 3. Alice (Owner) soft-removes attachment -> 200 OK
    const resOwnerDelete = await request(app)
      .delete(`/api/attachments/${attachment2.id}`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .set("Content-Type", "application/json")
      .send({ removalReason: "Authorized removal by ticket owner" });
    expect(resOwnerDelete.status).toBe(200);
    expect(resOwnerDelete.body.isRemoved).toBe(true);
  });

  it("API-AUTH-11: Returns 404 NOT_FOUND for non-existent ticket UUID", async () => {
    const nonExistentTicketId = "00000000-0000-0000-0000-000000000000";

    const res = await request(app)
      .get(`/api/tickets/${nonExistentTicketId}`)
      .set("Authorization", `Bearer ${aliceToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("NOT_FOUND");
  });

  it("API-AUTH-12: Returns 404 NOT_FOUND for non-existent attachment UUID", async () => {
    const nonExistentAttId = "00000000-0000-0000-0000-000000000000";

    const resDownload = await request(app)
      .get(`/api/attachments/${nonExistentAttId}/download`)
      .set("Authorization", `Bearer ${aliceToken}`);

    expect(resDownload.status).toBe(404);
    expect(resDownload.body.error).toBe("NOT_FOUND");

    const resDelete = await request(app)
      .delete(`/api/attachments/${nonExistentAttId}`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .set("Content-Type", "application/json")
      .send({ removalReason: "Deleting non-existent attachment" });

    expect(resDelete.status).toBe(404);
    expect(resDelete.body.error).toBe("NOT_FOUND");
  });
});
