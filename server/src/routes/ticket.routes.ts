import { Router, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requesterContextMiddleware, AuthenticatedRequesterRequest } from "../middleware/requesterContext.js";
import { validateSummary, validateDescription } from "../utils/validation.js";
import { generateTicketNumber } from "../utils/ticketNumber.js";
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

      // Generate ticket number TKT-YYYY-XXXXXX
      const ticketCount = await prisma.ticket.count();
      const ticketNumber = generateTicketNumber(ticketCount + 1);

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
