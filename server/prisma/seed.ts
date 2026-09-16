import bcrypt from "bcryptjs";
import { getPrisma } from "../src/prisma.js";

const DEFAULT_INITIAL_PASSWORD = "InitialPassword123!";

export async function seedDatabase() {
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

  // Fetch Category & System IDs for ticket seeding
  const catAccount = await prisma.category.findUniqueOrThrow({ where: { name: "Account and Access" } });
  const catHardware = await prisma.category.findUniqueOrThrow({ where: { name: "Hardware" } });
  const catSoftware = await prisma.category.findUniqueOrThrow({ where: { name: "Software" } });
  const catNetwork = await prisma.category.findUniqueOrThrow({ where: { name: "Network" } });

  const sysEmail = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Email" } });
  const sysWiFi = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Campus Wi-Fi" } });
  const sysVPN = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "VPN" } });
  const sysLEB2 = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "LEB2 App" } });
  const sysGrades = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Grade Submission App" } });
  const sysPrinter = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Printer" } });
  const sysLaptop = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Corporate Laptop" } });

  const requesterId = seededUsers["requester@toktick.it"];
  const aliceId = seededUsers["alice@example.com"];
  const bobId = seededUsers["bob@example.com"];
  const charlieId = seededUsers["charlie@example.com"];
  const dianaId = seededUsers["diana@example.com"];

  const staffId = seededUsers["staff@toktick.it"];
  const johnStaffId = seededUsers["john.staff@toktick.it"];
  const sarahStaffId = seededUsers["sarah.staff@toktick.it"];
  const adminId = seededUsers["admin@toktick.it"];

  // 4. Seed Diverse Tickets (covering all 8 statuses, priorities, assigned/unassigned)
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
    {
      ticketNumber: "TKT-2026-000004",
      requesterId: bobId,
      ownerId: johnStaffId,
      categoryId: catSoftware.id,
      relatedSystemId: sysLEB2.id,
      summary: "LEB2 submission button disabled during assignment upload",
      description: "Students report submission page hangs on upload progress bar.",
      requestedPriority: "URGENT" as const,
      itPriority: "URGENT" as const,
      currentStatus: "OPEN" as const,
    },
    {
      ticketNumber: "TKT-2026-000005",
      requesterId: charlieId,
      ownerId: sarahStaffId,
      categoryId: catSoftware.id,
      relatedSystemId: sysGrades.id,
      summary: "Grade submission app throws 500 error on final CSV export",
      description: "Exporting semester grades fails when course contains over 200 enrolled students.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "WAITING_FOR_REQUESTER" as const,
    },
    {
      ticketNumber: "TKT-2026-000006",
      requesterId: dianaId,
      ownerId: staffId,
      categoryId: catHardware.id,
      relatedSystemId: sysPrinter.id,
      summary: "Main floor printer paper jam and low toner warning",
      description: "Toner cartridge replaced but paper jam light remains blinking.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "CLOSED" as const,
    },
    {
      ticketNumber: "TKT-2026-000007",
      requesterId: bobId,
      ownerId: staffId,
      categoryId: catNetwork.id,
      relatedSystemId: sysVPN.id,
      summary: "VPN connection drops immediately after multi-factor challenge",
      description: "Re-occurring issue after OS security update.",
      requestedPriority: "HIGH" as const,
      itPriority: "URGENT" as const,
      currentStatus: "REOPENED" as const,
      requesterReopenRequestedAt: new Date(),
    },
    {
      ticketNumber: "TKT-2026-000008",
      requesterId: aliceId,
      ownerId: null,
      categoryId: catHardware.id,
      relatedSystemId: sysLaptop.id,
      summary: "Accidental duplicate ticket submission for laptop keyboard repair",
      description: "Duplicate request created by mistake.",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "CANCELLED" as const,
    },
  ];

  for (const t of sampleTickets) {
    const ticketRecord = await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        ownerId: t.ownerId,
        currentStatus: t.currentStatus,
        itPriority: t.itPriority,
        requesterResolvedIndicatedAt: t.requesterResolvedIndicatedAt || null,
        requesterReopenRequestedAt: t.requesterReopenRequestedAt || null,
      },
      create: t,
    });

    // Seed sample Attachment on Ticket 1 & Ticket 2
    if (t.ticketNumber === "TKT-2026-000001") {
      const existingAttachments = await prisma.attachment.findMany({ where: { ticketId: ticketRecord.id } });
      if (existingAttachments.length === 0) {
        await prisma.attachment.create({
          data: {
            ticketId: ticketRecord.id,
            fileName: "error_screenshot.png",
            fileSize: 1048576,
            mimeType: "image/png",
            filePath: "/uploads/error_screenshot.png",
          },
        });
      }
    }

    if (t.ticketNumber === "TKT-2026-000002") {
      const existingAttachments = await prisma.attachment.findMany({ where: { ticketId: ticketRecord.id } });
      if (existingAttachments.length === 0) {
        await prisma.attachment.create({
          data: {
            ticketId: ticketRecord.id,
            fileName: "wifi_diagnostics_log.txt",
            fileSize: 2048,
            mimeType: "text/plain",
            filePath: "/uploads/wifi_diagnostics_log.txt",
          },
        });
      }

      // Seed sample Public Comment on Ticket 2
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

  console.log("Seeded sample tickets across 8 statuses, attachments, public comments, and internal notes successfully.");
  console.log("Sprint 3 Seed completed cleanly!");
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}
