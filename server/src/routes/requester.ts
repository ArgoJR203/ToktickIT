import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticate, enforcePasswordChange, requireRole } from "../middleware/auth.js";

export const requesterRouter = Router();

// Scoped strictly to REQUESTER role (BR-15, BR-16, API-17)
requesterRouter.use(authenticate, enforcePasswordChange, requireRole("REQUESTER"));

/**
 * GET /api/requester/dashboard
 * Requester Dashboard: Owned metrics, top 5 recent owned tickets, and drill-down URLs.
 * (AC-02, BR-15, API-14)
 */
requesterRouter.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const requesterId = req.user!.id;

    const [totalOpen, waitingForRequester, resolvedCount, closedCount, recentTickets] = await Promise.all([
      getPrisma().ticket.count({
        where: {
          requesterId,
          currentStatus: { in: ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] },
        },
      }),
      getPrisma().ticket.count({
        where: {
          requesterId,
          currentStatus: "WAITING_FOR_REQUESTER",
        },
      }),
      getPrisma().ticket.count({
        where: {
          requesterId,
          currentStatus: "RESOLVED",
        },
      }),
      getPrisma().ticket.count({
        where: {
          requesterId,
          currentStatus: "CLOSED",
        },
      }),
      getPrisma().ticket.findMany({
        where: { requesterId },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          currentStatus: true,
          requestedPriority: true,
          category: { select: { name: true } },
          updatedAt: true,
        },
      }),
    ]);

    return res.status(200).json({
      metrics: {
        totalOpen,
        waitingForRequester,
        resolvedCount,
        closedCount,
      },
      recentTickets,
      drillDownUrls: {
        totalOpen: "/tickets?statusGroup=open",
        waitingForRequester: "/tickets?currentStatus=WAITING_FOR_REQUESTER",
        resolvedCount: "/tickets?currentStatus=RESOLVED",
        closedCount: "/tickets?currentStatus=CLOSED",
      },
    });
  } catch (err) {
    console.error("Error in GET /api/requester/dashboard:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to fetch requester dashboard." },
    });
  }
});
