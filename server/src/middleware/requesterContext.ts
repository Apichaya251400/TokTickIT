import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";

export interface AuthenticatedRequesterRequest extends Request {
  requesterId?: number;
}

/**
 * Validates X-Requester-Id header context on protected API routes.
 * Rules:
 * - Missing, non-numeric, or <= 0 -> 400 Bad Request (INVALID_REQUESTER_HEADER)
 * - Unknown or inactive requester -> 403 Forbidden (FORBIDDEN_REQUESTER)
 * - Active requester -> attaches requesterId to req and calls next()
 */
export async function requesterContextMiddleware(
  req: AuthenticatedRequesterRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const headerVal = req.header("X-Requester-Id");

  if (!headerVal || headerVal.trim() === "") {
    res.status(400).json({
      error: {
        code: "INVALID_REQUESTER_HEADER",
        message: "Header X-Requester-Id must be a positive integer.",
      },
    });
    return;
  }

  const parsedId = Number(headerVal);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    res.status(400).json({
      error: {
        code: "INVALID_REQUESTER_HEADER",
        message: "Header X-Requester-Id must be a positive integer.",
      },
    });
    return;
  }

  try {
    const prisma = getPrisma();
    const requester = await prisma.requesterUser.findUnique({
      where: { id: parsedId },
    });

    if (!requester || !requester.isActive) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN_REQUESTER",
          message: "Specified requester is unknown or inactive.",
        },
      });
      return;
    }

    req.requesterId = parsedId;
    next();
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected server error occurred.",
      },
    });
  }
}
