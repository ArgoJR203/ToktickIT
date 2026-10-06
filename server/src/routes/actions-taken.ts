import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { authenticate, enforcePasswordChange, requireRole } from "../middleware/auth.js";
import { validateActionTaken, parseBoolean } from "../utils/actions-taken-validator.js";
import { validateAssignee } from "../utils/assignee-validator.js";

export const actionsTakenRouter = Router();

/**
 * GET /api/tickets/:id/actions-taken
 * Retrieve list of Actions Taken for a ticket in descending chronological order.
 * Access:
 * - REQUESTER: Permitted strictly for owned tickets; 403 Forbidden for non-owned tickets (BR-21). Staff emails are omitted for privacy.
 * - IT_STAFF / ADMINISTRATOR: Permitted for all accessible tickets.
 */
actionsTakenRouter.get("/:id/actions-taken", authenticate, enforcePasswordChange, async (req: Request, res: Response) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Ticket ID must be a positive integer." },
      });
    }
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Invalid ticket ID." },
      });
    }

    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      });
    }

    // Role-based authorization & ownership isolation (BR-21)
    if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to view actions for this ticket.",
        },
      });
    }

    const actionsTaken = await getPrisma().actionTaken.findMany({
      where: { ticketId },
      orderBy: [
        { actionDateTime: "desc" },
        { id: "desc" },
      ],
      include: {
        performedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Requester privacy: omit staff emails for requesters, matching PublicComment pattern
    const sanitizedActions = actionsTaken.map((action) => {
      if (req.user!.role === "REQUESTER") {
        return {
          ...action,
          performedBy: action.performedBy
            ? { id: action.performedBy.id, name: action.performedBy.name, role: action.performedBy.role }
            : null,
          assignee: action.assignee
            ? { id: action.assignee.id, name: action.assignee.name, role: action.assignee.role }
            : null,
        };
      }
      return action;
    });

    return res.status(200).json({
      ticketId,
      actionsTaken: sanitizedActions,
    });
  } catch (err) {
    console.error("Error in GET /api/tickets/:id/actions-taken:", err);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Failed to retrieve actions taken." },
    });
  }
});

/**
 * POST /api/tickets/:id/actions-taken
 * Create a new Action Taken under a ticket.
 * Access: IT_STAFF, ADMINISTRATOR only. Requesters receive 403 Forbidden (BR-09, AC-06).
 */
actionsTakenRouter.post(
  "/:id/actions-taken",
  authenticate,
  enforcePasswordChange,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    try {
      if (!/^\d+$/.test(req.params.id)) {
        return res.status(400).json({
          error: { code: "INVALID_INPUT", message: "Ticket ID must be a positive integer." },
        });
      }
      const ticketId = parseInt(req.params.id, 10);
      if (isNaN(ticketId) || ticketId <= 0) {
        return res.status(400).json({
          error: { code: "INVALID_INPUT", message: "Invalid ticket ID." },
        });
      }

      const ticket = await getPrisma().ticket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });

      if (!ticket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found." },
        });
      }

      // Input validation (BR-04, BR-05, BR-06, BR-08)
      const validation = validateActionTaken(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: {
            code: validation.errorCode,
            message: validation.message,
            field: validation.field,
          },
        });
      }

      // Assignee validation if provided (BR-07, AC-15)
      let parsedAssigneeId: number | null = null;
      if (req.body.assigneeId !== undefined && req.body.assigneeId !== null) {
        if (typeof req.body.assigneeId !== "number" && typeof req.body.assigneeId !== "string") {
          return res.status(400).json({
            error: { code: "INVALID_INPUT", message: "Assignee ID must be a positive integer." },
          });
        }
        if (typeof req.body.assigneeId === "string" && !/^\d+$/.test(req.body.assigneeId.trim())) {
          return res.status(400).json({
            error: { code: "INVALID_INPUT", message: "Assignee ID must be a positive integer." },
          });
        }
        const candidateNum = Number(req.body.assigneeId);
        if (!Number.isInteger(candidateNum) || candidateNum <= 0) {
          return res.status(400).json({
            error: { code: "INVALID_INPUT", message: "Assignee ID must be a positive integer." },
          });
        }
        parsedAssigneeId = candidateNum;

        const candidateUser = await getPrisma().user.findUnique({
          where: { id: parsedAssigneeId },
          select: { id: true, role: true, isActive: true },
        });

        const assigneeValidation = validateAssignee(candidateUser);
        if (!assigneeValidation.isValid) {
          return res.status(400).json({
            error: {
              code: assigneeValidation.errorCode,
              message: assigneeValidation.message,
            },
          });
        }
      }

      // Performer assignment: authoritatively populated from authenticated session (BR-03)
      const performedById = req.user!.id;

      const actionDateTime = req.body.actionDateTime ? new Date(req.body.actionDateTime) : new Date();
      const status = req.body.status || "COMPLETED";
      const followUpRequired = parseBoolean(req.body.followUpRequired);
      const followUpNote = followUpRequired && typeof req.body.followUpNote === "string" ? req.body.followUpNote.trim() : null;
      const followUpDone = followUpRequired ? parseBoolean(req.body.followUpDone) : false;
      const attachmentNotes = typeof req.body.attachmentNotes === "string" && req.body.attachmentNotes.trim().length > 0
        ? req.body.attachmentNotes.trim()
        : null;

      const newAction = await getPrisma().actionTaken.create({
        data: {
          ticketId,
          performedById,
          assigneeId: parsedAssigneeId,
          status,
          actionDateTime,
          description: req.body.description.trim(),
          result: req.body.result.trim(),
          followUpRequired,
          followUpNote,
          followUpDone,
          attachmentNotes,
          version: 1,
        },
        include: {
          performedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      return res.status(201).json(newAction);
    } catch (err) {
      console.error("Error in POST /api/tickets/:id/actions-taken:", err);
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Failed to create action taken." },
      });
    }
  }
);

/**
 * PATCH /api/tickets/:id/actions-taken/:actionId
 * Update an existing Action Taken with atomic OCC check (BR-14, FR-08).
 * Access: IT_STAFF, ADMINISTRATOR only.
 */
actionsTakenRouter.patch(
  "/:id/actions-taken/:actionId",
  authenticate,
  enforcePasswordChange,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    try {
      if (!/^\d+$/.test(req.params.id) || !/^\d+$/.test(req.params.actionId)) {
        return res.status(400).json({
          error: { code: "INVALID_INPUT", message: "Invalid ticket ID or action ID." },
        });
      }

      const ticketId = parseInt(req.params.id, 10);
      const actionId = parseInt(req.params.actionId, 10);

      if (isNaN(ticketId) || ticketId <= 0 || isNaN(actionId) || actionId <= 0) {
        return res.status(400).json({
          error: { code: "INVALID_INPUT", message: "Invalid ticket ID or action ID." },
        });
      }

      const ticket = await getPrisma().ticket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });

      if (!ticket) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Ticket not found." },
        });
      }

      const existingAction = await getPrisma().actionTaken.findFirst({
        where: { id: actionId, ticketId },
      });

      if (!existingAction) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Action Taken not found under this ticket." },
        });
      }

      // Input validation for partial updates
      const validation = validateActionTaken(req.body, true);
      if (!validation.isValid) {
        return res.status(400).json({
          error: {
            code: validation.errorCode,
            message: validation.message,
            field: validation.field,
          },
        });
      }

      // Assignee validation if provided
      let parsedAssigneeId: number | null | undefined = undefined;
      if (req.body.assigneeId !== undefined) {
        if (req.body.assigneeId === null) {
          parsedAssigneeId = null;
        } else {
          if (typeof req.body.assigneeId !== "number" && typeof req.body.assigneeId !== "string") {
            return res.status(400).json({
              error: { code: "INVALID_INPUT", message: "Assignee ID must be a positive integer." },
            });
          }
          if (typeof req.body.assigneeId === "string" && !/^\d+$/.test(req.body.assigneeId.trim())) {
            return res.status(400).json({
              error: { code: "INVALID_INPUT", message: "Assignee ID must be a positive integer." },
            });
          }
          const candidateNum = Number(req.body.assigneeId);
          if (!Number.isInteger(candidateNum) || candidateNum <= 0) {
            return res.status(400).json({
              error: { code: "INVALID_INPUT", message: "Assignee ID must be a positive integer." },
            });
          }
          parsedAssigneeId = candidateNum;

          const candidateUser = await getPrisma().user.findUnique({
            where: { id: parsedAssigneeId },
            select: { id: true, role: true, isActive: true },
          });

          const assigneeValidation = validateAssignee(candidateUser);
          if (!assigneeValidation.isValid) {
            return res.status(400).json({
              error: {
                code: assigneeValidation.errorCode,
                message: assigneeValidation.message,
              },
            });
          }
        }
      }

      // Combined follow-up validation: merge submitted body with existing action state
      const targetFollowUpRequired =
        req.body.followUpRequired !== undefined ? parseBoolean(req.body.followUpRequired) : existingAction.followUpRequired;
      const targetFollowUpNote =
        req.body.followUpNote !== undefined ? req.body.followUpNote : existingAction.followUpNote;

      if (targetFollowUpRequired) {
        if (
          targetFollowUpNote === undefined ||
          targetFollowUpNote === null ||
          typeof targetFollowUpNote !== "string" ||
          targetFollowUpNote.trim().length === 0
        ) {
          return res.status(400).json({
            error: {
              code: "INVALID_INPUT",
              message: "Follow-up note is required when follow-up is requested.",
              field: "followUpNote",
            },
          });
        }
      } else if (req.body.followUpRequired !== undefined && !targetFollowUpRequired) {
        // If followUpRequired is explicitly turned off and followUpNote is provided non-empty, reject (BR-05)
        if (typeof req.body.followUpNote === "string" && req.body.followUpNote.trim().length > 0) {
          return res.status(400).json({
            error: {
              code: "INVALID_INPUT",
              message: "Follow-up note must be empty when follow-up is not required.",
              field: "followUpNote",
            },
          });
        }
      }

      // Build update data
      const updateData: Record<string, unknown> = {
        updatedById: req.user!.id,
        version: { increment: 1 },
      };

      if (req.body.description !== undefined) updateData.description = req.body.description.trim();
      if (req.body.result !== undefined) updateData.result = req.body.result.trim();
      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.actionDateTime !== undefined) updateData.actionDateTime = new Date(req.body.actionDateTime);
      if (parsedAssigneeId !== undefined) updateData.assigneeId = parsedAssigneeId;
      if (req.body.followUpRequired !== undefined) {
        updateData.followUpRequired = targetFollowUpRequired;
        if (!targetFollowUpRequired) {
          updateData.followUpNote = null;
          updateData.followUpDone = false;
        }
      }
      if (req.body.followUpNote !== undefined) {
        updateData.followUpNote = targetFollowUpRequired ? (typeof req.body.followUpNote === "string" ? req.body.followUpNote.trim() : null) : null;
      }
      if (targetFollowUpRequired && req.body.followUpDone !== undefined) {
        updateData.followUpDone = parseBoolean(req.body.followUpDone);
      }
      if (req.body.attachmentNotes !== undefined) {
        updateData.attachmentNotes = typeof req.body.attachmentNotes === "string" && req.body.attachmentNotes.trim().length > 0
          ? req.body.attachmentNotes.trim()
          : null;
      }

      // Optimistic concurrency control (BR-14)
      if (req.body.version !== undefined && req.body.version !== null) {
        if (typeof req.body.version !== "number" && typeof req.body.version !== "string") {
          return res.status(400).json({
            error: { code: "INVALID_INPUT", message: "Version must be a positive integer." },
          });
        }
        if (typeof req.body.version === "string" && !/^\d+$/.test(req.body.version.trim())) {
          return res.status(400).json({
            error: { code: "INVALID_INPUT", message: "Version must be a positive integer." },
          });
        }
        const candidateVersion = Number(req.body.version);
        if (!Number.isInteger(candidateVersion) || candidateVersion <= 0) {
          return res.status(400).json({
            error: { code: "INVALID_INPUT", message: "Version must be a positive integer." },
          });
        }
        const submittedVersion = candidateVersion;

        const updateResult = await getPrisma().actionTaken.updateMany({
          where: {
            id: actionId,
            ticketId,
            version: submittedVersion,
          },
          data: updateData,
        });

        if (updateResult.count === 0) {
          const freshAction = await getPrisma().actionTaken.findUnique({
            where: { id: actionId },
            include: {
              performedBy: { select: { id: true, name: true, email: true, role: true } },
              assignee: { select: { id: true, name: true, email: true, role: true } },
            },
          });

          return res.status(409).json({
            error: {
              code: "STALE_UPDATE",
              message: "Conflict: This action was modified by another user. Please reload the latest data.",
              details: { currentAction: freshAction },
            },
            currentAction: freshAction,
          });
        }
      } else {
        // Unversioned update
        await getPrisma().actionTaken.update({
          where: { id: actionId },
          data: updateData,
        });
      }

      const updatedAction = await getPrisma().actionTaken.findUnique({
        where: { id: actionId },
        include: {
          performedBy: { select: { id: true, name: true, email: true, role: true } },
          assignee: { select: { id: true, name: true, email: true, role: true } },
          updatedBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      if (!updatedAction) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Action Taken not found." },
        });
      }

      return res.status(200).json(updatedAction);
    } catch (err) {
      console.error("Error in PATCH /api/tickets/:id/actions-taken/:actionId:", err);
      return res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Failed to update action taken." },
      });
    }
  }
);
