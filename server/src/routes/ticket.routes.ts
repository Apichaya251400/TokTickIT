import { Router, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requesterContextMiddleware, AuthenticatedRequesterRequest } from "../middleware/requesterContext.js";
import { validateSummary, validateDescription } from "../utils/validation.js";
import { generateTicketNumber, getNextTicketSequence } from "../utils/ticketNumber.js";
import { RequestedPriority } from "@prisma/client";

export const ticketRouter = Router();

// In-memory set tracking currently processing ticket requests to detect repeated submissions during processing (BR-14 / AC-20 / API-13)
const inFlightSubmissions = new Set<string>();

const ALLOWED_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);

// POST /api/tickets - Create a new IT support ticket
ticketRouter.post(
  "/tickets",
  requesterContextMiddleware,
  async (req: AuthenticatedRequesterRequest, res: Response): Promise<void> => {
    const { categoryId, relatedSystemId, requestedPriority, summary, description } = req.body || {};

    const validationDetails: Array<{ field: string; message: string }> = [];

    // Validate categoryId
    const parsedCatId = Number(categoryId);
    if (!categoryId || !Number.isInteger(parsedCatId) || parsedCatId <= 0) {
      validationDetails.push({
        field: "categoryId",
        message: "Category ID must be a positive integer.",
      });
    }

    // Validate relatedSystemId
    const parsedSysId = Number(relatedSystemId);
    if (!relatedSystemId || !Number.isInteger(parsedSysId) || parsedSysId <= 0) {
      validationDetails.push({
        field: "relatedSystemId",
        message: "Related System ID must be a positive integer.",
      });
    }

    // Validate requestedPriority
    if (!requestedPriority || !ALLOWED_PRIORITIES.has(requestedPriority)) {
      validationDetails.push({
        field: "requestedPriority",
        message: "Requested Priority must be one of: LOW, MEDIUM, HIGH, URGENT.",
      });
    }

    // Validate summary (10-120 chars, non-whitespace)
    const cleanSummary = validateSummary(summary);
    if (!cleanSummary) {
      validationDetails.push({
        field: "summary",
        message: "Summary must be between 10 and 120 characters.",
      });
    }

    // Validate description (20-2,000 chars, non-whitespace)
    const cleanDescription = validateDescription(description);
    if (!cleanDescription) {
      validationDetails.push({
        field: "description",
        message: "Description must be between 20 and 2,000 characters.",
      });
    }

    if (validationDetails.length > 0) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "One or more validation constraints failed.",
          details: validationDetails,
        },
      });
      return;
    }

    const requesterId = req.requesterId!;

    // Duplicate submission check for in-flight requests during active processing (BR-14 / AC-20 / API-13)
    const duplicateKey = `${requesterId}:${parsedCatId}:${parsedSysId}:${requestedPriority}:${cleanSummary}:${cleanDescription}`;
    if (inFlightSubmissions.has(duplicateKey)) {
      res.status(409).json({
        error: {
          code: "DUPLICATE_SUBMISSION",
          message: "A duplicate ticket creation request is currently being processed.",
        },
      });
      return;
    }

    inFlightSubmissions.add(duplicateKey);

    try {
      const prisma = getPrisma();

      // Check active Category and RelatedSystem references
      const [category, relatedSystem] = await Promise.all([
        prisma.category.findFirst({
          where: { id: parsedCatId, isActive: true },
        }),
        prisma.relatedSystem.findFirst({
          where: { id: parsedSysId, isActive: true },
        }),
      ]);

      if (!category || !relatedSystem) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Specified Category or Related System is invalid or inactive.",
          },
        });
        return;
      }

      // Generate ticket number TKT-YYYY-XXXXXX using database-safe sequence (BR-01)
      const ticketSeq = await getNextTicketSequence(prisma);
      const ticketNumber = generateTicketNumber(ticketSeq);

      // Create ticket in database
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber,
          requesterId,
          categoryId: parsedCatId,
          relatedSystemId: parsedSysId,
          requestedPriority: requestedPriority as RequestedPriority,
          summary: cleanSummary!,
          description: cleanDescription!,
          currentStatus: "NEW",
        },
      });

      res.status(201).json({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        requesterId: ticket.requesterId,
        categoryId: ticket.categoryId,
        relatedSystemId: ticket.relatedSystemId,
        requestedPriority: ticket.requestedPriority,
        currentStatus: ticket.currentStatus,
        summary: ticket.summary,
        description: ticket.description,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create ticket.",
        },
      });
    } finally {
      inFlightSubmissions.delete(duplicateKey);
    }
  }
);

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// GET /api/tickets/:id - Retrieve owned ticket details with attachments (Issue #25)
ticketRouter.get(
  "/tickets/:id",
  requesterContextMiddleware,
  async (req: AuthenticatedRequesterRequest, res: Response): Promise<void> => {
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

    const requesterId = req.requesterId!;

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          requesterId, // Enforces ownership strictly at the database query level
        },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          relatedSystem: {
            select: {
              id: true,
              name: true,
            },
          },
          attachments: {
            orderBy: {
              uploadedAt: "asc",
            },
            select: {
              id: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
              uploadedAt: true,
              removedAt: true,
              removalReason: true,
            },
          },
        },
      });

      if (!ticket) {
        res.status(404).json({
          error: {
            code: "TICKET_NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }

      res.status(200).json({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        requester: {
          id: ticket.requester.id,
          name: ticket.requester.name,
          email: ticket.requester.email,
        },
        category: {
          id: ticket.category.id,
          name: ticket.category.name,
        },
        relatedSystem: {
          id: ticket.relatedSystem.id,
          name: ticket.relatedSystem.name,
        },
        requestedPriority: ticket.requestedPriority,
        currentStatus: ticket.currentStatus,
        summary: ticket.summary,
        description: ticket.description,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        attachments: ticket.attachments.map((att) => ({
          id: att.id,
          fileName: att.fileName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
          uploadedAt: att.uploadedAt,
          removedAt: att.removedAt,
          removalReason: att.removalReason,
          isRemoved: att.removedAt !== null,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve ticket details.",
        },
      });
    }
  }
);
