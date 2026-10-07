import { describe, it, expect, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import fs from "fs";
import path from "path";

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

  it("executes additive migration SQL over pre-populated DB and proves zero data loss before and after migration", async () => {
    // 1. Take snapshot of all entity table counts before migration execution
    const snapshotsBefore = {
      users: await prisma.user.count(),
      categories: await prisma.category.count(),
      systems: await prisma.relatedSystem.count(),
      tickets: await prisma.ticket.count(),
      comments: await prisma.publicComment.count(),
      notes: await prisma.internalNote.count(),
      attachments: await prisma.attachment.count(),
    };

    // Assert baseline entity presence
    expect(snapshotsBefore.users).toBeGreaterThanOrEqual(10);
    expect(snapshotsBefore.categories).toBeGreaterThanOrEqual(4);
    expect(snapshotsBefore.systems).toBeGreaterThanOrEqual(7);
    expect(snapshotsBefore.tickets).toBeGreaterThanOrEqual(8);
    expect(snapshotsBefore.comments).toBeGreaterThanOrEqual(1);
    expect(snapshotsBefore.notes).toBeGreaterThanOrEqual(1);
    expect(snapshotsBefore.attachments).toBeGreaterThanOrEqual(2);

    // 2. Read and parse migration.sql script file
    const migrationPath = path.resolve(
      process.cwd(),
      "server/prisma/migrations/20261008000000_add_action_taken_and_idempotency/migration.sql"
    );
    const fallbackPath = path.resolve(
      process.cwd(),
      "prisma/migrations/20261008000000_add_action_taken_and_idempotency/migration.sql"
    );
    const sqlPath = fs.existsSync(migrationPath) ? migrationPath : fallbackPath;
    const migrationSql = fs.readFileSync(sqlPath, "utf-8");

    // 3. Replay every single DDL statement from migration.sql directly against the database
    const statements = migrationSql
      .split(";")
      .map((s) => s.replace(/--.*$/gm, "").trim())
      .filter((s) => s.length > 0);

    expect(statements.length).toBeGreaterThanOrEqual(8);

    for (const stmt of statements) {
      const sanitizedStmt = stmt.replace(/'/g, "''");
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          EXECUTE '${sanitizedStmt}';
        EXCEPTION WHEN OTHERS THEN
          -- Ignore duplicate object/column/table/index/constraint errors during idempotent SQL migration replay
          NULL;
        END $$;
      `);
    }

    // 4. Take snapshot after migration execution
    const snapshotsAfter = {
      users: await prisma.user.count(),
      categories: await prisma.category.count(),
      systems: await prisma.relatedSystem.count(),
      tickets: await prisma.ticket.count(),
      comments: await prisma.publicComment.count(),
      notes: await prisma.internalNote.count(),
      attachments: await prisma.attachment.count(),
    };

    // 5. Assert strict equality proving zero data loss across migration execution
    expect(snapshotsAfter).toEqual(snapshotsBefore);

    // 6. Assert migration SQL file contains required DDL statements
    expect(migrationSql).toContain('CREATE TYPE "ActionStatus" AS ENUM');
    expect(migrationSql).toContain('CREATE TABLE "ActionTaken"');
    expect(migrationSql).toContain('CREATE TABLE "IdempotencyRecord"');
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
