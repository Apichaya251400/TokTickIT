import bcrypt from "bcryptjs";
import { getPrisma } from "../src/prisma.js";

const DEFAULT_INITIAL_PASSWORD = "InitialPassword123!";

async function main() {
  const prisma = getPrisma();
  console.log("Starting Sprint 3 Idempotent Database Seed...");

  // Generate standard password hash for InitialPassword123!
  const passwordHash = bcrypt.hashSync(DEFAULT_INITIAL_PASSWORD, 10);

  // 1. Seed Categories (4 required categories)
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }
  console.log("Seeded 4 active categories successfully.");

  // 2. Seed Related Systems (7 systems required by Lab 2 & 3 contract)
  const relatedSystems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }
  console.log("Seeded 7 active related systems successfully.");

  // 3. Seed Users across 3 roles (Active & Inactive accounts)
  const usersData = [
    // Requesters (>= 4 active, 1 inactive)
    {
      name: "Requester User",
      email: "requester@toktick.it",
      role: "REQUESTER" as const,
      isActive: true,
      requiresPasswordChange: true,
    },
    {
      name: "Alice Smith",
      email: "alice@example.com",
      role: "REQUESTER" as const,
      isActive: true,
      requiresPasswordChange: true,
    },
    {
      name: "Bob Jones",
      email: "bob@example.com",
      role: "REQUESTER" as const,
      isActive: true,
      requiresPasswordChange: true,
    },
    {
      name: "Charlie Brown",
      email: "charlie@example.com",
      role: "REQUESTER" as const,
      isActive: true,
      requiresPasswordChange: true,
    },
    {
      name: "Diana Prince",
      email: "diana@example.com",
      role: "REQUESTER" as const,
      isActive: true,
      requiresPasswordChange: true,
    },
    {
      name: "Eve Adams",
      email: "eve@example.com",
      role: "REQUESTER" as const,
      isActive: false,
      requiresPasswordChange: true,
    },

    // IT Staff (>= 3 active, 1 inactive)
    {
      name: "IT Staff User",
      email: "staff@toktick.it",
      role: "IT_STAFF" as const,
      isActive: true,
      requiresPasswordChange: true,
    },
    {
      name: "John Staff",
      email: "john.staff@toktick.it",
      role: "IT_STAFF" as const,
      isActive: true,
      requiresPasswordChange: true,
    },
    {
      name: "Sarah Staff",
      email: "sarah.staff@toktick.it",
      role: "IT_STAFF" as const,
      isActive: true,
      requiresPasswordChange: true,
    },
    {
      name: "Inactive Staff",
      email: "inactive.staff@toktick.it",
      role: "IT_STAFF" as const,
      isActive: false,
      requiresPasswordChange: true,
    },

    // Administrators (>= 1 active)
    {
      name: "System Admin",
      email: "admin@toktick.it",
      role: "ADMINISTRATOR" as const,
      isActive: true,
      requiresPasswordChange: true,
    },
    {
      name: "Secondary Admin",
      email: "admin2@toktick.it",
      role: "ADMINISTRATOR" as const,
      isActive: true,
      requiresPasswordChange: true,
    },
  ];

  const seededUsers: Record<string, number> = {};

  for (const u of usersData) {
    const record = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        isActive: u.isActive,
      },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        isActive: u.isActive,
        requiresPasswordChange: u.requiresPasswordChange,
      },
    });
    seededUsers[u.email] = record.id;
  }
  console.log("Seeded 12 users across Requester, IT Staff, and Administrator roles.");

  // Fetch Category & System IDs for ticket seeding
  const catAccount = await prisma.category.findUniqueOrThrow({ where: { name: "Account and Access" } });
  const catHardware = await prisma.category.findUniqueOrThrow({ where: { name: "Hardware" } });
  const sysEmail = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Email" } });
  const sysWiFi = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Campus Wi-Fi" } });

  const requesterId = seededUsers["requester@toktick.it"];
  const aliceId = seededUsers["alice@example.com"];
  const staffId = seededUsers["staff@toktick.it"];
  const adminId = seededUsers["admin@toktick.it"];

  // 4. Seed Tickets with statuses, comments, and notes
  const sampleTickets = [
    {
      ticketNumber: "TKT-2026-000001",
      requesterId,
      ownerId: null,
      categoryId: catAccount.id,
      relatedSystemId: sysEmail.id,
      summary: "Cannot access corporate email after password change",
      description: "Getting invalid credential error when trying to log into Outlook web app.",
      requestedPriority: "HIGH" as const,
      itPriority: null,
      currentStatus: "NEW" as const,
    },
    {
      ticketNumber: "TKT-2026-000002",
      requesterId: aliceId,
      ownerId: staffId,
      categoryId: catHardware.id,
      relatedSystemId: sysWiFi.id,
      summary: "Campus Wi-Fi disconnects frequently in Library 3rd floor",
      description: "Signal drops every 15 minutes near room 302.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "HIGH" as const,
      currentStatus: "IN_PROGRESS" as const,
    },
    {
      ticketNumber: "TKT-2026-000003",
      requesterId,
      ownerId: staffId,
      categoryId: catAccount.id,
      relatedSystemId: sysEmail.id,
      summary: "Requesting additional storage quota for department email account",
      description: "Mailbox reached 95% capacity.",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "RESOLVED" as const,
      requesterResolvedIndicatedAt: new Date(),
    },
  ];

  for (const t of sampleTickets) {
    const ticketRecord = await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        ownerId: t.ownerId,
        currentStatus: t.currentStatus,
        itPriority: t.itPriority,
      },
      create: t,
    });

    // Seed sample Public Comment on Ticket 2
    if (t.ticketNumber === "TKT-2026-000002") {
      const existingComments = await prisma.publicComment.findMany({ where: { ticketId: ticketRecord.id } });
      if (existingComments.length === 0) {
        await prisma.publicComment.create({
          data: {
            ticketId: ticketRecord.id,
            authorId: staffId,
            content: "We have dispatched a technician to inspect the access point in room 302.",
          },
        });
      }

      // Seed sample Internal Note on Ticket 2
      const existingNotes = await prisma.internalNote.findMany({ where: { ticketId: ticketRecord.id } });
      if (existingNotes.length === 0) {
        await prisma.internalNote.create({
          data: {
            ticketId: ticketRecord.id,
            authorId: staffId,
            content: "Access point AP-LIB-302 firmware is outdated. Scheduled reboot tonight.",
          },
        });
      }
    }
  }

  console.log("Seeded sample tickets, public comments, and internal notes successfully.");
  console.log("Sprint 3 Seed completed cleanly!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
