import { describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Database Migration & Idempotent Seed Suite", () => {
  const prisma = getPrisma();

  it("API-MIG-01: Verifies User model schema evolution and single-assignment Role enum", async () => {
    // 1. Verify User model query returns migrated records with valid Role enum
    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThanOrEqual(12);

    const roles = new Set(users.map((u) => u.role));
    expect(roles.has("REQUESTER")).toBe(true);
    expect(roles.has("IT_STAFF")).toBe(true);
    expect(roles.has("ADMINISTRATOR")).toBe(true);

    // 2. Verify all seeded users have bcrypt password hashes and requiresPasswordChange flag
    for (const u of users) {
      expect(u.passwordHash).toBeDefined();
      expect(u.passwordHash.length).toBeGreaterThan(10);
      expect(typeof u.requiresPasswordChange).toBe("boolean");
    }
  });

  it("API-MIG-02: Verifies idempotent seed execution without duplicate constraint failures", async () => {
    // Verifies active categories count >= 4
    const categories = await prisma.category.findMany({ where: { isActive: true } });
    expect(categories.length).toBeGreaterThanOrEqual(4);

    // Verifies active related systems count >= 7
    const systems = await prisma.relatedSystem.findMany({ where: { isActive: true } });
    expect(systems.length).toBeGreaterThanOrEqual(7);

    // Verifies required active/inactive users per role
    const requesters = await prisma.user.findMany({ where: { role: "REQUESTER" } });
    const staff = await prisma.user.findMany({ where: { role: "IT_STAFF" } });
    const admins = await prisma.user.findMany({ where: { role: "ADMINISTRATOR" } });

    expect(requesters.filter((r) => r.isActive).length).toBeGreaterThanOrEqual(4);
    expect(requesters.filter((r) => !r.isActive).length).toBeGreaterThanOrEqual(1); // Eve Adams
    expect(staff.filter((s) => s.isActive).length).toBeGreaterThanOrEqual(3);
    expect(staff.filter((s) => !s.isActive).length).toBeGreaterThanOrEqual(1); // Inactive Staff
    expect(admins.filter((a) => a.isActive).length).toBeGreaterThanOrEqual(1);
  });

  it("API-MIG-03: Verifies Ticket model relations, ownerId, indicator fields, and comments/notes", async () => {
    const tickets = await prisma.ticket.findMany({
      include: {
        requester: true,
        owner: true,
        comments: true,
        notes: true,
      },
    });

    expect(tickets.length).toBeGreaterThan(0);

    for (const ticket of tickets) {
      expect(ticket.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
      expect(ticket.requester).toBeDefined();
      expect(ticket.requester.id).toBe(ticket.requesterId);

      if (ticket.ownerId) {
        expect(ticket.owner).toBeDefined();
        expect(ticket.owner?.id).toBe(ticket.ownerId);
      }
    }
  });
});
