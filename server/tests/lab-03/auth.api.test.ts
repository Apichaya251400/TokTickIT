import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import { clearRevocationBlocklist } from "../../src/utils/jwt.js";
import { authenticateToken } from "../../src/middleware/auth.js";

const DEFAULT_INITIAL_PASSWORD = "InitialPassword123!";
const NEW_SECURE_PASSWORD = "MyNewSecurePassword123!";

describe("Issue 4: Authentication Foundation, Session Invalidation & Password API Tests", () => {
  const prisma = getPrisma();

  beforeEach(async () => {
    clearRevocationBlocklist();
    await seedDatabase();
  });

  it("API-AUTH-01: Authenticates active user with valid credentials (AC-01 / FR-01 / BR-01)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "alice@example.com",
        password: DEFAULT_INITIAL_PASSWORD,
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("alice@example.com");
    expect(res.body.user.role).toBe("REQUESTER");
    expect(res.body.user.isActive).toBe(true);

    // Verify HTTP-Only Cookie set
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=/);
  });

  it("API-AUTH-02: Enforces mandatory password change restriction (AC-02 / FR-02 / BR-02)", async () => {
    // 1. Authenticate user flagged with requiresPasswordChange = true
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "bob@example.com",
        password: DEFAULT_INITIAL_PASSWORD,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.requiresPasswordChange).toBe(true);

    const token = loginRes.body.token;

    // 2. GET /api/auth/me should succeed for password change flagged users
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe("bob@example.com");

    // 3. Protected endpoint access should be blocked with 403 MUST_CHANGE_PASSWORD
    // Add temporary protected route test handler
    app.get("/api/test-protected-feature", authenticateToken, (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const protectedTicketRes = await request(app)
      .get("/api/test-protected-feature")
      .set("Authorization", `Bearer ${token}`);

    expect(protectedTicketRes.status).toBe(403);
    expect(protectedTicketRes.body.error).toBe("MUST_CHANGE_PASSWORD");
  });

  it("API-AUTH-03: Revokes server-side session token on logout (AC-13 / FR-03 / BR-03)", async () => {
    // 1. Login
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "staff@toktick.it",
        password: DEFAULT_INITIAL_PASSWORD,
      });

    const token = loginRes.body.token;

    // 2. Perform logout
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe("Logged out successfully");

    // 3. Reusing revoked token should return 401 Unauthorized
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(401);
    expect(meRes.body.error).toBe("UNAUTHORIZED");
  });

  it("API-AUTH-04: Verifies real-time DB identity and immediate deactivation (FR-04 / BR-13)", async () => {
    // 1. Login active staff
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "john.staff@toktick.it",
        password: DEFAULT_INITIAL_PASSWORD,
      });

    const token = loginRes.body.token;

    const meResBefore = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meResBefore.status).toBe(200);

    // 2. Deactivate user in DB
    await prisma.user.update({
      where: { email: "john.staff@toktick.it" },
      data: { isActive: false },
    });

    // 3. Subsequent request with existing valid JWT token fails immediately with 401
    const meResAfter = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meResAfter.status).toBe(401);
    expect(meResAfter.body.error).toBe("UNAUTHORIZED");
  });

  it("API-AUTH-05: Returns generic safe 401 error for invalid credentials or inactive account (BR-01 / BR-12)", async () => {
    // Invalid password
    const resInvalidPass = await request(app)
      .post("/api/auth/login")
      .send({
        email: "alice@example.com",
        password: "WrongPassword123!",
      });

    expect(resInvalidPass.status).toBe(401);
    expect(resInvalidPass.body.error).toBe("UNAUTHORIZED");
    expect(resInvalidPass.body.message).toBe("Invalid email address or password");

    // Unknown email
    const resUnknownEmail = await request(app)
      .post("/api/auth/login")
      .send({
        email: "unknown@example.com",
        password: DEFAULT_INITIAL_PASSWORD,
      });

    expect(resUnknownEmail.status).toBe(401);
    expect(resUnknownEmail.body.error).toBe("UNAUTHORIZED");

    // Inactive account (Eve Adams)
    const resInactive = await request(app)
      .post("/api/auth/login")
      .send({
        email: "eve@example.com",
        password: DEFAULT_INITIAL_PASSWORD,
      });

    expect(resInactive.status).toBe(401);
    expect(resInactive.body.error).toBe("UNAUTHORIZED");
  });

  it("API-AUTH-06: Changes initial password and updates requiresPasswordChange flag", async () => {
    // 1. Login user with requiresPasswordChange = true
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "charlie@example.com",
        password: DEFAULT_INITIAL_PASSWORD,
      });

    const token = loginRes.body.token;

    // 2. Reject non-matching passwords or weak passwords
    const resMismatch = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: DEFAULT_INITIAL_PASSWORD,
        newPassword: NEW_SECURE_PASSWORD,
        confirmPassword: "DifferentPassword123!",
      });

    expect(resMismatch.status).toBe(400);
    expect(resMismatch.body.error).toBe("VALIDATION_ERROR");

    const resWeak = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: DEFAULT_INITIAL_PASSWORD,
        newPassword: "weak",
        confirmPassword: "weak",
      });

    expect(resWeak.status).toBe(400);

    // 3. Successfully change password
    const resSuccess = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: DEFAULT_INITIAL_PASSWORD,
        newPassword: NEW_SECURE_PASSWORD,
        confirmPassword: NEW_SECURE_PASSWORD,
      });

    expect(resSuccess.status).toBe(200);
    expect(resSuccess.body.user.requiresPasswordChange).toBe(false);

    // 4. Verify login with NEW password succeeds and OLD password fails
    const resOldLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "charlie@example.com",
        password: DEFAULT_INITIAL_PASSWORD,
      });

    expect(resOldLogin.status).toBe(401);

    const resNewLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "charlie@example.com",
        password: NEW_SECURE_PASSWORD,
      });

    expect(resNewLogin.status).toBe(200);
    expect(resNewLogin.body.user.requiresPasswordChange).toBe(false);
  });

  it("API-AUTH-07: Prevents prefix-matching bypass on allowed paths when requiresPasswordChange is true", async () => {
    app.get("/api/auth/me-extra", authenticateToken, (_req, res) => res.json({ ok: true }));

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "bob@example.com",
        password: DEFAULT_INITIAL_PASSWORD,
      });

    const token = loginRes.body.token;

    // GET /api/auth/me-extra should NOT bypass password change check
    const bypassAttemptRes = await request(app)
      .get("/api/auth/me-extra")
      .set("Authorization", `Bearer ${token}`);

    expect(bypassAttemptRes.status).toBe(403);
    expect(bypassAttemptRes.body.error).toBe("MUST_CHANGE_PASSWORD");
  });
});
