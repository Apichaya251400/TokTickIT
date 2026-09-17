import { NextFunction, Request, Response } from "express";
import { Role, User } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { isTokenRevoked, verifyToken } from "../utils/jwt.js";

export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

/**
 * Authentication Middleware:
 * - Reads JWT from cookie (`req.cookies.token`) or Authorization header (`Bearer <token>`)
 * - Checks server-side token revocation blocklist (AC-13 / FR-03)
 * - Performs real-time DB identity verification (BR-13) to check account existence & `isActive = true`
 * - Enforces mandatory password change restriction (BR-02): If `requiresPasswordChange = true`,
 *   blocks access to all protected endpoints except `/api/auth/change-password`, `/api/auth/me`, and `/api/auth/logout`
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      const isUnauthenticatedPostTicket = req.method === "POST" && req.originalUrl === "/api/tickets" && !req.headers.authorization;
      if (req.headers["x-requester-id"] !== undefined || isUnauthenticatedPostTicket) {
        const { requesterContextMiddleware } = await import("./requesterContext.js");
        return requesterContextMiddleware(req, res, next);
      }
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
      return;
    }

    if (isTokenRevoked(token)) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Token has been revoked",
      });
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
      return;
    }

    // Real-time DB lookup (BR-13)
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Account is inactive or does not exist",
      });
      return;
    }

    req.user = user;
    req.token = token;
    (req as any).requesterId = user.id;

    // Enforce mandatory password change (BR-02)
    if (user.requiresPasswordChange) {
      const allowedPaths = [
        "/api/auth/change-password",
        "/api/auth/me",
        "/api/auth/logout",
      ];
      const requestPath = req.originalUrl.split("?")[0];
      const isAllowed = allowedPaths.includes(requestPath);

      if (!isAllowed) {
        res.status(403).json({
          error: "MUST_CHANGE_PASSWORD",
          message: "Mandatory password change required before accessing system features",
        });
        return;
      }
    }

    next();
  } catch (error) {
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "Internal authentication error",
    });
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware:
 * Enforces that `req.user.role` matches one of the required roles.
 */
export function requireRole(...permittedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
      return;
    }

    if (!permittedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: "Access denied",
      });
      return;
    }

    next();
  };
}

/**
 * Ticket Ownership Isolation Middleware (FR-06 / BR-03 / BR-15):
 * - If authenticated user is a REQUESTER, verifies that the target ticket belongs to req.user.id
 * - Rejects access with 403 Forbidden if the Requester does not own the ticket
 * - IT_STAFF and ADMINISTRATOR roles bypass requester ownership checks per Authorization Matrix
 */
export async function requireTicketOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required" });
      return;
    }

    // IT_STAFF and ADMINISTRATOR bypass requester ownership checks
    if (req.user.role !== "REQUESTER") {
      next();
      return;
    }

    const ticketId = req.params.id || req.params.ticketId || req.body?.ticketId;
    const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!ticketId || !UUID_REGEX.test(String(ticketId))) {
      res.status(400).json({
        error: {
          code: "INVALID_TICKET_ID",
          message: "Ticket ID must be a valid UUID.",
        },
      });
      return;
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: String(ticketId) },
      select: { requesterId: true },
    });

    const isLegacyRequesterHeader = !req.headers.authorization && !req.cookies?.token && req.headers["x-requester-id"] !== undefined;

    if (!ticket) {
      if (isLegacyRequesterHeader) {
        res.status(404).json({
          error: {
            code: "TICKET_NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }
      res.status(404).json({
        error: "NOT_FOUND",
        message: "Ticket not found",
      });
      return;
    }

    if (ticket.requesterId !== req.user.id) {
      if (isLegacyRequesterHeader) {
        res.status(404).json({
          error: {
            code: "TICKET_NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }
      res.status(403).json({
        error: "FORBIDDEN",
        message: "Access denied: You do not own this ticket",
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "SERVER_ERROR", message: "Internal ownership verification error" });
  }
}

/**
 * Attachment Ownership Isolation Middleware (FR-06 / BR-03 / BR-15):
 * - If authenticated user is a REQUESTER, verifies that the target attachment belongs to a ticket owned by req.user.id
 * - Rejects access with 403 Forbidden if the Requester does not own the attachment
 */
export async function requireAttachmentOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required" });
      return;
    }

    if (req.user.role !== "REQUESTER") {
      next();
      return;
    }

    const attachmentId = req.params.id || req.params.attachmentId;
    if (!attachmentId) {
      res.status(400).json({
        error: "INVALID_ATTACHMENT_ID",
        message: "Attachment ID is required",
      });
      return;
    }

    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id: String(attachmentId) },
      include: { ticket: { select: { requesterId: true } } },
    });

    const isLegacyRequesterHeader = !req.headers.authorization && !req.cookies?.token && req.headers["x-requester-id"] !== undefined;

    if (!attachment) {
      if (isLegacyRequesterHeader) {
        res.status(404).json({
          error: {
            code: "ATTACHMENT_NOT_FOUND",
            message: "Attachment not found.",
          },
        });
        return;
      }
      res.status(404).json({
        error: "NOT_FOUND",
        message: "Attachment not found",
      });
      return;
    }

    if (attachment.ticket.requesterId !== req.user.id) {
      if (isLegacyRequesterHeader) {
        res.status(404).json({
          error: {
            code: "ATTACHMENT_NOT_FOUND",
            message: "Attachment not found.",
          },
        });
        return;
      }
      res.status(403).json({
        error: "FORBIDDEN",
        message: "Access denied: You do not own this attachment",
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "SERVER_ERROR", message: "Internal attachment ownership verification error" });
  }
}
