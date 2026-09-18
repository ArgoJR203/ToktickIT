import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticate, enforcePasswordChange, requireRole } from "../middleware/auth.js";

export const staffRouter = Router();

// All staff endpoints require authentication, password change enforcement, and IT_STAFF or ADMINISTRATOR role
staffRouter.use(authenticate, enforcePasswordChange, requireRole("IT_STAFF", "ADMINISTRATOR"));

/**
 * GET /api/staff/tickets
 * Shared IT Staff Ticket Queue with keyword search, multi-field filtering, sorting, and pagination.
 * (AC-07, FR-11, FR-12, API-13, API-14)
 */
staffRouter.get("/tickets", async (req: Request, res: Response) => {
  try {
    const {
      search,
      categoryId,
      status,
      currentStatus,
      requestedPriority,
      itPriority,
      ownerId,
      sortBy,
      sortOrder,
      page,
      pageSize,
    } = req.query;

    const where: Record<string, unknown> = {};

    // 1. Keyword search across ticketNumber or summary (case-insensitive)
    if (typeof search === "string" && search.trim() !== "") {
      const term = search.trim();
      where.OR = [
        { ticketNumber: { contains: term, mode: "insensitive" } },
        { summary: { contains: term, mode: "insensitive" } },
      ];
    }

    // 2. Category filter
    if (typeof categoryId === "string" && categoryId.trim() !== "") {
      const parsedCatId = parseInt(categoryId, 10);
      if (!isNaN(parsedCatId)) {
        where.categoryId = parsedCatId;
      }
    } else if (typeof categoryId === "number" && !isNaN(categoryId)) {
      where.categoryId = categoryId;
    }

    // 3. Status filter (support both status and currentStatus query params)
    const statusParam = (status || currentStatus) as string | undefined;
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
    if (typeof statusParam === "string" && validStatuses.includes(statusParam.trim())) {
      const trimmed = statusParam.trim();
      where.currentStatus = trimmed === "PENDING" ? "WAITING_FOR_REQUESTER" : trimmed;
    }

    // 4. Requested Priority filter
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (typeof requestedPriority === "string" && validPriorities.includes(requestedPriority.trim())) {
      where.requestedPriority = requestedPriority.trim();
    }

    // 5. IT Priority filter
    if (typeof itPriority === "string" && validPriorities.includes(itPriority.trim())) {
      where.itPriority = itPriority.trim();
    }

    // 6. Owner assignment filter
    if (typeof ownerId === "string" && ownerId.trim() !== "") {
      const trimmedOwner = ownerId.trim().toLowerCase();
      if (trimmedOwner === "unassigned") {
        where.ownerId = null;
      } else if (trimmedOwner === "me") {
        where.ownerId = req.user!.id;
      } else {
        const parsedOwnerId = parseInt(ownerId, 10);
        if (!isNaN(parsedOwnerId)) {
          where.ownerId = parsedOwnerId;
        }
      }
    } else if (typeof ownerId === "number" && !isNaN(ownerId)) {
      where.ownerId = ownerId;
    }

    // 7. Sorting
    const validSortFields = [
      "createdAt",
      "ticketNumber",
      "itPriority",
      "requestedPriority",
      "currentStatus",
      "updatedAt",
    ];
    const sortField = typeof sortBy === "string" && validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortDir = typeof sortOrder === "string" && sortOrder.toLowerCase() === "asc" ? "asc" : "desc";

    const orderBy: Array<Record<string, "asc" | "desc">> = [
      { [sortField]: sortDir as "asc" | "desc" },
    ];
    if (sortField !== "id") {
      orderBy.push({ id: "desc" });
    }

    // 8. Pagination
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
          requester: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              attachments: true,
              publicComments: true,
              internalNotes: true,
            },
          },
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
    console.error("Error in GET /api/staff/tickets:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to fetch staff ticket queue",
    });
  }
});
