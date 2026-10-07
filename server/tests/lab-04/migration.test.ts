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

  it("preserves all Lab 1–3 tickets, comments, notes, and attachments intact", async () => {
    const ticketCount = await prisma.ticket.count();
    expect(ticketCount).toBeGreaterThanOrEqual(8);

    const commentCount = await prisma.publicComment.count();
    expect(commentCount).toBeGreaterThanOrEqual(1);

    const noteCount = await prisma.internalNote.count();
    expect(noteCount).toBeGreaterThanOrEqual(1);

    const attachmentCount = await prisma.attachment.count();
    expect(attachmentCount).toBeGreaterThanOrEqual(2);
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
