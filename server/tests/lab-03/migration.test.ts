import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";

const DEFAULT_INITIAL_PASSWORD = "InitialPassword123!";

describe("Lab 3 Database Migration & Idempotent Seed Suite", () => {
  const prisma = getPrisma();

  beforeEach(async () => {
    await seedDatabase();
  });

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

    // 3. Specifically verify migrated Lab 2 RequesterUser accounts receive initial password and force change
    const migratedRequesters = await prisma.user.findMany({ where: { role: "REQUESTER" } });
    expect(migratedRequesters.length).toBeGreaterThanOrEqual(5);

    const knownLab2RequesterEmails = [
      "alice@example.com",
      "bob@example.com",
      "charlie@example.com",
      "diana@example.com",
      "eve@example.com",
    ];

    for (const email of knownLab2RequesterEmails) {
      const requester = migratedRequesters.find((r) => r.email === email);
      expect(requester).toBeDefined();
      expect(requester?.role).toBe("REQUESTER");
      expect(requester?.requiresPasswordChange).toBe(true);
      expect(bcrypt.compareSync(DEFAULT_INITIAL_PASSWORD, requester!.passwordHash)).toBe(true);
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

    const ticketsBefore = await prisma.ticket.findMany({
      select: { id: true, ticketNumber: true, currentStatus: true },
      orderBy: { ticketNumber: "asc" },
    });

    // Execute seed run 2 (idempotency check)
    await seedDatabase();

    const countUsers2 = await prisma.user.count();
    const countCategories2 = await prisma.category.count();
    const countSystems2 = await prisma.relatedSystem.count();
    const countTickets2 = await prisma.ticket.count();
    const countAttachments2 = await prisma.attachment.count();

    const ticketsAfter = await prisma.ticket.findMany({
      select: { id: true, ticketNumber: true, currentStatus: true },
      orderBy: { ticketNumber: "asc" },
    });

    // Verify empirical equality (zero duplicate records generated and identical content preserved)
    expect(countUsers2).toBe(countUsers1);
    expect(countCategories2).toBe(countCategories1);
    expect(countSystems2).toBe(countSystems1);
    expect(countTickets2).toBe(countTickets1);
    expect(countAttachments2).toBe(countAttachments1);
    expect(ticketsAfter).toEqual(ticketsBefore);

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

    // 1. Explicitly verify preservation of pre-existing Lab 2 Attachments linked to Lab 2 Tickets by exact ID
    const ticket1 = tickets.find((t) => t.ticketNumber === "TKT-2026-000001");
    expect(ticket1).toBeDefined();

    const lab2Attachment1 = await prisma.attachment.findUnique({
      where: {
        id: "att-lab2-000001",
      },
    });

    expect(lab2Attachment1).toBeDefined();
    expect(lab2Attachment1!.ticketId).toBe(ticket1!.id);
    expect(lab2Attachment1!.fileName).toBe("error_screenshot.png");
    expect(lab2Attachment1!.fileSize).toBe(1048576);
    expect(lab2Attachment1!.mimeType).toBe("image/png");
    expect(lab2Attachment1!.filePath).toBe("/uploads/error_screenshot.png");

    const ticket2 = tickets.find((t) => t.ticketNumber === "TKT-2026-000002");
    expect(ticket2).toBeDefined();

    const lab2Attachment2 = await prisma.attachment.findUnique({
      where: {
        id: "att-lab2-000002",
      },
    });

    expect(lab2Attachment2).toBeDefined();
    expect(lab2Attachment2!.ticketId).toBe(ticket2!.id);
    expect(lab2Attachment2!.fileName).toBe("wifi_diagnostics_log.txt");
    expect(lab2Attachment2!.fileSize).toBe(2048);
    expect(lab2Attachment2!.mimeType).toBe("text/plain");
    expect(lab2Attachment2!.filePath).toBe("/uploads/wifi_diagnostics_log.txt");

    // 2. Verify all attachments in DB maintain intact ticket relations post-migration
    const allAttachments = await prisma.attachment.findMany({ include: { ticket: true } });
    expect(allAttachments.length).toBeGreaterThanOrEqual(2);
    for (const attachment of allAttachments) {
      expect(attachment.ticket).toBeDefined();
      expect(attachment.ticketId).toBe(attachment.ticket.id);
      expect(attachment.fileName).toBeDefined();
      expect(attachment.filePath).toBeDefined();
    }

    // 3. Verify ticket relations and ownership fields
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

  it("API-MIG-04: Demonstrates pre-existing data preservation across seed migration flow", async () => {
    // 1. Create a pre-existing custom ticket & attachment prior to running seed migration
    const alice = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();

    const customTicketNumber = "TKT-2026-999999";
    const customAttachmentId = "att-lab2-custom-999";

    const customTicket = await prisma.ticket.upsert({
      where: { ticketNumber: customTicketNumber },
      update: {},
      create: {
        ticketNumber: customTicketNumber,
        requesterId: alice.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: "Custom pre-existing Lab 2 test ticket for migration verification",
        description: "Testing that custom existing tickets and attachments survive seedDatabase execution.",
        requestedPriority: "MEDIUM",
        currentStatus: "NEW",
        attachments: {
          connectOrCreate: {
            where: { id: customAttachmentId },
            create: {
              id: customAttachmentId,
              fileName: "custom_pre_existing_doc.pdf",
              fileSize: 4096,
              mimeType: "application/pdf",
              filePath: "/uploads/custom_pre_existing_doc.pdf",
            },
          },
        },
      },
      include: { attachments: true },
    });

    expect(customTicket.id).toBeDefined();
    expect(customTicket.attachments.length).toBe(1);

    // 2. Re-run seed database (simulating upgrade / re-seeding execution)
    await seedDatabase();

    // 3. Verify that custom pre-existing Ticket & Attachment are preserved intact with original IDs and relations
    const preservedTicket = await prisma.ticket.findUnique({
      where: { ticketNumber: customTicketNumber },
      include: { attachments: true, requester: true },
    });

    expect(preservedTicket).toBeDefined();
    expect(preservedTicket!.id).toBe(customTicket.id);
    expect(preservedTicket!.summary).toBe("Custom pre-existing Lab 2 test ticket for migration verification");
    expect(preservedTicket!.requester.email).toBe("alice@example.com");

    const preservedAttachment = await prisma.attachment.findUnique({
      where: { id: customAttachmentId },
      include: { ticket: true },
    });

    expect(preservedAttachment).toBeDefined();
    expect(preservedAttachment!.id).toBe(customAttachmentId);
    expect(preservedAttachment!.fileName).toBe("custom_pre_existing_doc.pdf");
    expect(preservedAttachment!.ticketId).toBe(customTicket.id);
  });
});

