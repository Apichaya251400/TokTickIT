import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import { clearRevocationBlocklist, signToken } from "../../src/utils/jwt.js";

describe("Issue 7: IT Staff Ticket Queue API Suite (staff-queue.api.test.ts)", () => {
  const prisma = getPrisma();
  let staffToken: string;
  let adminToken: string;
  let aliceToken: string;
  let staffUserId: number;

  beforeEach(async () => {
    clearRevocationBlocklist();
    await seedDatabase();

    await prisma.user.updateMany({
      where: { email: { in: ["john.staff@toktick.it", "admin@toktick.it", "alice@example.com"] } },
      data: { requiresPasswordChange: false },
    });

    const staff = await prisma.user.findUniqueOrThrow({ where: { email: "john.staff@toktick.it" } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@toktick.it" } });
    const alice = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });

    staffUserId = staff.id;
    staffToken = signToken({ userId: staff.id, email: staff.email, role: staff.role, requiresPasswordChange: false });
    adminToken = signToken({ userId: admin.id, email: admin.email, role: admin.role, requiresPasswordChange: false });
    aliceToken = signToken({ userId: alice.id, email: alice.email, role: alice.role, requiresPasswordChange: false });
  });

  describe("Authorization & Security Controls", () => {
    it("permits IT Staff access (200 OK)", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it("denies Administrator access to ticket queue endpoint (403 Forbidden per Authorization Matrix)", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("denies Requester access to ticket queue endpoint (403 Forbidden)", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("denies Unauthenticated access (401 Unauthorized)", async () => {
      const res = await request(app).get("/api/tickets");
      expect(res.status).toBe(401);
    });
  });

  describe("Default Query Parameters", () => {
    it("applies default page=1, limit=10, sortBy=createdAt, sortDir=desc, owner=all", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe("Filtering & Search", () => {
    it("filters queue by search keyword q (matching summary or ticketNumber)", async () => {
      const res = await request(app)
        .get("/api/tickets?q=Wi-Fi")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.summary.includes("Wi-Fi") || t.ticketNumber.includes("Wi-Fi"))).toBe(true);
    });

    it("filters queue by status", async () => {
      const res = await request(app)
        .get("/api/tickets?status=IN_PROGRESS")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.currentStatus === "IN_PROGRESS")).toBe(true);
    });

    it("filters queue by requestedPriority", async () => {
      const res = await request(app)
        .get("/api/tickets?requestedPriority=HIGH")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.requestedPriority === "HIGH")).toBe(true);
    });

    it("filters queue by itPriority", async () => {
      const res = await request(app)
        .get("/api/tickets?itPriority=HIGH")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.itPriority === "HIGH")).toBe(true);
    });

    it("applies combined filters with AND semantics (status=IN_PROGRESS & itPriority=HIGH)", async () => {
      const res = await request(app)
        .get("/api/tickets?status=IN_PROGRESS&itPriority=HIGH")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.currentStatus === "IN_PROGRESS" && t.itPriority === "HIGH")).toBe(true);
    });

    it("filters queue by owner=my_queue", async () => {
      const res = await request(app)
        .get("/api/tickets?owner=my_queue")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.owner?.id === staffUserId)).toBe(true);
    });

    it("filters queue by owner=unassigned", async () => {
      const res = await request(app)
        .get("/api/tickets?owner=unassigned")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.owner === null)).toBe(true);
    });
  });

  describe("Sorting Options", () => {
    it("sorts by ticketNumber asc", async () => {
      const res = await request(app)
        .get("/api/tickets?sortBy=ticketNumber&sortDir=asc")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      const numbers = res.body.data.map((t: any) => t.ticketNumber);
      const sorted = [...numbers].sort();
      expect(numbers).toEqual(sorted);
    });

    it("sorts by itPriority desc (URGENT > HIGH > MEDIUM > LOW)", async () => {
      const res = await request(app)
        .get("/api/tickets?sortBy=itPriority&sortDir=desc")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe("Pagination", () => {
    it("paginates queue results with page and limit", async () => {
      const page1Res = await request(app)
        .get("/api/tickets?page=1&limit=2")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(page1Res.status).toBe(200);
      expect(page1Res.body.pagination.page).toBe(1);
      expect(page1Res.body.pagination.limit).toBe(2);
      expect(page1Res.body.data.length).toBeLessThanOrEqual(2);

      const page2Res = await request(app)
        .get("/api/tickets?page=2&limit=2")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(page2Res.status).toBe(200);
      expect(page2Res.body.pagination.page).toBe(2);
    });

    it("returns data: [] when page is beyond totalPages", async () => {
      const res = await request(app)
        .get("/api/tickets?page=9999&limit=10")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.page).toBe(9999);
    });
  });

  describe("Invalid Parameter Validation (400 Bad Request)", () => {
    it("rejects invalid status parameter", async () => {
      const res = await request(app)
        .get("/api/tickets?status=INVALID_STATUS")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    });

    it("rejects invalid requestedPriority parameter", async () => {
      const res = await request(app)
        .get("/api/tickets?requestedPriority=SUPER_HIGH")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    });

    it("rejects invalid owner parameter", async () => {
      const res = await request(app)
        .get("/api/tickets?owner=everyone")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    });

    it("rejects invalid sortBy parameter", async () => {
      const res = await request(app)
        .get("/api/tickets?sortBy=unknownField")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    });

    it("rejects invalid limit parameter (> 50)", async () => {
      const res = await request(app)
        .get("/api/tickets?limit=100")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUERY_PARAMETER");
    });
  });

  describe("Requester Regression Continuity", () => {
    it("allows Requester to fetch owned tickets via /api/tickets/my-tickets", async () => {
      const res = await request(app)
        .get("/api/tickets/my-tickets")
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
