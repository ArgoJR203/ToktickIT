import { getPrisma } from "../src/prisma.js";

// ---------------------------------------------------------------------------
// Lab 2 — Seed script (idempotent)
// Seeds: Categories, Related Systems, Requester Users
// Running this script multiple times must NOT create duplicates.
// ---------------------------------------------------------------------------

async function main() {
  const prisma = getPrisma();

  // --- 1. Categories (4) ---------------------------------------------------
  const categoryNames = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  const categories: Record<string, { id: number }> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories[name] = cat;
  }
  console.log(`Seeded ${categoryNames.length} categories.`);

  // --- 2. Related Systems (7) — with category associations -----------------
  const relatedSystemsData = [
    { name: "Email",                categoryName: "Account and Access" },
    { name: "Campus Wi-Fi",         categoryName: "Network" },
    { name: "VPN",                  categoryName: "Network" },
    { name: "LEB2 App",            categoryName: "Software" },
    { name: "Grade Submission App", categoryName: "Software" },
    { name: "Printer",             categoryName: "Hardware" },
    { name: "Corporate Laptop",    categoryName: "Hardware" },
  ];

  for (const sys of relatedSystemsData) {
    await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: {},
      create: {
        name: sys.name,
        isActive: true,
        categoryId: categories[sys.categoryName].id,
      },
    });
  }
  console.log(`Seeded ${relatedSystemsData.length} related systems.`);

  // --- 3. Requester Users (4 active + 1 inactive) --------------------------
  const requestersData = [
    { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", isActive: true },
    { name: "Sarah Johnson",     email: "sarah.johnson@example.com",     isActive: true },
    { name: "David Lee",         email: "david.lee@example.com",         isActive: true },
    { name: "Michael Brown",     email: "michael.brown@example.com",     isActive: true },
    { name: "Robert Taylor",     email: "robert.taylor@example.com",     isActive: false },
  ];

  for (const req of requestersData) {
    await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: {},
      create: {
        name: req.name,
        email: req.email,
        isActive: req.isActive,
      },
    });
  }
  const activeCount = requestersData.filter((r) => r.isActive).length;
  const inactiveCount = requestersData.length - activeCount;
  console.log(`Seeded ${activeCount} active + ${inactiveCount} inactive requester users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
