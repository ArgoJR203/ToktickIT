import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { generateTicketNumber } from "./utils/ticket-generator.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Lab 2 — Fetch active development requesters (Issue #2-3)
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true, email: true, isActive: true },
    });
    res.status(200).json(requesters);
  } catch (err) {
    console.error("Error in GET /api/requesters:", err);
    res.status(500).json({ error: "Failed to load requesters" });
  }
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch (err) {
    console.error("Error in GET /api/categories:", err);
    res.status(500).json({ error: "Failed to load categories" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Fetch active related systems (Issue #2-3)
// ---------------------------------------------------------------------------
app.get("/api/related-systems", async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.query;
    let whereClause: Record<string, unknown> = { isActive: true };

    if (typeof categoryId === "string" && categoryId.trim() !== "") {
      const parsedCategoryId = Number(categoryId);
      if (!isNaN(parsedCategoryId)) {
        whereClause = {
          isActive: true,
          OR: [{ categoryId: parsedCategoryId }, { categoryId: null }],
        };
      }
    }

    const relatedSystems = await getPrisma().relatedSystem.findMany({
      where: whereClause,
      orderBy: { id: "asc" },
      select: { id: true, name: true, categoryId: true, isActive: true },
    });
    res.status(200).json(relatedSystems);
  } catch (err) {
    console.error("Error in GET /api/related-systems:", err);
    res.status(500).json({ error: "Failed to load related systems" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Create Ticket (Issue #2-5)
// ---------------------------------------------------------------------------
app.post("/api/tickets", async (req: Request, res: Response) => {
  try {
    const requesterHeader = req.header("x-requester-id");
    const requesterId = requesterHeader ? parseInt(requesterHeader, 10) : NaN;

    if (isNaN(requesterId)) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Missing or invalid x-requester-id header",
      });
    }

    const requester = await getPrisma().requesterUser.findUnique({
      where: { id: requesterId },
    });

    if (!requester || !requester.isActive) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Development requester is invalid or inactive",
      });
    }

    const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;
    const errors: Record<string, string> = {};

    const parsedCategoryId = typeof categoryId === "number" ? categoryId : parseInt(categoryId, 10);
    const parsedSystemId = typeof relatedSystemId === "number" ? relatedSystemId : parseInt(relatedSystemId, 10);

    // Validate categoryId
    if (isNaN(parsedCategoryId)) {
      errors.categoryId = "Category selection is required.";
    }

    // Validate relatedSystemId
    if (isNaN(parsedSystemId)) {
      errors.relatedSystemId = "Related system selection is required.";
    }

    // Validate summary (min 5, max 100)
    const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
    if (trimmedSummary.length < 5 || trimmedSummary.length > 100) {
      errors.summary = "Ticket summary must be between 5 and 100 characters.";
    }

    // Validate description (min 10, max 2000)
    const trimmedDescription = typeof description === "string" ? description.trim() : "";
    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      errors.description = "Ticket description must be between 10 and 2000 characters.";
    }

    // Validate requestedPriority (LOW, MEDIUM, HIGH, URGENT)
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (!validPriorities.includes(requestedPriority)) {
      errors.requestedPriority = "Requested priority must be LOW, MEDIUM, HIGH, or URGENT.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "Validation failed for ticket creation",
        details: errors,
      });
    }

    // Database existence and relational compatibility checks
    const category = await getPrisma().category.findUnique({
      where: { id: parsedCategoryId },
    });
    if (!category) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "Validation failed for ticket creation",
        details: { categoryId: "Selected category does not exist." },
      });
    }

    const relatedSystem = await getPrisma().relatedSystem.findUnique({
      where: { id: parsedSystemId },
    });
    if (!relatedSystem || !relatedSystem.isActive) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "Validation failed for ticket creation",
        details: { relatedSystemId: "Selected related system is invalid or inactive." },
      });
    }

    // BR-10 check: If RelatedSystem has non-NULL categoryId, it MUST match categoryId
    if (relatedSystem.categoryId !== null && relatedSystem.categoryId !== parsedCategoryId) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "Validation failed for ticket creation",
        details: { relatedSystemId: `Related system '${relatedSystem.name}' does not belong to the selected category.` },
      });
    }

    const ticketNumber = await generateTicketNumber(getPrisma());

    const ticket = await getPrisma().ticket.create({
      data: {
        ticketNumber,
        requesterId,
        categoryId: parsedCategoryId,
        relatedSystemId: parsedSystemId,
        summary: trimmedSummary,
        description: trimmedDescription,
        requestedPriority,
        currentStatus: "NEW",
      },
    });

    return res.status(201).json(ticket);
  } catch (err) {
    console.error("Error in POST /api/tickets:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create ticket" });
  }
});

export default app;


