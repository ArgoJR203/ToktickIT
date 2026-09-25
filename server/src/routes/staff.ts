import { Router, Request, Response } from "express";
import { TicketStatus, ITPriority } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { authenticate, enforcePasswordChange, requireRole } from "../middleware/auth.js";
import {
  getAllowedTransitions,
  isValidStatusTransition,
} from "../utils/status-transition-validator.js";

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

/**
 * GET /api/staff/assignees
 * Retrieve all active IT Staff and Administrators eligible for ticket ownership assignment.
 * (AC-08, FR-13)
 */
staffRouter.get("/assignees", async (_req: Request, res: Response) => {
  try {
    const staffMembers = await getPrisma().user.findMany({
      where: {
        isActive: true,
        role: { in: ["IT_STAFF", "ADMINISTRATOR"] },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return res.status(200).json(staffMembers);
  } catch (err) {
    console.error("Error in GET /api/staff/assignees:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch eligible assignees" },
    });
  }
});

/**
 * GET /api/staff/tickets/:id
 * Retrieve comprehensive ticket detail with permitted next statuses for staff view.
 * (AC-08, AC-10, API-15..18, UI-04)
 */
staffRouter.get("/tickets/:id", async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Invalid ticket ID" },
      });
    }

    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
        attachments: {
          where: { isRemoved: false },
          select: {
            id: true,
            ticketId: true,
            filename: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            isRemoved: true,
            removalReason: true,
            removedAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            publicComments: true,
            internalNotes: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const permittedNextStatuses = getAllowedTransitions(ticket.currentStatus);

    return res.status(200).json({
      ...ticket,
      permittedNextStatuses,
    });
  } catch (err) {
    console.error("Error in GET /api/staff/tickets/:id:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch ticket detail" },
    });
  }
});

/**
 * PATCH /api/staff/tickets/:id/owner
 * Claim or reassign ticket ownership to self, another active IT Staff/Admin, or unassign (null).
 * (AC-08, FR-13, API-16)
 */
staffRouter.patch("/tickets/:id/owner", async (req: Request, res: Response) => {
  try {
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

    const { ownerId } = req.body ?? {};

    // ownerId can be null or an integer
    let targetOwnerId: number | null = null;

    if (ownerId !== null && ownerId !== undefined) {
      const parsed = typeof ownerId === "number" ? ownerId : parseInt(ownerId, 10);
      if (isNaN(parsed)) {
        return res.status(400).json({
          error: { code: "INVALID_INPUT", message: "Invalid owner ID provided." },
        });
      }

      // Verify user exists, isActive is true, and role is IT_STAFF or ADMINISTRATOR
      const targetUser = await getPrisma().user.findUnique({
        where: { id: parsed },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });

      if (!targetUser || !targetUser.isActive || (targetUser.role !== "IT_STAFF" && targetUser.role !== "ADMINISTRATOR")) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "Owner must be an active IT Staff or Administrator account.",
          },
        });
      }

      targetOwnerId = targetUser.id;
    }

    const updated = await getPrisma().ticket.update({
      where: { id: ticketId },
      data: { ownerId: targetOwnerId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(200).json({
      id: updated.id,
      owner: updated.owner,
    });
  } catch (err) {
    console.error("Error in PATCH /api/staff/tickets/:id/owner:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to update ticket ownership" },
    });
  }
});

/**
 * PATCH /api/staff/tickets/:id/priority
 * Update IT Priority independently from Requested Priority.
 * (AC-09, BR-12, API-15)
 */
staffRouter.patch("/tickets/:id/priority", async (req: Request, res: Response) => {
  try {
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

    const { itPriority } = req.body ?? {};
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

    if (typeof itPriority !== "string" || !validPriorities.includes(itPriority.trim().toUpperCase())) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "itPriority must be one of: LOW, MEDIUM, HIGH, URGENT.",
        },
      });
    }

    const normalizedPriority = itPriority.trim().toUpperCase() as ITPriority;

    const updated = await getPrisma().ticket.update({
      where: { id: ticketId },
      data: { itPriority: normalizedPriority },
      select: { id: true, itPriority: true, updatedAt: true },
    });

    return res.status(200).json({
      id: updated.id,
      itPriority: updated.itPriority,
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    console.error("Error in PATCH /api/staff/tickets/:id/priority:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to update IT Priority" },
    });
  }
});

/**
 * PATCH /api/staff/tickets/:id/status
 * Transition ticket status strictly governed by the status transition state machine.
 * Captures optional resolutionSummary when transitioning to RESOLVED or CLOSED.
 * (AC-10, BR-14, BR-15, API-17, API-18)
 */
staffRouter.patch("/tickets/:id/status", async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Invalid ticket ID" },
      });
    }

    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, currentStatus: true, resolutionSummary: true },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const { status, resolutionSummary } = req.body ?? {};
    const validStatuses: TicketStatus[] = [
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
      "CLOSED",
      "REOPENED",
      "CANCELLED",
    ];

    if (typeof status !== "string" || !validStatuses.includes(status.trim().toUpperCase() as TicketStatus)) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: `Invalid status value. Must be one of: ${validStatuses.join(", ")}`,
        },
      });
    }

    const nextStatus = status.trim().toUpperCase() as TicketStatus;

    // State machine check
    if (!isValidStatusTransition(ticket.currentStatus, nextStatus)) {
      return res.status(400).json({
        error: {
          code: "INVALID_TRANSITION",
          message: `Status transition from '${ticket.currentStatus}' to '${nextStatus}' is not permitted.`,
        },
      });
    }

    // Resolution summary handling:
    // If transitioning to RESOLVED or CLOSED, accept resolutionSummary if provided
    let updatedResolutionSummary: string | null = ticket.resolutionSummary;

    if (nextStatus === "RESOLVED" || nextStatus === "CLOSED") {
      if (resolutionSummary !== undefined) {
        if (typeof resolutionSummary === "string") {
          const trimmed = resolutionSummary.trim();
          if (trimmed.length > 2000) {
            return res.status(400).json({
              error: {
                code: "INVALID_INPUT",
                message: "Resolution summary cannot exceed 2000 characters.",
              },
            });
          }
          updatedResolutionSummary = trimmed.length > 0 ? trimmed : null;
        } else if (resolutionSummary === null) {
          updatedResolutionSummary = null;
        }
      }
    }

    const updated = await getPrisma().ticket.update({
      where: { id: ticketId },
      data: {
        currentStatus: nextStatus,
        resolutionSummary: updatedResolutionSummary,
      },
      select: {
        id: true,
        currentStatus: true,
        resolutionSummary: true,
        updatedAt: true,
      },
    });

    const permittedNextStatuses = getAllowedTransitions(updated.currentStatus);

    return res.status(200).json({
      id: updated.id,
      currentStatus: updated.currentStatus,
      resolutionSummary: updated.resolutionSummary,
      permittedNextStatuses,
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    console.error("Error in PATCH /api/staff/tickets/:id/status:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to update ticket status" },
    });
  }
});
