import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import { clearRevocationBlocklist, signToken } from "../../src/utils/jwt.js";
import { authenticateToken, requireAttachmentOwnership, requireRole, requireTicketOwnership } from "../../src/middleware/auth.js";

const DEFAULT_INITIAL_PASSWORD = "InitialPassword123!";

describe("Issue 4: Authorization Matrix & Resource Ownership Isolation API Tests", () => {
  const prisma = getPrisma();

  let aliceToken: string; // REQUESTER (Alice Smith - owns ticket TKT-2026-000002)
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
    // Protected route without token
    app.get("/api/test-protected-rbac", authenticateToken, (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/api/test-protected-rbac");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  it("API-AUTH-08: Enforces server-side RBAC role authorization matrix (AC-11 / FR-05)", async () => {
    // Set up test routes for staff queue and admin users
    app.get("/api/staff/queue-test", authenticateToken, requireRole("IT_STAFF"), (_req, res) => res.json({ ok: true }));
    app.get("/api/admin/users-test", authenticateToken, requireRole("ADMINISTRATOR"), (_req, res) => res.json({ ok: true }));

    // 1. Requester accessing IT Staff queue -> 403 Forbidden
    const resReqStaff = await request(app)
      .get("/api/staff/queue-test")
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(resReqStaff.status).toBe(403);
    expect(resReqStaff.body.error).toBe("FORBIDDEN");

    // 2. Requester accessing Admin User Management -> 403 Forbidden (AC-11)
    const resReqAdmin = await request(app)
      .get("/api/admin/users-test")
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(resReqAdmin.status).toBe(403);
    expect(resReqAdmin.body.error).toBe("FORBIDDEN");

    // 3. IT Staff accessing Admin User Management -> 403 Forbidden
    const resStaffAdmin = await request(app)
      .get("/api/admin/users-test")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(resStaffAdmin.status).toBe(403);
    expect(resStaffAdmin.body.error).toBe("FORBIDDEN");

    // 4. Admin accessing Admin User Management -> 200 OK
    const resAdminOk = await request(app)
      .get("/api/admin/users-test")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(resAdminOk.status).toBe(200);

    // 5. IT Staff accessing Staff Queue -> 200 OK
    const resStaffOk = await request(app)
      .get("/api/staff/queue-test")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(resStaffOk.status).toBe(200);
  });

  it("API-AUTH-09: Enforces Requester Ticket Resource Ownership Isolation (FR-06 / BR-03 / BR-15)", async () => {
    app.get(
      "/api/tickets/:id/ownership-test",
      authenticateToken,
      requireTicketOwnership,
      (_req, res) => res.json({ ok: true })
    );

    const ticket2 = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-2026-000002" } }); // Owned by Alice

    // 1. Alice (Owner) accesses Ticket 2 -> 200 OK
    const resOwner = await request(app)
      .get(`/api/tickets/${ticket2.id}/ownership-test`)
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(resOwner.status).toBe(200);

    // 2. Bob (Non-owner Requester) accesses Ticket 2 -> 403 Forbidden
    const resNonOwner = await request(app)
      .get(`/api/tickets/${ticket2.id}/ownership-test`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(resNonOwner.status).toBe(403);
    expect(resNonOwner.body.error).toBe("FORBIDDEN");
    expect(resNonOwner.body.message).toContain("do not own this ticket");

    // 3. IT Staff accesses Ticket 2 -> 200 OK (Bypasses requester ownership check)
    const resStaff = await request(app)
      .get(`/api/tickets/${ticket2.id}/ownership-test`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(resStaff.status).toBe(200);
  });

  it("API-AUTH-10: Enforces Requester Attachment Ownership Isolation (FR-06 / BR-03)", async () => {
    app.get(
      "/api/attachments/:id/ownership-test",
      authenticateToken,
      requireAttachmentOwnership,
      (_req, res) => res.json({ ok: true })
    );

    const attachment2 = await prisma.attachment.findUniqueOrThrow({ where: { id: "att-lab2-000002" } }); // Linked to TKT-2026-000002 (Alice's ticket)

    // 1. Alice (Owner) accesses Attachment 2 -> 200 OK
    const resOwner = await request(app)
      .get(`/api/attachments/${attachment2.id}/ownership-test`)
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(resOwner.status).toBe(200);

    // 2. Bob (Non-owner Requester) accesses Attachment 2 -> 403 Forbidden
    const resNonOwner = await request(app)
      .get(`/api/attachments/${attachment2.id}/ownership-test`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(resNonOwner.status).toBe(403);
    expect(resNonOwner.body.error).toBe("FORBIDDEN");
    expect(resNonOwner.body.message).toContain("do not own this attachment");

    // 3. Admin accesses Attachment 2 -> 200 OK (Bypasses requester ownership check)
    const resAdmin = await request(app)
      .get(`/api/attachments/${attachment2.id}/ownership-test`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(resAdmin.status).toBe(200);
  });
});
