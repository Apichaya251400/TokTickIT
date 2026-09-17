import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import { clearRevocationBlocklist, signToken } from "../../src/utils/jwt.js";

describe("Issue 9: Administrator User Management & Safety Guards API Suite (users-admin.api.test.ts)", () => {
  const prisma = getPrisma();
  let adminToken: string;
  let secondAdminToken: string;
  let staffToken: string;
  let requesterToken: string;
  let adminUserId: number;
  let secondAdminUserId: number;
  let staffUserId: number;
  let requesterUserId: number;

  beforeEach(async () => {
    clearRevocationBlocklist();
    await seedDatabase();

    await prisma.user.updateMany({
      where: {
        email: {
          in: ["admin@toktick.it", "admin2@toktick.it", "john.staff@toktick.it", "alice@example.com"],
        },
      },
      data: { requiresPasswordChange: false },
    });

    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@toktick.it" } });
    const admin2 = await prisma.user.findUniqueOrThrow({ where: { email: "admin2@toktick.it" } });
    const staff = await prisma.user.findUniqueOrThrow({ where: { email: "john.staff@toktick.it" } });
    const requester = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });

    adminUserId = admin.id;
    secondAdminUserId = admin2.id;
    staffUserId = staff.id;
    requesterUserId = requester.id;

    adminToken = signToken({ userId: admin.id, email: admin.email, role: admin.role, requiresPasswordChange: false });
    secondAdminToken = signToken({ userId: admin2.id, email: admin2.email, role: admin2.role, requiresPasswordChange: false });
    staffToken = signToken({ userId: staff.id, email: staff.email, role: staff.role, requiresPasswordChange: false });
    requesterToken = signToken({ userId: requester.id, email: requester.email, role: requester.role, requiresPasswordChange: false });
  });

  describe("Authorization & Access Control", () => {
    it("allows Administrator to access GET /api/admin/users", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it("denies Requester access to /api/admin/users (403 Forbidden)", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("denies IT Staff access to /api/admin/users (403 Forbidden)", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("denies Unauthenticated access to /api/admin/users (401 Unauthorized)", async () => {
      const res = await request(app).get("/api/admin/users");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });
  });

  describe("GET /api/admin/users (User Listing, Search, Filter & Safe DTO)", () => {
    it("returns safe user fields only, omitting passwordHash and internal credentials", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThan(0);

      for (const u of res.body.users) {
        expect(u.id).toBeDefined();
        expect(u.name).toBeDefined();
        expect(u.email).toBeDefined();
        expect(u.role).toBeDefined();
        expect(u.isActive).toBeDefined();
        expect(u.requiresPasswordChange).toBeDefined();
        expect(u.createdAt).toBeDefined();
        expect((u as any).passwordHash).toBeUndefined();
      }
    });

    it("filters users by search query parameter q (matching name or email)", async () => {
      const res = await request(app)
        .get("/api/admin/users?q=alice")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThan(0);
      expect(res.body.users.every((u: any) => u.name.toLowerCase().includes("alice") || u.email.toLowerCase().includes("alice"))).toBe(true);
    });

    it("filters users by role query parameter (REQUESTER, IT_STAFF, ADMINISTRATOR)", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=IT_STAFF")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThan(0);
      expect(res.body.users.every((u: any) => u.role === "IT_STAFF")).toBe(true);
    });

    it("rejects invalid role query parameter with 400 Bad Request", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=SUPER_HERO")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("INVALID_QUERY_PARAMETER");
    });
  });

  describe("POST /api/admin/users (Create User)", () => {
    it("allows Administrator to create user with single permitted role, hashing password and setting requiresPasswordChange = true", async () => {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const email = `new.staff.${randomId}@toktick.it`;

      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "New Staff User",
          email,
          role: "IT_STAFF",
          isActive: true,
          initialPassword: "InitialPassword123!",
        });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.role).toBe("IT_STAFF");
      expect(res.body.user.requiresPasswordChange).toBe(true);
      expect((res.body.user as any).passwordHash).toBeUndefined();

      const dbUser = await prisma.user.findUnique({ where: { email } });
      expect(dbUser).toBeDefined();
      expect(dbUser?.requiresPasswordChange).toBe(true);
      expect(dbUser?.passwordHash).not.toBe("InitialPassword123!");
    });

    it("rejects user creation with missing or invalid fields (400 Bad Request)", async () => {
      const invalidName = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "", email: "valid@toktick.it", role: "IT_STAFF", initialPassword: "Password123!" });
      expect(invalidName.status).toBe(400);

      const invalidEmail = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Valid Name", email: "not-an-email", role: "IT_STAFF", initialPassword: "Password123!" });
      expect(invalidEmail.status).toBe(400);

      const invalidRole = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Valid Name", email: "valid@toktick.it", role: "INVALID_ROLE", initialPassword: "Password123!" });
      expect(invalidRole.status).toBe(400);

      const shortPassword = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Valid Name", email: "valid@toktick.it", role: "IT_STAFF", initialPassword: "short" });
      expect(shortPassword.status).toBe(400);
    });

    it("rejects user creation with duplicate email address (409 Conflict DUPLICATE_EMAIL)", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Duplicate User",
          email: "alice@example.com",
          role: "REQUESTER",
          isActive: true,
          initialPassword: "InitialPassword123!",
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("DUPLICATE_EMAIL");
    });
  });

  describe("PUT /api/admin/users/:id (Edit User Details & Safety Guards)", () => {
    it("allows Administrator to update user details (name, email, role, active status)", async () => {
      const res = await request(app)
        .put(`/api/admin/users/${staffUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "John Staff Updated",
          email: "john.staff@toktick.it",
          role: "IT_STAFF",
          isActive: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe("John Staff Updated");

      const dbUser = await prisma.user.findUnique({ where: { id: staffUserId } });
      expect(dbUser?.name).toBe("John Staff Updated");
    });

    it("rejects user editing with invalid parameters (400 Bad Request)", async () => {
      const res = await request(app)
        .put(`/api/admin/users/${staffUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "",
          email: "invalid-email",
          role: "BAD_ROLE",
          isActive: "not-a-boolean",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("rejects email edit to an already existing user email (409 Conflict DUPLICATE_EMAIL)", async () => {
      const res = await request(app)
        .put(`/api/admin/users/${staffUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "John Staff",
          email: "alice@example.com",
          role: "IT_STAFF",
          isActive: true,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("DUPLICATE_EMAIL");
    });

    it("prevents Administrator from deactivating their own account (400 Bad Request INVALID_ADMIN_ACTION)", async () => {
      const res = await request(app)
        .put(`/api/admin/users/${adminUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "System Admin",
          email: "admin@toktick.it",
          role: "ADMINISTRATOR",
          isActive: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("INVALID_ADMIN_ACTION");

      const dbAdmin = await prisma.user.findUnique({ where: { id: adminUserId } });
      expect(dbAdmin?.isActive).toBe(true);
    });

    it("prevents deactivating or demoting the last active Administrator (400 Bad Request INVALID_ADMIN_ACTION)", async () => {
      // Deactivate secondary admin so only 1 active admin remains
      await prisma.user.update({
        where: { id: secondAdminUserId },
        data: { isActive: false },
      });

      // Attempt to demote the sole active admin
      const demoteRes = await request(app)
        .put(`/api/admin/users/${adminUserId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "System Admin",
          email: "admin@toktick.it",
          role: "IT_STAFF",
          isActive: true,
        });

      expect(demoteRes.status).toBe(400);
      expect(demoteRes.error.text || demoteRes.body.error).toContain("INVALID_ADMIN_ACTION");

      const dbAdmin = await prisma.user.findUnique({ where: { id: adminUserId } });
      expect(dbAdmin?.role).toBe("ADMINISTRATOR");
      expect(dbAdmin?.isActive).toBe(true);
    });

    it("handles concurrent demotion/deactivation requests safely so active Administrator count never drops to 0", async () => {
      // Set DB so exactly 1 active admin remains (adminUserId)
      await prisma.user.update({
        where: { id: secondAdminUserId },
        data: { isActive: false },
      });

      // Issue concurrent attempts to deactivate and demote the sole remaining active admin
      const [res1, res2] = await Promise.all([
        request(app)
          .put(`/api/admin/users/${adminUserId}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ name: "System Admin", email: "admin@toktick.it", role: "ADMINISTRATOR", isActive: false }),
        request(app)
          .put(`/api/admin/users/${adminUserId}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ name: "System Admin", email: "admin@toktick.it", role: "REQUESTER", isActive: true }),
      ]);

      expect(res1.status).toBe(400);
      expect(res2.status).toBe(400);

      const dbAdmin = await prisma.user.findUnique({ where: { id: adminUserId } });
      expect(dbAdmin?.role).toBe("ADMINISTRATOR");
      expect(dbAdmin?.isActive).toBe(true);
    });
  });

  describe("POST /api/admin/users/:id/password (Reset Initial Password & Password Change Behavior)", () => {
    it("allows Administrator to reset initial password, hashing password and setting requiresPasswordChange = true", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${requesterUserId}/password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ initialPassword: "NewInitialPass123!" });

      expect(res.status).toBe(200);
      expect(res.body.user.requiresPasswordChange).toBe(true);

      const dbUser = await prisma.user.findUnique({ where: { id: requesterUserId } });
      expect(dbUser?.requiresPasswordChange).toBe(true);
    });

    it("verifies user with newly set initial password is blocked on protected endpoints with 403 MUST_CHANGE_PASSWORD after login, until completing password change", async () => {
      const newPassword = "BrandNewInitial123!";

      // Admin resets user's password
      await request(app)
        .post(`/api/admin/users/${requesterUserId}/password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ initialPassword: newPassword });

      // User logs in with new initial password
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "alice@example.com", password: newPassword });

      expect(loginRes.status).toBe(200);
      const userToken = loginRes.body.token || loginRes.headers["set-cookie"]?.[0]?.split(";")[0]?.split("=")[1];

      // User attempts to access normal protected endpoint (GET /api/tickets/my-tickets)
      const blockedRes = await request(app)
        .get("/api/tickets/my-tickets")
        .set("Authorization", `Bearer ${userToken}`);

      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.error).toBe("MUST_CHANGE_PASSWORD");

      // User executes password change via POST /api/auth/change-password
      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          currentPassword: newPassword,
          newPassword: "FinalPassword123!",
          confirmPassword: "FinalPassword123!",
        });

      expect(changeRes.status).toBe(200);

      // User can now access normal protected endpoint
      const unblockedRes = await request(app)
        .get("/api/tickets/my-tickets")
        .set("Authorization", `Bearer ${userToken}`);

      expect(unblockedRes.status).toBe(200);
    });
  });
});
