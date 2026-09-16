import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";

const DEFAULT_INITIAL_PASSWORD = "InitialPassword123!";

describe("Lab 3 Database Migration & Idempotent Seed Suite", () => {
  const prisma = getPrisma();

  it("API-MIG-01: Verifies User model schema evolution, Role enum, and initial password bcrypt verification", async () => {
    // 1. Verify User model query returns migrated records with valid Role enum
    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThanOrEqual(12);

    const roles = new Set(users.map((u) => u.role));
    expect(roles.has("REQUESTER")).toBe(true);
    expect(roles.has("IT_STAFF")).toBe(true);
    expect(roles.has("ADMINISTRATOR")).toBe(true);

    // 2. Verify all migrated/seeded users receive InitialPassword123! bcrypt hash & requiresPasswordChange flag
    for (const u of users) {
      expect(u.passwordHash).toBeDefined();
      expect(u.passwordHash.length).toBeGreaterThan(10);
      expect(typeof u.requiresPasswordChange).toBe("boolean");
      expect(u.requiresPasswordChange).toBe(true);

      // Verify bcrypt credential authentication succeeds with InitialPassword123!
      const passwordMatches = bcrypt.compareSync(DEFAULT_INITIAL_PASSWORD, u.passwordHash);
      expect(passwordMatches).toBe(true);
    }
  });

  it("API-MIG-02: Verifies idempotent seed execution by running seed multiple times with zero duplicate creation", async () => {
    // Execute seed run 1
    await seedDatabase();

    const countUsers1 = await prisma.user.count();
    const countCategories1 = await prisma.category.count();
    const countSystems1 = await prisma.relatedSystem.count();
    const countTickets1 = await prisma.ticket.count();
    const countAttachments1 = await prisma.attachment.count();

    // Execute seed run 2 (idempotency check)
    await seedDatabase();

    const countUsers2 = await prisma.user.count();
    const countCategories2 = await prisma.category.count();
    const countSystems2 = await prisma.relatedSystem.count();
    const countTickets2 = await prisma.ticket.count();
    const countAttachments2 = await prisma.attachment.count();

    // Verify empirical equality (zero duplicate records generated)
    expect(countUsers2).toBe(countUsers1);
    expect(countCategories2).toBe(countCategories1);
    expect(countSystems2).toBe(countSystems1);
    expect(countTickets2).toBe(countTickets1);
    expect(countAttachments2).toBe(countAttachments1);

    // Verify required active/inactive users per role
    const requesters = await prisma.user.findMany({ where: { role: "REQUESTER" } });
    const staff = await prisma.user.findMany({ where: { role: "IT_STAFF" } });
    const admins = await prisma.user.findMany({ where: { role: "ADMINISTRATOR" } });

    expect(requesters.filter((r) => r.isActive).length).toBeGreaterThanOrEqual(4);
    expect(requesters.filter((r) => !r.isActive).length).toBeGreaterThanOrEqual(1); // Eve Adams
    expect(staff.filter((s) => s.isActive).length).toBeGreaterThanOrEqual(3);
    expect(staff.filter((s) => !s.isActive).length).toBeGreaterThanOrEqual(1); // Inactive Staff
    expect(admins.filter((a) => a.isActive).length).toBeGreaterThanOrEqual(1);
  });

  it("API-MIG-03: Verifies preservation of tickets, attachments, and relations post-migration", async () => {
    const tickets = await prisma.ticket.findMany({
      include: {
        requester: true,
        owner: true,
        category: true,
        relatedSystem: true,
        comments: true,
        notes: true,
        attachments: true,
      },
    });

    expect(tickets.length).toBeGreaterThanOrEqual(8);

    // Verify ticket status coverage across all 8 required statuses
    const statuses = new Set(tickets.map((t) => t.currentStatus));
    expect(statuses.has("NEW")).toBe(true);
    expect(statuses.has("OPEN")).toBe(true);
    expect(statuses.has("IN_PROGRESS")).toBe(true);
    expect(statuses.has("WAITING_FOR_REQUESTER")).toBe(true);
    expect(statuses.has("RESOLVED")).toBe(true);
    expect(statuses.has("CLOSED")).toBe(true);
    expect(statuses.has("REOPENED")).toBe(true);
    expect(statuses.has("CANCELLED")).toBe(true);

    // Explicitly verify Attachment preservation and ticket linkage
    const ticketWithAttachment = tickets.find((t) => t.attachments.length > 0);
    expect(ticketWithAttachment).toBeDefined();

    if (ticketWithAttachment) {
      const attachment = ticketWithAttachment.attachments[0];
      expect(attachment.ticketId).toBe(ticketWithAttachment.id);
      expect(attachment.fileName).toBeDefined();
      expect(attachment.fileSize).toBeGreaterThan(0);
      expect(attachment.filePath).toBeDefined();
    }

    // Verify ticket relations and ownership fields
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
