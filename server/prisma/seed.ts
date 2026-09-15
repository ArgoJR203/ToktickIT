import bcrypt from "bcrypt";
import { getPrisma } from "../src/prisma.js";

// ---------------------------------------------------------------------------
// Lab 3 — Seed script (idempotent)
// Seeds:
//   1. Categories (4)
//   2. Related Systems (7)
//   3. User Accounts (11) — 6 Requesters, 4 IT Staff, 1 Administrator
//   4. Realistic Operational Tickets across statuses, priorities, & assignments
//   5. Public Comments and Internal Notes
//
// Running this script multiple times must NOT create duplicate records.
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

  const relatedSystems: Record<string, { id: number }> = {};
  for (const sys of relatedSystemsData) {
    const rs = await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: {
        isActive: true,
        categoryId: categories[sys.categoryName].id,
      },
      create: {
        name: sys.name,
        isActive: true,
        categoryId: categories[sys.categoryName].id,
      },
    });
    relatedSystems[sys.name] = rs;
  }
  console.log(`Seeded ${relatedSystemsData.length} related systems.`);

  // --- 3. User Accounts (11 accounts per Handout §5.3) ---------------------
  // All initial passwords are 'Password123!' hashed with bcrypt (salt rounds = 10)
  const defaultHash = await bcrypt.hash("Password123!", 10);

  const usersData: Array<{
    name: string;
    email: string;
    role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
    isActive: boolean;
    mustChangePassword: boolean;
  }> = [
    // Requesters (4 active + 1 active first-login tester + 1 inactive)
    { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "REQUESTER",     isActive: true,  mustChangePassword: false },
    { name: "Sarah Johnson",     email: "sarah.johnson@example.com",     role: "REQUESTER",     isActive: true,  mustChangePassword: false },
    { name: "Michael Brown",     email: "michael.brown@example.com",     role: "REQUESTER",     isActive: true,  mustChangePassword: false },
    { name: "Amanda Clark",      email: "amanda.clark@example.com",      role: "REQUESTER",     isActive: true,  mustChangePassword: false },
    { name: "David Lee",         email: "david.lee@example.com",         role: "REQUESTER",     isActive: true,  mustChangePassword: true  }, // First-login password change tester
    { name: "Robert Taylor",     email: "robert.taylor@example.com",     role: "REQUESTER",     isActive: false, mustChangePassword: false }, // Inactive requester login rejection tester

    // IT Staff (3 active + 1 inactive)
    { name: "Alex Thompson",     email: "alex.thompson@toktickit.com",   role: "IT_STAFF",      isActive: true,  mustChangePassword: false },
    { name: "Lisa Martinez",     email: "lisa.martinez@toktickit.com",   role: "IT_STAFF",      isActive: true,  mustChangePassword: false },
    { name: "Kevin Patel",       email: "kevin.patel@toktickit.com",     role: "IT_STAFF",      isActive: true,  mustChangePassword: false },
    { name: "Robert Wilson",     email: "robert.wilson@toktickit.com",   role: "IT_STAFF",      isActive: false, mustChangePassword: false }, // Inactive staff rejection tester

    // Administrator (1 active)
    { name: "John Smith",        email: "john.smith@toktickit.com",      role: "ADMINISTRATOR", isActive: true,  mustChangePassword: false },
  ];

  const users: Record<string, { id: number; name: string; email: string; role: string }> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
      },
      create: {
        name: u.name,
        email: u.email,
        passwordHash: defaultHash,
        role: u.role,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
      },
    });
    users[u.email] = user;
  }

  const requesterCount = usersData.filter((u) => u.role === "REQUESTER").length;
  const staffCount = usersData.filter((u) => u.role === "IT_STAFF").length;
  const adminCount = usersData.filter((u) => u.role === "ADMINISTRATOR").length;
  console.log(`Seeded ${usersData.length} users (${requesterCount} Requesters, ${staffCount} IT Staff, ${adminCount} Admin).`);

  // --- 4. Sample Tickets & Operational Data --------------------------------
  const sampleTickets = [
    {
      ticketNumber: "TKT-2026-000001",
      requesterEmail: "jennifer.anderson@example.com",
      ownerEmail: "alex.thompson@toktickit.com",
      categoryName: "Account and Access",
      systemName: "Email",
      summary: "Cannot access corporate email from Outlook client",
      description: "Getting error 'Authentication failed' when connecting to exchange server after recent password update.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "IN_PROGRESS" as const,
      resolutionIndicated: false,
      resolutionIndicatedAt: null,
      resolutionSummary: null,
      publicComments: [
        {
          authorEmail: "alex.thompson@toktickit.com",
          content: "Hello Jennifer, I am checking the Azure AD synchronization status for your mailbox.",
        },
      ],
      internalNotes: [
        {
          authorEmail: "alex.thompson@toktickit.com",
          content: "Checked hybrid connector logs; AD connector delta sync delayed by 15 mins.",
        },
      ],
    },
    {
      ticketNumber: "TKT-2026-000002",
      requesterEmail: "sarah.johnson@example.com",
      ownerEmail: null,
      categoryName: "Network",
      systemName: "VPN",
      summary: "VPN connection drops repeatedly every 10 minutes",
      description: "Working remotely on home fiber. Any active SSL-VPN tunnel resets exactly after 10 minutes.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "NEW" as const,
      resolutionIndicated: false,
      resolutionIndicatedAt: null,
      resolutionSummary: null,
      publicComments: [],
      internalNotes: [],
    },
    {
      ticketNumber: "TKT-2026-000003",
      requesterEmail: "michael.brown@example.com",
      ownerEmail: "lisa.martinez@toktickit.com",
      categoryName: "Software",
      systemName: "LEB2 App",
      summary: "LEB2 App grade export fails with HTTP 500 error",
      description: "Clicking on Grade Export button results in 500 Internal Server Error for courses with >100 students.",
      requestedPriority: "URGENT" as const,
      itPriority: "URGENT" as const,
      currentStatus: "WAITING_FOR_REQUESTER" as const,
      resolutionIndicated: true,
      resolutionIndicatedAt: new Date(),
      resolutionSummary: null,
      publicComments: [
        {
          authorEmail: "lisa.martinez@toktickit.com",
          content: "A hotfix has been deployed to the LEB2 export worker. Could you please test exporting again?",
        },
        {
          authorEmail: "michael.brown@example.com",
          content: "The export completed in 3 seconds! The problem appears resolved. Thank you!",
        },
      ],
      internalNotes: [
        {
          authorEmail: "lisa.martinez@toktickit.com",
          content: "Memory limit on export worker pod was increased from 256MB to 1GB. Monitored CPU usage is normal.",
        },
      ],
    },
    {
      ticketNumber: "TKT-2026-000004",
      requesterEmail: "amanda.clark@example.com",
      ownerEmail: "kevin.patel@toktickit.com",
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      summary: "Laptop battery depletes in under 40 minutes",
      description: "Dell Latitude 5420 battery health indicator reports degraded capacity. Unable to work unplugged.",
      requestedPriority: "LOW" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "RESOLVED" as const,
      resolutionIndicated: true,
      resolutionIndicatedAt: new Date(Date.now() - 3600000),
      resolutionSummary: "Replaced degraded battery with new OEM Dell 58Wh battery. Passed 2-hour stress diagnostic.",
      publicComments: [
        {
          authorEmail: "kevin.patel@toktickit.com",
          content: "Your new battery has been installed and tested. The laptop is ready for pickup at the 2nd floor IT Helpdesk.",
        },
      ],
      internalNotes: [
        {
          authorEmail: "kevin.patel@toktickit.com",
          content: "Old battery sent for recycling. Inventory stock updated (Remaining: 3 units).",
        },
      ],
    },
    {
      ticketNumber: "TKT-2026-000005",
      requesterEmail: "jennifer.anderson@example.com",
      ownerEmail: "alex.thompson@toktickit.com",
      categoryName: "Hardware",
      systemName: "Printer",
      summary: "Floor 3 HP LaserJet paper jam and low toner warning",
      description: "Paper jammed in Tray 2 feeder rollers, and yellow cartridge needs replacement.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "CLOSED" as const,
      resolutionIndicated: false,
      resolutionIndicatedAt: null,
      resolutionSummary: "Cleared roller jam, wiped pickup rollers, and installed replacement HP yellow toner cartridge.",
      publicComments: [
        {
          authorEmail: "alex.thompson@toktickit.com",
          content: "Toner replaced and roller cleaned. Test print succeeded on Floor 3 printer.",
        },
      ],
      internalNotes: [],
    },
    {
      ticketNumber: "TKT-2026-000006",
      requesterEmail: "michael.brown@example.com",
      ownerEmail: "alex.thompson@toktickit.com",
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      summary: "Intermittent Wi-Fi signal in Building 4 Lecture Hall 3",
      description: "Students and instructors report periodic signal loss during 9 AM - 11 AM sessions.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "OPEN" as const,
      resolutionIndicated: false,
      resolutionIndicatedAt: null,
      resolutionSummary: null,
      publicComments: [],
      internalNotes: [
        {
          authorEmail: "alex.thompson@toktickit.com",
          content: "Remote reboot performed on AP-B4-LH3. Channel overlap suspected with neighboring AP-B4-LH2.",
        },
      ],
    },
  ];

  for (const t of sampleTickets) {
    const requester = users[t.requesterEmail];
    const owner = t.ownerEmail ? users[t.ownerEmail] : null;
    const cat = categories[t.categoryName];
    const sys = relatedSystems[t.systemName];

    if (!requester || !cat || !sys) continue;

    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        ownerId: owner?.id ?? null,
        resolutionIndicated: t.resolutionIndicated,
        resolutionIndicatedAt: t.resolutionIndicatedAt,
        resolutionSummary: t.resolutionSummary,
      },
      create: {
        ticketNumber: t.ticketNumber,
        requesterId: requester.id,
        ownerId: owner?.id ?? null,
        categoryId: cat.id,
        relatedSystemId: sys.id,
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        resolutionIndicated: t.resolutionIndicated,
        resolutionIndicatedAt: t.resolutionIndicatedAt,
        resolutionSummary: t.resolutionSummary,
      },
    });

    // Seed Public Comments (idempotent: avoid duplicating exact content)
    for (const pc of t.publicComments) {
      const author = users[pc.authorEmail];
      if (author) {
        const existing = await prisma.publicComment.findFirst({
          where: {
            ticketId: ticket.id,
            authorId: author.id,
            content: pc.content,
          },
        });
        if (!existing) {
          await prisma.publicComment.create({
            data: {
              ticketId: ticket.id,
              authorId: author.id,
              content: pc.content,
            },
          });
        }
      }
    }

    // Seed Internal Notes (idempotent: avoid duplicating exact content)
    for (const note of t.internalNotes) {
      const author = users[note.authorEmail];
      if (author) {
        const existing = await prisma.internalNote.findFirst({
          where: {
            ticketId: ticket.id,
            authorId: author.id,
            content: note.content,
          },
        });
        if (!existing) {
          await prisma.internalNote.create({
            data: {
              ticketId: ticket.id,
              authorId: author.id,
              content: note.content,
            },
          });
        }
      }
    }
  }

  console.log(`Seeded ${sampleTickets.length} operational sample tickets with comments and notes.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
