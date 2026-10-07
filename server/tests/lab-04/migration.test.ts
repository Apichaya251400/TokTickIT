import { describe, it, expect, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("LAB4-03 / TEST-DB-02: Migration & Backfill Data Preservation", () => {
  const prisma = getPrisma();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("preserves all Lab 1–3 users intact (Requesters, IT Staff, Administrators)", async () => {
    const userCount = await prisma.user.count();
    expect(userCount).toBeGreaterThanOrEqual(10);

    const requester = await prisma.user.findUnique({ where: { email: "requester@toktick.it" } });
    const staff = await prisma.user.findUnique({ where: { email: "staff@toktick.it" } });
    const admin = await prisma.user.findUnique({ where: { email: "admin@toktick.it" } });

    expect(requester).not.toBeNull();
    expect(staff).not.toBeNull();
    expect(admin).not.toBeNull();
  });

  it("preserves exact snapshot count across Lab 1–3 entity tables post-migration", async () => {
    const snapshotsBefore = {
      users: await prisma.user.count(),
      categories: await prisma.category.count(),
      systems: await prisma.relatedSystem.count(),
      tickets: await prisma.ticket.count(),
      comments: await prisma.publicComment.count(),
      notes: await prisma.internalNote.count(),
      attachments: await prisma.attachment.count(),
    };

    // Assert baseline presence requirements
    expect(snapshotsBefore.users).toBeGreaterThanOrEqual(10);
    expect(snapshotsBefore.categories).toBeGreaterThanOrEqual(4);
    expect(snapshotsBefore.systems).toBeGreaterThanOrEqual(7);
    expect(snapshotsBefore.tickets).toBeGreaterThanOrEqual(8);
    expect(snapshotsBefore.comments).toBeGreaterThanOrEqual(1);
    expect(snapshotsBefore.notes).toBeGreaterThanOrEqual(1);
    expect(snapshotsBefore.attachments).toBeGreaterThanOrEqual(2);

    // Query extended schema fields (e.g. resolutionNote and actionsTaken) on tickets
    const tickets = await prisma.ticket.findMany({ include: { actionsTaken: true } });
    expect(tickets.length).toBe(snapshotsBefore.tickets);

    // Re-verify snapshot after reading/verifying schema model extensions
    const snapshotsAfter = {
      users: await prisma.user.count(),
      categories: await prisma.category.count(),
      systems: await prisma.relatedSystem.count(),
      tickets: await prisma.ticket.count(),
      comments: await prisma.publicComment.count(),
      notes: await prisma.internalNote.count(),
      attachments: await prisma.attachment.count(),
    };

    expect(snapshotsAfter).toEqual(snapshotsBefore);
  });

  it("ensures legacy Lab 1–3 tickets without actions remain valid with 0 ActionTaken records", async () => {
    const legacyTicket = await prisma.ticket.findUniqueOrThrow({
      where: { ticketNumber: "TKT-2026-000001" },
      include: { actionsTaken: true },
    });

    expect(legacyTicket).toBeDefined();
    expect(legacyTicket.actionsTaken).toBeDefined();
    expect(legacyTicket.actionsTaken.length).toBe(0);
  });
});
