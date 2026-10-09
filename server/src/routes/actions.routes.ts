import { Router, Response } from "express";
import crypto from "crypto";
import { getPrisma } from "../prisma.js";
import { authenticateToken, requireRole, AuthenticatedRequest } from "../middleware/auth.js";
import { ActionStatus } from "@prisma/client";

export const actionsRouter = Router();

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const ALLOWED_ACTION_STATUSES = new Set(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

function formatActionResponse(action: any) {
  return {
    id: action.id,
    ticketId: action.ticketId,
    performedBy: action.performedBy
      ? {
          id: action.performedBy.id,
          name: action.performedBy.name,
          role: action.performedBy.role,
        }
      : { id: action.performedById, name: "Unknown", role: "IT_STAFF" },
    assignee: action.assignee
      ? {
          id: action.assignee.id,
          name: action.assignee.name,
          role: action.assignee.role,
        }
      : null,
    description: action.description,
    result: action.result,
    status: action.status,
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote ?? null,
    attachmentNotes: action.attachmentNotes ?? null,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// 2.1 List Actions Taken for a Ticket
// GET /api/tickets/:id/actions
// ---------------------------------------------------------------------------
actionsRouter.get(
  "/tickets/:id/actions",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const ticketId = req.params.id;

    if (!UUID_REGEX.test(ticketId)) {
      res.status(400).json({
        error: {
          code: "INVALID_TICKET_ID",
          message: "Ticket ID must be a valid UUID.",
        },
      });
      return;
    }

    try {
      const prisma = getPrisma();

      // Check Ticket existence and ownership/role access
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }

      // Requester Ticket ownership isolation check
      if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
        res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Access denied.",
          },
        });
        return;
      }

      const actions = await prisma.actionTaken.findMany({
        where: { ticketId },
        include: {
          performedBy: { select: { id: true, name: true, role: true } },
          assignee: { select: { id: true, name: true, role: true } },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });

      res.status(200).json({
        data: actions.map(formatActionResponse),
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// 2.2 Create Action Taken
// POST /api/tickets/:id/actions
// ---------------------------------------------------------------------------
actionsRouter.post(
  "/tickets/:id/actions",
  authenticateToken,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const ticketId = req.params.id;

    if (!UUID_REGEX.test(ticketId)) {
      res.status(400).json({
        error: {
          code: "INVALID_TICKET_ID",
          message: "Ticket ID must be a valid UUID.",
        },
      });
      return;
    }

    // Check mandatory Idempotency-Key header
    const idempotencyKey = req.headers["idempotency-key"] || req.headers["Idempotency-Key"];
    if (!idempotencyKey || typeof idempotencyKey !== "string" || idempotencyKey.trim().length === 0) {
      res.status(400).json({
        error: {
          code: "MISSING_IDEMPOTENCY_KEY",
          message: "Idempotency-Key header is required.",
        },
      });
      return;
    }

    // Reject client-supplied performer ID in payload (BR-03)
    if (req.body?.performedById !== undefined || req.body?.performedBy !== undefined) {
      res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Client-supplied performer ID is not allowed.",
        },
      });
      return;
    }

    const { description, result, assigneeId, followUpRequired, followUpNote, attachmentNotes } = req.body || {};

    // Validate description (1-2000 chars trimmed)
    const cleanDescription = typeof description === "string" ? description.trim() : "";
    if (cleanDescription.length < 1 || cleanDescription.length > 2000) {
      res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Description must be between 1 and 2000 characters.",
        },
      });
      return;
    }

    // Validate result (1-2000 chars trimmed)
    const cleanResult = typeof result === "string" ? result.trim() : "";
    if (cleanResult.length < 1 || cleanResult.length > 2000) {
      res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Result must be between 1 and 2000 characters.",
        },
      });
      return;
    }

    // Validate followUpRequired & followUpNote
    const isFollowUpRequired = Boolean(followUpRequired);
    const cleanFollowUpNote = typeof followUpNote === "string" ? followUpNote.trim() : null;

    if (isFollowUpRequired) {
      if (!cleanFollowUpNote || cleanFollowUpNote.length < 1 || cleanFollowUpNote.length > 1000) {
        res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "Follow-up note is required when followUpRequired is true.",
          },
        });
        return;
      }
    }

    const cleanAttachmentNotes = typeof attachmentNotes === "string" ? attachmentNotes.trim() : null;

    try {
      const prisma = getPrisma();

      // Check parent Ticket existence & terminal state
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }

      if (ticket.currentStatus === "CANCELLED") {
        res.status(400).json({
          error: {
            code: "TICKET_TERMINAL",
            message: "Cannot perform actions on a cancelled ticket.",
          },
        });
        return;
      }

      // Validate assigneeId (if provided)
      let parsedAssigneeId: number | null = null;
      if (assigneeId !== undefined && assigneeId !== null && String(assigneeId).trim() !== "") {
        const numAssignee = Number(assigneeId);
        if (!Number.isInteger(numAssignee) || numAssignee <= 0) {
          res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Assignee ID must be a positive integer.",
            },
          });
          return;
        }

        const assigneeUser = await prisma.user.findUnique({
          where: { id: numAssignee },
        });

        if (!assigneeUser || !assigneeUser.isActive || assigneeUser.role === "REQUESTER") {
          res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Assignee must be an active IT Staff or Administrator user.",
            },
          });
          return;
        }
        parsedAssigneeId = numAssignee;
      }

      // Compute request payload hash for idempotency deduplication
      const currentHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(req.body))
        .digest("hex");

      const endpoint = "/api/tickets/:id/actions";
      const userId = req.user!.id;

      // Check existing IdempotencyRecord
      const existingRecord = await prisma.idempotencyRecord.findUnique({
        where: {
          userId_ticketId_endpoint_idempotencyKey: {
            userId,
            ticketId,
            endpoint,
            idempotencyKey: String(idempotencyKey),
          },
        },
      });

      if (existingRecord) {
        if (existingRecord.requestHash === currentHash) {
          res.status(existingRecord.responseStatus).json(JSON.parse(existingRecord.responseBody));
          return;
        } else {
          res.status(409).json({
            error: {
              code: "IDEMPOTENCY_KEY_REUSED",
              message: "Idempotency-Key has already been used with a different request payload.",
            },
          });
          return;
        }
      }

      // Atomic creation of ActionTaken & IdempotencyRecord inside transaction
      let createdResponsePayload: any = null;

      try {
        await prisma.$transaction(async (tx) => {
          // Re-verify non-terminal ticket status inside transaction
          const txTicket = await tx.ticket.findUnique({ where: { id: ticketId } });
          if (txTicket?.currentStatus === "CANCELLED") {
            throw new Error("TICKET_TERMINAL");
          }

          const newAction = await tx.actionTaken.create({
            data: {
              ticketId,
              performedById: userId,
              assigneeId: parsedAssigneeId,
              description: cleanDescription,
              result: cleanResult,
              status: "PENDING",
              followUpRequired: isFollowUpRequired,
              followUpNote: isFollowUpRequired ? cleanFollowUpNote : null,
              attachmentNotes: cleanAttachmentNotes,
            },
            include: {
              performedBy: { select: { id: true, name: true, role: true } },
              assignee: { select: { id: true, name: true, role: true } },
            },
          });

          createdResponsePayload = formatActionResponse(newAction);

          await tx.idempotencyRecord.create({
            data: {
              userId,
              ticketId,
              endpoint,
              idempotencyKey: String(idempotencyKey),
              requestHash: currentHash,
              responseStatus: 201,
              responseBody: JSON.stringify(createdResponsePayload),
            },
          });
        });

        res.status(201).json(createdResponsePayload);
      } catch (txError: any) {
        if (txError.message === "TICKET_TERMINAL") {
          res.status(400).json({
            error: {
              code: "TICKET_TERMINAL",
              message: "Cannot perform actions on a cancelled ticket.",
            },
          });
          return;
        }

        // Handle unique constraint race condition on IdempotencyRecord (P2002)
        if (txError.code === "P2002") {
          const raceRecord = await prisma.idempotencyRecord.findUnique({
            where: {
              userId_ticketId_endpoint_idempotencyKey: {
                userId,
                ticketId,
                endpoint,
                idempotencyKey: String(idempotencyKey),
              },
            },
          });

          if (raceRecord) {
            if (raceRecord.requestHash === currentHash) {
              res.status(raceRecord.responseStatus).json(JSON.parse(raceRecord.responseBody));
              return;
            } else {
              res.status(409).json({
                error: {
                  code: "IDEMPOTENCY_KEY_REUSED",
                  message: "Idempotency-Key has already been used with a different request payload.",
                },
              });
              return;
            }
          }
        }
        throw txError;
      }
    } catch (error) {
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// 2.3 Update Action Taken
// PUT /api/actions/:id
// ---------------------------------------------------------------------------
actionsRouter.put(
  "/actions/:id",
  authenticateToken,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const actionId = req.params.id;

    if (!UUID_REGEX.test(actionId)) {
      res.status(400).json({
        error: {
          code: "INVALID_ACTION_ID",
          message: "Action ID must be a valid UUID.",
        },
      });
      return;
    }

    const { expectedUpdatedAt, description, result, assigneeId, followUpRequired, followUpNote, attachmentNotes } = req.body || {};

    // Validate expectedUpdatedAt (MANDATORY)
    if (!expectedUpdatedAt || typeof expectedUpdatedAt !== "string" || expectedUpdatedAt.trim() === "") {
      res.status(400).json({
        error: {
          code: "MISSING_EXPECTED_UPDATED_AT",
          message: "expectedUpdatedAt timestamp is required.",
        },
      });
      return;
    }

    const expectedDate = new Date(expectedUpdatedAt);
    if (isNaN(expectedDate.getTime())) {
      res.status(400).json({
        error: {
          code: "MISSING_EXPECTED_UPDATED_AT",
          message: "expectedUpdatedAt must be a valid ISO timestamp.",
        },
      });
      return;
    }

    // Reject attempt to modify performedById (BR-03)
    if (req.body?.performedById !== undefined || req.body?.performedBy !== undefined) {
      res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Performed By cannot be modified.",
        },
      });
      return;
    }

    try {
      const prisma = getPrisma();

      // Check existing ActionTaken & parent Ticket state
      const existingAction = await prisma.actionTaken.findUnique({
        where: { id: actionId },
        include: { ticket: true },
      });

      if (!existingAction) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Action Taken not found.",
          },
        });
        return;
      }

      if (existingAction.ticket.currentStatus === "CANCELLED") {
        res.status(400).json({
          error: {
            code: "TICKET_TERMINAL",
            message: "Cannot edit actions on a cancelled ticket.",
          },
        });
        return;
      }

      const updateData: any = {};

      // Validate description if provided
      if (description !== undefined) {
        const cleanDesc = typeof description === "string" ? description.trim() : "";
        if (cleanDesc.length < 1 || cleanDesc.length > 2000) {
          res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Description must be between 1 and 2000 characters.",
            },
          });
          return;
        }
        updateData.description = cleanDesc;
      }

      // Validate result if provided
      if (result !== undefined) {
        const cleanRes = typeof result === "string" ? result.trim() : "";
        if (cleanRes.length < 1 || cleanRes.length > 2000) {
          res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Result must be between 1 and 2000 characters.",
            },
          });
          return;
        }
        updateData.result = cleanRes;
      }

      // Validate followUpRequired & followUpNote
      const effectiveFollowUpRequired = followUpRequired !== undefined ? Boolean(followUpRequired) : existingAction.followUpRequired;
      let effectiveFollowUpNote = followUpNote !== undefined ? (typeof followUpNote === "string" ? followUpNote.trim() : null) : existingAction.followUpNote;

      if (effectiveFollowUpRequired) {
        if (!effectiveFollowUpNote || effectiveFollowUpNote.length < 1 || effectiveFollowUpNote.length > 1000) {
          res.status(400).json({
            error: {
              code: "BAD_REQUEST",
              message: "Follow-up note is required when followUpRequired is true.",
            },
          });
          return;
        }
      } else {
        if (followUpRequired !== undefined && !effectiveFollowUpRequired) {
          effectiveFollowUpNote = null;
        }
      }

      if (followUpRequired !== undefined) updateData.followUpRequired = effectiveFollowUpRequired;
      if (followUpNote !== undefined || followUpRequired !== undefined) updateData.followUpNote = effectiveFollowUpNote;

      if (attachmentNotes !== undefined) {
        updateData.attachmentNotes = typeof attachmentNotes === "string" ? attachmentNotes.trim() : null;
      }

      // Validate assigneeId if provided
      if (assigneeId !== undefined) {
        if (assigneeId === null || String(assigneeId).trim() === "") {
          updateData.assigneeId = null;
        } else {
          const numAssignee = Number(assigneeId);
          if (!Number.isInteger(numAssignee) || numAssignee <= 0) {
            res.status(400).json({
              error: {
                code: "BAD_REQUEST",
                message: "Assignee ID must be a positive integer.",
              },
            });
            return;
          }

          const assigneeUser = await prisma.user.findUnique({
            where: { id: numAssignee },
          });

          if (!assigneeUser || !assigneeUser.isActive || assigneeUser.role === "REQUESTER") {
            res.status(400).json({
              error: {
                code: "BAD_REQUEST",
                message: "Assignee must be an active IT Staff or Administrator user.",
              },
            });
            return;
          }
          updateData.assigneeId = numAssignee;
        }
      }

      // Atomic conditional update checking updatedAt timestamp (optimistic concurrency)
      const updateResult = await prisma.actionTaken.updateMany({
        where: {
          id: actionId,
          updatedAt: expectedDate,
        },
        data: updateData,
      });

      if (updateResult.count === 0) {
        res.status(409).json({
          error: {
            code: "STALE_UPDATE",
            message: "Action content was updated concurrently by another user. Please refresh and try again.",
          },
        });
        return;
      }

      const updatedAction = await prisma.actionTaken.findUniqueOrThrow({
        where: { id: actionId },
        include: {
          performedBy: { select: { id: true, name: true, role: true } },
          assignee: { select: { id: true, name: true, role: true } },
        },
      });

      res.status(200).json(formatActionResponse(updatedAction));
    } catch (error) {
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// 2.4 Action Status Transition
// PUT /api/actions/:id/status
// ---------------------------------------------------------------------------
actionsRouter.put(
  "/actions/:id/status",
  authenticateToken,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const actionId = req.params.id;

    if (!UUID_REGEX.test(actionId)) {
      res.status(400).json({
        error: {
          code: "INVALID_ACTION_ID",
          message: "Action ID must be a valid UUID.",
        },
      });
      return;
    }

    const { status: targetStatus, expectedUpdatedAt } = req.body || {};

    // Validate expectedUpdatedAt (MANDATORY)
    if (!expectedUpdatedAt || typeof expectedUpdatedAt !== "string" || expectedUpdatedAt.trim() === "") {
      res.status(400).json({
        error: {
          code: "MISSING_EXPECTED_UPDATED_AT",
          message: "expectedUpdatedAt timestamp is required.",
        },
      });
      return;
    }

    const expectedDate = new Date(expectedUpdatedAt);
    if (isNaN(expectedDate.getTime())) {
      res.status(400).json({
        error: {
          code: "MISSING_EXPECTED_UPDATED_AT",
          message: "expectedUpdatedAt must be a valid ISO timestamp.",
        },
      });
      return;
    }

    if (!targetStatus || typeof targetStatus !== "string" || !ALLOWED_ACTION_STATUSES.has(targetStatus)) {
      res.status(400).json({
        error: {
          code: "INVALID_TRANSITION",
          message: "Invalid action status.",
        },
      });
      return;
    }

    try {
      const prisma = getPrisma();

      // Check existing ActionTaken & parent Ticket state
      const existingAction = await prisma.actionTaken.findUnique({
        where: { id: actionId },
        include: { ticket: true },
      });

      if (!existingAction) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Action Taken not found.",
          },
        });
        return;
      }

      if (existingAction.ticket.currentStatus === "CANCELLED") {
        res.status(400).json({
          error: {
            code: "TICKET_TERMINAL",
            message: "Cannot modify action status on a cancelled ticket.",
          },
        });
        return;
      }

      const currentStatus = existingAction.status;

      // Terminal Action Status Rule (COMPLETED and CANCELLED cannot transition further)
      if (currentStatus === "COMPLETED" || currentStatus === "CANCELLED") {
        res.status(400).json({
          error: {
            code: "INVALID_TRANSITION",
            message: `Cannot transition Action Taken from terminal status ${currentStatus}.`,
          },
        });
        return;
      }

      // Enforce Action Status Transition Matrix (Section 8.2 of Specification)
      // PENDING -> IN_PROGRESS, COMPLETED, CANCELLED
      // IN_PROGRESS -> COMPLETED, CANCELLED
      const permittedNext: Record<string, Set<string>> = {
        PENDING: new Set(["IN_PROGRESS", "COMPLETED", "CANCELLED"]),
        IN_PROGRESS: new Set(["COMPLETED", "CANCELLED"]),
      };

      const allowedSet = permittedNext[currentStatus];
      if (!allowedSet || !allowedSet.has(targetStatus)) {
        res.status(400).json({
          error: {
            code: "INVALID_TRANSITION",
            message: `Invalid action status transition from ${currentStatus} to ${targetStatus}.`,
          },
        });
        return;
      }

      // Atomic conditional update checking updatedAt timestamp (optimistic concurrency)
      const updateResult = await prisma.actionTaken.updateMany({
        where: {
          id: actionId,
          updatedAt: expectedDate,
        },
        data: {
          status: targetStatus as ActionStatus,
        },
      });

      if (updateResult.count === 0) {
        res.status(409).json({
          error: {
            code: "STALE_UPDATE",
            message: "Action status was updated concurrently by another user. Please refresh and try again.",
          },
        });
        return;
      }

      const updatedAction = await prisma.actionTaken.findUniqueOrThrow({
        where: { id: actionId },
        include: {
          performedBy: { select: { id: true, name: true, role: true } },
          assignee: { select: { id: true, name: true, role: true } },
        },
      });

      res.status(200).json(formatActionResponse(updatedAction));
    } catch (error) {
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      });
    }
  }
);
