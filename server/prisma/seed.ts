import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();

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
  console.log("Seeded 4 categories successfully.");

  // 2. Seed Related Systems (7 systems required by Lab 2 contract)
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
  console.log("Seeded 7 related systems successfully.");

  // 3. Seed Development Requesters (4 active, 1 inactive Eve Adams)
  const requesters = [
    { name: "Alice Smith", email: "alice@example.com", isActive: true },
    { name: "Bob Jones", email: "bob@example.com", isActive: true },
    { name: "Charlie Brown", email: "charlie@example.com", isActive: true },
    { name: "Diana Prince", email: "diana@example.com", isActive: true },
    { name: "Eve Adams", email: "eve@example.com", isActive: false },
  ];

  for (const r of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: r.email },
      update: { name: r.name, isActive: r.isActive },
      create: { name: r.name, email: r.email, isActive: r.isActive },
    });
  }
  console.log("Seeded 5 Development Requesters successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
