import express, { Request, Response } from "express";
import cors from "cors";
import fs from "fs";
import { getPrisma } from "./prisma.js";
import { generateTicketNumber } from "./utils/ticket-generator.js";
import { uploadMiddleware } from "./middleware/upload.js";
import { authRouter } from "./routes/auth.js";
import { authenticate, enforcePasswordChange, requireRole, authenticateWithLegacyFallback } from "./middleware/auth.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

// ---------------------------------------------------------------------------
// Lab 3 — Auth Routes (Issue #3-3)
// ---------------------------------------------------------------------------
app.use("/api/auth", authRouter);

// Protected endpoints for RBAC and password change gating verification
app.get("/api/test/gated-endpoint", authenticate, enforcePasswordChange, (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Accessed gated functional endpoint." });
});

app.get("/api/test/staff-only", authenticate, enforcePasswordChange, requireRole("IT_STAFF"), (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Accessed staff-only endpoint." });
});

app.get("/api/test/admin-only", authenticate, enforcePasswordChange, requireRole("ADMINISTRATOR"), (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Accessed admin-only endpoint." });
});

app.get("/api/test/requester-only", authenticate, enforcePasswordChange, requireRole("REQUESTER"), (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Accessed requester-only endpoint." });
});



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
    const requesters = await getPrisma().user.findMany({
      where: { role: "REQUESTER", isActive: true },
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
// Lab 2 & Lab 3 — Fetch Owned Paginated Tickets (Issue #2-6, #3-5, API-09, API-10)
// ---------------------------------------------------------------------------
app.get("/api/tickets", authenticateWithLegacyFallback, async (req: Request, res: Response) => {
  try {
    const requesterId = req.user!.id;

    const { search, categoryId, requestedPriority, currentStatus, sortBy, sortOrder, page, pageSize } = req.query;

    const where: Record<string, unknown> = {
      requesterId,
    };

    // Keyword search matching summary or ticketNumber (case-insensitive)
    if (typeof search === "string" && search.trim() !== "") {
      const term = search.trim();
      where.OR = [
        { ticketNumber: { contains: term, mode: "insensitive" } },
        { summary: { contains: term, mode: "insensitive" } },
      ];
    }

    // Category filter
    if (typeof categoryId === "string" && categoryId.trim() !== "") {
      const parsedCatId = parseInt(categoryId, 10);
      if (!isNaN(parsedCatId)) {
        where.categoryId = parsedCatId;
      }
    } else if (typeof categoryId === "number" && !isNaN(categoryId)) {
      where.categoryId = categoryId;
    }

    // Priority filter
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (typeof requestedPriority === "string" && validPriorities.includes(requestedPriority.trim())) {
      where.requestedPriority = requestedPriority.trim();
    }

    // Status filter
    const validStatuses = [
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
      "CLOSED",
      "REOPENED",
      "CANCELLED",
      "PENDING",
    ];
    if (typeof currentStatus === "string" && validStatuses.includes(currentStatus.trim())) {
      const trimmed = currentStatus.trim();
      where.currentStatus = trimmed === "PENDING" ? "WAITING_FOR_REQUESTER" : trimmed;
    }

    // Sorting
    const validSortFields = ["createdAt", "ticketNumber", "requestedPriority", "currentStatus"];
    const sortField = typeof sortBy === "string" && validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortDir = typeof sortOrder === "string" && sortOrder.toLowerCase() === "asc" ? "asc" : "desc";

    const orderBy: Array<Record<string, "asc" | "desc">> = [
      { [sortField]: sortDir as "asc" | "desc" },
    ];
    if (sortField !== "id") {
      orderBy.push({ id: "desc" });
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(pageSize as string, 10) || 10));
    const skip = (pageNum - 1) * limit;

    const [totalItems, tickets] = await Promise.all([
      getPrisma().ticket.count({ where }),
      getPrisma().ticket.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          _count: { select: { attachments: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return res.status(200).json({
      data: tickets,
      pagination: {
        page: pageNum,
        pageSize: limit,
        totalItems,
        totalPages,
      },
    });
  } catch (err) {
    console.error("Error in GET /api/tickets:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch tickets" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 & Lab 3 — Fetch Owned Ticket Detail (Issue #2-7, #3-5, API-09)
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id", authenticateWithLegacyFallback, async (req: Request, res: Response) => {
  try {
    const requesterId = req.user!.id;

    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "Invalid ticket ID format",
      });
    }

    const ticketId = parseInt(req.params.id, 10);
    if (ticketId <= 0) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "Invalid ticket ID format",
      });
    }

    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        attachments: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            isRemoved: true,
            removalReason: true,
            removedAt: true,
            createdAt: true,
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Ticket not found",
      });
    }

    // BR-18 / BR-03: Check ownership isolation (Requesters may only view their own tickets)
    if (req.user!.role === "REQUESTER" && ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Access denied: You do not own this ticket",
      });
    }

    return res.status(200).json(ticket);
  } catch (err) {
    console.error("Error in GET /api/tickets/:id:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to fetch ticket detail" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 & Lab 3 — Create Ticket (Issue #2-5, #3-5, API-09, API-10)
// ---------------------------------------------------------------------------
app.post("/api/tickets", authenticateWithLegacyFallback, async (req: Request, res: Response) => {
  try {
    const requesterId = req.user!.id;

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

    let attempt = 0;
    let ticket;

    while (attempt < 10) {
      try {
        ticket = await getPrisma().$transaction(async (tx) => {
          const ticketNumber = await generateTicketNumber(tx);
          return await tx.ticket.create({
            data: {
              ticketNumber,
              requesterId,
              categoryId: parsedCategoryId,
              relatedSystemId: parsedSystemId,
              summary: trimmedSummary,
              description: trimmedDescription,
              requestedPriority,
              itPriority: requestedPriority,
              currentStatus: "NEW",
            },
          });
        });
        break;
      } catch (err: unknown) {
        const prismaErr = err as { code?: string; meta?: { target?: string[] | string } };
        const isUniqueConstraintErr =
          prismaErr.code === "P2002" &&
          (Array.isArray(prismaErr.meta?.target)
            ? prismaErr.meta?.target.some((t) => t.toLowerCase().includes("ticketnumber"))
            : typeof prismaErr.meta?.target === "string"
            ? prismaErr.meta?.target.toLowerCase().includes("ticketnumber")
            : true);

        if (isUniqueConstraintErr && attempt < 9) {
          attempt++;
          // Add small jittered backoff to avoid concurrent lockstep collisions
          await new Promise((resolve) => setTimeout(resolve, 15 * attempt + Math.random() * 35));
          continue;
        }
        throw err;
      }
    }

    if (!ticket) {
      throw new Error("Failed to generate unique ticket number after multiple attempts");
    }

    return res.status(201).json(ticket);
  } catch (err) {
    console.error("Error in POST /api/tickets:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create ticket" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Attachment Lifecycle (Issue #2-8)
// ---------------------------------------------------------------------------

// POST /api/tickets/:id/attachments (Upload attachment, API-06, API-08, API-10)
app.post("/api/tickets/:id/attachments", authenticateWithLegacyFallback, async (req: Request, res: Response) => {
  try {
    const requesterId = req.user!.id;

    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "Invalid ticket ID",
      });
    }

    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Ticket not found",
      });
    }

    // Ownership check (BR-05, BR-18, API Spec §3.7)
    if (ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Access denied: You do not own this ticket",
      });
    }

    // Check active attachments count (BR-14)
    const activeCount = await getPrisma().attachment.count({
      where: { ticketId, isRemoved: false },
    });

    if (activeCount >= 5) {
      return res.status(400).json({
        error: "MAX_ATTACHMENTS_EXCEEDED",
        message: "A ticket can have a maximum of 5 active attachments.",
      });
    }

    // Process file upload with multer
    uploadMiddleware.single("file")(req, res, async (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: "FILE_TOO_LARGE",
            message: "File exceeds maximum permitted size of 5 MB (5,242,880 bytes).",
          });
        }
        if (err.code === "INVALID_FILE_TYPE") {
          return res.status(400).json({
            error: "INVALID_FILE_TYPE",
            message: err.message,
          });
        }
        return res.status(400).json({
          error: "UPLOAD_ERROR",
          message: err.message || "Failed to process file upload.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "INVALID_INPUT",
          message: "No file uploaded. Please provide a file.",
        });
      }

      // Re-check active attachments count immediately before DB insert to prevent concurrent race conditions (BR-14)
      const currentActiveCount = await getPrisma().attachment.count({
        where: { ticketId, isRemoved: false },
      });

      if (currentActiveCount >= 5) {
        if (req.file.path && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {}
        }
        return res.status(400).json({
          error: "MAX_ATTACHMENTS_EXCEEDED",
          message: "A ticket can have a maximum of 5 active attachments.",
        });
      }

      try {
        const attachment = await getPrisma().attachment.create({
          data: {
            ticketId,
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            storagePath: req.file.path,
            isRemoved: false,
          },
          select: {
            id: true,
            ticketId: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            isRemoved: true,
            createdAt: true,
          },
        });

        return res.status(201).json(attachment);
      } catch (dbErr) {
        console.error("Error saving attachment to database:", dbErr);
        // Clean up orphan file on disk if database insertion fails
        if (req.file.path && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {}
        }
        return res.status(500).json({
          error: "INTERNAL_ERROR",
          message: "Failed to save attachment metadata",
        });
      }
    });
  } catch (err) {
    console.error("Error in POST /api/tickets/:id/attachments:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to upload attachment",
    });
  }
});

// GET /api/attachments/:id/download (Download active attachment binary stream, API-07, API-09, API-10)
app.get("/api/attachments/:id/download", authenticateWithLegacyFallback, async (req: Request, res: Response) => {
  try {
    const requesterId = req.user!.id;

    const attachmentId = parseInt(req.params.id, 10);
    if (isNaN(attachmentId)) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "Invalid attachment ID",
      });
    }

    const attachment = await getPrisma().attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: { select: { requesterId: true } } },
    });

    if (!attachment) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Attachment not found",
      });
    }

    // Ownership check (BR-05, BR-18, API Spec §3.8)
    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Access denied: You do not own the associated ticket",
      });
    }

    // Soft-removed check (BR-16, API Spec §3.8: 410 Gone)
    if (attachment.isRemoved) {
      return res.status(410).json({
        error: "GONE",
        message: "This attachment was removed and cannot be downloaded.",
      });
    }

    if (!fs.existsSync(attachment.storagePath)) {
      return res.status(404).json({
        error: "FILE_NOT_FOUND",
        message: "File binary not found on server storage.",
      });
    }

    return res.download(attachment.storagePath, attachment.originalName, (downloadErr) => {
      if (downloadErr && !res.headersSent) {
        console.error("Error streaming attachment download:", downloadErr);
        res.status(500).json({
          error: "INTERNAL_ERROR",
          message: "Failed to download attachment file",
        });
      }
    });
  } catch (err) {
    console.error("Error in GET /api/attachments/:id/download:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to download attachment",
    });
  }
});

// DELETE /api/attachments/:id (Soft-remove attachment, API-07, API-10)
app.delete("/api/attachments/:id", authenticateWithLegacyFallback, async (req: Request, res: Response) => {
  try {
    const requesterId = req.user!.id;

    const attachmentId = parseInt(req.params.id, 10);
    if (isNaN(attachmentId)) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "Invalid attachment ID",
      });
    }

    const { removalReason } = req.body || {};
    const trimmedReason = typeof removalReason === "string" ? removalReason.trim() : "";

    // BR-15: Removal reason required min 3 characters, max 500 characters
    if (trimmedReason.length < 3) {
      return res.status(400).json({
        error: "INVALID_REMOVAL_REASON",
        message: "Removal reason is required and must be at least 3 characters.",
      });
    }

    if (trimmedReason.length > 500) {
      return res.status(400).json({
        error: "INVALID_REMOVAL_REASON",
        message: "Removal reason cannot exceed 500 characters.",
      });
    }

    const attachment = await getPrisma().attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: { select: { requesterId: true } } },
    });

    if (!attachment) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Attachment not found",
      });
    }

    // Ownership check (BR-05, BR-18, API Spec §3.9)
    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Access denied: You do not own the associated ticket",
      });
    }

    // Block re-removal (API Spec §3.9)
    if (attachment.isRemoved) {
      return res.status(400).json({
        error: "ALREADY_REMOVED",
        message: "Attachment has already been removed.",
      });
    }

    const updated = await getPrisma().attachment.update({
      where: { id: attachmentId },
      data: {
        isRemoved: true,
        removalReason: trimmedReason,
        removedAt: new Date(),
      },
      select: {
        id: true,
        ticketId: true,
        originalName: true,
        isRemoved: true,
        removalReason: true,
        removedAt: true,
      },
    });

    return res.status(200).json(updated);
  } catch (err) {
    console.error("Error in DELETE /api/attachments/:id:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to remove attachment",
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 3 — Comments & Internal Notes (Issue #3-5, API-08, API-11, API-12)
// ---------------------------------------------------------------------------

// GET /api/tickets/:id/comments (Retrieve public comments feed, API-11)
app.get("/api/tickets/:id/comments", authenticateWithLegacyFallback, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Invalid ticket ID" },
      });
    }

    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied. You do not have permission to view comments for this ticket.",
        },
      });
    }

    const comments = await getPrisma().publicComment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return res.status(200).json(comments);
  } catch (err) {
    console.error("Error in GET /api/tickets/:id/comments:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch comments" },
    });
  }
});

// POST /api/tickets/:id/comments (Post public comment, API-11, API-12)
app.post("/api/tickets/:id/comments", authenticateWithLegacyFallback, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Invalid ticket ID" },
      });
    }

    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied. You do not have permission to comment on this ticket.",
        },
      });
    }

    const { content } = req.body || {};
    if (typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Comment content cannot be empty or whitespace-only.",
        },
      });
    }

    const trimmed = content.trim();
    if (trimmed.length > 2000) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Comment content cannot exceed 2000 characters.",
        },
      });
    }

    const comment = await getPrisma().publicComment.create({
      data: {
        ticketId,
        authorId: req.user!.id,
        content: trimmed,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return res.status(201).json(comment);
  } catch (err) {
    console.error("Error in POST /api/tickets/:id/comments:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to post comment" },
    });
  }
});

// GET /api/tickets/:id/notes (Retrieve internal notes — restricted to Staff & Admin, API-08, BR-04, BR-19)
app.get("/api/tickets/:id/notes", authenticateWithLegacyFallback, async (req: Request, res: Response) => {
  try {
    if (req.user!.role === "REQUESTER") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied. Internal notes are restricted to IT Staff and Administrators.",
        },
      });
    }

    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Invalid ticket ID" },
      });
    }

    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const notes = await getPrisma().internalNote.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return res.status(200).json(notes);
  } catch (err) {
    console.error("Error in GET /api/tickets/:id/notes:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch internal notes" },
    });
  }
});

// POST /api/tickets/:id/notes (Post internal note — restricted to Staff & Admin, API-08, BR-18, BR-19)
app.post("/api/tickets/:id/notes", authenticateWithLegacyFallback, async (req: Request, res: Response) => {
  try {
    if (req.user!.role === "REQUESTER") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied. Internal notes are restricted to IT Staff and Administrators.",
        },
      });
    }

    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Invalid ticket ID" },
      });
    }

    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const { content } = req.body || {};
    if (typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Internal note content cannot be empty or whitespace-only.",
        },
      });
    }

    const trimmed = content.trim();
    if (trimmed.length > 2000) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Internal note content cannot exceed 2000 characters.",
        },
      });
    }

    const note = await getPrisma().internalNote.create({
      data: {
        ticketId,
        authorId: req.user!.id,
        content: trimmed,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return res.status(201).json(note);
  } catch (err) {
    console.error("Error in POST /api/tickets/:id/notes:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to post internal note" },
    });
  }
});

// ---------------------------------------------------------------------------
// Lab 3 — Requester "Problem Appears Resolved" (Issue #3-5, API-19, BR-05, BR-16)
// ---------------------------------------------------------------------------
app.post("/api/tickets/:id/resolve-indication", authenticateWithLegacyFallback, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Invalid ticket ID" },
      });
    }

    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true, currentStatus: true, resolutionIndicated: true },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    if (req.user!.role !== "REQUESTER" || ticket.requesterId !== req.user!.id) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied. Only the ticket requester can indicate resolution.",
        },
      });
    }

    if (ticket.currentStatus !== "IN_PROGRESS" && ticket.currentStatus !== "WAITING_FOR_REQUESTER") {
      return res.status(400).json({
        error: {
          code: "INVALID_TRANSITION",
          message: "Resolution indication can only be submitted when ticket is in progress or waiting for requester.",
        },
      });
    }

    const updated = await getPrisma().$transaction(async (tx) => {
      const t = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          resolutionIndicated: true,
          resolutionIndicatedAt: new Date(),
        },
      });

      await tx.publicComment.create({
        data: {
          ticketId,
          authorId: req.user!.id,
          content: "Requester indicated that the problem appears resolved.",
        },
      });

      return t;
    });

    return res.status(200).json({
      message: "Problem resolution indicated. IT Staff have been notified to review and finalize.",
      ticketId: updated.id,
      resolutionIndicated: updated.resolutionIndicated,
      resolutionIndicatedAt: updated.resolutionIndicatedAt,
    });
  } catch (err) {
    console.error("Error in POST /api/tickets/:id/resolve-indication:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to indicate problem resolution" },
    });
  }
});

export default app;



